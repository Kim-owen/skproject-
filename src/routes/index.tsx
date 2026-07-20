import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShopLayout } from "@/components/shop/Layout";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/shop/ProductCard";
import { ArrowRight, ArrowUpRight, Truck, ShieldCheck, Smartphone, Zap, MapPin } from "lucide-react";
import { formatGHS } from "@/lib/cart";

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
  const hero = products[0];

  return (
    <ShopLayout>
      {/* Subtle backdrop gradient */}
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[600px] overflow-hidden">
        <div className="absolute left-1/2 top-[-250px] h-[550px] w-[1000px] -translate-x-1/2 rounded-full bg-primary/5 blur-[120px] animate-pulse-glow" />
      </div>

      {/* Hero section */}
      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:pt-16">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          {/* Text block */}
          <div className="flex flex-col justify-center lg:col-span-7">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold tracking-wide text-primary animate-fade-in-up">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Same-day delivery across Accra
            </span>
            <h1 className="mt-6 font-display text-5xl font-extrabold tracking-tight text-foreground md:text-7xl leading-[1.05] animate-fade-in-up delay-100">
              Modern provisions,<br />
              <span className="text-primary font-normal italic font-serif">delivered fresh.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground animate-fade-in-up delay-200">
              The curated pantry for modern Accra. Order premium meats, poultry, house-made shito, and household essentials online.
            </p>
            <div className="mt-8 flex flex-wrap gap-3.5 animate-fade-in-up delay-300">
              <Button asChild size="lg" className="rounded-xl shadow-md shadow-primary/10 transition-all hover:shadow-lg">
                <Link to="/shop">
                  Start shopping <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-xl border-border bg-transparent hover:bg-muted/50">
                <Link to="/track">Track your order</Link>
              </Button>
            </div>

            {/* Quick stats row */}
            <div className="mt-12 grid grid-cols-3 gap-6 border-t border-border/80 pt-8 text-sm animate-fade-in-up delay-400">
              <div>
                <p className="font-display text-2xl font-bold text-foreground">42 min</p>
                <p className="text-xs text-muted-foreground mt-1">Average delivery today</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-foreground">MoMo / Card</p>
                <p className="text-xs text-muted-foreground mt-1">Pay online or on delivery</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-foreground">8+ Zones</p>
                <p className="text-xs text-muted-foreground mt-1">Accra coverage area</p>
              </div>
            </div>
          </div>

          {/* Visual Showcase */}
          <div className="relative lg:col-span-5 animate-fade-in-up delay-200">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-border bg-card shadow-xl shadow-foreground/5 animate-float">
              <img
                src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800"
                alt="Fresh organic groceries"
                className="h-full w-full object-cover transition-transform duration-700 hover:scale-102"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-border/50 bg-background/80 p-4 backdrop-blur-md">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Accra Express</p>
                    <p className="font-display text-base font-semibold text-foreground mt-0.5">Freshly packed on order</p>
                  </div>
                  <div className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    100% Quality
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value props strip */}
      <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
        <div className="grid gap-6 rounded-2xl border border-border bg-card/50 p-6 sm:grid-cols-3">
          {[
            { icon: Truck, title: "Same-day delivery", body: "Order before 3pm for delivery today." },
            { icon: Smartphone, title: "Flexible payments", body: "MTN, Telecel, Card, or Cash on Delivery." },
            { icon: ShieldCheck, title: "Freshness guaranteed", body: "Hand-picked and cut fresh, or your money back." },
          ].map((v) => (
            <div key={v.title} className="flex items-start gap-4 p-2">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-primary shrink-0">
                <v.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">{v.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{v.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Popular today</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Fresh this week
            </h2>
          </div>
          <Button asChild variant="ghost" className="text-muted-foreground hover:text-primary sm:inline-flex">
            <Link to="/shop">
              View catalogue <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>

        {/* Featured Drop block (Editorial layout) */}
        {hero && (
          <div className="mt-20 overflow-hidden rounded-3xl border border-border bg-card shadow-lg">
            <div className="grid gap-0 md:grid-cols-12">
              <div className="flex flex-col justify-center p-8 md:col-span-7 md:p-12">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Featured Selection</span>
                <h3 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground md:text-5xl">
                  {hero.name}
                </h3>
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-md">
                  Freshly catalogued, cleaned, and packed to preserve maximum flavor and nutritional value. Ready for dispatch today.
                </p>
                <div className="mt-8 flex items-center gap-6">
                  <div>
                    <p className="font-display text-2xl font-bold text-primary">{formatGHS(Number(hero.price_ghs))}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">per {hero.unit}</p>
                  </div>
                  <Button asChild size="lg" className="rounded-xl shadow-md transition-all">
                    <Link to="/product/$slug" params={{ slug: hero.slug }}>
                      View product <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
              {hero.image_url && (
                <div className="relative aspect-[4/3] md:aspect-auto md:col-span-5 border-t md:border-t-0 md:border-l border-border bg-muted overflow-hidden">
                  <img
                    src={hero.image_url}
                    alt={hero.name}
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-102"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </ShopLayout>
  );
}
