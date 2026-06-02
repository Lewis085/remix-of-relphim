-- Adiciona coluna de lock à tabela inter_token_cache.
ALTER TABLE public.inter_token_cache
  ADD COLUMN IF NOT EXISTS locked_until timestamptz DEFAULT NULL;

CREATE OR REPLACE FUNCTION public.try_acquire_token_lock(lock_seconds int DEFAULT 10)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  current_lock timestamptz;
BEGIN
  SELECT locked_until INTO current_lock
    FROM public.inter_token_cache
    WHERE id = 'singleton'
    FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    INSERT INTO public.inter_token_cache (id, access_token, expires_at, updated_at, locked_until)
    VALUES ('singleton', '', now(), now(), now() + (lock_seconds || ' seconds')::interval)
    ON CONFLICT (id) DO UPDATE SET locked_until = now() + (lock_seconds || ' seconds')::interval;
    RETURN true;
  END IF;

  IF current_lock IS NULL OR current_lock < now() THEN
    UPDATE public.inter_token_cache
      SET locked_until = now() + (lock_seconds || ' seconds')::interval
      WHERE id = 'singleton';
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_token_lock()
RETURNS void
LANGUAGE sql
AS $$
  UPDATE public.inter_token_cache SET locked_until = NULL WHERE id = 'singleton';
$$;

GRANT EXECUTE ON FUNCTION public.try_acquire_token_lock(int) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_token_lock() TO service_role;