-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_code TEXT UNIQUE NOT NULL,
  show_name TEXT NOT NULL,
  location TEXT NOT NULL,
  duration_hours INTEGER DEFAULT 6,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  status TEXT DEFAULT 'live' CHECK (status IN ('live', 'ended', 'archived')),
  host_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on event_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_events_event_code ON events(event_code);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_host_id ON events(host_id);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Anyone can read live events
CREATE POLICY "Anyone can view live events" ON events
  FOR SELECT USING (status = 'live');

-- Host can view all their events
CREATE POLICY "Hosts can view own events" ON events
  FOR SELECT USING (auth.uid() = host_id);

-- Only authenticated users can create events
CREATE POLICY "Authenticated users can create events" ON events
  FOR INSERT WITH CHECK (auth.uid() = host_id);

-- Only host can update their events
CREATE POLICY "Hosts can update own events" ON events
  FOR UPDATE USING (auth.uid() = host_id);

-- Only host can delete their events
CREATE POLICY "Hosts can delete own events" ON events
  FOR DELETE USING (auth.uid() = host_id);
