import { createFileRoute } from "@tanstack/react-router";
import { ShopLayout } from "@/components/shop/Layout";
import { HelpCircle, ChevronDown, Sparkles } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/faq")({
  component: FAQPage,
});

const FAQS = [
  {
    q: "What makes Barima Ba Shito different from regular store-bought shito?",
    a: "Barima Ba Shito is prepared using 100% natural ingredients, dried fish, crayfish, smoked shrimp, and authentic local spices slow-cooked over low heat. We use zero artificial preservatives, colors, or MSG.",
  },
  {
    q: "What are the spice levels available for Barima Ba Shito?",
    a: "We offer three distinct spice levels: Mild (flavorful with gentle warmth), Spicy (our standard Ghanaian heat level), and Very Spicy (crafted for true pepper lovers).",
  },
  {
    q: "How long does Barima Ba Shito and seasoned meats stay fresh?",
    a: "Unopened jars of Barima Ba Shito have a shelf life of up to 6 months at room temperature. Once opened, keep in a cool dry place or refrigerate. Our seasoned beef, chicken chunks, and gizzard are delivered hot and fresh daily, or vacuum-sealed for freezer storage up to 30 days.",
  },
  {
    q: "Do you deliver across Accra and outside Accra in Ghana?",
    a: "Yes! We offer same-day express delivery across Accra (East Legon, Spintex, Airport, Cantonments, Osu, Tema, Madina, Lapaz, etc.). For regions outside Accra (Kumasi, Takoradi, Tamale, Cape Coast), we deliver via courier parcel services within 24 hours.",
  },
  {
    q: "How far in advance should I book Barima Ba Catering Services?",
    a: "For large events (Weddings, Corporate Gatherings, Funerals over 100 guests), we recommend booking at least 1 to 2 weeks in advance. For smaller private party orders (20-50 guests), 48 hours notice is sufficient.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept MTN Mobile Money, Telecel Cash, AT Money, Bank Cards (Visa/Mastercard via Paystack), and Cash on Delivery in Accra.",
  },
];

function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <ShopLayout>
      {/* Hero Header */}
      <section className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="overflow-hidden rounded-[2.5rem] border border-amber-500/30 bg-black/60 backdrop-blur-xl shadow-2xl p-8 sm:p-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs font-extrabold tracking-widest uppercase text-amber-400 mb-6">
            <HelpCircle className="h-4 w-4" />
            <span>GOT QUESTIONS?</span>
          </div>

          <h1 className="font-display text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
            Frequently Asked <span className="text-amber-400 italic font-serif">Questions</span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-zinc-300 max-w-xl mx-auto">
            Everything you need to know about our products, shelf life, delivery, and catering services.
          </p>
        </div>
      </section>

      {/* Accordion List */}
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="space-y-4">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="overflow-hidden rounded-2xl border border-amber-500/20 bg-black/60 backdrop-blur-md transition-all shadow-md"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                >
                  <span className="font-display font-extrabold text-base sm:text-lg text-amber-300 pr-4">{faq.q}</span>
                  <ChevronDown className={`h-5 w-5 text-amber-400 transition-transform duration-300 shrink-0 ${isOpen ? "rotate-180" : "rotate-0"}`} />
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 text-sm text-zinc-300 leading-relaxed border-t border-amber-500/10 pt-4 animate-fade-in-up">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </ShopLayout>
  );
}
