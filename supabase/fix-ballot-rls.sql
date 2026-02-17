-- Drop previous policies to avoid conflicts
DROP POLICY IF EXISTS "Users can vote" ON public.ballots;
DROP POLICY IF EXISTS "Users view own ballots" ON public.ballots;
DROP POLICY IF EXISTS "Users and Operators can vote" ON public.ballots;
DROP POLICY IF EXISTS "Users and Operators view ballots" ON public.ballots;

-- 1. INSERT Policy: Allow Proxy Voting
CREATE POLICY "Users and Operators can vote"
ON public.ballots
FOR INSERT
TO authenticated
WITH CHECK (
  -- Vote must be OPEN
  exists (select 1 from votes where id = vote_id and status = 'OPEN')
  AND
  (
    -- Allow if voting for self
    auth.uid() = user_id
    OR
    -- Allow if Operator/Admin (using the helper function)
    get_my_role() IN ('ADMIN', 'OPERATOR')
  )
);

-- 2. SELECT Policy: Allow Verification
CREATE POLICY "Users and Operators view ballots"
ON public.ballots
FOR SELECT
TO authenticated
USING (
  -- View own ballots
  auth.uid() = user_id
  OR
  -- Operator/Admin can view all (for validation checks)
  get_my_role() IN ('ADMIN', 'OPERATOR')
);
