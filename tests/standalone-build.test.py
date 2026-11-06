#!/usr/bin/env python3
"""Check standalone HTML against the approved 17-class source and image assets."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
original = (ROOT / "index.html").read_text(encoding="utf-8")
standalone = (ROOT / "dist" / "Cape-Town-Rentals-Standalone.html").read_text(encoding="utf-8")
assert len(standalone) > len(original), "Images are not embedded."
assert "data:image/webp;base64," in standalone, "Missing inline vehicle imagery."

ids = ("hatch", "sedan", "coupe", "bakkie", "jeep", "van", "classic", "muscle", "truck",
       "tow", "donk", "limo", "partybus", "bus", "sport", "super", "hyper")
for id_ in ids:
    assert "id:'" + id_ + "'" in standalone, f"Missing class {id_}"
    side = f"assets/lineup-{id_}-side.webp"
    assert side in original, f"Missing {id_} approved poster image mapping"
    assert side not in standalone, f"Side image was not bundled: {side}"
    assert (ROOT / side).is_file(), f"Side asset absent: {side}"
match = re.search(r"const MAP_CAR_IMAGES=\{([^;]+)\};", original)
assert match, "Missing preserved top-down map image mapping"
roof_paths = re.findall(r"assets/[A-Za-z0-9_.-]+\.(?:webp|png|svg)", match.group(1))
assert len(roof_paths) == 17, "Original 17 map sprites not present"
for asset in roof_paths:
    assert (ROOT / asset).is_file(), f"Map sprite missing: {asset}"
    assert asset not in standalone, f"Map sprite not embedded: {asset}"
assert not re.search(r'(?<![A-Za-z0-9_/])(?:assets|icons)/[A-Za-z0-9_.-]+\.(?:png|webp|svg)', standalone)
assert "function renderPlayerAuctions()" in standalone
assert "const KEY='cape-town-rentals-coastline-v3'" in standalone
print("PASS: 17 approved side art assets and original top-down map sprites embedded into standalone game.")
