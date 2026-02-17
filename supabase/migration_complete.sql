-- ==============================================================================
-- PHUB VOTING SYSTEM - COMPLETE PRODUCTION MIGRATION
-- Use this script to set up your Supabase project with all necessary features:
-- 1. Realtime Voting
-- 2. Operator Assisted Voting
-- 3. Enhanced User Security & Login
-- ==============================================================================


-- ------------------------------------------------------------------------------
-- 1. ENABLE REALTIME
-- ------------------------------------------------------------------------------
-- Enable replication on 'ballots' table
ALTER TABLE ballots REPLICA IDENTITY FULL;

-- Add table to 'supabase_realtime' publication
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'ballots') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE ballots;
  END IF;
END
$$;


-- ------------------------------------------------------------------------------
-- 2. USER SCHEMA ENHANCEMENTS
-- ------------------------------------------------------------------------------
-- Add columns for identification and unit representation
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS document_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS represented_unit VARCHAR(50);

-- Sync existing data: Default document_number to username if NULL
UPDATE public.users 
SET document_number = username 
WHERE document_number IS NULL;

-- Add Constraint: Assembly Members (USER) must have a document_number
-- (Ensures operator can always identify them)
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_document_number_check;

ALTER TABLE public.users
ADD CONSTRAINT users_document_number_check 
CHECK (
  role != 'USER' OR document_number IS NOT NULL
);


-- ------------------------------------------------------------------------------
-- 3. LOGIN RPC (Username OR Document Number)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_email TEXT;
BEGIN
    SELECT au.email INTO v_email
    FROM public.users pu
    JOIN auth.users au ON pu.id = au.id
    WHERE pu.username = p_username 
       OR pu.document_number = p_username; -- Match Username OR Document Number
    
    RETURN v_email;
END;
$$;


-- ------------------------------------------------------------------------------
-- 4. SECURITY & PERMISSIONS (RLS)
-- ------------------------------------------------------------------------------

-- Helper function to safely check role without recursion
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT role FROM public.users WHERE id = auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;


-- USER PROFILE POLICIES
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Operators and Admins can view all profiles" ON public.users;

-- Users see own
CREATE POLICY "Users can view own profile"
ON public.users FOR SELECT TO authenticated
USING ( auth.uid() = id );

-- Operators/Admins see ALL (for lookup)
CREATE POLICY "Operators and Admins can view all profiles"
ON public.users FOR SELECT TO authenticated
USING ( get_my_role() IN ('ADMIN', 'OPERATOR') );

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;


-- BALLOT POLICIES (Voting)
DROP POLICY IF EXISTS "Users can vote" ON public.ballots;
DROP POLICY IF EXISTS "Users view own ballots" ON public.ballots;
DROP POLICY IF EXISTS "Users and Operators can vote" ON public.ballots;
DROP POLICY IF EXISTS "Users and Operators view ballots" ON public.ballots;

-- Allow Voting (Self OR Operator Proxy)
CREATE POLICY "Users and Operators can vote"
ON public.ballots FOR INSERT TO authenticated
WITH CHECK (
  exists (select 1 from votes where id = vote_id and status = 'OPEN')
  AND
  (
    auth.uid() = user_id -- Self
    OR
    get_my_role() IN ('ADMIN', 'OPERATOR') -- Proxy
  )
);

-- Allow Viewing (Open for Transparency/Live Results)
-- Necessary for 'VoteResults' component to aggregate totals on client side
CREATE POLICY "Everyone can view ballots"
ON public.ballots FOR SELECT TO authenticated
USING ( true );


-- ------------------------------------------------------------------------------
-- 5. ATTENDANCE LOGS (Quorum Management)
-- ------------------------------------------------------------------------------

-- Create attendance_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(unit_id) -- Only one record per unit (present or not)
);

-- Enable RLS
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Admins/Operators manage attendance" ON public.attendance_logs;
DROP POLICY IF EXISTS "Everyone views attendance" ON public.attendance_logs;

-- 1. Admins and Operators can do EVERYTHING (Insert, Delete, Select)
CREATE POLICY "Admins/Operators manage attendance"
ON public.attendance_logs
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('ADMIN', 'OPERATOR')
    )
);

-- 2. Everyone (Authenticated) can VIEW attendance (for Quorum)
CREATE POLICY "Everyone views attendance"
ON public.attendance_logs
FOR SELECT
TO authenticated
USING ( true );

-- Enable Realtime (Idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'attendance_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_logs;
    END IF;
END $$;

-- Set Replica Identity Full (Required to receive 'unit_id' in DELETE events)
ALTER TABLE public.attendance_logs REPLICA IDENTITY FULL;
