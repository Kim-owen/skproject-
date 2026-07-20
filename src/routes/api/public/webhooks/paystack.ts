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

        const verify = await fetch(`https://api.paystack.co/transaction/verify/${payload.data.reference}`, {
          headers: { Authorization: `Bearer ${secret}` },
        });
        const vjson = (await verify.json()) as { status: boolean; data?: { status: string; amount: number } };
        if (!vjson.status || vjson.data?.status !== "success") {
          return new Response("Not verified", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: order } = await supabaseAdmin
          .from("orders")
          .select("id, total_ghs, payment_status")
          .eq("payment_reference", payload.data.reference)
          .maybeSingle();
        if (!order) return new Response("Order not found", { status: 404 });
        if (order.payment_status === "paid") return new Response("ok");

        const expectedKobo = Math.round(Number(order.total_ghs) * 100);
        if (vjson.data.amount !== expectedKobo) {
          return new Response("Amount mismatch", { status: 400 });
        }

        await supabaseAdmin
          .from("orders")
          .update({ payment_status: "paid", status: "confirmed" })
          .eq("id", order.id);

        return new Response("ok");
      },
    },
  },
});
