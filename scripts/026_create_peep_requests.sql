CREATE TABLE IF NOT EXISTS public.peep_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  peep_id UUID UNIQUE REFERENCES public.peeps(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '3 hours')
);

CREATE INDEX IF NOT EXISTS idx_peep_requests_expires_at
  ON public.peep_requests (expires_at);

ALTER TABLE public.peep_requests ENABLE ROW LEVEL SECURITY;
