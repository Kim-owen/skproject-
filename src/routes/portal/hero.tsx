import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminShell } from "@/components/shop/AdminShell";
import { useAdminGuard } from "@/lib/useAdminGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Film,
  Sparkles,
  Save,
  Video,
  Image as ImageIcon,
  CheckCircle2,
  Upload,
  RefreshCw,
  Eye,
  Sliders,
  Trash2,
  Ban,
  X,
  Plus,
} from "lucide-react";
import {
  getHeroSettings,
  updateHeroSettings,
  uploadHeroMediaFile,
  DEFAULT_HERO_SETTINGS,
  PRO_VIDEO_PRESETS,
  type HeroMediaSettings,
} from "@/lib/settings.functions";
import { HeroMedia } from "@/components/shop/HeroMedia";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/portal/hero")({
  head: () => ({
    meta: [
      { title: "Admin — Hero Video & Media Settings" },
      { name: "robots", content: "noindex" },
    ],
  }),
  pendingMs: 0,
  component: AdminHeroSettings,
});

function AdminHeroSettings() {
  const guard = useAdminGuard();
  const queryClient = useQueryClient();

  const fetcher = useServerFn(getHeroSettings);
  const updater = useServerFn(updateHeroSettings);
  const mediaUploader = useServerFn(uploadHeroMediaFile);

  const { data: initialData, isLoading } = useQuery({
    queryKey: ["hero-settings"],
    queryFn: () => fetcher(),
    enabled: guard === "ok",
    staleTime: 0,
  });

  const [form, setForm] = useState<HeroMediaSettings>(DEFAULT_HERO_SETTINGS);
  const [presets, setPresets] = useState(PRO_VIDEO_PRESETS);
  const [uploading, setUploading] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  useEffect(() => {
    if (initialData) {
      setForm(initialData);
      if (initialData.presets && Array.isArray(initialData.presets)) {
        setPresets(initialData.presets);
      }
      setIsInitialized(true);
    }
  }, [initialData]);

  const updateMutation = useMutation({
    mutationFn: (newSettings: HeroMediaSettings) => updater({ data: { ...newSettings, presets } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hero-settings"] });
      queryClient.invalidateQueries({ queryKey: ["storefront-config"] });
      toast.success("Hero section media settings saved live!", {
        description: "Your storefront hero video and content are now updated.",
      });
    },
    onError: (err: any) => {
      toast.error("Failed to save settings", {
        description: err.message || "An unexpected error occurred",
      });
    },
  });

  const deleteOldStorageFile = async (url: string) => {
    if (!url || typeof url !== "string") return;
    if (!url.includes("/storage/v1/object/public/")) return;
    const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (!match) return;
    const bucket = match[1];
    const filePath = match[2];
    try {
      const { error } = await supabase.storage.from(bucket).remove([filePath]);
      if (error) {
        console.warn(`Storage notice (${bucket}/${filePath}):`, error.message);
      } else {
        console.log(`Deleted old storage file '${filePath}' from bucket '${bucket}'`);
      }
    } catch (err) {
      console.warn("Storage deletion error:", err);
    }
  };

  const [purging, setPurging] = useState<boolean>(false);

  const handlePurgeUnusedStorageFiles = async () => {
    setPurging(true);
    try {
      let deletedCount = 0;
      const activeUrls = new Set<string>();
      if (form.video_url) activeUrls.add(form.video_url);
      if (form.poster_url) activeUrls.add(form.poster_url);
      presets.forEach((p) => {
        if (p.video_url) activeUrls.add(p.video_url);
        if (p.poster_url) activeUrls.add(p.poster_url);
      });

      for (const bucket of ["hero-media", "media"]) {
        const { data: files } = await supabase.storage
          .from(bucket)
          .list(bucket === "media" ? "hero" : "");
        if (files && files.length > 0) {
          for (const file of files) {
            if (file.name === ".emptyFolderPlaceholder") continue;
            const filePath = bucket === "media" ? `hero/${file.name}` : file.name;
            const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
            if (data?.publicUrl && !activeUrls.has(data.publicUrl)) {
              await supabase.storage.from(bucket).remove([filePath]);
              deletedCount++;
            }
          }
        }
      }

      toast.success(
        deletedCount > 0
          ? `Purged ${deletedCount} unused old video/media file(s) from Supabase Storage!`
          : "Storage clean! All stored video files are currently active.",
      );
    } catch (err: any) {
      toast.error("Purge error: " + err.message);
    } finally {
      setPurging(false);
    }
  };

  const handleFieldChange = (key: keyof HeroMediaSettings, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "video_url" | "poster_url",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const oldUrl = form[field];
      const reader = new FileReader();

      reader.onload = async () => {
        try {
          const resultStr = reader.result as string;
          const base64Content = resultStr.split(",")[1];
          if (!base64Content) throw new Error("Could not read file data");

          const res = await mediaUploader({
            data: {
              fileName: file.name,
              fileBase64: base64Content,
              contentType: file.type || (field === "video_url" ? "video/mp4" : "image/png"),
              field,
            },
          });

          const newPublicUrl = res.publicUrl;

          // Automatically delete old storage file if replacing an uploaded video/image
          if (oldUrl && oldUrl !== newPublicUrl) {
            await deleteOldStorageFile(oldUrl);
          }

          handleFieldChange(field, newPublicUrl);
          toast.success("New video/media uploaded successfully!", {
            description: "Click 'Save Live Changes' top right to publish to the storefront.",
          });
        } catch (uploadErr: any) {
          toast.error("Upload error: " + (uploadErr.message || "Failed to upload file"));
        } finally {
          setUploading(false);
        }
      };

      reader.onerror = () => {
        toast.error("Failed to read file from disk");
        setUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      toast.error("Upload error: " + err.message);
      setUploading(false);
    }
  };

  const handleClearHeroBg = async () => {
    if (form.video_url) await deleteOldStorageFile(form.video_url);
    if (form.poster_url) await deleteOldStorageFile(form.poster_url);
    setForm((p) => ({ ...p, video_url: "", poster_url: "" }));
    toast.success("Hero background cleared and old files deleted from storage!", {
      description: "Click 'Save Live Changes' top right to make this permanent.",
    });
  };

  const handleRemovePreset = async (id: string) => {
    const target = presets.find((p) => p.id === id);
    if (target) {
      if (target.video_url) await deleteOldStorageFile(target.video_url);
      if (target.poster_url) await deleteOldStorageFile(target.poster_url);
    }
    const nextPresets = presets.filter((item) => item.id !== id);
    setPresets(nextPresets);
    setForm((p) => ({ ...p, presets: nextPresets }));
    toast.success("Preset removed and storage files deleted!", {
      description: "Click 'Save Live Changes' top right to delete permanently.",
    });
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
      <div className="space-y-8">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Video className="h-4 w-4" />
              </span>
              <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
                Hero Video & Media
              </h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Customize the dynamic hero section video, headlines, audio playback, and visual
              branding in real-time.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="rounded-xl font-semibold gap-2"
              onClick={() => setForm(initialData || DEFAULT_HERO_SETTINGS)}
              disabled={isLoading || updateMutation.isPending}
            >
              <RefreshCw className="h-4 w-4" /> Reset
            </Button>
            <Button
              className="rounded-xl font-semibold gap-2 shadow-md shadow-primary/10"
              onClick={() => updateMutation.mutate(form)}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save Live Changes
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Main Grid: Form Controls (Left) vs Live Preview (Right) */}
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Controls Form */}
          <div className="space-y-6 lg:col-span-7">
            {/* Media Mode Selector */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                    <Film className="h-4 w-4 text-primary" /> Display Mode
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Choose between dynamic high-definition video or a featured banner image.
                  </p>
                </div>
              </div>

              <Tabs
                value={form.media_type}
                onValueChange={(val) => handleFieldChange("media_type", val as "video" | "image")}
                className="w-full"
              >
                <TabsList className="grid grid-cols-2 w-full h-12 rounded-xl p-1 bg-muted">
                  <TabsTrigger
                    value="video"
                    className="rounded-lg font-semibold flex items-center gap-2"
                  >
                    <Video className="h-4 w-4" /> Dynamic Video Player
                  </TabsTrigger>
                  <TabsTrigger
                    value="image"
                    className="rounded-lg font-semibold flex items-center gap-2"
                  >
                    <ImageIcon className="h-4 w-4" /> Banner Image
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Video Presets Showcase */}
            {form.media_type === "video" && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" /> Pro Video Presets & Backgrounds
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handlePurgeUnusedStorageFiles}
                      disabled={purging}
                      className="text-xs text-amber-500 hover:bg-amber-500/10 h-7 rounded-lg border-amber-500/30"
                      title="Delete all unused old video files from Supabase Storage"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      {purging ? "Purging..." : "Purge Unused Videos"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearHeroBg}
                      className="text-xs text-destructive hover:bg-destructive/10 h-7 rounded-lg"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear Background
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Select a video theme, remove unwanted presets, or click "No Background" to clear:
                </p>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {/* Option: No Video / None */}
                  <button
                    type="button"
                    onClick={handleClearHeroBg}
                    className={`group relative overflow-hidden rounded-xl border text-left transition-all p-1.5 ${
                      !form.video_url && !form.poster_url
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md"
                        : "border-dashed border-border hover:border-primary/50 bg-card/60"
                    }`}
                  >
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted/60 flex flex-col items-center justify-center text-muted-foreground">
                      <Ban className="h-5 w-5 mb-1" />
                      <span className="text-[10px] font-bold">No Background</span>
                      {!form.video_url && !form.poster_url && (
                        <div className="absolute inset-0 bg-primary/20 backdrop-blur-[1px] flex items-center justify-center">
                          <CheckCircle2 className="h-5 w-5 text-white drop-shadow-md" />
                        </div>
                      )}
                    </div>
                    <p className="mt-1.5 text-[11px] font-semibold text-foreground truncate px-1">
                      Clean Minimal (None)
                    </p>
                  </button>

                  {/* Curated / Uploaded Presets */}
                  {presets.map((preset) => {
                    const isSelected = form.video_url === preset.video_url;
                    return (
                      <div
                        key={preset.id}
                        className={`group relative overflow-hidden rounded-xl border text-left transition-all p-1.5 ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md"
                            : "border-border hover:border-primary/50 bg-card"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            handleFieldChange("video_url", preset.video_url);
                            handleFieldChange("poster_url", preset.poster_url);
                          }}
                          className="w-full text-left"
                        >
                          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                            <img
                              src={preset.poster_url}
                              alt={preset.title}
                              className="h-full w-full object-cover"
                            />
                            {isSelected && (
                              <div className="absolute inset-0 bg-primary/20 backdrop-blur-[1px] flex items-center justify-center">
                                <CheckCircle2 className="h-5 w-5 text-white drop-shadow-md" />
                              </div>
                            )}
                          </div>
                          <p className="mt-1.5 text-[11px] font-semibold text-foreground truncate px-1">
                            {preset.title}
                          </p>
                        </button>

                        {/* Remove preset button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemovePreset(preset.id);
                          }}
                          className="absolute top-2 right-2 h-5 w-5 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                          title="Remove this preset option"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Media URLs & Uploads */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-primary" /> Media Assets & File Sources
                </h3>
                {(form.video_url || form.poster_url) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearHeroBg}
                    className="text-xs text-destructive hover:bg-destructive/10 h-7 rounded-lg"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove Both
                  </Button>
                )}
              </div>

              {form.media_type === "video" && (
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="video_url" className="text-xs font-semibold text-foreground">
                      Direct MP4 / Video Stream URL
                    </Label>
                    {form.video_url && (
                      <button
                        type="button"
                        onClick={() => handleFieldChange("video_url", "")}
                        className="text-[11px] text-destructive hover:underline"
                      >
                        Remove video
                      </button>
                    )}
                  </div>
                  <div className="mt-1.5 flex gap-2">
                    <Input
                      id="video_url"
                      value={form.video_url}
                      onChange={(e) => handleFieldChange("video_url", e.target.value)}
                      placeholder="https://example.com/video.mp4"
                      className="rounded-xl font-mono text-xs"
                    />
                    <label className="cursor-pointer">
                      <Input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, "video_url")}
                        disabled={uploading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl shrink-0 gap-1.5"
                        asChild
                      >
                        <span>
                          <Upload className="h-4 w-4" /> {uploading ? "..." : "Upload Video"}
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="poster_url" className="text-xs font-semibold text-foreground">
                    {form.media_type === "video"
                      ? "Video Poster / Thumbnail URL"
                      : "Hero Image URL"}
                  </Label>
                  {form.poster_url && (
                    <button
                      type="button"
                      onClick={() => handleFieldChange("poster_url", "")}
                      className="text-[11px] text-destructive hover:underline"
                    >
                      Remove poster image
                    </button>
                  )}
                </div>
                <div className="mt-1.5 flex gap-2">
                  <Input
                    id="poster_url"
                    value={form.poster_url}
                    onChange={(e) => handleFieldChange("poster_url", e.target.value)}
                    placeholder="/images/hero-foods-spread.png or upload image"
                    className="rounded-xl font-mono text-xs"
                  />
                  <label className="cursor-pointer">
                    <Input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, "poster_url")}
                      disabled={uploading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl shrink-0 gap-1.5"
                      asChild
                    >
                      <span>
                        <Upload className="h-4 w-4" /> {uploading ? "..." : "Upload Image"}
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
            </div>

            {/* Content & Typography */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
              <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Hero Text & Branding Copy
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="badge_text" className="text-xs font-semibold text-foreground">
                    Pill Badge Text
                  </Label>
                  <Input
                    id="badge_text"
                    value={form.badge_text}
                    onChange={(e) => handleFieldChange("badge_text", e.target.value)}
                    className="mt-1.5 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <Label htmlFor="overlay_text" className="text-xs font-semibold text-foreground">
                    Video Live Tag
                  </Label>
                  <Input
                    id="overlay_text"
                    value={form.overlay_text || ""}
                    onChange={(e) => handleFieldChange("overlay_text", e.target.value)}
                    className="mt-1.5 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="headline_main" className="text-xs font-semibold text-foreground">
                    Headline (Main Line)
                  </Label>
                  <Input
                    id="headline_main"
                    value={form.headline_main}
                    onChange={(e) => handleFieldChange("headline_main", e.target.value)}
                    className="mt-1.5 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="headline_highlight"
                    className="text-xs font-semibold text-foreground"
                  >
                    Headline (Italic Highlight)
                  </Label>
                  <Input
                    id="headline_highlight"
                    value={form.headline_highlight}
                    onChange={(e) => handleFieldChange("headline_highlight", e.target.value)}
                    className="mt-1.5 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="subheading" className="text-xs font-semibold text-foreground">
                  Subheading Description
                </Label>
                <Textarea
                  id="subheading"
                  value={form.subheading}
                  onChange={(e) => handleFieldChange("subheading", e.target.value)}
                  rows={3}
                  className="mt-1.5 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Video Playback Settings */}
            {form.media_type === "video" && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
                <h3 className="font-display text-base font-bold text-foreground">
                  Playback Defaults
                </h3>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex items-center justify-between rounded-xl border border-border/80 p-3 bg-muted/30">
                    <Label htmlFor="autoplay" className="text-xs font-semibold cursor-pointer">
                      Autoplay Video
                    </Label>
                    <Switch
                      id="autoplay"
                      checked={form.autoplay}
                      onCheckedChange={(val) => handleFieldChange("autoplay", val)}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-border/80 p-3 bg-muted/30">
                    <Label htmlFor="muted" className="text-xs font-semibold cursor-pointer">
                      Start Muted
                    </Label>
                    <Switch
                      id="muted"
                      checked={form.muted}
                      onCheckedChange={(val) => handleFieldChange("muted", val)}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-border/80 p-3 bg-muted/30">
                    <Label htmlFor="loop" className="text-xs font-semibold cursor-pointer">
                      Loop Continuously
                    </Label>
                    <Switch
                      id="loop"
                      checked={form.loop}
                      onCheckedChange={(val) => handleFieldChange("loop", val)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Live Preview (Right Column) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="sticky top-24 rounded-2xl border border-border bg-card p-6 shadow-lg">
              <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
                <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" /> Live Interactive Preview
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                  Real-time
                </span>
              </div>

              {/* Preview Hero Player */}
              <div className="space-y-4">
                <HeroMedia settings={form} previewMode />

                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">Pro Tip:</p>
                  <p className="mt-0.5">
                    Clicking <strong className="text-foreground">Save Live Changes</strong> updates
                    the store home hero video immediately without requiring visitors to refresh.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
