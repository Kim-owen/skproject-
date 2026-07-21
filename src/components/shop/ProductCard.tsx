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
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/70 backdrop-blur-md p-3.5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/40 hover:bg-card/90">
      <Link to="/product/$slug" params={{ slug: product.slug }} className="relative block aspect-square overflow-hidden rounded-xl bg-muted/50 border border-border/40">
        <img
          src={displayImage}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {!outOfStock && (
          <span className="absolute left-2.5 top-2.5 rounded-lg bg-background/85 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-primary border border-primary/20 backdrop-blur-md shadow-xs">
            In stock
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col pt-3.5">
        <Link to="/product/$slug" params={{ slug: product.slug }} className="line-clamp-2 font-display text-sm font-bold tracking-tight text-foreground hover:text-primary transition-colors min-h-[2.5rem] leading-snug">
          {product.name}
        </Link>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="font-display text-base font-extrabold text-primary">{formatGHS(Number(product.price_ghs))}</span>
          <span className="text-[10px] text-muted-foreground font-sans font-medium">/ {product.unit}</span>
        </div>
        <div className="mt-3.5">
          <Button
            size="sm"
            variant="outline"
            className="w-full rounded-xl border-border/80 bg-background/50 hover:bg-primary hover:text-primary-foreground hover:border-primary text-xs font-bold tracking-wide transition-all shadow-xs"
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
            {outOfStock ? "Sold out" : <><Plus className="mr-1 h-3.5 w-3.5" />Add to cart</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
