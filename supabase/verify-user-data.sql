-- CHECK DATA FOR DOCUMENT 202202202
SELECT 
    u.id as user_id, 
    u.full_name, 
    u.role, 
    u.document_number, 
    u.unit_id,
    un.number as unit_number,
    un.id as unit_pk
FROM public.users u
LEFT JOIN public.units un ON u.unit_id = un.id
WHERE u.document_number = '202202202';
