CREATE TABLE public.tentativas_de_pix (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  transaction_id TEXT,
  reference TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT INSERT ON public.tentativas_de_pix TO anon;
GRANT INSERT ON public.tentativas_de_pix TO authenticated;
GRANT ALL ON public.tentativas_de_pix TO service_role;

ALTER TABLE public.tentativas_de_pix ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log a pix attempt"
ON public.tentativas_de_pix
FOR INSERT
WITH CHECK (true);

CREATE INDEX idx_tentativas_de_pix_transaction_id ON public.tentativas_de_pix(transaction_id);
CREATE INDEX idx_tentativas_de_pix_created_at ON public.tentativas_de_pix(created_at DESC);