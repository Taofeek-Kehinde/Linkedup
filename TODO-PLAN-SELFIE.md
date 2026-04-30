# Plan: Make Selfie Mandatory for Profile Pictures

## User Requirement
The user wants their selfie (taken in selfie-capture) to be their profile picture in the chat and event page - not just a name displayed. The picture taken should be used as their profile, not optional.

## Current Analysis
- In `selfie-capture.tsx`, there's a "Skip for now" button that allows users to skip taking a selfie
- When skipped, `selfie_url` is stored as `null` in the database
- In chat and event pages, when `selfie_url` is null, only the user's initials/name is shown

## Information Gathered
1. **selfie-capture.tsx**: Has a "Skip for now" button that allows nil selfie
2. **join-flow.tsx**: Handles the selfie capture flow and saves to database
3. **upload-selfie.ts**: Utility to upload selfie to Supabase storage
4. **chat pages**: Display user's selfie or fallback to initials
5. **event-page.tsx**: Displays user's selfie or fallback to initials
6. **user-card.tsx**: Displays user's selfie or fallback to gradient with initial

## Plan

### Step 1: Make Selfie Mandatory in selfie-capture.tsx
- Remove the "Skip for now" button entirely OR
- Disable the skip functionality so users CANNOT proceed without taking a selfie

### Step 2: Ensure Selfie Upload Works Properly
- Verify the upload logic in join-flow.tsx handles the selfie correctly
- Ensure the selfie URL is properly stored in the event_users table

### Step 3: Update Display Components (if needed)
- Ensure chat page (/show/[eventId]/chat/[chatId]/page.tsx) shows selfie prominently
- Ensure event page (event-page.tsx) shows selfie prominently
- Ensure show-feed.tsx shows selfie prominently

## Dependent Files to Edit
1. `components/join/selfie-capture.tsx` - Remove/disable skip option
2. Potentially `components/chat/event-page.tsx` - Update display priority

## Followup Steps
1. Test the selfie capture flow
2. Verify selfie displays in chat page
3. Verify selfie displays in event page
