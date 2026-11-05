#!/usr/bin/env python3
"""Checks generated standalone HTML against the current game source."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
original = (ROOT / "index.html").read_text(encoding="utf-8")
standalone = (ROOT / "dist" / "Cape-Town-Rentals-Standalone.html").read_text(encoding="utf-8")

assert len(standalone) > len(original), "Assets were not embedded."
assert "data:image/webp;base64," in standalone, "Missing inline WebP imagery."
for id_ in ("classic", "muscle", "van", "hatch", "sedan", "bakkie", "jeep", "truck",
            "coupe", "bus", "sport", "super", "hyper"):
    assert "id:'" + id_ + "'" in standalone, f"Missing modern class: {id_}"
for name in ("modern-panelvan-side.webp", "modern-panelvan-topdown.webp",
             "muscle-car-side.webp", "classic-car-side.webp",
             "jeep-4x4-side.webp", "jeep-4x4-topdown.webp"):
    assert "assets/" + name in original
    assert "assets/" + name not in standalone, f"Unembedded file {name}"
assert not re.search(r'(?<![A-Za-z0-9_/])(?:assets|icons)/[A-Za-z0-9_.-]+\.(?:png|webp|svg)', standalone)
assert "function renderPlayerAuctions()" in standalone
assert "const KEY='cape-town-rentals-coastline-v3'" in standalone
print("PASS: current 13-class standalone game and Jeep vehicle art embedded.")
