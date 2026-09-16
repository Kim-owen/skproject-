import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { ShopLayout } from "@/components/shop/Layout";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductSlideshow } from "@/components/shop/ProductSlideshow";
import { getStorefrontConfig, listCategoriesWithCounts } from "@/lib/storefront.functions";
import {
  DEFAULT_STOREFRONT_CONFIG,
  normalizeStorefrontConfig,
  type StorefrontConfig,
} from "@/lib/storefront.types";
import {
  ArrowRight,
  ArrowUpRight,
  Leaf,
  Shield,
  Flame,
  Truck,
  Heart,
  Award,
  Utensils,
  Phone,
  CheckCircle2,
  Volume2,
  VolumeX,
  Sparkles,
  Package,
  Layers,
  ChevronRight,
  ShoppingBag,
} from "lucide-react";
import { useState, useRef, useMemo } from "react";

const ICON_MAP: Record<string, any> = {
  Leaf,
  Shield,
  Flame,
  Truck,
  Heart,
  Award,
  CheckCircle2,
  Sparkles,
  Package,
  Utensils,
  ShoppingBag,
};

function renderDynamicIcon(iconName: string, className = "h-6 w-6 text-amber-400 mb-2") {
  const IconComp = ICON_MAP[iconName] || Sparkles;
  return <IconComp className={className} />;
}

export const featuredQuery = {
  queryKey: ["featured-products"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, slug, unit, price_ghs, image_url, stock_quantity, category_id")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(16);
    if (error) throw error;
    return data ?? [];
  },
};

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await Promise.allSettled([
      context.queryClient.ensureQueryData(featuredQuery),
      context.queryClient.ensureQueryData({
        queryKey: ["storefront-config"],
        queryFn: () => getStorefrontConfig(),
      }),
      context.queryClient.ensureQueryData({
        queryKey: ["homepage-categories"],
        queryFn: () => listCategoriesWithCounts(),
      }),
    ]);
  },
  pendingMs: 0,
  pendingComponent: HomePending,
  component: Home,
});

function HomePending() {
  return (
    <ShopLayout>
      <section className="w-full px-4 pt-10 sm:px-6 md:pt-16">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 md:grid-rows-2 md:auto-rows-fr">
          <div className="md:col-span-2 md:row-span-2 h-105 animate-pulse rounded-[2rem] bg-card/60 md:h-full" />
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
  const fetchStorefrontConfig = useServerFn(getStorefrontConfig);
  const fetchCategories = useServerFn(listCategoriesWithCounts);

  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { data: config } = useQuery({
    queryKey: ["storefront-config"],
    queryFn: () => fetchStorefrontConfig(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["homepage-categories"],
    queryFn: () => fetchCategories(),
    staleTime: 60_000,
  });

  const toggleSound = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const safeConfig = useMemo<StorefrontConfig>(() => {
    return normalizeStorefrontConfig(config);
  }, [config]);

  // Filter products if manual selection is enabled
  const displayedProducts = useMemo(() => {
    if (
      safeConfig.featured_products.selection_mode === "manual" &&
      safeConfig.featured_products.selected_product_ids?.length > 0
    ) {
      const selectedMap = new Set(safeConfig.featured_products.selected_product_ids);
      const filtered = products.filter((p) => selectedMap.has(p.id));
      return filtered.length > 0 ? filtered : products;
    }
    return products.slice(0, safeConfig.featured_products.limit || 12);
  }, [products, safeConfig.featured_products]);

  // Filter categories if selected
  const displayedCategories = useMemo(() => {
    if (safeConfig.categories.selected_category_ids?.length > 0) {
      const selectedMap = new Set(safeConfig.categories.selected_category_ids);
      return categories.filter((c) => selectedMap.has(c.id));
    }
    return categories;
  }, [categories, safeConfig.categories.selected_category_ids]);

  return (
    <ShopLayout>
      {/* Dynamic Sections Renderer Driven by section_order */}
      {safeConfig.section_order.map((sectionId) => {
        // 1. TOP ANNOUNCEMENT BAR TICKER
        if (sectionId === "announcement" && safeConfig?.announcement?.enabled) {
          return (
            <div
              key="announcement"
              className="bg-linear-to-r from-amber-600 via-amber-500 to-amber-600 px-4 py-2 text-center text-black font-extrabold text-xs sm:text-sm shadow-md"
            >
              <Link
                to={safeConfig.announcement.link || "/shop"}
                className="inline-flex items-center justify-center gap-2 hover:underline"
              >
                {safeConfig.announcement.badge && (
                  <span className="rounded-full bg-black text-amber-400 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
                    {safeConfig.announcement.badge}
                  </span>
                )}
                <span>{safeConfig.announcement.text}</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0" />
              </Link>
            </div>
          );
        }

        // 2. HERO SHOWCASE SECTION
        if (sectionId === "hero" && safeConfig?.hero?.enabled) {
          const hero = safeConfig.hero;
          const cleanPoster = hero.poster_url || "";
          const hasVideo = hero.media_type === "video" && Boolean(hero.video_url?.trim());

          return (
            <section
              key="hero"
              className="relative w-full overflow-hidden bg-black min-h-[80vh] sm:min-h-[88vh]"
            >
              {/* Background Ambient Video or High-Res Photography */}
              {hasVideo ? (
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                  <video
                    ref={videoRef}
                    src={hero.video_url}
                    poster={cleanPoster}
                    autoPlay={hero.autoplay}
                    muted={isMuted}
                    loop={hero.loop}
                    playsInline
                    className="h-full w-full object-cover opacity-95 sm:opacity-100 brightness-105 contrast-105 scale-105 transition-opacity duration-700"
                  />
                </div>
              ) : cleanPoster ? (
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                  <img
                    src={cleanPoster}
                    alt="Ambient Background"
                    className="h-full w-full object-cover opacity-90 sm:opacity-95 brightness-105 scale-105"
                  />
                </div>
              ) : (
                <div className="absolute inset-0 z-0 bg-linear-to-br from-zinc-950 via-zinc-900 to-black overflow-hidden pointer-events-none">
                  <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-amber-500/15 blur-3xl" />
                  <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-amber-600/10 blur-3xl" />
                </div>
              )}

              {/* Scrim Gradients */}
              <div className="pointer-events-none absolute inset-0 z-0 bg-linear-to-r from-black/80 via-black/40 to-transparent" />
              <div className="pointer-events-none absolute inset-0 z-0 bg-linear-to-t from-black/85 via-transparent to-black/30" />

              {/* Hero Content Layer */}
              <div className="relative z-10 mx-auto max-w-7xl flex flex-col justify-between p-6 sm:p-12 lg:p-16 min-h-[80vh] sm:min-h-[88vh]">
                {/* Top Row with Shimmer Badge & Sound Mute/Unmute Control */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-black/80 px-4 py-1.5 text-xs font-extrabold tracking-widest uppercase text-amber-400 backdrop-blur-xl shadow-lg">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
                    </span>
                    <span>{hero.badge_text || "Nationwide Express Delivery Across Ghana"}</span>
                  </div>

                  {hero.media_type === "video" && (
                    <button
                      onClick={toggleSound}
                      aria-label={isMuted ? "Unmute Sound" : "Mute Sound"}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-500/40 bg-black/80 text-amber-400 backdrop-blur-xl shadow-xl hover:scale-110 active:scale-95 transition-all cursor-pointer"
                    >
                      {isMuted ? (
                        <VolumeX className="h-5 w-5 text-amber-400" />
                      ) : (
                        <Volume2 className="h-5 w-5 text-amber-400 animate-pulse" />
                      )}
                    </button>
                  )}
                </div>

                {/* Main Headline & Call to Actions */}
                <div className="my-auto py-8 max-w-3xl">
                  <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08] drop-shadow-lg">
                    {hero.headline_main || "BARIMA BA FOODS"}
                    <span className="block mt-2 font-serif italic text-amber-400 drop-shadow-xl">
                      {hero.headline_highlight || "Taste. Quality. Trust."}
                    </span>
                  </h1>

                  <p className="mt-4 sm:mt-6 max-w-xl text-sm sm:text-lg leading-relaxed text-zinc-100 font-sans backdrop-blur-md bg-black/40 p-4 rounded-2xl border border-white/10 shadow-2xl">
                    {hero.subheading ||
                      "Premium quality homemade Ghanaian foods made with passion, rich in flavor and crafted for your satisfaction."}
                  </p>

                  {/* Action Buttons */}
                  <div className="mt-8 flex flex-wrap items-center gap-4">
                    {hero.primary_button_text && (
                      <Button
                        asChild
                        size="lg"
                        className="rounded-2xl bg-linear-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-600 hover:to-amber-600 text-black px-8 py-6 text-sm sm:text-base font-extrabold shadow-xl shadow-amber-500/30 transition-all hover:scale-102"
                      >
                        <Link to={hero.primary_button_link || "/shop"}>
                          {hero.primary_button_text} <ArrowRight className="ml-2 h-5 w-5" />
                        </Link>
                      </Button>
                    )}

                    {hero.secondary_button_text && (
                      <Button
                        asChild
                        size="lg"
                        variant="outline"
                        className="rounded-2xl border-amber-500/40 bg-black/80 backdrop-blur-md px-8 py-6 text-sm sm:text-base font-extrabold text-amber-400 hover:bg-amber-500/20 hover:border-amber-400 transition-all"
                      >
                        <Link to={hero.secondary_button_link || "/catering"}>
                          {hero.secondary_button_text}
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="pointer-events-none absolute bottom-0 inset-x-0 h-16 bg-linear-to-t from-background to-transparent" />
            </section>
          );
        }

        // 3. TRUST RIBBON
        if (sectionId === "trust_ribbon" && safeConfig?.trust_ribbon?.enabled) {
          return (
            <section key="trust_ribbon" className="mx-auto mt-4 max-w-7xl px-3 sm:px-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 rounded-3xl border border-amber-500/20 bg-black/60 p-4 backdrop-blur-md shadow-xl text-center">
                {safeConfig.trust_ribbon.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center p-3 rounded-2xl border border-amber-500/10 bg-amber-500/5 hover:border-amber-500/30 transition-all"
                  >
                    {renderDynamicIcon(item.icon)}
                    <h4 className="font-extrabold text-xs tracking-wider text-amber-300">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-tight">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          );
        }

        // 4. CATEGORIES SHOWCASE
        if (
          sectionId === "categories" &&
          safeConfig?.categories?.enabled &&
          displayedCategories.length > 0
        ) {
          return (
            <section key="categories" className="mx-auto max-w-7xl px-4 pt-16 pb-4 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
                <div>
                  {safeConfig.categories.badge && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-extrabold uppercase tracking-widest text-amber-400 mb-2">
                      <Layers className="h-3.5 w-3.5" />
                      <span>{safeConfig.categories.badge}</span>
                    </div>
                  )}
                  <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground">
                    {safeConfig.categories.title}
                  </h3>
                  {safeConfig.categories.subtitle && (
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      {safeConfig.categories.subtitle}
                    </p>
                  )}
                </div>

                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-amber-500/30 hover:border-amber-500 text-amber-500 hover:bg-amber-500/10 self-start sm:self-auto font-bold"
                >
                  <Link to="/shop">
                    View All Categories <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              {/* Category Cards Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {displayedCategories.map((cat) => (
                  <Link
                    key={cat.id}
                    to="/shop"
                    search={{ cat: cat.slug }}
                    className="group flex flex-col items-center justify-center p-4 rounded-2xl border border-border bg-card hover:border-amber-500/50 hover:bg-amber-500/5 transition-all shadow-sm text-center"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-black transition-all mb-2">
                      <ShoppingBag className="h-6 w-6" />
                    </div>
                    <span className="font-bold text-xs sm:text-sm text-foreground group-hover:text-amber-500 transition-colors line-clamp-1">
                      {cat.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      {cat.products_count ?? 0} products
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        }

        // 5. FEATURED PRODUCTS SHOWCASE
        if (sectionId === "featured_products" && safeConfig?.featured_products?.enabled) {
          const feat = safeConfig.featured_products;
          return (
            <section key="featured_products" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
              <div className="text-center mb-12 animate-fade-in-up">
                {feat.badge && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-amber-400 backdrop-blur-md shadow-md mb-3">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
                    </span>
                    <span>{feat.badge}</span>
                  </div>
                )}

                <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground md:text-5xl leading-tight">
                  {feat.title}{" "}
                  {feat.title_highlight && (
                    <span className="text-amber-500 font-serif italic">{feat.title_highlight}</span>
                  )}
                </h2>

                {feat.subtitle && (
                  <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
                    {feat.subtitle}
                  </p>
                )}
              </div>

              {/* Dynamic Slideshow or Responsive Product Grid based on Admin setting */}
              {feat.display_mode === "grid" ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {displayedProducts.map((p) => (
                    <ProductCard key={p.id} product={p as any} />
                  ))}
                </div>
              ) : (
                <ProductSlideshow products={displayedProducts} />
              )}

              {/* View Full Catalog Button */}
              <div className="mt-10 text-center">
                <Button
                  asChild
                  size="lg"
                  className="rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-sm px-8 py-6 shadow-xl shadow-amber-500/20 hover:scale-105 transition-all"
                >
                  <Link to="/shop">
                    EXPLORE FULL PRODUCTS CATALOG <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </section>
          );
        }

        // 6. PROMOTIONAL / CATERING BANNER
        if (sectionId === "promotional_banner" && safeConfig?.promotional_banner?.enabled) {
          const promo = safeConfig.promotional_banner;
          return (
            <section key="promotional_banner" className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
              <div className="overflow-hidden rounded-[2.5rem] border border-amber-500/30 bg-black/60 backdrop-blur-xl shadow-2xl p-8 sm:p-12">
                <div className="grid gap-10 md:grid-cols-12 md:items-center">
                  <div className="md:col-span-6 flex flex-col justify-center">
                    {promo.badge && (
                      <span className="text-xs font-extrabold uppercase tracking-widest text-amber-400">
                        {promo.badge}
                      </span>
                    )}
                    <h3 className="mt-3 font-display text-3xl sm:text-4xl font-extrabold text-white leading-tight">
                      {promo.title}
                    </h3>
                    <p className="mt-4 text-sm leading-relaxed text-zinc-300">
                      {promo.description}
                    </p>
                    {promo.bullet_points && promo.bullet_points.length > 0 && (
                      <ul className="mt-6 space-y-3">
                        {promo.bullet_points.map((item, idx) => (
                          <li
                            key={idx}
                            className="flex items-center gap-3 text-sm font-semibold text-amber-300"
                          >
                            <CheckCircle2 className="h-5 w-5 text-amber-400 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {promo.cta_text && (
                      <div className="mt-8">
                        <Button
                          asChild
                          size="lg"
                          className="rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold shadow-lg shadow-amber-500/25"
                        >
                          <Link to={promo.cta_link || "/catering"}>
                            <Utensils className="mr-2 h-5 w-5" /> {promo.cta_text}
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Collage Images (Render only active uploaded images, respecting deletions) */}
                  {(() => {
                    const validImgs = (promo.images || []).filter(
                      (img) =>
                        img &&
                        !img.includes("spicy-african-bg") &&
                        !img.includes("photo-1555396273") &&
                        !img.includes("photo-1544025162"),
                    );
                    if (validImgs.length === 0) return null;
                    return (
                      <div className="md:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {validImgs.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt={`Catering Photo #${idx + 1}`}
                            className={`rounded-2xl object-cover border border-amber-500/20 shadow-md w-full ${
                              validImgs.length === 1
                                ? "h-64 sm:col-span-2"
                                : validImgs.length === 3 && idx === 2
                                  ? "col-span-2 h-52"
                                  : "h-44"
                            }`}
                          />
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </section>
          );
        }

        // 7. VALUE PROPOSITION STRIP
        if (sectionId === "value_props" && safeConfig?.value_props?.enabled) {
          return (
            <section key="value_props" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4 rounded-3xl border border-amber-500/20 bg-black/50 p-6 backdrop-blur-md text-center">
                {safeConfig.value_props.items.map((v, idx) => (
                  <div key={idx} className="flex flex-col items-center p-3">
                    {renderDynamicIcon(v.icon, "h-7 w-7 text-amber-400 mb-2")}
                    <h4 className="font-extrabold text-xs tracking-wider text-amber-300">
                      {v.title}
                    </h4>
                    <p className="text-xs text-zinc-400 mt-1">{v.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          );
        }

        // 8. DIRECT CONTACT & NATIONWIDE DELIVERY BAR
        if (sectionId === "contact_delivery" && safeConfig?.contact_delivery?.enabled) {
          const contact = safeConfig.contact_delivery;
          const cleanWa = (contact.whatsapp_number || "233241234567").replace(/\D/g, "");
          return (
            <section key="contact_delivery" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
              <div className="rounded-3xl bg-linear-to-r from-amber-500 via-amber-400 to-amber-500 p-6 text-black shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <Truck className="h-10 w-10 shrink-0" />
                  <div>
                    <h4 className="font-extrabold text-lg uppercase tracking-wide">
                      {contact.title}
                    </h4>
                    <p className="text-xs font-semibold">{contact.subtitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={`https://wa.me/${cleanWa}?text=${encodeURIComponent(
                      "Hello Barima Ba Foods, I would like to place an order.",
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 bg-black/90 px-6 py-3 rounded-2xl text-amber-400 shadow-md hover:bg-black transition-all"
                  >
                    <Phone className="h-5 w-5" />
                    <div className="text-left">
                      <p className="text-[10px] uppercase font-bold text-zinc-400">
                        CALL / WHATSAPP
                      </p>
                      <p className="text-sm font-extrabold text-white">{contact.phones}</p>
                    </div>
                  </a>
                </div>
              </div>
            </section>
          );
        }

        return null;
      })}
    </ShopLayout>
  );
}
