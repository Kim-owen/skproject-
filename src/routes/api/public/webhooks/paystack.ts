import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

export const Route = createFileRoute("/api/public/webhooks/paystack")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) return new Response("Not configured", { status: 503 });

        const raw = await request.text();
        const sig = request.headers.get("x-paystack-signature") || "";
        const expected = createHmac("sha512", secret).update(raw).digest("hex");
        try {
          const a = Buffer.from(sig, "hex");
          const b = Buffer.from(expected, "hex");
          if (a.length !== b.length || !timingSafeEqual(a, b)) {
            return new Response("Invalid signature", { status: 401 });
          }
        } catch {
          return new Response("Invalid signature", { status: 401 });
        }

        const payload = JSON.parse(raw) as {
          event: string;
          data: { reference: string; status: string; amount: number };
        };

        if (payload.event !== "charge.success") return new Response("ok");

        const verify = await fetch(
          `https://api.paystack.co/transaction/verify/${payload.data.reference}`,
          {
            headers: { Authorization: `Bearer ${secret}` },
          },
        );
        const vjson = (await verify.json()) as {
          status: boolean;
          data?: { status: string; amount: number };
        };
        if (!vjson.status || vjson.data?.status !== "success") {
          return new Response("Not verified", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: order } = await supabaseAdmin
          .from("orders")
          .select("id, order_number, total_ghs, payment_status, customer_name, customer_phone")
          .or(`payment_reference.eq.${payload.data.reference},order_number.eq.${payload.data.reference}`)
          .maybeSingle();
        if (!order) return new Response("Order not found", { status: 404 });
        if (order.payment_status === "paid") return new Response("ok");

        const expectedKobo = Math.round(Number(order.total_ghs) * 100);
        if (vjson.data.amount < expectedKobo) {
          return new Response("Amount mismatch", { status: 400 });
        }

        await supabaseAdmin
          .from("orders")
          .update({
            payment_status: "paid",
            payment_reference: payload.data.reference,
            status: "confirmed",
          })
          .eq("id", order.id);

        try {
          const { getNotificationSettings } = await import("@/lib/settings.functions");
          const { sendSMSNotification } = await import("@/lib/orders.functions");
          const notifSettings = await getNotificationSettings();
          if (notifSettings.enable_customer_alerts && order.customer_phone) {
            const msg = `Barima Ba Foods: Payment of ₵${Number(order.total_ghs).toFixed(2)} for Order #${order.order_number} confirmed via Paystack! We are preparing your order.`;
            sendSMSNotification(order.customer_phone, msg).catch(console.error);
          }
        } catch (smsErr) {
          console.error("Paystack webhook SMS notification error:", smsErr);
        }

        return new Response("ok");
      },
    },
  },
});
