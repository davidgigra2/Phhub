-- 1. Política para permitir a usuarios autenticados subir un archivo PDF
DROP POLICY IF EXISTS "Users can upload proxies" ON storage.objects;
CREATE POLICY "Users can upload proxies" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'proxies');

-- 2. Política para permitir a usuarios autenticados leer los archivos PDF
DROP POLICY IF EXISTS "Anyone can view proxies" ON storage.objects;
CREATE POLICY "Anyone can view proxies" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (bucket_id = 'proxies');

-- 3. (Opcional) Política para permitir a usuarios borrar sus propios archivos
DROP POLICY IF EXISTS "Users can delete their proxies" ON storage.objects;
CREATE POLICY "Users can delete their proxies" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'proxies' AND auth.uid() = owner);
