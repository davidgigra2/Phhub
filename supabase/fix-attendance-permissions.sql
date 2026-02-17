-- ==============================================================================
-- FIX: PERMISSIONS FOR ATTENDANCE & UNITS
-- Solves "User has no unit" error due to RLS hiding the unit data from Operator.
-- ==============================================================================

-- 1. Ensure UNITS table is readable by everyone (Authenticated)
-- This allows Operators to see the 'unit' details when querying a user.
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view units" ON public.units;

CREATE POLICY "Everyone can view units"
ON public.units
FOR SELECT
TO authenticated
USING (true);

-- 2. Ensure Function exists for safe role checking (Security Definer)
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

-- 3. Ensure Operators can view ALL Users (for document search)
DROP POLICY IF EXISTS "Operators and Admins can view all profiles" ON public.users;

CREATE POLICY "Operators and Admins can view all profiles"
ON public.users
FOR SELECT
TO authenticated
USING (
  get_my_role() IN ('ADMIN', 'OPERATOR')
);

-- 4. Ensure Users can view themselves (Standard)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;

CREATE POLICY "Users can view own profile"
ON public.users
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
);
