import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getUserAccountDetails, updateUserProfileData } from "@/lib/orders.functions";
import { ShopLayout } from "@/components/shop/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCart, formatGHS } from "@/lib/cart";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  User,
  Phone,
  Mail,
  Wallet,
  ShoppingBag,
  Package,
  Clock,
  ExternalLink,
  RotateCcw,
  LogOut,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  TrendingUp,
  CreditCard,
  MapPin,
  CheckCircle2,
  Calendar,
} from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "My Profile & Orders — Barima Ba Foods" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { add } = useCart();
  const fetchDetails = useServerFn(getUserAccountDetails);
  const updateProfile = useServerFn(updateUserProfileData);

  const [authUser, setAuthUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "orders" | "settings">("overview");

  // Profile Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [ghanaPostGps, setGhanaPostGps] = useState("");
  const [gpsCoordinates, setGpsCoordinates] = useState("");
  const [saving, setSaving] = useState(false);

  // Change Password State
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        toast.error("Please sign in to view your profile");
        navigate({ to: "/auth" });
      } else {
        setAuthUser(data.user);
      }
    });
  }, [navigate]);

  const { data: accountData, isLoading } = useQuery({
    queryKey: ["user-account-details"],
    queryFn: () => fetchDetails(),
    enabled: !!authUser,
  });

  useEffect(() => {
    if (accountData?.profile) {
      setFullName(accountData.profile.full_name || "");
      setPhone(accountData.profile.phone || "");
      setDeliveryAddress(accountData.profile.delivery_address || "");
      setGhanaPostGps(accountData.profile.ghana_post_gps || "");
      setGpsCoordinates(accountData.profile.gps_coordinates || "");
    }
  }, [accountData]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        data: {
          full_name: fullName,
          phone,
          delivery_address: deliveryAddress,
          ghana_post_gps: ghanaPostGps,
          gps_coordinates: gpsCoordinates,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["user-account-details"] });
      toast.success("Profile & Saved Delivery Location updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("Passwords do not match!");
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password changed successfully!");
      setNewPassword("");
      setConfirmNewPassword("");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate({ to: "/" });
  };

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
      case "pending": return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "confirmed": return "bg-blue-500/15 text-blue-400 border-blue-500/30";
      case "packed": return "bg-indigo-500/15 text-indigo-400 border-indigo-500/30";
      case "out_for_delivery": return "bg-purple-500/15 text-purple-400 border-purple-500/30";
      case "delivered": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "cancelled": return "bg-red-500/15 text-red-400 border-red-500/30";
      default: return "bg-zinc-800 text-zinc-300 border-zinc-700";
    }
  };

  if (!authUser || isLoading) {
    return (
      <ShopLayout>
        <div className="mx-auto max-w-4xl px-4 py-24 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          <p className="mt-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Loading your account profile...</p>
        </div>
      </ShopLayout>
    );
  }

  const profile = accountData?.profile;
  const orders = accountData?.orders ?? [];
  const transactions = accountData?.transactions ?? [];

  return (
    <ShopLayout>
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-8 font-sans">
        
        {/* Profile Hero Header Card */}
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-r from-zinc-950 via-black to-zinc-900 p-6 md:p-8 shadow-2xl">
          <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-black font-extrabold text-3xl shadow-xl ring-4 ring-amber-500/20">
                  {fullName ? fullName[0].toUpperCase() : authUser.email[0].toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-black text-xs font-bold ring-2 ring-black">
                  ✓
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-amber-400 border border-amber-500/30">
                    MEMBER ACCOUNT
                  </span>
                </div>
                <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                  {fullName || authUser.user_metadata?.full_name || "Barima Ba Gourmet Member"}
                </h1>
                <p className="text-xs text-muted-foreground flex items-center justify-center sm:justify-start gap-2">
                  <span>{authUser.email}</span>
                  {phone && <span>· {phone}</span>}
                </p>
              </div>
            </div>

            {/* Wallet Balance Callout */}
            <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-zinc-900 to-black p-4 text-center sm:text-right shrink-0 shadow-lg min-w-[200px]">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block">Barima Ba Wallet</span>
              <span className="font-display text-2xl font-extrabold text-emerald-400 font-mono block mt-0.5">
                {formatGHS(Number(profile?.wallet_balance_ghs || 0))}
              </span>
              <span className="text-[10px] text-zinc-400 mt-1 block">Deposits & Refunds Balance</span>
            </div>
          </div>
        </div>

        {/* Profile Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 rounded-2xl bg-card p-1.5 border shadow-sm mb-8 gap-1">
            <TabsTrigger value="overview" className="rounded-xl text-xs font-bold uppercase tracking-wider transition-all gap-2">
              <User className="h-4 w-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="orders" className="rounded-xl text-xs font-bold uppercase tracking-wider transition-all gap-2">
              <ShoppingBag className="h-4 w-4" /> Orders ({orders.length})
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="rounded-xl text-xs font-bold uppercase tracking-wider transition-all gap-2">
              📅 Subscriptions
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-xl text-xs font-bold uppercase tracking-wider transition-all gap-2">
              <ShieldCheck className="h-4 w-4" /> Settings
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Quick Actions */}
              <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4 md:col-span-1">
                <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" /> Account Shortcuts
                </h3>
                <div className="space-y-2.5">
                  <Button asChild size="lg" className="w-full justify-between rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs shadow-md">
                    <Link to="/checkout">
                      <span>Checkout Order</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="w-full justify-between rounded-xl text-xs font-bold">
                    <Link to="/shop">
                      <span>Browse Shito & Meats</span>
                      <ShoppingBag className="h-4 w-4 text-amber-500" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="w-full justify-between rounded-xl text-xs font-bold">
                    <Link to="/track">
                      <span>Track Order Status</span>
                      <Package className="h-4 w-4 text-amber-500" />
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Recent Wallet Transactions */}
              <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4 md:col-span-2">
                <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-emerald-500" /> Wallet Transactions Activity
                </h3>
                
                {transactions.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">No wallet transactions recorded yet.</p>
                ) : (
                  <div className="divide-y divide-border/60">
                    {transactions.map((tx: any) => (
                      <div key={tx.id} className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-xs font-bold text-foreground capitalize">{tx.type} — {tx.description || "Wallet Transaction"}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(tx.created_at).toLocaleDateString()} at {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <span className={`font-mono text-sm font-bold ${tx.type === 'deposit' || tx.type === 'refund' ? 'text-emerald-400' : 'text-foreground'}`}>
                          {tx.type === 'deposit' || tx.type === 'refund' ? '+' : '-'}{formatGHS(Number(tx.amount_ghs))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* MY ORDERS TAB */}
          <TabsContent value="orders" className="space-y-4">
            {orders.length === 0 ? (
              <div className="rounded-2xl border bg-card p-12 text-center space-y-4">
                <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <h3 className="font-display text-lg font-bold text-foreground">No orders placed yet</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">Explore our delicious Ghanaian food catalog and place your first order today!</p>
                <Button asChild className="rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold"><Link to="/shop">Start Shopping</Link></Button>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((o: any) => (
                  <div key={o.id} className="rounded-2xl border bg-card p-6 shadow-sm space-y-4 transition-all hover:border-amber-500/40">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-base font-extrabold text-foreground">{o.order_number}</span>
                          <span className={`rounded-md border px-2.5 py-0.5 text-[10px] font-bold capitalize ${getStatusBadgeClass(o.status)}`}>
                            {o.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Placed on {new Date(o.created_at).toLocaleDateString()} · Payment: <strong className="uppercase text-foreground">{o.payment_method}</strong> ({o.payment_status})
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-display text-lg font-extrabold text-foreground font-mono">{formatGHS(Number(o.total_ghs))}</span>
                        <Button size="sm" onClick={() => handleReorder(o)} className="rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs gap-1.5 shadow-sm">
                          <RotateCcw className="h-3.5 w-3.5" /> Re-Order
                        </Button>
                      </div>
                    </div>

                    {/* Order Items List */}
                    {o.order_items && o.order_items.length > 0 && (
                      <div className="bg-muted/30 rounded-xl p-3.5 space-y-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">Order Items</span>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {o.order_items.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <span className="text-foreground font-medium">{item.quantity} × {item.product_name} ({item.unit})</span>
                              <span className="font-mono text-muted-foreground">{formatGHS(Number(item.unit_price_ghs))}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Uber Tracking Link if assigned */}
                    {o.uber_tracking_url && (
                      <div className="flex items-center justify-between rounded-xl border border-purple-500/30 bg-purple-500/10 p-3 text-xs text-purple-300">
                        <span>🚀 Order is out for delivery via {o.dispatch_partner || "Rider"}</span>
                        <a href={o.uber_tracking_url} target="_blank" rel="noreferrer" className="font-extrabold text-purple-400 hover:underline flex items-center gap-1">
                          Live Tracking <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* SUBSCRIPTIONS & SCHEDULES TAB */}
          <TabsContent value="subscriptions" className="space-y-6">
            <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-zinc-950 to-card p-6 md:p-8 shadow-xl space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-extrabold px-2.5 py-0.5 border border-amber-500/30">
                      GOURMET SUBSCRIPTION HUB
                    </span>
                  </div>
                  <h2 className="font-display text-xl md:text-2xl font-bold text-foreground mt-1">
                    Scheduled Orders & Meal Subscriptions
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Manage your recurring meal subscriptions, upcoming scheduled delivery slots, and auto-deliveries.
                  </p>
                </div>

                <Button asChild className="rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs shrink-0 shadow-md">
                  <Link to="/checkout">
                    📅 Schedule New Order
                  </Link>
                </Button>
              </div>

              {/* Subscriptions & Scheduled Orders Filter */}
              {orders.filter((o: any) => o.is_subscription || o.scheduled_delivery_date).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center space-y-3">
                  <Calendar className="mx-auto h-10 w-10 text-amber-500/40" />
                  <h3 className="font-display text-base font-bold text-foreground">No active subscriptions or scheduled orders yet</h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    You can schedule any food or provision order for a future date or subscribe for weekly/monthly auto-deliveries with 10% auto-savings at checkout!
                  </p>
                  <Button asChild size="sm" className="rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs">
                    <Link to="/shop">Explore Shop & Subscribe</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {orders.filter((o: any) => o.is_subscription || o.scheduled_delivery_date).map((o: any) => (
                    <div key={o.id} className="rounded-2xl border border-amber-500/30 bg-card p-5 space-y-4 shadow-md">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-extrabold text-foreground">{o.order_number}</span>
                        {o.is_subscription ? (
                          <span className="rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-extrabold px-2.5 py-0.5 border border-amber-500/30">
                            🔁 {o.subscription_frequency || "Weekly"} Subscription
                          </span>
                        ) : (
                          <span className="rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-extrabold px-2.5 py-0.5 border border-blue-500/30">
                            ⏰ Scheduled Delivery
                          </span>
                        )}
                      </div>

                      {o.scheduled_delivery_date && (
                        <div className="rounded-xl bg-amber-500/10 p-3 text-xs text-amber-300 font-medium">
                          Target Delivery: <strong>{new Date(o.scheduled_delivery_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</strong>
                        </div>
                      )}

                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p>Total Amount: <strong className="text-foreground">{formatGHS(Number(o.total_ghs))}</strong></p>
                        <p>Status: <span className="capitalize font-bold text-amber-400">{o.status.replace(/_/g, " ")}</span></p>
                        {o.delivery_address && <p className="truncate">Address: {o.delivery_address}</p>}
                      </div>

                      <div className="flex items-center justify-between border-t pt-3">
                        <Button asChild variant="outline" size="sm" className="rounded-xl text-xs font-bold">
                          <Link to="/order/$orderNumber" params={{ orderNumber: o.order_number }}>
                            View Details
                          </Link>
                        </Button>
                        <span className="text-[10px] font-extrabold uppercase text-emerald-400 bg-emerald-500/15 px-2 py-1 rounded-lg">
                          Active & Synced
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* SETTINGS TAB */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              
              {/* Personal Details & Saved Delivery Address */}
              <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
                <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                  <User className="h-5 w-5 text-amber-500" /> Personal Info & Saved Location
                </h3>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="prof-name" className="text-xs font-bold">Full Name</Label>
                    <Input id="prof-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="rounded-xl" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="prof-phone" className="text-xs font-bold">Mobile Phone (MoMo / SMS OTP)</Label>
                    <Input id="prof-phone" required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-xl" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="prof-address" className="text-xs font-bold">Default Delivery Address</Label>
                    <Input
                      id="prof-address"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="e.g. Apt 4B, Mensah Wood St, East Legon, Accra"
                      className="rounded-xl"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="prof-gps" className="text-xs font-bold">Ghana Post GPS Code</Label>
                      <Input
                        id="prof-gps"
                        value={ghanaPostGps}
                        onChange={(e) => setGhanaPostGps(e.target.value)}
                        placeholder="GA-183-9024"
                        className="rounded-xl font-mono uppercase"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="prof-coords" className="text-xs font-bold">Pinned GPS Coordinates</Label>
                      <Input
                        id="prof-coords"
                        value={gpsCoordinates}
                        onChange={(e) => setGpsCoordinates(e.target.value)}
                        placeholder="5.6350, -0.1600"
                        className="rounded-xl font-mono"
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={saving} className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold py-5">
                    {saving ? "Saving Details..." : "Save Info & Location"}
                  </Button>
                </form>
              </div>

              {/* Change Password & Security */}
              <div className="space-y-6">
                <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
                  <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-amber-500" /> Change Account Password
                  </h3>

                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="new-pass" className="text-xs font-bold">New Password (Min 6 chars)</Label>
                      <Input
                        id="new-pass"
                        type="password"
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="confirm-new-pass" className="text-xs font-bold">Confirm New Password</Label>
                      <Input
                        id="confirm-new-pass"
                        type="password"
                        required
                        minLength={6}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`rounded-xl ${
                          confirmNewPassword && newPassword !== confirmNewPassword ? "border-red-500 bg-red-500/5" : ""
                        }`}
                      />
                    </div>

                    <Button type="submit" disabled={changingPassword} className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold py-5">
                      {changingPassword ? "Updating Password..." : "Update Password"}
                    </Button>
                  </form>
                </div>

                <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
                  <h4 className="font-bold text-sm text-foreground">Session Security</h4>
                  <p className="text-xs text-muted-foreground">Sign out of your account on this browser session.</p>
                  <Button onClick={handleSignOut} className="w-full rounded-xl bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/25 font-extrabold text-xs gap-2 py-5">
                    <LogOut className="h-4 w-4" /> Sign Out of Account
                  </Button>
                </div>
              </div>

            </div>
          </TabsContent>
        </Tabs>

      </div>
    </ShopLayout>
  );
}
