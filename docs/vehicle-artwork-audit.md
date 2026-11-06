# Cape Town Rentals — Section 19 vehicle artwork audit

Approved design: glossy deep-navy, electric-blue and gold arcade presentation. The original, class-specific vehicle art remains the source for each sprite. No class has been replaced with a generic duplicate.

## Changes for this section

- Updated City Hatchback and Adventure Bakkie side and top-down artwork to transparent, cropped SVG cutouts. Both originals had a bright fuchsia background incompatible with the game UI.
- Cleaned the Jeep 4x4 side and roof assets with the same transparency treatment to remove residual magenta fringes.
- Embedded the source image in each new SVG so it works in a standalone HTML and Android WebView, without external image requests.
- Standardised containment and positioning rules across Garage, Dealership, Rental Desk, Workshop, Performance and the smaller cards. Existing image scaling and in-game colour filters are retained.
- Left the other original illustrations intact where they were already recognisable. The original PNG/WebP files remain in the repository as source references.
- Kept all 17 gameplay class identifiers and map-sprite orientation offsets unchanged.

| Vehicle class | Side profile | Live Map overhead | Treatment |
| --- | --- | --- | --- |
| City Hatchback | art19-hatch-side.svg | art19-hatch-topdown.svg | Transparency cleanup, framing |
| Executive Sedan | executive-sedan-side.webp | executive-sedan-topdown.webp | Existing distinct art; improved UI containment |
| Coastal Coupe | coastal-coupe-side.webp | coastal-coupe-topdown.webp | Existing distinct art; improved UI containment |
| Adventure Bakkie | art19-bakkie-side.svg | art19-bakkie-topdown.svg | Transparency cleanup, framing |
| Jeep 4x4 | art19-jeep-side.svg | art19-jeep-topdown.svg | Fringe cleanup, improved framing |
| Modern Panel Van | modern-panelvan-side.webp | modern-panelvan-topdown.webp | Original utility silhouette retained |
| Classic Car | classic-car-side.webp | classic-car-topdown.webp | Original heritage silhouette retained |
| Muscle Car | muscle-car-side.webp | muscle-car-topdown.webp | Original muscle silhouette retained |
| Delivery Truck | delivery-truck-side.webp | delivery-truck-topdown.webp | Original truck body and wheels retained |
| Tow Truck | tow-truck-side.webp | tow-truck-topdown.webp | Crane and equipment retained |
| Donk | donk-side.webp | donk-topdown.webp | Custom wheels and bodywork retained |
| Limousine | limo-side.webp | limo-topdown.webp | Stretched passenger cabin retained |
| Party Bus | partybus-side.webp | partybus-topdown.webp | Multi-axle party bus retained |
| Tour Bus | tourbus-side.webp | tourbus-topdown.webp | Coach body retained |
| Sports Car | performance-sport-side.webp | performance-sport-topdown.webp | Distinct racing silhouette retained |
| Supercar GT | supercar-gt-side.webp | supercar-gt-topdown.webp | Distinct GT silhouette retained |
| Hypercar | hypercar-side.webp | hypercar-topdown.webp | Distinct low-profile silhouette retained |

**Validation:** Run `node tests/vehicle-art-section19.test.mjs`, `node tests/fleet-audit.test.mjs`, `python3 rebuild.py`, and `python3 tests/standalone-build.test.py`; the normal GitHub Actions debug Android workflow also packages and checks the actual assets.

**Limitations:** Automated asset checks verify files, mappings and transparency filters, but not how every SVG renders on all Android WebView versions. Visual approval requires the user's device inspection. Source bitmaps are preserved, not re-illustrated, so the retained images are still stylistically varied.

## Updated after approved lineup — 6 November 2026

The player approved a separate 17-vehicle lineup poster and explicitly requested **each of the 17 vehicle side views be replaced, one by one**. That approval supersedes the original side-view selection described above.

All 17 side images now point to `assets/lineup-<class-id>-side.webp`. They were individually extracted from the approved image, preserving its exact vehicle design and colours (white hatchback, black sedan, blue coupe, silver pickup, orange Jeep, turquoise classic, yellow tow truck, purple Donk, etc.). They use transparency and remain unique by class. The existing 17 map overhead images are retained because the poster contains side views only. Original art files are kept in the repository as non-destructive source references. No vehicle data, economy, save keys or gameplay identities changed.

**Image-source limitation:** The original poster is a composite, not separate full-resolution renders. Therefore the individual cutouts inherit its pixel detail and may have small matte/edge imperfections. Review on Android before approving production publishing.
