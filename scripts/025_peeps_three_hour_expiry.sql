ALTER TABLE public.peeps
  ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '3 hours');

UPDATE public.peeps
SET expires_at = created_at + INTERVAL '3 hours'
WHERE expires_at > created_at + INTERVAL '3 hours';
