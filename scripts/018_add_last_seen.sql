-- Add last_seen column to event_users table
ALTER TABLE event_users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;

-- Enable realtime for this column
ALTER TABLE event_users ENABLE ROW LEVEL SECURITY;

-- Create policy for updating last_seen
CREATE POLICY "Users can update own last_seen" ON event_users
  FOR UPDATE USING (true);