import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

import { assertAdmin } from "./admin.functions";

export async function sendResendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn("[Resend] RESEND_API_KEY not found in environment.");
    return { success: false, message: "RESEND_API_KEY missing" };
  }

  const recipients = Array.isArray(params.to) ? params.to : [params.to];
  if (recipients.length === 0) return { success: true, sentCount: 0 };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Barima Ba Foods <notifications@barimabafoods.shop>",
      to: recipients,
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("[Resend] Failed to send email:", data);
    throw new Error(data?.message || "Failed to send email via Resend");
  }
  return { success: true, data };
}

export async function sendResendPrivateBroadcast(params: {
  recipients: string[];
  subject: string;
  html: string;
  text?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn("[Resend] RESEND_API_KEY not found in environment.");
    return { success: false, sentCount: 0 };
  }

  const validRecipients = params.recipients.filter(
    (e): e is string =>
      Boolean(e) && typeof e === "string" && !e.includes("@guest.barimabafoods.shop"),
  );

  if (validRecipients.length === 0) return { success: true, sentCount: 0 };

  let sentCount = 0;
  const chunkSize = 5;

  for (let i = 0; i < validRecipients.length; i += chunkSize) {
    const chunk = validRecipients.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (email) => {
        try {
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Barima Ba Foods <notifications@barimabafoods.shop>",
              to: [email],
              subject: params.subject,
              html: params.html,
              text: params.text,
            }),
          });
          if (response.ok) {
            sentCount++;
          } else {
            const errData = await response.json();
            console.error(`[Resend] Failed to send email to ${email}:`, errData);
          }
        } catch (err) {
          console.error(`[Resend] Network error sending to ${email}:`, err);
        }
      }),
    );
  }

  return { success: true, sentCount };
}

export async function notifyAllUsersNewItem(item: {
  title: string;
  type: "product" | "package" | "catering";
  price_ghs?: number;
  unit?: string;
  image_url?: string | null;
  description?: string | null;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch user emails from auth
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const userEmails = (authData?.users || [])
      .map((u) => u.email)
      .filter(
        (e): e is string =>
          Boolean(e) && typeof e === "string" && !e.includes("@guest.barimabafoods.shop"),
      );

    if (userEmails.length === 0) {
      console.log("[Resend] No customer emails found to notify.");
      return { success: true, sentCount: 0 };
    }

    const itemLabel = item.type === "package" ? "NEW CATERING PACKAGE" : "NEW PRODUCT ADDED";
    const subject = `🔥 ${itemLabel}: ${item.title} is now live on Barima Ba Foods!`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #09090b; color: #ffffff; padding: 28px; border-radius: 20px; border: 1px solid #f59e0b44; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="https://barimabafoods.shop/images/barima-ba-logo-blended.png" alt="Barima Ba Foods" style="max-height: 80px; margin-bottom: 12px; display: inline-block;" />
          <div>
            <span style="display: inline-block; background-color: #f59e0b; color: #000000; font-size: 11px; font-weight: 900; padding: 4px 14px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 1px;">
              ${itemLabel}
            </span>
          </div>
        </div>

        <h2 style="font-size: 24px; font-weight: 900; color: #f59e0b; margin-top: 16px; margin-bottom: 12px; text-align: center; line-height: 1.2;">
          ${item.title}
        </h2>

        ${
          item.image_url
            ? `<div style="text-align: center; margin: 20px 0;">
                <img src="${item.image_url}" alt="${item.title}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 14px; border: 1px solid #f59e0b33;" />
               </div>`
            : ""
        }

        ${
          item.description
            ? `<p style="font-size: 14px; color: #d4d4d8; line-height: 1.6; margin: 16px 0; text-align: center;">
                ${item.description}
               </p>`
            : ""
        }

        ${
          item.price_ghs !== undefined && item.price_ghs > 0
            ? `<div style="text-align: center; font-size: 22px; font-weight: 900; color: #10b981; margin: 18px 0;">
                GH₵ ${Number(item.price_ghs).toFixed(2)} ${item.unit ? `<span style="font-size: 13px; color: #a1a1aa; font-weight: normal;">/ ${item.unit}</span>` : ""}
               </div>`
            : ""
        }

        <div style="text-align: center; margin-top: 28px; margin-bottom: 20px;">
          <a href="https://barimabafoods.shop/shop" style="background-color: #f59e0b; color: #000000; font-weight: 900; padding: 14px 32px; border-radius: 12px; text-decoration: none; display: inline-block; font-size: 15px; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);">
            Order Now on Barima Ba Foods
          </a>
        </div>

        <hr style="border: 0; border-top: 1px solid #27272a; margin: 28px 0;" />
        <p style="font-size: 12px; color: #71717a; text-align: center; margin: 0; line-height: 1.5;">
          Barima Ba Foods — Taste. Quality. Trust.<br />
          Accra, Ghana | Support: support@barimabafoods.shop
        </p>
      </div>
    `;

    const res = await sendResendPrivateBroadcast({
      recipients: userEmails,
      subject,
      html: htmlContent,
    });

    console.log(`[Resend] Successfully sent private email broadcast to ${res.sentCount} users.`);
    return { success: true, sentCount: res.sentCount };
  } catch (err: any) {
    console.error("[Resend Broadcast Error]:", err);
    return { success: false, error: err.message };
  }
}

export const sendAdminEmailBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      subject: z.string().trim().min(3).max(150),
      message: z.string().trim().min(10).max(3000),
      cta_url: z.string().trim().optional(),
      cta_text: z.string().trim().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const userEmails = (authData?.users || [])
      .map((u) => u.email)
      .filter(
        (e): e is string =>
          Boolean(e) && typeof e === "string" && !e.includes("@guest.barimabafoods.shop"),
      );

    if (userEmails.length === 0) {
      return { success: true, sentCount: 0 };
    }

    const ctaButton = data.cta_url
      ? `<div style="text-align: center; margin-top: 28px; margin-bottom: 20px;">
          <a href="${data.cta_url}" style="background-color: #f59e0b; color: #000000; font-weight: 900; padding: 14px 32px; border-radius: 12px; text-decoration: none; display: inline-block; font-size: 15px;">
            ${data.cta_text || "View Announcement"}
          </a>
         </div>`
      : "";

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #09090b; color: #ffffff; padding: 28px; border-radius: 20px; border: 1px solid #f59e0b44;">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="https://barimabafoods.shop/images/barima-ba-logo-blended.png" alt="Barima Ba Foods" style="max-height: 80px; margin-bottom: 12px;" />
        </div>
        <h2 style="font-size: 22px; font-weight: 900; color: #f59e0b; text-align: center; margin-bottom: 20px;">
          ${data.subject}
        </h2>
        <div style="font-size: 14px; color: #d4d4d8; line-height: 1.7; white-space: pre-wrap;">
          ${data.message}
        </div>
        ${ctaButton}
        <hr style="border: 0; border-top: 1px solid #27272a; margin: 28px 0;" />
        <p style="font-size: 12px; color: #71717a; text-align: center; margin: 0;">
          Barima Ba Foods — Taste. Quality. Trust.<br />
          Accra, Ghana | Support: support@barimabafoods.shop
        </p>
      </div>
    `;

    const res = await sendResendPrivateBroadcast({
      recipients: userEmails,
      subject: data.subject,
      html: htmlContent,
    });

    return { success: true, sentCount: res.sentCount };
  });

export async function sendOrderConfirmationEmailToCustomer(order: {
  order_number: string;
  customer_name: string;
  customer_email?: string | null;
  total_ghs: number;
  delivery_type: string;
  delivery_address?: string | null;
  items: Array<{ product_name: string; quantity: number; unit_price_ghs: number }>;
}) {
  if (!order.customer_email || order.customer_email.includes("@guest.barimabafoods.shop")) {
    return;
  }

  const itemsTable = order.items
    .map(
      (it) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #27272a; color: #ffffff;">${it.product_name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #27272a; text-align: center; color: #a1a1aa;">x${it.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #27272a; text-align: right; color: #10b981; font-weight: bold;">GH₵ ${(it.unit_price_ghs * it.quantity).toFixed(2)}</td>
    </tr>
  `,
    )
    .join("");

  const trackingUrl = `https://barimabafoods.shop/order/${order.order_number}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #09090b; color: #ffffff; padding: 28px; border-radius: 20px; border: 1px solid #f59e0b44;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="https://barimabafoods.shop/images/barima-ba-logo-blended.png" alt="Barima Ba Foods" style="max-height: 80px;" />
      </div>
      <h2 style="color: #f59e0b; text-align: center; font-size: 22px; margin-top: 10px;">Order Confirmation #${order.order_number}</h2>
      <p style="text-align: center; color: #d4d4d8; font-size: 14px;">
        Thank you for ordering with <strong>Barima Ba Foods</strong>, ${order.customer_name.split(" ")[0]}! We are preparing your delicious order.
      </p>

      <div style="margin: 20px 0; background-color: #18181b; padding: 16px; border-radius: 12px; border: 1px solid #27272a;">
        <h4 style="color: #f59e0b; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase;">Order Summary</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="color: #a1a1aa; text-align: left; border-bottom: 1px solid #3f3f46;">
              <th style="padding: 6px;">Item</th>
              <th style="padding: 6px; text-align: center;">Qty</th>
              <th style="padding: 6px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsTable}
          </tbody>
        </table>

        <div style="display: flex; justify-content: space-between; margin-top: 16px; padding-top: 12px; border-top: 1px solid #3f3f46; font-size: 16px; font-weight: bold;">
          <span style="color: #ffffff;">Total Amount:</span>
          <span style="color: #10b981;">GH₵ ${Number(order.total_ghs).toFixed(2)}</span>
        </div>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="${trackingUrl}" style="background-color: #f59e0b; color: #000000; font-weight: bold; padding: 14px 28px; border-radius: 12px; text-decoration: none; display: inline-block;">
          Track Your Order Live
        </a>
      </div>

      <hr style="border: 0; border-top: 1px solid #27272a; margin: 24px 0;" />
      <p style="font-size: 11px; color: #71717a; text-align: center;">
        Barima Ba Foods | Support: support@barimabafoods.shop
      </p>
    </div>
  `;

  await sendResendEmail({
    to: order.customer_email,
    subject: `✅ Order Received #${order.order_number} — Barima Ba Foods`,
    html: htmlContent,
  });
}

export async function sendNewOrderAlertToAdmin(order: {
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  delivery_type: string;
  dispatch_partner?: string | null;
  delivery_address?: string | null;
  ghana_post_gps?: string | null;
  gps_coordinates?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  payment_reference?: string | null;
  subtotal_ghs?: number;
  delivery_fee_ghs?: number;
  total_ghs: number;
  notes?: string | null;
  scheduled_delivery_date?: string | null;
  is_subscription?: boolean;
  subscription_frequency?: string | null;
  items: Array<{
    product_name: string;
    quantity: number;
    unit?: string;
    unit_price_ghs?: number;
    line_total_ghs?: number;
  }>;
}) {
  const adminEmail = process.env.ADMIN_NOTIF_EMAIL || "support@barimabafoods.shop";

  const isPaid = order.payment_status === "paid";
  const headerTitle = isPaid
    ? `💰 PAYMENT CONFIRMED — ORDER #${order.order_number}`
    : `🚨 NEW KITCHEN ORDER #${order.order_number}`;

  const itemsRows = order.items
    .map(
      (it) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #27272a; color: #ffffff; font-weight: bold;">
        ${it.product_name} ${it.unit ? `<span style="font-size: 11px; color: #a1a1aa; font-weight: normal;">(${it.unit})</span>` : ""}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #27272a; text-align: center; color: #f59e0b; font-weight: bold;">
        x${it.quantity}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #27272a; text-align: right; color: #a1a1aa;">
        ${it.unit_price_ghs ? `GH₵ ${Number(it.unit_price_ghs).toFixed(2)}` : "-"}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #27272a; text-align: right; color: #10b981; font-weight: bold;">
        ${it.line_total_ghs ? `GH₵ ${Number(it.line_total_ghs).toFixed(2)}` : "-"}
      </td>
    </tr>
  `,
    )
    .join("");

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; background-color: #09090b; color: #ffffff; padding: 28px; border-radius: 20px; border: 1px solid ${isPaid ? "#10b981" : "#ef4444"}; shadow: 0 10px 30px rgba(0,0,0,0.5);">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="https://barimabafoods.shop/images/barima-ba-logo-blended.png" alt="Barima Ba Foods" style="max-height: 75px; margin-bottom: 8px;" />
        <h2 style="color: ${isPaid ? "#10b981" : "#ef4444"}; font-size: 20px; margin: 8px 0 4px 0;">${headerTitle}</h2>
        <span style="display: inline-block; background-color: ${isPaid ? "#10b98122" : "#ef444422"}; color: ${isPaid ? "#10b981" : "#ef4444"}; font-size: 11px; font-weight: bold; padding: 4px 12px; border-radius: 9999px; border: 1px solid ${isPaid ? "#10b98144" : "#ef444444"}; text-transform: uppercase;">
          ${isPaid ? "✓ PAYMENT VERIFIED & PAID" : "PAYMENT PENDING / RECEIVED"}
        </span>
      </div>

      <!-- Customer & Fulfillment Section -->
      <div style="background-color: #18181b; padding: 18px; border-radius: 14px; margin-bottom: 16px; border: 1px solid #27272a; font-size: 13px; line-height: 1.6;">
        <h4 style="color: #f59e0b; margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">👤 Customer & Contact</h4>
        <div style="color: #d4d4d8;">
          <p style="margin: 3px 0;"><strong>Customer Name:</strong> <span style="color: #ffffff; font-weight: bold;">${order.customer_name}</span></p>
          <p style="margin: 3px 0;"><strong>Phone Number:</strong> <a href="tel:${order.customer_phone.replace(/\s+/g, "")}" style="color: #f59e0b; text-decoration: none; font-weight: bold;">${order.customer_phone}</a></p>
          ${order.customer_email ? `<p style="margin: 3px 0;"><strong>Email Address:</strong> <span style="color: #ffffff;">${order.customer_email}</span></p>` : ""}
        </div>
      </div>

      <!-- Fulfillment Logistics -->
      <div style="background-color: #18181b; padding: 18px; border-radius: 14px; margin-bottom: 16px; border: 1px solid #27272a; font-size: 13px; line-height: 1.6;">
        <h4 style="color: #f59e0b; margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">🚗 Logistics & Location</h4>
        <div style="color: #d4d4d8;">
          <p style="margin: 3px 0;"><strong>Delivery Method:</strong> <span style="color: #ffffff; font-weight: bold;">${order.delivery_type === "delivery" ? "Doorstep Delivery" : "Branch Pickup"}</span></p>
          ${order.dispatch_partner ? `<p style="margin: 3px 0;"><strong>Dispatch Partner:</strong> <span style="color: #f59e0b;">${order.dispatch_partner === "uber" ? "Uber Package Dispatch" : order.dispatch_partner}</span></p>` : ""}
          ${order.delivery_address ? `<p style="margin: 3px 0;"><strong>Address:</strong> <span style="color: #ffffff;">${order.delivery_address}</span></p>` : ""}
          ${order.ghana_post_gps ? `<p style="margin: 3px 0;"><strong>Ghana Post GPS:</strong> <span style="color: #f59e0b; font-family: monospace; font-weight: bold;">${order.ghana_post_gps}</span></p>` : ""}
          ${order.gps_coordinates ? `<p style="margin: 3px 0;"><strong>GPS Coordinates:</strong> <span style="color: #38bdf8; font-family: monospace;">${order.gps_coordinates}</span></p>` : ""}
          ${order.scheduled_delivery_date ? `<p style="margin: 3px 0;"><strong>Scheduled For:</strong> <span style="color: #a855f7; font-weight: bold;">${order.scheduled_delivery_date}</span></p>` : ""}
          ${order.is_subscription ? `<p style="margin: 3px 0;"><strong>Recurring Subscription:</strong> <span style="color: #a855f7; font-weight: bold;">${order.subscription_frequency || "Active"}</span></p>` : ""}
          ${order.notes ? `<p style="margin: 6px 0 0 0; padding: 8px; background-color: #27272a; border-radius: 8px; color: #fbbf24;"><strong>Notes:</strong> ${order.notes}</p>` : ""}
        </div>
      </div>

      <!-- Payment Breakdown -->
      <div style="background-color: #18181b; padding: 18px; border-radius: 14px; margin-bottom: 20px; border: 1px solid #27272a; font-size: 13px; line-height: 1.6;">
        <h4 style="color: #f59e0b; margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">💳 Payment Details</h4>
        <div style="color: #d4d4d8;">
          <p style="margin: 3px 0;"><strong>Payment Method:</strong> <span style="color: #ffffff; text-transform: uppercase;">${(order.payment_method || "paystack").replace(/_/g, " ")}</span></p>
          <p style="margin: 3px 0;"><strong>Payment Status:</strong> <span style="color: ${isPaid ? "#10b981" : "#f59e0b"}; font-weight: bold;">${(order.payment_status || "unpaid").toUpperCase()}</span></p>
          ${order.payment_reference ? `<p style="margin: 3px 0;"><strong>Payment Reference:</strong> <span style="color: #38bdf8; font-family: monospace;">${order.payment_reference}</span></p>` : ""}
        </div>
      </div>

      <!-- Items Ordered Table -->
      <div style="background-color: #18181b; padding: 18px; border-radius: 14px; margin-bottom: 20px; border: 1px solid #27272a;">
        <h4 style="color: #f59e0b; margin: 0 0 12px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">🍱 Ordered Items</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="color: #a1a1aa; text-align: left; border-bottom: 1px solid #3f3f46;">
              <th style="padding: 8px;">Item Name</th>
              <th style="padding: 8px; text-align: center;">Qty</th>
              <th style="padding: 8px; text-align: right;">Unit Price</th>
              <th style="padding: 8px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div style="margin-top: 16px; pt: 12px; border-top: 1px solid #3f3f46; font-size: 14px;">
          ${order.subtotal_ghs ? `<div style="display: flex; justify-content: space-between; color: #a1a1aa; margin-bottom: 4px;"><span>Subtotal:</span><span>GH₵ ${Number(order.subtotal_ghs).toFixed(2)}</span></div>` : ""}
          ${order.delivery_fee_ghs !== undefined ? `<div style="display: flex; justify-content: space-between; color: #a1a1aa; margin-bottom: 4px;"><span>Delivery Fee:</span><span>GH₵ ${Number(order.delivery_fee_ghs).toFixed(2)}</span></div>` : ""}
          <div style="display: flex; justify-content: space-between; color: #ffffff; font-size: 18px; font-weight: 900; margin-top: 8px; padding-top: 8px; border-top: 1px solid #3f3f46;">
            <span>TOTAL AMOUNT:</span>
            <span style="color: #10b981;">GH₵ ${Number(order.total_ghs).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <!-- Action Button -->
      <div style="text-align: center; margin-top: 24px; margin-bottom: 10px;">
        <a href="https://barimabafoods.shop/portal/orders" style="background-color: ${isPaid ? "#10b981" : "#ef4444"}; color: #000000; font-weight: 900; padding: 14px 32px; border-radius: 12px; text-decoration: none; display: inline-block; font-size: 15px; box-shadow: 0 4px 14px rgba(0,0,0,0.4);">
          Manage Order in Admin Portal
        </a>
      </div>

      <hr style="border: 0; border-top: 1px solid #27272a; margin: 24px 0;" />
      <p style="font-size: 11px; color: #71717a; text-align: center; margin: 0;">
        Barima Ba Foods Kitchen Dispatch Alert | support@barimabafoods.shop
      </p>
    </div>
  `;

  await sendResendEmail({
    to: adminEmail,
    subject: `${isPaid ? "✅ PAYMENT CONFIRMED" : "🚨 NEW ORDER"} #${order.order_number} — GH₵ ${Number(order.total_ghs).toFixed(2)} (${order.customer_name})`,
    html: htmlContent,
  });
}
