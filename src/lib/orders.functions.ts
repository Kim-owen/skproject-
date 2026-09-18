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
  delivery_zone_id: z.string().uuid().optional().nullable().or(z.literal("")),
  ghana_post_gps: z.string().trim().max(15).optional().or(z.literal("")),
  gps_coordinates: z.string().trim().max(60).optional().or(z.literal("")),
  payment_method: z.enum(["paystack", "wallet"]),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  scheduled_delivery_date: z.string().optional().nullable(),
  is_subscription: z.boolean().optional(),
  subscription_frequency: z.enum(["weekly", "biweekly", "monthly"]).optional().nullable(),
  callback_url: z.string().optional().nullable(),
  items: z.array(itemSchema).min(1).max(50),
});

// Barima Ba Kitchen Default Hub (Accra / East Legon)
const STORE_LAT = 5.635;
const STORE_LNG = -0.16;

function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const calculateUberEstimate = createServerFn({ method: "POST" })
  .validator(
    z.object({
      lat: z.number(),
      lng: z.number(),
    }),
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
    throw new Error(
      "SMS sending failed: TXTCONNECT_API_KEY is not configured in the server environment (Vercel/env).",
    );
  }
  try {
    const formattedPhone = normalizePhoneNumber(phone);
    const res = await fetch("https://api.txtconnect.net/dev/api/sms/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
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
    const formattedPhone = normalizePhoneNumber(data.phone);

    // 1. Rate-limiting & anti-SMS pumping: Enforce 60-second cooldown between SMS requests
    const { data: existingRecord } = await supabaseAdmin
      .from("phone_otps")
      .select("created_at")
      .eq("phone", formattedPhone)
      .maybeSingle();

    if (existingRecord?.created_at) {
      const timeSinceCreation = Date.now() - new Date(existingRecord.created_at).getTime();
      const COOLDOWN_MS = 60 * 1000;
      if (timeSinceCreation < COOLDOWN_MS) {
        const remainingSec = Math.ceil((COOLDOWN_MS - timeSinceCreation) / 1000);
        throw new Error(
          `Please wait ${remainingSec} second${remainingSec > 1 ? "s" : ""} before requesting another code.`,
        );
      }
    }

    // 2. Cryptographically secure random 6-digit number (CSPRNG)
    const crypto = await import("node:crypto");
    const otp = crypto.randomInt(100000, 1000000).toString();

    // 3. Tighter 5-minute validity window
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // 4. Store OTP with 0 initial failed attempts (format: 'CODE:ATTEMPTS') and refreshed created_at
    const { error } = await supabaseAdmin.from("phone_otps").upsert(
      {
        phone: formattedPhone,
        code: `${otp}:0`,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
      },
      { onConflict: "phone" },
    );
    if (error) throw new Error("Failed to store verification code: " + error.message);

    const message = `Your Barima Ba Foods verification code is: ${otp}. Valid for 5 minutes. Never share this code.`;
    await sendSMSNotification(formattedPhone, message);
    return { ok: true, message: "Verification code sent via SMS" };
  });

/**
 * Paystack Mobile Money Account Verification
 * Queries Paystack Resolve API (GET https://api.paystack.co/bank/resolve)
 * to retrieve the registered account name for Ghanaian Mobile Money numbers (MTN, Telecel, AirtelTigo).
 */
export async function queryPaystackAccountResolve(phone: string) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return {
      success: false,
      message: "Paystack secret key is not configured.",
    };
  }

  const clean = phone.replace(/[^0-9]/g, "");
  const localNumber = clean.startsWith("233") ? "0" + clean.slice(3) : clean;

  if (localNumber.length < 9 || localNumber.length > 10) {
    return {
      success: false,
      message: "Please enter a valid Ghanaian phone number (e.g. 024 123 4567).",
    };
  }

  // Determine candidate providers in order of priority based on network prefix
  let candidateProviders: Array<{ code: string; name: string }> = [];
  if (/^0(24|54|55|59|53|25)/.test(localNumber)) {
    candidateProviders = [
      { code: "MTN", name: "MTN Mobile Money" },
      { code: "VOD", name: "Telecel Cash" },
      { code: "ATL", name: "AirtelTigo Money" },
    ];
  } else if (/^0(20|50)/.test(localNumber)) {
    candidateProviders = [
      { code: "VOD", name: "Telecel Cash" },
      { code: "MTN", name: "MTN Mobile Money" },
      { code: "ATL", name: "AirtelTigo Money" },
    ];
  } else if (/^0(27|57|26|56)/.test(localNumber)) {
    candidateProviders = [
      { code: "ATL", name: "AirtelTigo Money" },
      { code: "MTN", name: "MTN Mobile Money" },
      { code: "VOD", name: "Telecel Cash" },
    ];
  } else {
    candidateProviders = [
      { code: "MTN", name: "MTN Mobile Money" },
      { code: "VOD", name: "Telecel Cash" },
      { code: "ATL", name: "AirtelTigo Money" },
    ];
  }

  for (const provider of candidateProviders) {
    try {
      const resp = await fetch(
        `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(localNumber)}&bank_code=${encodeURIComponent(provider.code)}`,
        {
          headers: {
            Authorization: `Bearer ${secret}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (resp.ok) {
        const json = await resp.json();
        if (json.status && json.data?.account_name) {
          return {
            success: true,
            account_name: (json.data.account_name as string).trim(),
            account_number: (json.data.account_number as string) || localNumber,
            provider: provider.name,
            bank_code: provider.code,
          };
        }
      }
    } catch (err) {
      console.warn(`[queryPaystackAccountResolve] Error checking ${provider.code}:`, err);
    }
  }

  return {
    success: false,
    message: "Could not resolve account name on Mobile Money. Please enter your name manually.",
  };
}

export const resolvePaystackAccount = createServerFn({ method: "POST" })
  .validator(
    z.object({
      phone: z.string().trim().min(7).max(25),
    }),
  )
  .handler(async ({ data }) => {
    return await queryPaystackAccountResolve(data.phone);
  });

export const verifyPhoneOTP = createServerFn({ method: "POST" })
  .validator(
    z.object({
      phone: z.string().trim().min(7).max(20),
      code: z.string().trim(),
      name: z.string().trim().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const formattedPhone = normalizePhoneNumber(data.phone);

    const { data: record, error } = await supabaseAdmin
      .from("phone_otps")
      .select("code, expires_at")
      .eq("phone", formattedPhone)
      .maybeSingle();

    if (error || !record) {
      throw new Error("Verification code expired or not found. Please request a new code.");
    }

    const isExpired = new Date(record.expires_at).getTime() < Date.now();
    if (isExpired) {
      await supabaseAdmin.from("phone_otps").delete().eq("phone", formattedPhone);
      throw new Error("Verification code has expired. Please request a fresh code.");
    }

    // Anti-Brute-Force: Parse stored code and failed attempts count
    const [storedCode, attemptsStr] = (record.code || "").split(":");
    const currentAttempts = parseInt(attemptsStr || "0", 10);
    const enteredCode = data.code.trim();

    // Lockout check: If already 3 or more attempts, burn the code
    if (currentAttempts >= 3) {
      await supabaseAdmin.from("phone_otps").delete().eq("phone", formattedPhone);
      throw new Error(
        "Too many failed attempts. For your security, this code was invalidated. Please request a new one.",
      );
    }

    if (enteredCode !== storedCode) {
      const nextAttempts = currentAttempts + 1;
      if (nextAttempts >= 3) {
        // Burn the code after 3rd failure
        await supabaseAdmin.from("phone_otps").delete().eq("phone", formattedPhone);
        throw new Error(
          "Incorrect code entered 3 times. This code has been burned for security. Please request a new code.",
        );
      }

      // Record failed attempt in database
      await supabaseAdmin
        .from("phone_otps")
        .update({ code: `${storedCode}:${nextAttempts}` })
        .eq("phone", formattedPhone);

      const attemptsLeft = 3 - nextAttempts;
      throw new Error(
        `Invalid verification code. You have ${attemptsLeft} attempt${attemptsLeft > 1 ? "s" : ""} remaining.`,
      );
    }

    // Correct code entered: burn immediately (single-use)
    await supabaseAdmin.from("phone_otps").delete().eq("phone", formattedPhone);

    const syntheticEmail = `${formattedPhone}@phone.barimaba.com`;
    let targetEmail = syntheticEmail;
    let userId: string | null = null;
    let finalCustomerName: string | undefined = undefined;

    // 1. Check if a profile already exists with this verified phone number
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, phone")
      .eq("phone", formattedPhone)
      .maybeSingle();

    if (existingProfile?.id) {
      userId = existingProfile.id;
      // Fetch associated auth user to see if they registered with a real email
      try {
        const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (authUserData?.user?.email) {
          targetEmail = authUserData.user.email;
        }
      } catch (e) {
        console.warn("[verifyPhoneOTP] Could not fetch auth user by id:", e);
      }

      // Update name and verified status
      let resolvedName = data.name ? data.name.trim() : "";
      if (!resolvedName || resolvedName.length < 2) {
        if (!existingProfile.full_name || existingProfile.full_name === "Customer") {
          const paystackResolve = await queryPaystackAccountResolve(formattedPhone);
          if (paystackResolve.success && paystackResolve.account_name) {
            resolvedName = paystackResolve.account_name;
          }
        }
      }

      if (resolvedName && resolvedName.length >= 2) {
        finalCustomerName = resolvedName;
        await supabaseAdmin
          .from("profiles")
          .update({ full_name: resolvedName, is_phone_verified: true })
          .eq("id", userId);

        try {
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: { full_name: resolvedName, phone: formattedPhone },
          });
        } catch (updateErr) {
          console.warn("[verifyPhoneOTP] updateUserById note:", updateErr);
        }
      } else {
        await supabaseAdmin.from("profiles").update({ is_phone_verified: true }).eq("id", userId);
        finalCustomerName = existingProfile.full_name || undefined;
      }
    } else {
      // 2. New user registration with phone — Full Name is mandatory!
      let fullName = data.name ? data.name.trim() : "";
      if (!fullName || fullName.length < 2) {
        // Fallback: Verify & resolve official legal name from Paystack Mobile Money Account API
        const paystackResolve = await queryPaystackAccountResolve(formattedPhone);
        if (paystackResolve.success && paystackResolve.account_name) {
          fullName = paystackResolve.account_name;
        } else {
          throw new Error(
            "Customer full name is required (minimum 2 characters). Please provide your name to register.",
          );
        }
      }

      const { data: createdUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: syntheticEmail,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: {
          full_name: fullName,
          phone: formattedPhone,
        },
      });

      if (createErr) {
        console.warn("[verifyPhoneOTP] createUser note:", createErr.message);
        // If user already existed in Supabase Auth, lookup by email
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        const found = listData?.users.find(
          (u) => u.email?.toLowerCase() === syntheticEmail.toLowerCase(),
        );
        if (found) {
          userId = found.id;
          // Update their user_metadata with real name
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: { full_name: fullName, phone: formattedPhone },
          });
        }
      } else if (createdUser?.user) {
        userId = createdUser.user.id;
      }

      if (userId) {
        await supabaseAdmin.from("profiles").upsert(
          {
            id: userId,
            full_name: fullName,
            phone: formattedPhone,
            is_phone_verified: true,
          },
          { onConflict: "id" },
        );
      }
      finalCustomerName = fullName;
    }

    // 3. Generate magiclink session token for immediate client-side login
    let token_hash: string | undefined;
    try {
      const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: targetEmail,
      });
      if (linkErr) {
        console.warn("[verifyPhoneOTP] generateLink warning:", linkErr.message);
      } else if (linkData?.properties?.hashed_token) {
        token_hash = linkData.properties.hashed_token;
      }
    } catch (err) {
      console.warn("[verifyPhoneOTP] generateLink failed:", err);
    }

    return {
      ok: true,
      userId,
      token_hash,
      phone: formattedPhone,
      name: finalCustomerName || data.name,
    };
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
    if (!products || products.length !== productIds.length)
      throw new Error("One or more products not found");

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
      if (
        data.dispatch_partner === "uber" &&
        data.gps_coordinates &&
        data.gps_coordinates.includes(",")
      ) {
        // Compute Uber fee strictly on server using GPS coordinates and formula
        const [latStr, lngStr] = data.gps_coordinates.split(",");
        const lat = parseFloat(latStr.trim());
        const lng = parseFloat(lngStr.trim());
        if (!isNaN(lat) && !isNaN(lng)) {
          const distKm = calculateHaversineDistance(STORE_LAT, STORE_LNG, lat, lng);
          const roundedDist = Math.max(1, Math.round(distKm * 10) / 10);
          deliveryFee = Math.round((12 + roundedDist * 2.3) * 100) / 100;
        }
      }

      // If zone fee is used or Uber coordinates were not provided
      if (deliveryFee === 0) {
        if (!data.delivery_zone_id) throw new Error("Delivery zone required for delivery orders");
        if (!data.delivery_address) throw new Error("Delivery address required");
        const { data: zone, error: zErr } = await supabaseAdmin
          .from("delivery_zones")
          .select("fee_ghs")
          .eq("id", data.delivery_zone_id)
          .single();
        if (zErr || !zone) throw new Error("Invalid delivery zone");
        deliveryFee = Number(zone.fee_ghs);
      }
    }

    subtotal = Math.round(subtotal * 100) / 100;
    deliveryFee = Math.round(deliveryFee * 100) / 100;
    // Checkout total is items subtotal (delivery fee paid separately on delivery)
    const total = subtotal;

    // Server-Side Wallet Balance Verification & Deduction
    let initialPaymentStatus: "unpaid" | "paid" = "unpaid";
    let initialOrderStatus: "pending" | "confirmed" = "pending";

    if (data.payment_method === "wallet") {
      if (!context.userId) {
        throw new Error("You must be logged in to pay using your wallet balance.");
      }
      const { data: profile, error: profErr } = await supabaseAdmin
        .from("profiles")
        .select("wallet_balance_ghs")
        .eq("id", context.userId)
        .single();
      if (profErr || !profile) {
        throw new Error("Could not retrieve customer wallet balance.");
      }

      const currentBalance = Number(profile.wallet_balance_ghs || 0);
      if (currentBalance < total) {
        throw new Error(
          `Insufficient wallet balance. Your balance is ₵${currentBalance.toFixed(2)}, but order total is ₵${total.toFixed(2)}. Please top up or pay with Paystack.`,
        );
      }

      // Atomically deduct the exact server total from wallet
      const updatedBalance = Math.round((currentBalance - total) * 100) / 100;
      const { error: deductErr } = await supabaseAdmin
        .from("profiles")
        .update({ wallet_balance_ghs: updatedBalance })
        .eq("id", context.userId);
      if (deductErr) {
        throw new Error("Failed to deduct wallet balance: " + deductErr.message);
      }

      initialPaymentStatus = "paid";
      initialOrderStatus = "confirmed";
    }

    const orderPayload: any = {
      user_id: context.userId || null,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      customer_email: data.customer_email || null,
      delivery_type: data.delivery_type,
      dispatch_partner:
        data.dispatch_partner || (data.delivery_type === "pickup" ? "pickup" : "uber"),
      delivery_address: data.delivery_address || null,
      delivery_zone_id: data.delivery_zone_id || null,
      delivery_fee_ghs: deliveryFee,
      subtotal_ghs: subtotal,
      total_ghs: total,
      payment_method: data.payment_method,
      payment_status: initialPaymentStatus,
      status: initialOrderStatus,
      notes: data.notes || null,
      ghana_post_gps: data.ghana_post_gps || null,
      gps_coordinates: data.gps_coordinates || null,
      scheduled_delivery_date: data.scheduled_delivery_date || null,
      is_subscription: !!data.is_subscription,
      subscription_frequency: data.subscription_frequency || null,
    };

    let { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .insert(orderPayload)
      .select("id, order_number, total_ghs, payment_status")
      .single();

    if (oErr && oErr.message.includes("dispatch_partner")) {
      delete orderPayload.dispatch_partner;
      const retry = await supabaseAdmin
        .from("orders")
        .insert(orderPayload)
        .select("id, order_number, total_ghs, payment_status")
        .single();
      order = retry.data;
      oErr = retry.error;
    }

    if (oErr || !order) throw new Error(oErr?.message || "Failed to create order");

    const { error: iErr } = await supabaseAdmin
      .from("order_items")
      .insert(orderItems.map((it) => ({ ...it, order_id: order.id })));
    if (iErr) throw new Error(iErr.message);

    // Trigger SMS async based on preferences
    try {
      const { getNotificationSettings } = await import("./settings.functions");
      const notifSettings = await getNotificationSettings();

      if (notifSettings.enable_customer_alerts) {
        const dispatchMethodText =
          data.dispatch_partner === "uber" ? "Uber Package Dispatch" : "Barima Ba Rider";
        const smsMessage = `Hello ${data.customer_name.split(" ")[0]}! Your order ${order.order_number} has been received (${dispatchMethodText}). Total: ₵${total.toFixed(2)}. Track your food live on our site.`;
        sendSMSNotification(data.customer_phone, smsMessage).catch(console.error);
      }

      if (notifSettings.enable_admin_alerts && notifSettings.admin_notification_phone) {
        const itemSummary = orderItems.map((it) => `${it.quantity}x ${it.product_name}`).join(", ");
        const adminMessage = `🚨 NEW ORDER! Order #${order.order_number} placed by ${data.customer_name}. Total: ₵${total.toFixed(2)}. Delivery: ${data.delivery_type === "delivery" ? "Doorstep" : "Branch Pickup"}. Details: ${itemSummary}`;
        sendSMSNotification(notifSettings.admin_notification_phone, adminMessage).catch(
          console.error,
        );
      }

      // Trigger Resend HTML Emails (Customer receipt & Admin kitchen alert with EVERY detail)
      import("./email.functions")
        .then(({ sendOrderConfirmationEmailToCustomer, sendNewOrderAlertToAdmin }) => {
          sendOrderConfirmationEmailToCustomer({
            order_number: order.order_number,
            customer_name: data.customer_name,
            customer_email: (data as any).customer_email || context.user?.email || null,
            total_ghs: total,
            delivery_type: data.delivery_type,
            delivery_address: data.delivery_address,
            items: orderItems.map((it) => ({
              product_name: it.product_name,
              quantity: it.quantity,
              unit_price_ghs: Number(it.unit_price_ghs),
            })),
          }).catch(console.error);

          sendNewOrderAlertToAdmin({
            order_number: order.order_number,
            customer_name: data.customer_name,
            customer_phone: data.customer_phone,
            customer_email: (data as any).customer_email || context.user?.email || null,
            delivery_type: data.delivery_type,
            dispatch_partner: data.dispatch_partner,
            delivery_address: data.delivery_address,
            ghana_post_gps: data.ghana_post_gps,
            gps_coordinates: data.gps_coordinates,
            payment_method: data.payment_method,
            payment_status: initialPaymentStatus,
            subtotal_ghs: subtotal,
            delivery_fee_ghs: deliveryFee,
            total_ghs: total,
            notes: data.notes,
            scheduled_delivery_date: data.scheduled_delivery_date,
            is_subscription: data.is_subscription,
            subscription_frequency: data.subscription_frequency,
            items: orderItems.map((it) => ({
              product_name: it.product_name,
              quantity: it.quantity,
              unit: it.unit,
              unit_price_ghs: Number(it.unit_price_ghs),
              line_total_ghs: Number(it.line_total_ghs),
            })),
          }).catch(console.error);
        })
        .catch((emailErr) => console.error("Email notification import error:", emailErr));
    } catch (notifErr) {
      console.error("Notification triggers failed:", notifErr);
    }

    if (data.payment_method === "paystack") {
      const secret = process.env.PAYSTACK_SECRET_KEY;
      if (!secret || secret.includes("placeholder")) {
        return {
          order_id: order.id,
          order_number: order.order_number,
          total_ghs: Number(order.total_ghs),
          paystack_url: null as string | null,
          paystack_error:
            "Paystack is not fully configured with a valid secret key yet. Please provide PAYSTACK_SECRET_KEY in .env.",
        };
      }
      try {
        const reference = `${order.order_number}-${Date.now().toString().slice(-6)}`;
        const cleanPhone = (data.customer_phone || "").replace(/\D/g, "");
        const cleanEmail =
          data.customer_email && data.customer_email.includes("@")
            ? data.customer_email.trim()
            : `${cleanPhone || "customer"}@guest.barimabafoods.shop`;

        // Pre-fill Mobile Money provider metadata for Ghana Telcos (MTN, Telecel, AirtelTigo)
        let momoProvider = "mtn";
        if (
          cleanPhone.startsWith("020") ||
          cleanPhone.startsWith("050") ||
          cleanPhone.startsWith("23320") ||
          cleanPhone.startsWith("23350")
        ) {
          momoProvider = "vodafone"; // Telecel Cash
        } else if (
          cleanPhone.startsWith("027") ||
          cleanPhone.startsWith("057") ||
          cleanPhone.startsWith("026") ||
          cleanPhone.startsWith("056") ||
          cleanPhone.startsWith("23327") ||
          cleanPhone.startsWith("23357")
        ) {
          momoProvider = "tigo"; // AirtelTigo Money
        }

        const resp = await fetch("https://api.paystack.co/transaction/initialize", {
          method: "POST",
          headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: Math.round(total * 100),
            currency: "GHS",
            email: cleanEmail,
            reference,
            callback_url: data.callback_url
              ? data.callback_url.includes("{order_number}")
                ? data.callback_url.replace("{order_number}", order.order_number)
                : `${data.callback_url.replace(/\/$/, "")}/${order.order_number}?reference=${reference}&from_paystack=1`
              : undefined,
            channels: ["card", "mobile_money"],
            metadata: {
              order_id: order.id,
              order_number: order.order_number,
              customer_name: data.customer_name,
              customer_phone: data.customer_phone,
              phone: cleanPhone,
              mobile_money: {
                phone: cleanPhone,
                provider: momoProvider,
              },
              custom_fields: [
                {
                  display_name: "Customer Phone",
                  variable_name: "customer_phone",
                  value: data.customer_phone,
                },
                {
                  display_name: "Order Number",
                  variable_name: "order_number",
                  value: order.order_number,
                },
              ],
            },
          }),
        });

        const json = (await resp.json()) as {
          status: boolean;
          data?: { authorization_url: string; access_code?: string; reference: string };
          message?: string;
        };

        if (!json.status || !json.data) {
          console.error("[Paystack Init Error]", json);
          throw new Error(json.message || "Paystack transaction initialize failed");
        }

        await supabaseAdmin
          .from("orders")
          .update({ payment_reference: reference })
          .eq("id", order.id);

        return {
          order_id: order.id,
          order_number: order.order_number,
          total_ghs: Number(order.total_ghs),
          paystack_url: json.data.authorization_url,
          paystack_error: null as string | null,
        };
      } catch (e) {
        console.error("[Paystack Exception]", e);
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
    const fullCols =
      "id, order_number, status, payment_status, payment_method, payment_reference, delivery_type, dispatch_partner, rider_name, rider_phone, rider_vehicle, uber_tracking_url, estimated_delivery_time, total_ghs, subtotal_ghs, delivery_fee_ghs, created_at, customer_name, customer_phone, customer_email, delivery_address, ghana_post_gps, gps_coordinates, order_items(product_name, quantity, unit, unit_price_ghs, line_total_ghs)";

    const baseCols =
      "id, order_number, status, payment_status, payment_method, payment_reference, delivery_type, total_ghs, subtotal_ghs, delivery_fee_ghs, created_at, customer_name, customer_phone, customer_email, delivery_address, ghana_post_gps, gps_coordinates, order_items(product_name, quantity, unit, unit_price_ghs, line_total_ghs)";

    let { data: order, error } = await supabaseAdmin
      .from("orders")
      .select(fullCols)
      .eq("order_number", data.order_number.trim().toUpperCase())
      .maybeSingle();

    if (error) {
      console.warn(
        "[getOrderByNumber] Query with fullCols failed, trying baseCols:",
        error.message,
      );
      const retry = await supabaseAdmin
        .from("orders")
        .select(baseCols)
        .eq("order_number", data.order_number.trim().toUpperCase())
        .maybeSingle();
      order = retry.data as any;
      error = retry.error;
    }

    if (error) throw new Error(error.message);
    return order;
  });

export const initiatePaystackPayment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      order_number: z.string().trim().min(3).max(50),
      callback_url: z.string().optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id, order_number, total_ghs, customer_name, customer_phone, customer_email, payment_status",
      )
      .eq("order_number", data.order_number.trim().toUpperCase())
      .single();

    if (error || !order) throw new Error("Order not found");
    if (order.payment_status === "paid") {
      throw new Error("This order has already been paid for.");
    }

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret || secret.includes("placeholder")) {
      throw new Error(
        "Paystack secret key is not configured yet. Please add a valid PAYSTACK_SECRET_KEY in your .env configuration.",
      );
    }

    // Generate unique reference attempt to avoid Paystack duplicate reference rejection
    const reference = `${order.order_number}-${Date.now().toString().slice(-6)}`;
    const totalKobo = Math.round(Number(order.total_ghs) * 100);

    const resp = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: totalKobo,
        currency: "GHS",
        email:
          order.customer_email ||
          `${order.customer_phone?.replace(/\D/g, "") || "customer"}@guest.barimabafoods.shop`,
        reference,
        callback_url: data.callback_url
          ? data.callback_url.includes("{order_number}")
            ? data.callback_url.replace("{order_number}", order.order_number)
            : `${data.callback_url.replace(/\/$/, "")}/${order.order_number}?reference=${reference}&from_paystack=1`
          : undefined,
        channels: ["card", "mobile_money"],
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
        },
      }),
    });

    const json = (await resp.json()) as {
      status: boolean;
      data?: { authorization_url: string; access_code?: string; reference: string };
      message?: string;
    };

    if (!json.status || !json.data) {
      throw new Error(json.message || "Failed to initialize Paystack checkout");
    }

    await supabaseAdmin.from("orders").update({ payment_reference: reference }).eq("id", order.id);

    return {
      authorization_url: json.data.authorization_url,
      reference,
    };
  });

export const verifyPaystackPayment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      reference: z.string().trim().min(3).max(100),
      order_number: z.string().trim().optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const secret = process.env.PAYSTACK_SECRET_KEY;

    if (!secret || secret.includes("placeholder")) {
      throw new Error(
        "Paystack secret key is not configured. Please add PAYSTACK_SECRET_KEY to .env",
      );
    }

    const resp = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(data.reference)}`,
      {
        headers: { Authorization: `Bearer ${secret}` },
      },
    );

    const vjson = (await resp.json()) as {
      status: boolean;
      data?: {
        status: string;
        amount: number;
        currency: string;
        reference: string;
        channel: string;
        paid_at: string;
        customer?: { email: string; phone?: string };
        metadata?: { order_id?: string; order_number?: string };
      };
      message?: string;
    };

    if (!vjson.status || !vjson.data) {
      throw new Error(vjson.message || "Failed to verify transaction with Paystack");
    }

    if (vjson.data.status !== "success") {
      return {
        success: false,
        status: vjson.data.status,
        message: `Paystack reported payment status as ${vjson.data.status}`,
      };
    }

    // Locate the matching order
    let query = supabaseAdmin
      .from("orders")
      .select("id, order_number, total_ghs, payment_status, status, customer_name, customer_phone");

    if (data.order_number) {
      query = query.eq("order_number", data.order_number.toUpperCase());
    } else {
      query = query.or(`payment_reference.eq.${data.reference},order_number.eq.${data.reference}`);
    }

    const { data: order, error: findErr } = await query.maybeSingle();
    if (findErr || !order) {
      throw new Error("No matching order found for this payment reference.");
    }

    if (order.payment_status === "paid") {
      return {
        success: true,
        already_paid: true,
        order_number: order.order_number,
        message: "Order has already been confirmed and marked as paid.",
      };
    }

    const expectedKobo = Math.round(Number(order.total_ghs) * 100);
    if (vjson.data.amount < expectedKobo) {
      throw new Error(
        `Amount received (GHS ${(vjson.data.amount / 100).toFixed(2)}) is less than required order total (GHS ${Number(order.total_ghs).toFixed(2)})`,
      );
    }

    const nextStatus = order.status === "pending" ? "confirmed" : order.status;
    const { error: updateErr } = await supabaseAdmin
      .from("orders")
      .update({
        payment_status: "paid",
        payment_reference: data.reference,
        status: nextStatus,
      })
      .eq("id", order.id);

    if (updateErr) throw new Error(updateErr.message);

    // Trigger full SMS and Email notifications (Admin & Customer) upon payment confirmation
    triggerOrderPaymentConfirmedNotifications(order.id).catch((err) =>
      console.error("Payment confirmation notification trigger failed:", err),
    );

    return {
      success: true,
      order_number: order.order_number,
      channel: vjson.data.channel,
      message: "Payment verified successfully!",
    };
  });

export const getUserAccountDetails = createServerFn({ method: "POST" })
  .validator((d: { userId?: string } | undefined) => d)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as any)?.userId || data?.userId;

    if (!userId) {
      return {
        profile: null,
        transactions: [],
        orders: [],
      };
    }

    const [{ data: profile }, authUserRes, txRes] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select(
          "id, full_name, phone, delivery_address, ghana_post_gps, gps_coordinates, wallet_balance_ghs, created_at",
        )
        .eq("id", userId)
        .maybeSingle(),
      supabaseAdmin.auth.admin.getUserById(userId).catch(() => ({ data: { user: null } })),
      supabaseAdmin
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    const authEmail = authUserRes?.data?.user?.email;
    const phone = profile?.phone ? profile.phone.trim() : "";
    const digitsOnly = phone.replace(/\D/g, "");
    const last9Digits = digitsOnly.length >= 9 ? digitsOnly.slice(-9) : digitsOnly;

    let orders: any[] = [];
    try {
      const fullCols =
        "id, order_number, status, payment_status, payment_method, delivery_type, total_ghs, created_at, delivery_address, uber_tracking_url, rider_name, scheduled_delivery_date, is_subscription, subscription_frequency, order_items(product_id, product_name, quantity, unit, unit_price_ghs)";
      const baseCols =
        "id, order_number, status, payment_status, payment_method, delivery_type, total_ghs, created_at, delivery_address, order_items(product_id, product_name, quantity, unit, unit_price_ghs)";

      const runOrderQuery = async (selectCols: string) => {
        let q = supabaseAdmin
          .from("orders")
          .select(selectCols)
          .order("created_at", { ascending: false })
          .limit(50);

        if (last9Digits) {
          if (authEmail) {
            q = q.or(`customer_phone.ilike.%${last9Digits}%,customer_email.ilike.${authEmail}`);
          } else {
            q = q.ilike("customer_phone", `%${last9Digits}%`);
          }
        } else if (authEmail) {
          q = q.ilike("customer_email", authEmail);
        }
        return await q;
      };

      let res = await runOrderQuery(fullCols);
      if (res.error) {
        console.warn("[getUserAccountDetails] Retrying with base columns:", res.error.message);
        res = await runOrderQuery(baseCols);
      }
      orders = res.data ?? [];
    } catch (err) {
      console.error("[getUserAccountDetails] Error fetching user orders:", err);
    }

    return {
      profile: profile || null,
      transactions: txRes.data ?? [],
      orders: orders,
    };
  });

export const updateUserProfileData = createServerFn({ method: "POST" })
  .validator(
    z.object({
      userId: z.string().optional(),
      full_name: z.string().trim().min(2).max(100),
      phone: z.string().trim().min(7).max(20),
      delivery_address: z.string().trim().max(500).optional(),
      ghana_post_gps: z.string().trim().max(30).optional(),
      gps_coordinates: z.string().trim().max(60).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as any)?.userId || data?.userId;
    if (!userId) {
      throw new Error("User ID is required to update profile");
    }

    const { error } = await supabaseAdmin.from("profiles").upsert(
      {
        id: userId,
        full_name: data.full_name,
        phone: data.phone,
        ...(data.delivery_address !== undefined ? { delivery_address: data.delivery_address } : {}),
        ...(data.ghana_post_gps !== undefined ? { ghana_post_gps: data.ghana_post_gps } : {}),
        ...(data.gps_coordinates !== undefined ? { gps_coordinates: data.gps_coordinates } : {}),
      },
      { onConflict: "id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listCustomerOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      phone: z.string().optional(),
      email: z.string().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const [{ data: profile }, authUserRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("phone").eq("id", userId).maybeSingle(),
      supabaseAdmin.auth.admin.getUserById(userId).catch(() => ({ data: { user: null } })),
    ]);

    const authEmail = authUserRes?.data?.user?.email;
    const targetPhone = (data.phone || profile?.phone || "").trim();
    const targetEmail = (data.email || authEmail || "").trim().toLowerCase();

    const digitsOnly = targetPhone.replace(/\D/g, "");
    const last9Digits = digitsOnly.length >= 9 ? digitsOnly.slice(-9) : digitsOnly;

    const runQuery = async (selectCols: string) => {
      let q = supabaseAdmin
        .from("orders")
        .select(selectCols)
        .order("created_at", { ascending: false })
        .limit(100);

      if (last9Digits && targetEmail) {
        q = q.or(`customer_phone.ilike.%${last9Digits}%,customer_email.ilike.${targetEmail}`);
      } else if (last9Digits) {
        q = q.ilike("customer_phone", `%${last9Digits}%`);
      } else if (targetEmail) {
        q = q.ilike("customer_email", targetEmail);
      }

      return await q;
    };

    const fullCols =
      "id, order_number, status, payment_status, payment_method, delivery_type, dispatch_partner, rider_name, rider_phone, rider_vehicle, uber_tracking_url, estimated_delivery_time, total_ghs, subtotal_ghs, delivery_fee_ghs, created_at, customer_name, customer_phone, customer_email, delivery_address, ghana_post_gps, gps_coordinates, scheduled_delivery_date, is_subscription, subscription_frequency, order_items(product_id, product_name, quantity, unit, unit_price_ghs, line_total_ghs)";

    const baseCols =
      "id, order_number, status, payment_status, payment_method, delivery_type, total_ghs, subtotal_ghs, delivery_fee_ghs, created_at, customer_name, customer_phone, customer_email, delivery_address, ghana_post_gps, gps_coordinates, order_items(product_id, product_name, quantity, unit, unit_price_ghs, line_total_ghs)";

    let res = await runQuery(fullCols);
    if (res.error) {
      console.warn("[listCustomerOrders] Retrying with base columns:", res.error.message);
      res = await runQuery(baseCols);
    }

    if (res.error) {
      console.error("[listCustomerOrders] Error:", res.error);
      return [];
    }

    return res.data ?? [];
  });

export async function triggerOrderPaymentConfirmedNotifications(orderId: string) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getNotificationSettings } = await import("./settings.functions");
    const { sendNewOrderAlertToAdmin, sendOrderConfirmationEmailToCustomer } =
      await import("./email.functions");

    const fullCols =
      "id, order_number, customer_name, customer_phone, customer_email, delivery_type, dispatch_partner, delivery_address, ghana_post_gps, gps_coordinates, payment_method, payment_status, payment_reference, subtotal_ghs, delivery_fee_ghs, total_ghs, notes, scheduled_delivery_date, is_subscription, subscription_frequency, order_items(product_name, quantity, unit, unit_price_ghs, line_total_ghs)";

    const baseCols =
      "id, order_number, customer_name, customer_phone, customer_email, delivery_type, delivery_address, ghana_post_gps, gps_coordinates, payment_method, payment_status, payment_reference, subtotal_ghs, delivery_fee_ghs, total_ghs, notes, order_items(product_name, quantity, unit, unit_price_ghs, line_total_ghs)";

    const { data: initialOrder, error: queryError } = await supabaseAdmin
      .from("orders")
      .select(fullCols)
      .eq("id", orderId)
      .maybeSingle();

    let order = initialOrder;

    if (queryError) {
      const retry = await supabaseAdmin
        .from("orders")
        .select(baseCols)
        .eq("id", orderId)
        .maybeSingle();
      order = retry.data as any;
    }

    if (!order) return;

    const notifSettings = await getNotificationSettings();

    // 1. Send Customer SMS
    if (notifSettings.enable_customer_alerts && order.customer_phone) {
      const customerMsg = `Barima Ba Foods: Payment of ₵${Number(order.total_ghs).toFixed(2)} for Order #${order.order_number} confirmed! Our kitchen is preparing your authentic meal.`;
      sendSMSNotification(order.customer_phone, customerMsg).catch(console.error);
    }

    // 2. Send Customer Email Receipt
    sendOrderConfirmationEmailToCustomer({
      order_number: order.order_number,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      total_ghs: Number(order.total_ghs),
      delivery_type: order.delivery_type,
      delivery_address: order.delivery_address,
      items: (order.order_items || []).map((it: any) => ({
        product_name: it.product_name,
        quantity: it.quantity,
        unit_price_ghs: Number(it.unit_price_ghs || 0),
      })),
    }).catch(console.error);

    // 3. Send Admin SMS Alert with order details
    if (notifSettings.enable_admin_alerts && notifSettings.admin_notification_phone) {
      const itemsSummary = (order.order_items || [])
        .map((it: any) => `${it.quantity}x ${it.product_name}`)
        .join(", ");
      const adminSmsMsg = `🚨 PAYMENT CONFIRMED! Order #${order.order_number} paid via ${order.payment_method}. Total: ₵${Number(order.total_ghs).toFixed(2)}. Customer: ${order.customer_name} (${order.customer_phone}). Delivery: ${order.delivery_type === "delivery" ? order.delivery_address || "Doorstep" : "Branch Pickup"}. Items: ${itemsSummary}`;
      sendSMSNotification(notifSettings.admin_notification_phone, adminSmsMsg).catch(console.error);
    }

    // 4. Send Admin Email Alert with EVERY detail
    sendNewOrderAlertToAdmin({
      order_number: order.order_number,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      customer_email: order.customer_email,
      delivery_type: order.delivery_type,
      dispatch_partner: (order as any).dispatch_partner,
      delivery_address: order.delivery_address,
      ghana_post_gps: (order as any).ghana_post_gps,
      gps_coordinates: (order as any).gps_coordinates,
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      payment_reference: order.payment_reference,
      subtotal_ghs: Number(order.subtotal_ghs || order.total_ghs),
      delivery_fee_ghs: Number(order.delivery_fee_ghs || 0),
      total_ghs: Number(order.total_ghs),
      notes: (order as any).notes,
      scheduled_delivery_date: (order as any).scheduled_delivery_date,
      is_subscription: (order as any).is_subscription,
      subscription_frequency: (order as any).subscription_frequency,
      items: (order.order_items || []).map((it: any) => ({
        product_name: it.product_name,
        quantity: it.quantity,
        unit: it.unit,
        unit_price_ghs: Number(it.unit_price_ghs || 0),
        line_total_ghs: Number(it.line_total_ghs || 0),
      })),
    }).catch(console.error);
  } catch (err) {
    console.error("[triggerOrderPaymentConfirmedNotifications] Error:", err);
  }
}
