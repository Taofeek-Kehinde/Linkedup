# Admin Host Selfie Setup TODO

## Plan:
1. [ ] Create `app/admin-self/page.tsx` - selfie capture page
2. [ ] Add SQL for `events.host_selfie_url` column
3. [ ] Update `[id]/host-setup/page.tsx`:
   - Button "SETUP HOST PROFILE" → router.push('/admin-self')
   - Use `event.host_selfie_url` as background image
4. [ ] `/admin-self` → upload selfie → save to `events.host_selfie_url`
5. [ ] Test flow

## Steps:
1. [ ] Create SQL migration
2. [ ] Create admin-self page
3. [ ] Update host-setup navigation
4. [ ] Update host-setup background
5. [ ] Test complete flow

