# VIP Feature Implementation

## Steps
- [x] 1. Create migration script `scripts/009_add_is_vip.sql`
- [x] 2. Update `lib/types.ts` — add `is_vip` to EventUser, `isVip` to UserSession
- [x] 3. Update `components/join/join-flow.tsx` — include `isVip` in session (new + rejoin)
- [x] 4. Update `app/show/[eventId]/upgrade/page.tsx` — preserve `isVip` in session on upgrade
- [x] 5. Update `app/admin/event/[id]/page.tsx` — add VIP toggle for participants
- [x] 6. Update `components/show/user-card.tsx` — show blue tick.png when `is_vip`
- [x] 7. Update `components/show/show-feed.tsx` — show VIP tick on current user in header

