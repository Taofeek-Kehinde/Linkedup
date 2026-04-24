-- Add 'upcoming' status to events table
-- Run this in Supabase SQL Editor

-- First, drop the existing check constraint
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;

-- Add the new check constraint with 'upcoming'
ALTER TABLE events ADD CONSTRAINT events_status_check CHECK (status IN ('upcoming', 'live', 'ended', 'archived'));

-- Update RLS policy to allow reading upcoming events by hosts (already covered by host policy)
-- No changes needed to RLS policies since host policy allows hosts to see all their events

