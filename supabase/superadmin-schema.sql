-- ================================================
-- SUPER ADMIN SCHEMA MIGRATION
-- Run this once in the Supabase SQL Editor
-- ================================================

-- 1. Add SUPER_ADMIN to the role enum/check on public.users
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'USER'));

-- 2. Create assemblies table
CREATE TABLE IF NOT EXISTS public.assemblies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  address     TEXT,
  nit         TEXT,
  logo_url    TEXT,
  total_units INTEGER DEFAULT 0,
  created_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Add assembly_id to users (scope admin/operator to an assembly)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'assembly_id'
  ) THEN
    ALTER TABLE public.users ADD COLUMN assembly_id UUID REFERENCES public.assemblies(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Add assembly_id to units (scope units to an assembly)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'units' AND column_name = 'assembly_id'
  ) THEN
    ALTER TABLE public.units ADD COLUMN assembly_id UUID REFERENCES public.assemblies(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 5. Also add document_number to users if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'document_number'
  ) THEN
    ALTER TABLE public.users ADD COLUMN document_number TEXT;
  END IF;
END $$;

-- 6. RLS on assemblies
ALTER TABLE public.assemblies ENABLE ROW LEVEL SECURITY;

-- Super admin can do everything
CREATE POLICY "SUPER_ADMIN full access to assemblies"
  ON public.assemblies FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'SUPER_ADMIN')
  );

-- Admin/Operator can view their own assembly
CREATE POLICY "Admin/Operator view own assembly"
  ON public.assemblies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('ADMIN', 'OPERATOR')
        AND assembly_id = assemblies.id
    )
  );

-- 7. Seed SUPER_ADMIN user (run once)
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'superadmin@phhub.com';

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, email, encrypted_password, email_confirmed_at,
      role, aud, raw_app_meta_data, raw_user_meta_data
    ) VALUES (
      v_user_id,
      'superadmin@phhub.com',
      crypt('superadmin123', gen_salt('bf')),
      now(),
      'authenticated', 'authenticated',
      '{"provider":"email","providers":["email"]}', '{}'
    );
  END IF;

  INSERT INTO public.users (id, email, full_name, role, username)
  VALUES (v_user_id, 'superadmin@phhub.com', 'Super Administrador', 'SUPER_ADMIN', 'superadmin')
  ON CONFLICT (id) DO UPDATE
    SET role = 'SUPER_ADMIN', username = 'superadmin', email = 'superadmin@phhub.com';
END $$;
