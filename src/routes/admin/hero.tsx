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
} from "lucide-react";
import {
  getHeroSettings,
  updateHeroSettings,
  DEFAULT_HERO_SETTINGS,
  PRO_VIDEO_PRESETS,
  type HeroMediaSettings,
} from "@/lib/settings.functions";
import { HeroMedia } from "@/components/shop/HeroMedia";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/hero")({
  head: () => ({
    meta: [
      { title: "Admin — Hero Video & Media Settings" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminHeroSettings,
});

function AdminHeroSettings() {
  const guard = useAdminGuard();
  const queryClient = useQueryClient();

  const fetcher = useServerFn(getHeroSettings);
  const updater = useServerFn(updateHeroSettings);

  const { data: initialData, isLoading } = useQuery({
    queryKey: ["hero-settings"],
    queryFn: () => fetcher(),
    enabled: guard === "ok",
  });

  const [form, setForm] = useState<HeroMediaSettings>(DEFAULT_HERO_SETTINGS);
  const [uploading, setUploading] = useState<boolean>(false);

  useEffect(() => {
    if (initialData) {
      setForm(initialData);
    }
  }, [initialData]);

  const updateMutation = useMutation({
    mutationFn: (newSettings: HeroMediaSettings) => updater({ data: newSettings }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hero-settings"] });
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
      const fileExt = file.name.split(".").pop();
      const fileName = `hero_${field}_${Date.now()}.${fileExt}`;
      const filePath = `hero/${fileName}`;

      // Upload to supabase storage bucket 'public' or 'hero-media'
      const { error: uploadError } = await supabase.storage
        .from("hero-media")
        .upload(filePath, file, {
          upsert: true,
        });

      if (uploadError) {
        // Fallback: create object URL if storage bucket doesn't exist yet
        const localUrl = URL.createObjectURL(file);
        handleFieldChange(field, localUrl);
        toast.info("Media file selected locally", {
          description:
            "For permanent cloud hosting, ensure 'hero-media' bucket is configured in Supabase Storage.",
        });
      } else {
        const { data: publicUrlData } = supabase.storage.from("hero-media").getPublicUrl(filePath);
        handleFieldChange(field, publicUrlData.publicUrl);
        toast.success("File uploaded to Supabase Storage!");
      }
    } catch (err: any) {
      toast.error("Upload error: " + err.message);
    } finally {
      setUploading(false);
    }
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
                <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2 mb-1">
                  <Sparkles className="h-4 w-4 text-primary" /> Pro Video Presets
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Select a curated grocery/food video theme for instant application:
                </p>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {PRO_VIDEO_PRESETS.map((preset) => {
                    const isSelected = form.video_url === preset.video_url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          handleFieldChange("video_url", preset.video_url);
                          handleFieldChange("poster_url", preset.poster_url);
                        }}
                        className={`group relative overflow-hidden rounded-xl border text-left transition-all p-1.5 ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md"
                            : "border-border hover:border-primary/50 bg-card"
                        }`}
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
                    );
                  })}
                </div>
              </div>
            )}

            {/* Media URLs & Uploads */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
              <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                <Sliders className="h-4 w-4 text-primary" /> Media Assets & File Sources
              </h3>

              {form.media_type === "video" && (
                <div>
                  <Label htmlFor="video_url" className="text-xs font-semibold text-foreground">
                    Direct MP4 / Video Stream URL
                  </Label>
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
                          <Upload className="h-4 w-4" /> {uploading ? "..." : "Upload"}
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="poster_url" className="text-xs font-semibold text-foreground">
                  {form.media_type === "video" ? "Video Poster / Thumbnail URL" : "Hero Image URL"}
                </Label>
                <div className="mt-1.5 flex gap-2">
                  <Input
                    id="poster_url"
                    value={form.poster_url}
                    onChange={(e) => handleFieldChange("poster_url", e.target.value)}
                    placeholder="https://images.unsplash.com/..."
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
                        <Upload className="h-4 w-4" /> {uploading ? "..." : "Upload"}
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
