CREATE TABLE public.pix_notified (
  txid text PRIMARY KEY,
  notified_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.pix_notified TO service_role;

ALTER TABLE public.pix_notified ENABLE ROW LEVEL SECURITY;