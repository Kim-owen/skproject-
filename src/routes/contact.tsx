import { createFileRoute } from "@tanstack/react-router";
import { ShopLayout } from "@/components/shop/Layout";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, MessageSquare, Send, Instagram, Facebook, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
});

function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.message) {
      toast.error("Please enter your name and message");
      return;
    }
    setSubmitted(true);
    toast.success("Message sent successfully! We will get back to you shortly.");
  };

  return (
    <ShopLayout>
      {/* Hero Header */}
      <section className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="overflow-hidden rounded-[2.5rem] border border-amber-500/30 bg-black/60 backdrop-blur-xl shadow-2xl p-8 sm:p-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs font-extrabold tracking-widest uppercase text-amber-400 mb-6">
            <MessageSquare className="h-4 w-4" />
            <span>WE'RE HERE FOR YOU</span>
          </div>

          <h1 className="font-display text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
            Get In Touch With <span className="text-amber-400 italic font-serif">Barima Ba Foods</span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-zinc-300 max-w-xl mx-auto">
            Have questions about your order, wholesale inquiries, or catering bookings? Reach out to our team today.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="https://wa.me/233241234567"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold px-7 py-4 text-sm shadow-xl shadow-amber-500/25 transition-all hover:scale-102"
            >
              <Phone className="h-5 w-5 fill-black" /> Chat on WhatsApp (+233 24 123 4567)
            </a>
          </div>
        </div>
      </section>

      {/* Contact Grid Section */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-8 md:grid-cols-12">
          {/* Left: Contact Info Cards */}
          <div className="md:col-span-5 space-y-6">
            <div className="rounded-3xl border border-amber-500/20 bg-black/60 p-6 backdrop-blur-md shadow-xl">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <Phone className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-display font-extrabold text-sm text-amber-300">Call / WhatsApp</h4>
                  <p className="text-sm font-semibold text-white mt-0.5">+233 24 123 4567</p>
                  <p className="text-sm font-semibold text-white">+233 50 123 4567</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-amber-500/20 bg-black/60 p-6 backdrop-blur-md shadow-xl">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-display font-extrabold text-sm text-amber-300">Kitchen & Distribution Hub</h4>
                  <p className="text-sm text-zinc-300 mt-0.5">East Legon & Spintex Road, Accra, Ghana</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-amber-500/20 bg-black/60 p-6 backdrop-blur-md shadow-xl">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <Instagram className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-display font-extrabold text-sm text-amber-300">Social Media</h4>
                  <p className="text-sm text-zinc-300 mt-0.5">@barimabafoods (Instagram, Facebook, TikTok)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Contact Form */}
          <div className="md:col-span-7">
            <div className="rounded-[2.5rem] border border-amber-500/30 bg-black/70 backdrop-blur-xl shadow-2xl p-8 sm:p-10">
              <h3 className="font-display text-2xl font-extrabold text-white mb-6">Send Us a Direct Message</h3>

              {submitted ? (
                <div className="text-center p-8 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                  <CheckCircle2 className="h-12 w-12 text-amber-400 mx-auto mb-3" />
                  <h4 className="text-xl font-bold text-white">Message Sent!</h4>
                  <p className="mt-2 text-sm text-zinc-300">Thank you {form.name}, we will respond to your inquiry via email/phone shortly.</p>
                  <Button onClick={() => setSubmitted(false)} variant="outline" className="mt-6 rounded-xl border-amber-500/40 text-amber-400">Send Another Message</Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase text-amber-400">Your Name *</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Abena Addo"
                      className="mt-1.5 w-full rounded-xl border border-amber-500/20 bg-zinc-900/80 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-bold uppercase text-amber-400">Phone Number</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="+233 24 123 4567"
                        className="mt-1.5 w-full rounded-xl border border-amber-500/20 bg-zinc-900/80 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-amber-400">Email Address</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="abena@example.com"
                        className="mt-1.5 w-full rounded-xl border border-amber-500/20 bg-zinc-900/80 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-amber-400">Message *</label>
                    <textarea
                      rows={4}
                      required
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="How can we help you today?"
                      className="mt-1.5 w-full rounded-xl border border-amber-500/20 bg-zinc-900/80 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <Button type="submit" size="lg" className="w-full rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold py-5">
                    <Send className="mr-2 h-5 w-5" /> SEND MESSAGE
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </ShopLayout>
  );
}
