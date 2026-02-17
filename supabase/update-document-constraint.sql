-- 1. Update specific user 'apto101'
UPDATE public.users
SET document_number = '1088021330'
WHERE username = 'apto101';

-- 2. Data Cleanup: Ensure no other 'USER' has NULL document_number before adding constraint
-- Fallback to username if document_number is NULL
UPDATE public.users
SET document_number = username
WHERE role = 'USER' AND document_number IS NULL;

-- 3. Add Constraint: Assembly Members (USER) must have a document_number
ALTER TABLE public.users
ADD CONSTRAINT users_document_number_check 
CHECK (
  role != 'USER' OR document_number IS NOT NULL
);
