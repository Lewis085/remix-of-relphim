-- 1. Deny public on inter_token_cache and pix_notified
DROP POLICY IF EXISTS "Deny_public_inter_token_cache" ON public.inter_token_cache;
CREATE POLICY "Deny_public_inter_token_cache" ON public.inter_token_cache FOR ALL TO public USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Deny_public_pix_notified" ON public.pix_notified;
CREATE POLICY "Deny_public_pix_notified" ON public.pix_notified FOR ALL TO public USING (false) WITH CHECK (false);

-- 2. Remove all existing policies on tentativas_de_pix, then deny public
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'tentativas_de_pix' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.tentativas_de_pix', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE public.tentativas_de_pix ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny_public_tentativas_de_pix" ON public.tentativas_de_pix FOR ALL TO public USING (false) WITH CHECK (false);

-- 3. Fix search_path on token lock functions
ALTER FUNCTION public.try_acquire_token_lock(int) SET search_path = public;
ALTER FUNCTION public.release_token_lock() SET search_path = public;

-- 4. Move extensions out of public schema
CREATE SCHEMA IF NOT EXISTS extensions;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net' AND extnamespace = 'public'::regnamespace) THEN
    ALTER EXTENSION pg_net SET SCHEMA extensions;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron' AND extnamespace = 'public'::regnamespace) THEN
    ALTER EXTENSION pg_cron SET SCHEMA extensions;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;