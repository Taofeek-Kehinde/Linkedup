-- Fix oversized base64 image index error
DROP INDEX IF EXISTS idx_events_host_selfie_url;

-- host_selfie_url can hold large base64 images (no index needed)
