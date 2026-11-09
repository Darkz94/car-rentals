import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const html=fs.readFileSync(path.resolve(import.meta.dirname,'../index.html'),'utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
assert.equal(scripts.length,2);
const js=scripts[0][1];
const decl=(name,end)=>{const a=js.indexOf('const '+name+'=');const b=js.indexOf(end,a);assert.ok(a>=0&&b>a,name);return js.slice(a,b+end.length);};
const get=(name,end)=>vm.runInNewContext(decl(name,end)+'\n'+name);
const types=Array.from(get('TYPES','];')),customers=Array.from(get('CUSTOMER_TYPES','];'));
const contracts=Array.from(get('CONTRACTS','];'));
const specs=[{"id":"suv","category":"Compact SUV","name":"Compact SUV","model":"Cape Trail","unlock":6,"price":175000,"rate":1150,"tank":65},{"id":"convertible","category":"Convertible","name":"Convertible","model":"Atlantic Breeze","unlock":9,"price":215000,"rate":1400,"tank":55},{"id":"shuttle","category":"Minibus Shuttle","name":"Minibus Shuttle","model":"Peninsula Mover","unlock":15,"price":335000,"rate":1900,"tank":88},{"id":"camper","category":"Campervan","name":"Campervan","model":"Garden Route Explorer","unlock":18,"price":370000,"rate":2350,"tank":90},{"id":"luxsuv","category":"Luxury SUV","name":"Luxury SUV","model":"Atlantic Executive","unlock":24,"price":455000,"rate":2750,"tank":85}];
const regular=[{"id":"family-holiday-group","name":"Family Holiday Group","need":"Compact SUV","budget":3900,"dest":"table"},{"id":"business-traveller-suv","name":"Business Traveller","need":"Compact SUV","budget":4300,"dest":"airport"},{"id":"sunset-couple","name":"Sunset Couple","need":"Convertible","budget":4800,"dest":"chapman"},{"id":"coastal-tourist","name":"Coastal Tourist","need":"Convertible","budget":5200,"dest":"camps"},{"id":"airport-tour-group","name":"Airport Tour Group","need":"Minibus Shuttle","budget":7200,"dest":"airport"},{"id":"hotel-transfer-team","name":"Hotel Transfer Team","need":"Minibus Shuttle","budget":7500,"dest":"waterfront"},{"id":"garden-route-travellers","name":"Garden Route Travellers","need":"Campervan","budget":7600,"dest":"stellenbosch"},{"id":"camping-couple","name":"Camping Couple","need":"Campervan","budget":8000,"dest":"franschhoek"},{"id":"executive-delegation","name":"Executive Delegation","need":"Luxury SUV","budget":10500,"dest":"airport"},{"id":"luxury-family-holiday","name":"Luxury Family Holiday","need":"Luxury SUV","budget":11800,"dest":"franschhoek"}];
assert.equal(types.length,27);assert.equal(customers.length,78);assert.equal(contracts.length,17);
assert.equal(customers.filter(c=>c.vipBonus).length,8);
assert.equal(new Set(types.map(t=>t.id)).size,27);
assert.equal(new Set(customers.map(c=>c.id)).size,78);
for(const spec of specs){
 const car=types.find(t=>t.id===spec.id);assert.ok(car);
 for(const [key,val] of Object.entries(spec))assert.equal(car[key],val,key+' for '+spec.id);
 assert.equal(customers.filter(c=>c.need===spec.category).length,2);
}
for(const c of regular){
 const found=customers.find(x=>x.id===c.id);assert.ok(found&&!found.vipBonus);
 for(const [key,val] of Object.entries(c))assert.equal(found[key],val,key+' for '+c.id);
}
const canServe=vm.runInNewContext(decl('TYPES','];')+'\n'+decl('CATEGORY_EQUIVALENTS','};')+'\n'+js.slice(js.indexOf('function canServeCategory('),js.indexOf('function carMatch('))+'\ncanServeCategory');
for(const m of specs){
 assert.equal(canServe(m.category,m.category),true);
 assert.equal(canServe('Any',m.category),true);
 assert.equal(canServe('Tow',m.category),false);
}
const unlockSource=js.match(/function customerUnlocked\(c\)\{[^\n]*\}/)?.[0];assert.ok(unlockSource);
const state={rep:2,fleet:[]};
const unlocked=vm.runInNewContext(decl('TYPES','];')+'\n'+unlockSource+'\ncustomerUnlocked',{state});
for(const m of specs){
 const c=customers.find(c=>c.need===m.category);
 state.fleet=[];state.rep=m.unlock-1;assert.equal(unlocked(c),false);
 state.rep=m.unlock;assert.equal(unlocked(c),true);
 state.rep=2;state.fleet=[{type:m.id}];assert.equal(unlocked(c),true);
}
assert.match(js,/const KEY='cape-town-rentals-coastline-v3'/);
assert.match(js,/const REPUTATION_MAX_LEVEL=50/);
assert.match(js,/const VIP_OFFER_CHANCE=\.07/);
assert.match(js,/const MAX_PENDING_CONTRACT_ENQUIRIES=3/);
assert.match(js,/function finishRental\(r\)/);
assert.match(js,/function scheduleContractOffers\(t\)/);
const sides=get('CAR_IMAGES','};');
const tops=vm.runInNewContext(decl('MAP_CAR_IMAGES','};')+'\nMAP_CAR_IMAGES',{CAR_IMAGES:sides});
for(const m of specs){
 const side='assets/realistic-'+m.id+'-side.webp';
 const top='assets/expansion-'+m.id+'-topdown.svg';
 assert.equal(sides[m.id],side);
 assert.equal(tops[m.id],top);
 for(const file of [side,top])assert.ok(fs.existsSync(path.resolve(import.meta.dirname,'..',file)));
}
console.log('PASS: new fleet prices/unlocks, ten regular customers, 8 VIPs, matching, art, auctions, contracts and v3 save invariants.');
