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
      supabaseAdmin
        .from("orders")
        .select("id, order_number, total_ghs, status, payment_status, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      supabaseAdmin.from("products").select("id, name, stock_quantity, is_active, unit"),
      supabaseAdmin
        .from("products")
        .select("id, name, stock_quantity, unit")
        .lte("stock_quantity", 5)
        .eq("is_active", true)
        .order("stock_quantity"),
    ]);
    const all = orders.data ?? [];
    const revenue = all
      .filter((o) => o.payment_status === "paid")
      .reduce((s, o) => s + Number(o.total_ghs), 0);
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
      .select(
        "id, order_number, customer_name, customer_phone, total_ghs, status, payment_status, payment_method, delivery_type, dispatch_partner, rider_name, rider_phone, rider_vehicle, uber_tracking_url, estimated_delivery_time, delivery_address, ghana_post_gps, gps_coordinates, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      order_id: z.string().uuid(),
      status: z.enum([
        "pending",
        "confirmed",
        "packed",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ]),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch order first to get details for SMS
    const { data: order, error: fErr } = await supabaseAdmin
      .from("orders")
      .select(
        "order_number, customer_name, customer_phone, rider_name, rider_phone, dispatch_partner",
      )
      .eq("id", data.order_id)
      .single();
    if (fErr || !order) throw new Error("Order not found");

    const { error } = await supabaseAdmin
      .from("orders")
      .update({ status: data.status })
      .eq("id", data.order_id);
    if (error) throw new Error(error.message);

    // Send SMS alert based on status
    let msg = "";
    const firstName = order.customer_name.split(" ")[0];
    const partnerName = order.dispatch_partner === "uber" ? "Uber Package" : "Barima Ba Rider";
    switch (data.status) {
      case "confirmed":
        msg = `Hello ${firstName}, your order ${order.order_number} has been confirmed. We are packing it now.`;
        break;
      case "packed":
        msg = `Hello ${firstName}, your order ${order.order_number} is packed and ready for ${partnerName} pickup.`;
        break;
      case "out_for_delivery":
        const riderInfo = order.rider_name
          ? ` Driver: ${order.rider_name} (${order.rider_phone || ""}).`
          : "";
        msg = `Hello ${firstName}, your order ${order.order_number} is out for delivery via ${partnerName}!${riderInfo} Track it live on our site.`;
        break;
      case "delivered":
        msg = `Hello ${firstName}, your order ${order.order_number} has been delivered successfully. Enjoy your Barima Ba meal!`;
        break;
      case "cancelled":
        msg = `Hello ${firstName}, your order ${order.order_number} has been cancelled. Contact support for details.`;
        break;
    }
    if (msg) {
      try {
        const { getNotificationSettings } = await import("./settings.functions");
        const notifSettings = await getNotificationSettings();
        if (notifSettings.enable_customer_alerts) {
          sendSMSNotification(order.customer_phone, msg).catch(console.error);
        }
      } catch (err) {
        console.error("SMS notification trigger failed:", err);
      }
    }

    return { ok: true };
  });

export const updateOrderDispatchDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      order_id: z.string().uuid(),
      dispatch_partner: z.string().optional(),
      rider_name: z.string().optional(),
      rider_phone: z.string().optional(),
      rider_vehicle: z.string().optional(),
      uber_tracking_url: z.string().optional(),
      estimated_delivery_time: z.string().optional(),
      update_status_to_out_for_delivery: z.boolean().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const updatePayload: Record<string, unknown> = {};
    if (data.dispatch_partner !== undefined) updatePayload.dispatch_partner = data.dispatch_partner;
    if (data.rider_name !== undefined) updatePayload.rider_name = data.rider_name;
    if (data.rider_phone !== undefined) updatePayload.rider_phone = data.rider_phone;
    if (data.rider_vehicle !== undefined) updatePayload.rider_vehicle = data.rider_vehicle;
    if (data.uber_tracking_url !== undefined)
      updatePayload.uber_tracking_url = data.uber_tracking_url;
    if (data.estimated_delivery_time !== undefined)
      updatePayload.estimated_delivery_time = data.estimated_delivery_time;
    if (data.update_status_to_out_for_delivery) updatePayload.status = "out_for_delivery";

    const { data: order, error: fErr } = await supabaseAdmin
      .from("orders")
      .select(
        "order_number, customer_name, customer_phone, delivery_address, gps_coordinates, ghana_post_gps",
      )
      .eq("id", data.order_id)
      .single();
    if (fErr || !order) throw new Error("Order not found");

    const { error } = await supabaseAdmin
      .from("orders")
      .update(updatePayload as any)
      .eq("id", data.order_id);
    if (error) throw new Error(error.message);

    // Send SMS notifications based on preferences
    try {
      const { getNotificationSettings } = await import("./settings.functions");
      const notifSettings = await getNotificationSettings();

      const firstName = order.customer_name.split(" ")[0];
      const partnerName = data.dispatch_partner === "uber" ? "Uber Package" : "Barima Ba Rider";

      if (notifSettings.enable_customer_alerts) {
        const riderDetails = data.rider_name
          ? ` Rider: ${data.rider_name} (${data.rider_phone || ""}).`
          : "";
        const smsMessage = `Hello ${firstName}, ${partnerName} has been assigned to your order ${order.order_number}.${riderDetails} Track your delivery live on our site!`;
        sendSMSNotification(order.customer_phone, smsMessage).catch(console.error);
      }

      if (notifSettings.enable_rider_alerts && data.rider_phone) {
        const gpsInfo = order.gps_coordinates ? `GPS: ${order.gps_coordinates}` : "";
        const gpGpsInfo = order.ghana_post_gps ? `Ghana Post GPS: ${order.ghana_post_gps}` : "";
        const locationDetails = [order.delivery_address, gpsInfo, gpGpsInfo]
          .filter(Boolean)
          .join(" | ");

        const riderMessage = `🏍️ DELIVERY ASSIGNED: Order #${order.order_number}. Customer: ${order.customer_name} (${order.customer_phone}). Delivery Location: ${locationDetails || "Pick up from kitchen."}`;
        sendSMSNotification(data.rider_phone, riderMessage).catch(console.error);
      }
    } catch (notifErr) {
      console.error("Dispatch SMS triggers failed:", notifErr);
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
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "lowercase, digits, hyphens only"),
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
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      unit: data.unit,
      price_ghs: data.price_ghs,
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
    const { error } = await supabaseAdmin
      .from("products")
      .update({ is_active: false })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
