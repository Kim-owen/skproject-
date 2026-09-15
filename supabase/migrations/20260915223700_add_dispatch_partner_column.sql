-- Migration: Add dispatch_partner and rider dispatch columns to public.orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dispatch_partner text DEFAULT 'uber';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rider_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rider_phone text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rider_vehicle text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS uber_tracking_url text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS estimated_delivery_time text;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
