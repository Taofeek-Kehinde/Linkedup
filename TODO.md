# TODO

- [ ] Implement upload safety guards in `app/api/upload/route.ts`
  - [ ] Reject files > 10MB (plus small overhead)
  - [ ] Allow only image/jpeg, image/png, image/webp
  - [ ] Avoid Buffer allocation until after validation
  - [ ] Return clear JSON errors (413 / 415) instead of server crash
- [ ] Add a client-side improvement (if needed): ensure captured selfie blob is <= 10MB or compress before upload
- [ ] Run lint/build/tests if available

