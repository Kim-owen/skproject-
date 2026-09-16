import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/shop/AdminShell";
import { useAdminGuard } from "@/lib/useAdminGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getGalleryItems,
  addGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
  saveAllGalleryItems,
  DEFAULT_GALLERY_ITEMS,
  type GalleryItem,
} from "@/lib/gallery.functions";
import { toast } from "sonner";
import { useState, useRef } from "react";
import {
  Camera,
  Upload,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  Loader2,
  Image as ImageIcon,
  RotateCcw,
  Search,
  Filter,
  Film,
  Play,
  Video,
} from "lucide-react";

export const Route = createFileRoute("/portal/gallery")({
  head: () => ({
    meta: [
      { title: "Admin — Visual Gallery Manager | Barima Ba Foods" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminGalleryPage,
});

const DEFAULT_CATEGORIES = ["Shito", "Meats", "Catering", "Sauces", "Kitchen", "Events"];

export const VIDEO_PRESETS = [
  {
    title: "Signature Shito Animi Cooking Reel",
    url: "/videos/shito-animi.mp4",
  },
  {
    title: "Fresh Vegetables & Market Produce",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyTouches.mp4",
  },
  {
    title: "Gourmet Kitchen Food Prep",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  },
];

function AdminGalleryPage() {
  const guard = useAdminGuard();
  const qc = useQueryClient();

  const fetchGallery = useServerFn(getGalleryItems);
  const addItemFn = useServerFn(addGalleryItem);
  const updateItemFn = useServerFn(updateGalleryItem);
  const deleteItemFn = useServerFn(deleteGalleryItem);
  const resetFn = useServerFn(saveAllGalleryItems);

  const { data: galleryItems = [], isLoading } = useQuery({
    queryKey: ["admin-gallery-items"],
    queryFn: () => fetchGallery(),
    enabled: guard === "ok",
  });

  // Filter & Search
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<"all" | "image" | "video">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Add / Edit Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);

  // Form Fields
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Shito");
  const [customCategory, setCustomCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [description, setDescription] = useState("");

  // Upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Derive dynamic list of all categories present
  const allCategories = [
    "All",
    ...Array.from(new Set([...DEFAULT_CATEGORIES, ...galleryItems.map((i) => i.category)])),
  ];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, WEBP)");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error("Image file must be under 15MB");
      return;
    }

    setUploadingImage(true);
    const toastId = toast.loading("Uploading image to storage...");
    try {
      const ext = file.name.split(".").pop() || "png";
      const fileName = `gallery-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const filePath = `gallery/${fileName}`;

      const uploadRes = await supabase.storage
        .from("media")
        .upload(filePath, file, { upsert: true });
      let publicUrl = "";

      if (uploadRes.error) {
        const fallbackRes = await supabase.storage
          .from("product-images")
          .upload(filePath, file, { upsert: true });
        if (fallbackRes.error) {
          throw new Error(uploadRes.error.message || fallbackRes.error.message);
        }
        const { data: pubData } = supabase.storage.from("product-images").getPublicUrl(filePath);
        publicUrl = pubData.publicUrl;
      } else {
        const { data: pubData } = supabase.storage.from("media").getPublicUrl(filePath);
        publicUrl = pubData.publicUrl;
      }

      setImageUrl(publicUrl);
      toast.success("Image uploaded successfully!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to upload image", { id: toastId });
    } finally {
      setUploadingImage(false);
      if (imageFileInputRef.current) imageFileInputRef.current.value = "";
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("Please upload a video file (MP4, WebM, MOV)");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error("Video file must be under 100MB");
      return;
    }

    setUploadingVideo(true);
    const toastId = toast.loading("Uploading video to storage (this may take a few moments)...");
    try {
      const ext = file.name.split(".").pop() || "mp4";
      const fileName = `gallery-video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const filePath = `videos/${fileName}`;

      // Upload to 'hero-media' or 'media' bucket
      const uploadRes = await supabase.storage
        .from("hero-media")
        .upload(filePath, file, { upsert: true });
      let publicUrl = "";

      if (uploadRes.error) {
        const fallbackRes = await supabase.storage
          .from("media")
          .upload(filePath, file, { upsert: true });
        if (fallbackRes.error) {
          throw new Error(uploadRes.error.message || fallbackRes.error.message);
        }
        const { data: pubData } = supabase.storage.from("media").getPublicUrl(filePath);
        publicUrl = pubData.publicUrl;
      } else {
        const { data: pubData } = supabase.storage.from("hero-media").getPublicUrl(filePath);
        publicUrl = pubData.publicUrl;
      }

      setVideoUrl(publicUrl);
      if (!imageUrl) {
        // Fallback default poster if none set
        setImageUrl("/images/product-shito-jars.png");
      }
      toast.success("Video uploaded successfully!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to upload video", { id: toastId });
    } finally {
      setUploadingVideo(false);
      if (videoFileInputRef.current) videoFileInputRef.current.value = "";
    }
  };

  const handleOpenAdd = () => {
    setMediaType("image");
    setTitle("");
    setCategory("Shito");
    setCustomCategory("");
    setImageUrl("");
    setVideoUrl("");
    setDescription("");
    setIsAddOpen(true);
  };

  const handleOpenEdit = (item: GalleryItem) => {
    setEditingItem(item);
    setMediaType(item.media_type || (item.video_url ? "video" : "image"));
    setTitle(item.title);
    if (DEFAULT_CATEGORIES.includes(item.category)) {
      setCategory(item.category);
      setCustomCategory("");
    } else {
      setCategory("Custom");
      setCustomCategory(item.category);
    }
    setImageUrl(item.img);
    setVideoUrl(item.video_url || "");
    setDescription(item.description || "");
    setIsEditOpen(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = category === "Custom" ? customCategory.trim() : category;
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    if (!finalCategory) {
      toast.error("Please specify a category");
      return;
    }
    if (mediaType === "video" && !videoUrl.trim()) {
      toast.error("Please provide or upload a video URL");
      return;
    }
    if (!imageUrl.trim()) {
      toast.error(
        mediaType === "video"
          ? "Please provide a poster/thumbnail image for the video"
          : "Please provide or upload an image",
      );
      return;
    }

    try {
      await addItemFn({
        data: {
          title: title.trim(),
          category: finalCategory,
          img: imageUrl.trim(),
          media_type: mediaType,
          video_url: mediaType === "video" ? videoUrl.trim() : undefined,
          description: description.trim() || undefined,
        },
      });
      qc.invalidateQueries({ queryKey: ["admin-gallery-items"] });
      qc.invalidateQueries({ queryKey: ["gallery-items"] });
      toast.success(mediaType === "video" ? "Video added to gallery!" : "Photo added to gallery!");
      setIsAddOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to add item");
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const finalCategory = category === "Custom" ? customCategory.trim() : category;
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    if (!finalCategory) {
      toast.error("Please specify a category");
      return;
    }
    if (mediaType === "video" && !videoUrl.trim()) {
      toast.error("Please provide a video URL");
      return;
    }
    if (!imageUrl.trim()) {
      toast.error("Please provide a poster image URL");
      return;
    }

    try {
      await updateItemFn({
        data: {
          id: editingItem.id,
          title: title.trim(),
          category: finalCategory,
          img: imageUrl.trim(),
          media_type: mediaType,
          video_url: mediaType === "video" ? videoUrl.trim() : undefined,
          description: description.trim() || undefined,
        },
      });
      qc.invalidateQueries({ queryKey: ["admin-gallery-items"] });
      qc.invalidateQueries({ queryKey: ["gallery-items"] });
      toast.success("Gallery item updated successfully!");
      setIsEditOpen(false);
      setEditingItem(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update item");
    }
  };

  const handleDelete = async (id: string, itemTitle: string) => {
    if (!confirm(`Are you sure you want to remove "${itemTitle}" from the gallery?`)) return;
    try {
      await deleteItemFn({ data: { id } });
      qc.invalidateQueries({ queryKey: ["admin-gallery-items"] });
      qc.invalidateQueries({ queryKey: ["gallery-items"] });
      toast.success("Item removed from gallery");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete item");
    }
  };

  const handleResetDefaults = async () => {
    if (
      !confirm(
        "Reset gallery to original default photos and reels? This will restore initial starter items.",
      )
    )
      return;
    try {
      await resetFn({ data: { items: DEFAULT_GALLERY_ITEMS } });
      qc.invalidateQueries({ queryKey: ["admin-gallery-items"] });
      qc.invalidateQueries({ queryKey: ["gallery-items"] });
      toast.success("Gallery restored to default photos and videos!");
    } catch (err: any) {
      toast.error(err.message || "Failed to restore defaults");
    }
  };

  const handleCopy = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success("Media URL copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter items
  const filteredItems = galleryItems.filter((item) => {
    const isVideo = item.media_type === "video" || !!item.video_url;
    if (mediaTypeFilter === "video" && !isVideo) return false;
    if (mediaTypeFilter === "image" && isVideo) return false;

    const matchCategory = selectedCategory === "All" || item.category === selectedCategory;
    const matchSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCategory && matchSearch;
  });

  const totalVideos = galleryItems.filter((i) => i.media_type === "video" || !!i.video_url).length;
  const totalPhotos = galleryItems.length - totalVideos;

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-amber-500/30 bg-card p-6 shadow-xl relative overflow-hidden">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-amber-500">
              <Camera className="h-3.5 w-3.5" />
              <span>Visual Gallery & Video Reels Hub</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Food, Event & Video Gallery
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
              Upload photos and video reels of your signature dishes, catering events, and kitchen
              preparations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetDefaults}
              className="text-xs font-semibold"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset Defaults
            </Button>

            <Button
              onClick={handleOpenAdd}
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-black font-extrabold shadow-lg shadow-amber-500/20"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Upload Photo / Video
            </Button>
          </div>
        </div>

        {/* Quick Stats & Controls */}
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border bg-card p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                Total Media
              </p>
              <p className="text-2xl font-mono font-extrabold text-foreground">
                {galleryItems.length}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                Video Reels
              </p>
              <p className="text-2xl font-mono font-extrabold text-amber-500">{totalVideos}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <Film className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                Photos
              </p>
              <p className="text-2xl font-mono font-extrabold text-foreground">{totalPhotos}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <ImageIcon className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                Public Page
              </p>
              <a
                href="/gallery"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-extrabold text-amber-500 hover:underline flex items-center gap-1 mt-1"
              >
                <span>View /gallery</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
              <ExternalLink className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Media Type Tabs & Category Filter Bar */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Media Type Segmented Controls */}
            <div className="inline-flex rounded-xl border border-border bg-card p-1 text-xs font-bold">
              <button
                onClick={() => setMediaTypeFilter("all")}
                className={`rounded-lg px-3 py-1.5 transition-all ${
                  mediaTypeFilter === "all"
                    ? "bg-amber-500 text-black shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Media ({galleryItems.length})
              </button>
              <button
                onClick={() => setMediaTypeFilter("video")}
                className={`rounded-lg px-3 py-1.5 transition-all flex items-center gap-1.5 ${
                  mediaTypeFilter === "video"
                    ? "bg-amber-500 text-black shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Film className="h-3.5 w-3.5" />
                <span>Videos ({totalVideos})</span>
              </button>
              <button
                onClick={() => setMediaTypeFilter("image")}
                className={`rounded-lg px-3 py-1.5 transition-all flex items-center gap-1.5 ${
                  mediaTypeFilter === "image"
                    ? "bg-amber-500 text-black shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ImageIcon className="h-3.5 w-3.5" />
                <span>Photos ({totalPhotos})</span>
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search gallery..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-xl px-3 py-1 text-xs font-bold transition-all ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-card text-muted-foreground hover:text-foreground border border-border"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Media Grid */}
        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            <p className="text-sm font-semibold">Loading gallery items…</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card/40 p-12 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
              <Camera className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">No media found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                {searchQuery || selectedCategory !== "All" || mediaTypeFilter !== "all"
                  ? "No photos or videos match your current filter."
                  : "Your gallery is currently empty. Click below to add your first photo or video reel!"}
              </p>
            </div>
            <Button onClick={handleOpenAdd} size="sm" className="bg-amber-500 text-black font-bold">
              <Plus className="mr-1.5 h-4 w-4" />
              Upload Photo / Video
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => {
              const isVideo = item.media_type === "video" || !!item.video_url;

              return (
                <div
                  key={item.id}
                  className="group overflow-hidden rounded-3xl border border-border bg-card shadow-md transition-all hover:border-amber-500/50 hover:shadow-xl flex flex-col"
                >
                  {/* Photo / Video Thumbnail Area */}
                  <div className="relative h-56 w-full overflow-hidden bg-black">
                    {isVideo && item.video_url ? (
                      <video
                        src={item.video_url}
                        poster={item.img}
                        muted
                        loop
                        playsInline
                        onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                        onMouseLeave={(e) => e.currentTarget.pause()}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <img
                        src={item.img}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLElement).setAttribute(
                            "src",
                            "/images/catering-jollof-feast.png",
                          );
                        }}
                      />
                    )}
                    <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-extrabold text-black uppercase tracking-wider shadow">
                        {item.category}
                      </span>
                      {isVideo && (
                        <span className="rounded-full bg-red-600/90 text-white px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow">
                          <Film className="h-3 w-3" />
                          <span>REEL</span>
                        </span>
                      )}
                    </div>

                    {/* Action buttons overlay */}
                    <div className="absolute top-3 right-3 flex items-center gap-1">
                      <button
                        onClick={() => handleCopy(item.id, item.video_url || item.img)}
                        title="Copy Media URL"
                        className="rounded-full bg-black/70 backdrop-blur-md p-1.5 text-white hover:bg-black transition-colors"
                      >
                        {copiedId === item.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <a
                        href={item.video_url || item.img}
                        target="_blank"
                        rel="noreferrer"
                        title="Open Media in New Tab"
                        className="rounded-full bg-black/70 backdrop-blur-md p-1.5 text-white hover:bg-black transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>

                    {/* Play Icon Badge for Videos */}
                    {isVideo && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="h-12 w-12 rounded-full bg-amber-500/80 backdrop-blur-sm text-black flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="h-6 w-6 fill-black ml-0.5" />
                        </div>
                      </div>
                    )}

                    <div className="absolute bottom-3 left-3 right-3 pointer-events-none">
                      <h3 className="font-display text-base font-extrabold text-white line-clamp-1">
                        {item.title}
                      </h3>
                    </div>
                  </div>

                  {/* Card Info & Actions */}
                  <div className="p-4 flex flex-col justify-between flex-1 space-y-3">
                    <p className="text-xs text-muted-foreground line-clamp-2 min-h-8">
                      {item.description || "No description provided."}
                    </p>

                    <div className="flex items-center justify-between border-t pt-3">
                      <span className="text-[10px] font-mono text-muted-foreground uppercase">
                        {isVideo ? "🎬 Video Reel" : "📷 Photo"}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(item)}
                          className="h-8 text-xs font-semibold px-2.5"
                        >
                          <Edit2 className="mr-1 h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id, item.title)}
                          className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 px-2"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Hidden File Inputs for Direct Storage Upload */}
      <input
        ref={imageFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
      <input
        ref={videoFileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleVideoUpload}
      />

      {/* Add Media Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-lg">
              {mediaType === "video" ? (
                <Film className="h-5 w-5 text-amber-500" />
              ) : (
                <Camera className="h-5 w-5 text-amber-500" />
              )}
              <span>Add to Visual Gallery</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Upload a photo or video reel directly to the Barima Ba Foods visual gallery.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAdd} className="space-y-4 pt-2">
            {/* Media Type Selector */}
            <div className="space-y-1">
              <Label className="text-xs font-bold">Media Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMediaType("image")}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-extrabold transition-all ${
                    mediaType === "image"
                      ? "border-amber-500 bg-amber-500/15 text-amber-500 shadow-sm"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <ImageIcon className="h-4 w-4" />
                  <span>Photo Image</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMediaType("video")}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-extrabold transition-all ${
                    mediaType === "video"
                      ? "border-amber-500 bg-amber-500/15 text-amber-500 shadow-sm"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Film className="h-4 w-4" />
                  <span>Video Reel</span>
                </button>
              </div>
            </div>

            {/* Video File / URL Upload (If Video) */}
            {mediaType === "video" && (
              <div className="space-y-2 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3.5">
                <Label className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                  <Film className="h-3.5 w-3.5" />
                  <span>Video Source (MP4, WebM)</span>
                </Label>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => videoFileInputRef.current?.click()}
                  disabled={uploadingVideo}
                  className="w-full h-10 border-dashed border-amber-500/50 hover:border-amber-500 text-xs font-bold"
                >
                  {uploadingVideo ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-amber-500" />
                      Uploading Video…
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4 text-amber-500" />
                      Upload Video from Device
                    </>
                  )}
                </Button>

                <Input
                  type="text"
                  placeholder="Or enter video URL (e.g. /videos/shito-animi.mp4)"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="text-xs bg-background"
                />

                {/* Video Quick Presets */}
                <div className="pt-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">
                    Quick Sample Videos:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {VIDEO_PRESETS.map((vp) => (
                      <button
                        key={vp.url}
                        type="button"
                        onClick={() => {
                          setVideoUrl(vp.url);
                          if (!imageUrl) setImageUrl("/images/product-shito-jars.png");
                        }}
                        className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold hover:bg-amber-500/20 text-muted-foreground hover:text-amber-400 transition-colors"
                      >
                        {vp.title}
                      </button>
                    ))}
                  </div>
                </div>

                {videoUrl && (
                  <div className="relative mt-2 h-36 w-full overflow-hidden rounded-xl border border-amber-500/30 bg-black">
                    <video
                      src={videoUrl}
                      controls
                      playsInline
                      className="h-full w-full object-contain"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Image / Poster Upload */}
            <div className="space-y-2">
              <Label className="text-xs font-bold">
                {mediaType === "video" ? "Video Poster / Thumbnail Image" : "Photo Image"}
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => imageFileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="w-full h-10 border-dashed border-amber-500/50 hover:border-amber-500 hover:bg-amber-500/10 text-xs font-bold"
                >
                  {uploadingImage ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-amber-500" />
                      Uploading Photo…
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4 text-amber-500" />
                      Upload Photo from Device
                    </>
                  )}
                </Button>
              </div>

              <Input
                type="text"
                placeholder="Or paste image URL (e.g. /images/... or https://...)"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="text-xs"
              />

              {imageUrl && (
                <div className="relative mt-2 h-32 w-full overflow-hidden rounded-xl border border-amber-500/30 bg-muted">
                  <img src={imageUrl} alt="Preview" className="h-full w-full object-cover" />
                  <span className="absolute bottom-1 right-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white">
                    {mediaType === "video" ? "Poster Preview" : "Preview"}
                  </span>
                </div>
              )}
            </div>

            {/* Title */}
            <div className="space-y-1">
              <Label className="text-xs font-bold">Title</Label>
              <Input
                required
                placeholder={
                  mediaType === "video"
                    ? "e.g. Shito Bubbling Hot in Kitchen"
                    : "e.g. Golden Jollof Feast Bowl"
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-xs"
              />
            </div>

            {/* Category */}
            <div className="space-y-1">
              <Label className="text-xs font-bold">Category</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {DEFAULT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="Custom">+ Custom Category…</option>
              </select>

              {category === "Custom" && (
                <Input
                  required
                  placeholder="Enter custom category name (e.g. Grills, Drinks)"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="text-xs mt-2"
                />
              )}
            </div>

            {/* Description / Caption */}
            <div className="space-y-1">
              <Label className="text-xs font-bold">Caption / Notes (Optional)</Label>
              <Textarea
                placeholder="Brief notes about the video clip or dish..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs"
              >
                {mediaType === "video" ? "Add Video" : "Add Photo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Media Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-lg">
              <Edit2 className="h-5 w-5 text-amber-500" />
              <span>Edit Gallery Item</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update media details, category, or replace files.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
            {/* Media Type Toggle */}
            <div className="space-y-1">
              <Label className="text-xs font-bold">Media Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMediaType("image")}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-2 text-xs font-extrabold ${
                    mediaType === "image"
                      ? "border-amber-500 bg-amber-500/15 text-amber-500"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  <ImageIcon className="h-4 w-4" />
                  <span>Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMediaType("video")}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-2 text-xs font-extrabold ${
                    mediaType === "video"
                      ? "border-amber-500 bg-amber-500/15 text-amber-500"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  <Film className="h-4 w-4" />
                  <span>Video</span>
                </button>
              </div>
            </div>

            {/* Video Input (if video) */}
            {mediaType === "video" && (
              <div className="space-y-2 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3">
                <Label className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                  <Film className="h-3.5 w-3.5" />
                  <span>Video URL (MP4, WebM)</span>
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => videoFileInputRef.current?.click()}
                  disabled={uploadingVideo}
                  className="w-full h-9 border-dashed border-amber-500/50 text-xs font-bold"
                >
                  {uploadingVideo ? "Uploading Video…" : "Upload Replacement Video"}
                </Button>
                <Input
                  type="text"
                  placeholder="Video URL"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="text-xs bg-background"
                />
              </div>
            )}

            {/* Image / Poster Input */}
            <div className="space-y-2">
              <Label className="text-xs font-bold">
                {mediaType === "video" ? "Poster / Thumbnail Image" : "Photo Image"}
              </Label>
              <Button
                type="button"
                variant="outline"
                onClick={() => imageFileInputRef.current?.click()}
                disabled={uploadingImage}
                className="w-full h-9 border-dashed border-amber-500/50 text-xs font-bold"
              >
                {uploadingImage ? "Uploading Photo…" : "Upload Replacement Photo"}
              </Button>
              <Input
                type="text"
                placeholder="Image URL"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="text-xs"
              />
              {imageUrl && (
                <div className="relative mt-2 h-28 w-full overflow-hidden rounded-xl border border-amber-500/30 bg-muted">
                  <img src={imageUrl} alt="Preview" className="h-full w-full object-cover" />
                </div>
              )}
            </div>

            {/* Title */}
            <div className="space-y-1">
              <Label className="text-xs font-bold">Title</Label>
              <Input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-xs"
              />
            </div>

            {/* Category */}
            <div className="space-y-1">
              <Label className="text-xs font-bold">Category</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {DEFAULT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="Custom">+ Custom Category…</option>
              </select>

              {category === "Custom" && (
                <Input
                  required
                  placeholder="Enter custom category"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="text-xs mt-2"
                />
              )}
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label className="text-xs font-bold">Description / Caption</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
