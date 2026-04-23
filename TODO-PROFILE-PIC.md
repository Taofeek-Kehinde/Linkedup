# TODO: Profile Picture Selfie Naming

- [x] Understand current selfie upload flow
- [x] Read relevant files (upload route, join flow, types, schema)
- [x] Create implementation plan
- [x] Get user approval
- [x] Modify `app/api/upload/route.ts` to accept eventId/username and generate deterministic filename
- [x] Modify `components/join/join-flow.tsx` to send eventId/username with upload
- [x] Verify no other upload callers need updating
- [x] Fix `selfie-capture.tsx` onCapture prop type
- [x] Add sender avatars (selfie/profile pic) to chat messages in `chat/[chatId]/page.tsx`
- [x] Fix pre-existing missing `Badge` import in `app/auth/admin/page.tsx`
- [x] Verify TypeScript compiles cleanly
- [x] Remove unused `placeholder-user.jpg` from public folder (not referenced in code, but was causing confusion)

