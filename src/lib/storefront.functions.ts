import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  DEFAULT_STOREFRONT_CONFIG,
  normalizeStorefrontConfig,
  type StorefrontConfig,
} from "./storefront.types";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const getStorefrontConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<StorefrontConfig> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data, error } = await supabaseAdmin
        .from("site_settings")
        .select("value")
        .eq("key", "storefront_config")
        .maybeSingle();

      if (error || !data || !data.value) {
        return DEFAULT_STOREFRONT_CONFIG;
      }
      return normalizeStorefrontConfig(data.value);
    } catch (err) {
      console.error("[Storefront] Error loading storefront config:", err);
      return DEFAULT_STOREFRONT_CONFIG;
    }
  },
);

export const updateStorefrontConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => data as StorefrontConfig)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Save to site_settings table
    const { error } = await supabaseAdmin.from("site_settings").upsert({
      key: "storefront_config",
      value: data as any,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[Storefront] Failed to update config:", error);
      throw new Error(error.message);
    }

    // Also sync hero_media key for backward compatibility with existing hero settings
    if (data.hero) {
      await supabaseAdmin.from("site_settings").upsert({
        key: "hero_media",
        value: {
          media_type: data.hero.media_type,
          video_url: data.hero.video_url,
          poster_url: data.hero.poster_url,
          badge_text: data.hero.badge_text,
          headline_main: data.hero.headline_main,
          headline_highlight: data.hero.headline_highlight,
          subheading: data.hero.subheading,
          autoplay: data.hero.autoplay,
          muted: data.hero.muted,
          loop: data.hero.loop,
        } as any,
        updated_at: new Date().toISOString(),
      });
    }

    return { success: true };
  });

export const listCategoriesWithCounts = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const [catRes, prodRes] = await Promise.all([
        supabaseAdmin.from("categories").select("*").order("sort_order", { ascending: true }),
        supabaseAdmin.from("products").select("id, category_id, is_active"),
      ]);

      if (catRes.error) throw catRes.error;

      const categories = catRes.data ?? [];
      const products = prodRes.data ?? [];

      return categories.map((cat) => ({
        ...cat,
        products_count: products.filter((p) => p.category_id === cat.id && p.is_active).length,
      }));
    } catch (err: any) {
      console.error("[Storefront] Failed to list categories:", err);
      return [];
    }
  },
);

export const upsertCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(1),
      slug: z.string().min(1),
      sort_order: z.number().int().default(0),
      image_url: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const payload: Record<string, any> = {
      name: data.name,
      slug: data.slug,
      sort_order: data.sort_order,
    };
    if (data.id) payload.id = data.id;

    const { data: result, error } = await supabaseAdmin
      .from("categories")
      .upsert(payload)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return result;
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });
