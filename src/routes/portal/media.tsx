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
import { useState, useEffect, useRef } from "react";
import {
  Image as ImageIcon,
  Upload,
  Check,
  RefreshCw,
  Sparkles,
  Layers,
  ShieldCheck,
  Trash2,
  X,
  Copy,
  FolderOpen,
  Loader2,
  Plus,
} from "lucide-react";

export const Route = createFileRoute("/portal/media")({
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
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const storageUploadInputRef = useRef<HTMLInputElement>(null);

  const { data: mediaData, isLoading: loadingProducts } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => fetchProducts(),
    enabled: guard === "ok",
  });
  const products = mediaData?.products ?? [];

  const [activeTab, setActiveTab] = useState<"products" | "hero_bg" | "storage">("products");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [customUrls, setCustomUrls] = useState<Record<string, string>>({});
  const [bgImageUrl, setBgImageUrl] = useState("/images/barima-ba-foods-design.png");
  const [uploadingBg, setUploadingBg] = useState(false);

  // Storage bucket browser state
  const [selectedBucket, setSelectedBucket] = useState<"product-images" | "hero-media" | "media">(
    "product-images",
  );
  const [storageFiles, setStorageFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploadingStorage, setUploadingStorage] = useState(false);

  // Load storage files when storage tab or bucket changes
  const loadStorageFiles = async () => {
    setLoadingFiles(true);
    try {
      const { data, error } = await supabase.storage.from(selectedBucket).list("uploads", {
        limit: 100,
        sortBy: { column: "created_at", order: "desc" },
      });
      if (error) {
        // Try root
        const { data: rootData } = await supabase.storage.from(selectedBucket).list("", {
          limit: 100,
          sortBy: { column: "created_at", order: "desc" },
        });
        setStorageFiles(rootData ?? []);
      } else {
        setStorageFiles(data ?? []);
      }
    } catch {
      setStorageFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (activeTab === "storage") {
      loadStorageFiles();
    }
  }, [activeTab, selectedBucket]);

  // Upload product image file directly to Supabase storage bucket
  const handleProductFileUpload = async (productId: string, file: File) => {
    setUploadingId(productId);
    try {
      const ext = file.name.split(".").pop();
      const path = `uploads/products-${productId}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, file, { upsert: true });

      let publicUrl = "";
      if (uploadError) {
        // Fallback to media bucket
        await supabase.storage.from("media").upload(path, file, { upsert: true });
        const { data: pData } = supabase.storage.from("media").getPublicUrl(path);
        publicUrl = pData.publicUrl;
      } else {
        const { data: pData } = supabase.storage.from("product-images").getPublicUrl(path);
        publicUrl = pData.publicUrl;
      }

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

  // Remove product image completely
  const handleRemoveProductImage = async (product: any) => {
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
          image_url: "",
        },
      });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["featured-products"] });
      toast.success(`Image removed from ${product.name}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to remove image");
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

  // Upload Backdrop image file
  const handleBgFileUpload = async (file: File) => {
    setUploadingBg(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `uploads/bg-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("media").upload(path, file, { upsert: true });
      if (error) throw error;

      const { data } = supabase.storage.from("media").getPublicUrl(path);
      setBgImageUrl(data.publicUrl);
      toast.success("Backdrop uploaded and set!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload backdrop");
    } finally {
      setUploadingBg(false);
    }
  };

  // Upload directly to storage browser
  const handleUploadToStorage = async (file: File) => {
    setUploadingStorage(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `uploads/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { error } = await supabase.storage
        .from(selectedBucket)
        .upload(path, file, { upsert: true });
      if (error) throw error;
      toast.success(`Uploaded ${file.name} to bucket "${selectedBucket}"!`);
      loadStorageFiles();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload file");
    } finally {
      setUploadingStorage(false);
    }
  };

  // Delete file from storage bucket
  const handleDeleteStorageFile = async (fileName: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${fileName}" from storage?`)) return;
    try {
      const path = fileName.startsWith("uploads/") ? fileName : `uploads/${fileName}`;
      const { error } = await supabase.storage.from(selectedBucket).remove([path, fileName]);
      if (error) throw error;
      toast.success(`File "${fileName}" deleted permanently.`);
      loadStorageFiles();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete file from storage");
    }
  };

  const copyUrlToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Image URL copied to clipboard!");
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
              Manage & Remove All Images
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload, replace, and remove product photos, background textures, hero media, and cloud
              storage files.
            </p>
          </div>

          {/* Section Navigation Tabs */}
          <div className="flex rounded-2xl border border-border bg-card p-1">
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
              Backdrop Texture
            </button>
            <button
              onClick={() => setActiveTab("storage")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "storage"
                  ? "bg-amber-500 text-black shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Cloud Storage Files
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
                  <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-muted/40 mb-4 group">
                    {p.image_url ? (
                      <>
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveProductImage(p)}
                          className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive shadow-md"
                          title="Remove image from product"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col h-full items-center justify-center text-xs text-muted-foreground">
                        <ImageIcon className="h-8 w-8 mb-1 opacity-40" />
                        <span>No Image Attached</span>
                      </div>
                    )}
                    <span className="absolute bottom-2 left-2 rounded-lg bg-black/80 px-2.5 py-1 text-[10px] font-bold text-amber-400 border border-amber-500/30">
                      {p.name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-extrabold text-base text-foreground truncate">
                      {p.name}
                    </h3>
                    {p.image_url && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveProductImage(p)}
                        className="h-6 text-[10px] text-destructive hover:bg-destructive/10 px-2 rounded-lg"
                      >
                        <Trash2 className="h-3 w-3 mr-1" /> Remove
                      </Button>
                    )}
                  </div>
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
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <Layers className="h-6 w-6 text-amber-500" />
                  <div>
                    <h3 className="font-display font-extrabold text-lg text-foreground">
                      Spicy African Background Backdrop
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Site-wide ambient background texture
                    </p>
                  </div>
                </div>
                {bgImageUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setBgImageUrl("");
                      toast.success("Backdrop image removed!");
                    }}
                    className="text-xs text-destructive hover:bg-destructive/10 rounded-lg"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                  </Button>
                )}
              </div>

              <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-muted/40">
                {bgImageUrl ? (
                  <img
                    src={bgImageUrl}
                    alt="Spicy Backdrop"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-xs text-muted-foreground">
                    <ImageIcon className="h-8 w-8 mb-1 opacity-30" />
                    <span>No backdrop image set (clean dark theme)</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">
                  Upload New Backdrop File
                </Label>
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={bgFileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleBgFileUpload(file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => bgFileInputRef.current?.click()}
                    disabled={uploadingBg}
                    className="rounded-xl text-xs font-semibold"
                  >
                    {uploadingBg ? (
                      <>
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-1.5 h-4 w-4" /> Upload New File
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setBgImageUrl("/images/barima-ba-foods-design.png")}
                    className="rounded-xl text-xs"
                  >
                    Reset to Default
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">
                  Or Backdrop Image URL
                </Label>
                <Input
                  type="text"
                  value={bgImageUrl}
                  onChange={(e) => setBgImageUrl(e.target.value)}
                  placeholder="https://..."
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
                To upload new hero video MP4s, change video presets, clear background media, or
                customize headlines, visit the dedicated Hero Control Dashboard.
              </p>

              <Button
                asChild
                className="w-full rounded-2xl bg-linear-to-r from-amber-500 to-amber-600 text-black font-extrabold"
              >
                <a href="/portal/hero">Go to Hero Control Dashboard →</a>
              </Button>
            </div>
          </div>
        )}

        {/* Tab 3: Cloud Storage Browser & Permanent Delete */}
        {activeTab === "storage" && (
          <div className="rounded-3xl border border-border bg-card/60 p-6 backdrop-blur-md shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <h3 className="font-display font-extrabold text-lg text-foreground flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-amber-500" /> Cloud Storage File Browser
                </h3>
                <p className="text-xs text-muted-foreground">
                  Browse, copy URLs, and permanently delete images or videos from Supabase buckets.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedBucket}
                  onChange={(e) => setSelectedBucket(e.target.value as any)}
                  className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground"
                >
                  <option value="product-images">Bucket: product-images</option>
                  <option value="hero-media">Bucket: hero-media</option>
                  <option value="media">Bucket: media</option>
                </select>

                <input
                  type="file"
                  ref={storageUploadInputRef}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadToStorage(file);
                  }}
                />
                <Button
                  size="sm"
                  disabled={uploadingStorage}
                  onClick={() => storageUploadInputRef.current?.click()}
                  className="rounded-xl text-xs font-semibold"
                >
                  {uploadingStorage ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5 mr-1" /> Upload to Bucket
                    </>
                  )}
                </Button>
              </div>
            </div>

            {loadingFiles ? (
              <div className="py-12 text-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                Loading storage bucket contents...
              </div>
            ) : storageFiles.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs">
                No files found in bucket <strong>"{selectedBucket}"</strong>. Click "Upload to
                Bucket" above to add images or media.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {storageFiles.map((file) => {
                  const filePath = file.name.startsWith("uploads/")
                    ? file.name
                    : `uploads/${file.name}`;
                  const { data: pubData } = supabase.storage
                    .from(selectedBucket)
                    .getPublicUrl(filePath);
                  const isImage = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.name);

                  return (
                    <div
                      key={file.id || file.name}
                      className="rounded-2xl border border-border bg-card p-3 space-y-2 group shadow-sm hover:border-primary/40 transition-colors"
                    >
                      <div className="relative aspect-video w-full rounded-xl bg-muted overflow-hidden flex items-center justify-center">
                        {isImage ? (
                          <img
                            src={pubData.publicUrl}
                            alt={file.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              // If uploads/ prefix fails, try direct filename
                              const { data: fallback } = supabase.storage
                                .from(selectedBucket)
                                .getPublicUrl(file.name);
                              (e.target as HTMLImageElement).src = fallback.publicUrl;
                            }}
                          />
                        ) : (
                          <span className="text-[10px] font-mono font-bold text-muted-foreground">
                            {file.name.split(".").pop()?.toUpperCase()} File
                          </span>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-foreground truncate" title={file.name}>
                          {file.name}
                        </p>
                        {file.metadata?.size && (
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {(file.metadata.size / 1024).toFixed(1)} KB
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-border">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyUrlToClipboard(pubData.publicUrl)}
                          className="h-7 px-2 text-[11px] rounded-lg text-muted-foreground hover:text-foreground"
                          title="Copy public URL"
                        >
                          <Copy className="h-3 w-3 mr-1" /> Copy Link
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteStorageFile(file.name)}
                          className="h-7 px-2 text-[11px] rounded-lg text-destructive hover:bg-destructive/10"
                          title="Permanently remove file"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
