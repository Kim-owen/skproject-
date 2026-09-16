import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listCategoriesWithCounts,
  upsertCategory,
  deleteCategory,
} from "@/lib/storefront.functions";
import { AdminShell } from "@/components/shop/AdminShell";
import { useAdminGuard } from "@/lib/useAdminGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FolderTree,
  Plus,
  Pencil,
  Trash2,
  Layers,
  ArrowUpDown,
  Search,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/portal/categories")({
  head: () => ({
    meta: [
      { title: "Admin — Categories Manager | Barima Ba Foods" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CategoriesPage,
});

interface CategoryItem {
  id?: string;
  name: string;
  slug: string;
  sort_order: number;
  products_count?: number;
}

const EMPTY_CAT: CategoryItem = {
  name: "",
  slug: "",
  sort_order: 0,
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function CategoriesPage() {
  const guard = useAdminGuard();
  const queryClient = useQueryClient();
  const fetchCategories = useServerFn(listCategoriesWithCounts);
  const saveCategory = useServerFn(upsertCategory);
  const removeCategory = useServerFn(deleteCategory);

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CategoryItem>(EMPTY_CAT);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => fetchCategories(),
    enabled: guard === "ok",
  });

  const upsertMutation = useMutation({
    mutationFn: async (payload: CategoryItem) => {
      return saveCategory({ data: payload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success(form.id ? "Category updated successfully!" : "Category created successfully!");
      setDialogOpen(false);
      setForm(EMPTY_CAT);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save category");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return removeCategory({ data: { id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category deleted");
      setDeleteConfirmId(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete category");
    },
  });

  const filteredCategories = useMemo(() => {
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.slug.toLowerCase().includes(search.toLowerCase()),
    );
  }, [categories, search]);

  const handleOpenCreate = () => {
    setForm({
      ...EMPTY_CAT,
      sort_order: categories.length + 1,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (cat: CategoryItem) => {
    setForm({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      sort_order: cat.sort_order,
    });
    setDialogOpen(true);
  };

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      slug: prev.id ? prev.slug : slugify(name),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    if (!form.slug.trim()) {
      toast.error("Category slug is required");
      return;
    }
    upsertMutation.mutate(form);
  };

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

  return (
    <AdminShell>
      <div className="space-y-6 max-w-6xl mx-auto pb-16">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-500 mb-2">
              <FolderTree className="h-3.5 w-3.5" />
              <span>STORE TAXONOMY</span>
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Categories Manager
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Organize products, set display ordering, and control which categories appear on the
              storefront.
            </p>
          </div>

          <Button
            onClick={handleOpenCreate}
            className="rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold shadow-lg shadow-amber-500/20"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Category
          </Button>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 p-3 backdrop-blur-md">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories by name or slug..."
              className="pl-10 rounded-xl bg-background/80 border-border"
            />
          </div>
          <div className="text-xs font-semibold text-muted-foreground px-2">
            Total: <span className="text-foreground">{categories.length}</span>
          </div>
        </div>

        {/* Categories List Table */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-muted-foreground animate-pulse">
              Loading categories...
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Layers className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
              <p className="text-base font-semibold text-foreground">No categories found</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Create categories to group your provisions and make them easy to browse on the
                frontend.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b border-border text-xs uppercase font-bold text-muted-foreground">
                  <tr>
                    <th className="px-6 py-4">Sort Order</th>
                    <th className="px-6 py-4">Category Name</th>
                    <th className="px-6 py-4">Slug (URL Key)</th>
                    <th className="px-6 py-4">Active Products</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredCategories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-mono font-bold text-foreground">
                          <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                          {cat.sort_order}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-foreground text-sm flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-amber-500" />
                          {cat.name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-xs text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded font-mono">
                          /{cat.slug}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Package className="h-3.5 w-3.5 text-muted-foreground" />
                          <strong className="text-foreground font-semibold">
                            {cat.products_count ?? 0}
                          </strong>{" "}
                          items
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(cat)}
                            className="h-8 rounded-lg border-border hover:bg-amber-500/10 hover:text-amber-500"
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirmId(cat.id!)}
                            className="h-8 rounded-lg text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create / Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl border-border bg-card">
            <DialogHeader>
              <DialogTitle className="font-display text-xl font-bold">
                {form.id ? "Edit Category" : "Create New Category"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Set the name, URL slug, and sorting position for this store category.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label
                  htmlFor="cat_name"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Category Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="cat_name"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Meats & Poultry, Homemade Shito, Grains"
                  className="rounded-xl"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="cat_slug"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  URL Slug <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="cat_slug"
                  value={form.slug}
                  onChange={(e) => setForm((p) => ({ ...p, slug: slugify(e.target.value) }))}
                  placeholder="meats-poultry"
                  className="rounded-xl font-mono text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="cat_order"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Sort Order
                </Label>
                <Input
                  id="cat_order"
                  type="number"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))
                  }
                  className="rounded-xl"
                />
                <p className="text-[11px] text-muted-foreground">
                  Lower numbers appear first on the shop page and homepage category ribbon.
                </p>
              </div>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={upsertMutation.isPending}
                  className="rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold"
                >
                  {upsertMutation.isPending
                    ? "Saving..."
                    : form.id
                      ? "Update Category"
                      : "Create Category"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
          <DialogContent className="sm:max-w-sm rounded-2xl border-border bg-card">
            <DialogHeader>
              <DialogTitle className="font-display text-lg font-bold text-rose-500">
                Delete Category?
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Are you sure you want to delete this category? Any products assigned to it will
                become uncategorized.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="pt-3">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
                className="rounded-xl font-bold"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminShell>
  );
}
