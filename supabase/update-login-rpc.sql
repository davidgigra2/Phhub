-- Update RPC to search by document_number as well
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
       OR pu.document_number = p_username; -- Match Username OR Document Number (Cedula)
    
    RETURN v_email;
END;
$$;
