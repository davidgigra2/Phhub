-- CLEANUP SCRIPT
-- Run this to remove the test users so we can recreate them correctly via the API.

-- 1. Remove from Public Table (due to Foreign Key constraints, do this first if cascade isn't set, or auto if cascade is set)
DELETE FROM public.users WHERE email IN ('admin@phhub.com', 'operador@phhub.com', 'usuario@phhub.com');

-- 2. Remove from Auth Table (This is where the "Database error" comes from - duplicates)
DELETE FROM auth.users WHERE email IN ('admin@phhub.com', 'operador@phhub.com', 'usuario@phhub.com');

-- 3. Reset Sequences or other cleanup if needed (none for UUIDs)
