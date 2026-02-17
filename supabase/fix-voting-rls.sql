-- 1. Votes: Allow Authenticated users to view OPEN votes
CREATE POLICY "Users can view open votes"
ON public.votes
FOR SELECT
TO authenticated
USING (status = 'OPEN' OR (select role from auth.users where id = auth.uid()) = 'authenticated'); -- Or just true for simplicity if public results

-- Let's make it simple for now: Authenticated users can see ALL votes (or at least OPEN ones)
DROP POLICY IF EXISTS "Admins can manage votes" ON votes; -- Drop old restrictive one if needed, or add new one
CREATE POLICY "Authenticated view votes"
ON public.votes FOR SELECT TO authenticated USING (true);

-- 2. Vote Options: Allow read access
ALTER TABLE public.vote_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view options"
ON public.vote_options FOR SELECT TO authenticated USING (true);

-- 3. Ballots: Allow users to insert their own vote
-- We already have "Users can vote" in schema.sql but let's reinforce it
DROP POLICY IF EXISTS "Users can vote" ON ballots;

CREATE POLICY "Users can vote"
ON public.ballots
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND 
  exists (select 1 from votes where id = vote_id and status = 'OPEN')
);

-- Allow users to see their own ballots (to show "Vote Registered")
CREATE POLICY "Users view own ballots"
ON public.ballots
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
