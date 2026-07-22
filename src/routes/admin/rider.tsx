import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAdminOrders, updateOrderStatus } from "@/lib/admin.functions";
import { AdminShell } from "@/components/shop/AdminShell";
import { useAdminGuard } from "@/lib/useAdminGuard";
import { formatGHS } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Phone,
  MapPin,
  Navigation,
  CheckCircle2,
  PackageCheck,
  Truck,
  Map,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/admin/rider")({
  head: () => ({
    meta: [{ title: "Rider Delivery Console" }, { name: "robots", content: "noindex" }],
  }),
  component: RiderPortalPage,
});

function RiderPortalPage() {
  const guard = useAdminGuard();
  const fetchOrders = useServerFn(listAdminOrders);
  const updateStatus = useServerFn(updateOrderStatus);
  const qc = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => fetchOrders(),
    enabled: guard === "ok",
    refetchInterval: 10_000, // Quick polling for delivery riders
  });

  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // Filter orders for active delivery statuses: confirmed, packed, out_for_delivery
  const activeDeliveries = orders
    ? orders.filter((o) => ["confirmed", "packed", "out_for_delivery"].includes(o.status))
    : [];

  const handleUpdate = async (id: string, newStatus: "out_for_delivery" | "delivered") => {
    try {
      await updateStatus({ data: { order_id: id, status: newStatus } });
      toast.success(
        newStatus === "out_for_delivery" ? "Delivery started!" : "Delivery completed successfully!",
      );
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update order status");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  if (guard !== "ok") {
    return (
      <AdminShell>
        <div className="flex h-[50vh] items-center justify-center">
          <p className="text-sm font-semibold text-muted-foreground animate-pulse">
            {guard === "loading" ? "Verifying authorization..." : "Access denied."}
          </p>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header Block */}
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Truck className="h-7 w-7 text-primary" /> Rider Console
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Active delivery runs, customer location pins, and fulfillment statuses.
          </p>
        </div>

        {/* Deliveries Count Banner */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Active Deliveries
            </p>
            <p className="font-display text-3xl font-bold text-foreground mt-1">
              {activeDeliveries.length} runs
            </p>
          </div>
          <span
            className={`h-2.5 w-2.5 rounded-full bg-emerald-500 ${activeDeliveries.length > 0 ? "animate-ping" : ""}`}
          />
        </div>

        {/* Deliveries List */}
        <div className="space-y-4">
          {isLoading
            ? [1, 2].map((i) => (
                <div key={i} className="h-44 w-full animate-pulse rounded-2xl border bg-card/60" />
              ))
            : activeDeliveries.map((o: any) => {
                const isOut = o.status === "out_for_delivery";
                const isExpanded = expandedOrder === o.id;

                return (
                  <div
                    key={o.id}
                    className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden transition-all duration-300"
                  >
                    {/* Top header strip info */}
                    <div className="flex items-center justify-between border-b bg-muted/40 px-5 py-4">
                      <div>
                        <span className="font-mono text-xs font-bold text-foreground">
                          {o.order_number}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({o.delivery_type})
                        </span>
                      </div>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          isOut
                            ? "bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-950/40"
                            : "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-950/40"
                        }`}
                      >
                        {o.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    {/* Details Section */}
                    <div className="p-5 space-y-4">
                      {/* Customer row */}
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-foreground text-base">
                            {o.customer_name}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{o.customer_phone}</p>
                        </div>
                        <Button asChild size="icon" className="rounded-full shadow-sm">
                          <a href={`tel:${o.customer_phone}`} title="Call Customer">
                            <Phone className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>

                      {/* Delivery Location Section */}
                      <div className="rounded-xl border border-border/80 bg-secondary/30 p-3.5 space-y-2.5">
                        <div className="flex gap-2">
                          <MapPin className="h-4.5 w-4.5 text-muted-foreground shrink-0 mt-0.5" />
                          <p className="text-xs text-foreground font-medium leading-relaxed">
                            {o.delivery_address || "No address specified."}
                          </p>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 pt-1.5 border-t border-border/50">
                          {/* Ghana Post GPS */}
                          {o.ghana_post_gps && (
                            <div className="flex items-center justify-between gap-3 text-xs bg-card border rounded-lg p-2">
                              <span className="font-semibold text-muted-foreground truncate">
                                GPS: {o.ghana_post_gps}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => copyToClipboard(o.ghana_post_gps, "GPS Address")}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          )}

                          {/* Google Maps link coordinates */}
                          {o.gps_coordinates ? (
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
                            >
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${o.gps_coordinates}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Navigation className="h-3.5 w-3.5 text-primary" /> Navigate on
                                Google Maps
                              </a>
                            </Button>
                          ) : (
                            <div className="text-xs text-muted-foreground flex items-center p-2 italic border rounded-lg bg-card/40">
                              <Map className="h-3.5 w-3.5 mr-1" /> No GPS pin captured
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Collapsible item details */}
                      <div className="border-t pt-3">
                        <button
                          onClick={() => setExpandedOrder(isExpanded ? null : o.id)}
                          className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                        >
                          {isExpanded ? (
                            <>
                              Hide Items <ChevronUp className="h-3.5 w-3.5" />
                            </>
                          ) : (
                            <>
                              Show Items <ChevronDown className="h-3.5 w-3.5" />
                            </>
                          )}
                        </button>

                        {isExpanded && (
                          <div className="mt-3 bg-secondary/20 border border-border/40 rounded-xl p-3 space-y-2 text-xs">
                            <div className="flex justify-between font-bold border-b pb-1 text-muted-foreground">
                              <span>Items details</span>
                              <span>Pricing</span>
                            </div>
                            {/* We use order details. If o.order_items is present in query, map it */}
                            {o.order_items &&
                              o.order_items.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between">
                                  <span>
                                    {item.quantity} × {item.product_name} ({item.unit})
                                  </span>
                                  <span className="font-semibold">
                                    {formatGHS(Number(item.line_total_ghs))}
                                  </span>
                                </div>
                              ))}
                            <div className="flex justify-between border-t pt-2 font-bold text-foreground">
                              <span>
                                Total to collect (
                                {o.payment_method.replace(/_/g, " ").toUpperCase()})
                              </span>
                              <span>{formatGHS(Number(o.total_ghs))}</span>
                            </div>
                            {o.payment_status === "paid" && (
                              <div className="mt-2 text-center font-bold text-emerald-600 bg-emerald-500/10 py-1 rounded-md">
                                PAYMENT ONLINE RECEIVED (PAID)
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Operational Status Action Buttons */}
                      <div className="flex gap-3 pt-2">
                        {!isOut ? (
                          <Button
                            onClick={() => handleUpdate(o.id, "out_for_delivery")}
                            className="flex-1 rounded-xl font-bold bg-primary text-primary-foreground shadow-sm shadow-primary/10"
                          >
                            <Truck className="h-4 w-4 mr-2" /> Start Delivery
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleUpdate(o.id, "delivered")}
                            className="flex-1 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/10"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" /> Complete Delivery
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

          {/* Empty State */}
          {!isLoading && activeDeliveries.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/80 bg-card py-16 text-center shadow-xs">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                <PackageCheck className="h-5 w-5" />
              </div>
              <h4 className="font-display text-base font-bold text-foreground">
                No active deliveries
              </h4>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1">
                There are no confirmed or packing runs to deliver right now. Take a break!
              </p>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
