# TODO-ADMIN-SELFIE

## Plan / Fixes
- Fix admin-self selfie flow so that clicking **Use Photo** actually saves to Supabase and then redirects.
- Ensure `SelfieCapture` calls the `onCapture` prop with the blob, and that `app/admin-self/page.tsx` passes a handler that persists the blob (not only sets local state).
- Add loading state + disable button while saving, and handle blob null case.
- (Optional) Fix Next Image quality warning by updating Next config `images.qualities`.

## Progress
- [x] Locate current selfie flow (SelfieCapture -> onCapture -> save logic in `app/admin-self/page.tsx`)
- [x] Implement upload + redirect in `app/admin-self/page.tsx`

- [x] Wire `uploadSelfie` from `lib/utils/upload-selfie.ts` into the save handler

- [ ] Update UI: loading + error messaging
- [ ] Verify redirect URL: `/admin/event/${eventId}/host-setup`
- [ ] Run dev/build checks


