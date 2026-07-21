import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getOrderByNumber } from "@/lib/orders.functions";
import { ShopLayout } from "@/components/shop/Layout";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Package, Truck, Clock, Phone, MessageSquare, ExternalLink, MapPin, ChefHat, Sparkles } from "lucide-react";
import { formatGHS } from "@/lib/cart";

const orderQuery = (fetcher: (args: { data: { order_number: string } }) => Promise<Awaited<ReturnType<typeof getOrderByNumber>>>, orderNumber: string) => ({
  queryKey: ["order", orderNumber],
  queryFn: () => fetcher({ data: { order_number: orderNumber } }),
  refetchInterval: 10_000,
});

export const Route = createFileRoute("/order/$orderNumber")({
  head: ({ params }) => ({ meta: [{ title: `Order ${params.orderNumber} — Barima Ba Foods` }, { name: "robots", content: "noindex" }] }),
  component: OrderPage,
});

const STATUS_STEPS = [
  { key: "pending", label: "Order Received", desc: "Your order is logged in our system" },
  { key: "confirmed", label: "Kitchen Cooking", desc: "Fresh Ghanaian spices & meals cooking" },
  { key: "packed", label: "Packed & Sealed", desc: "Sealed hot & ready for dispatch" },
  { key: "out_for_delivery", label: "Out for Delivery", desc: "Dispatch rider en route to your location" },
  { key: "delivered", label: "Delivered", desc: "Enjoy your authentic Barima Ba meal!" },
] as const;

function OrderPage() {
  const { orderNumber } = Route.useParams();
  const fetcher = useServerFn(getOrderByNumber);
  const { data: order } = useSuspenseQuery(orderQuery(fetcher, orderNumber));
  if (!order) throw notFound();

  const currentStep = STATUS_STEPS.findIndex((s) => s.key === order.status);
  const isUber = order.dispatch_partner === "uber";
  const partnerLabel = isUber ? "Uber Package Dispatch" : order.dispatch_partner === "bolt" ? "Bolt Dispatch" : "Barima Ba Rider";

  const getPhoneClean = (ph?: string | null) => {
    if (!ph) return "";
    let clean = ph.trim().replace(/\s+/g, "");
    if (clean.startsWith("0")) return `233${clean.slice(1)}`;
    return clean.replace(/\+/g, "");
  };

  return (
    <ShopLayout>
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
        {/* Top Celebration Card */}
        <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden text-white">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Sparkles className="h-40 w-40 text-amber-400" />
          </div>

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-lg shadow-amber-500/10 mb-4">
            <CheckCircle2 className="h-10 w-10 text-amber-400" />
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Thank you, <span className="text-amber-400">{order.customer_name.split(" ")[0]}</span>!
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-zinc-300 font-sans">
            Order Reference: <span className="font-mono font-extrabold text-amber-400">{order.order_number}</span>
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className={`px-3 py-1 rounded-full font-extrabold uppercase tracking-wider border ${
              order.payment_status === "paid" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" : "bg-amber-500/20 text-amber-400 border-amber-500/40"
            }`}>
              {order.payment_status === "paid" ? "✓ Paid Online" : order.payment_method === "cash_on_delivery" ? "Cash on Delivery" : "Payment Pending"}
            </span>

            <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-200 border border-zinc-700 font-bold">
              🚗 {partnerLabel}
            </span>
          </div>

          {/* 1-Click WhatsApp Order Confirmation Receipt Button */}
          <div className="mt-6 pt-4 border-t border-amber-500/20 max-w-md mx-auto">
            <a
              href={`https://wa.me/233241234567?text=Hello%20Barima%20Ba%20Foods!%20I%20just%20placed%20Order%20${order.order_number}%20for%20${encodeURIComponent(order.customer_name)}.%20Total:%20GHS%20${order.total_ghs}.%20Please%20confirm%20kitchen%20preparation!`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 px-5 py-3 text-xs font-extrabold text-black shadow-xl shadow-emerald-500/20 transition-all hover:scale-105"
            >
              <MessageSquare className="h-4 w-4 fill-black" />
              <span>Send Order Receipt to Kitchen WhatsApp (+233 24 123 4567)</span>
            </a>
          </div>
        </div>

        {/* Uber Courier & Dispatch Card (If Assigned) */}
        {(order.rider_name || order.status === "out_for_delivery" || isUber) && (
          <div className="rounded-3xl border border-amber-500/40 bg-zinc-950 p-6 shadow-xl relative overflow-hidden text-white space-y-4">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
                  <Truck className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-base font-extrabold text-white">
                      {isUber ? "Uber Package Courier" : "Dispatch Rider Status"}
                    </h2>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold text-emerald-400 border border-emerald-500/30">
                      LIVE TRACKING
                    </span>
                  </div>
                  <p className="text-xs text-amber-400/90 font-medium">
                    Estimated Delivery: {order.estimated_delivery_time || "20 – 35 mins"}
                  </p>
                </div>
              </div>
            </div>

            {/* Rider Information */}
            <div className="grid gap-4 sm:grid-cols-2 bg-zinc-900/80 rounded-2xl p-4 border border-zinc-800">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">Assigned Driver</span>
                <p className="text-sm font-extrabold text-white mt-0.5">{order.rider_name || "Assigning nearby rider..."}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{order.rider_vehicle || "Vehicle details pending"}</p>
              </div>

              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">Delivery Address Pin</span>
                <p className="text-xs font-semibold text-zinc-200 mt-0.5 line-clamp-2">{order.delivery_address || "Pickup at shop"}</p>
                {order.ghana_post_gps && (
                  <p className="text-[11px] font-mono text-amber-400 font-bold mt-0.5">GPS: {order.ghana_post_gps}</p>
                )}
              </div>
            </div>

            {/* Rider Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-1">
              {order.rider_phone && (
                <a
                  href={`tel:${order.rider_phone}`}
                  className="flex-1 min-w-[130px] flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-3 text-xs font-extrabold text-black transition-all shadow-lg shadow-amber-500/20"
                >
                  <Phone className="h-4 w-4 fill-black" />
                  <span>Call Rider</span>
                </a>
              )}

              {order.rider_phone && (
                <a
                  href={`https://wa.me/${getPhoneClean(order.rider_phone)}?text=Hello%20${encodeURIComponent(order.rider_name || "Rider")},%20I%20am%20tracking%20Barima%20Ba%20Foods%20Order%20${order.order_number}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 min-w-[130px] flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 px-4 py-3 text-xs font-extrabold text-emerald-400 transition-all"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>WhatsApp</span>
                </a>
              )}

              {order.uber_tracking_url && (
                <a
                  href={order.uber_tracking_url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-amber-500/50 bg-black hover:bg-zinc-900 px-4 py-3 text-xs font-extrabold text-amber-400 transition-all shadow-md"
                >
                  <ExternalLink className="h-4 w-4 text-amber-400" />
                  <span>Track Live on Uber Map</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* 5-Step Order Timeline */}
        <div className="rounded-3xl border border-amber-500/20 bg-card p-6 shadow-md space-y-4">
          <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-amber-500" />
            <span>Order Fulfillment Timeline</span>
          </h2>

          <ol className="relative border-l border-amber-500/30 ml-3 space-y-6 pt-2 pb-1">
            {STATUS_STEPS.map((step, idx) => {
              const isCompleted = idx <= currentStep && order.status !== "cancelled";
              const isCurrent = idx === currentStep && order.status !== "cancelled";

              return (
                <li key={step.key} className="ml-6 flex items-start justify-between">
                  <span className={`absolute -left-3.5 flex h-7 w-7 items-center justify-center rounded-full border transition-all ${
                    isCompleted
                      ? "bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/30"
                      : "bg-zinc-900 text-zinc-600 border-zinc-800"
                  }`}>
                    {isCompleted ? "✓" : idx + 1}
                  </span>
                  <div>
                    <h3 className={`text-sm font-extrabold ${isCurrent ? "text-amber-500" : isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                      {step.label} {isCurrent && <span className="text-[10px] bg-amber-500/15 text-amber-500 px-2 py-0.5 rounded-full border border-amber-500/30 ml-2">IN PROGRESS</span>}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Order Items Summary */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-semibold text-foreground">Order Items</h2>
          <ul className="mt-4 space-y-3 divide-y divide-border/60 text-sm">
            {order.order_items.map((i, idx) => (
              <li key={idx} className="pt-3 first:pt-0 flex justify-between items-center">
                <div>
                  <span className="font-extrabold text-foreground">{i.quantity} × {i.product_name}</span>
                  <span className="block text-xs text-muted-foreground">{i.unit}</span>
                </div>
                <span className="font-mono font-bold text-foreground">{formatGHS(Number(i.line_total_ghs))}</span>
              </li>
            ))}
          </ul>

          <dl className="mt-6 space-y-2 border-t pt-4 text-sm">
            <div className="flex justify-between text-muted-foreground"><dt>Subtotal</dt><dd>{formatGHS(Number(order.subtotal_ghs))}</dd></div>
            <div className="flex justify-between text-muted-foreground"><dt>Delivery ({partnerLabel})</dt><dd>{formatGHS(Number(order.delivery_fee_ghs))}</dd></div>
            <div className="flex justify-between border-t pt-3 text-base font-extrabold text-foreground"><dt>Total Amount</dt><dd className="text-amber-500 font-mono text-lg">{formatGHS(Number(order.total_ghs))}</dd></div>
          </dl>
        </div>

        <div className="flex justify-center pt-2">
          <Button asChild variant="outline" className="rounded-2xl border-amber-500/40 hover:bg-amber-500/10 text-amber-500 font-bold px-8 py-6">
            <Link to="/shop">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    </ShopLayout>
  );
}
