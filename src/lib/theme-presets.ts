export type ThemeColorPreset =
  | "gold_amber"
  | "emerald_green"
  | "crimson_spice"
  | "sapphire_blue"
  | "terracotta"
  | "sunset_purple"
  | "charcoal_minimal"
  | "custom";

export type FontHeadingPreset =
  | "Outfit"
  | "Playfair Display"
  | "Plus Jakarta Sans"
  | "Cinzel"
  | "Bebas Neue"
  | "Poppins"
  | "Space Grotesk"
  | "Inter";

export type FontBodyPreset =
  | "Inter"
  | "Plus Jakarta Sans"
  | "DM Sans"
  | "Poppins"
  | "Roboto";

export type BorderRadiusPreset = "sharp" | "rounded" | "curved" | "pill";

export interface StorefrontThemeConfig {
  color_preset: ThemeColorPreset;
  primary_color: string;
  accent_color: string;
  font_heading: FontHeadingPreset;
  font_body: FontBodyPreset;
  border_radius: BorderRadiusPreset;
}

export const DEFAULT_THEME_CONFIG: StorefrontThemeConfig = {
  color_preset: "gold_amber",
  primary_color: "#f59e0b",
  accent_color: "#fbbf24",
  font_heading: "Outfit",
  font_body: "Inter",
  border_radius: "curved",
};

export interface ColorPresetItem {
  id: ThemeColorPreset;
  name: string;
  primary: string;
  accent: string;
  description: string;
  badge: string;
}

export const COLOR_PRESETS: ColorPresetItem[] = [
  {
    id: "gold_amber",
    name: "Barima Amber / Gold",
    primary: "#f59e0b",
    accent: "#fbbf24",
    description: "Authentic Ghanaian spice warmth, rich golden shimmer & fiery shito glow",
    badge: "Default Brand",
  },
  {
    id: "emerald_green",
    name: "Organic Emerald",
    primary: "#10b981",
    accent: "#34d399",
    description: "Farm-fresh ingredients, 100% natural herbs, and organic provisions",
    badge: "Fresh & Healthy",
  },
  {
    id: "crimson_spice",
    name: "Fiery Chili Pepper",
    primary: "#ef4444",
    accent: "#f87171",
    description: "Bold Ghanaian hot chili, high appetite appeal, vibrant and intense",
    badge: "Spicy & Bold",
  },
  {
    id: "sapphire_blue",
    name: "Royal Sapphire",
    primary: "#2563eb",
    accent: "#60a5fa",
    description: "Crisp modern trust, nationwide express logistics, premium corporate quality",
    badge: "Modern & Sleek",
  },
  {
    id: "terracotta",
    name: "Warm Terracotta",
    primary: "#ea580c",
    accent: "#f97316",
    description: "Traditional clay-pot cooking, roasted spices, artisanal heritage",
    badge: "Artisanal",
  },
  {
    id: "sunset_purple",
    name: "Royal Violet",
    primary: "#8b5cf6",
    accent: "#a78bfa",
    description: "High-end banquet luxury, celebration events, regal celebration",
    badge: "Luxury Catering",
  },
  {
    id: "charcoal_minimal",
    name: "Obsidian Minimal",
    primary: "#475569",
    accent: "#94a3b8",
    description: "Ultra-clean monochrome editorial, modern lifestyle & gourmet boutique",
    badge: "Minimalist",
  },
];

export interface FontOption {
  name: string;
  category: string;
  previewText: string;
}

export const HEADING_FONT_OPTIONS: FontOption[] = [
  { name: "Outfit", category: "Geometric Sans", previewText: "AUTHENTIC GHANAIAN TASTE" },
  { name: "Playfair Display", category: "Editorial Serif", previewText: "Artisanal Gourmet Flavors" },
  { name: "Plus Jakarta Sans", category: "Modern Grotesk", previewText: "FRESH ESSENTIALS DAILY" },
  { name: "Cinzel", category: "Regal Classical", previewText: "ROYAL HERITAGE FOODS" },
  { name: "Bebas Neue", category: "Punchy Display", previewText: "BARIMA BA EXPRESS" },
  { name: "Poppins", category: "Warm Rounded", previewText: "Delicious Meals for Everyone" },
  { name: "Space Grotesk", category: "Contemporary Urban", previewText: "PREMIUM PROVISIONS" },
  { name: "Inter", category: "Clean Neutral", previewText: "CRAFTED WITH PASSION" },
];

export const BODY_FONT_OPTIONS: FontOption[] = [
  { name: "Inter", category: "Modern UI", previewText: "Crafted with authentic ingredients." },
  { name: "Plus Jakarta Sans", category: "Crisp & Clean", previewText: "Every meal delivered fresh and hot." },
  { name: "DM Sans", category: "Friendly High-Readability", previewText: "Enjoy nationwide delivery across Ghana." },
  { name: "Poppins", category: "Warm Geometric", previewText: "Made with 100% natural, fresh spices." },
  { name: "Roboto", category: "Classic Neutral", previewText: "Reliable quality and fast customer support." },
];

export interface FontPairing {
  name: string;
  heading: FontHeadingPreset;
  body: FontBodyPreset;
  tagline: string;
}

export const FONT_PAIRINGS: FontPairing[] = [
  {
    name: "Modern Spice (Default)",
    heading: "Outfit",
    body: "Inter",
    tagline: "Bold contemporary aesthetic with maximum legibility",
  },
  {
    name: "Artisanal Heritage",
    heading: "Playfair Display",
    body: "Plus Jakarta Sans",
    tagline: "Sophisticated editorial luxury suited for gourmet provisions",
  },
  {
    name: "High-Energy Street Food",
    heading: "Bebas Neue",
    body: "DM Sans",
    tagline: "Tall, punchy headlines with friendly approachable body text",
  },
  {
    name: "Clean Contemporary",
    heading: "Plus Jakarta Sans",
    body: "Inter",
    tagline: "Modern European-African tech and clean storefront vibe",
  },
  {
    name: "Royal Celebration",
    heading: "Cinzel",
    body: "Poppins",
    tagline: "Majestic, banquet-style catering and high-end events",
  },
];

export const BORDER_RADIUS_OPTIONS: { id: BorderRadiusPreset; label: string; radius: string }[] = [
  { id: "sharp", label: "Sharp Modern (0px)", radius: "0px" },
  { id: "rounded", label: "Subtle Rounded (8px)", radius: "0.5rem" },
  { id: "curved", label: "Curved Soft (16px)", radius: "1rem" },
  { id: "pill", label: "Pill / Full Capsule", radius: "9999px" },
];

/**
 * Generate runtime dynamic CSS to override root variables, brand highlight colors,
 * typography families, and interactive button accents across customer storefront.
 */
export function generateStorefrontThemeCss(themeConfig?: Partial<StorefrontThemeConfig>): string {
  const theme: StorefrontThemeConfig = {
    ...DEFAULT_THEME_CONFIG,
    ...(themeConfig || {}),
  };

  const primary = theme.primary_color || "#f59e0b";
  const accent = theme.accent_color || "#fbbf24";
  const fontHeading = theme.font_heading || "Outfit";
  const fontBody = theme.font_body || "Inter";

  let radiusCss = "0.75rem";
  if (theme.border_radius === "sharp") radiusCss = "0px";
  else if (theme.border_radius === "rounded") radiusCss = "0.5rem";
  else if (theme.border_radius === "curved") radiusCss = "1.25rem";
  else if (theme.border_radius === "pill") radiusCss = "9999px";

  return `
    :root {
      --font-display: "${fontHeading}", ui-sans-serif, system-ui, sans-serif !important;
      --font-sans: "${fontBody}", ui-sans-serif, system-ui, sans-serif !important;
      --theme-primary: ${primary} !important;
      --theme-accent: ${accent} !important;
      --radius: ${radiusCss} !important;
    }

    .font-display {
      font-family: var(--font-display) !important;
    }

    body {
      font-family: var(--font-sans) !important;
    }

    /* Dynamic Brand Color mapping for active storefront theme */
    .text-amber-400,
    .text-amber-500,
    .text-amber-600 {
      color: var(--theme-primary) !important;
    }

    .border-amber-400,
    .border-amber-500,
    .border-amber-500\\/20,
    .border-amber-500\\/30,
    .border-amber-500\\/40 {
      border-color: var(--theme-primary) !important;
    }

    .bg-amber-400,
    .bg-amber-500,
    .bg-amber-600 {
      background-color: var(--theme-primary) !important;
    }

    .bg-amber-500\\/10,
    .bg-amber-500\\/15,
    .bg-amber-500\\/20 {
      background-color: color-mix(in srgb, var(--theme-primary) 15%, transparent) !important;
    }

    .from-amber-500,
    .from-amber-600 {
      --tw-gradient-from: var(--theme-primary) !important;
    }

    .via-amber-400,
    .via-amber-500 {
      --tw-gradient-via: var(--theme-accent) !important;
    }

    .to-amber-500,
    .to-amber-600 {
      --tw-gradient-to: var(--theme-primary) !important;
    }

    .shadow-amber-500\\/20,
    .shadow-amber-500\\/30 {
      box-shadow: 0 10px 25px -5px color-mix(in srgb, var(--theme-primary) 25%, transparent) !important;
    }

    ::selection {
      background-color: var(--theme-primary) !important;
      color: #000000 !important;
    }
  `;
}
