# Cape Town Rentals — Realistic 10-class artwork update (8 November 2026)

## Scope

Replace **only side-profile art mappings** for the ten added vehicle classes with realistic, original, transparent WebP renders, matching the quality of the original 17 classes. The older SVG side artwork stays in the repository but is no longer used by the game. The map still uses separate class-specific overhead SVG sprites, adjusted to the new paint palettes. Do **not** change purchased vehicles, price/rate/fuel/tier balancing, horsepower, customer demand, contracts, or save-game progress.

| ID | Class | Painted finish | New side art |
|---|---|---|---|
| suv | Compact SUV — Cape Trail | Copper orange | assets/realistic-suv-side.webp |
| convertible | Convertible — Atlantic Breeze | Ruby red | assets/realistic-convertible-side.webp |
| shuttle | Minibus Shuttle — Peninsula Mover | Cobalt blue | assets/realistic-shuttle-side.webp |
| camper | Campervan — Garden Route Explorer | Forest green | assets/realistic-camper-side.webp |
| luxsuv | Luxury SUV — Atlantic Executive | Champagne silver | assets/realistic-luxsuv-side.webp |
| safari | Safari 4x4 — Karoo Ranger | Sandstone beige | assets/realistic-safari-side.webp |
| motorhome | Motorhome — Winelands Wanderer | Ivory/navy | assets/realistic-motorhome-side.webp |
| rally | Rally Car — Cape Apex R | Racing blue | assets/realistic-rally-side.webp |
| grandtourer | Grand Tourer — Twelve Apostles GT | British racing green | assets/realistic-grandtourer-side.webp |
| armored | Armoured VIP SUV — Citadel Sentinel | Gloss black | assets/realistic-armored-side.webp |

All ten photo assets are 900×300 WebP with an alpha channel. Original 17 `assets/lineup-*-side.webp` entries are unchanged. Map artwork stays `assets/expansion-*-topdown.svg`. Preserve `cape-town-rentals-coastline-v3` saves and the signed Android package and keystore.

### Checks

The fleet and photo tests confirm IDs, paths, WebP type/alpha, dimensions, uniqueness and unchanged gameplay. Build checks embed all images in Android and standalone HTML. Run the 360/412px portrait audit and verify the signed APK before installing over an existing version. Export JSON save before updating; never uninstall as a normal update.
