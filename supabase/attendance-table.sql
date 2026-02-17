-- Create attendance_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(unit_id) -- Only one record per unit (present or not)
);

-- Enable RLS
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Admins and Operators can do EVERYTHING (Insert, Delete, Select)
CREATE POLICY "Admins/Operators manage attendance"
ON public.attendance_logs
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('ADMIN', 'OPERATOR')
    )
);

-- 2. Everyone (Authenticated) can VIEW attendance (for Quorum)
CREATE POLICY "Everyone views attendance"
ON public.attendance_logs
FOR SELECT
TO authenticated
USING ( true );

-- Enable Realtime (Idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'attendance_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_logs;
    END IF;
END $$;

-- Set Replica Identity Full (Required to receive 'unit_id' in DELETE events)
ALTER TABLE public.attendance_logs REPLICA IDENTITY FULL;
