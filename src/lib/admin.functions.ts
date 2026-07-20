import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { sendSMSNotification } from "./orders.functions";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [orders, products, lowStock] = await Promise.all([
      supabaseAdmin.from("orders").select("id, total_ghs, status, payment_status, created_at").order("created_at", { ascending: false }).limit(500),
      supabaseAdmin.from("products").select("id, name, stock_quantity, is_active, unit"),
      supabaseAdmin.from("products").select("id, name, stock_quantity, unit").lte("stock_quantity", 5).eq("is_active", true).order("stock_quantity"),
    ]);
    const all = orders.data ?? [];
    const revenue = all.filter((o) => o.payment_status === "paid").reduce((s, o) => s + Number(o.total_ghs), 0);
    const pending = all.filter((o) => o.status === "pending").length;
    return {
      revenue,
      ordersTotal: all.length,
      pending,
      productsCount: products.data?.length ?? 0,
      lowStock: lowStock.data ?? [],
      recentOrders: all.slice(0, 10),
    };
  });

export const listAdminOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, customer_name, customer_phone, total_ghs, status, payment_status, payment_method, delivery_type, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    order_id: z.string().uuid(),
    status: z.enum(["pending", "confirmed", "packed", "out_for_delivery", "delivered", "cancelled"]),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // Fetch order first to get details for SMS
    const { data: order, error: fErr } = await supabaseAdmin
      .from("orders")
      .select("order_number, customer_name, customer_phone")
      .eq("id", data.order_id)
      .single();
    if (fErr || !order) throw new Error("Order not found");

    const { error } = await supabaseAdmin.from("orders").update({ status: data.status }).eq("id", data.order_id);
    if (error) throw new Error(error.message);

    // Send SMS alert based on status
    let msg = "";
    const firstName = order.customer_name.split(" ")[0];
    switch (data.status) {
      case "confirmed":
        msg = `Hello ${firstName}, your order ${order.order_number} has been confirmed. We are packing it now.`;
        break;
      case "packed":
        msg = `Hello ${firstName}, your order ${order.order_number} has been packed and is ready for dispatch.`;
        break;
      case "out_for_delivery":
        msg = `Hello ${firstName}, your order ${order.order_number} is out for delivery! Our rider will call you shortly.`;
        break;
      case "delivered":
        msg = `Hello ${firstName}, your order ${order.order_number} has been delivered successfully. Thank you for shopping with us!`;
        break;
      case "cancelled":
        msg = `Hello ${firstName}, your order ${order.order_number} has been cancelled. Contact support for details.`;
        break;
    }
    if (msg) {
      sendSMSNotification(order.customer_phone, msg).catch(console.error);
    }

    return { ok: true };
  });

export const listAdminProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: products }, { data: categories }] = await Promise.all([
      supabaseAdmin.from("products").select("*").order("name"),
      supabaseAdmin.from("categories").select("id, name, slug").order("sort_order"),
    ]);
    return { products: products ?? [], categories: categories ?? [] };
  });

const productInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/, "lowercase, digits, hyphens only"),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  unit: z.string().trim().min(1).max(30),
  price_ghs: z.number().min(0).max(100000),
  stock_quantity: z.number().int().min(0).max(100000),
  category_id: z.string().uuid().nullable().optional(),
  image_url: z.string().trim().url().max(500).optional().or(z.literal("")),
  is_active: z.boolean(),
});

export const upsertProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(productInput)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row = {
      name: data.name, slug: data.slug,
      description: data.description || null,
      unit: data.unit, price_ghs: data.price_ghs,
      stock_quantity: data.stock_quantity,
      category_id: data.category_id || null,
      image_url: data.image_url || null,
      is_active: data.is_active,
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("products").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("products").insert(row);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("products").update({ is_active: false }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
