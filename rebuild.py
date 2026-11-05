#!/usr/bin/env python3
"""Reconstruct the original game, apply visual upgrades, and produce an offline HTML."""
from pathlib import Path
import re
import base64
import json

ROOT=Path(__file__).resolve().parent
original="".join((ROOT/"source_parts"/f"part-{i:03d}.txt").read_text(encoding="utf-8") for i in range(18))
assert len(original)==7053414 and "function bo(){" in original, "Missing or damaged source part"
css=(ROOT/"visuals/showroom.css").read_text(encoding="utf-8")
art=(ROOT/"visuals/showroom-art.js").read_text(encoding="utf-8")
html=original.replace("<title>React Artifact</title>","<title>Cape Town Rentals | Definitive Game</title>",1)
html=html.replace("</style>",css+"\n</style>",1)
html=html.replace("var xA=[",art+"\nvar xA=[",1)
bus_image='data:image/webp;base64,'+base64.b64encode((ROOT/'assets/tourbus-side.webp').read_bytes()).decode('ascii')
for model,source,use in [('sedan','il','Business'),('coupe','Rn','Coastal'),('truck','Rt','Logistics'),('bus','Rt','Wine Tram')]:
    replacement=('img:'+json.dumps(bus_image) if model=='bus' else 'img:createCapeCarArt("'+model+'")')
    html=html.replace('img:'+source+',use:"'+use+'"',replacement+',use:"'+use+'"',1)
for a,b in [
 ('className:"relative h-28 bg-black/50"','className:"relative h-28 bg-black/50 fleet-scene"'),
 ('className:"w-full h-full object-contain p-2"','className:"w-full h-full object-cover fleet-car-art"'),
 ('className:"h-14 w-full object-contain"','className:"h-14 w-full object-cover rounded-lg fleet-thumb"'),
 ('className:"min-h-screen bg-[#0a0a0a] text-white selection:bg-[#ff6b00]/30"','className:"min-h-screen game-shell text-white selection:bg-[#ff6b00]/30"'),
]:
    assert a in html, a
    html=html.replace(a,b,1)
start=html.index('dl=()=>{let v=')
end=html.index(',z=new Blob([v]',start)
html=html[:start]+'dl=()=>{let v="<!DOCTYPE html>\\n"+document.documentElement.outerHTML'+html[end:]
output=ROOT/'dist/Cape-Town-Rentals-Definitive-Game.html'
output.parent.mkdir(parents=True,exist_ok=True)
output.write_text(html,encoding='utf-8')
print(f"Standalone playable game: {output} ({output.stat().st_size:,} bytes)")
