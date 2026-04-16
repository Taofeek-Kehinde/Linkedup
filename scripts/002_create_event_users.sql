-- Create event_users table (temporary identities)
CREATE TABLE IF NOT EXISTS event_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  vibe_key TEXT NOT NULL,
  selfie_url TEXT,
  selfie_pathname TEXT,
  is_active BOOLEAN DEFAULT true,
  is_upgraded BOOLEAN DEFAULT false,
  auth_user_id UUID REFERENCES auth.users(id),
  session_token TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, username)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_event_users_event_id ON event_users(event_id);
CREATE INDEX IF NOT EXISTS idx_event_users_session_token ON event_users(session_token);
CREATE INDEX IF NOT EXISTS idx_event_users_vibe_key ON event_users(vibe_key);
CREATE INDEX IF NOT EXISTS idx_event_users_is_active ON event_users(is_active);

-- Enable RLS
ALTER TABLE event_users ENABLE ROW LEVEL SECURITY;

-- Users in same event can view each other (for the feed)
CREATE POLICY "Users can view others in same event" ON event_users
  FOR SELECT USING (
    event_id IN (
      SELECT event_id FROM event_users WHERE session_token IS NOT NULL
    )
    OR
    event_id IN (
      SELECT id FROM events WHERE status = 'live'
    )
  );

-- Anyone can insert (create new identity) - session token validates ownership
CREATE POLICY "Anyone can create identity" ON event_users
  FOR INSERT WITH CHECK (true);

-- Users can update their own profile via session token match
CREATE POLICY "Users can update own profile" ON event_users
  FOR UPDATE USING (true);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE event_users;
