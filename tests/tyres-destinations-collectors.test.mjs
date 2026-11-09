import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(js,'Main game script exists');
new vm.Script(js);
function chunk(start,end){
 const a=js.indexOf(start),b=js.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,'Missing source markers: '+start+' ... '+end);
 return js.slice(a,b);
}
const routes=vm.runInNewContext(chunk('const DEST={','const OVERHAUL_INTERVAL_KM=')+
 '\n({DEST,ROUTE_DISTANCE_KM,rentalRoundTripKm})',{round:Math.round});
assert.equal(Object.keys(routes.DEST).length,13,'Nine original and four new map locations');
for(const [branch,expected] of Object.entries({
 hq:{blouberg:20,muizenberg:26,paarl:65,somersetwest:50},
 stellenbosch:{blouberg:49,muizenberg:44,paarl:29,somersetwest:20},
 franschhoek:{blouberg:83,muizenberg:75,paarl:29,somersetwest:47}
})){
 for(const [dest,oneWay] of Object.entries(expected)){
  assert.equal(routes.ROUTE_DISTANCE_KM[branch][dest],oneWay);
  assert.equal(routes.rentalRoundTripKm(branch,dest),oneWay*2);
 }
 assert.equal(Object.keys(routes.ROUTE_DISTANCE_KM[branch]).length,13);
}
const customers=vm.runInNewContext(chunk('const CUSTOMER_TYPES=[','// Keep class-specific demand')+'\nCUSTOMER_TYPES');
assert.equal(customers.length,78);
for(const id of ['blouberg-surf-photographer','muizenberg-family-holiday','paarl-wine-tour-group','somerset-west-business-guest']){
 const c=customers.find(c=>c.id===id);
 assert.ok(c&&routes.DEST[c.dest]&&c.need&&c.budget>0,id);
}
const car={id:'tyre1',type:'hatch',plate:'CA 101',status:'available',condition:72,mileage:10000,
 parts:{engine:77,tyres:25,brakes:68,oil:84,battery:92},serviceHistory:[]};
const state={fleet:[car]},logged=[],charged=[];
const tyreCtx={state,Math,round:Math.round,clamp:(x,a=0,b=100)=>Math.max(a,Math.min(b,x)),
 typeOf:()=>({price:89000}),difficulty:()=>({expenses:1}),up:()=>false,
 spend:x=>{charged.push(x);return true;},logVehicle:(c,k,d,cost)=>{logged.push({k,cost});},
 note:()=>{},notify:()=>{},odometerLabel:c=>c.mileage+' km',money:v=>'R'+v,
 CAR_PARTS:[['engine'],['tyres'],['brakes'],['oil'],['battery']]};
const tyreFn=vm.runInNewContext(chunk('function tyreCondition(car){','function service(carId){')+
 '\n({tyreCondition,tyreWarningLabel,tyreReplacementCost,replaceTyres})',tyreCtx);
assert.equal(tyreFn.tyreWarningLabel(car),'🛞 Replace tyres soon');
assert.equal(tyreFn.tyreReplacementCost(car),895);
assert.equal(tyreFn.replaceTyres('tyre1'),true);
assert.equal(car.parts.tyres,100);
assert.equal(car.parts.engine,77);
assert.equal(car.condition,72);
assert.equal(car.mileage,10000);
assert.equal(charged.length,1);
assert.equal(logged.length,1);
assert.equal(logged[0].k,'Tyres replaced');
assert.equal(tyreFn.replaceTyres('tyre1'),false,'No duplicate replacement charge');
car.parts.tyres=10;car.status='rented';
assert.equal(tyreFn.replaceTyres('tyre1'),false,'No replacement during rental');
assert.equal(charged.length,1);
car.status='available';tyreCtx.up=()=>true;
assert.equal(tyreFn.tyreReplacementCost(car),0,'Company Workshop keeps replacement free');
assert.equal(tyreFn.replaceTyres('tyre1'),true);
assert.equal(charged[1],0);
const types=vm.runInNewContext(chunk('const TYPES=[','const COLLECTOR_EDITIONS=')+'\nTYPES');
assert.equal(types.length,27,'No new base vehicle classes');
const editionsCtx={CAR_IMAGES:{classic:'base-classic',grandtourer:'base-gt',rally:'base-rally',hyper:'base-hyper'},
 MAP_CAR_IMAGES:{classic:'roof-classic',grandtourer:'roof-gt',rally:'roof-rally',hyper:'roof-hyper'},
 typeOf:id=>types.find(t=>t.id===id),clamp:x=>x};
const editionFns=vm.runInNewContext(chunk('const COLLECTOR_EDITIONS=[','const DEST=')+
 '\n({COLLECTOR_EDITIONS,editionOf,vehicleName,vehicleSideArt,vehicleRoofArt})',editionsCtx);
const editions=editionFns.COLLECTOR_EDITIONS;
assert.equal(editions.length,4);
assert.equal(new Set(editions.map(e=>e.id)).size,4);
for(const e of editions){
 assert.ok(types.some(t=>t.id===e.type),'Collector edition references base class');
 for(const asset of [e.side,e.top])assert.ok(fs.existsSync(new URL('../'+asset,import.meta.url)),'Missing collector artwork '+asset);
 assert.equal(editionFns.vehicleName({editionId:e.id,type:e.type}),e.name);
 assert.equal(editionFns.vehicleSideArt({editionId:e.id,type:e.type}),e.side);
 assert.equal(editionFns.vehicleRoofArt({editionId:e.id,type:e.type}),e.top);
}
assert.equal(editionFns.vehicleSideArt({type:'classic'}),'base-classic');
const auctionCtx={state:{rep:40,fleet:[],auction:null,lastAuctionAt:0},Math:{...Math,random:()=>0},
 TYPES:types,pick:arr=>arr.find(x=>x.id==='classic'),round:Math.round,rand:(a,b)=>a,now:()=>1000,uid:()=> 'auction-one'};
auctionCtx.COLLECTOR_EDITIONS=editions;auctionCtx.COLLECTOR_AUCTION_CHANCE=.2;
const makeAuction=vm.runInNewContext(chunk('function makeAuction(){','function bidAuction(){')+'\nmakeAuction',auctionCtx);
makeAuction();
assert.equal(auctionCtx.state.auction.editionId,'cape-cobra-67','Rare edition can enter existing auction');
auctionCtx.state.fleet.push({editionId:'cape-cobra-67'});
makeAuction();
assert.equal(auctionCtx.state.auction.editionId,null,'Do not offer currently owned duplicate');
for(const marker of ["collectionDiscovered:[]","editionId=null","a.editionId||null","function renderCollectorGarage()","function tyreReplacementCost(","const KEY='cape-town-rentals-coastline-v3'","const OVERHAUL_INTERVAL_KM=400000","const RENTAL_MIN_SECONDS=20,RENTAL_MAX_SECONDS=300"]){
 assert.ok(js.includes(marker),'Required feature or save guard missing: '+marker);
}
console.log('PASS optional tyres, twelve new road distances, four collectible editions and save compatibility');
