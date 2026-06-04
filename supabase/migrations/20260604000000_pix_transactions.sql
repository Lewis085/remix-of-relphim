CREATE TABLE IF NOT EXISTS public.pix_transactions (
    txid text PRIMARY KEY,
    amount numeric NOT NULL,
    donor_name text,
    donor_email text,
    donor_phone text,
    status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.pix_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny_public_pix_transactions" ON public.pix_transactions FOR ALL TO public USING (false) WITH CHECK (false);
