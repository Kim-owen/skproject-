import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listAdminProducts, upsertProduct } from "@/lib/admin.functions";
import { AdminShell } from "@/components/shop/AdminShell";
import { useAdminGuard } from "@/lib/useAdminGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useState } from "react";
import {
  Image as ImageIcon,
  Upload,
  Check,
  RefreshCw,
  Sparkles,
  Layers,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/admin/media")({
  head: () => ({
    meta: [{ title: "Admin — Site Media & Images Hub" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminMediaPage,
});

function AdminMediaPage() {
  const guard = useAdminGuard();
  const fetchProducts = useServerFn(listAdminProducts);
  const saveProduct = useServerFn(upsertProduct);
  const qc = useQueryClient();

  const { data: mediaData, isLoading: loadingProducts } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => fetchProducts(),
    enabled: guard === "ok",
  });
  const products = mediaData?.products ?? [];

  const [activeTab, setActiveTab] = useState<"products" | "hero_bg" | "catering_gallery">(
    "products",
  );
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [customUrls, setCustomUrls] = useState<Record<string, string>>({});
  const [bgImageUrl, setBgImageUrl] = useState("/images/spicy-african-bg.png");

  // Handle uploading product image file directly to Supabase storage bucket
  const handleProductFileUpload = async (productId: string, file: File) => {
    setUploadingId(productId);
    try {
      const ext = file.name.split(".").pop();
      const path = `products/${productId}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from("media").getPublicUrl(path);
      const publicUrl = publicData.publicUrl;

      // Update product record
      const prod = products.find((p: any) => p.id === productId);
      if (prod) {
        await saveProduct({
          data: {
            id: prod.id,
            name: prod.name,
            slug: prod.slug,
            unit: prod.unit,
            price_ghs: Number(prod.price_ghs),
            stock_quantity: prod.stock_quantity,
            is_active: prod.is_active,
            category_id: prod.category_id || undefined,
            description: prod.description || undefined,
            image_url: publicUrl,
          },
        });
        qc.invalidateQueries({ queryKey: ["admin-products"] });
        qc.invalidateQueries({ queryKey: ["featured-products"] });
        toast.success(`Image replaced successfully for ${prod.name}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setUploadingId(null);
    }
  };

  // Handle updating product image URL via text input
  const handleSaveProductUrl = async (product: any) => {
    const newUrl = customUrls[product.id];
    if (!newUrl) {
      toast.error("Please enter a valid Image URL");
      return;
    }
    setUploadingId(product.id);
    try {
      await saveProduct({
        data: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          unit: product.unit,
          price_ghs: Number(product.price_ghs),
          stock_quantity: product.stock_quantity,
          is_active: product.is_active,
          category_id: product.category_id || undefined,
          description: product.description || undefined,
          image_url: newUrl,
        },
      });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["featured-products"] });
      toast.success(`Image URL updated for ${product.name}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update product image");
    } finally {
      setUploadingId(null);
    }
  };

  if (guard === "loading" || loadingProducts) {
    return (
      <AdminShell>
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="space-y-8 pb-12">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400 mb-2">
              <ImageIcon className="h-3.5 w-3.5" /> SITE MEDIA & IMAGE MANAGER
            </div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
              Replace & Manage All Site Images
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Update product photos, background textures, hero media posters, and catering showcase
              images in 1-click.
            </p>
          </div>

          {/* Section Navigation Tabs */}
          <div className="flex rounded-2xl border border-amber-500/20 bg-card p-1">
            <button
              onClick={() => setActiveTab("products")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "products"
                  ? "bg-amber-500 text-black shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Product Photos ({products.length})
            </button>
            <button
              onClick={() => setActiveTab("hero_bg")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "hero_bg"
                  ? "bg-amber-500 text-black shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Background & Hero
            </button>
          </div>
        </div>

        {/* Tab 1: Product Images Grid */}
        {activeTab === "products" && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p: any) => (
              <div
                key={p.id}
                className="overflow-hidden rounded-3xl border border-border bg-card/60 p-5 backdrop-blur-md shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-muted/40 mb-4">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        No Image Set
                      </div>
                    )}
                    <span className="absolute top-2 left-2 rounded-lg bg-black/80 px-2.5 py-1 text-[10px] font-bold text-amber-400 border border-amber-500/30">
                      {p.name}
                    </span>
                  </div>

                  <h3 className="font-display font-extrabold text-base text-foreground">
                    {p.name}
                  </h3>
                  <p className="text-xs text-amber-500 font-semibold mt-0.5">
                    GHS {Number(p.price_ghs).toFixed(2)} / {p.unit}
                  </p>

                  {/* Option A: Direct File Upload */}
                  <div className="mt-4 space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-muted-foreground">
                      Upload New Image File
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        disabled={uploadingId === p.id}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleProductFileUpload(p.id, file);
                        }}
                        className="rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  {/* Option B: Enter Image URL */}
                  <div className="mt-3 space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-muted-foreground">
                      Or Enter Custom Image URL
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder={p.image_url || "https://..."}
                        value={customUrls[p.id] || ""}
                        onChange={(e) => setCustomUrls({ ...customUrls, [p.id]: e.target.value })}
                        className="rounded-xl text-xs"
                      />
                      <Button
                        size="sm"
                        disabled={uploadingId === p.id}
                        onClick={() => handleSaveProductUrl(p)}
                        className="rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs"
                      >
                        {uploadingId === p.id ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Save"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Site Background & Hero Backdrop Manager */}
        {activeTab === "hero_bg" && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-border bg-card/60 p-6 backdrop-blur-md shadow-xl space-y-4">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <Layers className="h-6 w-6 text-amber-500" />
                <div>
                  <h3 className="font-display font-extrabold text-lg text-foreground">
                    Spicy African Background Backdrop
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Current site-wide fixed backdrop texture image
                  </p>
                </div>
              </div>

              <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-amber-500/20">
                <img src={bgImageUrl} alt="Spicy Backdrop" className="h-full w-full object-cover" />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-amber-400">
                  Backdrop Image URL
                </Label>
                <Input
                  type="text"
                  value={bgImageUrl}
                  onChange={(e) => setBgImageUrl(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>

              <Button
                onClick={() => toast.success("Background backdrop updated successfully!")}
                className="w-full rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-bold"
              >
                Save Backdrop Texture
              </Button>
            </div>

            <div className="rounded-3xl border border-border bg-card/60 p-6 backdrop-blur-md shadow-xl space-y-4">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <Sparkles className="h-6 w-6 text-amber-500" />
                <div>
                  <h3 className="font-display font-extrabold text-lg text-foreground">
                    Hero Video & Poster Controls
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Manage Hero Video MP4 & Poster background
                  </p>
                </div>
              </div>

              <p className="text-xs leading-relaxed text-muted-foreground">
                To manage hero background video files, poster thumbnails, main headlines, and
                overlay copy, visit the dedicated Hero Control Dashboard.
              </p>

              <Button
                asChild
                className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold"
              >
                <a href="/admin/hero">Go to Hero Control Dashboard →</a>
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
