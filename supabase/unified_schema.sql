-- =========================================================================
-- PROVISION SHOP UNIFIED DATABASE SCHEMA & MIGRATIONS
-- Run this complete script in your Supabase SQL Editor to set up everything.
-- =========================================================================

-- 1. ROLES & SCHEMAS
CREATE TYPE public.app_role AS ENUM ('admin','staff','customer');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  wallet_balance_ghs numeric(10,2) NOT NULL DEFAULT 0.00,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- WALLET TRANSACTIONS
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('deposit', 'refund', 'payment', 'cashback')),
  amount_ghs numeric(10,2) NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own wallet tx" ON public.wallet_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CATEGORIES
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories are public" ON public.categories FOR SELECT USING (true);
CREATE POLICY "admins manage categories" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- PRODUCTS
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  unit text NOT NULL DEFAULT 'piece',
  price_ghs numeric(10,2) NOT NULL CHECK (price_ghs >= 0),
  stock_quantity int NOT NULL DEFAULT 0,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products are public" ON public.products FOR SELECT USING (true);
CREATE POLICY "admins manage products" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- DELIVERY ZONES
CREATE TABLE public.delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  fee_ghs numeric(10,2) NOT NULL CHECK (fee_ghs >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.delivery_zones TO anon, authenticated;
GRANT ALL ON public.delivery_zones TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.delivery_zones TO authenticated;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zones are public" ON public.delivery_zones FOR SELECT USING (true);
CREATE POLICY "admins manage zones" ON public.delivery_zones FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ORDERS & ENUMS
CREATE TYPE public.order_status AS ENUM ('pending','confirmed','packed','out_for_delivery','delivered','cancelled');
CREATE TYPE public.payment_status AS ENUM ('unpaid','paid','failed','refunded');
CREATE TYPE public.payment_method AS ENUM ('paystack','cash_on_delivery');
CREATE TYPE public.delivery_type AS ENUM ('delivery','pickup');

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE DEFAULT ('PS-' || upper(substring(gen_random_uuid()::text,1,8))),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  delivery_type public.delivery_type NOT NULL,
  delivery_address text,
  delivery_zone_id uuid REFERENCES public.delivery_zones(id) ON DELETE SET NULL,
  delivery_fee_ghs numeric(10,2) NOT NULL DEFAULT 0,
  subtotal_ghs numeric(10,2) NOT NULL,
  total_ghs numeric(10,2) NOT NULL,
  status public.order_status NOT NULL DEFAULT 'pending',
  payment_method public.payment_method NOT NULL,
  payment_status public.payment_status NOT NULL DEFAULT 'unpaid',
  payment_reference text,
  notes text,
  ghana_post_gps text,
  gps_coordinates text,
  dispatch_partner text DEFAULT 'uber',
  rider_name text,
  rider_phone text,
  rider_vehicle text,
  uber_tracking_url text,
  estimated_delivery_time text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.orders TO anon, authenticated;
GRANT UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guests can create orders" ON public.orders FOR INSERT TO anon WITH CHECK (user_id IS NULL);
CREATE POLICY "auth can create orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "users read own orders" ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ORDER ITEMS
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  unit text NOT NULL,
  quantity int NOT NULL CHECK (quantity > 0),
  unit_price_ghs numeric(10,2) NOT NULL,
  line_total_ghs numeric(10,2) NOT NULL
);
GRANT SELECT, INSERT ON public.order_items TO anon, authenticated;
GRANT UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- TRIGGER UPDATED_AT
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER products_touch BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER orders_touch BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- FUNCTION PERMISSION TIGHTENING & SECURITY POLICIES
ALTER FUNCTION public.touch_updated_at() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- SECURITY POLICIES REVISIONS
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "auth insert order items" ON public.order_items FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
  )
);

CREATE POLICY "read own order items" ON public.order_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (o.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  )
);

-- SEED DATA CATEGORIES
INSERT INTO public.categories (name, slug, sort_order) VALUES
  ('Bundles & Chopboxes','bundles',0),
  ('Meat','meat',1),
  ('Chicken & Poultry','chicken',2),
  ('Sauces & Shito','shito',3),
  ('Grains & Staples','grains',4),
  ('Beverages','beverages',5),
  ('Household','household',6)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

-- SEED DATA PRODUCTS
INSERT INTO public.products (category_id, name, slug, description, unit, price_ghs, stock_quantity, image_url) VALUES
  ((SELECT id FROM public.categories WHERE slug='meat'), 'Fresh Beef', 'fresh-beef', 'Locally sourced fresh beef, cut and cleaned.', 'kg', 90.00, 40, 'https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=800&auto=format&fit=crop'),
  ((SELECT id FROM public.categories WHERE slug='chicken'), 'Whole Chicken', 'whole-chicken', 'Farm-fresh whole chicken, dressed and ready to cook.', 'piece', 75.00, 30, 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=800&auto=format&fit=crop'),
  ((SELECT id FROM public.categories WHERE slug='shito'), 'Signature Shito (500ml)', 'shito-500ml', 'Homemade black pepper sauce made with fresh ingredients.', 'bottle', 45.00, 80, 'https://images.unsplash.com/photo-1599043513900-ed6fe01d3833?w=800&auto=format&fit=crop'),
  ((SELECT id FROM public.categories WHERE slug='grains'), 'Perfumed Rice (5kg)', 'perfumed-rice-5kg', 'Long-grain perfumed rice, 5kg bag.', 'bag', 120.00, 25, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&auto=format&fit=crop'),
  ((SELECT id FROM public.categories WHERE slug='beverages'), 'Bottled Water (12-pack)', 'water-12pack', 'Case of 12 bottled waters, 1.5L each.', 'pack', 40.00, 60, 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800&auto=format&fit=crop'),
  ((SELECT id FROM public.categories WHERE slug='household'), 'Dish Soap (1L)', 'dish-soap-1l', 'Concentrated lemon dish soap.', 'bottle', 25.00, 100, 'https://images.unsplash.com/photo-1585670210693-ea4b4ad38a91?w=800&auto=format&fit=crop'),
  (
    (SELECT id FROM public.categories WHERE slug = 'bundles'),
    'Student Chopbox Essentials',
    'student-chopbox-essentials',
    'All the pantry basics for school: Milo, powdered milk, perfumed rice, custom black shito jar, and biscuits.',
    'box',
    290.00,
    20,
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop'
  ),
  (
    (SELECT id FROM public.categories WHERE slug = 'bundles'),
    'Sunday Jollof Feast Bundle',
    'sunday-jollof-feast-bundle',
    'Everything you need for perfect Sunday Jollof: Perfumed Rice (5kg), tomato paste, fresh beef (1kg), onions, pepper, and spices.',
    'bundle',
    180.00,
    15,
    'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&auto=format&fit=crop'
  ),
  (
    (SELECT id FROM public.categories WHERE slug = 'bundles'),
    'Accra Breakfast Kit',
    'accra-breakfast-kit',
    'Start your morning right: a carton of milk, a pack of tea bags, sugar, a loaf of fresh bread, and chocolate spread.',
    'kit',
    95.00,
    30,
    'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800&auto=format&fit=crop'
  )
ON CONFLICT (slug) DO NOTHING;

-- SEED DATA ZONES
INSERT INTO public.delivery_zones (name, fee_ghs) VALUES
  ('East Legon',20),('Osu',15),('Airport / Cantonments',20),('Tema',35),('Madina',25),('Adenta',30),('Kaneshie',20),('Achimota',25)
ON CONFLICT DO NOTHING;

-- SITE SETTINGS (Dynamic Config for Hero Video, Announcements, etc.)
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_settings are public readable" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "admins manage site_settings" ON public.site_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- SEED HERO MEDIA SETTINGS
INSERT INTO public.site_settings (key, value) VALUES (
  'hero_media',
  jsonb_build_object(
    'media_type', 'video',
    'video_url', '/videos/shito-animi.mp4',
    'poster_url', 'https://images.unsplash.com/photo-1599043513900-ed6fe01d3833?auto=format&fit=crop&q=80&w=800',
    'badge_text', 'Same-day delivery across Accra',
    'headline_main', 'Modern provisions,',
    'headline_highlight', 'delivered fresh.',
    'subheading', 'The curated pantry for modern Accra. Order premium meats, poultry, house-made shito, and household essentials online.',
    'autoplay', true,
    'muted', true,
    'loop', true,
    'overlay_text', 'Signature Shito Reel'
  )
) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

