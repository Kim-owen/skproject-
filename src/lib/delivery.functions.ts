import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

import { assertAdmin } from "./admin.functions";

export interface DeliveryZone {
  id: string;
  name: string;
  fee_ghs: number;
  is_active: boolean;
  created_at: string;
}

export interface LogisticsSettings {
  free_delivery_threshold_ghs: number;
  express_delivery_fee_ghs: number;
  estimated_delivery_time: string;
  dispatch_partners: string[];
  nationwide_enabled: boolean;
  support_phone: string;
}

export const DEFAULT_LOGISTICS_SETTINGS: LogisticsSettings = {
  free_delivery_threshold_ghs: 250,
  express_delivery_fee_ghs: 20,
  estimated_delivery_time: "30 - 60 minutes across Accra",
  dispatch_partners: ["Uber Package", "Bolt Send", "In-House Motorbike Dispatch"],
  nationwide_enabled: true,
  support_phone: "+233 24 123 4567",
};

export const getDeliveryDashboardData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [zonesRes, settingsRes] = await Promise.all([
      supabaseAdmin.from("delivery_zones").select("*").order("name"),
      supabaseAdmin
        .from("site_settings")
        .select("value")
        .eq("key", "delivery_settings")
        .maybeSingle(),
    ]);

    const zones: DeliveryZone[] = (zonesRes.data ?? []).map((z: any) => ({
      id: z.id,
      name: z.name,
      fee_ghs: Number(z.fee_ghs) || 0,
      is_active: z.is_active,
      created_at: z.created_at,
    }));

    const settings: LogisticsSettings = {
      ...DEFAULT_LOGISTICS_SETTINGS,
      ...((settingsRes.data?.value as Partial<LogisticsSettings>) || {}),
    };

    return { zones, settings };
  });

export const upsertDeliveryZone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().trim().min(2).max(100),
      fee_ghs: z.number().min(0),
      is_active: z.boolean(),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.id) {
      const { error } = await supabaseAdmin
        .from("delivery_zones")
        .update({
          name: data.name,
          fee_ghs: data.fee_ghs,
          is_active: data.is_active,
        })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("delivery_zones").insert({
        name: data.name,
        fee_ghs: data.fee_ghs,
        is_active: data.is_active,
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteDeliveryZone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("delivery_zones").delete().eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleDeliveryZoneActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ id: z.string().uuid(), is_active: z.boolean() }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("delivery_zones")
      .update({ is_active: data.is_active })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateLogisticsSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => d as LogisticsSettings)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("site_settings").upsert({
      key: "delivery_settings",
      value: data as any,
      updated_at: new Date().toISOString(),
    });

    if (error) throw new Error(error.message);
    return { ok: true };
  });
