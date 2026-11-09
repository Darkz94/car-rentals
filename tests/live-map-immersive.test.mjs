import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(js,'Game JavaScript missing');
new vm.Script(js);
const slice=(a,b)=>{const i=js.indexOf(a),j=js.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,a+' section missing');return js.slice(i,j);};
const pageSrc=slice('function renderMapPage(){','function renderCommand(){');
const rent={id:'r1',customer:'Demo Driver',from:'hq',dest:'blouberg',carId:'h',payout:1900,due:80000};
const state={fleet:[{id:'h',type:'hatch',plate:'CA 101',status:'rented',branch:'hq'}],rentals:[rent],branches:['hq'],settings:{mapTheme:'auto'},weather:'Sunny'};
const destinations={hq:{name:'Cape Town HQ',x:242,y:234},blouberg:{name:'Bloubergstrand',x:275,y:72},paarl:{name:'Paarl',x:784,y:97}};
const ctx={state,DEST:destinations,mapFocus:'hq',selectedRental:null,openInfoPanels:new Set(),
 weatherEffect:()=>({icon:'☀'}),clockInfo:()=>({label:'11:40'}),esc:x=>String(x),
 renderMap:()=>'<div class="map-frame-v10"><svg class="map-svg-v10"></svg></div>',
 arcadeIcon:()=>'<svg></svg>',owned:id=>id==='hq',money:n=>'R'+n,
 relativeTime:()=> '30s',rentalCard:r=>'<div class="rental-card">'+r.customer+'</div>',
 vehicleRoofArt:()=> 'assets/lineup-hatch-side.webp',
 emptyState:()=>'<div>No journeys</div>',
 btn:(a,label,c,attrs='')=>'<button data-action="'+a+'" '+attrs+'>'+label+'</button>'};
const renderMapPage=vm.runInNewContext(pageSrc+'\nrenderMapPage',ctx);
const first=renderMapPage();
assert.ok(first.includes('class="fadein live-map-v10 live-map-focused-2026"'));
assert.ok(first.includes('class="live-map-toolbar-2026"')&&first.includes('class="live-map-telemetry-2026"'));
assert.ok(first.includes('class="live-map-activity-toggle-2026"')||first.includes('live-map-activity-toggle-2026'));
assert.ok(first.includes('Journeys &amp; destinations')&&first.includes('Vehicles on the Road'));
assert.ok(first.includes('data-action="maptheme"')&&first.includes('data-id="auto"')&&first.includes('data-id="day"')&&first.includes('data-id="night"'));
assert.ok(!first.includes('live-map-hero-v10')&&!first.includes('live-map-kpis-v10'),'Duplicate header and KPI cards are gone');
assert.ok(!first.includes('live-map-heading-v10'),'Old oversized map title is removed');
assert.ok(!first.includes('class="live-map-focus-v10"'),'Default screen opens with only map visible');
assert.ok(first.includes('<details class="live-map-activity-toggle-2026"')&&!first.includes('data-compact-info="map-activity-2026" open'));
ctx.mapFocus='paarl';
assert.ok(renderMapPage().includes('FOCUSED LOCATION'),'Tapping destination keeps focus card');
ctx.selectedRental='r1';
assert.ok(renderMapPage().includes('TRACKED RENTAL')&&renderMapPage().includes('Demo Driver'),'Rental tracking retained');
assert.ok(html.includes('id="ctr-live-map-immersive-2026"'));
assert.ok(html.includes('#app .main.main-live-focus>.topbar'));
assert.ok(js.includes("main-live-focus")&&js.includes("mapPanX=0"));
assert.ok(js.includes('liveMapDrag')&&js.includes('liveMapSuppressClickUntil'));
assert.ok(html.includes('#app .live-map-focused-2026 .map-frame-v10')&&js.includes('preserveAspectRatio='));
const camSrc=slice('function mapViewBox(){','function renderMap(compact=false){');
const cameraCtx={state,mapZoom:1,mapPanX:0,mapFocus:'hq',selectedRental:null,DEST:destinations,activePage:'map',
 window:{innerWidth:360,innerHeight:800},mapPortraitLive:()=>cameraCtx.activePage==='map'&&cameraCtx.window.innerWidth<=760,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),routePosition:()=>({x:275,y:100})};
const camera=vm.runInNewContext(camSrc+'\nmapViewBox',cameraCtx);
const [x,y,w,h]=camera().split(' ').map(Number);
assert.ok(w>=650&&w<=780&&h===620&&x>=0&&y===0,'Portrait viewBox shows a much wider Cape overview');
cameraCtx.mapPanX=450;
const [shiftX]=camera().split(' ').map(Number);
assert.ok(shiftX>x,'Swipe pan moves camera toward eastern destinations');
cameraCtx.activePage='business';
const [, ,normalW,normalH]=camera().split(' ').map(Number);
assert.equal(normalW,1000);assert.equal(normalH,620);
assert.ok(js.includes("const KEY='cape-town-rentals-coastline-v3'"),'Saves unchanged');
console.log('PASS: immersive Live map layout, weather modes, focus, swipe camera, existing save key');
