
ALTER TABLE events ALTER COLUMN location DROP NOT NULL;
ALTER TABLE events ALTER COLUMN location SET DEFAULT NULL;

-- Add new columns
ALTER TABLE events ADD COLUMN IF NOT EXISTS locations TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE events ADD COLUMN IF NOT EXISTS scheduled_start_at TIMESTAMPTZ;

-- Update indexes if needed
CREATE INDEX IF NOT EXISTS idx_events_locations ON events USING GIN(locations);
CREATE INDEX IF NOT EXISTS idx_events_scheduled_start_at ON events(scheduled_start_at);

-- Note: Run this in Supabase SQL Editor
