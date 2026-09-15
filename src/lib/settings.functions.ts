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
  subheading:
    "Premium quality homemade Ghanaian foods made with passion, rich in flavor and crafted for your satisfaction.",
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
    poster_url:
      "https://images.unsplash.com/photo-1599043513900-ed6fe01d3833?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "produce-market",
    title: "Fresh Produce & Market",
    video_url:
      "https://assets.mixkit.co/videos/preview/mixkit-fresh-vegetables-and-fruits-in-a-market-42847-large.mp4",
    poster_url:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "fresh-cooking",
    title: "Gourmet Kitchen Prep",
    video_url:
      "https://assets.mixkit.co/videos/preview/mixkit-cutting-fresh-vegetables-on-a-wooden-board-43093-large.mp4",
    poster_url:
      "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "organic-store",
    title: "Pantry & Groceries",
    video_url:
      "https://assets.mixkit.co/videos/preview/mixkit-woman-choosing-fruits-in-a-supermarket-42848-large.mp4",
    poster_url:
      "https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "fresh-fruit-harvest",
    title: "Fresh Harvest & Orchard",
    video_url:
      "https://assets.mixkit.co/videos/preview/mixkit-hands-selecting-ripe-oranges-in-a-market-42849-large.mp4",
    poster_url:
      "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&q=80&w=800",
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
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Save to hero_media
    const { error: heroErr } = await supabaseAdmin.from("site_settings").upsert({
      key: "hero_media",
      value: data,
      updated_at: new Date().toISOString(),
    });

    if (heroErr) throw new Error(heroErr.message);

    // 2. Sync to storefront_config so storefront homepage updates immediately
    try {
      const { data: sfData } = await supabaseAdmin
        .from("site_settings")
        .select("value")
        .eq("key", "storefront_config")
        .maybeSingle();

      const sfConfig = sfData?.value ? (sfData.value as any) : {};
      sfConfig.hero = {
        ...(sfConfig.hero || {}),
        enabled: true,
        media_type: data.media_type,
        video_url: data.video_url,
        poster_url: data.poster_url,
        badge_text: data.badge_text,
        headline_main: data.headline_main,
        headline_highlight: data.headline_highlight,
        subheading: data.subheading,
        autoplay: data.autoplay,
        muted: data.muted,
        loop: data.loop,
      };

      await supabaseAdmin.from("site_settings").upsert({
        key: "storefront_config",
        value: sfConfig,
        updated_at: new Date().toISOString(),
      });
    } catch (syncErr) {
      console.error("[HeroSettings] Error syncing to storefront_config:", syncErr);
    }

    return { success: true };
  });

export interface NotificationSettings {
  admin_notification_phone: string;
  enable_admin_alerts: boolean;
  enable_rider_alerts: boolean;
  enable_customer_alerts: boolean;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  admin_notification_phone: "233241234567",
  enable_admin_alerts: true,
  enable_rider_alerts: true,
  enable_customer_alerts: true,
};

export const getNotificationSettings = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", "notifications_config")
      .maybeSingle();

    if (error || !data || !data.value) {
      return DEFAULT_NOTIFICATION_SETTINGS;
    }
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...(data.value as Partial<NotificationSettings>) };
  } catch (err) {
    console.error("Error fetching notification settings:", err);
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
});

export const updateNotificationSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      admin_notification_phone: z.string().trim().min(7).max(20),
      enable_admin_alerts: z.boolean(),
      enable_rider_alerts: z.boolean(),
      enable_customer_alerts: z.boolean(),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("site_settings").upsert({
      key: "notifications_config",
      value: data,
      updated_at: new Date().toISOString(),
    });

    if (error) throw new Error(error.message);
    return { success: true };
  });

export const sendTestSMS = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      phone: z.string().trim().min(7).max(20),
      message: z.string().trim().min(1),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { sendSMSNotification } = await import("@/lib/orders.functions");
    try {
      await sendSMSNotification(data.phone, data.message);
      return { success: true };
    } catch (err: any) {
      throw new Error(err.message || "Failed to send test SMS");
    }
  });

export interface StoreGeneralSettings {
  store_name: string;
  support_email: string;
  support_phone: string;
  whatsapp_number: string;
  operating_hours: string;
  minimum_order_amount: number;
  maintenance_mode: boolean;
  maintenance_banner_text: string;
}

export const DEFAULT_STORE_GENERAL_SETTINGS: StoreGeneralSettings = {
  store_name: "Barima Ba Foods",
  support_email: "support@barimabafoods.shop",
  support_phone: "+233 24 123 4567",
  whatsapp_number: "233241234567",
  operating_hours: "Monday – Saturday: 7:30 AM – 9:00 PM | Sunday: 11:00 AM – 7:00 PM",
  minimum_order_amount: 30,
  maintenance_mode: false,
  maintenance_banner_text: "We are briefly upgrading our systems. New orders will resume shortly!",
};

export const getStoreGeneralSettings = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", "store_general_settings")
      .maybeSingle();

    return {
      ...DEFAULT_STORE_GENERAL_SETTINGS,
      ...((data?.value as Partial<StoreGeneralSettings>) || {}),
    };
  } catch (err) {
    console.error("Error fetching general settings:", err);
    return DEFAULT_STORE_GENERAL_SETTINGS;
  }
});

export const updateStoreGeneralSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => d as StoreGeneralSettings)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("site_settings").upsert({
      key: "store_general_settings",
      value: data as any,
      updated_at: new Date().toISOString(),
    });

    if (error) throw new Error(error.message);
    return { success: true };
  });

export const broadcastNotificationToUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      message: z.string().trim().min(3).max(480),
      audience: z.enum(["all_users", "customers_with_orders", "phone_verified"]),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendSMSNotification } = await import("@/lib/orders.functions");

    let query = supabaseAdmin.from("profiles").select("phone, is_phone_verified");
    if (data.audience === "phone_verified") {
      query = query.eq("is_phone_verified", true);
    }
    const { data: profiles } = await query;

    const phonesSet = new Set<string>();
    for (const p of profiles ?? []) {
      if (p.phone && p.phone.trim().length >= 9) {
        phonesSet.add(p.phone.trim());
      }
    }

    // Also include customer phones from orders if requested
    if (data.audience === "customers_with_orders" || data.audience === "all_users") {
      const { data: orders } = await supabaseAdmin
        .from("orders")
        .select("customer_phone")
        .not("customer_phone", "is", null);
      for (const o of orders ?? []) {
        if (o.customer_phone && o.customer_phone.trim().length >= 9) {
          phonesSet.add(o.customer_phone.trim());
        }
      }
    }

    const recipientList = Array.from(phonesSet);
    if (recipientList.length === 0) {
      return { totalRecipients: 0, sentCount: 0, failedCount: 0 };
    }

    let sentCount = 0;
    let failedCount = 0;

    // Send SMS in small batches to preserve throughput without overloading
    for (const phone of recipientList) {
      try {
        await sendSMSNotification(phone, data.message);
        sentCount++;
      } catch {
        failedCount++;
      }
    }

    return {
      totalRecipients: recipientList.length,
      sentCount,
      failedCount,
    };
  });

export const updateAdminSecurity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      full_name: z.string().trim().min(2).optional(),
      new_password: z.string().min(8).optional().or(z.literal("")),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Update password if provided
    if (data.new_password && data.new_password.trim().length >= 8) {
      const { error: pwdErr } = await supabaseAdmin.auth.admin.updateUserById(context.userId, {
        password: data.new_password,
      });
      if (pwdErr) throw new Error(pwdErr.message);
    }

    // Update profile full_name if provided
    if (data.full_name) {
      await supabaseAdmin.from("profiles").upsert(
        {
          id: context.userId,
          full_name: data.full_name,
        },
        { onConflict: "id" },
      );
    }

    return { success: true };
  });

