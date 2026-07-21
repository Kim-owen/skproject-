import { createFileRoute } from "@tanstack/react-router";
import { ShopLayout } from "@/components/shop/Layout";
import { Star, Quote, Heart, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/testimonials")({
  component: TestimonialsPage,
});

const REVIEWS = [
  {
    id: 1,
    name: "Dr. Abena Osei-Tutu",
    location: "East Legon, Accra",
    rating: 5,
    verified: true,
    text: "Barima Ba Shito is hands down the best black pepper sauce in Ghana! The Very Spicy version has that authentic homemade smokiness without any artificial aftertaste.",
  },
  {
    id: 2,
    name: "Chief Kojo Addo",
    location: "Spintex, Accra",
    rating: 5,
    verified: true,
    text: "We hired Barima Ba Foods for our wedding catering in Accra. 300 guests were served hot, delicious Ghanaian dishes right on time. Highly recommended!",
  },
  {
    id: 3,
    name: "Patricia Akwah",
    location: "Cantonments, Accra",
    rating: 5,
    verified: true,
    text: "The seasoned beef chunks and gizzard are my go-to weekly snack. Packaging is super clean and delivery takes under 45 minutes to my doorstep.",
  },
  {
    id: 4,
    name: "Michael Mensah",
    location: "Kumasi, Ashanti Region",
    rating: 5,
    verified: true,
    text: "I order 6 jars of Barima Ba Shito every month sent via VIP Parcel to Kumasi. Quality is consistent every single time.",
  },
  {
    id: 5,
    name: "Sandra Boateng",
    location: "London, UK (Diaspora Order)",
    rating: 5,
    verified: true,
    text: "My family in London refuses any other shito! Barima Ba Foods packages them securely for international travel.",
  },
  {
    id: 6,
    name: "Emmanuel Fiifi",
    location: "Airport Residential, Accra",
    rating: 5,
    verified: true,
    text: "The Green Chilli sauce is a game changer for fried fish and banku. Crisp, spicy, and super fresh!",
  },
];

function TestimonialsPage() {
  return (
    <ShopLayout>
      {/* Hero Header */}
      <section className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="overflow-hidden rounded-[2.5rem] border border-amber-500/30 bg-black/60 backdrop-blur-xl shadow-2xl p-8 sm:p-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs font-extrabold tracking-widest uppercase text-amber-400 mb-6">
            <Heart className="h-4 w-4" />
            <span>REAL TASTE · REAL TRUST</span>
          </div>

          <h1 className="font-display text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
            Loved By Thousands Across <span className="text-amber-400 italic font-serif">Ghana & Beyond</span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-zinc-300 max-w-xl mx-auto">
            Read what our verified customers and catering clients say about Barima Ba Foods.
          </p>
        </div>
      </section>

      {/* Reviews Grid */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {REVIEWS.map((review) => (
            <div
              key={review.id}
              className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-black/50 p-6 backdrop-blur-md shadow-xl flex flex-col justify-between"
            >
              <div>
                <Quote className="h-8 w-8 text-amber-500/20 mb-3" />
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-sans italic">"{review.text}"</p>
              </div>

              <div className="mt-6 pt-4 border-t border-amber-500/10 flex items-center justify-between">
                <div>
                  <h4 className="font-display font-extrabold text-sm text-amber-300">{review.name}</h4>
                  <p className="text-[11px] text-zinc-400">{review.location}</p>
                </div>
                {review.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-400 border border-amber-500/30">
                    <CheckCircle2 className="h-3 w-3" /> Verified Buyer
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </ShopLayout>
  );
}
