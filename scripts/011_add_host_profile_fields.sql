-- Add host profile fields to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS host_name TEXT,
ADD COLUMN IF NOT EXISTS host_bio TEXT,
ADD COLUMN IF NOT EXISTS host_instagram TEXT,
ADD COLUMN IF NOT EXISTS host_twitter TEXT,
ADD COLUMN IF NOT EXISTS host_selfie_url TEXT,
ADD COLUMN IF NOT EXISTS host_location TEXT;

