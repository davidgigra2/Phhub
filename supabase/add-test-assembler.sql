-- Add Test Assembler (Unit 202)
DO $$
DECLARE
  var_user_id UUID;
  var_unit_id UUID;
  var_email TEXT := 'asamblea202@phub.com';
  var_password TEXT := 'password123';
  var_unit_num TEXT := '202';
  var_coeff NUMERIC := 0.0250;
  var_owner TEXT := 'Juan Pérez';
  var_doc_num TEXT := '202202202';
BEGIN
  -- 1. Create/Get Unit 202
  INSERT INTO public.units (number, coefficient, owner_name)
  VALUES (var_unit_num, var_coeff, var_owner)
  ON CONFLICT (number) DO UPDATE 
  SET coefficient = EXCLUDED.coefficient, owner_name = EXCLUDED.owner_name
  RETURNING id INTO var_unit_id;

  -- 2. Check/Create Auth User
  SELECT id INTO var_user_id FROM auth.users WHERE email = var_email;

  IF var_user_id IS NULL THEN
    var_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, 
      instance_id, 
      email, 
      encrypted_password, 
      email_confirmed_at, 
      role, 
      aud, 
      raw_app_meta_data, 
      raw_user_meta_data
    )
    VALUES (
      var_user_id, 
      '00000000-0000-0000-0000-000000000000', 
      var_email, 
      crypt(var_password, gen_salt('bf')), 
      now(), 
      'authenticated', 
      'authenticated', 
      '{"provider":"email","providers":["email"]}', 
      '{}'
    );
  END IF;

  -- 3. Create/Update Public User Profile
  INSERT INTO public.users (
    id, 
    email, 
    full_name, 
    role, 
    unit_id, 
    username, 
    document_number, 
    represented_unit
  )
  VALUES (
    var_user_id, 
    var_email, 
    var_owner, 
    'USER', 
    var_unit_id, 
    'asamblea202', 
    var_doc_num, 
    var_unit_num
  )
  ON CONFLICT (id) DO UPDATE 
  SET 
    username = EXCLUDED.username, 
    document_number = EXCLUDED.document_number,
    represented_unit = EXCLUDED.represented_unit,
    unit_id = var_unit_id;
    
  RAISE NOTICE 'User % created/updated successfully with Unit %', var_email, var_unit_num;
END $$;
