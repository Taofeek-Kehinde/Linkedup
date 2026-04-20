# Multi-Locations & Scheduled Start Implementation
## Status: In Progress

### 1. [x] Database Migration ✅
   - Run `scripts/006_add_locations_and_scheduled_start.sql` in Supabase SQL Editor

### 2. [x] Update Create Form ✅
   - app/admin/create/page.tsx: Multi-locations UI (+ button, list with pen/edit/delete), scheduled_start_at datetime-local input
   - Updated form submit to save `locations[]` and `scheduled_start_at`, removed old `location`


### 3. [x] Update Edit Form ✅
   - app/admin/event/[id]/page.tsx: Edit toggle, multi-locations UI, scheduled_start_at, duration edit, save updates

### 6. [x] Auto-end events after 6 hours when live ✅
   - startEvent sets ends_at = started_at + 6h fixed (override duration_hours)
   - Added ends_at to types, script updated

### 4. [ ] Update Types & Other References
   - Ensure lib/types.ts used correctly
   - Update any display components if needed

### 5. [x] Testing
   - Create event, verify DB data
   - Edit event, verify updates

**Next: DB migration**
