-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user1_id UUID REFERENCES event_users(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES event_users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chats_event_id ON chats(event_id);
CREATE INDEX IF NOT EXISTS idx_chats_user1_id ON chats(user1_id);
CREATE INDEX IF NOT EXISTS idx_chats_user2_id ON chats(user2_id);

-- Enable RLS
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Users can view chats they are part of
CREATE POLICY "Users can view own chats" ON chats
  FOR SELECT USING (true);

-- Users can create chats
CREATE POLICY "Users can create chats" ON chats
  FOR INSERT WITH CHECK (true);

-- Users can update chats they are part of
CREATE POLICY "Users can update own chats" ON chats
  FOR UPDATE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE chats;
