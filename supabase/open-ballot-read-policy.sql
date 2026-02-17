-- Allow all authenticated users to view all ballots
-- This is necessary for the Client-side 'VoteResults' component to calculate totals
-- and for Realtime subscriptions to work for regular users.

DROP POLICY IF EXISTS "Users and Operators view ballots" ON public.ballots;

CREATE POLICY "Everyone can view ballots"
ON public.ballots
FOR SELECT
TO authenticated
USING ( true );
