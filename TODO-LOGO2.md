# TODO: Replace icons with logo.png in join/show pages

## Files:
1. components/join/join-flow.tsx (line ~240: Zap in code step logo)
2. components/show/show-feed.tsx (line ~310: Sparkles in empty state)

## Steps:
1. [x] Create TODO-LOGO2.md
2. [x] Edit components/join/join-flow.tsx: Zap → logo.png (w-16 h-16 container, 48x48 image)
3. [x] Edit components/show/show-feed.tsx: Sparkles → logo.png (w-20 h-20 container, 64x64 image)
4. [x] Added Next Image imports, preserved styling (bg/rounded/border)
5. [x] Test /join (code step) and /show/[eventId] empty state - logos display
6. [x] Fixed show-feed.tsx TS error: 'active' → 'live' in timer useEffect
7. [x] Complete
