import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
assert.equal(scripts.length,2,'The game must retain its inline script structure');
const js=scripts[0][1];
const decl=(name,ending)=>{
 const start=js.indexOf('const '+name+'=');
 assert.ok(start>=0,'Missing declaration '+name);
 const finish=js.indexOf(ending,start);
 assert.ok(finish>start,'Missing end of declaration '+name);
 return js.slice(start,finish+ending.length);
};
const getDecl=(name,ending)=>vm.runInNewContext(decl(name,ending)+'\n'+name);
const types=Array.from(getDecl('TYPES','];'));
const customers=Array.from(getDecl('CUSTOMER_TYPES','];'));
const contracts=Array.from(getDecl('CONTRACTS','];'));
const mapping=getDecl('CONTRACT_CUSTOMER_IDS','};');
const branches=Array.from(getDecl('BRANCHES','];'));
const destinations=getDecl('DEST','};');
const old=[
 {id:'hotels',name:'V&A Waterfront Hotels',icon:'🏨',need:'Sedan',rep:2,branch:'hq',premium:1.23,period:34,desc:'Executive arrivals and hotel airport runs.'},
 {id:'build',name:'BuildCon Logistics',icon:'🏗️',need:'Bakkie',rep:3,branch:'hq',premium:1.27,period:36,desc:'Recurring commercial and contractor bookings.'},
 {id:'vine',name:'Stellenbosch Wine Estates',icon:'🍷',need:'Bus',rep:5,branch:'stellenbosch',premium:1.4,period:40,desc:'Vineyard shuttle and wine-tour rentals.'},
 {id:'film',name:'Cape Film & Media',icon:'🎥',need:'Sport',rep:8,branch:'hq',premium:1.55,period:42,desc:'Premium productions and influencer bookings.'},
 {id:'lux',name:'Franschhoek Luxury Retreats',icon:'💎',need:'Super',rep:10,branch:'franschhoek',premium:1.8,period:42,desc:'Elite guests and luxury wine-valley travel.'}
];
const approved=[
 ['cityhop','CityHop Hotel Shuttles','Hatch',2,'hq',1.20,45,'airport','backpacker-leo'],
 ['capeadventure','Cape Adventure Expeditions','Jeep',3,'hq',1.28,48,'table','mountain-guide-kabelo'],
 ['capecouriers','Cape Peninsula Couriers','Van',4,'hq',1.25,50,'waterfront','cape-peninsula-courier'],
 ['sunsetcoast','Sunset Coast Getaways','Coupe',5,'hq',1.30,52,'chapman','coastal-engagement-couple'],
 ['heritageweddings','Cape Heritage Weddings','Classic',7,'franschhoek',1.38,55,'franschhoek','vintage-wedding'],
 ['roadrescue','Western Cape Road Rescue','Tow',8,'hq',1.35,58,'airport','highway-recovery-crew'],
 ['winelandsfreight','Winelands Freight Partners','Truck',9,'stellenbosch',1.40,60,'stellenbosch','construction-supply-team'],
 ['capemusic','Cape Music Video Studios','Donk',11,'hq',1.45,65,'camps','music-video-crew'],
 ['peninsulavip','Peninsula VIP Chauffeurs','Limo',13,'hq',1.50,70,'airport','diplomatic-reception-guest'],
 ['performanceclub','Cape Performance Club','Muscle',14,'hq',1.48,75,'chapman','cape-muscle-car-club'],
 ['celebrations','Cape Celebration Tours','Party Bus',16,'hq',1.55,80,'waterfront','university-graduation-group'],
 ['elitecollectors','Elite Collector Experiences','Hyper',25,'franschhoek',1.75,90,'camps','international-car-collector']
];
assert.equal(contracts.length,17,'Five original and twelve approved partners');
assert.equal(new Set(contracts.map(c=>c.id)).size,17,'Contract IDs must be unique');
assert.deepEqual(contracts.slice(0,5).map(c=>JSON.parse(JSON.stringify(c))),old,
 'The original five contracts must not be altered in any field');
assert.equal(customers.length,54,'Do not change original or VIP customer roster');
assert.equal(types.length,17,'Maintain the existing 17 vehicle classes');
for(const [i,expected] of approved.entries()){
 const [id,name,need,rep,branch,premium,period,dest,customerId]=expected;
 const c=contracts[i+5];
 assert.equal(c.id,id);assert.equal(c.name,name);assert.equal(c.need,need);
 assert.equal(c.rep,rep);assert.equal(c.branch,branch);assert.equal(c.premium,premium);
 assert.equal(c.period,period);assert.equal(c.dest,dest);assert.equal(mapping[id],customerId);
 const t=types.find(t=>t.category===need);
 assert.ok(t,'No matching vehicle for '+name);
 assert.equal(t.unlock,rep,'A new contract must not unlock vehicles early: '+name);
 assert.ok(branches.some(b=>b.id===branch),'Unknown contract branch '+branch);
 assert.ok(destinations[dest],'Unknown contract destination '+dest);
 const customer=customers.find(x=>x.id===customerId);
 assert.ok(customer&&customer.need===need&&customer.budget>0,'Invalid ordinary customer template for '+name);
}
assert.deepEqual(Object.keys(mapping).sort(),contracts.map(c=>c.id).sort(),'Exactly one customer template per contract');
assert.equal(mapping.hotels,'family-jacobs');assert.equal(mapping.lux,'film-producer');

const offerStart=js.indexOf('function newOffer(contract=null,forcedId=null){');
const offerEnd=js.indexOf('\nfunction initialize(){',offerStart);
assert.ok(offerStart>=0&&offerEnd>offerStart,'Contract offer generator missing');
let seq=0;
const offerState={rep:50,fleet:[],offers:[]};
const offerContext={
 state:offerState,now:()=>1000000,uid:prefix=>prefix+'_'+(++seq),
 round:Math.round,rand:(from,to)=>from,difficulty:()=>({revenue:1}),
 OFFER_LIFETIME_MS:60000,customerUnlocked:()=>true,
 selectRandomCustomer:pool=>pool[0]
};
const generate=vm.runInNewContext(decl('CUSTOMER_TYPES','];')+'\n'
 +decl('CONTRACT_CUSTOMER_IDS','};')+'\n'+js.slice(offerStart,offerEnd)+'\nnewOffer',offerContext);
for(const contract of contracts){
 const offer=generate(contract);
 assert.ok(offer,'Contract should create a booking: '+contract.id);
 assert.equal(offer.contract,contract.id);
 assert.equal(offer.customer,contract.name);
 assert.equal(offer.need,contract.need);
 assert.equal(offer.mult,1.55*contract.premium);
 assert.ok(offer.budget>0);
 assert.equal(offer.dest,contract.dest||({'hotels':'airport','build':'stellenbosch','vine':'franschhoek','film':'camps'}[contract.id]||customers.find(c=>c.id===mapping[contract.id]).dest));
 assert.equal(offer.expires,1060000);
 assert.equal(offer.vipBonus,undefined,'Contracts cannot inherit VIP bonuses');
}
assert.equal(offerState.offers.length,6,'Rental desk retains a six-offer cap');
const vip=customers.find(c=>c.id==='royal-guest-amara');
offerContext.selectRandomCustomer=()=>vip;
const special=generate(null);
assert.equal(special.vipBonus,.75,'VIP premiums remain available in the normal customer pool');
assert.equal(special.contract,null);

// Execute the production scheduler against simulated time and queues.
const scheduleStart=js.indexOf('const MAX_PENDING_CONTRACT_ENQUIRIES=');
const scheduleEnd=js.indexOf('function tick(){',scheduleStart);
assert.ok(scheduleStart>=0&&scheduleEnd>scheduleStart,'Fair scheduler missing');
const schedulerSource=js.slice(scheduleStart,scheduleEnd);
const liveState={contracts:contracts.map(c=>c.id),contractLast:{},offers:[]};
const createdIds=[];
const schedulerContext={state:liveState,CONTRACTS:contracts,newOffer:c=>{
 liveState.offers.push({id:'test-'+(createdIds.length+1),contract:c.id});createdIds.push(c.id);
 return liveState.offers[liveState.offers.length-1];
}};
const schedule=vm.runInNewContext(schedulerSource+'\nscheduleContractOffers',schedulerContext);
const allSeen=new Set();
for(let round=0;round<10;round++){
 const before=liveState.offers.length;
 const generated=schedule(1000000+round*1000);
 assert.ok(generated>=0&&generated<=3);
 assert.ok(liveState.offers.length<=6);
 assert.ok(liveState.offers.filter(o=>o.contract).length<=3);
 assert.equal(new Set(liveState.offers.map(o=>o.contract)).size,liveState.offers.length,
   'No duplicate active enquiry for one contract');
 for(const offer of liveState.offers)allSeen.add(offer.contract);
 if(allSeen.size===17)break;
 assert.ok(liveState.offers.length>=before);
 liveState.offers=[]; // Simulate player dispatch or timed expiry between batches.
}
assert.equal(allSeen.size,17,'All 17 signed partners must eventually receive enquiries');
assert.deepEqual(createdIds.slice(0,3),['hotels','build','vine'],
 'Oldest due customers should receive the first available slots');
liveState.offers=[
 {id:'r1',contract:null},{id:'r2',contract:null},{id:'r3',contract:null},
 {id:'r4',contract:null},{id:'r5',contract:null}
];
assert.equal(schedule(2000000),1,'Only the sixth desk slot may be filled');
assert.equal(liveState.offers.length,6);
assert.equal(liveState.offers.filter(o=>!o.contract).length,5,'Ordinary and VIP requests cannot be evicted');
assert.equal(schedule(2000001),0,'Full desk must never overflow');
liveState.offers=[{id:'existing',contract:'hotels'}];
liveState.contractLast.hotels=0;
schedule(2100000);
assert.equal(liveState.offers.filter(o=>o.contract==='hotels').length,1,
 'A signed partner cannot create two simultaneous enquiries');
liveState.offers=[{contract:'hotels'},{contract:'build'},{contract:'vine'}];
assert.equal(schedule(2200000),0,'Three existing contract offers occupy the contract allocation');
assert.equal(liveState.offers.length,3);
assert.ok(js.includes('VIP_OFFER_CHANCE=.07'));
assert.ok(js.includes('matchingContracts=CONTRACTS.filter(contract=>state.contracts.includes(contract.id)'));
assert.ok(js.includes("const KEY='cape-town-rentals-coastline-v3'")&&js.includes('version:3'));
assert.ok(js.includes('earn(r.payout+tip,'),'Contract payment still occurs on return');
assert.ok(!js.slice(js.indexOf('function signContract('),js.indexOf('function takeLoan(')).includes('earn('),
 'Signing contracts must not award money');
console.log('PASS: 17 contracts, original five unchanged, new customer mappings, bookings, VIPs, fair six-slot rotation, offline compatibility and save/payout safety.');
