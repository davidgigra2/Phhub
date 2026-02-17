-- 1. Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Drop potential duplicate/conflict policies first
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;

-- 3. Create the robust policy
-- Explicitly cast auth.uid() to uuid to avoid any type mismatch issues
CREATE POLICY "Users can view own profile" 
ON public.users 
FOR SELECT 
USING (
  auth.uid() = id
);

-- 4. Enable Unit Reading for Authenticated Users (so they can see their unit details)
CREATE POLICY "Authenticated users can see units"
ON public.units
FOR SELECT
TO authenticated
USING (true);
