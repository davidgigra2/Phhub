-- FIX superadmin login — UPDATE only (no deletion, avoids FK issues)
-- Run in Supabase SQL Editor

DO $$
DECLARE
  v_id UUID;
BEGIN
  -- Get the existing auth user ID
  SELECT id INTO v_id FROM auth.users WHERE email = 'superadmin@phhub.com';

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'No auth user found for superadmin@phhub.com';
  END IF;

  -- UPDATE auth.users with all required fields set correctly
  UPDATE auth.users SET
    encrypted_password        = crypt('superadmin123', gen_salt('bf')),
    email_confirmed_at        = COALESCE(email_confirmed_at, now()),
    confirmation_token        = '',
    recovery_token            = '',
    email_change_token_new    = '',
    email_change              = '',
    email_change_token_current= '',
    phone_change              = '',
    phone_change_token        = '',
    reauthentication_token    = '',
    email_change_confirm_status = 0,
    is_sso_user               = false,
    raw_app_meta_data         = '{"provider":"email","providers":["email"]}',
    updated_at                = now()
  WHERE id = v_id;

  -- Upsert auth.identities (required for newer Supabase versions)
  DELETE FROM auth.identities WHERE user_id = v_id;
  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_id, v_id,
    'superadmin@phhub.com',
    json_build_object('sub', v_id::text, 'email', 'superadmin@phhub.com'),
    'email', now(), now(), now()
  );

  -- Upsert public.users with the correct ID
  INSERT INTO public.users (id, email, full_name, role, username)
  VALUES (v_id, 'superadmin@phhub.com', 'Super Administrador', 'SUPER_ADMIN', 'superadmin')
  ON CONFLICT (id) DO UPDATE
    SET role = 'SUPER_ADMIN', username = 'superadmin',
        email = 'superadmin@phhub.com', full_name = 'Super Administrador';

  RAISE NOTICE 'Done. Superadmin auth ID: %', v_id;
END $$;

-- Verify
SELECT 'auth' as t, id, email, email_confirmed_at, is_sso_user
FROM auth.users WHERE email = 'superadmin@phhub.com'
UNION ALL
SELECT 'pub', id, email, created_at, NULL
FROM public.users WHERE email = 'superadmin@phhub.com';
