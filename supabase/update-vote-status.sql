-- Drop existing check constraint
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_status_check;

-- Add new check constraint with PAUSED
ALTER TABLE public.votes ADD CONSTRAINT votes_status_check 
CHECK (status IN ('DRAFT', 'OPEN', 'PAUSED', 'CLOSED'));
