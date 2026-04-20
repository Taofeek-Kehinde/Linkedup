# Event-Based Username Generation
## Status: In Progress

### 1. [ ] Create TODO-EVENT-USERNAMES.md
   - Track implementation

### 2. [x] Update lib/utils/generate-username.ts ✅
   - Added generateEventUsername(eventName, existingUsernames): `${first3letters}001`, `XYZ` random if taken
   - Client fallback generateEventUsernameClient
   - 999 attempts guarantee uniqueness

### 3. [x] Update components/join/join-flow.tsx ✅
   - validateCode/regenerateIdentity → generateEventUsernameClient(event.show_name)
   - Format takincandy001, takincandyXYZ (3 letters + 3digits/letters)
   - Uniqueness at DB insert level

### 4. [ ] Test Join Flow
   - /join?code= → identity shows event-based username
   - Multiple joins → unique suffixes (001, 002...)
   - Save to event_users

**Next: Update generate-username.ts**
