-- Add host_selfie_url to events table
ALTER TABLE public.events 
ADD COLUMN host_selfie_url text;

-- Create index
CREATE INDEX idx_events_host_selfie_url ON public.events (host_selfie_url);

