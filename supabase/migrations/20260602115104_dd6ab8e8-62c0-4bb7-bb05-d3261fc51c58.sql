CREATE TABLE IF NOT EXISTS public.inter_token_cache (
  id text PRIMARY KEY DEFAULT 'singleton',
  access_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.inter_token_cache TO service_role;
ALTER TABLE public.inter_token_cache ENABLE ROW LEVEL SECURITY;
