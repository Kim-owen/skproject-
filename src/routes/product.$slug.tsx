import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShopLayout } from "@/components/shop/Layout";
import { Button } from "@/components/ui/button";
import { useCart, formatGHS } from "@/lib/cart";
import { toast } from "sonner";
import { useState } from "react";
import { Minus, Plus, ArrowLeft, AlertTriangle, PackageX } from "lucide-react";
import { ProductDetailSkeleton } from "@/components/shop/Skeletons";

const productQuery = (slug: string) => ({
  queryKey: ["product", slug],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, slug, description, unit, price_ghs, image_url, stock_quantity, is_active, categories(name, slug)",
      )
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
});

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(productQuery(params.slug));
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.name} — Provision Shop` },
          {
            name: "description",
            content: loaderData.description?.slice(0, 155) ?? loaderData.name,
          },
          { property: "og:title", content: loaderData.name },
          ...(loaderData.image_url
            ? [{ property: "og:image" as const, content: loaderData.image_url }]
            : []),
        ]
      : [{ title: "Product not found" }, { name: "robots", content: "noindex" }],
  }),
  notFoundComponent: () => (
    <ShopLayout>
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <PackageX className="h-6 w-6" />
        </div>
        <h1 className="mt-6 font-display text-2xl font-bold">Product not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This item may have moved or sold out. Browse the full catalogue.
        </p>
        <Button asChild className="mt-6 rounded-xl">
          <Link to="/shop">Back to shop</Link>
        </Button>
      </div>
    </ShopLayout>
  ),
  pendingMs: 0,
  pendingComponent: () => (
    <ShopLayout>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-4 h-4 w-24 animate-pulse rounded bg-muted" />
        <ProductDetailSkeleton />
      </div>
    </ShopLayout>
  ),
  errorComponent: ({ reset }) => (
    <ShopLayout>
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="mt-6 font-display text-2xl font-bold">Couldn't load product</h1>
        <Button onClick={reset} className="mt-6 rounded-xl">
          Try again
        </Button>
      </div>
    </ShopLayout>
  ),
  component: ProductPage,
});

function ProductPage() {
  const p = Route.useLoaderData();
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const outOfStock = p.stock_quantity <= 0;

  return (
    <ShopLayout>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Link
          to="/shop"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back to shop
        </Link>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="aspect-square overflow-hidden rounded-3xl border border-white/10 bg-muted">
            {p.image_url && (
              <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
            )}
          </div>
          <div className="flex flex-col">
            {p.categories && (
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
                {p.categories.name}
              </span>
            )}
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
              {p.name}
            </h1>
            <p className="mt-3 font-display text-3xl font-bold text-primary tabular-nums">
              {formatGHS(Number(p.price_ghs))}
              <span className="ml-2 text-sm font-normal text-muted-foreground">/ {p.unit}</span>
            </p>
            {p.description && <p className="mt-4 text-muted-foreground">{p.description}</p>}
            <p className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-card/40 px-3 py-1 text-xs">
              {outOfStock ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                  <span className="font-semibold text-destructive">Currently sold out</span>
                </>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                  <span className="text-muted-foreground">{p.stock_quantity} in stock</span>
                </>
              )}
            </p>

            <div className="mt-6 flex items-center gap-3">
              <div className="flex items-center rounded-xl border border-white/10 bg-background/50">
                <button
                  className="p-2.5 transition-colors hover:text-primary"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center font-semibold tabular-nums">{qty}</span>
                <button
                  className="p-2.5 transition-colors hover:text-primary"
                  onClick={() => setQty((q) => Math.min(p.stock_quantity, q + 1))}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <Button
                size="lg"
                className="rounded-xl mint-glow"
                disabled={outOfStock}
                onClick={() => {
                  add(
                    {
                      id: p.id,
                      name: p.name,
                      slug: p.slug,
                      unit: p.unit,
                      price_ghs: Number(p.price_ghs),
                      image_url: p.image_url,
                    },
                    qty,
                  );
                  toast.success(`Added ${qty} × ${p.name}`);
                }}
              >
                Add to cart
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ShopLayout>
  );
}
