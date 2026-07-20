import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAdminOrders, updateOrderStatus } from "@/lib/admin.functions";
import { AdminShell } from "@/components/shop/AdminShell";
import { useAdminGuard } from "@/lib/useAdminGuard";
import { formatGHS } from "@/lib/cart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { Search, Calendar, CreditCard, User, Tag, ShoppingBag, Eye } from "lucide-react";

const STATUSES = ["pending", "confirmed", "packed", "out_for_delivery", "delivered", "cancelled"] as const;

export const Route = createFileRoute("/admin/orders")({
  head: () => ({ meta: [{ title: "Admin — Orders" }, { name: "robots", content: "noindex" }] }),
  component: AdminOrdersPage,
});

function AdminOrdersPage() {
  const guard = useAdminGuard();
  const fetcher = useServerFn(listAdminOrders);
  const update = useServerFn(updateOrderStatus);
  const qc = useQueryClient();
  
  const { data: orders, isLoading } = useQuery({ 
    queryKey: ["admin-orders"], 
    queryFn: () => fetcher(), 
    enabled: guard === "ok",
    refetchInterval: 15_000,
  });

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | typeof STATUSES[number]>("all");

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter((o) => {
      const matchesTab = activeTab === "all" || o.status === activeTab;
      
      const query = search.toLowerCase().trim();
      const matchesSearch = !query || 
        o.order_number.toLowerCase().includes(query) ||
        o.customer_name.toLowerCase().includes(query) ||
        o.customer_phone.toLowerCase().includes(query);

      return matchesTab && matchesSearch;
    });
  }, [orders, activeTab, search]);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-950/40";
      case "cancelled":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "pending":
        return "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-950/40";
      case "out_for_delivery":
        return "bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-950/40";
      case "confirmed":
      case "packed":
        return "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-950/40";
      default:
        return "bg-secondary text-secondary-foreground border-border";
    }
  };

  const getPaymentBadge = (status: string) => {
    if (status === "paid") {
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
    }
    return "bg-muted text-muted-foreground border border-border";
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header Block */}
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage and track customer checkout orders, payments, and delivery fulfillment.</p>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Tabs */}
          <div className="flex flex-wrap gap-1.5 border-b pb-1">
            {(["all", ...STATUSES] as const).map((tab) => {
              const count = orders ? orders.filter((o) => tab === "all" || o.status === tab).length : 0;
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all border ${
                    active 
                      ? "bg-primary text-primary-foreground border-primary shadow-xs" 
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground border-transparent"
                  }`}
                >
                  {tab.replace(/_/g, " ")} ({count})
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl border-border bg-card"
            />
          </div>
        </div>

        {/* Table View */}
        <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border/80 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-4">Order</th>
                  <th className="px-5 py-4">Customer Details</th>
                  <th className="px-5 py-4">Fulfillment Details</th>
                  <th className="px-5 py-4">Transaction / Total</th>
                  <th className="px-5 py-4">Fulfillment Status</th>
                  <th className="px-5 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading ? (
                  [1, 2, 3].map((i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="px-5 py-8 bg-card/40">
                        <div className="h-4 w-full bg-muted rounded" />
                      </td>
                    </tr>
                  ))
                ) : filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                    {/* Order Identifier */}
                    <td className="px-5 py-4.5">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-mono text-xs font-bold text-foreground">{o.order_number}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(o.created_at).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="px-5 py-4.5">
                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        {o.customer_name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 font-sans">{o.customer_phone}</div>
                    </td>

                    {/* Fulfillment logistics */}
                    <td className="px-5 py-4.5">
                      <div className="text-xs font-semibold capitalize text-foreground">{o.delivery_type}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 font-sans">Accra Delivery Zones</div>
                    </td>

                    {/* Price and Payment method */}
                    <td className="px-5 py-4.5">
                      <div className="font-display text-sm font-bold text-foreground">{formatGHS(Number(o.total_ghs))}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">{o.payment_method.replace(/_/g, " ")}</span>
                        <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold capitalize ${getPaymentBadge(o.payment_status)}`}>
                          {o.payment_status}
                        </span>
                      </div>
                    </td>

                    {/* Dynamic dropdown status selector */}
                    <td className="px-5 py-4.5">
                      <Select
                        value={o.status}
                        onValueChange={async (v) => {
                          const originalStatus = o.status;
                          try {
                            await update({ data: { order_id: o.id, status: v as typeof STATUSES[number] } });
                            toast.success("Order status updated successfully");
                            qc.invalidateQueries({ queryKey: ["admin-orders"] });
                            qc.invalidateQueries({ queryKey: ["admin-stats"] });
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "Failed to update order status");
                          }
                        }}
                      >
                        <SelectTrigger className={`h-8.5 w-38 rounded-xl font-semibold border ${getStatusColor(o.status)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border bg-card">
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize text-xs font-semibold tracking-wide">
                              {s.replace(/_/g, " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>

                    {/* View Details Link */}
                    <td className="px-5 py-4.5 text-right">
                      <Button asChild variant="ghost" size="icon" className="rounded-lg hover:bg-secondary">
                        <Link to="/order/$orderNumber" params={{ orderNumber: o.order_number }} title="Track Details">
                          <Eye className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}

                {/* Empty State */}
                {!isLoading && filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                          <ShoppingBag className="h-5 w-5" />
                        </div>
                        <h4 className="font-display text-base font-bold text-foreground">No orders found</h4>
                        <p className="text-xs text-muted-foreground max-w-xs mt-1">
                          No customer transactions matched your criteria. Try adjusting your query or status filter.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
