import { useState, useEffect, useRef } from "react";
import { ProductCard } from "./ProductCard";
import { ChevronLeft, ChevronRight, Flame, Sparkles } from "lucide-react";

interface Product {
  id: string;
  name: string;
  slug: string;
  unit: string;
  price_ghs: number;
  image_url: string | null;
  stock_quantity: number;
  category_id: string | null;
}

export function ProductSlideshow({ products }: { products: Product[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);

    // Calculate current active slide index
    const cardWidth = scrollRef.current.clientWidth > 640 ? 300 : 250;
    const idx = Math.round(scrollLeft / cardWidth);
    setActiveIndex(Math.min(idx, products.length - 1));
  };

  const scrollToIndex = (index: number) => {
    if (!scrollRef.current) return;
    const cardWidth = scrollRef.current.clientWidth > 640 ? 300 : 250;
    scrollRef.current.scrollTo({ left: index * cardWidth, behavior: "smooth" });
  };

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const cardWidth = scrollRef.current.clientWidth > 640 ? 300 : 250;
    const scrollAmount = direction === "left" ? -cardWidth : cardWidth;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  // Continuous smooth auto-slideshow animation
  useEffect(() => {
    if (isHovered || !products.length) return;

    const interval = setInterval(() => {
      if (!scrollRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;

      if (scrollLeft >= scrollWidth - clientWidth - 15) {
        scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        const cardWidth = scrollRef.current.clientWidth > 640 ? 300 : 250;
        scrollRef.current.scrollBy({ left: cardWidth, behavior: "smooth" });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isHovered, products]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState);
    updateScrollState();
    return () => el.removeEventListener("scroll", updateScrollState);
  }, []);

  if (!products || products.length === 0) return null;

  return (
    <div
      className="relative group py-6 space-y-4"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Category Pills & Quick Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
        <div className="flex items-center gap-1.5 shrink-0 bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-amber-500/20 text-amber-400 px-4 py-1.5 rounded-full border border-amber-500/40 shadow-lg shadow-amber-500/10 animate-pulse">
          <Flame className="h-4 w-4 fill-amber-400 text-amber-400" />
          <span className="text-xs font-extrabold uppercase tracking-widest">LIVE SHOWCASE SLIDESHOW</span>
        </div>

        {products.map((p, idx) => (
          <button
            key={p.id}
            onClick={() => scrollToIndex(idx)}
            className={`text-xs font-bold px-3.5 py-1.5 rounded-full transition-all duration-300 shrink-0 border ${
              activeIndex === idx
                ? "bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/30 scale-105"
                : "bg-zinc-900/90 border-zinc-800 text-zinc-300 hover:border-amber-500/40 hover:text-amber-400"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Manual Navigation Buttons */}
      <button
        onClick={() => scroll("left")}
        disabled={!canScrollLeft}
        className={`absolute left-0 top-[55%] -translate-y-1/2 z-30 flex h-12 w-12 items-center justify-center rounded-2xl bg-black/95 text-amber-400 border border-amber-500/50 shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 backdrop-blur-xl ${
          !canScrollLeft ? "opacity-20 cursor-not-allowed" : "opacity-90 hover:opacity-100 hover:shadow-amber-500/20"
        }`}
        aria-label="Previous Slide"
      >
        <ChevronLeft className="h-7 w-7" strokeWidth={3} />
      </button>

      <button
        onClick={() => scroll("right")}
        disabled={!canScrollRight}
        className={`absolute right-0 top-[55%] -translate-y-1/2 z-30 flex h-12 w-12 items-center justify-center rounded-2xl bg-black/95 text-amber-400 border border-amber-500/50 shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 backdrop-blur-xl ${
          !canScrollRight ? "opacity-20 cursor-not-allowed" : "opacity-90 hover:opacity-100 hover:shadow-amber-500/20"
        }`}
        aria-label="Next Slide"
      >
        <ChevronRight className="h-7 w-7" strokeWidth={3} />
      </button>

      {/* Animated Sliding Track */}
      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto scroll-smooth py-3 px-2 no-scrollbar snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {products.map((p, idx) => (
          <div
            key={p.id}
            className={`w-[255px] sm:w-[285px] md:w-[305px] shrink-0 snap-start transition-all duration-500 hover:scale-103 ${
              activeIndex === idx ? "opacity-100 scale-102" : "opacity-90"
            }`}
          >
            <ProductCard product={p} />
          </div>
        ))}
      </div>

      {/* Animated Slide Progress Dots Bar */}
      <div className="flex items-center justify-center gap-2 pt-2">
        {products.map((_, idx) => (
          <button
            key={idx}
            onClick={() => scrollToIndex(idx)}
            className={`h-2 rounded-full transition-all duration-500 ${
              activeIndex === idx
                ? "w-8 bg-amber-500 shadow-md shadow-amber-500/50"
                : "w-2 bg-zinc-800 hover:bg-zinc-700"
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
