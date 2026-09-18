import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  getUserAccountDetails,
  updateUserProfileData,
  resolvePaystackAccount,
} from "@/lib/orders.functions";
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
  MapPin,
  CheckCircle2,
  Calendar,
  Compass,
  Navigation,
  Eye,
  EyeOff,
  Lock,
  KeyRound,
  Loader2,
  Truck,
  Layers,
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
  const resolveAccount = useServerFn(resolvePaystackAccount);

  const [authUser, setAuthUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "orders" | "subscriptions" | "settings">(
    "settings",
  );

  // Profile Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [ghanaPostGps, setGhanaPostGps] = useState("");
  const [gpsCoordinates, setGpsCoordinates] = useState("");
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [resolvingPaystack, setResolvingPaystack] = useState(false);

  // Change Password State
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        toast.error("Please sign in to view your profile");
        navigate({ to: "/auth" });
        return;
      }
      const user = data.user;
      setAuthUser(user);

      // 1. Instant hydration from user metadata
      const metaName = user.user_metadata?.full_name;
      if (metaName && metaName.trim() && metaName.trim() !== "Customer") {
        setFullName((prev) => prev || metaName.trim());
      }
      const metaPhone =
        user.user_metadata?.phone ||
        (user.email?.includes("@phone.barimaba.com")
          ? user.email.replace("@phone.barimaba.com", "")
          : "");
      if (metaPhone) {
        setPhone((prev) => prev || metaPhone);
      }

      // 2. Direct client query from Supabase profiles table
      try {
        const { data: prof } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (prof) {
          if (prof.full_name && prof.full_name.trim() && prof.full_name.trim() !== "Customer") {
            setFullName(prof.full_name.trim());
          }
          if (prof.phone && prof.phone.trim()) {
            setPhone(prof.phone.trim());
          }
          if (prof.delivery_address) {
            setDeliveryAddress(prof.delivery_address);
          }
          if (prof.ghana_post_gps) {
            setGhanaPostGps(prof.ghana_post_gps);
          }
          if (prof.gps_coordinates) {
            setGpsCoordinates(prof.gps_coordinates);
          }
        }
      } catch (err) {
        console.warn("[Profile] Client profile fetch error:", err);
      }
    });
  }, [navigate]);

  const { data: accountData, isLoading } = useQuery({
    queryKey: ["user-account-details", authUser?.id],
    queryFn: () => fetchDetails({ data: { userId: authUser?.id } }),
    enabled: !!authUser?.id,
  });

  useEffect(() => {
    if (accountData?.profile) {
      if (accountData.profile.full_name && accountData.profile.full_name.trim() !== "Customer") {
        setFullName(accountData.profile.full_name);
      }
      if (accountData.profile.phone) setPhone(accountData.profile.phone);
      if (accountData.profile.delivery_address)
        setDeliveryAddress(accountData.profile.delivery_address);
      if (accountData.profile.ghana_post_gps) setGhanaPostGps(accountData.profile.ghana_post_gps);
      if (accountData.profile.gps_coordinates)
        setGpsCoordinates(accountData.profile.gps_coordinates);
    }
  }, [accountData]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || fullName.trim().length < 2) {
      toast.error("Customer full name is required (minimum 2 characters).");
      return;
    }
    setSaving(true);
    try {
      if (authUser?.id) {
        await supabase.from("profiles").upsert(
          {
            id: authUser.id,
            full_name: fullName.trim(),
            phone: phone.trim(),
            delivery_address: deliveryAddress.trim(),
            ghana_post_gps: ghanaPostGps.trim(),
            gps_coordinates: gpsCoordinates.trim(),
          },
          { onConflict: "id" },
        );

        await supabase.auth
          .updateUser({
            data: {
              full_name: fullName.trim(),
              phone: phone.trim(),
            },
          })
          .catch(() => {});
      }

      await updateProfile({
        data: {
          userId: authUser?.id,
          full_name: fullName.trim(),
          phone: phone.trim(),
          delivery_address: deliveryAddress.trim(),
          ghana_post_gps: ghanaPostGps.trim(),
          gps_coordinates: gpsCoordinates.trim(),
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

  const handleVerifyWithPaystack = async () => {
    const clean = (phone || "").replace(/[^0-9]/g, "");
    if (clean.length < 9) {
      toast.error("Please enter a valid phone number (at least 9 digits).");
      return;
    }
    setResolvingPaystack(true);
    try {
      const res = await resolveAccount({ data: { phone } });
      if (res.success && res.account_name) {
        setFullName(res.account_name);
        toast.success(`Paystack Verified: ${res.account_name} (${res.provider})`);
      } else {
        toast.error(res.message || "Could not resolve name on Mobile Money.");
      }
    } catch (err: any) {
      toast.error("Paystack verification error: " + err.message);
    } finally {
      setResolvingPaystack(false);
    }
  };

  const getGeolocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
        setGpsCoordinates(coords);
        toast.success("GPS Coordinates pinned from your current location!");
        setLocating(false);
      },
      (err) => {
        toast.error("Could not fetch GPS: " + err.message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
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
      toast.success("Password updated successfully!");
      setNewPassword("");
      setConfirmNewPassword("");
      setShowPasswordSection(false);
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
          item.quantity,
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
        return "bg-purple-500/15 text-purple-400 border-purple-500/30";
      case "delivered":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "cancelled":
        return "bg-red-500/15 text-red-400 border-red-500/30";
      default:
        return "bg-zinc-800 text-zinc-300 border-zinc-700";
    }
  };

  if (!authUser || (isLoading && !fullName && !phone)) {
    return (
      <ShopLayout>
        <div className="mx-auto max-w-4xl px-4 py-24 text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          <p className="mt-4 text-xs font-extrabold text-amber-400 uppercase tracking-widest">
            Loading your Barima Ba account...
          </p>
        </div>
      </ShopLayout>
    );
  }

  const profile = accountData?.profile;
  const orders = accountData?.orders ?? [];
  const transactions = accountData?.transactions ?? [];

  const displayName =
    fullName && fullName !== "Customer"
      ? fullName
      : profile?.full_name && profile.full_name !== "Customer"
        ? profile.full_name
        : authUser.user_metadata?.full_name && authUser.user_metadata.full_name !== "Customer"
          ? authUser.user_metadata.full_name
          : "Valued Customer";

  const formattedPhone =
    phone ||
    profile?.phone ||
    authUser.user_metadata?.phone ||
    (authUser.email?.includes("@phone.barimaba.com")
      ? (() => {
          const p = authUser.email.replace("@phone.barimaba.com", "");
          const clean = p.replace(/[^0-9]/g, "");
          return clean.startsWith("233")
            ? `+233 ${clean.slice(3, 5)} ${clean.slice(5, 8)} ${clean.slice(8)}`
            : p;
        })()
      : null);

  return (
    <ShopLayout>
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-8 font-sans">
        {/* Profile Hero Header Card */}
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-linear-to-r from-zinc-950 via-zinc-900 to-black p-6 md:p-8 shadow-2xl">
          <div className="absolute top-0 right-0 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-amber-500/5 blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-linear-to-br from-amber-400 via-amber-500 to-amber-600 text-black font-extrabold text-3xl shadow-xl shadow-amber-500/20 ring-4 ring-amber-500/20">
                  {displayName ? displayName[0].toUpperCase() : "U"}
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-black text-xs font-extrabold ring-2 ring-black">
                  ✓
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="rounded-full bg-amber-500/15 px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-amber-400 border border-amber-500/30">
                    MEMBER ACCOUNT
                  </span>
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 border border-emerald-500/30">
                    PHONE VERIFIED
                  </span>
                </div>
                <h1 className="font-display text-2xl md:text-3xl font-extrabold text-white capitalize">
                  {displayName}
                </h1>
                <p className="text-xs text-zinc-400 flex flex-wrap items-center justify-center sm:justify-start gap-2 font-mono">
                  {formattedPhone && (
                    <span className="font-bold text-amber-400">{formattedPhone}</span>
                  )}
                  {!authUser.email?.includes("@phone.barimaba.com") && (
                    <span>· {authUser.email}</span>
                  )}
                </p>
              </div>
            </div>

            {/* Wallet Balance Callout */}
            <div className="rounded-2xl border border-amber-500/30 bg-zinc-950/80 backdrop-blur-xl p-5 text-center sm:text-right shrink-0 shadow-xl min-w-56 space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 block">
                Barima Ba Wallet
              </span>
              <span className="font-mono text-3xl font-extrabold text-emerald-400 block">
                {formatGHS(Number(profile?.wallet_balance_ghs || 0))}
              </span>
              <span className="text-[10px] text-zinc-400 block">Available Balance</span>
            </div>
          </div>
        </div>

        {/* Profile Tabs Navigation */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
          className="w-full space-y-8"
        >
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 rounded-2xl bg-zinc-950/80 backdrop-blur-xl p-1.5 border border-amber-500/25 shadow-xl gap-1">
            <TabsTrigger
              value="overview"
              className="rounded-xl text-xs font-bold uppercase tracking-wider transition-all gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-black data-[state=active]:shadow-md cursor-pointer"
            >
              <User className="h-4 w-4" /> Overview
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="rounded-xl text-xs font-bold uppercase tracking-wider transition-all gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-black data-[state=active]:shadow-md cursor-pointer"
            >
              <ShoppingBag className="h-4 w-4" /> Orders ({orders.length})
            </TabsTrigger>
            <TabsTrigger
              value="subscriptions"
              className="rounded-xl text-xs font-bold uppercase tracking-wider transition-all gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-black data-[state=active]:shadow-md cursor-pointer"
            >
              <Calendar className="h-4 w-4" /> Subscriptions
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="rounded-xl text-xs font-bold uppercase tracking-wider transition-all gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-black data-[state=active]:shadow-md cursor-pointer"
            >
              <ShieldCheck className="h-4 w-4" /> Settings
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Quick Actions */}
              <div className="rounded-3xl border border-amber-500/20 bg-zinc-950/80 backdrop-blur-xl p-6 shadow-xl space-y-4 md:col-span-1">
                <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" /> Account Shortcuts
                </h3>
                <div className="space-y-2.5">
                  <Button
                    asChild
                    size="lg"
                    className="w-full justify-between rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs shadow-md"
                  >
                    <Link to="/checkout">
                      <span>Checkout Order</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="w-full justify-between rounded-xl text-xs font-bold border-zinc-800 hover:border-amber-500/40 text-white"
                  >
                    <Link to="/shop">
                      <span>Browse Shito & Meats</span>
                      <ShoppingBag className="h-4 w-4 text-amber-500" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="w-full justify-between rounded-xl text-xs font-bold border-zinc-800 hover:border-amber-500/40 text-white"
                  >
                    <Link to="/track">
                      <span>Track Order Status</span>
                      <Package className="h-4 w-4 text-amber-500" />
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Recent Wallet Transactions */}
              <div className="rounded-3xl border border-amber-500/20 bg-zinc-950/80 backdrop-blur-xl p-6 shadow-xl space-y-4 md:col-span-2">
                <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-emerald-500" /> Wallet Activity
                </h3>

                {transactions.length === 0 ? (
                  <p className="py-8 text-center text-xs text-zinc-500">
                    No wallet transactions recorded yet.
                  </p>
                ) : (
                  <div className="divide-y divide-zinc-800">
                    {transactions.map((tx: any) => (
                      <div key={tx.id} className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-xs font-bold text-white capitalize">
                            {tx.type} — {tx.description || "Wallet Transaction"}
                          </p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">
                            {new Date(tx.created_at).toLocaleDateString()} at{" "}
                            {new Date(tx.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <span
                          className={`font-mono text-sm font-bold ${
                            tx.type === "deposit" || tx.type === "refund"
                              ? "text-emerald-400"
                              : "text-zinc-200"
                          }`}
                        >
                          {tx.type === "deposit" || tx.type === "refund" ? "+" : "-"}
                          {formatGHS(Number(tx.amount_ghs))}
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
              <div className="rounded-3xl border border-amber-500/20 bg-zinc-950/80 backdrop-blur-xl p-12 text-center space-y-4 shadow-xl">
                <ShoppingBag className="mx-auto h-12 w-12 text-zinc-600" />
                <h3 className="font-display text-lg font-bold text-white">No orders placed yet</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Explore our authentic Ghanaian gourmet catalog and place your first order today!
                </p>
                <Button
                  asChild
                  className="rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold"
                >
                  <Link to="/shop">Start Shopping</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((o: any) => (
                  <div
                    key={o.id}
                    className="rounded-3xl border border-zinc-800 bg-zinc-950/80 backdrop-blur-xl p-6 shadow-xl space-y-4 transition-all hover:border-amber-500/40"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-base font-extrabold text-white">
                            {o.order_number}
                          </span>
                          <span
                            className={`rounded-md border px-2.5 py-0.5 text-[10px] font-bold capitalize ${getStatusBadgeClass(o.status)}`}
                          >
                            {o.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">
                          Placed on {new Date(o.created_at).toLocaleDateString()} · Payment:{" "}
                          <strong className="uppercase text-white">{o.payment_method}</strong> (
                          {o.payment_status})
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono text-lg font-extrabold text-white">
                          {formatGHS(Number(o.total_ghs))}
                        </span>
                        <Button
                          size="sm"
                          onClick={() => handleReorder(o)}
                          className="rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs gap-1.5 shadow-sm"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Re-Order
                        </Button>
                      </div>
                    </div>

                    {/* Order Items List */}
                    {o.order_items && o.order_items.length > 0 && (
                      <div className="bg-zinc-900/60 rounded-xl p-3.5 space-y-2 border border-zinc-800/60">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 block">
                          Order Items
                        </span>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {o.order_items.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <span className="text-white font-medium">
                                {item.quantity} × {item.product_name} ({item.unit})
                              </span>
                              <span className="font-mono text-zinc-400">
                                {formatGHS(Number(item.unit_price_ghs))}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Uber Tracking Link if assigned */}
                    {o.uber_tracking_url && (
                      <div className="flex items-center justify-between rounded-xl border border-purple-500/30 bg-purple-500/10 p-3 text-xs text-purple-300">
                        <span>🚀 Order is en route via {o.dispatch_partner || "Rider"}</span>
                        <a
                          href={o.uber_tracking_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-extrabold text-purple-400 hover:underline flex items-center gap-1"
                        >
                          Live Tracking <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* SUBSCRIPTIONS TAB */}
          <TabsContent value="subscriptions" className="space-y-6">
            <div className="rounded-3xl border border-amber-500/30 bg-linear-to-r from-amber-500/10 via-zinc-950 to-zinc-900 p-6 md:p-8 shadow-xl space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
                <div>
                  <span className="rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-extrabold px-2.5 py-0.5 border border-amber-500/30">
                    GOURMET AUTO-DELIVERIES
                  </span>
                  <h2 className="font-display text-xl md:text-2xl font-bold text-white mt-1.5">
                    Scheduled Orders & Meal Subscriptions
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Manage recurring deliveries and scheduled future orders with 10% auto-savings.
                  </p>
                </div>

                <Button
                  asChild
                  className="rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs shrink-0 shadow-md"
                >
                  <Link to="/checkout">📅 Schedule New Order</Link>
                </Button>
              </div>

              {orders.filter((o: any) => o.is_subscription || o.scheduled_delivery_date).length ===
              0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/60 p-10 text-center space-y-3">
                  <Calendar className="mx-auto h-10 w-10 text-amber-500/40" />
                  <h3 className="font-display text-base font-bold text-white">
                    No active subscriptions yet
                  </h3>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto">
                    You can schedule any food order for a future date or subscribe for
                    weekly/monthly auto-deliveries at checkout!
                  </p>
                  <Button
                    asChild
                    size="sm"
                    className="rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs"
                  >
                    <Link to="/shop">Explore Catalog & Subscribe</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {orders
                    .filter((o: any) => o.is_subscription || o.scheduled_delivery_date)
                    .map((o: any) => (
                      <div
                        key={o.id}
                        className="rounded-2xl border border-amber-500/30 bg-zinc-950 p-5 space-y-4 shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm font-extrabold text-white">
                            {o.order_number}
                          </span>
                          {o.is_subscription ? (
                            <span className="rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-extrabold px-2.5 py-0.5 border border-amber-500/30">
                              🔁 {o.subscription_frequency || "Weekly"}
                            </span>
                          ) : (
                            <span className="rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-extrabold px-2.5 py-0.5 border border-blue-500/30">
                              ⏰ Scheduled
                            </span>
                          )}
                        </div>

                        {o.scheduled_delivery_date && (
                          <div className="rounded-xl bg-amber-500/10 p-3 text-xs text-amber-300 font-medium">
                            Target Delivery:{" "}
                            <strong>
                              {new Date(o.scheduled_delivery_date).toLocaleString([], {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </strong>
                          </div>
                        )}

                        <div className="space-y-1 text-xs text-zinc-400">
                          <p>
                            Total Amount:{" "}
                            <strong className="text-white font-mono">
                              {formatGHS(Number(o.total_ghs))}
                            </strong>
                          </p>
                          <p>
                            Status:{" "}
                            <span className="capitalize font-bold text-amber-400">
                              {o.status.replace(/_/g, " ")}
                            </span>
                          </p>
                          {o.delivery_address && (
                            <p className="truncate">Address: {o.delivery_address}</p>
                          )}
                        </div>

                        <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="rounded-xl text-xs font-bold border-zinc-800 text-white"
                          >
                            <Link to="/order/$orderNumber" params={{ orderNumber: o.order_number }}>
                              View Details
                            </Link>
                          </Button>
                          <span className="text-[10px] font-extrabold uppercase text-emerald-400 bg-emerald-500/15 px-2 py-1 rounded-lg">
                            Active
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
            <div className="grid gap-8 lg:grid-cols-12">
              {/* Left Column: Personal Details & Saved Delivery Address */}
              <div className="lg:col-span-7 rounded-3xl border border-amber-500/30 bg-zinc-950/85 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold text-white">
                        Personal Info & Delivery Hub
                      </h3>
                      <p className="text-xs text-zinc-400">
                        Details used for order delivery, kitchen dispatch, and receipts
                      </p>
                    </div>
                  </div>
                  <span className="hidden sm:inline-flex rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-extrabold px-3 py-1 border border-amber-500/20">
                    LIVE SYNC
                  </span>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-5">
                  {/* Customer Full Name */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="prof-name" className="text-xs font-bold text-zinc-300">
                        Customer Full Name *
                      </Label>
                      {phone && (
                        <button
                          type="button"
                          onClick={handleVerifyWithPaystack}
                          disabled={resolvingPaystack}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {resolvingPaystack ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" /> Verifying...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3 w-3" /> Auto-fill from MoMo
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <Input
                        id="prof-name"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Kwame Mensah"
                        className="pl-10 h-12 rounded-xl bg-zinc-900/90 border-zinc-800 text-white text-sm font-semibold focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-zinc-600"
                      />
                    </div>
                  </div>

                  {/* Mobile Phone */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="prof-phone" className="text-xs font-bold text-zinc-300">
                        Mobile Phone (MoMo / SMS OTP) *
                      </Label>
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> SMS OTP Verified
                      </span>
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-500" />
                      <Input
                        id="prof-phone"
                        required
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="024 123 4567"
                        className="pl-10 h-12 rounded-xl bg-zinc-900/90 border-zinc-800 text-white text-sm font-semibold font-mono focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-zinc-600"
                      />
                    </div>
                  </div>

                  {/* Default Delivery Address */}
                  <div className="space-y-1.5">
                    <Label htmlFor="prof-address" className="text-xs font-bold text-zinc-300">
                      Default Delivery Address
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <Input
                        id="prof-address"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="e.g. Apt 4B, Mensah Wood St, East Legon, Accra"
                        className="pl-10 h-12 rounded-xl bg-zinc-900/90 border-zinc-800 text-white text-sm font-semibold focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-zinc-600"
                      />
                    </div>
                  </div>

                  {/* Location Pinning */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="prof-gps" className="text-xs font-bold text-zinc-300">
                        Ghana Post GPS Code
                      </Label>
                      <div className="relative">
                        <Compass className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        <Input
                          id="prof-gps"
                          value={ghanaPostGps}
                          onChange={(e) => setGhanaPostGps(e.target.value)}
                          placeholder="GA-183-9024"
                          className="pl-10 h-12 rounded-xl bg-zinc-900/90 border-zinc-800 text-white text-sm font-mono uppercase focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-zinc-600"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="prof-coords" className="text-xs font-bold text-zinc-300">
                        Pinned GPS Coordinates
                      </Label>
                      <div className="relative">
                        <Navigation className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        <Input
                          id="prof-coords"
                          value={gpsCoordinates}
                          onChange={(e) => setGpsCoordinates(e.target.value)}
                          placeholder="5.6350, -0.1600"
                          className="pl-10 h-12 rounded-xl bg-zinc-900/90 border-zinc-800 text-white text-sm font-mono focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-zinc-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Detect GPS Button */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={getGeolocation}
                      disabled={locating}
                      className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {locating ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Detecting GPS...
                        </>
                      ) : (
                        <>
                          <Navigation className="h-3.5 w-3.5" /> 📍 Pin My Current GPS
                        </>
                      )}
                    </button>

                    {gpsCoordinates && (
                      <a
                        href={`https://www.google.com/maps?q=${gpsCoordinates}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-amber-400 transition-colors"
                      >
                        <span>View on Google Maps</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={saving}
                    className="w-full h-12 rounded-xl bg-linear-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-600 hover:to-amber-600 text-black font-extrabold text-sm shadow-xl shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Saving Changes...
                      </>
                    ) : (
                      "Save Profile & Delivery Hub →"
                    )}
                  </Button>
                </form>
              </div>

              {/* Right Column: Security, Optional Password, and Session */}
              <div className="lg:col-span-5 space-y-6">
                {/* Auth Mode Card */}
                <div className="rounded-3xl border border-amber-500/30 bg-zinc-950/85 backdrop-blur-2xl p-6 shadow-2xl space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">Phone-First Security</h4>
                      <p className="text-xs text-emerald-400 font-medium">
                        Bank-grade SMS OTP Active
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Your account is secured via one-time SMS verification codes delivered directly
                    to your verified phone number. No passwords required.
                  </p>
                </div>

                {/* Optional Password Configuration */}
                <div className="rounded-3xl border border-zinc-800 bg-zinc-950/85 backdrop-blur-2xl p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0">
                        <KeyRound className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">Account Password</h4>
                        <p className="text-xs text-zinc-400">Optional for email / desktop access</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPasswordSection(!showPasswordSection)}
                      className="text-xs font-bold text-amber-400 hover:underline cursor-pointer"
                    >
                      {showPasswordSection ? "Collapse" : "Configure"}
                    </button>
                  </div>

                  {showPasswordSection && (
                    <form
                      onSubmit={handleChangePassword}
                      className="space-y-4 pt-3 border-t border-zinc-800/80"
                    >
                      <div className="space-y-1.5">
                        <Label htmlFor="new-pass" className="text-xs font-bold text-zinc-300">
                          New Password (Min 6 chars)
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                          <Input
                            id="new-pass"
                            type={showNewPassword ? "text" : "password"}
                            required
                            minLength={6}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••"
                            className="pl-10 pr-10 h-11 rounded-xl bg-zinc-900 border-zinc-800 text-white text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label
                          htmlFor="confirm-new-pass"
                          className="text-xs font-bold text-zinc-300"
                        >
                          Confirm New Password
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                          <Input
                            id="confirm-new-pass"
                            type={showConfirmPassword ? "text" : "password"}
                            required
                            minLength={6}
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            placeholder="••••••••"
                            className={`pl-10 pr-10 h-11 rounded-xl bg-zinc-900 border-zinc-800 text-white text-sm ${
                              confirmNewPassword && newPassword !== confirmNewPassword
                                ? "border-red-500 bg-red-500/5"
                                : ""
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={changingPassword}
                        className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs"
                      >
                        {changingPassword ? "Updating..." : "Update Password"}
                      </Button>
                    </form>
                  )}
                </div>

                {/* Session Security Card */}
                <div className="rounded-3xl border border-zinc-800 bg-zinc-950/85 backdrop-blur-2xl p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-white">Current Session</h4>
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Active
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Sign out to end your authenticated session on this device.
                  </p>
                  <Button
                    onClick={handleSignOut}
                    className="w-full h-11 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 font-bold text-xs gap-2 transition-all cursor-pointer"
                  >
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
