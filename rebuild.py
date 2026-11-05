#!/usr/bin/env python3
"""Package the CURRENT Cape Town Rentals game into one portable offline HTML file.

The legacy source_parts/ chunks are archival and intentionally not read.
The browser/Android source of truth is index.html plus assets/ and icons/.
"""
from __future__ import annotations

import base64
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "index.html"
OUTPUT = ROOT / "dist" / "Cape-Town-Rentals-Standalone.html"
ASSET_RE = re.compile(r"(?<![A-Za-z0-9_/])((?:assets|icons)/(?:[A-Za-z0-9_.-]+/)*[A-Za-z0-9_.-]+\.(?:png|webp|jpe?g|gif|svg))")

MIME = {
    ".png": "image/png",
    ".webp": "image/webp",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
}


def build() -> Path:
    game = SOURCE.read_text(encoding="utf-8")
    asset_paths = sorted(set(ASSET_RE.findall(game)))
    if not asset_paths:
        raise ValueError("No game assets found. Refusing to produce an incomplete build.")
    missing = [path for path in asset_paths if not (ROOT / path).is_file()]
    if missing:
        raise FileNotFoundError("Missing game asset(s): " + ", ".join(missing))

    embedded = {
        path: "data:" + MIME[(ROOT / path).suffix.lower()] + ";base64," +
              base64.b64encode((ROOT / path).read_bytes()).decode("ascii")
        for path in asset_paths
    }
    offline = ASSET_RE.sub(lambda match: embedded[match.group(1)], game)
    # A standalone file has no separate web app manifest.
    offline = re.sub(r'<link\s+rel=["\']manifest["\'][^>]*>', "", offline, flags=re.I)
    if ASSET_RE.search(offline):
        raise AssertionError("An external local image reference survived packaging.")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(offline, encoding="utf-8")
    print(f"Built {OUTPUT} with {len(embedded)} embedded images ({OUTPUT.stat().st_size:,} bytes)")
    return OUTPUT


if __name__ == "__main__":
    build()
