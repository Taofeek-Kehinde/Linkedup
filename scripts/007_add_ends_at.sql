-- Add ends_at column for auto-event expiration
ALTER TABLE events ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;

-- Index for queries
CREATE INDEX IF NOT EXISTS idx_events_ends_at ON events(ends_at);

-- Note: Run this in Supabase SQL Editor
