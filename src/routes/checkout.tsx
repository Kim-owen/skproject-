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
import { useCart, formatGHS } from "@/lib/cart";
import { createOrder } from "@/lib/orders.functions";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { MapPin, Compass } from "lucide-react";

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

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery");
  const [zoneId, setZoneId] = useState<string>("");
  const [address, setAddress] = useState("");
  const [ghanaPostGps, setGhanaPostGps] = useState("");
  const [gpsCoordinates, setGpsCoordinates] = useState("");
  const [locating, setLocating] = useState(false);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"paystack" | "cash_on_delivery">("paystack");
  const [submitting, setSubmitting] = useState(false);

  const getGeolocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = `${pos.coords.latitude},${pos.coords.longitude}`;
        setGpsCoordinates(coords);
        setLocating(false);
        toast.success("Location coordinates pinned successfully!");
      },
      (err) => {
        setLocating(false);
        toast.error("Could not retrieve location. Please allow location permissions.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const deliveryFee = useMemo(() => {
    if (deliveryType !== "delivery" || !zoneId) return 0;
    return Number(zones.find((z) => z.id === zoneId)?.fee_ghs ?? 0);
  }, [deliveryType, zoneId, zones]);
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await create({
        data: {
          customer_name: name,
          customer_phone: phone,
          customer_email: email || undefined,
          delivery_type: deliveryType,
          delivery_address: deliveryType === "delivery" ? address : undefined,
          delivery_zone_id: deliveryType === "delivery" ? zoneId : undefined,
          ghana_post_gps: deliveryType === "delivery" && ghanaPostGps ? ghanaPostGps : undefined,
          gps_coordinates: deliveryType === "delivery" && gpsCoordinates ? gpsCoordinates : undefined,
          payment_method: paymentMethod,
          notes: notes || undefined,
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
          <section className="rounded-xl border bg-card p-5">
            <h2 className="text-lg font-semibold">Contact details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div><Label htmlFor="name">Full name *</Label><Input id="name" required value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label htmlFor="phone">Phone (Mobile Money) *</Label><Input id="phone" required type="tel" placeholder="024 000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div className="sm:col-span-2"><Label htmlFor="email">Email (optional)</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5">
            <h2 className="text-lg font-semibold">Delivery</h2>
            <RadioGroup value={deliveryType} onValueChange={(v) => setDeliveryType(v as "delivery" | "pickup")} className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                <RadioGroupItem value="delivery" /><span><span className="block font-medium">Deliver to me</span><span className="block text-xs text-muted-foreground">Same-day across Accra</span></span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                <RadioGroupItem value="pickup" /><span><span className="block font-medium">Pickup at shop</span><span className="block text-xs text-muted-foreground">Free · Ready in 1 hour</span></span>
              </label>
            </RadioGroup>
            {deliveryType === "delivery" && (
              <div className="mt-4 grid gap-4">
                <div>
                  <Label>Delivery zone *</Label>
                  <Select value={zoneId} onValueChange={setZoneId}>
                    <SelectTrigger><SelectValue placeholder="Choose your area" /></SelectTrigger>
                    <SelectContent>
                      {zones.map((z) => (
                        <SelectItem key={z.id} value={z.id}>{z.name} — {formatGHS(Number(z.fee_ghs))}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="address">Delivery address *</Label>
                  <Textarea id="address" required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House number, street, landmark…" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="gps">Ghana Post GPS (optional)</Label>
                    <Input id="gps" placeholder="GA-183-9032" value={ghanaPostGps} onChange={(e) => setGhanaPostGps(e.target.value.toUpperCase())} pattern="^[A-Z]{2}-[0-9]{3,4}-[0-9]{4}$" />
                  </div>
                  <div>
                    <Label htmlFor="coords">GPS Coordinates (optional)</Label>
                    <div className="flex gap-2">
                      <Input id="coords" placeholder="Lat, Lng" value={gpsCoordinates} onChange={(e) => setGpsCoordinates(e.target.value)} className="flex-1" />
                      <Button type="button" variant="outline" onClick={getGeolocation} className="shrink-0" disabled={locating}>
                        <Compass className={`h-4 w-4 ${locating ? "animate-spin" : ""}`} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="mt-4">
              <Label htmlFor="notes">Order notes (optional)</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5">
            <h2 className="text-lg font-semibold">Payment</h2>
            <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "paystack" | "cash_on_delivery")} className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                <RadioGroupItem value="paystack" /><span><span className="block font-medium">Pay online</span><span className="block text-xs text-muted-foreground">Mobile Money · Card</span></span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                <RadioGroupItem value="cash_on_delivery" /><span><span className="block font-medium">Cash on delivery</span><span className="block text-xs text-muted-foreground">Pay when it arrives</span></span>
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
          <Button type="submit" size="lg" className="mt-6 w-full" disabled={submitting}>
            {submitting ? "Placing order…" : paymentMethod === "paystack" ? "Pay now" : "Place order"}
          </Button>
        </aside>
      </form>
    </ShopLayout>
  );
}
