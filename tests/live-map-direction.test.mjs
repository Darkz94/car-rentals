import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const scripts=[...html.matchAll(/<script(?:\\s[^>]*)?>([\\s\\S]*?)<\\/script>/gi)].map(x=>x[1]);
assert.equal(scripts.length,2);
const js=scripts[0];
new vm.Script(js);
function slice(start,end){
 const a=js.indexOf(start),b=js.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,'Source boundary missing: '+start);
 return js.slice(a,b);
}
const region={hq:{name:'Cape Town HQ',x:242,y:234},blouberg:{name:'Bloubergstrand',x:275,y:72},paarl:{name:'Paarl',x:784,y:97},airport:{name:'Airport',x:540,y:279}};
const rentals=Array.from({length:12},(_,i)=>({id:'rent'+i,carId:'car'+i,customer:'Customer '+i,from:'hq',dest:'blouberg',start:1000,due:101000,payout:2000}));
const fleet=Array.from({length:12},(_,i)=>({id:'car'+i,type:'hatch',plate:'CA '+(100+i),status:'rented'}));
fleet[0].editionId='cape-cobra-67';
const state={rentals,fleet};
const ctx={state,DEST:region,Math,now:()=>26000,activePage:'map',window:{innerWidth:360,innerHeight:800},
 mapZoom:1,mapPanX:0,mapFocus:'hq',selectedRental:null,clamp:(v,a=0,b=100)=>Math.max(a,Math.min(b,v)),
 esc:v=>String(v),MAP_CAR_IMAGES:{hatch:'assets/art19-hatch-topdown.svg'},
 owned:id=>id==='hq',effectiveMapNight:()=>false,relativeTime:()=> '75s',
 vehicleRoofArt:c=>c.editionId?'assets/collector-cape-cobra-67-topdown.svg':'assets/art19-hatch-topdown.svg',
 editionOf:id=>id==='cape-cobra-67'?{id}:null};
vm.createContext(ctx);
const route=slice('function routePosition(','function startRental(');
const map=slice('function mapPortraitLive(){','function renderFleet(){');
const funcs=vm.runInContext(route+'\n'+map+'\n({mapCarPose,mapHeadingDegrees,mapViewBox,mapMarkerYScale,renderMap})',ctx);
const {mapCarPose,mapHeadingDegrees,mapViewBox,mapMarkerYScale,renderMap}=funcs;
const vb=mapViewBox().split(' ').map(Number);
assert.ok(vb[2]>650&&vb[2]<780&&vb[3]===620,'Portrait camera must show more of the region by default');
assert.ok(vb[0]<=275&&vb[0]+vb[2]>=784,'Zoomed-out overview covers Blouberg and Paarl');
const ratio=mapMarkerYScale();
assert.ok(ratio>.35&&ratio<.6,'Car markers remain proportionate in the tall presentation');
const going=mapHeadingDegrees(rentals[1],26000);
const returning=mapHeadingDegrees(rentals[1],76000);
const delta=((returning-going)%360+360)%360;
assert.ok(Math.abs(delta-180)<1,'Rental headings reverse on the return leg');
const collector=mapHeadingDegrees(rentals[0],26000,fleet[0]);
assert.ok(Math.abs((((collector-going)%360)+360)%360-90)<1,'West-facing collector artwork points in travel direction');
assert.notEqual(mapCarPose(rentals[1],26000),mapCarPose(rentals[2],26000),'Busy branch vehicles get stable visual spacing');
const saved=JSON.stringify(state);
let markup=renderMap(false);
assert.equal((markup.match(/data-mapcar=/g)||[]).length,12,'All moving vehicles stay visible');
assert.equal((markup.match(/class="map-direction-v11"/g)||[]).length,12,'Every rental shows its travel direction arrow');
assert.ok(markup.includes('href="assets/collector-cape-cobra-67-topdown.svg"'),'Collector roof sprite retained');
assert.ok(!markup.includes('class="map-car-label-v10"'),'Crowded maps hide unselected license plates');
assert.ok(markup.includes('preserveAspectRatio="none"'),'Portrait overview uses its full viewport');
ctx.selectedRental='rent0';markup=renderMap(false);
assert.equal((markup.match(/class="map-car-label-v10"/g)||[]).length,1,'Focused vehicle plate stays visible');
assert.ok(markup.includes('CA 100'),'Focused plate retained');
assert.ok(markup.includes('class="map-vehicle-caption-v11"'),'Plate remains outside rotating car artwork');
assert.equal(JSON.stringify(state),saved,'Camera and markers may not mutate saved gameplay');
ctx.activePage='business';markup=renderMap(true);
assert.ok(markup.includes('preserveAspectRatio="xMidYMid meet"'),'Other compact maps keep original aspect ratio');
assert.ok(js.includes("el.querySelector('.map-vehicle-v11')")&&js.includes("el.querySelector('.map-direction-v11')"),'Headings must update on real-time ticks');
assert.ok(js.includes("const KEY='cape-town-rentals-coastline-v3'"),'Save key preserved');
assert.ok(html.includes('ctr-live-map-direction-zoom-2026'),'Crowding and alert overlay CSS exists');
console.log('PASS: wider Cape overview, outbound/return heading, collector orientation, decluttered cars and safe saves');
