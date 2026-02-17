-- 1. Votes: Restore Admin ALL permissions
-- We dropped the old one in fix-voting-rls.sql, so we need to add it back specifically for Admins
CREATE POLICY "Admins can manage votes"
ON public.votes
FOR ALL
TO authenticated
USING (
  exists (select 1 from users where id = auth.uid() and role = 'ADMIN')
);

-- 2. Vote Options: Admins need to create options too
-- We only enabled SELECT previously.
CREATE POLICY "Admins can manage vote options"
ON public.vote_options
FOR ALL
TO authenticated
USING (
  exists (select 1 from users where id = auth.uid() and role = 'ADMIN')
);

-- Note: The SELECT policies created in fix-voting-rls.sql still apply for normal users reading.
-- "Authenticated view votes" handles SELECT for everyone.
-- "Admins can manage votes" handles everything else for Admins.
