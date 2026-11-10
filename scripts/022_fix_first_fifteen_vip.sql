WITH ranked_event_users AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY created_at ASC, id ASC) <= 15 AS should_be_vip
  FROM public.event_users
)
UPDATE public.event_users AS event_user
SET is_vip = ranked_event_users.should_be_vip
FROM ranked_event_users
WHERE event_user.id = ranked_event_users.id
  AND event_user.is_vip IS DISTINCT FROM ranked_event_users.should_be_vip;

CREATE OR REPLACE FUNCTION public.assign_first_fifteen_vip()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  participant_count INTEGER;
BEGIN
  PERFORM 1
  FROM public.events
  WHERE id = NEW.event_id
  FOR UPDATE;

  SELECT COUNT(*)
  INTO participant_count
  FROM public.event_users
  WHERE event_id = NEW.event_id;

  NEW.is_vip := participant_count < 15;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_first_fifteen_vip ON public.event_users;
CREATE TRIGGER assign_first_fifteen_vip
BEFORE INSERT ON public.event_users
FOR EACH ROW
EXECUTE FUNCTION public.assign_first_fifteen_vip();
