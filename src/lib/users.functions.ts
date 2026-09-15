import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: Admin privileges required");
}

export interface AdminUserListItem {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: "admin" | "staff" | "customer";
  is_phone_verified: boolean;
  created_at: string;
  delivery_address: string | null;
  ghana_post_gps: string | null;
  orders_count: number;
  total_spent_ghs: number;
}

export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminUserListItem[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch auth users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
    });
    if (authError) throw new Error(authError.message);

    // Fetch profiles, roles, and orders in parallel
    const [profilesRes, rolesRes, ordersRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("*"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("orders").select("customer_phone, total_ghs, payment_status"),
    ]);

    const profilesMap = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p]));
    const rolesMap = new Map((rolesRes.data ?? []).map((r: any) => [r.user_id, r.role]));

    // Aggregate orders by normalized customer phone
    const ordersStats = new Map<string, { count: number; total: number }>();
    for (const order of ordersRes.data ?? []) {
      if (!order.customer_phone) continue;
      const cleanPhone = order.customer_phone.replace(/\D/g, "");
      const existing = ordersStats.get(cleanPhone) || { count: 0, total: 0 };
      existing.count += 1;
      if (order.payment_status === "paid") {
        existing.total += Number(order.total_ghs) || 0;
      }
      ordersStats.set(cleanPhone, existing);
    }

    return (authData.users ?? []).map((u) => {
      const profile = profilesMap.get(u.id);
      const rawRole = rolesMap.get(u.id);
      const role: "admin" | "staff" | "customer" =
        rawRole === "admin" ? "admin" : rawRole === "staff" ? "staff" : "customer";
      const cleanPhone = (profile?.phone || u.phone || "").replace(/\D/g, "");
      const stats = ordersStats.get(cleanPhone) || { count: 0, total: 0 };

      return {
        id: u.id,
        email: u.email || "",
        full_name: profile?.full_name || u.user_metadata?.full_name || null,
        phone: profile?.phone || u.phone || null,
        role,
        is_phone_verified: profile?.is_phone_verified || Boolean(u.phone_confirmed_at),
        created_at: u.created_at,
        delivery_address: profile?.delivery_address || null,
        ghana_post_gps: profile?.ghana_post_gps || null,
        orders_count: stats.count,
        total_spent_ghs: stats.total,
      };
    });
  });

export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      target_user_id: z.string().uuid(),
      role: z.enum(["admin", "staff", "customer"]),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Don't allow an admin to accidentally demote themselves
    if (data.target_user_id === context.userId && data.role !== "admin") {
      throw new Error("You cannot remove your own admin privileges.");
    }

    // Upsert into user_roles
    const { error } = await supabaseAdmin.from("user_roles").upsert(
      {
        user_id: data.target_user_id,
        role: data.role,
      },
      { onConflict: "user_id" },
    );

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      target_user_id: z.string().uuid(),
      new_password: z.string().min(8, "Password must be at least 8 characters"),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.target_user_id, {
      password: data.new_password,
    });

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendUserDirectSMS = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      phone: z.string().min(9),
      message: z.string().min(2).max(480),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { sendSMSNotification } = await import("@/lib/orders.functions");
    await sendSMSNotification(data.phone, data.message);
    return { ok: true };
  });
