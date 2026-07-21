import { useState, useEffect, useRef } from "react";
import { ProductCard } from "./ProductCard";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";

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
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const cardWidth = scrollRef.current.clientWidth > 640 ? 320 : 260;
    const scrollAmount = direction === "left" ? -cardWidth : cardWidth;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  // Auto-sliding effect every 3.5 seconds when not hovered
  useEffect(() => {
    if (isHovered || !products.length) return;

    const interval = setInterval(() => {
      if (!scrollRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      
      // Reset to start if reached end
      if (scrollLeft >= scrollWidth - clientWidth - 15) {
        scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        const cardWidth = scrollRef.current.clientWidth > 640 ? 320 : 260;
        scrollRef.current.scrollBy({ left: cardWidth, behavior: "smooth" });
      }
    }, 3500);

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
      className="relative group py-4"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Category Pills Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar scroll-smooth">
        <span className="text-xs font-extrabold uppercase tracking-widest text-amber-500 flex items-center gap-1.5 shrink-0 bg-amber-500/10 px-3.5 py-1.5 rounded-full border border-amber-500/30 shadow-xs">
          <Flame className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
          FEATURED SLIDESHOW
        </span>
        {products.map((p) => (
          <span
            key={p.id}
            className="text-xs font-semibold px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 shrink-0 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
          >
            {p.name}
          </span>
        ))}
      </div>

      {/* Manual Scroll Arrows */}
      <button
        onClick={() => scroll("left")}
        disabled={!canScrollLeft}
        className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-2xl bg-black/90 text-amber-400 border border-amber-500/40 shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 backdrop-blur-md ${
          !canScrollLeft ? "opacity-30 cursor-not-allowed" : "opacity-90 hover:opacity-100"
        }`}
        aria-label="Previous Slide"
      >
        <ChevronLeft className="h-6 w-6" strokeWidth={3} />
      </button>

      <button
        onClick={() => scroll("right")}
        disabled={!canScrollRight}
        className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-2xl bg-black/90 text-amber-400 border border-amber-500/40 shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 backdrop-blur-md ${
          !canScrollRight ? "opacity-30 cursor-not-allowed" : "opacity-90 hover:opacity-100"
        }`}
        aria-label="Next Slide"
      >
        <ChevronRight className="h-6 w-6" strokeWidth={3} />
      </button>

      {/* Sliding Track */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scroll-smooth py-2 px-1 no-scrollbar snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {products.map((p) => (
          <div
            key={p.id}
            className="w-[250px] sm:w-[280px] md:w-[300px] shrink-0 snap-start transition-transform duration-300 hover:-translate-y-1"
          >
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </div>
  );
}
