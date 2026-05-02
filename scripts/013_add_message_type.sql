-- Add message_type column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';

-- Allow text, video, and audio message types
-- This is handled by the default value, no additional changes needed
