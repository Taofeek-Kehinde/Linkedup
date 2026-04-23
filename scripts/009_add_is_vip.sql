-- Add is_vip column to event_users table
ALTER TABLE event_users ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false;

-- Update existing rows to have is_vip = false
UPDATE event_users SET is_vip = false WHERE is_vip IS NULL;

