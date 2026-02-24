-- ================================================
-- 1:N PROPERTIES & PROXIES REFACTOR MIGRATION
-- Run this once in the Supabase SQL Editor
-- ================================================

-- 1. Modify Units Table (Properties)
-- Add explicit owner details to the unit itself, keeping it decoupled from auth users.
-- Add representative_id which points to the user who can currently vote for it.
ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS owner_document_number TEXT,
  ADD COLUMN IF NOT EXISTS owner_phone TEXT,
  ADD COLUMN IF NOT EXISTS owner_email TEXT,
  ADD COLUMN IF NOT EXISTS representative_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- 2. Modify Users Table
-- Remove the unit_id column because a user can now represent MULTIPLE units
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'unit_id'
  ) THEN
    ALTER TABLE public.users DROP COLUMN unit_id;
  END IF;
END $$;

-- 3. Update Indexes and Constraints
-- Create an index to quickly find all units a generic user represents
CREATE INDEX IF NOT EXISTS idx_units_representative ON public.units(representative_id);

-- Optional: Update Attendance Logs (Not strictly required, but helps clarity if needed)
-- attendance_logs currently uses user_id, which points to the representative that checked in.
-- So we don't need to change attendance_logs structure! 
-- ballots currently use user_id + unit_id, which is perfect for multiple votes from one representative.

-- 4. Update Proxies Logic Compatibility
-- Proxies still point to principal_id and representative_id representing 'users'.
-- For proxies to work perfectly in a 1:N system, the proxy refers to a specific unit OR all units of a principal.
-- Currently, proxies don't specify the unit, they specify the principal.
-- If a principal owns 3 units, a proxy covers all 3 units.
-- To make this robust, the application logic will update `representative_id` of those 3 units when a proxy is approved.
