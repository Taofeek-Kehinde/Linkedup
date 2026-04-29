# TODO: Move Timer to Top of Individual Chat Page

**Goal:** Add live event timer at the very top of the private chat page (app/show/[eventId]/chat/[chatId]/page.tsx) for constant visibility while chatting.

## Steps:
1. Read relevant files (completed via tools)
2. Add Event import, Clock icon, states (event, timeRemaining), fetch event in loadData()
3. Add useEffect for live timer countdown (logic from ChatList)
4. Insert timer display as prominent row at top of header (above back/partner, sticky)
5. Test: Timer updates every second, shows remaining time correctly, visible while scrolling.
6. Update TODO.md
7. Complete task

**Status:** ✅ Completed - Timer added to top of chat header with live countdown, event fetch, full logic from ChatList.

Timer features:
- Fetches event data on load
- Live updates every second (h m s format)
- Prominent gradient bar at top of sticky header (primary theme)
- Handles ends_at fallback to created_at + duration
- Shows "Event ended" when expired
- Types fixed, TS errors resolved

Files updated: app/show/[eventId]/chat/[chatId]/page.tsx

Test: Navigate to a live event chat - timer appears immediately at top, counts down visibly while chatting.
