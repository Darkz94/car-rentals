# Approved lineup integration — 17 individual vehicles

User-approved reference: Cape Town Rentals Vehicle Lineup collage, 6 November 2026.

All 17 side images were extracted individually from the approved poster and mapped in class order:
1. hatch: `assets/lineup-hatch-side.webp`
2. sedan: `assets/lineup-sedan-side.webp`
3. coupe: `assets/lineup-coupe-side.webp`
4. bakkie: `assets/lineup-bakkie-side.webp`
5. jeep: `assets/lineup-jeep-side.webp`
6. van: `assets/lineup-van-side.webp`
7. classic: `assets/lineup-classic-side.webp`
8. muscle: `assets/lineup-muscle-side.webp`
9. truck: `assets/lineup-truck-side.webp`
10. tow: `assets/lineup-tow-side.webp`
11. donk: `assets/lineup-donk-side.webp`
12. limo: `assets/lineup-limo-side.webp`
13. partybus: `assets/lineup-partybus-side.webp`
14. bus: `assets/lineup-bus-side.webp`
15. sport: `assets/lineup-sport-side.webp`
16. super: `assets/lineup-super-side.webp`
17. hyper: `assets/lineup-hyper-side.webp`

Only the 17 `CAR_IMAGES` side-asset paths change. `MAP_CAR_IMAGES` and existing top-down route orientations remain intact, as do all classes, prices, rent amounts, customer matching, auctions, staff, upgrades, contract logic and `cape-town-rentals-coastline-v3` saves.

For source references, the previous images have not been removed. New WebP files are portable transparent art, supported by Android WebView and embedded into the standalone HTML by `rebuild.py`.

**Visual fidelity note:** The lineup reference was a single composite image, so the extracted vehicles match the pictured models and colourways, but contain less fine detail than true individually rendered 4K artwork; some transparency edges may need additional artistic refinement after user tests.

GitHub Actions runs JavaScript regression, the 17-class artwork check, standalone HTML packaging and Android APK compilation. Preview the updated images in the Dealership/Garage screens, then request explicit device visual approval. Do not sync `pre-release` or issue a signed production release without permission.
