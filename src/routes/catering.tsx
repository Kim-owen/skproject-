import { createFileRoute } from "@tanstack/react-router";
import { ShopLayout } from "@/components/shop/Layout";
import { Button } from "@/components/ui/button";
import {
  Utensils,
  CheckCircle2,
  Calendar,
  Users,
  Phone,
  Send,
  Clock,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/catering")({
  component: CateringPage,
});

function CateringPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    eventType: "Wedding",
    eventDate: "",
    guests: "100-200",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) {
      toast.error("Please enter your name and phone number");
      return;
    }
    setSubmitted(true);
    toast.success("Catering Inquiry Received! Our coordinator will contact you shortly.");
  };

  return (
    <ShopLayout>
      {/* Hero Section */}
      <section className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="overflow-hidden rounded-[2.5rem] border border-amber-500/30 bg-black/60 backdrop-blur-xl shadow-2xl p-8 sm:p-16 text-center relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs font-extrabold tracking-widest uppercase text-amber-400 mb-6">
            <Utensils className="h-4 w-4" />
            <span>BARIMA BA CATERING SERVICES</span>
          </div>

          <h1 className="font-display text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
            Delicious Food & Flawless Setup For{" "}
            <span className="text-amber-400 italic font-serif">Every Occasion</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-zinc-300 max-w-2xl mx-auto leading-relaxed">
            From intimate gatherings to grand celebrations, we provide delicious Ghanaian dishes,
            artisanal shito, live grill stations, and professional buffet setups across Accra and
            Ghana.
          </p>
        </div>
      </section>

      {/* Occasions Covered Grid */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="text-center mb-12">
          <span className="text-xs font-extrabold uppercase tracking-widest text-amber-400">
            EVENTS WE CATER FOR
          </span>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl font-extrabold text-foreground">
            Tailored Catering Solutions
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Weddings & Engagements",
              desc: "Royal traditional spreads, fried rice, jollof, seasoned meats, and elegant buffet presentation for your big day.",
              img: "/images/catering-wedding-table.png",
            },
            {
              title: "Parties & Celebrations",
              desc: "Birthdays, anniversaries, graduations, and private dinners with finger foods, beef chunks, chicken, and spicy shito dips.",
              img: "/images/catering-jollof-feast.png",
            },
            {
              title: "Corporate Events",
              desc: "Executive lunches, conferences, product launches, and office parties delivered hot and on time.",
              img: "/images/catering-chafing-buffet.png",
            },
            {
              title: "Funerals & Special Gatherings",
              desc: "Respectful, reliable bulk food supply and refreshment packs for families and guests.",
              img: "/images/catering-fried-meat.png",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="overflow-hidden rounded-3xl border border-amber-500/20 bg-black/50 backdrop-blur-md shadow-xl"
            >
              <img src={item.img} alt={item.title} className="h-44 w-full object-cover" />
              <div className="p-6">
                <h3 className="font-display font-extrabold text-lg text-amber-300">{item.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-300">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Booking Inquiry Form */}
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="rounded-[2.5rem] border border-amber-500/30 bg-black/70 backdrop-blur-xl shadow-2xl p-8 sm:p-12">
          <div className="text-center mb-8">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
              GET A CUSTOM QUOTE
            </span>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-white">
              Book Barima Ba Catering
            </h2>
            <p className="mt-2 text-sm text-zinc-300">
              Fill out your details below and our team will get back to you within 2 hours.
            </p>
          </div>

          {submitted ? (
            <div className="text-center p-8 rounded-2xl bg-amber-500/10 border border-amber-500/30">
              <CheckCircle2 className="h-12 w-12 text-amber-400 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-white">Thank You, {form.name}!</h3>
              <p className="mt-2 text-sm text-zinc-300">
                We have received your catering request for {form.eventType}. Our manager will call
                you at {form.phone}.
              </p>
              <Button
                onClick={() => setSubmitted(false)}
                variant="outline"
                className="mt-6 rounded-xl border-amber-500/40 text-amber-400"
              >
                Submit Another Request
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold uppercase text-amber-400">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Kwame Mensah"
                    className="mt-2 w-full rounded-xl border border-amber-500/20 bg-zinc-900/80 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-amber-400">
                    Phone / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+233 24 123 4567"
                    className="mt-2 w-full rounded-xl border border-amber-500/20 bg-zinc-900/80 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-bold uppercase text-amber-400">Event Type</label>
                  <select
                    value={form.eventType}
                    onChange={(e) => setForm({ ...form, eventType: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-amber-500/20 bg-zinc-900/80 px-4 py-3 text-sm text-white focus:border-amber-400 focus:outline-none"
                  >
                    <option value="Wedding">Wedding</option>
                    <option value="Party">Party / Celebration</option>
                    <option value="Corporate">Corporate Event</option>
                    <option value="Funeral">Funeral / Memorial</option>
                    <option value="Other">Other Event</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-amber-400">Event Date</label>
                  <input
                    type="date"
                    value={form.eventDate}
                    onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-amber-500/20 bg-zinc-900/80 px-4 py-3 text-sm text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-amber-400">
                    Estimated Guests
                  </label>
                  <select
                    value={form.guests}
                    onChange={(e) => setForm({ ...form, guests: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-amber-500/20 bg-zinc-900/80 px-4 py-3 text-sm text-white focus:border-amber-400 focus:outline-none"
                  >
                    <option value="50-100">50 – 100 Guests</option>
                    <option value="100-200">100 – 200 Guests</option>
                    <option value="200-500">200 – 500 Guests</option>
                    <option value="500+">500+ Guests</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-amber-400">
                  Special Notes or Menu Preferences
                </label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Tell us about your preferred dishes, location, or special dietary requirements..."
                  className="mt-2 w-full rounded-xl border border-amber-500/20 bg-zinc-900/80 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold py-6"
              >
                <Send className="mr-2 h-5 w-5" /> SUBMIT CATERING INQUIRY
              </Button>
            </form>
          )}
        </div>
      </section>
    </ShopLayout>
  );
}
