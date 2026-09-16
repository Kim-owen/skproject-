import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  getStorefrontConfig,
  updateStorefrontConfig,
  listCategoriesWithCounts,
} from "@/lib/storefront.functions";
import { listAdminProducts } from "@/lib/admin.functions";
import { AdminShell } from "@/components/shop/AdminShell";
import { useAdminGuard } from "@/lib/useAdminGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_STOREFRONT_CONFIG,
  normalizeStorefrontConfig,
  type StorefrontConfig,
  type SectionId,
  type ThemeColorPreset,
  type FontHeadingPreset,
  type FontBodyPreset,
  type BorderRadiusPreset,
  COLOR_PRESETS,
  HEADING_FONT_OPTIONS,
  BODY_FONT_OPTIONS,
  FONT_PAIRINGS,
  BORDER_RADIUS_OPTIONS,
  generateStorefrontThemeCss,
} from "@/lib/storefront.types";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import {
  LayoutTemplate,
  Save,
  RotateCcw,
  Eye,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Sparkles,
  Flame,
  Shield,
  Leaf,
  Truck,
  Heart,
  Award,
  CheckCircle2,
  Phone,
  Utensils,
  ExternalLink,
  Layers,
  Film,
  ShoppingBag,
  Sliders,
  Smartphone,
  Monitor,
  Palette,
  Type,
  Check,
  Upload,
} from "lucide-react";

export const Route = createFileRoute("/portal/storefront")({
  head: () => ({
    meta: [
      { title: "Admin — Storefront Builder & CMS | Barima Ba Foods" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StorefrontBuilderPage,
});

const SECTION_LABELS: Record<SectionId, { label: string; desc: string }> = {
  announcement: {
    label: "Top Announcement Bar",
    desc: "Header notification ticker for alerts, promos & delivery deals",
  },
  hero: {
    label: "Hero Showcase",
    desc: "Main video/image backdrop, brand headline, and primary buttons",
  },
  trust_ribbon: {
    label: "Trust Badges Ribbon",
    desc: "5-item horizontal trust badges (100% natural, fresh, nationwide)",
  },
  categories: {
    label: "Categories Showcase",
    desc: "Interactive category shortcuts for quick customer shopping",
  },
  featured_products: {
    label: "Featured Products",
    desc: "Automated product showcase carousel or catalog grid",
  },
  promotional_banner: {
    label: "Catering & Promo Banner",
    desc: "Highlight catering services, weddings, events & multi-photo collage",
  },
  value_props: {
    label: "Value Proposition Grid",
    desc: "4 core brand pillars and customer reassurance points",
  },
  contact_delivery: {
    label: "Direct Contact Bar",
    desc: "Bottom high-impact nationwide delivery and WhatsApp CTA",
  },
};

function StorefrontBuilderPage() {
  const guard = useAdminGuard();
  const queryClient = useQueryClient();
  const fetchConfig = useServerFn(getStorefrontConfig);
  const saveConfig = useServerFn(updateStorefrontConfig);
  const fetchCategories = useServerFn(listCategoriesWithCounts);
  const fetchProducts = useServerFn(listAdminProducts);

  const [config, setConfig] = useState<StorefrontConfig>(() =>
    normalizeStorefrontConfig(DEFAULT_STOREFRONT_CONFIG),
  );
  const [activeTab, setActiveTab] = useState<string>("sections");
  const [showPreview, setShowPreview] = useState<boolean>(true);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [isDirty, setIsDirty] = useState<boolean>(false);

  const { data: serverConfig, isLoading } = useQuery({
    queryKey: ["storefront-config"],
    queryFn: () => fetchConfig(),
    enabled: guard === "ok",
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => fetchCategories(),
    enabled: guard === "ok",
  });

  const { data: productsData } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => fetchProducts(),
    enabled: guard === "ok",
  });
  const products = productsData?.products ?? [];

  useEffect(() => {
    if (serverConfig) {
      setConfig(normalizeStorefrontConfig(serverConfig));
    }
  }, [serverConfig]);

  const saveMutation = useMutation({
    mutationFn: async (updated: StorefrontConfig) => {
      return saveConfig({ data: updated });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storefront-config"] });
      queryClient.invalidateQueries({ queryKey: ["hero-settings"] });
      setIsDirty(false);
      toast.success("Storefront layout & content published successfully! 🎉");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save storefront configuration");
    },
  });

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const moveSectionIndex = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    const newOrder = [...config.section_order];
    const [moved] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, moved);

    setConfig((prev) => ({ ...prev, section_order: newOrder }));
    setIsDirty(true);
    const movedMeta = SECTION_LABELS[moved];
    toast.success(`Moved "${movedMeta?.label || moved}" to position #${toIndex + 1}`);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `${index}`);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    // Intentionally no-op to prevent flicker
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const rawData = e.dataTransfer.getData("text/plain");
    const sourceIndex = draggedIndex ?? (rawData ? parseInt(rawData, 10) : null);
    if (sourceIndex !== null && !isNaN(sourceIndex)) {
      moveSectionIndex(sourceIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const applyPresetOrder = (preset: "default" | "products_first" | "minimal") => {
    let newOrder: SectionId[] = [];
    if (preset === "default") {
      newOrder = [
        "announcement",
        "hero",
        "trust_ribbon",
        "categories",
        "featured_products",
        "promotional_banner",
        "value_props",
        "contact_delivery",
      ];
    } else if (preset === "products_first") {
      newOrder = [
        "announcement",
        "featured_products",
        "categories",
        "hero",
        "promotional_banner",
        "trust_ribbon",
        "value_props",
        "contact_delivery",
      ];
    } else if (preset === "minimal") {
      newOrder = [
        "hero",
        "featured_products",
        "categories",
        "contact_delivery",
        "announcement",
        "trust_ribbon",
        "promotional_banner",
        "value_props",
      ];
    }
    setConfig((prev) => ({ ...prev, section_order: newOrder }));
    setIsDirty(true);
    toast.success(`Applied ${preset.replace("_", " ")} layout order`);
  };

  const updateSectionOrder = (index: number, direction: "up" | "down") => {
    const newOrder = [...config.section_order];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;

    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);

    setConfig((prev) => ({ ...prev, section_order: newOrder }));
    setIsDirty(true);
  };

  const toggleSectionEnabled = (sectionId: SectionId, enabled: boolean) => {
    setConfig((prev) => ({
      ...prev,
      [sectionId]: {
        ...(prev[sectionId] as any),
        enabled,
      },
    }));
    setIsDirty(true);
  };

  const handleResetToDefaults = () => {
    if (window.confirm("Are you sure you want to reset all storefront settings to brand defaults?")) {
      setConfig(DEFAULT_STOREFRONT_CONFIG);
      setIsDirty(true);
      toast.info("Reset to brand defaults. Click 'Save & Publish' to make it live.");
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
      <div className="space-y-6 max-w-7xl mx-auto pb-24">
        {/* Top Header & Publishing Controls */}
        <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card/90 p-4 backdrop-blur-xl shadow-lg">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-500 mb-1">
              <LayoutTemplate className="h-3.5 w-3.5" />
              <span>STOREFRONT CMS BUILDER</span>
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Plug & Play Storefront Builder
            </h1>
            <p className="text-xs text-muted-foreground">
              Toggle sections, rearrange layout order, and edit frontend content with instant live preview.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="rounded-xl border-border"
            >
              <Eye className="mr-1.5 h-4 w-4 text-amber-500" />
              {showPreview ? "Hide Preview" : "Show Live Preview"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleResetToDefaults}
              className="rounded-xl border-border hover:text-amber-500"
            >
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Reset Defaults
            </Button>

            <Button
              size="sm"
              onClick={() => saveMutation.mutate(config)}
              disabled={saveMutation.isPending}
              className="rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold shadow-md shadow-amber-500/20"
            >
              <Save className="mr-1.5 h-4 w-4" />
              {saveMutation.isPending ? "Publishing..." : isDirty ? "Publish Changes *" : "Published"}
            </Button>

            <Button asChild size="sm" variant="ghost" className="rounded-xl">
              <Link to="/" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Main Grid: Builder Tabs on Left, Live Device Preview on Right */}
        <div className={`grid gap-6 ${showPreview ? "lg:grid-cols-12" : "grid-cols-1"}`}>
          {/* Left / Main Configuration Column */}
          <div className={showPreview ? "lg:col-span-7 space-y-6" : "space-y-6"}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-3 sm:grid-cols-6 gap-1 rounded-2xl bg-muted/50 p-1.5 border border-border">
                <TabsTrigger value="theme" className="rounded-xl text-xs font-bold flex items-center justify-center gap-1 text-amber-500">
                  <Palette className="h-3.5 w-3.5" />
                  <span>Theme & Fonts</span>
                </TabsTrigger>
                <TabsTrigger value="sections" className="rounded-xl text-xs font-bold">
                  Layout & Order
                </TabsTrigger>
                <TabsTrigger value="hero" className="rounded-xl text-xs font-bold">
                  Hero & Alerts
                </TabsTrigger>
                <TabsTrigger value="catalog" className="rounded-xl text-xs font-bold">
                  Products & Cats
                </TabsTrigger>
                <TabsTrigger value="promo" className="rounded-xl text-xs font-bold">
                  Catering Banner
                </TabsTrigger>
                <TabsTrigger value="trust" className="rounded-xl text-xs font-bold hidden sm:block">
                  Trust & Contact
                </TabsTrigger>
              </TabsList>

              {/* TAB 0: THEME, COLORS & FONTS CUSTOMIZER */}
              <TabsContent value="theme" className="space-y-5 pt-4">
                {/* 1. Brand Color Palettes */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                          <Palette className="h-3 w-3" />
                          BRAND PALETTES
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          7 Curated Themes + Custom Hex
                        </span>
                      </div>
                      <h3 className="font-display text-base font-bold text-foreground">
                        Storefront Color Palette & Brand Accent
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Select a curated color palette or pick custom hex colors. Buttons, badges, and accents will update across the live preview.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3 py-1.5">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase">Current:</span>
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-white/20 shadow-xs"
                          style={{ backgroundColor: config.theme?.primary_color || "#f59e0b" }}
                        />
                        <span className="font-mono text-xs font-bold">
                          {config.theme?.primary_color || "#f59e0b"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Preset Swatches Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {COLOR_PRESETS.map((preset) => {
                      const isSelected =
                        config.theme?.color_preset === preset.id ||
                        (!config.theme?.color_preset && preset.id === "gold_amber");

                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setConfig((p) => ({
                              ...p,
                              theme: {
                                ...p.theme,
                                color_preset: preset.id,
                                primary_color: preset.primary,
                                accent_color: preset.accent,
                              },
                            }));
                            setIsDirty(true);
                            toast.success(`Switched brand color to ${preset.name}`);
                          }}
                          className={`flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all relative ${
                            isSelected
                              ? "border-amber-500 bg-amber-500/10 shadow-md ring-2 ring-amber-500/40"
                              : "border-border bg-card/60 hover:border-border/80 hover:bg-muted/30"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full mb-2">
                            <div className="flex items-center gap-2">
                              {/* Swatch dots */}
                              <div className="flex -space-x-1.5">
                                <span
                                  className="h-6 w-6 rounded-full border-2 border-background shadow-xs shrink-0"
                                  style={{ backgroundColor: preset.primary }}
                                />
                                <span
                                  className="h-6 w-6 rounded-full border-2 border-background shadow-xs shrink-0"
                                  style={{ backgroundColor: preset.accent }}
                                />
                              </div>
                              <span className="font-display text-xs font-bold text-foreground">
                                {preset.name}
                              </span>
                            </div>
                            {isSelected ? (
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-black">
                                <Check className="h-3 w-3 stroke-[3]" />
                              </span>
                            ) : (
                              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                                {preset.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {preset.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Hex Color Picker */}
                  <div className="rounded-xl border border-border bg-muted/25 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sliders className="h-4 w-4 text-amber-500" />
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                          Custom Hex Code Fine-Tuning
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setConfig((p) => ({
                            ...p,
                            theme: {
                              ...p.theme,
                              color_preset: "gold_amber",
                              primary_color: "#f59e0b",
                              accent_color: "#fbbf24",
                            },
                          }));
                          setIsDirty(true);
                          toast.success("Reset colors to Barima Ba Gold default");
                        }}
                        className="h-7 text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        Reset to Gold Default
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Primary Brand Color */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center justify-between">
                          <span>Primary Brand Color (Buttons & Highlights)</span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {config.theme?.primary_color}
                          </span>
                        </Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={config.theme?.primary_color || "#f59e0b"}
                            onChange={(e) => {
                              setConfig((p) => ({
                                ...p,
                                theme: {
                                  ...p.theme,
                                  color_preset: "custom",
                                  primary_color: e.target.value,
                                },
                              }));
                              setIsDirty(true);
                            }}
                            className="h-10 w-12 rounded-xl border border-border bg-transparent p-1 cursor-pointer"
                          />
                          <Input
                            value={config.theme?.primary_color || "#f59e0b"}
                            onChange={(e) => {
                              setConfig((p) => ({
                                ...p,
                                theme: {
                                  ...p.theme,
                                  color_preset: "custom",
                                  primary_color: e.target.value,
                                },
                              }));
                              setIsDirty(true);
                            }}
                            placeholder="#f59e0b"
                            className="rounded-xl font-mono text-xs"
                          />
                        </div>
                      </div>

                      {/* Accent / Gradient Glow Color */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center justify-between">
                          <span>Accent Highlight Color (Gradients & Badges)</span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {config.theme?.accent_color}
                          </span>
                        </Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={config.theme?.accent_color || "#fbbf24"}
                            onChange={(e) => {
                              setConfig((p) => ({
                                ...p,
                                theme: {
                                  ...p.theme,
                                  color_preset: "custom",
                                  accent_color: e.target.value,
                                },
                              }));
                              setIsDirty(true);
                            }}
                            className="h-10 w-12 rounded-xl border border-border bg-transparent p-1 cursor-pointer"
                          />
                          <Input
                            value={config.theme?.accent_color || "#fbbf24"}
                            onChange={(e) => {
                              setConfig((p) => ({
                                ...p,
                                theme: {
                                  ...p.theme,
                                  color_preset: "custom",
                                  accent_color: e.target.value,
                                },
                              }));
                              setIsDirty(true);
                            }}
                            placeholder="#fbbf24"
                            className="rounded-xl font-mono text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Typography & Fonts Section */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                          <Type className="h-3 w-3" />
                          TYPOGRAPHY STUDIO
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Curated Google Fonts + Instant Previews
                        </span>
                      </div>
                      <h3 className="font-display text-base font-bold text-foreground">
                        Heading & Body Typography
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Choose display fonts for impact headlines and readable body fonts for product details and reviews.
                      </p>
                    </div>
                  </div>

                  {/* 1-Click Font Pairings */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">
                      Curated 1-Click Typography Pairings
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {FONT_PAIRINGS.map((pairing) => {
                        const isSelected =
                          config.theme?.font_heading === pairing.heading &&
                          config.theme?.font_body === pairing.body;

                        return (
                          <button
                            key={pairing.name}
                            type="button"
                            onClick={() => {
                              setConfig((p) => ({
                                ...p,
                                theme: {
                                  ...p.theme,
                                  font_heading: pairing.heading,
                                  font_body: pairing.body,
                                },
                              }));
                              setIsDirty(true);
                              toast.success(`Applied "${pairing.name}" font pairing`);
                            }}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              isSelected
                                ? "border-amber-500 bg-amber-500/10 shadow-sm ring-1 ring-amber-500"
                                : "border-border bg-muted/20 hover:bg-muted/40"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-foreground">
                                {pairing.name}
                              </span>
                              {isSelected && <Check className="h-3.5 w-3.5 text-amber-500" />}
                            </div>
                            <div className="text-[11px] text-amber-500/90 font-medium">
                              {pairing.heading} + {pairing.body}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-1">
                              {pairing.tagline}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Manual Font Selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-border/60">
                    {/* Heading Font */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center justify-between">
                        <span>Display Headline Font</span>
                        <span className="text-[10px] font-bold text-amber-500">
                          {config.theme?.font_heading}
                        </span>
                      </Label>
                      <Select
                        value={config.theme?.font_heading || "Outfit"}
                        onValueChange={(v) => {
                          setConfig((p) => ({
                            ...p,
                            theme: {
                              ...p.theme,
                              font_heading: v as FontHeadingPreset,
                            },
                          }));
                          setIsDirty(true);
                          toast.success(`Headline font updated to ${v}`);
                        }}
                      >
                        <SelectTrigger className="rounded-xl h-11">
                          <SelectValue placeholder="Select Headline Font" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl max-h-72">
                          {HEADING_FONT_OPTIONS.map((f) => (
                            <SelectItem key={f.name} value={f.name} className="py-2.5">
                              <div className="flex flex-col gap-0.5 text-left">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-xs font-bold">{f.name}</span>
                                  <span className="text-[10px] text-muted-foreground uppercase">{f.category}</span>
                                </div>
                                <span
                                  className="text-sm text-foreground/90 truncate tracking-wide"
                                  style={{ fontFamily: f.name }}
                                >
                                  {f.previewText}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Live Heading Typography Card */}
                      <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                          Headline Live Sample
                        </span>
                        <h4
                          className="text-xl font-extrabold text-foreground tracking-tight"
                          style={{ fontFamily: config.theme?.font_heading || "Outfit" }}
                        >
                          FLAVORFUL. FRESH. CRAFTED FOR YOU.
                        </h4>
                      </div>
                    </div>

                    {/* Body Font */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center justify-between">
                        <span>Body & Paragraph Font</span>
                        <span className="text-[10px] font-bold text-amber-500">
                          {config.theme?.font_body}
                        </span>
                      </Label>
                      <Select
                        value={config.theme?.font_body || "Inter"}
                        onValueChange={(v) => {
                          setConfig((p) => ({
                            ...p,
                            theme: {
                              ...p.theme,
                              font_body: v as FontBodyPreset,
                            },
                          }));
                          setIsDirty(true);
                          toast.success(`Body font updated to ${v}`);
                        }}
                      >
                        <SelectTrigger className="rounded-xl h-11">
                          <SelectValue placeholder="Select Body Font" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl max-h-72">
                          {BODY_FONT_OPTIONS.map((f) => (
                            <SelectItem key={f.name} value={f.name} className="py-2.5">
                              <div className="flex flex-col gap-0.5 text-left">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-xs font-bold">{f.name}</span>
                                  <span className="text-[10px] text-muted-foreground uppercase">{f.category}</span>
                                </div>
                                <span
                                  className="text-xs text-foreground/80 truncate"
                                  style={{ fontFamily: f.name }}
                                >
                                  {f.previewText}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Live Body Typography Card */}
                      <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                          Body Text Live Sample
                        </span>
                        <p
                          className="text-xs text-muted-foreground leading-relaxed"
                          style={{ fontFamily: config.theme?.font_body || "Inter" }}
                        >
                          Premium quality homemade Ghanaian foods made with passion, rich in flavor and crafted for your satisfaction. Nationwide express delivery across Ghana.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Button & Container Curvature */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
                  <div className="border-b border-border pb-3">
                    <h3 className="font-display text-sm font-bold text-foreground">
                      Button & Card Border Radius
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Controls how sharp or curved buttons, badges, and cards feel on the storefront.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {BORDER_RADIUS_OPTIONS.map((opt) => {
                      const isSelected =
                        config.theme?.border_radius === opt.id ||
                        (!config.theme?.border_radius && opt.id === "curved");

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setConfig((p) => ({
                              ...p,
                              theme: { ...p.theme, border_radius: opt.id },
                            }));
                            setIsDirty(true);
                          }}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                            isSelected
                              ? "border-amber-500 bg-amber-500/10 shadow-sm ring-1 ring-amber-500"
                              : "border-border bg-muted/20 hover:bg-muted/40"
                          }`}
                        >
                          <div
                            className="h-8 w-20 border border-amber-500/50 bg-amber-500/20 text-[10px] font-bold text-amber-400 flex items-center justify-center mb-2"
                            style={{ borderRadius: opt.radius }}
                          >
                            Button
                          </div>
                          <span className="text-xs font-bold text-foreground">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>

              {/* TAB 1: SECTION SWITCHBOARD & REORDER */}
              <TabsContent value="sections" className="space-y-4 pt-4">
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                          <GripVertical className="h-3 w-3" />
                          DRAG & DROP BUILDER
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {config.section_order.length} Sections Available
                        </span>
                      </div>
                      <h3 className="font-display text-base font-bold text-foreground">
                        Homepage Layout Order & Switchboard
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Grab any section's grip handle (⋮⋮) to drag and drop it into place, or use the Up/Down arrows. Live preview updates immediately.
                      </p>
                    </div>

                    {/* Quick Layout Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground mr-1">
                        Presets:
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyPresetOrder("default")}
                        className="rounded-xl text-[11px] h-7 px-2.5 border-border hover:border-amber-500/40"
                      >
                        Default Flow
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyPresetOrder("products_first")}
                        className="rounded-xl text-[11px] h-7 px-2.5 border-border hover:border-amber-500/40"
                      >
                        Products First
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyPresetOrder("minimal")}
                        className="rounded-xl text-[11px] h-7 px-2.5 border-border hover:border-amber-500/40"
                      >
                        Minimal Brand
                      </Button>
                    </div>
                  </div>

                  {/* Drag & Drop Reorderable List */}
                  <div className="space-y-2.5">
                    {config.section_order.map((sectionId, idx) => {
                      const meta = SECTION_LABELS[sectionId];
                      const isEnabled = (config[sectionId] as any)?.enabled ?? true;
                      const isDragging = draggedIndex === idx;
                      const isDragOver = dragOverIndex === idx && draggedIndex !== idx;

                      return (
                        <div
                          key={sectionId}
                          draggable
                          onDragStart={(e) => handleDragStart(e, idx)}
                          onDragOver={(e) => handleDragOver(e, idx)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, idx)}
                          onDragEnd={handleDragEnd}
                          className={`flex items-center justify-between rounded-xl border p-3.5 transition-all duration-200 cursor-grab active:cursor-grabbing select-none ${
                            isDragging
                              ? "opacity-30 border-dashed border-amber-500 bg-amber-500/10 scale-98 shadow-inner ring-2 ring-amber-500"
                              : isDragOver
                              ? "border-amber-400 bg-amber-500/20 shadow-xl ring-2 ring-amber-400 -translate-y-1 scale-101"
                              : isEnabled
                              ? "border-border bg-background/90 shadow-xs hover:border-amber-500/40 hover:bg-card"
                              : "border-border/40 bg-muted/20 opacity-60"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Drag Handle */}
                            <div
                              className="flex items-center justify-center p-1 rounded-lg text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                              title="Click and drag to rearrange"
                            >
                              <GripVertical className="h-4 w-4" />
                            </div>

                            {/* Position Badge */}
                            <span
                              className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-mono font-extrabold shadow-xs transition-colors ${
                                isDragOver
                                  ? "bg-amber-500 text-black ring-2 ring-amber-400"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {idx + 1}
                            </span>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-foreground">
                                  {meta.label}
                                </span>
                                <span
                                  className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full ${
                                    isEnabled
                                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                      : "bg-zinc-500/15 text-zinc-400 border border-zinc-500/30"
                                  }`}
                                >
                                  {isEnabled ? "Active" : "Disabled"}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-1">{meta.desc}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Reorder Up/Down arrows for keyboard & mobile accessibility */}
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={idx === 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateSectionOrder(idx, "up");
                                }}
                                className="h-8 w-8 p-0 rounded-lg hover:bg-muted"
                                title="Move up"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={idx === config.section_order.length - 1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateSectionOrder(idx, "down");
                                }}
                                className="h-8 w-8 p-0 rounded-lg hover:bg-muted"
                                title="Move down"
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                            </div>

                            {/* Enable/Disable Switch */}
                            <div onClick={(e) => e.stopPropagation()}>
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={(checked) => toggleSectionEnabled(sectionId, checked)}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>

              {/* TAB 2: HERO & ANNOUNCEMENT BAR */}
              <TabsContent value="hero" className="space-y-6 pt-4">
                {/* Announcement Bar */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-base font-bold text-foreground">
                        Top Announcement Bar Ticker
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Displays high-visibility alert at the very top of the storefront.
                      </p>
                    </div>
                    <Switch
                      checked={config.announcement.enabled}
                      onCheckedChange={(enabled) => {
                        setConfig((p) => ({ ...p, announcement: { ...p.announcement, enabled } }));
                        setIsDirty(true);
                      }}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Badge Text</Label>
                      <Input
                        value={config.announcement.badge}
                        onChange={(e) => {
                          setConfig((p) => ({
                            ...p,
                            announcement: { ...p.announcement, badge: e.target.value },
                          }));
                          setIsDirty(true);
                        }}
                        placeholder="🔥 POPULAR"
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Target Link</Label>
                      <Input
                        value={config.announcement.link}
                        onChange={(e) => {
                          setConfig((p) => ({
                            ...p,
                            announcement: { ...p.announcement, link: e.target.value },
                          }));
                          setIsDirty(true);
                        }}
                        placeholder="/shop"
                        className="rounded-xl font-mono text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Announcement Message</Label>
                      <Input
                        value={config.announcement.text}
                        onChange={(e) => {
                          setConfig((p) => ({
                            ...p,
                            announcement: { ...p.announcement, text: e.target.value },
                          }));
                          setIsDirty(true);
                        }}
                        placeholder="e.g. Free same-day delivery on orders over GHS 200!"
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                {/* Hero Section */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-base font-bold text-foreground">
                        Hero Main Visual & Copy
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Configure the backdrop video/image, main headline, and action buttons.
                      </p>
                    </div>
                    <Switch
                      checked={config.hero.enabled}
                      onCheckedChange={(enabled) => {
                        setConfig((p) => ({ ...p, hero: { ...p.hero, enabled } }));
                        setIsDirty(true);
                      }}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Media Type</Label>
                      <Select
                        value={config.hero.media_type}
                        onValueChange={(val: "video" | "image") => {
                          setConfig((p) => ({ ...p, hero: { ...p.hero, media_type: val } }));
                          setIsDirty(true);
                        }}
                      >
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="video">Ambient Video (Auto-loop)</SelectItem>
                          <SelectItem value="image">Still Photography (Poster Image)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Hero Floating Badge</Label>
                      <Input
                        value={config.hero.badge_text}
                        onChange={(e) => {
                          setConfig((p) => ({ ...p, hero: { ...p.hero, badge_text: e.target.value } }));
                          setIsDirty(true);
                        }}
                        placeholder="Nationwide Express Delivery"
                        className="rounded-xl"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Video URL</Label>
                      <Input
                        value={config.hero.video_url}
                        onChange={(e) => {
                          setConfig((p) => ({ ...p, hero: { ...p.hero, video_url: e.target.value } }));
                          setIsDirty(true);
                        }}
                        placeholder="/videos/shito-animi.mp4"
                        className="rounded-xl font-mono text-xs"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Poster / Fallback Image URL</Label>
                      <Input
                        value={config.hero.poster_url}
                        onChange={(e) => {
                          setConfig((p) => ({ ...p, hero: { ...p.hero, poster_url: e.target.value } }));
                          setIsDirty(true);
                        }}
                        placeholder="/images/hero-foods-spread.png"
                        className="rounded-xl font-mono text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Main Headline</Label>
                      <Input
                        value={config.hero.headline_main}
                        onChange={(e) => {
                          setConfig((p) => ({ ...p, hero: { ...p.hero, headline_main: e.target.value } }));
                          setIsDirty(true);
                        }}
                        placeholder="BARIMA BA FOODS"
                        className="rounded-xl font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Italic Highlight Phrase</Label>
                      <Input
                        value={config.hero.headline_highlight}
                        onChange={(e) => {
                          setConfig((p) => ({ ...p, hero: { ...p.hero, headline_highlight: e.target.value } }));
                          setIsDirty(true);
                        }}
                        placeholder="Taste. Quality. Trust."
                        className="rounded-xl font-serif italic text-amber-500"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Subheading Description</Label>
                      <Textarea
                        value={config.hero.subheading}
                        onChange={(e) => {
                          setConfig((p) => ({ ...p, hero: { ...p.hero, subheading: e.target.value } }));
                          setIsDirty(true);
                        }}
                        rows={2}
                        className="rounded-xl text-sm"
                      />
                    </div>

                    {/* Primary Button */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Primary Button Text</Label>
                      <Input
                        value={config.hero.primary_button_text}
                        onChange={(e) => {
                          setConfig((p) => ({ ...p, hero: { ...p.hero, primary_button_text: e.target.value } }));
                          setIsDirty(true);
                        }}
                        placeholder="ORDER NOW"
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Primary Button Link</Label>
                      <Input
                        value={config.hero.primary_button_link}
                        onChange={(e) => {
                          setConfig((p) => ({ ...p, hero: { ...p.hero, primary_button_link: e.target.value } }));
                          setIsDirty(true);
                        }}
                        placeholder="/shop"
                        className="rounded-xl font-mono text-xs"
                      />
                    </div>

                    {/* Secondary Button */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Secondary Button Text</Label>
                      <Input
                        value={config.hero.secondary_button_text}
                        onChange={(e) => {
                          setConfig((p) => ({ ...p, hero: { ...p.hero, secondary_button_text: e.target.value } }));
                          setIsDirty(true);
                        }}
                        placeholder="CATERING SERVICES"
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Secondary Button Link</Label>
                      <Input
                        value={config.hero.secondary_button_link}
                        onChange={(e) => {
                          setConfig((p) => ({ ...p, hero: { ...p.hero, secondary_button_link: e.target.value } }));
                          setIsDirty(true);
                        }}
                        placeholder="/catering"
                        className="rounded-xl font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 3: PRODUCTS & CATEGORIES */}
              <TabsContent value="catalog" className="space-y-6 pt-4">
                {/* Categories Section Settings */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-base font-bold text-foreground">
                        Homepage Categories Showcase
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Show visual category buttons on the homepage for direct product browsing.
                      </p>
                    </div>
                    <Switch
                      checked={config.categories.enabled}
                      onCheckedChange={(enabled) => {
                        setConfig((p) => ({ ...p, categories: { ...p.categories, enabled } }));
                        setIsDirty(true);
                      }}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Section Badge</Label>
                      <Input
                        value={config.categories.badge}
                        onChange={(e) => {
                          setConfig((p) => ({ ...p, categories: { ...p.categories, badge: e.target.value } }));
                          setIsDirty(true);
                        }}
                        placeholder="QUICK SHOPPING"
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Section Title</Label>
                      <Input
                        value={config.categories.title}
                        onChange={(e) => {
                          setConfig((p) => ({ ...p, categories: { ...p.categories, title: e.target.value } }));
                          setIsDirty(true);
                        }}
                        placeholder="BROWSE BY CATEGORY"
                        className="rounded-xl font-bold"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Section Subtitle</Label>
                      <Input
                        value={config.categories.subtitle}
                        onChange={(e) => {
                          setConfig((p) => ({ ...p, categories: { ...p.categories, subtitle: e.target.value } }));
                          setIsDirty(true);
                        }}
                        placeholder="Discover fresh essentials and condiments..."
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-muted-foreground uppercase">
                        Select Categories to Display on Homepage
                      </span>
                      <Link to="/portal/categories" className="text-xs text-amber-500 font-bold hover:underline">
                        Manage Categories &rarr;
                      </Link>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat) => {
                        const isSelected =
                          config.categories.selected_category_ids.length === 0 ||
                          config.categories.selected_category_ids.includes(cat.id);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              const current = config.categories.selected_category_ids;
                              let updated: string[];
                              if (current.includes(cat.id)) {
                                updated = current.filter((id) => id !== cat.id);
                              } else {
                                updated = [...current, cat.id];
                              }
                              setConfig((p) => ({
                                ...p,
                                categories: { ...p.categories, selected_category_ids: updated },
                              }));
                              setIsDirty(true);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                              isSelected
                                ? "border-amber-500 bg-amber-500/15 text-amber-400"
                                : "border-border bg-muted/40 text-muted-foreground"
                            }`}
                          >
                            {cat.name} ({cat.products_count ?? 0})
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      Leave all highlighted to show all active store categories on the homepage.
                    </p>
                  </div>
                </div>

                {/* Featured Products Section Settings */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-base font-bold text-foreground">
                        Featured Products Section
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Control the showcase product carousel, headline titles, and presentation mode.
                      </p>
                    </div>
                    <Switch
                      checked={config.featured_products.enabled}
                      onCheckedChange={(enabled) => {
                        setConfig((p) => ({ ...p, featured_products: { ...p.featured_products, enabled } }));
                        setIsDirty(true);
                      }}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Badge Text</Label>
                      <Input
                        value={config.featured_products.badge}
                        onChange={(e) => {
                          setConfig((p) => ({
                            ...p,
                            featured_products: { ...p.featured_products, badge: e.target.value },
                          }));
                          setIsDirty(true);
                        }}
                        placeholder="Handcrafted Ghanaian Delicacies"
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Display Mode</Label>
                      <Select
                        value={config.featured_products.display_mode}
                        onValueChange={(val: "slideshow" | "grid") => {
                          setConfig((p) => ({
                            ...p,
                            featured_products: { ...p.featured_products, display_mode: val },
                          }));
                          setIsDirty(true);
                        }}
                      >
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="slideshow">Dynamic Auto-Slideshow Carousel</SelectItem>
                          <SelectItem value="grid">Responsive Product Grid (Cards)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Section Title</Label>
                      <Input
                        value={config.featured_products.title}
                        onChange={(e) => {
                          setConfig((p) => ({
                            ...p,
                            featured_products: { ...p.featured_products, title: e.target.value },
                          }));
                          setIsDirty(true);
                        }}
                        placeholder="FLAVORFUL. FRESH."
                        className="rounded-xl font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Title Italic Highlight</Label>
                      <Input
                        value={config.featured_products.title_highlight}
                        onChange={(e) => {
                          setConfig((p) => ({
                            ...p,
                            featured_products: { ...p.featured_products, title_highlight: e.target.value },
                          }));
                          setIsDirty(true);
                        }}
                        placeholder="MADE FOR YOU."
                        className="rounded-xl font-serif italic text-amber-500"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Section Subtitle</Label>
                      <Textarea
                        value={config.featured_products.subtitle}
                        onChange={(e) => {
                          setConfig((p) => ({
                            ...p,
                            featured_products: { ...p.featured_products, subtitle: e.target.value },
                          }));
                          setIsDirty(true);
                        }}
                        rows={2}
                        className="rounded-xl text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Products Selection</Label>
                      <Select
                        value={config.featured_products.selection_mode}
                        onValueChange={(val: "auto" | "manual") => {
                          setConfig((p) => ({
                            ...p,
                            featured_products: { ...p.featured_products, selection_mode: val },
                          }));
                          setIsDirty(true);
                        }}
                      >
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="auto">Auto (Latest Active Products)</SelectItem>
                          <SelectItem value="manual">Manual (Pick Specific Products)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Product Limit</Label>
                      <Input
                        type="number"
                        value={config.featured_products.limit}
                        onChange={(e) => {
                          setConfig((p) => ({
                            ...p,
                            featured_products: { ...p.featured_products, limit: parseInt(e.target.value) || 12 },
                          }));
                          setIsDirty(true);
                        }}
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Manual selection picker if manual mode */}
                  {config.featured_products.selection_mode === "manual" && (
                    <div className="pt-3 border-t border-border space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">
                        Select Spotlight Products ({config.featured_products.selected_product_ids.length} selected)
                      </Label>
                      <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-background border border-border">
                        {products.map((p) => {
                          const checked = config.featured_products.selected_product_ids.includes(p.id);
                          return (
                            <label
                              key={p.id}
                              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/50 cursor-pointer text-xs"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const current = config.featured_products.selected_product_ids;
                                  let updated: string[];
                                  if (e.target.checked) {
                                    updated = [...current, p.id];
                                  } else {
                                    updated = current.filter((id) => id !== p.id);
                                  }
                                  setConfig((prev) => ({
                                    ...prev,
                                    featured_products: {
                                      ...prev.featured_products,
                                      selected_product_ids: updated,
                                    },
                                  }));
                                  setIsDirty(true);
                                }}
                                className="rounded text-amber-500"
                              />
                              <span className="font-semibold text-foreground">{p.name}</span>
                              <span className="text-muted-foreground font-mono">GH₵ {p.price_ghs}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* TAB 4: CATERING & PROMO BANNER */}
              <TabsContent value="promo" className="space-y-6 pt-4">
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-base font-bold text-foreground">
                        Promotional / Catering Banner
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Highlight custom services, party orders, wedding catering, and photo collage.
                      </p>
                    </div>
                    <Switch
                      checked={config.promotional_banner.enabled}
                      onCheckedChange={(enabled) => {
                        setConfig((p) => ({ ...p, promotional_banner: { ...p.promotional_banner, enabled } }));
                        setIsDirty(true);
                      }}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Banner Badge</Label>
                      <Input
                        value={config.promotional_banner.badge}
                        onChange={(e) => {
                          setConfig((p) => ({
                            ...p,
                            promotional_banner: { ...p.promotional_banner, badge: e.target.value },
                          }));
                          setIsDirty(true);
                        }}
                        placeholder="OUR CATERING SERVICES"
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Headline Title</Label>
                      <Input
                        value={config.promotional_banner.title}
                        onChange={(e) => {
                          setConfig((p) => ({
                            ...p,
                            promotional_banner: { ...p.promotional_banner, title: e.target.value },
                          }));
                          setIsDirty(true);
                        }}
                        placeholder="DELICIOUS FOOD FOR EVERY OCCASION"
                        className="rounded-xl font-bold"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Description</Label>
                      <Textarea
                        value={config.promotional_banner.description}
                        onChange={(e) => {
                          setConfig((p) => ({
                            ...p,
                            promotional_banner: { ...p.promotional_banner, description: e.target.value },
                          }));
                          setIsDirty(true);
                        }}
                        rows={2}
                        className="rounded-xl text-sm"
                      />
                    </div>

                    {/* Bullet points */}
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">
                        Checklist Items (Comma-separated)
                      </Label>
                      <Input
                        value={config.promotional_banner.bullet_points.join(", ")}
                        onChange={(e) => {
                          const list = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                          setConfig((p) => ({
                            ...p,
                            promotional_banner: { ...p.promotional_banner, bullet_points: list },
                          }));
                          setIsDirty(true);
                        }}
                        placeholder="Weddings, Parties & Celebrations, Corporate Events"
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Button Text</Label>
                      <Input
                        value={config.promotional_banner.cta_text}
                        onChange={(e) => {
                          setConfig((p) => ({
                            ...p,
                            promotional_banner: { ...p.promotional_banner, cta_text: e.target.value },
                          }));
                          setIsDirty(true);
                        }}
                        placeholder="BOOK OUR CATERING"
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Button Link</Label>
                      <Input
                        value={config.promotional_banner.cta_link}
                        onChange={(e) => {
                          setConfig((p) => ({
                            ...p,
                            promotional_banner: { ...p.promotional_banner, cta_link: e.target.value },
                          }));
                          setIsDirty(true);
                        }}
                        placeholder="/catering"
                        className="rounded-xl font-mono text-xs"
                      />
                    </div>

                    {/* Collage Images */}
                    <div className="sm:col-span-2 space-y-3 pt-3 border-t border-border">
                      <div>
                        <Label className="text-xs font-bold text-muted-foreground uppercase">
                          Catering & Event Photo Collage (3 Images)
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Image #1 (Top Left), Image #2 (Top Right), Image #3 (Bottom Wide Platter)
                        </p>
                      </div>

                      {config.promotional_banner.images.map((img, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 rounded-xl border border-border bg-muted/20">
                          <span className="text-xs font-mono font-bold text-amber-500 w-8 shrink-0">
                            #{idx + 1}
                          </span>

                          {img && (
                            <img
                              src={img}
                              alt={`Collage #${idx + 1}`}
                              className="h-10 w-14 rounded-lg object-cover border border-border shrink-0"
                            />
                          )}

                          <Input
                            value={img}
                            onChange={(e) => {
                              const newImgs = [...config.promotional_banner.images];
                              newImgs[idx] = e.target.value;
                              setConfig((p) => ({
                                ...p,
                                promotional_banner: { ...p.promotional_banner, images: newImgs },
                              }));
                              setIsDirty(true);
                            }}
                            className="rounded-xl font-mono text-xs flex-1"
                            placeholder="Image URL or upload file..."
                          />

                          <label className="cursor-pointer shrink-0">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                  const fileExt = file.name.split(".").pop();
                                  const fileName = `promo_collage_${idx + 1}_${Date.now()}.${fileExt}`;
                                  const filePath = `promos/${fileName}`;
                                  const { error: uploadErr } = await supabase.storage
                                    .from("media")
                                    .upload(filePath, file, { upsert: true });
                                  if (uploadErr) throw uploadErr;

                                  const { data: publicUrlData } = supabase.storage
                                    .from("media")
                                    .getPublicUrl(filePath);

                                  const newImgs = [...config.promotional_banner.images];
                                  newImgs[idx] = publicUrlData.publicUrl;
                                  setConfig((p) => ({
                                    ...p,
                                    promotional_banner: { ...p.promotional_banner, images: newImgs },
                                  }));
                                  setIsDirty(true);
                                  toast.success(`Image #${idx + 1} uploaded! Click 'Save Storefront' top right to publish.`);
                                } catch (err: any) {
                                  toast.error("Upload failed: " + err.message);
                                }
                              }}
                            />
                            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold transition-all border border-primary/20">
                              <Upload className="h-3.5 w-3.5" /> Upload
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 5: TRUST RIBBON & CONTACT BAR */}
              <TabsContent value="trust" className="space-y-6 pt-4">
                {/* Trust Ribbon */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-base font-bold text-foreground">
                        5-Item Trust Badges Ribbon
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Reassure buyers immediately below the hero.
                      </p>
                    </div>
                    <Switch
                      checked={config.trust_ribbon.enabled}
                      onCheckedChange={(enabled) => {
                        setConfig((p) => ({ ...p, trust_ribbon: { ...p.trust_ribbon, enabled } }));
                        setIsDirty(true);
                      }}
                    />
                  </div>

                  <div className="space-y-3">
                    {config.trust_ribbon.items.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-3 gap-2 p-2.5 rounded-xl border border-border bg-background">
                        <Input
                          value={item.icon}
                          onChange={(e) => {
                            const items = [...config.trust_ribbon.items];
                            items[idx].icon = e.target.value;
                            setConfig((p) => ({ ...p, trust_ribbon: { ...p.trust_ribbon, items } }));
                            setIsDirty(true);
                          }}
                          placeholder="Icon (e.g. Leaf, Shield, Flame)"
                          className="rounded-lg text-xs"
                        />
                        <Input
                          value={item.title}
                          onChange={(e) => {
                            const items = [...config.trust_ribbon.items];
                            items[idx].title = e.target.value;
                            setConfig((p) => ({ ...p, trust_ribbon: { ...p.trust_ribbon, items } }));
                            setIsDirty(true);
                          }}
                          placeholder="Title"
                          className="rounded-lg text-xs font-bold"
                        />
                        <Input
                          value={item.desc}
                          onChange={(e) => {
                            const items = [...config.trust_ribbon.items];
                            items[idx].desc = e.target.value;
                            setConfig((p) => ({ ...p, trust_ribbon: { ...p.trust_ribbon, items } }));
                            setIsDirty(true);
                          }}
                          placeholder="Description"
                          className="rounded-lg text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Direct Contact & Delivery Bar */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-base font-bold text-foreground">
                        Bottom Delivery & Direct Contact Bar
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        High-contrast golden banner displaying direct phone and WhatsApp contact info.
                      </p>
                    </div>
                    <Switch
                      checked={config.contact_delivery?.enabled ?? true}
                      onCheckedChange={(enabled) => {
                        setConfig((p) => ({
                          ...p,
                          contact_delivery: { ...p.contact_delivery, enabled },
                        }));
                        setIsDirty(true);
                      }}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Banner Title</Label>
                      <Input
                        value={config.contact_delivery?.title || ""}
                        onChange={(e) => {
                          setConfig((p) => ({
                            ...p,
                            contact_delivery: { ...p.contact_delivery, title: e.target.value },
                          }));
                          setIsDirty(true);
                        }}
                        className="rounded-xl font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Subtitle</Label>
                      <Input
                        value={config.contact_delivery?.subtitle || ""}
                        onChange={(e) => {
                          setConfig((p) => ({
                            ...p,
                            contact_delivery: { ...p.contact_delivery, subtitle: e.target.value },
                          }));
                          setIsDirty(true);
                        }}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Phone Numbers Display</Label>
                      <Input
                        value={config.contact_delivery?.phones || ""}
                        onChange={(e) => {
                          setConfig((p) => ({
                            ...p,
                            contact_delivery: { ...p.contact_delivery, phones: e.target.value },
                          }));
                          setIsDirty(true);
                        }}
                        className="rounded-xl font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">WhatsApp Number (Digits only)</Label>
                      <Input
                        value={config.contact_delivery?.whatsapp_number || ""}
                        onChange={(e) => {
                          setConfig((p) => ({
                            ...p,
                            contact_delivery: { ...p.contact_delivery, whatsapp_number: e.target.value },
                          }));
                          setIsDirty(true);
                        }}
                        placeholder="233241234567"
                        className="rounded-xl font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column: Live Interactive Device Preview */}
          {showPreview && (
            <div className="lg:col-span-5">
              <div className="sticky top-28 space-y-3">
                {/* Device selector bar */}
                <div className="flex items-center justify-between px-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Live Interactive Preview
                  </span>
                  <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border">
                    <button
                      type="button"
                      onClick={() => setPreviewDevice("desktop")}
                      className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                        previewDevice === "desktop" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                      }`}
                      title="Desktop View"
                    >
                      <Monitor className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice("mobile")}
                      className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                        previewDevice === "mobile" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                      }`}
                      title="Mobile View"
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Device Frame */}
                <div
                  className={`mx-auto rounded-[2rem] border-4 border-zinc-800 bg-black overflow-hidden shadow-2xl transition-all duration-300 ${
                    previewDevice === "mobile" ? "w-85 h-170" : "w-full h-190"
                  }`}
                >
                  {/* Mock Browser / Phone Header */}
                  <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/80 text-[10px] text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-rose-500/80" />
                      <span className="h-2 w-2 rounded-full bg-amber-500/80" />
                      <span className="h-2 w-2 rounded-full bg-emerald-500/80" />
                    </div>
                    <span className="font-mono truncate max-w-40">barimabafoods.shop</span>
                    <span className="font-mono text-[9px]">LIVE PREVIEW</span>
                  </div>

                  {/* Scrollable Live Frontend Mock */}
                  <div className="h-[calc(100%-34px)] overflow-y-auto bg-background text-foreground scrollbar-thin">
                    <style dangerouslySetInnerHTML={{ __html: generateStorefrontThemeCss(config.theme) }} />
                    {/* Render sections according to configured section_order */}
                    {config.section_order.map((secId) => {
                      if (secId === "announcement" && config.announcement.enabled) {
                        return (
                          <div
                            key="announcement"
                            className="bg-linear-to-r from-amber-600 via-amber-500 to-amber-600 px-3 py-1.5 text-center text-black font-extrabold text-[10px] flex items-center justify-center gap-1.5"
                          >
                            <span className="bg-black text-amber-400 px-1.5 py-0.5 rounded text-[8px] uppercase">
                              {config.announcement.badge}
                            </span>
                            <span className="truncate">{config.announcement.text}</span>
                          </div>
                        );
                      }

                      if (secId === "hero" && config.hero.enabled) {
                        return (
                          <div
                            key="hero"
                            className="relative min-h-65 bg-black flex flex-col justify-between p-4 overflow-hidden border-b border-border"
                          >
                            <img
                              src={config.hero.poster_url || "/images/hero-foods-spread.png"}
                              alt="Hero backdrop"
                              className="absolute inset-0 h-full w-full object-cover opacity-40 scale-105"
                            />
                            <div className="relative z-10">
                              <span className="inline-block rounded-full bg-black/80 border border-amber-500/40 px-2 py-0.5 text-[8px] font-bold text-amber-400 uppercase">
                                {config.hero.badge_text}
                              </span>
                            </div>
                            <div className="relative z-10 my-auto py-2">
                              <h2 className="font-display text-lg sm:text-xl font-extrabold text-white leading-tight">
                                {config.hero.headline_main}
                                <span className="block font-serif italic text-amber-400">
                                  {config.hero.headline_highlight}
                                </span>
                              </h2>
                              <p className="text-[10px] text-zinc-300 mt-1 line-clamp-2">
                                {config.hero.subheading}
                              </p>
                              <div className="flex gap-2 mt-3">
                                <span className="px-3 py-1 rounded-lg bg-amber-500 text-black text-[10px] font-extrabold">
                                  {config.hero.primary_button_text}
                                </span>
                                <span className="px-3 py-1 rounded-lg border border-amber-500/40 text-amber-400 text-[10px] font-bold">
                                  {config.hero.secondary_button_text}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (secId === "trust_ribbon" && config.trust_ribbon.enabled) {
                        return (
                          <div key="trust_ribbon" className="p-2 border-b border-border bg-black/40">
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1 text-center">
                              {config.trust_ribbon.items.slice(0, 5).map((t, idx) => (
                                <div key={idx} className="p-1 rounded-lg bg-amber-500/5 border border-amber-500/10">
                                  <p className="text-[9px] font-extrabold text-amber-400 truncate">{t.title}</p>
                                  <p className="text-[8px] text-muted-foreground truncate">{t.desc}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      if (secId === "categories" && config.categories.enabled) {
                        return (
                          <div key="categories" className="p-3 border-b border-border space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-foreground">
                                {config.categories.title}
                              </span>
                              <span className="text-[9px] text-amber-500 font-bold">View all &rarr;</span>
                            </div>
                            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                              {categories.slice(0, 5).map((c) => (
                                <div
                                  key={c.id}
                                  className="shrink-0 px-2.5 py-1 rounded-lg border border-border bg-card text-[9px] font-bold text-foreground"
                                >
                                  {c.name}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      if (secId === "featured_products" && config.featured_products.enabled) {
                        return (
                          <div key="featured_products" className="p-3 border-b border-border space-y-2">
                            <div className="text-center">
                              <span className="text-[8px] uppercase font-bold text-amber-500">
                                {config.featured_products.badge}
                              </span>
                              <h4 className="text-xs font-extrabold text-foreground">
                                {config.featured_products.title}{" "}
                                <span className="font-serif italic text-amber-500">
                                  {config.featured_products.title_highlight}
                                </span>
                              </h4>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {products.slice(0, 4).map((p) => (
                                <div
                                  key={p.id}
                                  className="rounded-xl border border-border bg-card p-2 space-y-1"
                                >
                                  <div className="h-16 rounded-lg bg-muted overflow-hidden">
                                    {p.image_url ? (
                                      <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                                    ) : (
                                      <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground">
                                        No Image
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-[10px] font-bold truncate text-foreground">{p.name}</p>
                                  <p className="text-[9px] font-extrabold text-amber-500 font-mono">
                                    GH₵ {p.price_ghs}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      if (secId === "promotional_banner" && config.promotional_banner.enabled) {
                        return (
                          <div key="promotional_banner" className="p-3 border-b border-border">
                            <div className="rounded-2xl border border-amber-500/30 bg-black/70 p-3 text-white space-y-1.5">
                              <span className="text-[8px] font-bold text-amber-400 uppercase">
                                {config.promotional_banner.badge}
                              </span>
                              <h5 className="text-xs font-bold leading-tight">
                                {config.promotional_banner.title}
                              </h5>
                              <p className="text-[9px] text-zinc-300 line-clamp-2">
                                {config.promotional_banner.description}
                              </p>
                              <span className="inline-block mt-2 px-2.5 py-1 rounded-lg bg-amber-500 text-black text-[9px] font-extrabold">
                                {config.promotional_banner.cta_text}
                              </span>
                            </div>
                          </div>
                        );
                      }

                      if (secId === "value_props" && config.value_props.enabled) {
                        return (
                          <div key="value_props" className="p-2 border-b border-border">
                            <div className="grid grid-cols-2 gap-1 text-center">
                              {config.value_props.items.slice(0, 4).map((v, idx) => (
                                <div key={idx} className="p-1 rounded-lg bg-card border border-border">
                                  <p className="text-[9px] font-extrabold text-amber-400 truncate">{v.title}</p>
                                  <p className="text-[8px] text-muted-foreground truncate">{v.desc}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      if (secId === "contact_delivery" && config.contact_delivery?.enabled) {
                        return (
                          <div key="contact_delivery" className="p-3">
                            <div className="rounded-xl bg-linear-to-r from-amber-500 to-amber-400 p-2.5 text-black flex items-center justify-between">
                              <div>
                                <p className="text-[10px] font-extrabold">{config.contact_delivery?.title || ""}</p>
                                <p className="text-[8px] truncate">{config.contact_delivery?.subtitle || ""}</p>
                              </div>
                              <span className="bg-black text-amber-400 px-2 py-1 rounded-lg text-[9px] font-bold">
                                WhatsApp
                              </span>
                            </div>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
