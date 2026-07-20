import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getOrderByNumber } from "@/lib/orders.functions";
import { ShopLayout } from "@/components/shop/Layout";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Package, Truck, Clock } from "lucide-react";
import { formatGHS } from "@/lib/cart";

const orderQuery = (fetcher: (args: { data: { order_number: string } }) => Promise<Awaited<ReturnType<typeof getOrderByNumber>>>, orderNumber: string) => ({
  queryKey: ["order", orderNumber],
  queryFn: () => fetcher({ data: { order_number: orderNumber } }),
  refetchInterval: 15_000,
});

export const Route = createFileRoute("/order/$orderNumber")({
  head: ({ params }) => ({ meta: [{ title: `Order ${params.orderNumber}` }, { name: "robots", content: "noindex" }] }),
  component: OrderPage,
});

const STATUS_STEPS = ["pending", "confirmed", "packed", "out_for_delivery", "delivered"] as const;

function OrderPage() {
  const { orderNumber } = Route.useParams();
  const fetcher = useServerFn(getOrderByNumber);
  const { data: order } = useSuspenseQuery(orderQuery(fetcher, orderNumber));
  if (!order) throw notFound();

  const currentStep = STATUS_STEPS.indexOf(order.status as typeof STATUS_STEPS[number]);

  return (
    <ShopLayout>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border bg-card p-6 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
          <h1 className="mt-4 text-2xl font-bold">Thank you, {order.customer_name.split(" ")[0]}!</h1>
          <p className="mt-1 text-muted-foreground">Order <span className="font-mono font-semibold text-foreground">{order.order_number}</span></p>
          <p className="mt-2 text-sm text-muted-foreground">
            {order.payment_status === "paid" ? "Payment received." : order.payment_method === "cash_on_delivery" ? "Pay on delivery." : "Awaiting payment."}
          </p>
        </div>

        <div className="mt-6 rounded-2xl border bg-card p-6">
          <h2 className="font-semibold">Order status</h2>
          <ol className="mt-4 space-y-3">
            {STATUS_STEPS.map((step, idx) => {
              const done = idx <= currentStep && order.status !== "cancelled";
              const Icon = idx === 0 ? Clock : idx <= 2 ? Package : Truck;
              return (
                <li key={step} className={`flex items-center gap-3 ${done ? "text-foreground" : "text-muted-foreground"}`}>
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full ${done ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="capitalize">{step.replace(/_/g, " ")}</span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="mt-6 rounded-2xl border bg-card p-6">
          <h2 className="font-semibold">Items</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {order.order_items.map((i, idx) => (
              <li key={idx} className="flex justify-between">
                <span>{i.quantity} × {i.product_name}</span>
                <span>{formatGHS(Number(i.line_total_ghs))}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatGHS(Number(order.subtotal_ghs))}</dd></div>
            <div className="flex justify-between"><dt>Delivery</dt><dd>{formatGHS(Number(order.delivery_fee_ghs))}</dd></div>
            <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd>{formatGHS(Number(order.total_ghs))}</dd></div>
          </dl>
        </div>

        <div className="mt-6 flex justify-center">
          <Button asChild variant="outline"><Link to="/shop">Continue shopping</Link></Button>
        </div>
      </div>
    </ShopLayout>
  );
}
