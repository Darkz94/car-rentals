import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const side=html.match(/const CAR_IMAGES=\{([^;]+)\};/)?.[1];
const roof=html.match(/const MAP_CAR_IMAGES=\{([^;]+)\};/)?.[1];
assert.ok(side&&roof,'Both legacy rendering maps must exist.');
const entries=s=>Object.fromEntries([...s.matchAll(/([a-z]+):'(assets\/[^']+)'/g)].map(m=>[m[1],m[2]]));
const sideImages=entries(side),roofImages=entries(roof);
const ids=['hatch','sedan','coupe','bakkie','jeep','van','classic','muscle','truck','tow','donk','limo','partybus','bus','sport','super','hyper'];
assert.deepEqual(Object.keys(sideImages).sort(),ids.slice().sort(),'Preserve every one of the 17 vehicle IDs.');
assert.deepEqual(Object.keys(roofImages).sort(),ids.slice().sort(),'Preserve every one of the 17 top-down sprite IDs.');
assert.equal(new Set(Object.values(sideImages)).size,17,'Every class must have distinct side artwork.');
assert.equal(new Set(Object.values(roofImages)).size,17,'Every class must have distinct map artwork.');
for(const id of ids){
 for(const file of [sideImages[id],roofImages[id]])assert.ok(fs.existsSync(path.join(root,file)),'Missing art: '+id+' '+file);
}
for(const id of ['hatch','bakkie','jeep']){
 for(const file of [sideImages[id],roofImages[id]]){
  assert.ok(file.endsWith('.svg'),id+' uses a cleaned transparent SVG asset.');
  const svg=fs.readFileSync(path.join(root,file),'utf8');
  assert.ok(svg.startsWith('<svg ')&&svg.includes('</svg>')&&svg.includes('data:image/'));
  assert.ok(svg.includes('feColorMatrix')&&svg.includes('feComposite'),'Background key missing for '+file);
  assert.ok(!/href="(?!data:)/.test(svg),'SVG depends on an external image: '+file);
 }
}
assert.match(html,/<style id="ctr-vehicle-art-section-19">/);
assert.match(html,/function mapCarPose\(r,t=now\(\),type=''\)/,'Retain existing map rotation.');
assert.match(html,/const KEY='cape-town-rentals-coastline-v3'/);
assert.match(html,/const SLOT_PREFIX=KEY\+'-slot-'/);
assert.match(html,/function renderPremiumUpgrades\(\)/);
assert.match(html,/function renderProgress\(\)/);
console.log('PASS: Section 19 — all 17 side/top-down pairs present, distinct, cleaned where needed, source IDs and v3 saves preserved.');
