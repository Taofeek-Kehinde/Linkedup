# Linkedup TODO

## Host chat: user list + no message mixing

- [ ] Update `app/show/[eventId]/host-chat/page.tsx` to include a left sidebar that loads **all** `event_users` for the event (excluding the host account itself), rendered inside the existing chat container.
- [ ] Add a `selectedUserId` + `activeChatId` mapping: when host clicks a user profile in the sidebar, create/find the dedicated `chats` row for (user <-> HOST) and load its `messages`.
- [ ] Ensure message sending/subscription always targets the currently selected `chatId` (unsubscribe on change).
- [ ] Add virtualization/scroll-safe layout for up to 100+ users in the left sidebar.
- [ ] Ensure messages are rendered one per row with correct keys and alignment; fix any UI mixing by sorting by `created_at` and using stable `msg.id`.
- [ ] If current code only loads chats that include HOST but not all users, add a fallback: show user even when there is no chat yet, and create chat when selected.
- [ ] Add tests/manual verification notes.

