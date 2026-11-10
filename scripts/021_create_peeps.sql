CREATE TABLE IF NOT EXISTS public.peeps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '3 hours')
);

ALTER TABLE public.peeps ALTER COLUMN owner_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_peeps_expires_at ON public.peeps (expires_at);

ALTER TABLE public.peeps ENABLE ROW LEVEL SECURITY;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('peeps', 'peeps', false, 2097152, ARRAY['video/webm', 'video/mp4'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['video/webm', 'video/mp4'];
