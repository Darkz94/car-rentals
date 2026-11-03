# Cape Town Rentals — Definitive Game

Complete browser-based rental-company simulation set in Cape Town, Stellenbosch and Franschhoek.

## Play
Open **`index.html` using GitHub Pages** or run `python -m http.server 8000` from this repository, then visit `http://localhost:8000`. The website loads the complete original game from 18 versioned text chunks, applies the visual enhancements, and runs the browser game.

## Build a single offline file
Run `python rebuild.py`. The script combines all 18 game-source parts with `visuals/showroom-art.js` and `visuals/showroom.css`, producing `dist/Cape-Town-Rentals-Definitive-Game.html`. Open the resulting HTML locally; no server or build tools are needed.

## What's included
- The complete original self-contained React game (including every embedded original game image) in `source_parts/`.
- Nine SVG vehicle illustrations in a reusable local vector scene generator (`visuals/showroom-art.js`).
- Cape Town sunset, Table Mountain-style skyline, polished vehicle panels and refined backgrounds (`visuals/showroom.css`).
- A corrected **Export as HTML** action that exports the actual playable page.
- The original **Export JSON** function for your player-progress snapshots.

**Important:** The game presently keeps progress in the browser session (memory), not in GitHub. Use **Export JSON** to keep your progress. GitHub stores the source and art, not player saves. No database or deployment credentials are required.

The source chunks are intentional: the original approximately 7 MB HTML file exceeded the connection-size limit for one GitHub upload. The chunks rebuild byte-for-byte to the original before the visual patches are applied.
