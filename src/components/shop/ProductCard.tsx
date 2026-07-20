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

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const outOfStock = product.stock_quantity <= 0;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <Link to="/product/$slug" params={{ slug: product.slug }} className="relative block aspect-square overflow-hidden rounded-xl bg-muted border border-border/40">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-103"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground text-xs font-medium">No image</div>
        )}
        {!outOfStock && (
          <span className="absolute left-2.5 top-2.5 rounded-md bg-background/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary border border-border/50 backdrop-blur-sm shadow-xs">
            In stock
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col pt-3.5">
        <Link to="/product/$slug" params={{ slug: product.slug }} className="line-clamp-2 font-display text-sm font-semibold tracking-tight text-foreground hover:text-primary transition-colors min-h-[2.5rem] leading-snug">
          {product.name}
        </Link>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="font-display text-base font-bold text-primary">{formatGHS(Number(product.price_ghs))}</span>
          <span className="text-[10px] text-muted-foreground font-sans">/ {product.unit}</span>
        </div>
        <div className="mt-3.5">
          <Button
            size="sm"
            variant="outline"
            className="w-full rounded-lg border-border hover:bg-primary hover:text-primary-foreground text-xs font-semibold tracking-wide transition-all"
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
