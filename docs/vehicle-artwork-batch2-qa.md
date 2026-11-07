# Cape Town Rentals — Batch 2 corrected side-profile sprites
Date: 7 November 2026

This artwork-only change replaces the remaining seven damaged poster-derived transparent cutouts with individually generated, higher-resolution vehicle illustrations matching the approved lineup.

| Class | Replacement image |
|---|---|
| Donk (purple, oversized gold rims) | `assets/lineup-donk-side.webp` |
| Limousine (black stretched luxury car) | `assets/lineup-limo-side.webp` |
| Party Bus (blue/purple neon) | `assets/lineup-partybus-side.webp` |
| Tour Bus (white, blue Cape Town livery) | `assets/lineup-bus-side.webp` |
| Sports Car (red performance car) | `assets/lineup-sport-side.webp` |
| Supercar GT (orange supercar) | `assets/lineup-super-side.webp` |
| Hypercar (black with electric-blue accents) | `assets/lineup-hyper-side.webp` |

## Asset-level checks performed before commit
- Image paths match the seven existing `CAR_IMAGES` mappings; `index.html` does not need editing.
- Each image is a WebP with actual transparency and at least 12 pixels of transparent outer padding on every edge.
- Artwork was visually reviewed on contrasting backgrounds: complete wheels, spoilers, mirrors, front/rear bumpers and underbodies are present.
- Distinctive vehicle appearance is retained; no generic sprites are substituted.
- The unmodified top-down `MAP_CAR_IMAGES` assets remain separate.
- Source assets were cleaned of detached alpha speckles, resized using Lanczos, centered, and exported as WebP.
- Source PNG variants and an image review sheet are held in the batch delivery archive, not required by the game.

## What this does not change
Gameplay, vehicle IDs, rental or purchase pricing, fuel, upgrades, auctions, unlocks, save keys, and Version-3 saves are untouched.

GitHub Actions checks and the debug APK build must be reviewed separately after this commit. Physical Android device behavior has **not** been verified in this document. A debug APK is not a signed production release.
