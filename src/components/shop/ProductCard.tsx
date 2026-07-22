import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useCart, formatGHS } from "@/lib/cart";
import { toast } from "sonner";
import { Plus } from "lucide-react";

type Product = {
  id: string;
  name: string;
  slug: string;
  unit: string;
  price_ghs: number;
  image_url: string | null;
  stock_quantity: number;
};

export function getProductImage(name: string, url: string | null): string {
  const n = name.toLowerCase();
  if (n.includes("shito")) return "/images/product-shito-jars.png";
  if (n.includes("beef")) return "/images/product-beef-chunks.png";
  if (n.includes("chicken")) return "/images/product-chicken-chunks.png";
  if (n.includes("green") || n.includes("chilli")) return "/images/product-green-chilli.png";
  if (n.includes("gizzard")) return "/images/product-gizzard.png";
  return url || "/images/product-shito-jars.png";
}

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const outOfStock = product.stock_quantity <= 0;
  const displayImage = getProductImage(product.name, product.image_url);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-3xl border border-amber-500/20 bg-card/80 backdrop-blur-xl p-4 shadow-lg transition-all duration-500 hover:-translate-y-2 hover:scale-[1.01] hover:border-amber-400/60 hover:shadow-2xl hover:shadow-amber-500/20">
      {/* Ambient Glow Aura Behind Card on Hover */}
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-amber-500/0 via-amber-400/10 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-xl pointer-events-none" />

      {/* Image Container with Zoom & Shimmer Glow */}
      <Link
        to="/product/$slug"
        params={{ slug: product.slug }}
        className="relative block aspect-square overflow-hidden rounded-2xl bg-zinc-950/80 border border-amber-500/20 group/img"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity duration-500 z-10 pointer-events-none" />
        <img
          src={displayImage}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110 group-hover:rotate-1"
        />
        {!outOfStock && (
          <span className="absolute left-3 top-3 z-20 flex items-center gap-1.5 rounded-full bg-black/80 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-widest text-amber-400 border border-amber-400/40 backdrop-blur-md shadow-md">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
            In stock
          </span>
        )}
      </Link>

      {/* Card Content & Details */}
      <div className="relative z-10 flex flex-1 flex-col pt-4">
        <Link
          to="/product/$slug"
          params={{ slug: product.slug }}
          className="line-clamp-2 font-display text-sm font-extrabold tracking-tight text-foreground hover:text-amber-400 transition-colors min-h-[2.5rem] leading-snug"
        >
          {product.name}
        </Link>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="font-display text-lg font-extrabold text-amber-500 drop-shadow-sm">
            {formatGHS(Number(product.price_ghs))}
          </span>
          <span className="text-[10px] text-muted-foreground font-sans font-semibold">
            / {product.unit}
          </span>
        </div>
        <div className="mt-4">
          <Button
            size="sm"
            variant="outline"
            className="group/btn w-full rounded-2xl border-amber-500/30 bg-background/80 hover:bg-gradient-to-r hover:from-amber-500 hover:via-amber-400 hover:to-amber-500 hover:text-black hover:border-amber-400 text-xs font-extrabold tracking-wider transition-all duration-300 shadow-md active:scale-95 hover:shadow-lg hover:shadow-amber-500/25"
            disabled={outOfStock}
            onClick={() => {
              add({
                id: product.id,
                name: product.name,
                slug: product.slug,
                unit: product.unit,
                price_ghs: Number(product.price_ghs),
                image_url: product.image_url,
              });
              toast.success(`${product.name} added to cart`);
            }}
          >
            {outOfStock ? (
              "Sold out"
            ) : (
              <>
                <Plus className="mr-1.5 h-4 w-4 transition-transform duration-300 group-hover/btn:rotate-90" />
                Add to cart
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
