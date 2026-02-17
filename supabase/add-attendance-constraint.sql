-- Add UNIQUE constraint to attendance_logs.unit_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'attendance_logs_unit_id_key'
    ) THEN
        ALTER TABLE public.attendance_logs
        ADD CONSTRAINT attendance_logs_unit_id_key UNIQUE (unit_id);
    END IF;
END $$;
