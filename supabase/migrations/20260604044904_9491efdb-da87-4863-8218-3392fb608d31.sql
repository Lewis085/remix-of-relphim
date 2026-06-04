CREATE TABLE IF NOT EXISTS public.pix_transactions (
    txid text PRIMARY KEY,
    amount numeric NOT NULL,
    donor_name text,
    donor_email text,
    donor_phone text,
    status text DEFAULT 'pending',
    ttclid text,
    user_agent text,
    ip_address text,
    url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

GRANT ALL ON public.pix_transactions TO service_role;

ALTER TABLE public.pix_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny_public_pix_transactions" ON public.pix_transactions;
CREATE POLICY "Deny_public_pix_transactions" ON public.pix_transactions FOR ALL TO public USING (false) WITH CHECK (false);