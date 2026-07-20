-- Add GPS fields to orders table
ALTER TABLE public.orders ADD COLUMN ghana_post_gps text;
ALTER TABLE public.orders ADD COLUMN gps_coordinates text;

-- Insert Bundles & Chopboxes category
INSERT INTO public.categories (name, slug, sort_order) 
VALUES ('Bundles & Chopboxes', 'bundles', 0)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

-- Seed Bundled products
INSERT INTO public.products (category_id, name, slug, description, unit, price_ghs, stock_quantity, image_url)
VALUES 
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
