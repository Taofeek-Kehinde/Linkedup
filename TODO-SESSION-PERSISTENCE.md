# Session Persistence Plan

## Problem
When user scans QR code to join an event, they should be able to continue from where they left off if they already have a session, instead of being forced to create a new profile.

## Current Behavior
- Session is stored in localStorage
- Home page has auto-rejoin logic that works when returning to the site
- Join page requires manual "Rejoin" with username + vibe key

## Solution
Modify join-flow.tsx to automatically check for existing session when QR code is scanned:

1. **Check existing session on code validation** - When validating event code from QR, also check if there's an existing local session for this event
2. **If session exists and user is valid** - Skip identity creation and go directly to the event
3. **Auto-rejoin logic** - Similar to home page, validate the session is still valid

## Files to Edit
- components/join/join-flow.tsx - Add auto-session check after validating event code

## Implementation Steps
1. After validating event code in validateCode(), check getLocalSession()
2. If session.eventId matches current event, verify user still exists in database
3. If valid, skip to event page instead of showing identity form
