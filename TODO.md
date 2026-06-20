# TODO

- [ ] Fix HOST redirect loop by setting `linkedup_session` in localStorage when navigating from `app/admin/event/[id]/host-setup/page.tsx` to `/show/${eventId}/host-chat`.
  - Determine the correct `UserSession` payload shape from `lib/types.ts` and existing join flow (`lib/utils/session.ts`).
  - Implement `setLocalSession(...)` before `router.push(...)` in the HOST button handler.

- [ ] (Optional) Add a guard in `/show/[eventId]/host-chat/page.tsx` so it redirects only when required fields exist, not just when `linkedup_session` is missing/invalid.

- [ ] Test on Render: open host setup page and click HOST; verify it stays on `/show/:eventId/host-chat`.

