import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { ShopLayout } from "@/components/shop/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCart, formatGHS } from "@/lib/cart";
import { createOrder, calculateUberEstimate } from "@/lib/orders.functions";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { MapPin, Compass, Navigation, ExternalLink, Calculator, Sparkles } from "lucide-react";

const zonesQuery = {
  queryKey: ["zones"],
  queryFn: async () => {
    const { data, error } = await supabase.from("delivery_zones").select("id, name, fee_ghs").eq("is_active", true).order("name");
    if (error) throw error;
    return data ?? [];
  },
};

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — Provision Shop" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(zonesQuery),
  component: Checkout,
});

function Checkout() {
  const { data: zones } = useSuspenseQuery(zonesQuery);
  const { items, subtotal, clear, count } = useCart();
  const navigate = useNavigate();
  const create = useServerFn(createOrder);
  const getUberQuote = useServerFn(calculateUberEstimate);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery");
  const [dispatchPartner, setDispatchPartner] = useState<"uber" | "in_house" | "pickup">("uber");
  const [zoneId, setZoneId] = useState<string>("");
  const [address, setAddress] = useState("");
  const [ghanaPostGps, setGhanaPostGps] = useState("");
  const [gpsCoordinates, setGpsCoordinates] = useState("");
  const [locating, setLocating] = useState(false);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"paystack" | "cash_on_delivery" | "wallet">("paystack");
  const [submitting, setSubmitting] = useState(false);

  // User Auth & Wallet State
  const [authUser, setAuthUser] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setAuthUser(data.user);
        setEmail(data.user.email || "");
        setName(data.user.user_metadata?.full_name || "");
        // Fetch wallet balance and saved location profile
        supabase
          .from("profiles")
          .select("wallet_balance_ghs, phone, full_name, delivery_address, ghana_post_gps, gps_coordinates")
          .eq("id", data.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) {
              setWalletBalance(Number(profile.wallet_balance_ghs || 0));
              if (profile.phone) setPhone(profile.phone);
              if (profile.full_name && !name) setName(profile.full_name);
              if (profile.delivery_address) setAddress(profile.delivery_address);
              if (profile.ghana_post_gps) setGhanaPostGps(profile.ghana_post_gps);
              if (profile.gps_coordinates) {
                setGpsCoordinates(profile.gps_coordinates);
                fetchUberQuote(profile.gps_coordinates);
              }
            }
          });
      }
    });
  }, []);

  // Uber Dynamic Map & Estimate State
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [uberEstimate, setUberEstimate] = useState<{
    distance_km: number;
    estimated_fee_ghs: number;
    estimated_minutes: string;
    dispatch_provider: string;
  } | null>(null);

  const fetchUberQuote = async (coordsStr: string) => {
    try {
      const parts = coordsStr.split(",");
      if (parts.length === 2) {
        const lat = parseFloat(parts[0].trim());
        const lng = parseFloat(parts[1].trim());
        if (!isNaN(lat) && !isNaN(lng)) {
          const res = await getUberQuote({ data: { lat, lng } });
          setUberEstimate(res);
        }
      }
    } catch (e) {
      console.error("Uber quote failed:", e);
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
        const coords = `${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`;
        setGpsCoordinates(coords);
        setLocating(false);
        toast.success("Location coordinates pinned successfully!");
        fetchUberQuote(coords);
      },
      (err) => {
        setLocating(false);
        toast.error("Could not retrieve location. Please allow location permissions.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const deliveryFee = useMemo(() => {
    if (deliveryType !== "delivery") return 0;
    if (dispatchPartner === "uber" && uberEstimate) {
      return uberEstimate.estimated_fee_ghs;
    }
    if (!zoneId) return 0;
    return Number(zones.find((z) => z.id === zoneId)?.fee_ghs ?? 0);
  }, [deliveryType, dispatchPartner, uberEstimate, zoneId, zones]);
  const total = subtotal + deliveryFee;

  if (count === 0) {
    return (
      <ShopLayout>
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <p className="text-muted-foreground">Your cart is empty.</p>
          <Button asChild className="mt-6"><Link to="/shop">Start shopping</Link></Button>
        </div>
      </ShopLayout>
    );
  }

  const [orderScheduleType, setOrderScheduleType] = useState<"now" | "schedule" | "subscription">("now");
  const [scheduledDate, setScheduledDate] = useState("");
  const [subscriptionFreq, setSubscriptionFreq] = useState<"weekly" | "biweekly" | "monthly">("weekly");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!authUser) {
      toast.error("Please sign in or create an account to place your order.");
      navigate({ to: "/auth" });
      return;
    }

    if (orderScheduleType === "schedule" && !scheduledDate) {
      toast.error("Please select a scheduled delivery date and time.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await create({
        data: {
          customer_name: name,
          customer_phone: phone,
          customer_email: email || undefined,
          delivery_type: deliveryType,
          dispatch_partner: deliveryType === "pickup" ? "pickup" : dispatchPartner,
          delivery_address: deliveryType === "delivery" ? address : undefined,
          delivery_zone_id: deliveryType === "delivery" ? zoneId : undefined,
          ghana_post_gps: deliveryType === "delivery" && ghanaPostGps ? ghanaPostGps : undefined,
          gps_coordinates: deliveryType === "delivery" && gpsCoordinates ? gpsCoordinates : undefined,
          payment_method: paymentMethod,
          notes: notes || undefined,
          scheduled_delivery_date: orderScheduleType === "schedule" ? scheduledDate : undefined,
          is_subscription: orderScheduleType === "subscription",
          subscription_frequency: orderScheduleType === "subscription" ? subscriptionFreq : undefined,
          items: items.map((i) => ({ product_id: i.id, quantity: i.quantity })),
        },
      });
      const orderNumber = res.order_number;
      clear();
      if (res.paystack_url) {
        window.location.href = res.paystack_url;
        return;
      }
      if (res.paystack_error) toast.warning(res.paystack_error);
      toast.success("Order placed!");
      navigate({ to: "/order/$orderNumber", params: { orderNumber } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ShopLayout>
      <form onSubmit={submit} className="mx-auto grid max-w-5xl gap-8 px-4 py-10 md:grid-cols-[1fr,340px]">
        <div className="space-y-6">

          {/* Account Auth & Wallet Status Callout */}
          {!authUser ? (
            <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/20 via-zinc-900 to-black p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-black shrink-0 font-extrabold shadow-md">
                  🔐
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-amber-400 uppercase tracking-wide flex items-center gap-2">
                    <span>Account Required For Checkout</span>
                    <span className="rounded-full bg-amber-500/20 text-amber-300 text-[10px] px-2 py-0.5 border border-amber-500/30">PLEASE SIGN IN</span>
                  </h3>
                  <p className="text-xs text-zinc-300 mt-0.5">You must be signed in to complete payment, use your wallet balance, and track order status.</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                <Button asChild size="lg" className="w-full sm:w-auto rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20">
                  <Link to="/auth">Sign In / Register Now</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-black p-4 text-white shadow-md flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                  💳
                </div>
                <div>
                  <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider block">Logged in as {name || authUser.email}</span>
                  <span className="text-xs text-zinc-300">Barima Ba Wallet Balance: <strong className="text-emerald-400 font-mono">{formatGHS(walletBalance)}</strong></span>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await supabase.auth.signOut();
                  setAuthUser(null);
                  toast.success("Signed out successfully");
                }}
                className="text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/15 rounded-xl border border-red-500/30 shrink-0"
              >
                Sign Out
              </Button>
            </div>
          )}

          <section className="rounded-xl border bg-card p-5">
            <h2 className="text-lg font-semibold">Contact details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div><Label htmlFor="name">Full name *</Label><Input id="name" required value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label htmlFor="phone">Phone (Mobile Money) *</Label><Input id="phone" required type="tel" placeholder="024 000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div className="sm:col-span-2"><Label htmlFor="email">Email (optional)</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Delivery & Dispatch Method</h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30">
                🚗 Powered by Uber Dispatch
              </span>
            </div>
            
            <RadioGroup
              value={deliveryType === "pickup" ? "pickup" : dispatchPartner}
              onValueChange={(v) => {
                if (v === "pickup") {
                  setDeliveryType("pickup");
                  setDispatchPartner("pickup");
                } else {
                  setDeliveryType("delivery");
                  setDispatchPartner(v as "uber" | "in_house");
                }
              }}
              className="mt-4 grid gap-3 sm:grid-cols-3"
            >
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 has-[[data-state=checked]]:border-amber-500 has-[[data-state=checked]]:bg-amber-500/10 transition-all">
                <RadioGroupItem value="uber" className="mt-1" />
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <span>🚗 Uber Package</span>
                  </div>
                  <span className="block text-xs text-muted-foreground mt-0.5">Fastest doorstep delivery via Uber Courier (20–40 mins)</span>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 has-[[data-state=checked]]:border-amber-500 has-[[data-state=checked]]:bg-amber-500/10 transition-all">
                <RadioGroupItem value="in_house" className="mt-1" />
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <span>🏍️ Barima Ba Rider</span>
                  </div>
                  <span className="block text-xs text-muted-foreground mt-0.5">Standard in-house dispatch across Ghana</span>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 has-[[data-state=checked]]:border-amber-500 has-[[data-state=checked]]:bg-amber-500/10 transition-all">
                <RadioGroupItem value="pickup" className="mt-1" />
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <span>🛍️ Branch Pickup</span>
                  </div>
                  <span className="block text-xs text-muted-foreground mt-0.5">Free · Collect hot food at shop in 1 hour</span>
                </div>
              </label>
            </RadioGroup>
            {deliveryType === "delivery" && (
              <div className="mt-4 grid gap-4">
                <div>
                  <Label>Delivery zone *</Label>
                  <Select value={zoneId} onValueChange={setZoneId}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Choose your area" /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {zones.map((z) => (
                        <SelectItem key={z.id} value={z.id}>{z.name} — {formatGHS(Number(z.fee_ghs))}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="address">Delivery address *</Label>
                  <Textarea id="address" required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House number, street name, nearest landmark..." className="rounded-xl" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="gps">Ghana Post GPS (optional)</Label>
                    <Input id="gps" placeholder="GA-183-9032" value={ghanaPostGps} onChange={(e) => setGhanaPostGps(e.target.value.toUpperCase())} pattern="^[A-Z]{2}-[0-9]{3,4}-[0-9]{4}$" className="rounded-xl" />
                  </div>

                  <div>
                    <Label htmlFor="coords">GPS Location Pin & Uber Estimate</Label>
                    <div className="flex gap-2">
                      <Input
                        id="coords"
                        placeholder="Lat, Lng"
                        value={gpsCoordinates}
                        onChange={(e) => {
                          setGpsCoordinates(e.target.value);
                          fetchUberQuote(e.target.value);
                        }}
                        className="flex-1 rounded-xl font-mono text-xs"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={getGeolocation}
                        className="shrink-0 rounded-xl border-amber-500/40 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                        disabled={locating}
                        title="Pin current GPS location"
                      >
                        <Compass className={`h-4 w-4 mr-1.5 ${locating ? "animate-spin" : ""}`} />
                        <span>GPS Pin</span>
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setMapModalOpen(true)}
                        className="shrink-0 rounded-xl font-bold text-xs"
                      >
                        <MapPin className="h-4 w-4 mr-1 text-amber-500" />
                        <span>Map</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Dynamic Uber Pricing Estimate Badge */}
                {dispatchPartner === "uber" && (
                  <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-zinc-950 via-zinc-900 to-black p-4 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                        <Navigation className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-white">Uber Package Live Estimate</span>
                          <span className="rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold px-2 py-0.5 border border-emerald-500/30">DYNAMIC FARE</span>
                        </div>
                        <p className="text-xs text-zinc-400">
                          {uberEstimate ? `Distance: ${uberEstimate.distance_km} km · ETA: ${uberEstimate.estimated_minutes}` : "Pin GPS above or select zone for live price."}
                        </p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-[10px] uppercase font-bold text-zinc-400">Uber Delivery Fee</span>
                      <p className="font-mono text-lg font-extrabold text-amber-400">{formatGHS(deliveryFee)}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="mt-4">
              <Label htmlFor="notes">Order notes (optional)</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-xl" />
            </div>
          </section>

          {/* Schedule & Recurring Meal Subscriptions */}
          <section className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/5 via-zinc-950 to-card p-5 space-y-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30 shrink-0">
                📅
              </div>
              <div>
                <h2 className="text-base font-extrabold text-foreground">Delivery Timing & Subscriptions</h2>
                <p className="text-xs text-muted-foreground">Choose immediate delivery, schedule for a future date, or start a recurring subscription!</p>
              </div>
            </div>

            <RadioGroup
              value={orderScheduleType}
              onValueChange={(v) => setOrderScheduleType(v as "now" | "schedule" | "subscription")}
              className="grid gap-3 sm:grid-cols-3"
            >
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 has-[[data-state=checked]]:border-amber-500 has-[[data-state=checked]]:bg-amber-500/15 transition-all">
                <RadioGroupItem value="now" className="mt-1" />
                <div>
                  <span className="font-extrabold text-xs text-foreground block">🚀 Deliver Now</span>
                  <span className="text-[11px] text-muted-foreground block">Immediate kitchen prep & fast dispatch.</span>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 has-[[data-state=checked]]:border-amber-500 has-[[data-state=checked]]:bg-amber-500/15 transition-all">
                <RadioGroupItem value="schedule" className="mt-1" />
                <div>
                  <span className="font-extrabold text-xs text-foreground block">⏰ Schedule Delivery</span>
                  <span className="text-[11px] text-muted-foreground block">Choose exact date & time window.</span>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 has-[[data-state=checked]]:border-amber-500 has-[[data-state=checked]]:bg-amber-500/15 transition-all">
                <RadioGroupItem value="subscription" className="mt-1" />
                <div>
                  <span className="font-extrabold text-xs text-amber-400 block">🔁 Recurring Subscription</span>
                  <span className="text-[11px] text-muted-foreground block">Auto-repeats weekly or monthly.</span>
                </div>
              </label>
            </RadioGroup>

            {/* Scheduled Date Picker */}
            {orderScheduleType === "schedule" && (
              <div className="rounded-xl border border-amber-500/30 bg-card p-4 space-y-2 animate-fade-in-up">
                <Label htmlFor="sched-date" className="text-xs font-bold text-amber-400">Select Future Date & Delivery Window *</Label>
                <Input
                  id="sched-date"
                  type="datetime-local"
                  required
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="rounded-xl border-amber-500/40 text-sm font-semibold"
                />
                <span className="text-[11px] text-muted-foreground block">Our team will prepare and dispatch your food precisely for your scheduled slot.</span>
              </div>
            )}

            {/* Subscription Frequency Options */}
            {orderScheduleType === "subscription" && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3 animate-fade-in-up">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">Subscription Frequency</span>
                  <span className="rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold px-2.5 py-0.5 border border-emerald-500/30">10% OFF AUTO-SAVINGS</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSubscriptionFreq("weekly")}
                    className={`rounded-xl py-2 px-3 text-xs font-bold transition-all border ${subscriptionFreq === "weekly" ? "bg-amber-500 text-black border-amber-500 shadow-sm" : "bg-card text-foreground border-border"}`}
                  >
                    Every Week
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubscriptionFreq("biweekly")}
                    className={`rounded-xl py-2 px-3 text-xs font-bold transition-all border ${subscriptionFreq === "biweekly" ? "bg-amber-500 text-black border-amber-500 shadow-sm" : "bg-card text-foreground border-border"}`}
                  >
                    Every 2 Weeks
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubscriptionFreq("monthly")}
                    className={`rounded-xl py-2 px-3 text-xs font-bold transition-all border ${subscriptionFreq === "monthly" ? "bg-amber-500 text-black border-amber-500 shadow-sm" : "bg-card text-foreground border-border"}`}
                  >
                    Every Month
                  </button>
                </div>
                <p className="text-[11px] text-zinc-300">Your subscription will automatically place orders on your selected schedule. Pause or cancel anytime in your profile dashboard.</p>
              </div>
            )}
          </section>

          {/* Interactive Map Location Pinning Modal */}
          <Dialog open={mapModalOpen} onOpenChange={setMapModalOpen}>
            <DialogContent className="max-w-lg rounded-3xl border border-amber-500/30 bg-card p-6 shadow-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg font-extrabold text-foreground">
                  <MapPin className="h-5 w-5 text-amber-500" />
                  <span>Select Delivery Location on Accra Map</span>
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Tap any area preset or pin your location to calculate real-time Uber delivery distance & fee.
                </p>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                {/* Embedded Interactive Map Preview Box */}
                <div className="relative h-48 w-full rounded-2xl overflow-hidden border border-amber-500/30 bg-zinc-900 shadow-inner flex items-center justify-center">
                  <iframe
                    title="Accra Delivery Map"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=-0.2500%2C5.5500%2C-0.1000%2C5.7000&layer=mapnik&marker=${
                      gpsCoordinates ? gpsCoordinates.replace(/\s+/g, "") : "5.6350,-0.1600"
                    }`}
                    className="h-full w-full border-0 opacity-85 hover:opacity-100 transition-opacity"
                  />
                  <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-amber-500/30 text-[11px] font-bold text-amber-400">
                    📍 {gpsCoordinates ? `Pinned: ${gpsCoordinates}` : "Center: Accra Hub"}
                  </div>
                </div>

                {/* Quick Ghana Location Pin Presets */}
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quick Accra Location Presets</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                    {[
                      { name: "East Legon", coords: "5.6350,-0.1600" },
                      { name: "Osu / Oxford St", coords: "5.5560,-0.1810" },
                      { name: "Spintex Road", coords: "5.6200,-0.1050" },
                      { name: "Airport Residential", coords: "5.6050,-0.1750" },
                      { name: "Cantonments", coords: "5.5780,-0.1700" },
                      { name: "Dansoman", coords: "5.5450,-0.2500" },
                      { name: "Madina / Adenta", coords: "5.6800,-0.1650" },
                      { name: "Tema Central", coords: "5.6690,-0.0160" },
                    ].map((loc) => (
                      <button
                        key={loc.name}
                        type="button"
                        onClick={() => {
                          setGpsCoordinates(loc.coords);
                          setAddress((prev) => prev || `${loc.name}, Accra, Ghana`);
                          fetchUberQuote(loc.coords);
                          toast.success(`Pinned location: ${loc.name}`);
                          setMapModalOpen(false);
                        }}
                        className="rounded-xl border border-border bg-secondary/60 p-2.5 text-xs font-semibold text-foreground hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-500 transition-all text-left truncate"
                      >
                        📍 {loc.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <Button type="button" variant="outline" onClick={getGeolocation} className="rounded-xl text-xs gap-1.5" disabled={locating}>
                    <Compass className={`h-4 w-4 text-amber-500 ${locating ? "animate-spin" : ""}`} />
                    <span>Auto-Detect GPS</span>
                  </Button>
                  <Button type="button" onClick={() => setMapModalOpen(false)} className="rounded-xl bg-amber-500 text-black font-extrabold text-xs">
                    Confirm Location Pin
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <section className="rounded-xl border bg-card p-5">
            <h2 className="text-lg font-semibold">Payment Method</h2>
            <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "paystack" | "cash_on_delivery" | "wallet")} className="mt-4 grid gap-3 sm:grid-cols-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 has-[[data-state=checked]]:border-amber-500 has-[[data-state=checked]]:bg-amber-500/10 transition-all">
                <RadioGroupItem value="paystack" className="mt-1" />
                <div>
                  <span className="block font-bold text-foreground">Pay online</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">Mobile Money · Visa / Card</span>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 has-[[data-state=checked]]:border-amber-500 has-[[data-state=checked]]:bg-amber-500/10 transition-all">
                <RadioGroupItem value="cash_on_delivery" className="mt-1" />
                <div>
                  <span className="block font-bold text-foreground">Cash on delivery</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">Pay cash to driver</span>
                </div>
              </label>

              <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${
                walletBalance >= total ? "has-[[data-state=checked]]:border-amber-500 has-[[data-state=checked]]:bg-amber-500/10" : "opacity-60 bg-muted/30"
              }`}>
                <RadioGroupItem value="wallet" className="mt-1" disabled={!authUser || walletBalance < total} />
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <span>💳 Barima Ba Wallet</span>
                  </div>
                  <span className="block text-xs text-amber-500 font-bold mt-0.5">
                    {authUser ? `Balance: ${formatGHS(walletBalance)}` : "Sign in to use wallet"}
                  </span>
                </div>
              </label>
            </RadioGroup>
          </section>
        </div>

        <aside className="h-fit rounded-xl border bg-card p-5 md:sticky md:top-24">
          <h2 className="font-semibold">Order summary</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between">
                <span className="text-muted-foreground">{i.quantity} × {i.name}</span>
                <span>{formatGHS(i.price_ghs * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <hr className="my-4" />
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatGHS(subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Delivery</dt><dd>{deliveryType === "pickup" ? "Free" : formatGHS(deliveryFee)}</dd></div>
            <div className="flex justify-between border-t pt-2 text-base font-semibold"><dt>Total</dt><dd>{formatGHS(total)}</dd></div>
          </dl>
          {!authUser ? (
            <Button asChild size="lg" className="mt-6 w-full bg-amber-500 hover:bg-amber-600 text-black font-extrabold shadow-lg shadow-amber-500/20">
              <Link to="/auth">
                Sign in / Create Account to Pay
              </Link>
            </Button>
          ) : (
            <Button type="submit" size="lg" className="mt-6 w-full" disabled={submitting}>
              {submitting ? "Placing order…" : paymentMethod === "paystack" ? "Pay now" : "Place order"}
            </Button>
          )}
        </aside>
      </form>
    </ShopLayout>
  );
}
