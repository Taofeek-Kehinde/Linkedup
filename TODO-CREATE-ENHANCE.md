# Enhance /admin/create: Multi-Locations + Scheduled Start Time

## Steps:
### [x] 1. Create DB migration script (006_add_locations_and_scheduled_start.sql)
### [x] 2. User runs migration in Supabase SQL Editor
### [x] 3. Create this TODO
### [x] 4. Update lib/types.ts (add locations[], scheduled_start_at)
### [x] 5. Update app/auth/admin/page.tsx 
   - Multi-location chips UI (+ add, X remove)
   - Scheduled start time datetime input
   - Update form state, insert query
### [ ] 6. Update display files (dashboard, event/[id]) if needed
### [ ] 7. Test form & DB save
### [ ] 8. Mark complete & cleanup TODOs

**Run Migration First:**
Copy scripts/006_add_locations_and_scheduled_start.sql to Supabase → SQL Editor → Run.

**Post-migration:** Proceed with code edits.

