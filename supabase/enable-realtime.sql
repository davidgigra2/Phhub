-- Enable Realtime for 'ballots' table
-- This allows clients to subscribe to INSERT/UPDATE/DELETE events

-- 1. Enable replication on the table (if not already enabled)
ALTER TABLE ballots REPLICA IDENTITY FULL;

-- 2. Add table to the 'supabase_realtime' publication
-- Check if publication exists, if so add table, else create it (standard Supabase setup usually has it)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'ballots') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE ballots;
  END IF;
END
$$;
