-- Supabase Migration: Add Assembly scopes to votes and cascade deletes

-- 1. Add assembly_id to votes table
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'votes' AND column_name = 'assembly_id'
  ) THEN
    ALTER TABLE public.votes ADD COLUMN assembly_id UUID REFERENCES public.assemblies(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. Modify vote_options to cascade delete if not already
ALTER TABLE public.vote_options DROP CONSTRAINT IF EXISTS vote_options_vote_id_fkey;
ALTER TABLE public.vote_options ADD CONSTRAINT vote_options_vote_id_fkey FOREIGN KEY (vote_id) REFERENCES public.votes(id) ON DELETE CASCADE;

-- 3. Modify ballots to cascade delete when a vote or unit is deleted
ALTER TABLE public.ballots DROP CONSTRAINT IF EXISTS ballots_vote_id_fkey;
ALTER TABLE public.ballots ADD CONSTRAINT ballots_vote_id_fkey FOREIGN KEY (vote_id) REFERENCES public.votes(id) ON DELETE CASCADE;

ALTER TABLE public.ballots DROP CONSTRAINT IF EXISTS ballots_unit_id_fkey;
ALTER TABLE public.ballots ADD CONSTRAINT ballots_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;

-- 4. Modify attendance_logs to cascade delete when a unit is deleted
ALTER TABLE public.attendance_logs DROP CONSTRAINT IF EXISTS attendance_logs_unit_id_fkey;
ALTER TABLE public.attendance_logs ADD CONSTRAINT attendance_logs_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;

-- 5. Power Tokens
ALTER TABLE public.power_tokens DROP CONSTRAINT IF EXISTS power_tokens_unit_id_fkey;
ALTER TABLE public.power_tokens ADD CONSTRAINT power_tokens_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;

-- 6. User cleanup via assembly_id
-- users.assembly_id already has ON DELETE SET NULL, we want ON DELETE CASCADE
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_assembly_id_fkey;
ALTER TABLE public.users ADD CONSTRAINT users_assembly_id_fkey FOREIGN KEY (assembly_id) REFERENCES public.assemblies(id) ON DELETE CASCADE;

-- Note: The auth.users entries won't be deleted automatically by this if we delete from public.users. 
-- The server action will handle deleting the auth.users which cascade deletes public.users via auth.users(id).
-- But if we delete the assembly directly, it will wipe public.users.

-- 7. Update votes RLS policy to include assembly_id scope
-- Drop both old and replace with new
DROP POLICY IF EXISTS "Admins can manage votes" ON public.votes;
CREATE POLICY "Admins can manage votes" ON public.votes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN' AND assembly_id = votes.assembly_id)
  OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'SUPER_ADMIN')
);

DROP POLICY IF EXISTS "Users can vote" ON public.ballots;
CREATE POLICY "Users can vote" ON public.ballots FOR ALL USING (
  auth.role() = 'authenticated'
);

-- Note: The read logic will be handled via the backend app explicitly using .eq('assembly_id') where needed for users.
