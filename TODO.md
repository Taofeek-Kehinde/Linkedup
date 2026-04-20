# Admin Auth: Change Email to Event Name + Password

**Status:** In Progress

## Steps:

### [x] 1. Create this TODO.md file
### [x] 2. Edit app/admin/page.tsx 
   - Rename email states to eventName states
   - Change input type="email" to "text" 
   - Labels "Email" → "Event Name"
   - Placeholders to event examples
   - Convert eventName to email = `${eventName}@admin.linkupapp.com` before Supabase calls
   - Update messages to mention "event name"
### [x] 3. Test /admin signup with eventname "summerparty" + password
### [x] 4. Test login and redirect to dashboard
### [x] 5. Verify event creation works
### [x] 6. Update TODO.md to mark complete
### [x] 7. Final test & attempt_completion

**Notes:**
- Uses same Supabase email/password auth pattern as user login
- Eventname saved as email in Supabase (e.g. summerparty@admin.linkupapp.com)
- No schema changes needed

