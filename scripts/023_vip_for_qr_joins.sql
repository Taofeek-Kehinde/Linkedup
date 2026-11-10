ALTER TABLE public.event_users
  ADD COLUMN IF NOT EXISTS joined_via_qr BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.event_users
SET is_vip = FALSE
WHERE is_vip IS DISTINCT FROM FALSE;

DROP TRIGGER IF EXISTS assign_first_fifteen_vip ON public.event_users;
DROP FUNCTION IF EXISTS public.assign_first_fifteen_vip();

CREATE OR REPLACE FUNCTION public.assign_qr_join_vip()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  NEW.is_vip := COALESCE(NEW.joined_via_qr, FALSE);
  RETURN NEW;
END;
$$;

CREATE TRIGGER assign_qr_join_vip
BEFORE INSERT ON public.event_users
FOR EACH ROW
EXECUTE FUNCTION public.assign_qr_join_vip();
