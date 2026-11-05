# Cape Town Rentals — Modern Arcade

The playable game and Android package use the **current `index.html`** as the source of truth. All vehicle sprites are loaded from `assets/`, with application icons in `icons/`.

## Playing and saving

- **Browser:** Serve this repository (for example, `python -m http.server 8000`) and open `http://localhost:8000/`, or use GitHub Pages.
- **Android:** A main-branch push triggers `.github/workflows/android-release.yml`, which packages the current `index.html`, assets and icons. Release publishing depends on repository signing configuration.
- **Player progress:** Version-3 saves use browser/Android WebView local storage and manual save slots; export JSON backups regularly, especially before uninstalling or clearing application data.
- **Auctions:** The public dealer lot sells used cars. Owned-vehicle auction listings use simulated bidders, lock the listed vehicle, and settle after 75 seconds. Auction sale proceeds are not rental earnings.

## Building a single offline HTML

Run:

```bash
python3 rebuild.py
```

This creates `dist/Cape-Town-Rentals-Standalone.html` from the **current** `index.html` and embeds the referenced image assets as data URIs. No server or repository sibling files are required to open the generated game locally. The default browser and Android builds remain untouched.

**Do not reconstruct a production build from `source_parts/`.** Those 18 original game fragments are archived historical material that predates the modern car rental implementation, including the Classic, Muscle and Van classes.

## Verification

Run:

```bash
node tests/fleet-audit.test.mjs
python3 rebuild.py
python3 tests/standalone-build.test.py
```

The fleet tests check the complete 15-class, 22-customer roster, horsepower, artwork paths, customer IDs and unlocks, category matching, public auctions and the owned-vehicle sale mechanism. The standalone test checks the packaged output, including its new vehicle images. A separate pull-request/feature-branch workflow runs these checks and compiles a debug Android APK; it does not publish a release or deploy to `main`.

See `docs/fleet-compatibility.md` before adding new vehicle classes.
