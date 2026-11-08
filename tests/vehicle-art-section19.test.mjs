import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const side=html.match(/const CAR_IMAGES=\{([^;]+)\};/)?.[1];
const roof=html.match(/const MAP_CAR_IMAGES=\{([^;]+)\};/)?.[1];
assert.ok(side&&roof,'Both original fleet image maps must exist');
const entries=s=>Object.fromEntries([...s.matchAll(/([a-z]+):'(assets\/[^']+)'/g)].map(m=>[m[1],m[2]]));
const sides=entries(side),tops=entries(roof);
const ids=["hatch","sedan","coupe","bakkie","jeep","van","classic","muscle","truck","tow","donk","limo","partybus","bus","sport","super","hyper"];
const added=["suv","convertible","shuttle","camper","luxsuv"];
assert.deepEqual(Object.keys(sides).sort(),[...ids,...added].sort(),'Original and new side art identifiers must exist');
assert.deepEqual(Object.keys(tops).sort(),[...ids,...added].sort(),'Original and new map identifiers must exist');
assert.equal(new Set(Object.values(sides)).size,22,'Side artwork cannot be duplicated between classes');
assert.equal(new Set(Object.values(tops)).size,22,'Top-down artwork cannot be duplicated between classes');
const seenHashes=new Set();
for(const id of ids){
 const file=sides[id];
 assert.equal(file,`assets/lineup-${id}-side.webp`,'Approved lineup art missing for '+id);
 const data=fs.readFileSync(path.join(root,file));
 assert.ok(data.length>4000,'Suspiciously small image: '+file);
 assert.equal(data.toString('ascii',0,4),'RIFF','Invalid image header: '+file);
 assert.equal(data.toString('ascii',8,12),'WEBP','Not a WebP image: '+file);
 assert.equal(data.toString('ascii',12,16),'VP8X','Missing WebP extended header: '+file);
 assert.ok(data[20]&0x10,'WebP must have an alpha channel: '+file);
 const unique=data.subarray(0,128).toString('hex');assert.ok(!seenHashes.has(unique),'Duplicate vehicle image: '+id);seenHashes.add(unique);
 assert.ok(fs.existsSync(path.join(root,tops[id])),'Existing Live Map roof sprite missing: '+id);
 assert.notEqual(file,tops[id],'Side and top views must remain separate');
}
for(const id of added){
 for(const [name,paths] of [['side',sides],['topdown',tops]]){
  const expected='assets/expansion-'+id+'-'+name+'.svg';
  assert.equal(paths[id],expected,'Missing new sprite mapping '+expected);
  const svg=fs.readFileSync(path.join(root,expected),'utf8');
  assert.ok(svg.length>=2250,'New sprite too small '+expected);
  assert.match(svg,/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
  assert.match(svg,/<title>[^<]+<\/title>/);
  assert.match(svg,/<linearGradient id="paint"/);
  assert.ok(!seenHashes.has(svg),'Duplicate new vehicle sprite');seenHashes.add(svg);
 }
}
assert.match(html,/<style id="ctr-vehicle-art-section-19">/);
assert.match(html,/function mapCarPose\(r,t=now\(\),type=''\)/);
assert.match(html,/const KEY='cape-town-rentals-coastline-v3'/);
assert.match(html,/const SLOT_PREFIX=KEY\+'-slot-'/);
assert.match(html,/function renderPremiumUpgrades\(\)/);
assert.match(html,/function renderProgress\(\)/);
console.log('PASS: Approved original 17 WebPs plus five distinct original vector side/top pairs and v3 compatibility.');
