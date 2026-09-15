-- Update trigger function to restrict default admin role assignment strictly to admin@barimaba.com
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  assigned_role text := 'customer';
BEGIN
  IF NEW.email = 'admin@barimaba.com' THEN
    assigned_role := 'admin';
  END IF;

  INSERT INTO public.profiles (id, full_name, phone, is_phone_verified)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    (NEW.email = 'admin@barimaba.com')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF assigned_role = 'admin' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'customer')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Revoke admin role from all users EXCEPT admin@barimaba.com
DELETE FROM public.user_roles
WHERE role = 'admin'
  AND user_id NOT IN (
    SELECT id FROM auth.users WHERE email = 'admin@barimaba.com'
  );

-- Ensure admin@barimaba.com has the admin role if the user exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'admin@barimaba.com'
ON CONFLICT (user_id, role) DO NOTHING;
