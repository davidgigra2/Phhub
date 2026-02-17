-- Enable RLS on users table (already enabled, but good to ensure)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 1. Allow users to view their own profile (Critical for Dashboard)
CREATE POLICY "Users can view own profile" 
ON public.users 
FOR SELECT 
USING (auth.uid() = id);

-- 2. Allow admins to view all profiles (For management)
CREATE POLICY "Admins can view all profiles" 
ON public.users 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'ADMIN'
  )
);

-- Note: We already have policies for units, votes, etc. in schema.sql but they might need review.
