-- Set document numbers for existing users to allow testing Operator flow
-- user '8835f838-8e6d-4786-9a2f-149b1a5126fe' is apto101
UPDATE users 
SET document_number = '101101101', represented_unit = 'APT-101'
WHERE username = 'apto101';

-- Ensure admin has a document number too
UPDATE users
SET document_number = '88888888'
WHERE role = 'ADMIN';

-- Create a dummy user for testing '77777777' if not exists, attached to a unit
-- First ensure a unit exists
INSERT INTO units (id, name, number, coefficient)
VALUES ('u-777', 'APT-777', '777', 0.005)
ON CONFLICT (id) DO NOTHING;

-- Insert user linked to Auth (this is tricky without Auth ID, so we just update an existing one if possible or create a dummy entry in public.users which might not work for login but works for lookup)
-- Better: Update the 'operator' user if exists, or just use 'apto101' with doc number '101101101'
