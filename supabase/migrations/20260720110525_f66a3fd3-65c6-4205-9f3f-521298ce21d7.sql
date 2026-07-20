
-- 1. Switch has_role to SECURITY INVOKER (it's always called with auth.uid(),
--    and users can read their own user_roles rows).
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- 2. Tighten order_items INSERT for authenticated users: order must belong to them.
DROP POLICY IF EXISTS "auth insert order items" ON public.order_items;
CREATE POLICY "auth insert order items"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.user_id = auth.uid()
  )
);

-- 3. Remove guest-order visibility from order_items SELECT policy.
--    Guest order lookups happen server-side via order number (service role).
DROP POLICY IF EXISTS "read own order items" ON public.order_items;
CREATE POLICY "read own order items"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (o.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  )
);
