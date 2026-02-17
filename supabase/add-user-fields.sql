-- Add new columns for Assembly Member details
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS document_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS represented_unit VARCHAR(50);

-- Sync existing data (Optional: backfill from username/units if needed)
-- defaulting document_number to username for existing users
UPDATE public.users 
SET document_number = username 
WHERE document_number IS NULL;

-- Ensure RLS policies allow reading these new columns (User profile policies usually SELECT *)
-- No changes needed to policies if they use SELECT * or implicitly allow all columns, 
-- but good to verify. Current policies allow SELECT using (true) for profiles, so it's fine.
