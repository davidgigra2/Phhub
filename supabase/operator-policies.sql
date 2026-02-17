-- ==============================================================================
-- FIX: OPERATOR/ADMIN PERMISSIONS FOR USER LOOKUP
-- ==============================================================================

-- 1. Create a secure function to check the current user's role
-- This avoids infinite recursion in RLS policies by using SECURITY DEFINER
-- which bypasses RLS for the execution of the function itself.
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

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;


-- 2. Drop existing restrictive policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Operators and Admins can view all profiles" ON public.users;


-- 3. Policy: Users can see their OWN profile
CREATE POLICY "Users can view own profile"
ON public.users
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
);


-- 4. Policy: Operators and Admins can see ALL profiles
-- This is required for:
--   a) Operators to find users by username (cedula) for assisted voting
--   b) Admins to manage users
CREATE POLICY "Operators and Admins can view all profiles"
ON public.users
FOR SELECT
TO authenticated
USING (
  get_my_role() IN ('ADMIN', 'OPERATOR')
);

-- 5. Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
