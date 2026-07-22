import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAdminProducts, upsertProduct, deleteProduct } from "@/lib/admin.functions";
import { AdminShell } from "@/components/shop/AdminShell";
import { useAdminGuard } from "@/lib/useAdminGuard";
import { formatGHS } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Filter,
  ShoppingBag,
  Eye,
  Image as ImageIcon,
} from "lucide-react";

type Product = {
  id?: string;
  name: string;
  slug: string;
  description: string | null;
  unit: string;
  price_ghs: number | string;
  stock_quantity: number;
  category_id: string | null;
  image_url: string | null;
  is_active: boolean;
};

const EMPTY: Product = {
  name: "",
  slug: "",
  description: "",
  unit: "piece",
  price_ghs: "",
  stock_quantity: 0,
  category_id: null,
  image_url: "",
  is_active: true,
};

export const Route = createFileRoute("/admin/products")({
  head: () => ({ meta: [{ title: "Admin — Products" }, { name: "robots", content: "noindex" }] }),
  component: AdminProductsPage,
});

function AdminProductsPage() {
  const guard = useAdminGuard();
  const fetcher = useServerFn(listAdminProducts);
  const save = useServerFn(upsertProduct);
  const del = useServerFn(deleteProduct);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => fetcher(),
    enabled: guard === "ok",
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Product>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredProducts = useMemo(() => {
    if (!data?.products) return [];
    return data.products.filter((p) => {
      const matchesCategory = selectedCategory === "all" || p.category_id === selectedCategory;

      const query = search.toLowerCase().trim();
      const matchesSearch =
        !query ||
        p.name.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query)) ||
        p.slug.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [data, selectedCategory, search]);

  if (guard !== "ok") {
    return (
      <AdminShell>
        <div className="flex h-[50vh] items-center justify-center">
          <p className="text-sm font-semibold text-muted-foreground animate-pulse">
            {guard === "loading" ? "Verifying authorization..." : "Access denied."}
          </p>
        </div>
      </AdminShell>
    );
  }

  const openNew = () => {
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (p: any) => {
    setForm({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description ?? "",
      unit: p.unit,
      price_ghs: Number(p.price_ghs),
      stock_quantity: p.stock_quantity,
      category_id: p.category_id,
      image_url: p.image_url ?? "",
      is_active: p.is_active,
    });
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await save({
        data: {
          ...form,
          price_ghs: Number(form.price_ghs),
          description: form.description || "",
          image_url: form.image_url || "",
        } as any,
      });
      toast.success(form.id ? "Product updated successfully" : "Product added successfully");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save product");
    } finally {
      setBusy(false);
    }
  };

  const getStockBadge = (qty: number) => {
    if (qty === 0) {
      return "bg-destructive/10 text-destructive border-destructive/20";
    }
    if (qty <= 5) {
      return "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-950/40";
    }
    return "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-950/40";
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
              Products
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Add new ingredients, adjust prices, and monitor store stock levels.
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={openNew}
                className="rounded-xl font-semibold shadow-sm shadow-primary/10"
              >
                <Plus className="mr-1 h-4.5 w-4.5" /> Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg rounded-2xl border-border bg-card">
              <DialogHeader>
                <DialogTitle className="font-display text-lg font-bold">
                  {form.id ? "Edit Product Details" : "Create New Product"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={submit} className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="name"
                      className="text-xs font-bold text-muted-foreground uppercase"
                    >
                      Name
                    </Label>
                    <Input
                      id="name"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="rounded-xl"
                      placeholder="Fresh Spinach"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="slug"
                      className="text-xs font-bold text-muted-foreground uppercase"
                    >
                      Slug (URL)
                    </Label>
                    <Input
                      id="slug"
                      required
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
                      className="rounded-xl"
                      placeholder="fresh-spinach"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="desc"
                    className="text-xs font-bold text-muted-foreground uppercase"
                  >
                    Description
                  </Label>
                  <Textarea
                    id="desc"
                    rows={3}
                    value={form.description ?? ""}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="rounded-xl resize-none"
                    placeholder="Fresh local greens, harvested same-day..."
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="unit"
                      className="text-xs font-bold text-muted-foreground uppercase"
                    >
                      Fulfillment Unit
                    </Label>
                    <Input
                      id="unit"
                      required
                      value={form.unit}
                      onChange={(e) => setForm({ ...form, unit: e.target.value })}
                      className="rounded-xl"
                      placeholder="kg, piece, pack"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="price"
                      className="text-xs font-bold text-muted-foreground uppercase"
                    >
                      Price (GHS)
                    </Label>
                    <Input
                      id="price"
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.price_ghs}
                      onChange={(e) => setForm({ ...form, price_ghs: e.target.value })}
                      className="rounded-xl"
                      placeholder="45.00"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="stock"
                      className="text-xs font-bold text-muted-foreground uppercase"
                    >
                      Initial Stock
                    </Label>
                    <Input
                      id="stock"
                      required
                      type="number"
                      min="0"
                      value={form.stock_quantity}
                      onChange={(e) => setForm({ ...form, stock_quantity: Number(e.target.value) })}
                      className="rounded-xl"
                      placeholder="25"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">
                    Category
                  </Label>
                  <Select
                    value={form.category_id ?? "none"}
                    onValueChange={(v) =>
                      setForm({ ...form, category_id: v === "none" ? null : v })
                    }
                  >
                    <SelectTrigger className="rounded-xl border border-border bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border bg-card">
                      <SelectItem value="none" className="text-xs font-semibold">
                        Uncategorized
                      </SelectItem>
                      {(data?.categories ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs font-semibold">
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="image"
                    className="text-xs font-bold text-muted-foreground uppercase"
                  >
                    Display Image URL
                  </Label>
                  <Input
                    id="image"
                    value={form.image_url ?? ""}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    className="rounded-xl"
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Switch
                    id="active"
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                  />
                  <Label
                    htmlFor="active"
                    className="text-xs font-bold text-foreground cursor-pointer"
                  >
                    Visible to customer (Active listing)
                  </Label>
                </div>

                <DialogFooter className="pt-4 border-t">
                  <Button
                    type="submit"
                    disabled={busy}
                    className="rounded-xl font-semibold shadow-sm"
                  >
                    {busy ? "Saving changes..." : "Save Product"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Searching and Categorization filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search items by name, slug, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl border-border bg-card"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-56 rounded-xl border-border bg-card">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border bg-card">
                <SelectItem value="all" className="text-xs font-semibold">
                  All Categories
                </SelectItem>
                {(data?.categories ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs font-semibold">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border/80 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-4">Product Details</th>
                  <th className="px-5 py-4">Fulfillment Unit</th>
                  <th className="px-5 py-4">Unit Pricing</th>
                  <th className="px-5 py-4">Current Stock</th>
                  <th className="px-5 py-4">Listing Visibility</th>
                  <th className="px-5 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-sans">
                {isLoading
                  ? [1, 2, 3].map((i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={6} className="px-5 py-8 bg-card/40">
                          <div className="h-4 w-full bg-muted rounded" />
                        </td>
                      </tr>
                    ))
                  : filteredProducts.map((p: any) => (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        {/* Thumbnail and product name */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-4">
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border bg-secondary">
                              {p.image_url ? (
                                <img
                                  src={p.image_url}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-muted-foreground">
                                  <ImageIcon className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">{p.name}</div>
                              <div className="font-mono text-[10px] text-muted-foreground mt-0.5">
                                {p.slug}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Unit */}
                        <td className="px-5 py-3.5 text-foreground font-medium">{p.unit}</td>

                        {/* Price */}
                        <td className="px-5 py-3.5 font-display text-sm font-bold text-foreground">
                          {formatGHS(Number(p.price_ghs))}
                        </td>

                        {/* Stock status badge */}
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-bold ${getStockBadge(p.stock_quantity)}`}
                          >
                            {p.stock_quantity} {p.unit}s
                          </span>
                        </td>

                        {/* Active toggle indicator */}
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              p.is_active
                                ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {p.is_active ? "Active Listing" : "Hidden"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 text-right space-x-1">
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="rounded-lg hover:bg-secondary"
                          >
                            <Link to="/product/$slug" params={{ slug: p.slug }} target="_blank">
                              <Eye className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                            </Link>
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-lg hover:bg-secondary"
                            onClick={() => openEdit(p)}
                          >
                            <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-lg hover:bg-destructive/10"
                            onClick={async () => {
                              if (
                                !confirm(
                                  `Are you sure you want to hide ${p.name} from catalog listings?`,
                                )
                              )
                                return;
                              try {
                                await del({ data: { id: p.id } });
                                toast.success(`${p.name} hidden successfully`);
                                qc.invalidateQueries({ queryKey: ["admin-products"] });
                                qc.invalidateQueries({ queryKey: ["admin-stats"] });
                              } catch (e) {
                                toast.error(
                                  e instanceof Error ? e.message : "Failed to delete product",
                                );
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive hover:scale-105 transition-transform" />
                          </Button>
                        </td>
                      </tr>
                    ))}

                {/* Empty State */}
                {!isLoading && filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                          <ShoppingBag className="h-5 w-5" />
                        </div>
                        <h4 className="font-display text-base font-bold text-foreground">
                          No products found
                        </h4>
                        <p className="text-xs text-muted-foreground max-w-xs mt-1">
                          No inventory items matched your category filter or search query.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
