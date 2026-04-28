-- Add location column to event_users for multi-location events
ALTER TABLE event_users ADD COLUMN IF NOT EXISTS location TEXT;

-- Index for filtering users by location within an event
CREATE INDEX IF NOT EXISTS idx_event_users_location ON event_users(event_id, location);

