import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export interface HeroMediaSettings {
  media_type: "video" | "image";
  video_url: string;
  poster_url: string;
  badge_text: string;
  headline_main: string;
  headline_highlight: string;
  subheading: string;
  autoplay: boolean;
  muted: boolean;
  loop: boolean;
  overlay_text?: string;
}

export const DEFAULT_HERO_SETTINGS: HeroMediaSettings = {
  media_type: "video",
  video_url: "/videos/shito-animi.mp4",
  poster_url: "/images/hero-foods-spread.png",
  badge_text: "Nationwide Delivery Across Ghana",
  headline_main: "BARIMA BA FOODS",
  headline_highlight: "Taste. Quality. Trust.",
  subheading: "Premium quality homemade Ghanaian foods made with passion, rich in flavor and crafted for your satisfaction.",
  autoplay: true,
  muted: true,
  loop: true,
  overlay_text: "Signature Shito Animi Reel",
};

export const PRO_VIDEO_PRESETS = [
  {
    id: "shito-animi",
    title: "Signature Shito Animi",
    video_url: "/videos/shito-animi.mp4",
    poster_url: "https://images.unsplash.com/photo-1599043513900-ed6fe01d3833?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "produce-market",
    title: "Fresh Produce & Market",
    video_url: "https://assets.mixkit.co/videos/preview/mixkit-fresh-vegetables-and-fruits-in-a-market-42847-large.mp4",
    poster_url: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "fresh-cooking",
    title: "Gourmet Kitchen Prep",
    video_url: "https://assets.mixkit.co/videos/preview/mixkit-cutting-fresh-vegetables-on-a-wooden-board-43093-large.mp4",
    poster_url: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "organic-store",
    title: "Pantry & Groceries",
    video_url: "https://assets.mixkit.co/videos/preview/mixkit-woman-choosing-fruits-in-a-supermarket-42848-large.mp4",
    poster_url: "https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "fresh-fruit-harvest",
    title: "Fresh Harvest & Orchard",
    video_url: "https://assets.mixkit.co/videos/preview/mixkit-hands-selecting-ripe-oranges-in-a-market-42849-large.mp4",
    poster_url: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&q=80&w=800",
  },
];

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const getHeroSettings = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", "hero_media")
      .maybeSingle();

    if (error || !data || !data.value) {
      return DEFAULT_HERO_SETTINGS;
    }
    return { ...DEFAULT_HERO_SETTINGS, ...(data.value as Partial<HeroMediaSettings>) };
  } catch (err) {
    console.error("Error fetching hero settings:", err);
    return DEFAULT_HERO_SETTINGS;
  }
});

export const updateHeroSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      media_type: z.enum(["video", "image"]),
      video_url: z.string().url().or(z.string().min(1)),
      poster_url: z.string().url().or(z.string().min(1)),
      badge_text: z.string().min(1),
      headline_main: z.string().min(1),
      headline_highlight: z.string().min(1),
      subheading: z.string().min(1),
      autoplay: z.boolean(),
      muted: z.boolean(),
      loop: z.boolean(),
      overlay_text: z.string().optional(),
    })
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("site_settings")
      .upsert({
        key: "hero_media",
        value: data,
        updated_at: new Date().toISOString(),
      });

    if (error) throw new Error(error.message);
    return { success: true };
  });
