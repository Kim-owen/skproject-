-- Grant admin privileges to barimabashito@gmail.com and update handle_new_user trigger

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  assigned_role text := 'customer';
BEGIN
  IF NEW.email IN (
    'admin@barimaba.com',
    'barimabafoods@gmail.com',
    'sunumanfred14@gmail.com',
    'barimabashito@gmail.com'
  ) THEN
    assigned_role := 'admin';
  END IF;

  INSERT INTO public.profiles (id, full_name, phone, is_phone_verified)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    (NEW.email IN (
      'admin@barimaba.com',
      'barimabafoods@gmail.com',
      'sunumanfred14@gmail.com',
      'barimabashito@gmail.com'
    ))
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

-- Ensure barimabashito@gmail.com has the admin role if the user exists in auth.users
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'barimabashito@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
