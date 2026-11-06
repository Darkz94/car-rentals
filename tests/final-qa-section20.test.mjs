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
 const ctx={state,now:()=>t,save:()=>saves++,round:Math.round,
  clamp:(n,a=0,b=100)=>Math.max(a,Math.min(b,n)),
  rand:(a,b)=>a===0&&b===100?100:a,Math,
  staffed:()=>false,perkEffect:()=>0,difficulty:()=>({expenses:1,incident:0}),
  weatherEffect:()=>({dirt:1,incidents:1}),isNight:()=>false,up:()=>false,
  CAR_PARTS:[['engine'],['tyres'],['brakes'],['oil'],['battery']],
  earn:n=>{state.cash+=n;state.stats.earned+=n;credits++;},
  awardRepXP:()=>{},checkAchievements:()=>{},note:()=>{},notify:()=>{},
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
 const ctx={state,now:()=>120000,round:Math.round,selectedCar:'carA',
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
console.log('PASS: Section 20 v3 save rollback, rental return payment, auction settlement and guarded user actions.');
