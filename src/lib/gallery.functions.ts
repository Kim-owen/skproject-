import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export interface GalleryItem {
  id: string;
  title: string;
  category: string;
  img: string;
  media_type?: "image" | "video";
  video_url?: string;
  description?: string;
  created_at?: string;
}

export const DEFAULT_GALLERY_ITEMS: GalleryItem[] = [
  {
    id: "gal-vid-1",
    title: "Signature Shito Animi Cooking Reel",
    category: "Shito",
    media_type: "video",
    video_url: "/videos/shito-animi.mp4",
    img: "/images/product-shito-jars.png",
    description: "Watch our slow-stirred signature Shito Animi bubbling hot with aromatic smoked shrimp and spices.",
    created_at: new Date().toISOString(),
  },
  {
    id: "gal-1",
    title: "Signature Shito Animi Jars",
    category: "Shito",
    media_type: "image",
    img: "/images/product-shito-jars.png",
    description: "Handcrafted authentic black pepper shito in sealed glass jars.",
    created_at: new Date().toISOString(),
  },
  {
    id: "gal-2",
    title: "Seasoned Tender Beef Chunks",
    category: "Meats",
    media_type: "image",
    img: "/images/product-beef-chunks.png",
    description: "Slow-simmered, tender spiced Ghanaian beef bites ready to serve.",
    created_at: new Date().toISOString(),
  },
  {
    id: "gal-3",
    title: "Royal Wedding Catering Setup",
    category: "Catering",
    media_type: "image",
    img: "/images/catering-wedding-table.png",
    description: "Elegant banquet buffet setup for traditional and white weddings across Accra.",
    created_at: new Date().toISOString(),
  },
  {
    id: "gal-4",
    title: "Fresh Green Chilli Pepper Sauce",
    category: "Sauces",
    media_type: "image",
    img: "/images/product-green-chilli.png",
    description: "Spicy and zesty blended green pepper relish made fresh daily.",
    created_at: new Date().toISOString(),
  },
  {
    id: "gal-5",
    title: "Crispy Seasoned Chicken Chunks",
    category: "Meats",
    media_type: "image",
    img: "/images/product-chicken-chunks.png",
    description: "Golden-brown fried chicken bites infused with local herbs and ginger.",
    created_at: new Date().toISOString(),
  },
  {
    id: "gal-6",
    title: "Corporate Banquet Buffet",
    category: "Catering",
    media_type: "image",
    img: "/images/catering-chafing-buffet.png",
    description: "Chafing dish setup with fragrant Jollof rice, waakye, and assorted grilled proteins.",
    created_at: new Date().toISOString(),
  },
];

async function assertAdmin(supabase: any, userId: string) {
  const { data: hasAdmin, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error || !hasAdmin) {
    throw new Error("Unauthorized: Admin privileges required.");
  }
}

export const getGalleryItems = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", "gallery_items")
      .maybeSingle();

    if (error || !data || !Array.isArray(data.value) || data.value.length === 0) {
      return DEFAULT_GALLERY_ITEMS;
    }

    return data.value as unknown as GalleryItem[];
  } catch (err) {
    console.error("Error fetching gallery items:", err);
    return DEFAULT_GALLERY_ITEMS;
  }
});

const galleryItemSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(100),
  category: z.string().trim().min(2, "Category is required").max(50),
  img: z.string().trim().min(1, "Image or Poster URL is required"),
  media_type: z.enum(["image", "video"]).optional().default("image"),
  video_url: z.string().trim().optional(),
  description: z.string().trim().max(500).optional(),
});

export const saveAllGalleryItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ items: z.array(galleryItemSchema) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const itemsToSave: GalleryItem[] = data.items.map((item, idx) => ({
      id: item.id || `gal-${Date.now()}-${idx}`,
      title: item.title,
      category: item.category,
      img: item.img,
      media_type: item.media_type || (item.video_url ? "video" : "image"),
      video_url: item.video_url || undefined,
      description: item.description || "",
      created_at: new Date().toISOString(),
    }));

    const { error } = await supabaseAdmin.from("site_settings").upsert({
      key: "gallery_items",
      value: itemsToSave as any,
      updated_at: new Date().toISOString(),
    });

    if (error) throw new Error(error.message);
    return { success: true, count: itemsToSave.length };
  });

export const addGalleryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(galleryItemSchema)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: currentRecord } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", "gallery_items")
      .maybeSingle();

    const currentList: GalleryItem[] =
      currentRecord && Array.isArray(currentRecord.value) && currentRecord.value.length > 0
        ? (currentRecord.value as unknown as GalleryItem[])
        : DEFAULT_GALLERY_ITEMS;

    const newItem: GalleryItem = {
      id: `gal-${Date.now()}`,
      title: data.title,
      category: data.category,
      img: data.img,
      media_type: data.media_type || (data.video_url ? "video" : "image"),
      video_url: data.video_url || undefined,
      description: data.description || "",
      created_at: new Date().toISOString(),
    };

    const updated = [newItem, ...currentList];

    const { error } = await supabaseAdmin.from("site_settings").upsert({
      key: "gallery_items",
      value: updated as any,
      updated_at: new Date().toISOString(),
    });

    if (error) throw new Error(error.message);
    return { success: true, item: newItem };
  });

export const updateGalleryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      id: z.string().min(1),
      title: z.string().trim().min(2).max(100),
      category: z.string().trim().min(2).max(50),
      img: z.string().trim().min(1),
      media_type: z.enum(["image", "video"]).optional(),
      video_url: z.string().trim().optional(),
      description: z.string().trim().max(500).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: currentRecord } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", "gallery_items")
      .maybeSingle();

    const currentList: GalleryItem[] =
      currentRecord && Array.isArray(currentRecord.value) && currentRecord.value.length > 0
        ? (currentRecord.value as unknown as GalleryItem[])
        : DEFAULT_GALLERY_ITEMS;

    const index = currentList.findIndex((it) => it.id === data.id);
    if (index === -1) throw new Error("Gallery item not found");

    currentList[index] = {
      ...currentList[index],
      title: data.title,
      category: data.category,
      img: data.img,
      media_type: data.media_type || (data.video_url ? "video" : currentList[index].media_type || "image"),
      video_url: data.video_url !== undefined ? data.video_url : currentList[index].video_url,
      description: data.description || "",
    };

    const { error } = await supabaseAdmin.from("site_settings").upsert({
      key: "gallery_items",
      value: currentList as any,
      updated_at: new Date().toISOString(),
    });

    if (error) throw new Error(error.message);
    return { success: true };
  });

export const deleteGalleryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: currentRecord } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", "gallery_items")
      .maybeSingle();

    const currentList: GalleryItem[] =
      currentRecord && Array.isArray(currentRecord.value) && currentRecord.value.length > 0
        ? (currentRecord.value as unknown as GalleryItem[])
        : DEFAULT_GALLERY_ITEMS;

    const updated = currentList.filter((it) => it.id !== data.id);

    const { error } = await supabaseAdmin.from("site_settings").upsert({
      key: "gallery_items",
      value: updated as any,
      updated_at: new Date().toISOString(),
    });

    if (error) throw new Error(error.message);
    return { success: true };
  });
