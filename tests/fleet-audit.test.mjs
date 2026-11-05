import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
assert.equal(scripts.length, 2, "Unexpected script count");
for (const source of scripts) new vm.Script(source);
const js = scripts[0];

function decl(name, ending) {
  const start = js.indexOf("const " + name + "=");
  assert.ok(start >= 0, "Missing " + name);
  const end = js.indexOf(ending, start);
  assert.ok(end > start, "Missing end of " + name);
  return js.slice(start, end + ending.length);
}
const typeSource = decl("TYPES", "];");
const customerSource = decl("CUSTOMER_TYPES", "];");
const typeList = vm.runInNewContext(typeSource + "\nTYPES");
const customerList = vm.runInNewContext(customerSource + "\nCUSTOMER_TYPES");
const contractIds = vm.runInNewContext(decl("CONTRACT_CUSTOMER_IDS", "};") + "\nCONTRACT_CUSTOMER_IDS");
const equivalence = vm.runInNewContext(decl("CATEGORY_EQUIVALENTS", "};") + "\nCATEGORY_EQUIVALENTS");
const byId = new Map(typeList.map(t => [t.id, t]));
assert.equal(typeList.length, 15);
assert.equal(byId.size, 15);
assert.equal(customerList.length, 22);
assert.equal(new Set(customerList.map(x => x.id)).size, 22);

const sides = js.slice(js.indexOf("const CAR_IMAGES="), js.indexOf("const MAP_CAR_IMAGES="));
const roof = js.slice(js.indexOf("const MAP_CAR_IMAGES="), js.indexOf("function createCapeCarArt"));
for (const t of typeList) {
  assert.ok(t.price > 0 && t.rate > 0 && t.tank > 0 && t.unlock >= 1);
  const matchSide = sides.match(new RegExp("\\b" + t.id + ":'([^']+)'"));
  const matchRoof = roof.match(new RegExp("\\b" + t.id + ":'([^']+)'"));
  assert.ok(matchSide && matchRoof, "Missing vehicle view " + t.id);
  for (const src of [matchSide[1], matchRoof[1]]) assert.ok(fs.existsSync(path.join(root, src)), "Missing asset " + src);
}
const horsepower = vm.runInNewContext("("+js.match(/function carHorsepower\(c\)\{const base=(\{[^}]+\})/)[1]+")");
assert.equal(horsepower.muscle, 470);
assert.equal(horsepower.classic, 200);
assert.equal(byId.get("van").price, 158000);
assert.equal(byId.get("van").rate, 1050);
assert.equal(byId.get("van").tank, 80);
const jeep = byId.get("jeep");
assert.ok(jeep, "Missing Jeep 4x4");
assert.equal(typeList[3].id, "jeep", "Jeep belongs immediately after Bakkie");
assert.equal(jeep.category, "Jeep");
assert.equal(jeep.price, 149000);
assert.equal(jeep.rate, 1000);
assert.equal(jeep.tank, 72);
assert.equal(jeep.unlock, 2);
assert.equal(horsepower.jeep, 210);
assert.equal(customerList.filter(c => c.need === "Jeep").map(c => c.id).sort().join(","),
  "adventure-couple,trail-explorer");
assert.ok(!("Jeep" in equivalence), "Jeep uses the existing exact-category fallback");
assert.ok(js.includes("type==='jeep'||type==='truck'"), "Jeep map direction must match top-down sprite");
const tow = byId.get("tow");
assert.ok(tow, "Missing Tow Truck");
assert.equal(typeList.findIndex(t => t.id === "tow"), typeList.findIndex(t => t.id === "classic")+1, "Tow Truck follows Classic");
assert.equal(typeList.findIndex(t => t.id === "tow"), typeList.findIndex(t => t.id === "truck")-1, "Tow Truck precedes Delivery Truck");
assert.equal(tow.category, "Tow");
assert.equal(tow.price, 275000);
assert.equal(tow.rate, 1650);
assert.equal(tow.tank, 90);
assert.equal(tow.unlock, 3);
assert.equal(horsepower.tow, 300);
assert.equal(customerList.filter(c => c.need === "Tow").map(c => c.id).sort().join(","), "insurance-recovery-team,roadside-rescue-nina");
assert.equal(customerList.find(c => c.id === "roadside-rescue-nina").budget, 5200);
assert.equal(customerList.find(c => c.id === "insurance-recovery-team").budget, 5800);
assert.ok(!("Tow" in equivalence), "Tow Truck matches its own customers only");
assert.ok(js.includes("type==='truck'||type==='tow'"), "Tow Truck roof sprite must face correctly on the map");
assert.ok(js.includes("['Bakkie','Jeep','Van','Tow','Truck','Bus']"), "Tow Truck must appear in the Commercial dealership view");
const donk = byId.get("donk");
assert.ok(donk, "Missing Donk");
assert.equal(typeList.findIndex(t => t.id === "donk"), typeList.findIndex(t => t.id === "muscle")-1, "Donk belongs immediately before Muscle");
assert.equal(typeList.findIndex(t => t.id === "donk"), typeList.findIndex(t => t.id === "truck")+1, "Donk follows Delivery Truck");
assert.equal(donk.category, "Donk");
assert.equal(donk.price, 365000);
assert.equal(donk.rate, 2300);
assert.equal(donk.tank, 68);
assert.equal(donk.unlock, 4);
assert.equal(horsepower.donk, 320);
assert.equal(customerList.filter(c => c.need === "Donk").map(c => c.id).sort().join(","), "music-video-crew,show-promoter-zane");
assert.ok(!("Donk" in equivalence), "Donk uses exact-category matching");
assert.ok(js.includes("type==='classic'||type==='donk'?0"), "Donk roof art should have horizontal map orientation");
assert.ok(js.includes("['Muscle','Donk'].includes(t.category)"), "Donk belongs in the custom/muscle dealer view");
assert.ok(js.includes("['Donk','Muscle','Sport','Super','Hyper'].includes(t.category)"), "Donk belongs in premium dealer view");

for (const customer of customerList) {
  const vehicle = typeList.find(t => t.category === customer.need);
  assert.ok(vehicle, "Unmapped demand " + customer.need);
  assert.ok(customer.id && customer.name && customer.budget > 0);
}
for (const id of Object.values(contractIds)) assert.ok(customerList.some(c => c.id === id));
assert.ok(js.includes("function customerUnlocked(c){return state.rep>=(TYPES.find"));
assert.ok(js.includes("canServeCategory(c.need,type.category)"));
assert.ok(js.includes("canServeCategory(contract.need,type.category)"));
assert.ok(js.includes("playerAuctions:Array.isArray(s.playerAuctions)?s.playerAuctions:[]"));
assert.ok(js.includes("const KEY='cape-town-rentals-coastline-v3'"));
assert.ok(js.includes("version:3"));
assert.ok(js.includes("earn(r.payout+tip,"));
assert.ok(js.includes("function renderPlayerAuctions()"));
assert.ok(js.includes("if(action==='listauction')"));
assert.ok(!js.includes("SPECIAL_CUSTOMER_UNLOCKS"));

const canServe = (requested, provided) => (equivalence[requested] || [requested]).includes(provided);
for (const customer of customerList) assert.ok(canServe(customer.need, customer.need));
assert.ok(canServe("Jeep", "Jeep"), "Jeep-specific rental matching");
assert.ok(!canServe("Jeep", "Van"), "No unapproved cross-class substitutions");
assert.ok(canServe("Tow", "Tow"), "Tow customer matching works");
assert.ok(!canServe("Tow", "Truck"), "No unapproved Tow cross-class substitutions");
assert.ok(canServe("Donk", "Donk"), "Donk customer matching works");
assert.ok(!canServe("Donk", "Muscle"), "No unapproved Donk substitutions");

const engine = js.slice(js.indexOf("function makeAuction(){"), js.indexOf("function buyPerk(id){"));
assert.ok(engine.includes("function advancePlayerAuctions("));
const testScript = [
  typeSource,
  "let time=1000,seq=0,selectedCar=null;",
  "let state={cash:20000000,rep:12,fleet:[],auction:null,playerAuctions:[],stats:{sales:0},ledger:[]};",
  "const now=()=>time,uid=p=>p+'_'+(++seq),round=Math.round;",
  "const typeOf=id=>TYPES.find(t=>t.id===id)||TYPES[0],rand=(a,b)=>a,pick=a=>a[0];",
  "const notify=()=>{},note=()=>{},money=n=>'R'+n,garageCapacity=()=>100;",
  "const bidReserve=()=>state.auction?.bidder==='You'?state.auction.playerBid:0;",
  "const freeCash=()=>state.cash-bidReserve();",
  "const getResale=c=>round(typeOf(c.type).price*(.38+.24*c.condition/100));",
  "const spend=amount=>{if(freeCash()<amount)return false;state.cash-=amount;return true;};",
  "const addCar=(id,price)=>{if(state.rep<typeOf(id).unlock||state.fleet.length>=100||!spend(price))return false;state.fleet.push({id:uid('car'),type:id,status:'available',condition:70,plate:id});return true;};",
  engine,
  "let passing=0;",
  "for(const t of TYPES){",
  "state.auction={id:uid('lot'),type:t.id,base:round(t.price*.6),highest:0,bidder:'',playerBid:0};",
  "let before=state.fleet.length; if(bidAuction()&&bidReserve()>0){closeAuction();if(state.fleet.length===before+1&&state.fleet.at(-1).type===t.id)passing++;}",
  "state.auction={id:uid('lot'),type:t.id,base:round(t.price*.68),highest:0,bidder:'',playerBid:0};",
  "before=state.fleet.length;if(buyAuctionNow()&&state.fleet.length===before+1&&auctionBuyNowPrice({type:t.id,base:t.price*.68})<=t.price)passing++;",
  "state.playerAuctions=[];state.fleet=[{id:'keep',type:'hatch',status:'available',condition:100,plate:'KEEP'},{id:'owned',type:t.id,status:'available',condition:100,plate:'OWNED'}];",
  "const cash=state.cash,listed=listCarForAuction('owned'),locked=state.fleet[1].status==='auction',duplicate=!listCarForAuction('owned');time+=76000;advancePlayerAuctions(time);",
  "const auction=state.playerAuctions[0],sale=auction.salePrice;advancePlayerAuctions(time+1000);",
  "if(listed&&locked&&duplicate&&auction.status==='sold'&&sale>0&&state.cash===cash+sale&&state.fleet.length===1)passing++;",
  "state.playerAuctions=[];state.fleet=[{id:'keep',type:'hatch',status:'available',condition:100,plate:'KEEP'},{id:'owned',type:t.id,status:'available',condition:100,plate:'OWNED'}];",
  "listCarForAuction('owned');Math.random=()=>1;time+=76000;advancePlayerAuctions(time);",
  "if(state.playerAuctions[0].status==='unsold'&&state.fleet[1].status==='available')passing++;Math.random=()=>0;",
  "}",
  "state.playerAuctions=[];state.fleet=[{id:'one',type:'hatch',status:'available',condition:100,plate:'ONE'}];",
  "if(!listCarForAuction('one'))passing++;",
  "state.fleet.push({id:'rented',type:'van',status:'rented',condition:100,plate:'RENTED'});",
  "if(!listCarForAuction('rented'))passing++;",
  "return passing;"
].join("\n");
const deterministicMath = Object.create(Math);
deterministicMath.random = () => 0;
const successful = new Function("Math", testScript)(deterministicMath);
assert.equal(successful, 62, "Failed auction bidding, owned-sale or protection scenarios");
console.log("PASS: JavaScript syntax, 15 vehicle classes, 22 customers, all assets and 62 auction scenarios.");
