# Cape Town Rentals — vehicle artwork production-release readiness
_Last reviewed: 7 November 2026._

## Source being approved
- Approved 17-vehicle sprite source commit: `dabbd9a06498f984f3749056fa9339b4112caac6`.
- All 17 side-view class IDs map to `assets/lineup-*-side.webp` in `CAR_IMAGES`.
- `MAP_CAR_IMAGES` retains the existing top-down sprites.
- No economy, mechanics, local-storage keys, save-game schema or class IDs were altered in the artwork update.

## Verified checks
- `main` fleet-integrity and Android build: successful (GitHub Actions runs `42283419587`, `42283419549`).
- `pre-release` fleet-integrity and Android build: successful (runs `42329401419`, `42329401467`).
- A debug APK was inspected: all 17 mapped WebP sprite files and the current `index.html` are present.
- Test build 100 is available at https://github.com/Darkz94/car-rentals/releases/tag/test-latest

## Artwork quality disclosure
The approved poster-derived sprites have valid alpha channels but several retain visible dark-blue background or antialiased edge remnants (most noticeably on the hatchback, van, tow truck and donk). Treat this as a known visual limitation, not a passed clean-edge test. An experimental automatic-removal pass damaged windows/vehicle details and was **not committed**. Do not describe these assets as perfectly clean or recrop them without reviewing the whole vehicle against the approved poster.

## Blockers before the FIRST production-signed Android APK
1. In GitHub repository **Settings → Secrets and variables → Actions**, securely configure `APK_KEYSTORE_BASE64`, `APK_KEYSTORE_PASSWORD`, `APK_KEY_ALIAS`, `APK_KEY_PASSWORD`. Use a **stable private release keystore**, safely backed up offline. Never put signing secrets in git, issues, chat or logs.
2. Note: changing secret values alone does not start a build. After setup, manually run **Actions → Build and publish Android APK → Run workflow**, selecting `main`. This workflow can also auto-publish signed releases after later `main` game-file pushes. Do not trigger a workflow before the signing key is final.
3. Verify the **signed** APK with `apksigner verify --verbose`, check package ID `za.co.capetownrentals.arcade`, versionCode/versionName, and confirm a non-prerelease GitHub Release with the intended commit.
4. Back up Version 3 save JSON before any install/uninstall. A debug-signed test APK may not update in place to a separately signed production APK; do not claim data retention across uninstall or storage-clearing.
5. Install on a real Android device and smoke-test Garage, Dealership, Workshop, Rental Desk, Performance Garage, Auctions, Live Map, and opening an existing save. Automation and APK inspection **do not count as physical-device testing**.

## Production status
**Not released as a signed production APK as of this review.** The completed GitHub workflows produced a debug-only test APK because release-signing steps were skipped. Never relabel a debug APK as a signed production release.
