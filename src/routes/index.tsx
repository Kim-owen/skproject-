import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { ShopLayout } from "@/components/shop/Layout";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/shop/ProductCard";
import { ArrowRight, ArrowUpRight, Leaf, Shield, Flame, Truck, Heart, Award, Utensils, Phone, CheckCircle2 } from "lucide-react";
import { formatGHS } from "@/lib/cart";
import { getHeroSettings, DEFAULT_HERO_SETTINGS } from "@/lib/settings.functions";
import { HeroMedia } from "@/components/shop/HeroMedia";

const featuredQuery = {
  queryKey: ["featured-products"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, slug, unit, price_ghs, image_url, stock_quantity, category_id")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(6);
    if (error) throw error;
    return data ?? [];
  },
};

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(featuredQuery),
  pendingMs: 0,
  pendingComponent: HomePending,
  component: Home,
});

function HomePending() {
  return (
    <ShopLayout>
      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 md:pt-16">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 md:grid-rows-2 md:auto-rows-fr">
          <div className="md:col-span-2 md:row-span-2 h-[420px] animate-pulse rounded-[2rem] bg-card/60 md:h-full" />
          <div className="h-40 animate-pulse rounded-[2rem] bg-card/60" />
          <div className="h-40 animate-pulse rounded-[2rem] bg-card/60" />
          <div className="h-40 animate-pulse rounded-[2rem] bg-card/60 md:col-span-2" />
        </div>
      </section>
    </ShopLayout>
  );
}

function Home() {
  const { data: products } = useSuspenseQuery(featuredQuery);
  const fetchHeroSettings = useServerFn(getHeroSettings);

  const { data: heroSettings = DEFAULT_HERO_SETTINGS } = useQuery({
    queryKey: ["hero-settings"],
    queryFn: () => fetchHeroSettings(),
    staleTime: 60_000,
  });

  const hero = products[0];

  return (
    <ShopLayout>
      {/* Hero Section with Cinematic Video & Gold Accent Copy */}
      <section className="relative mx-auto max-w-7xl px-3 sm:px-6 pt-4 pb-8">
        <div className="relative min-h-[85vh] w-full overflow-hidden rounded-[2.5rem] border border-amber-500/20 bg-black/40 backdrop-blur-md shadow-2xl transition-all duration-700">
          {/* Background Ambient Video Layer */}
          {heroSettings.media_type === "video" && heroSettings.video_url ? (
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
              <video
                src={heroSettings.video_url}
                poster={heroSettings.poster_url}
                autoPlay={heroSettings.autoplay}
                muted={true}
                loop={heroSettings.loop}
                playsInline
                className="h-full w-full object-cover opacity-40 sm:opacity-55 scale-105 animate-slow-pan"
              />
            </div>
          ) : (
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
              <img
                src={heroSettings.poster_url}
                alt="Ambient Background"
                className="h-full w-full object-cover opacity-35 scale-105 blur-[1px]"
              />
            </div>
          )}

          {/* Scrim Gradient Overlays for High Contrast */}
          <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent" />
          <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-t from-black/85 via-transparent to-black/50" />
          <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/15 via-transparent to-transparent" />

          {/* Hero Content Container */}
          <div className="relative z-10 grid gap-10 lg:grid-cols-12 lg:items-center px-6 py-12 sm:px-12 lg:py-16 min-h-[85vh]">
            <div className="flex flex-col justify-center lg:col-span-7">
              {/* Shimmer Pill Badge */}
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs font-extrabold tracking-widest uppercase text-amber-400 shadow-sm backdrop-blur-md animate-fade-in-up">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
                </span>
                <span>{heroSettings.badge_text || "Nationwide Delivery Across Ghana"}</span>
              </div>

              {/* Main Headline */}
              <h1 className="mt-6 font-display text-5xl font-extrabold tracking-tight text-white md:text-7xl leading-[1.05] animate-fade-in-up delay-100">
                {heroSettings.headline_main || "BARIMA BA FOODS"}
                <span className="block mt-1 font-serif italic text-amber-400 animate-shimmer">
                  {heroSettings.headline_highlight || "Taste. Quality. Trust."}
                </span>
              </h1>

              {/* Subheading */}
              <p className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-zinc-300 animate-fade-in-up delay-200">
                {heroSettings.subheading || "Premium quality homemade Ghanaian foods made with passion, rich in flavor and crafted for your satisfaction."}
              </p>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap gap-4 animate-fade-in-up delay-300">
                <Button asChild size="lg" className="rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black px-8 py-6 text-base font-extrabold shadow-xl shadow-amber-500/25 transition-all hover:scale-102">
                  <Link to="/shop">
                    SHOP NOW <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-2xl border-amber-500/40 bg-black/60 backdrop-blur-md px-8 py-6 text-base font-bold text-amber-400 hover:bg-amber-500/10 hover:border-amber-400 transition-all">
                  <Link to="/shop">OUR SERVICES</Link>
                </Button>
              </div>
            </div>

            {/* Right Column: Hero Video Component Showcase */}
            <div className="relative lg:col-span-5 animate-fade-in-up delay-200">
              <div className="relative transform transition-all duration-500 hover:scale-[1.01]">
                <HeroMedia settings={heroSettings} />
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-background to-transparent" />
        </div>
      </section>

      {/* 5-Column Trust Highlights Ribbon */}
      <section className="mx-auto mt-4 max-w-7xl px-3 sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 rounded-3xl border border-amber-500/20 bg-black/60 p-4 backdrop-blur-md shadow-xl text-center">
          {[
            { icon: Leaf, title: "100% NATURAL", desc: "No artificial preservatives" },
            { icon: Shield, title: "PREMIUM QUALITY", desc: "Selected ingredients" },
            { icon: Flame, title: "RICH IN FLAVOR", desc: "Authentic recipes" },
            { icon: Truck, title: "NATIONWIDE DELIVERY", desc: "Fast across Ghana" },
            { icon: Heart, title: "CUSTOMER SATISFACTION", desc: "Guaranteed satisfaction" },
          ].map((item) => (
            <div key={item.title} className="flex flex-col items-center p-3 rounded-2xl border border-amber-500/10 bg-amber-500/5 hover:border-amber-500/30 transition-all">
              <item.icon className="h-6 w-6 text-amber-400 mb-2" />
              <h4 className="font-extrabold text-xs tracking-wider text-amber-300">{item.title}</h4>
              <p className="text-[11px] text-zinc-400 mt-1 leading-tight">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Product Catalog Section */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-400">OUR PRODUCTS</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
            FLAVORFUL. FRESH. MADE FOR YOU.
          </h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-xl mx-auto">
            Explore our range of delicious products made with love and the finest ingredients.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Catering Services Showcase Section */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="overflow-hidden rounded-[2.5rem] border border-amber-500/30 bg-black/60 backdrop-blur-xl shadow-2xl p-8 sm:p-12">
          <div className="grid gap-10 md:grid-cols-12 md:items-center">
            <div className="md:col-span-6 flex flex-col justify-center">
              <span className="text-xs font-extrabold uppercase tracking-widest text-amber-400">OUR CATERING SERVICES</span>
              <h3 className="mt-3 font-display text-3xl sm:text-4xl font-extrabold text-white leading-tight">
                DELICIOUS FOOD FOR EVERY OCCASION
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-zinc-300">
                From small gatherings to big events, we provide tasty, hygienic and beautifully presented meals that make your events unforgettable.
              </p>
              <ul className="mt-6 space-y-3">
                {["Weddings", "Parties & Celebrations", "Corporate Events", "Funerals & More"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm font-semibold text-amber-300">
                    <CheckCircle2 className="h-5 w-5 text-amber-400 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Button asChild size="lg" className="rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold shadow-lg shadow-amber-500/25">
                  <Link to="/shop">
                    <Utensils className="mr-2 h-5 w-5" /> BOOK OUR CATERING
                  </Link>
                </Button>
              </div>
            </div>
            
            <div className="md:col-span-6 grid grid-cols-2 gap-4">
              <img src="/images/spicy-african-bg.png" alt="Catering Spread" className="rounded-2xl object-cover h-44 w-full border border-amber-500/20 shadow-md" />
              <img src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=600" alt="Ghanaian Cuisine" className="rounded-2xl object-cover h-44 w-full border border-amber-500/20 shadow-md" />
              <img src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=600" alt="Grilled Meat" className="col-span-2 rounded-2xl object-cover h-52 w-full border border-amber-500/20 shadow-md" />
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition Grid Strip */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 rounded-3xl border border-amber-500/20 bg-black/50 p-6 backdrop-blur-md text-center">
          {[
            { icon: Award, title: "EXPERTLY MADE", desc: "Prepared by experts with years of experience." },
            { icon: Shield, title: "QUALITY INGREDIENTS", desc: "We use only the best ingredients." },
            { icon: Heart, title: "MADE WITH LOVE", desc: "Every product is crafted with passion." },
            { icon: CheckCircle2, title: "TRUSTED BY MANY", desc: "Customers love us & keep coming back." },
          ].map((v) => (
            <div key={v.title} className="flex flex-col items-center p-3">
              <v.icon className="h-7 w-7 text-amber-400 mb-2" />
              <h4 className="font-extrabold text-xs tracking-wider text-amber-300">{v.title}</h4>
              <p className="text-xs text-zinc-400 mt-1">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Direct Contact Bar */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 p-6 text-black shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Truck className="h-10 w-10 shrink-0" />
            <div>
              <h4 className="font-extrabold text-lg uppercase tracking-wide">NATIONWIDE DELIVERY</h4>
              <p className="text-xs font-semibold">We deliver to your doorstep anywhere in Ghana.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-black/90 px-6 py-3 rounded-2xl text-amber-400 shadow-md">
            <Phone className="h-5 w-5" />
            <div className="text-left">
              <p className="text-[10px] uppercase font-bold text-zinc-400">CALL / WHATSAPP</p>
              <p className="text-sm font-extrabold text-white">+233 24 123 4567 | +233 50 123 4567</p>
            </div>
          </div>
        </div>
      </section>
    </ShopLayout>
  );
}
