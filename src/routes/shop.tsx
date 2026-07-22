import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShopLayout } from "@/components/shop/Layout";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductGridSkeleton, CategoryPillsSkeleton } from "@/components/shop/Skeletons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, PackageSearch, AlertTriangle } from "lucide-react";
import { useState, useMemo } from "react";
import { z } from "zod";

const searchSchema = z.object({ cat: z.string().optional(), q: z.string().optional() });

const dataQuery = {
  queryKey: ["shop-data"],
  queryFn: async () => {
    const [{ data: categories }, { data: products }] = await Promise.all([
      supabase.from("categories").select("id, name, slug").order("sort_order"),
      supabase
        .from("products")
        .select("id, name, slug, unit, price_ghs, image_url, stock_quantity, category_id")
        .eq("is_active", true)
        .order("name"),
    ]);
    return { categories: categories ?? [], products: products ?? [] };
  },
};

export const Route = createFileRoute("/shop")({
  validateSearch: (s: Record<string, unknown>) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Shop — Provision Shop" },
      {
        name: "description",
        content: "Browse fresh meat, chicken, shito and household essentials.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(dataQuery),
  pendingMs: 0,
  pendingComponent: ShopPending,
  errorComponent: ShopError,
  component: Shop,
});

function ShopPending() {
  return (
    <ShopLayout>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
          Shop provisions
        </h1>
        <p className="mt-2 text-muted-foreground">Loading the freshest selection…</p>
        <div className="mt-6 h-10 w-full max-w-xl animate-pulse rounded-md bg-muted" />
        <div className="mt-6">
          <CategoryPillsSkeleton />
        </div>
        <div className="mt-8">
          <ProductGridSkeleton count={8} />
        </div>
      </div>
    </ShopLayout>
  );
}

function ShopError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ShopLayout>
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="mt-6 font-display text-2xl font-bold">Couldn't load the shop</h2>
        <p className="mt-2 text-sm text-muted-foreground">Check your connection and try again.</p>
        <Button onClick={reset} className="mt-6 rounded-xl">
          Try again
        </Button>
      </div>
    </ShopLayout>
  );
}

function Shop() {
  const { cat, q } = Route.useSearch();
  const navigate = useNavigate({ from: "/shop" });
  const { data } = useSuspenseQuery(dataQuery);
  const [search, setSearch] = useState(q ?? "");

  const filtered = useMemo(() => {
    let list = data.products;
    if (cat) {
      const c = data.categories.find((x) => x.slug === cat);
      if (c) list = list.filter((p) => p.category_id === c.id);
    }
    if (q) {
      const needle = q.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(needle));
    }
    return list;
  }, [data, cat, q]);

  return (
    <ShopLayout>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
          Shop provisions
        </h1>
        <p className="mt-2 text-muted-foreground">
          Everything you need for the kitchen and the home.
        </p>

        <form
          className="mt-6 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({
              search: (prev: Record<string, unknown>) => ({ ...prev, q: search || undefined }),
            });
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            to="/shop"
            search={{}}
            className={`rounded-full border px-3 py-1 text-sm ${!cat ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            All
          </Link>
          {data.categories.map((c) => (
            <Link
              key={c.id}
              to="/shop"
              search={{ cat: c.slug }}
              className={`rounded-full border px-3 py-1 text-sm ${cat === c.slug ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              {c.name}
            </Link>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="mt-16 flex flex-col items-center rounded-3xl border border-dashed border-white/10 bg-card/40 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <PackageSearch className="h-6 w-6" />
            </div>
            <h2 className="mt-5 font-display text-xl font-bold">Nothing matches yet</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Try a different search term or clear filters to see the whole catalogue.
            </p>
            <Button asChild variant="outline" className="mt-6 rounded-xl">
              <Link to="/shop" search={{}}>
                Clear filters
              </Link>
            </Button>
          </div>
        )}
      </div>
    </ShopLayout>
  );
}
