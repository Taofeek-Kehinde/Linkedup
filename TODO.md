# Replacing Photo Selfies with 3-Second Looping Video

## Progress

### Step 1: Update `selfie-capture.tsx` — Record 3s video instead of 1 photo frame
- [x] Add MediaRecorder logic to record 3 seconds
- [x] Show recording countdown (3, 2, 1)
- [x] Preview recorded video for review
- [x] Retake / Confirm buttons work with video
- [x] Audio enabled for recording

### Step 2: Update `app/api/upload/route.ts` — Accept video MIME types
- [x] Add video/webm, video/mp4 to allowed types
- [x] Use correct file extension (.webm)
- [x] Increase max file size for videos

### Step 3: Update `user-card.tsx` & `SelfieImage` — Show looping video
- [x] SelfieImage renders `<video>` instead of `<img>` when src is a video URL
- [x] Auto-play, muted, loop, no controls, playsinline
- [x] Same fallback styling when video fails

### Step 4: Update `join-flow.tsx` — Use correct filename extension
- [x] Change 'selfie.jpg' to use video file extension in FormData

### Step 5: Build check
- [ ] Verify build passes

