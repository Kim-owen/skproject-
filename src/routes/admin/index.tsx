import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminStats } from "@/lib/admin.functions";
import { AdminShell } from "@/components/shop/AdminShell";
import { useAdminGuard } from "@/lib/useAdminGuard";
import { formatGHS } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  DollarSign,
  ShoppingBag,
  Package,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Activity,
} from "lucide-react";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin — Dashboard" }, { name: "robots", content: "noindex" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const guard = useAdminGuard();
  const fetcher = useServerFn(getAdminStats);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => fetcher(),
    enabled: guard === "ok",
    refetchInterval: 30_000,
  });

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

  // Fallback / Loading Skeleton state
  if (isLoading || !data) {
    return (
      <AdminShell>
        <div className="space-y-6">
          <div className="flex flex-col gap-1.5">
            <div className="h-7 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl border bg-card" />
            ))}
          </div>
          <div className="h-80 animate-pulse rounded-xl border bg-card" />
        </div>
      </AdminShell>
    );
  }

  // Process sales trend data from the 10 most recent orders (newest first, so we reverse it for the chart timeline)
  const chartData = [...data.recentOrders]
    .reverse()
    .map((order, idx) => ({
      name: `Order ${idx + 1}`,
      amount: Number(order.total_ghs),
      date: new Date(order.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      status: order.status,
    }));

  const kpis = [
    {
      icon: DollarSign,
      label: "Gross Revenue",
      value: formatGHS(data.revenue),
      subtext: "From paid orders",
      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      icon: ShoppingBag,
      label: "Total Orders",
      value: data.ordersTotal,
      subtext: "Lifetime checkout requests",
      color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30",
    },
    {
      icon: Clock,
      label: "Pending Orders",
      value: data.pending,
      subtext: "Needs fulfillment",
      color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30",
    },
    {
      icon: Package,
      label: "Total Products",
      value: data.productsCount,
      subtext: "Listed inventory items",
      color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30",
    },
  ];

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-950/40";
      case "cancelled":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "pending":
        return "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-950/40";
      default:
        return "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-950/40";
    }
  };

  return (
    <AdminShell>
      <div className="space-y-8">
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">Real-time analytical overview of your grocery store operations.</p>
          </div>
          <div className="flex gap-2.5">
            <Button asChild variant="outline" className="rounded-xl font-semibold">
              <Link to="/admin/orders">Manage Orders</Link>
            </Button>
            <Button asChild className="rounded-xl font-semibold">
              <Link to="/admin/products">Manage Inventory</Link>
            </Button>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{kpi.label}</span>
                <div className={`rounded-lg p-2 ${kpi.color}`}>
                  <kpi.icon className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-4">
                <p className="font-display text-3xl font-bold tracking-tight text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{kpi.subtext}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Analytics Chart */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Sales Trend
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Value of the 10 most recent transactions.</p>
            </div>
            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
              Live Feed
            </span>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    borderColor: "var(--color-border)",
                    borderRadius: "0.75rem",
                    color: "var(--color-foreground)",
                  }}
                  itemStyle={{ color: "var(--color-primary)" }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSales)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Double Column Grid: Recent Activity & Low Stock */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Column: Recent Orders */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs lg:col-span-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                  <Activity className="h-4.5 w-4.5 text-primary" /> Recent Activity
                </h3>
                <Link to="/admin/orders" className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">
                  View all <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="divide-y divide-border/60">
                {data.recentOrders.slice(0, 5).map((o) => (
                  <div key={o.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-mono text-xs font-semibold text-foreground">{o.order_number}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {o.payment_status}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-display text-sm font-bold text-foreground">{formatGHS(Number(o.total_ghs))}</span>
                      <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold capitalize tracking-wide ${getStatusBadgeClass(o.status)}`}>
                        {o.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                ))}
                {data.recentOrders.length === 0 && (
                  <p className="py-8 text-center text-xs text-muted-foreground">No orders recorded yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Inventory Stock Status */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs lg:col-span-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4.5 w-4.5 text-amber-500" /> Stock Alerts
                </h3>
                <Link to="/admin/products" className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">
                  Refill <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="space-y-4">
                {data.lowStock.slice(0, 5).map((p) => {
                  const percentage = Math.min(100, (p.stock_quantity / 15) * 100);
                  const isCritical = p.stock_quantity === 0;
                  return (
                    <div key={p.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">{p.name}</span>
                        <span className={`font-bold ${isCritical ? "text-destructive" : "text-amber-500"}`}>
                          {p.stock_quantity} {p.unit} remaining
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${isCritical ? "bg-destructive" : "bg-amber-500"}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {data.lowStock.length === 0 && (
                  <p className="py-8 text-center text-xs text-muted-foreground">All items have healthy inventory levels.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
