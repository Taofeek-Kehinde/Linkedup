# TODO: Fix all Event.status TypeScript errors ('active'/'pending' mismatch)

## Files from search:
1. app/admin/dashboard/page.tsx (filters, statusColors)
2. app/admin/event/[id]/page.tsx (multiple 'active', one 'pending')
3. app/auth/admin/page.tsx ('pending' in create)

## Steps:
1. [x] Create TODO-TS-STATUS.md
2. [x] Edit app/admin/dashboard/page.tsx (filters/statusColors/sections fixed)
3. [x] Edit app/admin/event/[id]/page.tsx (all 'active'→'live', 'pending'→'archived', timer/buttons updated)
4. [x] Edit app/auth/admin/page.tsx ('pending'→'archived')
5. [x] Verified no remaining TS errors for Event.status
6. [x] Logic preserved: events created 'archived' (ready to 'live'), timer/buttons work
7. [x] Complete
