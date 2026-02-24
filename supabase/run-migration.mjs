// One-time migration script — run with: node supabase/run-migration.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://itvssdpcsskelasrjgkm.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0dnNzZHBjc3NrZWxhc3JqZ2ttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTEyNDA3MywiZXhwIjoyMDg2NzAwMDczfQ.4McQ_-Wui-zG2D3cIjJjZ_-QBPkkgxgtOFTqAuvJ7qA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
});

// Run individual SQL statements via batch
const statements = [
    // 1. Update role constraint
    `ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check`,
    `ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'USER'))`,

    // 2. Create assemblies table
    `CREATE TABLE IF NOT EXISTS public.assemblies (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    address     TEXT,
    nit         TEXT,
    logo_url    TEXT,
    total_units INTEGER DEFAULT 0,
    created_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
  )`,

    // 3. assembly_id on users
    `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'assembly_id') THEN
      ALTER TABLE public.users ADD COLUMN assembly_id UUID REFERENCES public.assemblies(id) ON DELETE SET NULL;
    END IF;
  END $$`,

    // 4. assembly_id on units
    `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'units' AND column_name = 'assembly_id') THEN
      ALTER TABLE public.units ADD COLUMN assembly_id UUID REFERENCES public.assemblies(id) ON DELETE CASCADE;
    END IF;
  END $$`,

    // 5. document_number on users
    `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'document_number') THEN
      ALTER TABLE public.users ADD COLUMN document_number TEXT;
    END IF;
  END $$`,

    // 6. RLS on assemblies
    `ALTER TABLE public.assemblies ENABLE ROW LEVEL SECURITY`,
    `DROP POLICY IF EXISTS "SUPER_ADMIN full access to assemblies" ON public.assemblies`,
    `CREATE POLICY "SUPER_ADMIN full access to assemblies" ON public.assemblies FOR ALL
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'SUPER_ADMIN'))`,
    `DROP POLICY IF EXISTS "Admin/Operator view own assembly" ON public.assemblies`,
    `CREATE POLICY "Admin/Operator view own assembly" ON public.assemblies FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN','OPERATOR') AND assembly_id = assemblies.id))`,

    // 7. Seed SUPER_ADMIN
    `DO $$
  DECLARE v_user_id UUID;
  BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'superadmin@phhub.com';
    IF v_user_id IS NULL THEN
      v_user_id := gen_random_uuid();
      INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, raw_app_meta_data, raw_user_meta_data)
      VALUES (v_user_id, 'superadmin@phhub.com', crypt('superadmin123', gen_salt('bf')), now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}', '{}');
    END IF;
    INSERT INTO public.users (id, email, full_name, role, username)
    VALUES (v_user_id, 'superadmin@phhub.com', 'Super Administrador', 'SUPER_ADMIN', 'superadmin')
    ON CONFLICT (id) DO UPDATE SET role = 'SUPER_ADMIN', username = 'superadmin', email = 'superadmin@phhub.com';
  END $$`,
];

let ok = 0, fail = 0;
for (const sql of statements) {
    const { error } = await supabase.rpc('exec_sql', { query: sql }).catch(() => ({ error: { message: 'rpc not available' } }));
    if (error) {
        // Fallback: try direct insert via REST won't work for DDL, log it
        console.warn('⚠ Skipped (needs SQL editor):', sql.substring(0, 60).replace(/\n/g, ' '), '|', error.message);
        fail++;
    } else {
        console.log('✓', sql.substring(0, 60).replace(/\n/g, ' '));
        ok++;
    }
}
console.log(`\nDone: ${ok} ok, ${fail} skipped`);
