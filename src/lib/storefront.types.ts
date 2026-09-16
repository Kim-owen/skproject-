import { type StorefrontThemeConfig, DEFAULT_THEME_CONFIG } from "./theme-presets";
export {
  type StorefrontThemeConfig,
  type ThemeColorPreset,
  type FontHeadingPreset,
  type FontBodyPreset,
  type BorderRadiusPreset,
  COLOR_PRESETS,
  HEADING_FONT_OPTIONS,
  BODY_FONT_OPTIONS,
  FONT_PAIRINGS,
  BORDER_RADIUS_OPTIONS,
  DEFAULT_THEME_CONFIG,
  generateStorefrontThemeCss,
} from "./theme-presets";

export type SectionId =
  | "announcement"
  | "hero"
  | "trust_ribbon"
  | "categories"
  | "featured_products"
  | "promotional_banner"
  | "value_props"
  | "contact_delivery";

export interface AnnouncementBarConfig {
  enabled: boolean;
  text: string;
  badge: string;
  link: string;
}

export interface HeroSectionConfig {
  enabled: boolean;
  media_type: "video" | "image";
  video_url: string;
  poster_url: string;
  badge_text: string;
  headline_main: string;
  headline_highlight: string;
  subheading: string;
  primary_button_text: string;
  primary_button_link: string;
  secondary_button_text: string;
  secondary_button_link: string;
  autoplay: boolean;
  muted: boolean;
  loop: boolean;
}

export interface TrustRibbonItem {
  icon: string;
  title: string;
  desc: string;
}

export interface TrustRibbonConfig {
  enabled: boolean;
  items: TrustRibbonItem[];
}

export interface CategoriesSectionConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
  badge: string;
  selected_category_ids: string[]; // empty means show all active
  layout: "grid" | "carousel";
}

export interface FeaturedProductsConfig {
  enabled: boolean;
  badge: string;
  title: string;
  title_highlight: string;
  subtitle: string;
  display_mode: "slideshow" | "grid";
  selection_mode: "auto" | "manual";
  selected_product_ids: string[];
  limit: number;
}

export interface PromotionalBannerConfig {
  enabled: boolean;
  badge: string;
  title: string;
  description: string;
  bullet_points: string[];
  cta_text: string;
  cta_link: string;
  images: string[];
}

export interface ValuePropItem {
  icon: string;
  title: string;
  desc: string;
}

export interface ValuePropsConfig {
  enabled: boolean;
  items: ValuePropItem[];
}

export interface ContactDeliveryBarConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
  phones: string;
  whatsapp_number: string;
}

export interface StorefrontConfig {
  section_order: SectionId[];
  announcement: AnnouncementBarConfig;
  hero: HeroSectionConfig;
  trust_ribbon: TrustRibbonConfig;
  categories: CategoriesSectionConfig;
  featured_products: FeaturedProductsConfig;
  promotional_banner: PromotionalBannerConfig;
  value_props: ValuePropsConfig;
  contact_delivery: ContactDeliveryBarConfig;
  theme: StorefrontThemeConfig;
}

export const DEFAULT_STOREFRONT_CONFIG: StorefrontConfig = {
  theme: DEFAULT_THEME_CONFIG,
  section_order: [
    "announcement",
    "hero",
    "trust_ribbon",
    "categories",
    "featured_products",
    "promotional_banner",
    "value_props",
    "contact_delivery",
  ],
  announcement: {
    enabled: true,
    badge: "🔥 POPULAR",
    text: "Nationwide express delivery across Ghana — Authentic homemade shito & provisions!",
    link: "/shop",
  },
  hero: {
    enabled: true,
    media_type: "video",
    video_url: "",
    poster_url: "/images/hero-foods-spread.png",
    badge_text: "Nationwide Express Delivery Across Ghana",
    headline_main: "BARIMA BA FOODS",
    headline_highlight: "Taste. Quality. Trust.",
    subheading:
      "Premium quality homemade Ghanaian foods made with passion, rich in flavor and crafted for your satisfaction.",
    primary_button_text: "ORDER NOW",
    primary_button_link: "/shop",
    secondary_button_text: "CATERING SERVICES",
    secondary_button_link: "/catering",
    autoplay: true,
    muted: true,
    loop: true,
  },
  trust_ribbon: {
    enabled: true,
    items: [
      { icon: "Leaf", title: "100% NATURAL", desc: "No artificial preservatives" },
      { icon: "Shield", title: "PREMIUM QUALITY", desc: "Selected ingredients" },
      { icon: "Flame", title: "RICH IN FLAVOR", desc: "Authentic recipes" },
      { icon: "Truck", title: "NATIONWIDE DELIVERY", desc: "Fast across Ghana" },
      { icon: "Heart", title: "CUSTOMER SATISFACTION", desc: "Guaranteed satisfaction" },
    ],
  },
  categories: {
    enabled: true,
    badge: "QUICK SHOPPING",
    title: "BROWSE BY CATEGORY",
    subtitle: "Discover fresh essentials, premium condiments, and authentic Ghanaian treats.",
    selected_category_ids: [],
    layout: "grid",
  },
  featured_products: {
    enabled: true,
    badge: "Handcrafted Ghanaian Delicacies",
    title: "FLAVORFUL. FRESH.",
    title_highlight: "MADE FOR YOU.",
    subtitle:
      "Explore our range of authentic homemade products prepared with passion and premium ingredients across Ghana.",
    display_mode: "slideshow",
    selection_mode: "auto",
    selected_product_ids: [],
    limit: 12,
  },
  promotional_banner: {
    enabled: true,
    badge: "OUR CATERING SERVICES",
    title: "DELICIOUS FOOD FOR EVERY OCCASION",
    description:
      "From small gatherings to big events, we provide tasty, hygienic and beautifully presented meals that make your events unforgettable.",
    bullet_points: [
      "Weddings & Engagements",
      "Parties & Celebrations",
      "Corporate Dinners & Meetings",
      "Funerals & Community Gatherings",
    ],
    cta_text: "BOOK OUR CATERING",
    cta_link: "/catering",
    images: [
      "/images/spicy-african-bg.png",
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=600",
    ],
  },
  value_props: {
    enabled: true,
    items: [
      {
        icon: "Award",
        title: "EXPERTLY MADE",
        desc: "Prepared by culinary experts with authentic recipes.",
      },
      {
        icon: "Shield",
        title: "QUALITY INGREDIENTS",
        desc: "We use only the freshest, high-grade local ingredients.",
      },
      {
        icon: "Heart",
        title: "MADE WITH LOVE",
        desc: "Every jar and package is crafted with care and dedication.",
      },
      {
        icon: "CheckCircle2",
        title: "TRUSTED BY MANY",
        desc: "Loved by households and caterers across the country.",
      },
    ],
  },
  contact_delivery: {
    enabled: true,
    title: "NATIONWIDE DELIVERY ACROSS GHANA",
    subtitle: "We deliver straight to your doorstep in Accra, Kumasi, Takoradi & beyond.",
    phones: "+233 24 123 4567 | +233 50 123 4567",
    whatsapp_number: "233241234567",
  },
};

export function normalizeStorefrontConfig(input?: any): StorefrontConfig {
  if (!input || typeof input !== "object") {
    return DEFAULT_STOREFRONT_CONFIG;
  }
  return {
    section_order:
      Array.isArray(input.section_order) && input.section_order.length > 0
        ? input.section_order
        : DEFAULT_STOREFRONT_CONFIG.section_order,
    announcement: {
      ...DEFAULT_STOREFRONT_CONFIG.announcement,
      ...(input.announcement || {}),
    },
    hero: {
      ...DEFAULT_STOREFRONT_CONFIG.hero,
      ...(input.hero || {}),
    },
    trust_ribbon: {
      ...DEFAULT_STOREFRONT_CONFIG.trust_ribbon,
      ...(input.trust_ribbon || {}),
      items: Array.isArray(input.trust_ribbon?.items)
        ? input.trust_ribbon.items
        : DEFAULT_STOREFRONT_CONFIG.trust_ribbon.items,
    },
    categories: {
      ...DEFAULT_STOREFRONT_CONFIG.categories,
      ...(input.categories || {}),
      selected_category_ids: Array.isArray(input.categories?.selected_category_ids)
        ? input.categories.selected_category_ids
        : DEFAULT_STOREFRONT_CONFIG.categories.selected_category_ids,
    },
    featured_products: {
      ...DEFAULT_STOREFRONT_CONFIG.featured_products,
      ...(input.featured_products || {}),
      selected_product_ids: Array.isArray(input.featured_products?.selected_product_ids)
        ? input.featured_products.selected_product_ids
        : DEFAULT_STOREFRONT_CONFIG.featured_products.selected_product_ids,
    },
    promotional_banner: {
      ...DEFAULT_STOREFRONT_CONFIG.promotional_banner,
      ...(input.promotional_banner || {}),
      bullet_points: Array.isArray(input.promotional_banner?.bullet_points)
        ? input.promotional_banner.bullet_points
        : DEFAULT_STOREFRONT_CONFIG.promotional_banner.bullet_points,
      images: Array.isArray(input.promotional_banner?.images)
        ? input.promotional_banner.images
        : DEFAULT_STOREFRONT_CONFIG.promotional_banner.images,
    },
    value_props: {
      ...DEFAULT_STOREFRONT_CONFIG.value_props,
      ...(input.value_props || {}),
      items: Array.isArray(input.value_props?.items)
        ? input.value_props.items
        : DEFAULT_STOREFRONT_CONFIG.value_props.items,
    },
    contact_delivery: {
      ...DEFAULT_STOREFRONT_CONFIG.contact_delivery,
      ...(input.contact_delivery || input.contact_delivery_bar || {}),
    },
    theme: {
      ...DEFAULT_THEME_CONFIG,
      ...(input.theme || {}),
    },
  };
}
