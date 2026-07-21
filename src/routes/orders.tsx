import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listCustomerOrders } from "@/lib/orders.functions";
import { ShopLayout } from "@/components/shop/Layout";
import { Button } from "@/components/ui/button";
import { useCart, formatGHS } from "@/lib/cart";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  ShoppingBag,
  PackageCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  RotateCcw,
  ExternalLink,
  Eye,
  ArrowRight,
  Filter,
  Search,
  Sparkles,
  MapPin,
  Calendar,
  CreditCard,
  ChevronRight
} from "lucide-react";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "My Order History — Barima Ba Foods" }] }),
  component: CustomerOrdersPage,
});

function CustomerOrdersPage() {
  const navigate = useNavigate();
  const { add } = useCart();
  const fetchOrders = useServerFn(listCustomerOrders);

  const [authUser, setAuthUser] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "delivered" | "cancelled">("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        toast.error("Please sign in to view your order history");
        navigate({ to: "/auth" });
      } else {
        setAuthUser(data.user);
      }
    });
  }, [navigate]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["customer-orders"],
    queryFn: () => fetchOrders({ data: {} }),
    enabled: !!authUser,
  });

  const filteredOrders = useMemo(() => {
    return orders.filter((o: any) => {
      // Status Filter
      if (statusFilter === "active") {
        if (!["pending", "confirmed", "packed", "out_for_delivery"].includes(o.status)) return false;
      } else if (statusFilter === "delivered") {
        if (o.status !== "delivered") return false;
      } else if (statusFilter === "cancelled") {
        if (o.status !== "cancelled") return false;
      }

      // Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const numMatch = o.order_number?.toLowerCase().includes(q);
        const itemMatch = o.order_items?.some((i: any) => i.product_name?.toLowerCase().includes(q));
        if (!numMatch && !itemMatch) return false;
      }

      return true;
    });
  }, [orders, statusFilter, searchQuery]);

  const handleReorder = (order: any) => {
    if (!order.order_items || order.order_items.length === 0) {
      toast.error("No items found in this order");
      return;
    }
    order.order_items.forEach((item: any) => {
      if (item.product_id) {
        add(
          {
            id: item.product_id,
            name: item.product_name,
            slug: item.product_name.toLowerCase().replace(/\s+/g, "-"),
            price_ghs: Number(item.unit_price_ghs),
            unit: item.unit || "piece",
            image_url: null,
          },
          item.quantity
        );
      }
    });
    toast.success("Items added to your cart!");
    navigate({ to: "/checkout" });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "confirmed":
        return "bg-blue-500/15 text-blue-400 border-blue-500/30";
      case "packed":
        return "bg-indigo-500/15 text-indigo-400 border-indigo-500/30";
      case "out_for_delivery":
        return "bg-purple-500/15 text-purple-400 border-purple-500/30 animate-pulse";
      case "delivered":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "cancelled":
        return "bg-red-500/15 text-red-400 border-red-500/30";
      default:
        return "bg-zinc-800 text-zinc-300 border-zinc-700";
    }
  };

  if (!authUser || isLoading) {
    return (
      <ShopLayout>
        <div className="mx-auto max-w-4xl px-4 py-24 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          <p className="mt-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Loading order history...</p>
        </div>
      </ShopLayout>
    );
  }

  const activeCount = orders.filter((o: any) => ["pending", "confirmed", "packed", "out_for_delivery"].includes(o.status)).length;
  const deliveredCount = orders.filter((o: any) => o.status === "delivered").length;

  return (
    <ShopLayout>
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-8 font-sans">
        
        {/* Top Header & Overview */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
          <div>
            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-amber-400 border border-amber-500/30">
              MY ACCOUNT
            </span>
            <h1 className="font-display text-2xl md:text-3xl font-extrabold text-foreground mt-1">
              Order History & Status
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Track live deliveries, view receipts, and re-order your favorite Ghanaian dishes.
            </p>
          </div>

          <Button asChild size="lg" className="rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs shadow-md">
            <Link to="/shop">
              <span>Order New Food</span>
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Filter Pills & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setStatusFilter("all")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all border ${
                statusFilter === "all"
                  ? "bg-amber-500 text-black border-amber-500 shadow-md"
                  : "bg-card text-foreground border-border hover:bg-amber-500/10"
              }`}
            >
              All Orders ({orders.length})
            </button>

            <button
              onClick={() => setStatusFilter("active")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all border flex items-center gap-1.5 ${
                statusFilter === "active"
                  ? "bg-amber-500 text-black border-amber-500 shadow-md"
                  : "bg-card text-foreground border-border hover:bg-amber-500/10"
              }`}
            >
              {activeCount > 0 && <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />}
              <span>Pending & Active ({activeCount})</span>
            </button>

            <button
              onClick={() => setStatusFilter("delivered")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all border ${
                statusFilter === "delivered"
                  ? "bg-amber-500 text-black border-amber-500 shadow-md"
                  : "bg-card text-foreground border-border hover:bg-amber-500/10"
              }`}
            >
              Successful Delivered ({deliveredCount})
            </button>

            <button
              onClick={() => setStatusFilter("cancelled")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all border ${
                statusFilter === "cancelled"
                  ? "bg-amber-500 text-black border-amber-500 shadow-md"
                  : "bg-card text-foreground border-border hover:bg-amber-500/10"
              }`}
            >
              Cancelled
            </button>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search order # or item..."
              className="w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Orders List Container */}
        {filteredOrders.length === 0 ? (
          <div className="rounded-3xl border border-border bg-card p-12 text-center space-y-4">
            <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <h3 className="font-display text-lg font-bold text-foreground">No orders match your filter</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery ? `No orders found matching "${searchQuery}"` : "You have no recorded orders in this category."}
            </p>
            {statusFilter !== "all" && (
              <Button variant="outline" onClick={() => setStatusFilter("all")} className="rounded-xl text-xs font-bold">
                Show All Orders
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {filteredOrders.map((o: any) => (
              <div key={o.id} className="rounded-3xl border border-border bg-card p-6 shadow-md transition-all hover:border-amber-500/40 space-y-4">
                
                {/* Header Row: Order number, date, status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-base font-extrabold text-foreground tracking-wide">{o.order_number}</span>
                      <span className={`rounded-lg border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${getStatusBadgeClass(o.status)}`}>
                        {o.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      <span><Calendar className="inline h-3.5 w-3.5 text-muted-foreground mr-1" />{new Date(o.created_at).toLocaleDateString()} at {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>·</span>
                      <span className="capitalize">{o.delivery_type === "pickup" ? "Self Pickup" : "Home Delivery"}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button asChild variant="outline" size="sm" className="rounded-xl text-xs font-bold gap-1">
                      <Link to="/order/$orderNumber" params={{ orderNumber: o.order_number }}>
                        <Eye className="h-3.5 w-3.5 text-amber-500" /> Receipt
                      </Link>
                    </Button>
                    <Button size="sm" onClick={() => handleReorder(o)} className="rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs gap-1.5 shadow-sm">
                      <RotateCcw className="h-3.5 w-3.5" /> Re-Order
                    </Button>
                  </div>
                </div>

                {/* Dispatch & Delivery Banner */}
                {o.uber_tracking_url ? (
                  <div className="flex flex-col sm:flex-row items-center justify-between rounded-2xl border border-purple-500/40 bg-gradient-to-r from-purple-950/40 via-zinc-900 to-black p-3.5 text-xs text-purple-300 gap-2">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-purple-400 shrink-0" />
                      <span><strong>Out for Delivery!</strong> {o.rider_name ? `Rider: ${o.rider_name}` : "Uber Package assigned."}</span>
                    </div>
                    <a href={o.uber_tracking_url} target="_blank" rel="noreferrer" className="font-extrabold text-purple-300 bg-purple-500/20 px-3 py-1.5 rounded-xl border border-purple-500/30 hover:bg-purple-500/30 transition-all flex items-center gap-1.5 shrink-0">
                      Live Map Track <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ) : o.delivery_address && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-xl">
                    <MapPin className="h-4 w-4 text-amber-500 shrink-0" />
                    <span className="truncate">Destination: <strong>{o.delivery_address}</strong> {o.ghana_post_gps ? `(${o.ghana_post_gps})` : ""}</span>
                  </div>
                )}

                {/* Items Grid */}
                {o.order_items && o.order_items.length > 0 && (
                  <div className="bg-muted/20 rounded-2xl p-4 space-y-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">Items Summary</span>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {o.order_items.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-xs border-b border-border/40 pb-1.5 last:border-0 last:pb-0">
                          <span className="text-foreground font-medium">{item.quantity} × {item.product_name}</span>
                          <span className="font-mono text-muted-foreground">{formatGHS(Number(item.line_total_ghs || item.unit_price_ghs * item.quantity))}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer Totals & Payment Method */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CreditCard className="h-3.5 w-3.5 text-amber-500" />
                    <span>Payment: <strong className="uppercase text-foreground font-bold">{o.payment_method}</strong> ({o.payment_status})</span>
                  </div>

                  <div className="flex items-center gap-2 text-right">
                    <span className="text-muted-foreground font-medium">Total Paid:</span>
                    <span className="font-display text-lg font-extrabold text-foreground font-mono">{formatGHS(Number(o.total_ghs))}</span>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </ShopLayout>
  );
}
