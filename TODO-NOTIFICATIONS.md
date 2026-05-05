# Chat Notifications TODO

## Completed Changes:
1. [x] Fixed sound file path: `/notification.mp3` → `/Notification.mp3` (case-sensitive servers)
2. [x] Fixed message subscription to properly filter by chat_id instead of non-existent event_id column
3. [x] Green dot now shows for new messages even when tab is visible (removed `document.hidden` restriction)
4. [x] Added Web Audio API fallback beep when Notification.mp3 fails to play (browser autoplay policy)
5. [x] Reset unread count when opening chat list
6. [x] Added chatIdsRef to keep chat IDs updated without re-subscribing

## Technical Details:
- Messages table uses `chat_id` FK, not `event_id` directly - subscription now checks chat ID membership via ref
- Browser notification only shows when tab is hidden (correct behavior - notifications are intrusive)
- Sound plays for all new messages regardless of tab visibility
