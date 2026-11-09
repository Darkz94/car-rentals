import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(js,'Main inline game script exists');
new Function(js); // Syntax check of the actual playable game.
const slice=(start,end)=>{
 const a=js.indexOf(start),b=js.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,'Missing source markers '+start+' ... '+end);
 return js.slice(a,b);
};
const KEY='cape-town-rentals-coastline-v3',SLOT_PREFIX=KEY+'-slot-';
const baseline={version:3,cash:750700,fleet:[{id:'c1',type:'hatch',status:'available',plate:'CA 101'}],
 day:12,rep:4,settings:{mapTheme:'day',offlineEarnings:false}};
const copy=v=>JSON.parse(JSON.stringify(v));
function fakeStorage(){
 const data=new Map([[KEY,JSON.stringify(baseline)]]);
 return {data,getItem(k){return data.has(k)?data.get(k):null;},
  setItem(k,v){data.set(k,String(v));},removeItem(k){data.delete(k);}};
}
function setup(){
 const localStorage=fakeStorage(),notices=[];
 const ctx={state:copy(baseline),localStorage,KEY,SLOT_PREFIX,
  modal:null,modalCar:null,selectedCar:'c1',activePage:'overview',pendingImportSave:null,
  now:()=>100000,save:()=>{},restoreFinished:()=>{},render:()=>{},note:()=>{},
  notify:(msg,level)=>notices.push({msg,level}),
  readSave:()=>JSON.parse(localStorage.getItem(KEY))};
 vm.createContext(ctx);
 vm.runInContext(slice('function isCompatibleV3Checkpoint(','function makeCar('),ctx);
 vm.runInContext(slice('function importSaveFile(file)','initialize();'),ctx);
 return {ctx,localStorage,notices};
}
// Existing v3 records stay readable even when later optional fields are missing.
{
 const {ctx}=setup();
 assert.equal(ctx.isCompatibleV3Checkpoint({version:3,cash:100,fleet:[]}),true);
 assert.equal(ctx.isCompatibleV3Checkpoint({version:2,cash:100,fleet:[]}),false);
 assert.equal(ctx.isCompatibleV3Checkpoint({version:3,cash:100,fleet:[null]}),false);
 assert.equal(ctx.isCompatibleV3Checkpoint({version:3,cash:100,fleet:[{type:'hatch'}]}),false);
 assert.equal(ctx.isCompatibleV3Checkpoint({version:3,cash:Infinity,fleet:[]}),false);
}
{
 const {ctx,localStorage}=setup();
 const before=localStorage.getItem(KEY);
 localStorage.setItem(SLOT_PREFIX+'1',JSON.stringify({date:1,data:{version:3,cash:11,fleet:[null]}}));
 assert.equal(ctx.readSlot(1),null,'Malformed slot must be treated as unusable');
 assert.equal(ctx.restoreSlot(1),false,'Malformed slot rejected');
 assert.equal(localStorage.getItem(KEY),before,'Corrupt slot cannot overwrite the active autosave');
 assert.equal(ctx.readSlot(4),null,'Exactly three legacy slots');
}
{
 const {ctx,localStorage}=setup();
 const checkpoint={...copy(baseline),cash:123456,day:5};
 localStorage.setItem(SLOT_PREFIX+'2',JSON.stringify({date:4,data:checkpoint}));
 assert.equal(ctx.restoreSlot(2),true,'Valid version-3 checkpoint loads normally');
 assert.equal(ctx.state.cash,123456);
 assert.equal(JSON.parse(localStorage.getItem(KEY)).cash,123456);
 assert.equal(ctx.state.day,5);
}
{
 const {ctx,localStorage}=setup();
 const previous=localStorage.getItem(KEY),oldState=ctx.state;
 localStorage.setItem(SLOT_PREFIX+'1',JSON.stringify({date:4,data:copy(baseline)}));
 ctx.readSave=()=>{throw Error('Simulated checkpoint decode failure')};
 assert.equal(ctx.restoreSlot(1),false);
 assert.equal(localStorage.getItem(KEY),previous,'Restore failure must roll back the autosave');
 assert.equal(ctx.state,oldState,'Restore failure keeps the current company in memory');
}
{
 const {ctx,localStorage}=setup();
 const previous=localStorage.getItem(KEY);
 ctx.pendingImportSave={version:3,cash:42,fleet:[{id:3,type:4}]};
 assert.equal(ctx.confirmImportSave(),false,'Malformed JSON checkpoint rejected');
 assert.equal(localStorage.getItem(KEY),previous);
 ctx.pendingImportSave={...copy(baseline),cash:52100};
 ctx.readSave=()=>{throw Error('Simulated import decode failure')};
 assert.equal(ctx.confirmImportSave(),false);
 assert.equal(localStorage.getItem(KEY),previous,'Import failure rolls back the autosave');
}
{
 const {ctx,localStorage}=setup();
 ctx.pendingImportSave={...copy(baseline),cash:313131};
 assert.equal(ctx.confirmImportSave(),true,'Valid import restores normally');
 assert.equal(ctx.state.cash,313131);
 assert.equal(JSON.parse(localStorage.getItem(KEY)).cash,313131);
}
// Check actual rental return mechanics with deterministic dependency mocks.
{
 const car={id:'vehicle1',type:'sedan',plate:'CA 123',branch:'hq',status:'rented',
  fuel:100,clean:100,condition:100,body:100,parts:{}};
 const rental={id:'rent1',carId:car.id,customer:'Guest',from:'hq',dest:'airport',
  start:10000,due:30000,payout:2900,seconds:20,balanceVersion:2,contract:'hotels'};
 const state={cash:10000,rep:2,fleet:[car],rentals:[rental],
  stats:{earned:0,returned:0},branchReports:{},contractReports:{},incidents:[]};
 let t=25000,credits=0,saves=0;
 const ctx={state,now:()=>t,save:()=>saves++,round:Math.round,money:n=>'R'+Math.round(n),
  RENTAL_MIN_SECONDS:20,RENTAL_MAX_SECONDS:300,
  clamp:(n,a=0,b=100)=>Math.max(a,Math.min(b,n)),
  rand:(a,b)=>a===0&&b===100?100:a,Math,
  staffed:()=>false,perkEffect:()=>0,difficulty:()=>({expenses:1,incident:0}),
  weatherEffect:()=>({dirt:1,incidents:1}),isNight:()=>false,up:()=>false,
  CAR_PARTS:[['engine'],['tyres'],['brakes'],['oil'],['battery']],
  earn:n=>{state.cash+=n;state.stats.earned+=n;credits++;},
  awardRepXP:()=>{},checkAchievements:()=>{},note:()=>{},notify:()=>{},rentalRoundTripKm:()=>40,queueMileageOverhaul:()=>false,
  pick:a=>a[0],uid:()=> 'incident1'};
 vm.createContext(ctx);
 vm.runInContext(slice('function finishRental(r)','function addCar('),ctx);
 ctx.restoreFinished();
 assert.equal(credits,0,'No rental income before return timestamp');
 assert.equal(state.rentals.length,1);
 t=30000;
 ctx.restoreFinished();ctx.restoreFinished();
 assert.equal(credits,1,'One deposit for one returned car');
 assert.equal(state.stats.returned,1);
 assert.equal(state.cash,12900);
 assert.equal(state.branchReports.hq.revenue,2900);
 assert.equal(state.contractReports.hotels.count,1);
 assert.equal(car.status,'available');
 assert.equal(saves,1);
}
// Owner auction cash payout must also settle once, independently from rental revenue.
{
 const car={id:'carA',type:'bakkie',plate:'CA 444',status:'auction'};
 const a={id:'auctionA',carId:'carA',plate:'CA 444',type:'bakkie',
  status:'active',ends:100000,nextBidAt:200000,reserve:80000,highest:90000};
 const state={cash:1500,fleet:[car,{id:'carB',status:'available'}],
  stats:{earned:0,sales:0},ledger:[],playerAuctions:[a]};
 const ctx={state,now:()=>120000,round:Math.round,money:n=>'R'+Math.round(n),selectedCar:'carA',
  notify:()=>{},note:()=>{},pick:a=>a[0],rand:()=>1,Math};
 vm.createContext(ctx);
 vm.runInContext(slice('function finishPlayerAuction(a)','const PRESTIGE_PERKS='),ctx);
 ctx.advancePlayerAuctions(120000);ctx.advancePlayerAuctions(120000);
 assert.equal(state.cash,91500);
 assert.equal(state.stats.sales,90000);
 assert.equal(state.stats.earned,0,'Auction proceeds do not count as rental earnings');
 assert.equal(state.fleet.length,1);
 assert.equal(a.status,'sold');
 assert.equal(state.ledger.length,1);
}
for(const needle of [
 "const KEY='cape-town-rentals-coastline-v3'","const SLOT_PREFIX=KEY+'-slot-'",
 'function renderPlayerAuctions()','function renderStats()','function renderSettings()',
 'function renderMap(','function renderGarage()','function renderBranches()',
 'function signContract(','function gameDay(','function advancePlayerAuctions(',
 'function simulateOfflineBookings(','function exportSave(','function isCompatibleV3Checkpoint('
])assert.ok(js.includes(needle),'Core feature missing: '+needle);
for(const needle of [
 "if(modal!=='loadslot'||Number(id)!==Number(modalCar))return",
 "if(modal!=='dealerbuy'||id!==modalCar)return",
 "if(modal!=='staffhire'||id!==modalCar)return",
 "if(modal!=='sell'||id!==modalCar)return",
 "if(modal!=='reset')return",
 "if(modal==='importsave')pendingImportSave=null;modal=null;render();"
])assert.ok(js.includes(needle),'Missing confirmation safeguard: '+needle);
// Main Events navigation must always open Auctions, including after viewing Challenges.
assert.match(js,/if\(action==='page'\)\{[^}]*if\(id==='events'&&!targetSub\)activeSub\.events='auctions';/,'Main Events navigation should reset to Auctions while preserving explicit shortcuts');
// Portrait Garage heading must take a full row rather than squeeze beside both actions.
const mobileGarageRules=html.split('<style id="ctr-garage-section-04">')[1]?.split('</style>')[0]||'';
assert.match(mobileGarageRules,/@media\(max-width:720px\)\{[\s\S]*?\.garage-heading-v4\{display:grid;grid-template-columns:minmax\(0,1fr\)/,'Mobile Garage heading must use a single-column grid');
assert.match(mobileGarageRules,/\.garage-heading-actions\{width:100%;justify-content:flex-start;gap:7px\}/,'Mobile Garage actions must have their own full-width row');
// Dashboard simplification: keep rentals usable while directing feature discovery to bottom tabs.
const dashboardUI=js.split('function renderOverview(){')[1]?.split('function stat(')[0]||'';
const dashboardTip=js.split('function smartOverview(){')[1]?.split('function dashboardShortcut(')[0]||'';
assert.match(dashboardUI,/state\.offers\.slice\(0,2\)\.map\(offerCard\)/,'First two customer offers remain visible');
assert.match(dashboardUI,/extraOffers\.map\(offerCard\)/,'All remaining offers stay accessible');
assert.match(dashboardTip,/btn\('autorent'/,'Best-match dispatch stays on Dashboard');
assert.match(dashboardUI,/data-countdown-rental/,'Active rental countdowns remain visible');
assert.match(dashboardTip,/YOUR NEXT BEST MOVE/,'Keep concise next-step guidance');
assert.match(dashboardTip,/matching customer request/,'Best-match action should reflect current demand');
for(const duplicated of ['dashboardShortcut(','nextActions()','autoDeskControl()','renderMap(true)','renderRecentReturns(4)','renderLog(5)','dashboard-city-strip','dashboard-summary'])assert.ok(!dashboardUI.includes(duplicated),'Redundant Dashboard control remains: '+duplicated);
for(const feature of ['function renderFleet()','function renderBusiness()','function renderEvents()','function renderMapPage()','function autoDeskControl()','function offerCard('])assert.ok(js.includes(feature),'Existing tab feature missing: '+feature);
assert.match(html,/<style id="ctr-dashboard-simplified-2026">/,'Dashboard uses compact layout');
// Mobile portrait regression: dock labels must have breathing room; header must not overlap.
const portraitFix=html.split('<style id="ctr-dashboard-portrait-alignment-2026">')[1]?.split('</style>')[0]||'';
assert.match(portraitFix,/@media \(orientation:portrait\) and \(max-width:900px\)/,'Phone layout override must be portrait-only');
assert.match(portraitFix,/\.mobile-nav button\{[\s\S]*?min-height:72px;[\s\S]*?overflow:visible;/,'All six bottom-tab labels need full-height, unclipped buttons');
assert.match(portraitFix,/calc\(16px \+ env\(safe-area-inset-bottom,0px\)\)/,'Dock must leave room for Android bottom insets');
assert.match(portraitFix,/\.topbar\.arcade-header\.dashboard-header\{[\s\S]*?grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/,'Narrow header must use non-overlapping columns');
assert.match(portraitFix,/\.dashboard-header \.arcade-identity\{[\s\S]*?grid-column:1\/-1;[\s\S]*?grid-row:2;/,'Logo must be centered on its own narrow-phone row');
assert.match(portraitFix,/\.dashboard-header \.topmeta\{[\s\S]*?grid-column:2;[\s\S]*?grid-row:1;/,'Cash and settings must stay together on the top right');
assert.match(portraitFix,/\.dashboard-header \.arcade-page-copy\{[\s\S]*?grid-row:3;/,'Dashboard ribbon needs its own aligned row');
assert.match(html,/<nav class="mobile-nav" aria-label="Mobile navigation">\$\{NAV\.map/,'Original bottom tab navigation remains intact');
// Reference dashboard: Table Mountain background, three fixed header zones and six equal bottom tabs.
const referenceCss=html.split('<style id="ctr-dashboard-reference-layout-2026">')[1]?.split('</style>')[0]||'';
assert.match(referenceCss,/assets\/cape-town-waterfront-header\.webp/,'Bundled Cape Town reference background must be used');
assert.match(referenceCss,/grid-template-columns:minmax\(0,30fr\) minmax\(0,35fr\) minmax\(0,35fr\)/,'Narrow portrait header must use three stable columns');
for(const [part,selector] of [['LV','.dashboard-header .arcade-rep-chip'],['Logo','.dashboard-header .arcade-identity'],['Cash and settings','.dashboard-header .topmeta'],['Dashboard ribbon','.dashboard-header .arcade-page-copy']])assert.ok(referenceCss.includes(selector),'Missing fixed header zone '+part);
assert.match(referenceCss,/\.mobile-nav\{[\s\S]*?grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/,'Keep six evenly spaced Android navigation buttons');
assert.match(referenceCss,/\.mobile-nav button\{[\s\S]*?min-height:72px/,'Navigation labels must not clip');
const updatedHero=js.split('function smartOverview(){')[1]?.split('function dashboardReferenceInfo(){')[0]||'';
assert.ok(!updatedHero.includes('class="dashboard-next-car"')&&!updatedHero.includes('CAR_IMAGES.limo'),'The reference-approved compact hero must have no limousine');
const crispCss=html.split('<style id="ctr-dashboard-crisp-layout-2026">')[1]?.split('</style>')[0]||'';
assert.match(crispCss,/cape-town-waterfront-sharp\.svg/,'Crisp Table Mountain vector artwork must be used');
assert.match(js,/class="dashboard-cash-value"/,'Cash balance must be contained in the gold badge');
assert.match(crispCss,/\.dashboard-simplified \.dashboard-next-car\{display:none!important\}/,'Old hero vehicle layout must be disabled');
// Dashboard ordering: active rentals should be seen before new booking requests.
const homeSection=js.split('function renderOverview(){')[1]?.split('function stat(')[0]||'';
const activeRentalPosition=homeSection.indexOf('aria-label="Active Rentals"');
const customerRequestPosition=homeSection.indexOf('aria-label="Customer Requests"');
assert.ok(activeRentalPosition>=0&&customerRequestPosition>=0&&activeRentalPosition<customerRequestPosition,'Active Rentals must be above Customer Requests on Dashboard');
assert.match(homeSection,/dashboardSoonestRentals\(3\)\.map\(r=>/,'The active rental list must show the three soonest returns');
assert.match(homeSection,/extraOffers\.map\(offerCard\)/,'Customer requests must remain accessible');
console.log('PASS: Section 20 v3 save rollback, rental return payment, auction settlement and guarded user actions.');
