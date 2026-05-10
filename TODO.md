# TODO

## Fix selfie fallback gradients (per-user)
- [ ] Update `components/show/user-card.tsx` to render the gradient fallback when `selfie_url` fails to load (use `onError`).
- [ ] Update `components/show/show-feed.tsx` to render the correct gradient fallback for:
  - current user header avatar
  - location list avatars
  - user card avatar images (if applicable)
  when `selfie_url` fails (use `onError`).
- [ ] Verify locally by opening:
  - `/show/[eventId]` with multiple locations
  - confirm both fallbacks appear when image URLs are invalid/unreachable.

