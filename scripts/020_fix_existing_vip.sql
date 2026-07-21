-- Set the first 15 users (by join order) per event as VIP
-- This handles existing users who joined before auto-VIP was implemented
UPDATE event_users
SET is_vip = TRUE
WHERE id IN (
  SELECT id FROM (
    SELECT id, event_id, ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY created_at ASC) AS rn
    FROM event_users
  ) ranked
  WHERE ranked.rn <= 15
)
AND is_vip = FALSE;

