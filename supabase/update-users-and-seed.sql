-- 1. Update 'apto101' document number to '1088030988'
UPDATE public.users
SET document_number = '1088030988'
WHERE username = 'apto101';

-- 2. Create New User 'apto202'
DO $$
DECLARE
  var_user_id UUID;
  var_unit_id UUID;
BEGIN
  -- Create Unit 202
  INSERT INTO public.units (number, coefficient, owner_name)
  VALUES ('APT-202', 0.05, 'María Rodríguez')
  ON CONFLICT (number) DO UPDATE SET owner_name = 'María Rodríguez'
  RETURNING id INTO var_unit_id;

  -- Check Auth User for apto202
  SELECT id INTO var_user_id FROM auth.users WHERE email = 'apto202@phhub.com';

  IF var_user_id IS NULL THEN
    var_user_id := gen_random_uuid();
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, raw_app_meta_data, raw_user_meta_data)
    VALUES (var_user_id, 'apto202@phhub.com', crypt('password123', gen_salt('bf')), now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}', '{}');
  END IF;

  -- Create Public User Profile
  INSERT INTO public.users (id, email, full_name, role, unit_id, username, document_number, represented_unit)
  VALUES (var_user_id, 'apto202@phhub.com', 'María Rodríguez', 'USER', var_unit_id, 'apto202', '999999999', 'APT-202')
  ON CONFLICT (id) DO UPDATE 
  SET 
    username = 'apto202', 
    document_number = '999999999',
    represented_unit = 'APT-202',
    unit_id = var_unit_id;
END $$;
