import { createFileRoute, Link } from "@tanstack/react-router";
import { ShopLayout } from "@/components/shop/Layout";
import { Button } from "@/components/ui/button";
import { Crown, Heart, Shield, Leaf, Award, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

function AboutPage() {
  return (
    <ShopLayout>
      {/* Hero Section */}
      <section className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="overflow-hidden rounded-[2.5rem] border border-amber-500/30 bg-black/60 backdrop-blur-xl shadow-2xl p-8 sm:p-16 text-center relative">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-amber-500/10 pointer-events-none" />
          
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs font-extrabold tracking-widest uppercase text-amber-400 mb-6">
            <Crown className="h-4 w-4 fill-amber-400" />
            <span>OUR STORY & HERITAGE</span>
          </div>

          <h1 className="font-display text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
            Crafting Authentic Ghanaian Flavors With <span className="text-amber-400 italic font-serif">Passion & Trust</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-zinc-300 max-w-2xl mx-auto leading-relaxed">
            At Barima Ba Foods, we believe that great food brings people together. Born in the heart of Accra, our mission is to deliver authentic, homemade Ghanaian delicacies made with 100% natural ingredients and uncompromising quality.
          </p>

          <div className="mt-8 flex justify-center gap-4">
            <Button asChild size="lg" className="rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold px-8">
              <Link to="/shop">Explore Our Products <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Brand Pillars Grid */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="text-center mb-12">
          <span className="text-xs font-extrabold uppercase tracking-widest text-amber-400">WHAT DRIVES US</span>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl font-extrabold text-foreground">The Four Pillars of Barima Ba Foods</h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Leaf,
              title: "100% Natural Ingredients",
              desc: "We strictly refrain from artificial preservatives, MSG, or chemical additives. Every batch is seasoned with pure local spices.",
            },
            {
              icon: Shield,
              title: "Hygienic Preparation",
              desc: "Our kitchens operate under stringent food safety standards, ensuring every jar of Shito and pouch of meat is clean and sealed.",
            },
            {
              icon: Heart,
              title: "Made With Love",
              desc: "Traditional slow-cooked recipes passed down through generations, prepared with patience and genuine care.",
            },
            {
              icon: Award,
              title: "Uncompromising Quality",
              desc: "From hand-selecting local dried fish and crayfish to premium beef cuts, only the finest raw materials make the grade.",
            },
          ].map((pillar) => (
            <div
              key={pillar.title}
              className="rounded-3xl border border-amber-500/20 bg-black/50 p-6 backdrop-blur-md transition-all hover:border-amber-500/50 hover:bg-black/70 shadow-xl"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 mb-5 border border-amber-500/30">
                <pillar.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display font-extrabold text-lg text-amber-300">{pillar.title}</h3>
              <p className="mt-3 text-xs leading-relaxed text-zinc-300">{pillar.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Story & Heritage Detail */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="overflow-hidden rounded-[2.5rem] border border-amber-500/30 bg-black/60 backdrop-blur-xl shadow-2xl p-8 sm:p-12">
          <div className="grid gap-10 md:grid-cols-12 md:items-center">
            <div className="md:col-span-6">
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400">OUR JOURNEY</span>
              <h2 className="mt-3 font-display text-3xl sm:text-4xl font-extrabold text-white">
                From Our Kitchen to Homes Across Ghana & Beyond
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-zinc-300">
                What started as a small kitchen operation preparing artisanal black pepper sauce (Shito) for family and friends quickly grew into one of Accra’s most trusted food brands.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-zinc-300">
                Today, Barima Ba Foods produces a signature line of Mild, Spicy, and Very Spicy Shito, seasoned tender Beef Chunks, Chicken Chunks, Green Chilli Sauce, and seasoned Gizzard, while catering for hundreds of events each year.
              </p>

              <div className="mt-6 space-y-3">
                {[
                  "Over 10,000+ Jars of Shito Delivered",
                  "Trusted by 500+ Wedding & Corporate Catering Clients",
                  "Same-day Express Delivery Across Accra & Fast Nationwide Shipping",
                ].map((stat) => (
                  <div key={stat} className="flex items-center gap-3 text-sm font-semibold text-amber-300">
                    <CheckCircle2 className="h-5 w-5 text-amber-400 shrink-0" />
                    <span>{stat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-6 grid grid-cols-2 gap-4">
              <img src="/images/spicy-african-bg.png" alt="Shito Kitchen" className="rounded-2xl object-cover h-52 w-full border border-amber-500/20 shadow-lg" />
              <img src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=600" alt="Authentic Spices" className="rounded-2xl object-cover h-52 w-full border border-amber-500/20 shadow-lg" />
            </div>
          </div>
        </div>
      </section>
    </ShopLayout>
  );
}
