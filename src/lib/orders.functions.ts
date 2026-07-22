import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const itemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(100),
});

const createOrderInput = z.object({
  customer_name: z.string().trim().min(2).max(100),
  customer_phone: z.string().trim().min(7).max(20),
  customer_email: z.string().trim().email().max(255).optional().or(z.literal("")),
  delivery_type: z.enum(["delivery", "pickup"]),
  dispatch_partner: z.enum(["uber", "in_house", "pickup"]).optional(),
  delivery_address: z.string().trim().max(500).optional().or(z.literal("")),
  delivery_zone_id: z.string().uuid().optional().nullable(),
  ghana_post_gps: z.string().trim().max(15).optional().or(z.literal("")),
  gps_coordinates: z.string().trim().max(60).optional().or(z.literal("")),
  payment_method: z.enum(["paystack", "cash_on_delivery", "wallet"]),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  scheduled_delivery_date: z.string().optional().nullable(),
  is_subscription: z.boolean().optional(),
  subscription_frequency: z.enum(["weekly", "biweekly", "monthly"]).optional().nullable(),
  items: z.array(itemSchema).min(1).max(50),
});

// Barima Ba Kitchen Default Hub (Accra / East Legon)
const STORE_LAT = 5.6350;
const STORE_LNG = -0.1600;

function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const calculateUberEstimate = createServerFn({ method: "POST" })
  .validator(
    z.object({
      lat: z.number(),
      lng: z.number(),
    })
  )
  .handler(async ({ data }) => {
    const distKm = calculateHaversineDistance(STORE_LAT, STORE_LNG, data.lat, data.lng);
    const roundedDist = Math.max(1, Math.round(distKm * 10) / 10);
    
    // Dynamic Uber Pricing Formula for Ghana: Base ₵12 GHS + ₵2.30 per km
    const baseFee = 12;
    const perKmRate = 2.3;
    const estimatedFeeGhs = Math.round((baseFee + roundedDist * perKmRate) * 100) / 100;
    const estimatedMins = Math.round(15 + roundedDist * 2.5);

    return {
      distance_km: roundedDist,
      estimated_fee_ghs: estimatedFeeGhs,
      estimated_minutes: `${estimatedMins} - ${estimatedMins + 10} mins`,
      dispatch_provider: "Uber Package Dispatch",
    };
  });

export function normalizePhoneNumber(phone: string): string {
  let formatted = phone.trim().replace(/\s+/g, "");
  if (formatted.startsWith("+")) {
    formatted = formatted.slice(1);
  }
  if (formatted.startsWith("0")) {
    formatted = `233${formatted.slice(1)}`;
  }
  return formatted;
}

export async function sendSMSNotification(phone: string, message: string) {
  const apiKey = process.env.TXTCONNECT_API_KEY || process.env.ARKESEL_API_KEY;
  console.log(`[SMS MOCK] To: ${phone} | Message: ${message}`);
  if (!apiKey) {
    throw new Error("SMS sending failed: TXTCONNECT_API_KEY is not configured in the server environment (Vercel/env).");
  }
  try {
    const formattedPhone = normalizePhoneNumber(phone);
    const res = await fetch("https://api.txtconnect.net/dev/api/sms/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: formattedPhone,
        from: process.env.TXTCONNECT_SENDER_ID || "BarimaBa",
        unicode: false,
        sms: message,
      }),
    });
    const json = await res.json();
    console.log("[TXTCONNECT SMS RESPONSE]", json);
  } catch (e) {
    console.error("[TXTCONNECT SMS ERROR]", e);
  }
}

export const sendPhoneOTP = createServerFn({ method: "POST" })
  .validator(z.object({ phone: z.string().trim().min(7).max(20) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const formattedPhone = normalizePhoneNumber(data.phone);

    const { error } = await supabaseAdmin
      .from("phone_otps")
      .upsert({ phone: formattedPhone, code: otp, expires_at: expiresAt }, { onConflict: "phone" });
    if (error) throw new Error("Failed to store OTP: " + error.message);

    const message = `Your Barima Ba Foods login code is: ${otp}. Valid for 10 minutes.`;
    await sendSMSNotification(formattedPhone, message);
    return { ok: true, message: "OTP sent via SMS" };
  });

export const verifyPhoneOTP = createServerFn({ method: "POST" })
  .validator(z.object({ phone: z.string().trim().min(7).max(20), code: z.string().trim() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const formattedPhone = normalizePhoneNumber(data.phone);

    const { data: record, error } = await supabaseAdmin
      .from("phone_otps")
      .select("code, expires_at")
      .eq("phone", formattedPhone)
      .single();

    if (error || !record) {
      throw new Error("OTP code expired or not found. Please request a new code.");
    }

    const isExpired = new Date(record.expires_at).getTime() < Date.now();
    if (isExpired) {
      await supabaseAdmin.from("phone_otps").delete().eq("phone", formattedPhone);
      throw new Error("OTP code expired. Please request a new code.");
    }

    if (record.code !== data.code.trim()) {
      throw new Error("Invalid verification code. Please check and try again.");
    }

    await supabaseAdmin.from("phone_otps").delete().eq("phone", formattedPhone);
    return { ok: true };
  });

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(createOrderInput)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const productIds = data.items.map((i) => i.product_id);
    const { data: products, error: pErr } = await supabaseAdmin
      .from("products")
      .select("id, name, unit, price_ghs, stock_quantity, is_active")
      .in("id", productIds);
    if (pErr) throw new Error(pErr.message);
    if (!products || products.length !== productIds.length) throw new Error("One or more products not found");

    let subtotal = 0;
    const orderItems = data.items.map((i) => {
      const p = products.find((x) => x.id === i.product_id)!;
      if (!p.is_active) throw new Error(`${p.name} is not available`);
      if (p.stock_quantity < i.quantity) throw new Error(`${p.name} is out of stock`);
      const line = Number(p.price_ghs) * i.quantity;
      subtotal += line;
      return {
        product_id: p.id,
        product_name: p.name,
        unit: p.unit,
        quantity: i.quantity,
        unit_price_ghs: Number(p.price_ghs),
        line_total_ghs: line,
      };
    });

    let deliveryFee = 0;
    if (data.delivery_type === "delivery") {
      if (!data.delivery_zone_id) throw new Error("Delivery zone required");
      if (!data.delivery_address) throw new Error("Delivery address required");
      const { data: zone, error: zErr } = await supabaseAdmin
        .from("delivery_zones").select("fee_ghs").eq("id", data.delivery_zone_id).single();
      if (zErr || !zone) throw new Error("Invalid delivery zone");
      deliveryFee = Number(zone.fee_ghs);
    }

    const total = subtotal + deliveryFee;

    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_email: data.customer_email || null,
        delivery_type: data.delivery_type,
        dispatch_partner: data.dispatch_partner || (data.delivery_type === "pickup" ? "pickup" : "uber"),
        delivery_address: data.delivery_address || null,
        delivery_zone_id: data.delivery_zone_id || null,
        delivery_fee_ghs: deliveryFee,
        subtotal_ghs: subtotal,
        total_ghs: total,
        payment_method: data.payment_method,
        notes: data.notes || null,
        ghana_post_gps: data.ghana_post_gps || null,
        gps_coordinates: data.gps_coordinates || null,
        scheduled_delivery_date: data.scheduled_delivery_date || null,
        is_subscription: !!data.is_subscription,
        subscription_frequency: data.subscription_frequency || null,
      })
      .select("id, order_number, total_ghs")
      .single();
    if (oErr || !order) throw new Error(oErr?.message || "Failed to create order");

    const { error: iErr } = await supabaseAdmin
      .from("order_items")
      .insert(orderItems.map((it) => ({ ...it, order_id: order.id })));
    if (iErr) throw new Error(iErr.message);

    // Trigger SMS async
    const dispatchMethodText = data.dispatch_partner === "uber" ? "Uber Package Dispatch" : "Barima Ba Rider";
    const smsMessage = `Hello ${data.customer_name.split(" ")[0]}! Your order ${order.order_number} has been received (${dispatchMethodText}). Total: ₵${total.toFixed(2)}. Track your food live on our site.`;
    sendSMSNotification(data.customer_phone, smsMessage).catch(console.error);

    if (data.payment_method === "paystack") {
      const secret = process.env.PAYSTACK_SECRET_KEY;
      if (!secret) {
        return {
          order_id: order.id,
          order_number: order.order_number,
          total_ghs: Number(order.total_ghs),
          paystack_url: null as string | null,
          paystack_error: "Paystack is not configured yet. Ask the shop admin to add PAYSTACK_SECRET_KEY.",
        };
      }
      try {
        const resp = await fetch("https://api.paystack.co/transaction/initialize", {
          method: "POST",
          headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: Math.round(total * 100),
            currency: "GHS",
            email: data.customer_email || `${data.customer_phone.replace(/\D/g, "")}@guest.provision.shop`,
            reference: order.order_number,
            metadata: { order_id: order.id, order_number: order.order_number },
          }),
        });
        const json = (await resp.json()) as { status: boolean; data?: { authorization_url: string }; message?: string };
        if (!json.status || !json.data) throw new Error(json.message || "Paystack init failed");
        await supabaseAdmin.from("orders").update({ payment_reference: order.order_number }).eq("id", order.id);
        return {
          order_id: order.id,
          order_number: order.order_number,
          total_ghs: Number(order.total_ghs),
          paystack_url: json.data.authorization_url,
          paystack_error: null as string | null,
        };
      } catch (e) {
        return {
          order_id: order.id,
          order_number: order.order_number,
          total_ghs: Number(order.total_ghs),
          paystack_url: null as string | null,
          paystack_error: e instanceof Error ? e.message : "Payment init failed",
        };
      }
    }

    return {
      order_id: order.id,
      order_number: order.order_number,
      total_ghs: Number(order.total_ghs),
      paystack_url: null as string | null,
      paystack_error: null as string | null,
    };
  });

export const getOrderByNumber = createServerFn({ method: "POST" })
  .validator(z.object({ order_number: z.string().trim().min(3).max(50) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, status, payment_status, payment_method, delivery_type, dispatch_partner, rider_name, rider_phone, rider_vehicle, uber_tracking_url, estimated_delivery_time, total_ghs, subtotal_ghs, delivery_fee_ghs, created_at, customer_name, delivery_address, ghana_post_gps, gps_coordinates, order_items(product_name, quantity, unit, unit_price_ghs, line_total_ghs)")
      .eq("order_number", data.order_number.trim().toUpperCase())
      .maybeSingle();
    if (error) throw new Error(error.message);
    return order;
  });

export const getUserAccountDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const [profileRes, txRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, phone, delivery_address, ghana_post_gps, gps_coordinates, wallet_balance_ghs, created_at").eq("id", userId).single(),
      supabaseAdmin.from("wallet_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
    ]);

    // Fetch user orders based on profile phone
    let orders: any[] = [];
    if (profileRes.data?.phone) {
      const { data: userOrders } = await supabaseAdmin
        .from("orders")
        .select("id, order_number, status, payment_status, payment_method, delivery_type, dispatch_partner, total_ghs, created_at, delivery_address, uber_tracking_url, rider_name, scheduled_delivery_date, is_subscription, subscription_frequency, order_items(product_id, product_name, quantity, unit, unit_price_ghs)")
        .eq("customer_phone", profileRes.data.phone)
        .order("created_at", { ascending: false })
        .limit(50);
      orders = userOrders ?? [];
    }

    return {
      profile: profileRes.data,
      transactions: txRes.data ?? [],
      orders: orders,
    };
  });

export const updateUserProfileData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    full_name: z.string().trim().min(2).max(100),
    phone: z.string().trim().min(7).max(20),
    delivery_address: z.string().trim().max(500).optional(),
    ghana_post_gps: z.string().trim().max(30).optional(),
    gps_coordinates: z.string().trim().max(60).optional(),
  }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("profiles").upsert({
      id: context.userId,
      full_name: data.full_name,
      phone: data.phone,
      ...(data.delivery_address !== undefined ? { delivery_address: data.delivery_address } : {}),
      ...(data.ghana_post_gps !== undefined ? { ghana_post_gps: data.ghana_post_gps } : {}),
      ...(data.gps_coordinates !== undefined ? { gps_coordinates: data.gps_coordinates } : {}),
    }, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listCustomerOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    phone: z.string().optional(),
    email: z.string().optional(),
  }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    // Get user profile first
    const { data: profile } = await supabaseAdmin.from("profiles").select("phone").eq("id", userId).single();
    const targetPhone = data.phone || profile?.phone;

    let query = supabaseAdmin
      .from("orders")
      .select("id, order_number, status, payment_status, payment_method, delivery_type, dispatch_partner, rider_name, rider_phone, rider_vehicle, uber_tracking_url, estimated_delivery_time, total_ghs, subtotal_ghs, delivery_fee_ghs, created_at, customer_name, customer_phone, delivery_address, ghana_post_gps, gps_coordinates, scheduled_delivery_date, is_subscription, subscription_frequency, order_items(product_id, product_name, quantity, unit, unit_price_ghs, line_total_ghs)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (targetPhone) {
      query = query.eq("customer_phone", targetPhone);
    } else if (data.email) {
      query = query.eq("customer_email", data.email);
    }

    const { data: orders, error } = await query;
    if (error) throw new Error(error.message);
    return orders ?? [];
  });
