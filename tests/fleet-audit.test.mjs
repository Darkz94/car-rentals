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
assert.equal(typeList.length, 17);
assert.equal(byId.size, 17);
assert.equal(customerList.length, 28);
assert.equal(new Set(customerList.map(x => x.id)).size, 28);

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
assert.equal(jeep.unlock, 3);
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
assert.equal(tow.unlock, 8);
assert.equal(horsepower.tow, 300);
assert.equal(customerList.filter(c => c.need === "Tow").map(c => c.id).sort().join(","), "insurance-recovery-team,roadside-rescue-nina");
assert.equal(customerList.find(c => c.id === "roadside-rescue-nina").budget, 5200);
assert.equal(customerList.find(c => c.id === "insurance-recovery-team").budget, 5800);
assert.ok(!("Tow" in equivalence), "Tow Truck matches its own customers only");
assert.ok(js.includes("type==='truck'||type==='tow'"), "Tow Truck roof sprite must face correctly on the map");
assert.ok(js.includes("['Bakkie','Jeep','Van','Tow','Truck','Party Bus','Bus']"), "Tow Truck and Party Bus must appear in Commercial & Tours");
const donk = byId.get("donk");
assert.ok(donk, "Missing Donk");
assert.equal(typeList.findIndex(t => t.id === "donk"), typeList.findIndex(t => t.id === "limo")-1, "Donk belongs immediately before Limo");
assert.equal(typeList.findIndex(t => t.id === "donk"), typeList.findIndex(t => t.id === "truck")+1, "Donk follows Delivery Truck");
assert.equal(donk.category, "Donk");
assert.equal(donk.price, 365000);
assert.equal(donk.rate, 2300);
assert.equal(donk.tank, 68);
assert.equal(donk.unlock, 11);
assert.equal(horsepower.donk, 320);
assert.equal(customerList.filter(c => c.need === "Donk").map(c => c.id).sort().join(","), "music-video-crew,show-promoter-zane");
assert.ok(!("Donk" in equivalence), "Donk uses exact-category matching");
assert.ok(js.includes("type==='classic'||type==='donk'||type==='limo'?0"), "Donk and Limo roof art should have horizontal map orientation");
assert.ok(js.includes("['Muscle','Donk'].includes(t.category)"), "Donk belongs in the custom/muscle dealer view");
assert.ok(js.includes("['Donk','Limo','Muscle','Sport','Super','Hyper'].includes(t.category)"), "Donk and Limo belong in premium dealer view");

const limo=byId.get("limo");
assert.ok(limo,"Limo class missing");
assert.equal(typeList.findIndex(t=>t.id==="limo"),typeList.findIndex(t=>t.id==="donk")+1,"Limo must follow Donk");
assert.equal(typeList.findIndex(t=>t.id==="limo"),typeList.findIndex(t=>t.id==="muscle")-1,"Limo must precede Muscle");
assert.equal(limo.category,"Limo");
assert.equal(limo.price,380000);
assert.equal(limo.rate,2450);
assert.equal(limo.tank,69);
assert.equal(limo.unlock, 13);
assert.equal(horsepower.limo,390);
assert.ok(limo.price>donk.price&&limo.price<byId.get("muscle").price,"Limo price must sit between Donk and Muscle");
assert.ok(limo.rate>donk.rate&&limo.rate<byId.get("muscle").rate,"Limo rental rate must sit between Donk and Muscle");
assert.deepEqual(Array.from(customerList.filter(c=>c.need==="Limo").map(c=>c.id).sort()),["airport-vip-transfer","matric-farewell","wedding-chauffeur"],"Three dedicated Limo customers required");
assert.ok(!("Limo" in equivalence),"Limo customers must use exact category matching");
assert.ok(js.includes("['Hatch','Sedan','Coupe','Classic','Limo'].includes(t.category)"),"Limo must appear in executive dealership category");
assert.ok(js.includes("let t=pick(TYPES.filter(x=>x.unlock<=state.rep));"),"Generic auction lots must include the Limo once Level 13 is reached");

const partyBus=byId.get("partybus");
assert.ok(partyBus,"Party Bus vehicle must exist");
assert.equal(typeList.findIndex(t=>t.id==="partybus"),typeList.findIndex(t=>t.id==="muscle")+1,"Party Bus follows Muscle");
assert.equal(typeList.findIndex(t=>t.id==="partybus"),typeList.findIndex(t=>t.id==="bus")-1,"Party Bus must immediately precede Tour Bus");
assert.equal(partyBus.category,"Party Bus");
assert.equal(partyBus.price,495000);
assert.equal(partyBus.rate,2850);
assert.equal(partyBus.tank,115);
assert.equal(partyBus.unlock, 16);
assert.equal(horsepower.partybus,300);
assert.ok(partyBus.price>byId.get("muscle").price&&partyBus.price<byId.get("bus").price,"Party Bus purchase price should fall between Muscle and Tour Bus");
assert.ok(partyBus.rate>byId.get("bus").rate&&partyBus.rate<byId.get("sport").rate,"Party Bus rate should fall between Tour Bus and Sports");
assert.deepEqual(Array.from(customerList.filter(c=>c.need==="Party Bus").map(c=>c.id).sort()),
  ["bachelorette-party","birthday-bash-crew","corporate-celebration-shuttle"],"Three dedicated Party Bus requests must exist");
assert.ok(!("Party Bus" in equivalence),"Party Bus uses exact-category matching");
assert.ok(js.includes("type==='bus'||type==='partybus'||type==='classic'"),"Party Bus top-down sprite must have map rotation");
assert.ok(js.includes("['Bakkie','Jeep','Van','Tow','Truck','Party Bus','Bus'].includes(t.category)"),"Party Bus appears in Commercial & Tours");
assert.ok(js.includes("let t=pick(TYPES.filter(x=>x.unlock<=state.rep));"),"Random auction must include unlocked Party Bus models");

const expectedTierLevels={"hatch":2,"sedan":2,"bakkie":2,"jeep":3,"van":4,"coupe":5,"classic":7,"tow":8,"truck":9,"donk":11,"limo":13,"muscle":14,"partybus":16,"bus":17,"sport":19,"super":22,"hyper":25};
for(const [id,level] of Object.entries(expectedTierLevels)) assert.equal(byId.get(id).unlock,level,"Vehicle tier changed for "+id);
assert.equal(Math.min(...typeList.map(t=>t.unlock)),2,"Starter models must unlock at Level 2");
assert.equal(Math.max(...typeList.map(t=>t.unlock)),25,"All 17 vehicles must unlock by Level 25");
assert.equal(typeList.filter(t=>t.unlock<=2).length,3,"Exactly the three starter vehicles unlock at Level 2");
assert.match(js,/function fresh\(\)\{return \{version:3,[^\n]*rep:2,xp:0/,"New game must still start at Reputation Level 2");
assert.ok(js.includes("state.fleet.some(car=>TYPES.some("),"Legacy premium cars must retain customer requests");
const customerUnlockSource=js.match(/function customerUnlocked\(c\)\{[^\n]*\}/)?.[0];
assert.ok(customerUnlockSource,"Customer unlock rule missing");
const legacyUnlockState={rep:2,fleet:[]};
const unlockedDemand=vm.runInNewContext(typeSource+"\n"+customerUnlockSource+"\ncustomerUnlocked",{state:legacyUnlockState});
const sportsDemand=customerList.find(c=>c.need==='Sport');
assert.equal(unlockedDemand(sportsDemand),false,"New players must not get locked high-tier bookings");
legacyUnlockState.fleet.push({type:'sport'});
assert.equal(unlockedDemand(sportsDemand),true,"Previously owned sports car must still get customer bookings");
legacyUnlockState.fleet=[];
legacyUnlockState.rep=19;
assert.equal(unlockedDemand(sportsDemand),true,"Sports bookings should open at Level 19");
assert.ok(js.includes("tierRules:25"),"New auction lots must use the new unlock tier rules");
assert.ok(js.includes("!a.tierRules"),"Pre-update saved auction lots must settle normally");
console.log("PASS: All 17 vehicle classes now unlock across Levels 2-25; old fleet and auction bids protected.");

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
assert.ok(canServe("Party Bus","Party Bus"),"Party Bus customers can hire Party Bus");
assert.ok(!canServe("Party Bus","Bus")&&!canServe("Party Bus","Limo"),"Party Bus bookings must not dispatch Tour Bus or Limo");
assert.ok(canServe("Limo","Limo"), "Dedicated Limo requests accept the Limo");
assert.ok(!canServe("Limo","Sedan") && !canServe("Limo","Donk"), "Limo requests must not dispatch ordinary classes");

const engine = js.slice(js.indexOf("function makeAuction(){"), js.indexOf("function achievementsProgress(a)"));
assert.ok(engine.includes("function advancePlayerAuctions("));
const testScript = [
  typeSource,
  "let time=1000,seq=0,selectedCar=null;",
  "let state={cash:20000000,rep:25,fleet:[],auction:null,playerAuctions:[],stats:{sales:0},ledger:[]};",
  "const now=()=>time,uid=p=>p+'_'+(++seq),round=Math.round;",
  "const typeOf=id=>TYPES.find(t=>t.id===id)||TYPES[0],rand=(a,b)=>a,pick=a=>a[0];",
  "const notify=()=>{},note=()=>{},money=n=>'R'+n,garageCapacity=()=>100;",
  "const bidReserve=()=>state.auction?.bidder==='You'?state.auction.playerBid:0;",
  "const freeCash=()=>state.cash-bidReserve();",
  "const getResale=c=>round(typeOf(c.type).price*(.38+.24*c.condition/100));",
  "const spend=amount=>{if(freeCash()<amount)return false;state.cash-=amount;return true;};",
  "const addCar=(id,price,auction,branch,honorExistingAuction=false)=>{if((state.rep<typeOf(id).unlock&&!honorExistingAuction)||state.fleet.length>=100||!spend(price))return false;state.fleet.push({id:uid('car'),type:id,status:'available',condition:70,plate:id});return true;};",
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
  "state.rep=2;state.fleet=[{id:'keep',type:'hatch',status:'available',condition:100,plate:'KEEP'}];",
 "state.cash=20000000;state.auction={id:uid('oldlot'),type:'hyper',base:100000,highest:0,bidder:'',playerBid:0};",
 "let beforeLegacy=state.fleet.length;if(buyAuctionNow()&&state.fleet.length===beforeLegacy+1&&state.fleet.at(-1).type==='hyper')passing++;",
 "state.auction={id:uid('oldbid'),type:'hyper',base:100000,highest:120000,bidder:'You',playerBid:120000};",
 "beforeLegacy=state.fleet.length;closeAuction();if(state.fleet.length===beforeLegacy+1&&state.fleet.at(-1).type==='hyper')passing++;",
 "state.auction={id:uid('newlot'),type:'hyper',base:100000,highest:0,bidder:'',playerBid:0,tierRules:25};",
 "beforeLegacy=state.fleet.length;if(!buyAuctionNow()&&state.fleet.length===beforeLegacy)passing++;",
 "return passing;"
].join("\n");
const deterministicMath = Object.create(Math);
deterministicMath.random = () => 0;
const successful = new Function("Math", testScript)(deterministicMath);
assert.equal(successful, 73, "Failed auction bidding, existing-lot protection or new-tier lock scenarios");
// Protect the Premium Upgrade catalogue, 100-level cap, prices and garage capacity.
const premiumPerks=vm.runInNewContext(decl("PRESTIGE_PERKS", "];") + "\nPRESTIGE_PERKS");
assert.equal(premiumPerks.length,10,"There must be 10 Premium Upgrade categories");
assert.equal(new Set(premiumPerks.map(p=>p[0])).size,10,"Premium identifiers must be unique");
assert.ok(premiumPerks.every(p=>p.length===4&&p.every(Boolean)),"Premium categories require id, icon, name and description");
assert.match(js,/const PREMIUM_MAX_LEVEL=100;/);
assert.ok(js.includes("function buyPremium(id,requested=1)"),"Premium purchasing must exist");
assert.ok(!js.includes("function prestigeRun()"),"Prestige reset must be removed");
assert.ok(!js.includes("if(action==='confirmprestige')"),"Prestige reset action must be removed");
assert.ok(js.includes("['premium','🌟 Premium Upgrades']"),"Premium navigation must replace Prestige");
const perkLevelSource=js.match(/function perkLevel\(id\)\{[^\n]*\}/)?.[0];
const perkEffectSource=js.match(/function perkEffect\(id,max\)\{[^\n]*\}/)?.[0];
assert.ok(perkLevelSource&&perkEffectSource,"Diminishing-return helpers must remain");
const perkState={perks:{safety:0}};
const premiumHelpers=vm.runInNewContext("const PREMIUM_MAX_LEVEL=100;\n"+perkLevelSource+"\n"+perkEffectSource+"\n({perkLevel,perkEffect})",{state:perkState});
assert.equal(premiumHelpers.perkLevel('safety'),0);
perkState.perks.safety=100;
assert.equal(premiumHelpers.perkLevel('safety'),100);
assert.ok(premiumHelpers.perkEffect('safety',.65)>0&&premiumHelpers.perkEffect('safety',.65)<.65);
perkState.perks.safety=1000;
assert.equal(premiumHelpers.perkLevel('safety'),100,"Old saves must not exceed 100 levels");
const premiumMath=vm.runInNewContext(js.match(/function premiumCost\(level\)\{[^\n]*\}/)[0]+"\n"+js.match(/function premiumTotalCost\(level,qty\)\{[^\n]*\}/)[0]+"\n({premiumCost,premiumTotalCost})");
assert.equal(premiumMath.premiumCost(0),10000);
assert.equal(premiumMath.premiumCost(99),857440);
assert.equal(premiumMath.premiumTotalCost(0,5),[0,1,2,3,4].reduce((n,i)=>n+premiumMath.premiumCost(i),0));
const capSource=js.match(/function garageCapacity\(\)\{[^\n]*\}/)[0];
const garageState={prestige:0,legacyGarageCapacity:0,perks:{capacity:0},upgrades:{}};
const garageTest=vm.runInNewContext("const PREMIUM_MAX_LEVEL=100;\n"+perkLevelSource+"\n"+capSource+"\ngarageCapacity",{state:garageState,up:id=>!!garageState.upgrades[id]});
assert.equal(garageTest(),10);
garageState.perks.capacity=1;assert.equal(garageTest(),15);
garageState.perks.capacity=100;assert.equal(garageTest(),510);
garageState.perks.capacity=0;garageState.upgrades.garage=true;assert.equal(garageTest(),24);
garageState.legacyGarageCapacity=100;assert.equal(garageTest(),100);
assert.ok(js.includes("premiumMigrated"),"Legacy saves must have a migration path");
console.log("PASS: 10 Premium Upgrades, rising costs, 100 levels, garage +5, legacy capacity and no Prestige reset.");
// Verify the Reputation curve from a new Reputation 2 save: 300 normal returns.
const repSource = js.match(/function repNeeded\(level\)\{[^\n]*\}/)?.[0];
const awardSource = js.match(/function awardRepXP\(amount\)\{[^\n]*\}/)?.[0];
assert.ok(repSource && awardSource, "Reputation progression functions missing");
const repNeeded = vm.runInNewContext(repSource + "\nrepNeeded");
const requiredRentals = Array.from({length:8}, (_,i) => repNeeded(i+2)/10);
assert.deepEqual(requiredRentals, [20,25,30,35,40,45,50,55],
  "Reputation level requirements must increase progressively");
assert.equal(requiredRentals.reduce((a,b)=>a+b,0), 300, "Reputation 2 to 10 should require 300 unboosted rentals");
const progressState={rep:2,xp:0};
const awardRepXP=vm.runInNewContext("const REPUTATION_MAX_LEVEL=50;\n"+repSource+"\n"+awardSource+"\nawardRepXP",
  {state:progressState,note:()=>{}});
for(let i=0;i<299;i++)awardRepXP(10);
assert.equal(progressState.rep,9, "299 rentals should not reach Reputation 10");
awardRepXP(10);
assert.equal(progressState.rep,10, "300 rentals should reach Reputation 10");
assert.equal(progressState.xp,0, "XP should reset on the exact Reputation 10 threshold");
console.log("PASS: Reputation 2 to 10 needs exactly 300 base-XP rentals.");
// Level 50 is the final reputation level, independent of 100-level Premium Upgrades.
assert.match(js,/const REPUTATION_MAX_LEVEL=50;/);
assert.ok(js.includes("const PREMIUM_MAX_LEVEL=100;"),"Premium Upgrade level cap must remain unchanged");
progressState.rep=49;progressState.xp=0;
awardRepXP(repNeeded(49)+150);
assert.equal(progressState.rep,50,"Reputation must reach level 50");
const finalXP=progressState.xp;
awardRepXP(100000);
assert.equal(progressState.rep,50,"Reputation must not exceed level 50");
assert.equal(progressState.xp,finalXP,"XP must not keep growing at the cap");
progressState.rep=53;progressState.xp=75;
awardRepXP(100000);
assert.equal(progressState.rep,53,"Legacy saved reputations above 50 must not be downgraded");
assert.equal(progressState.xp,75,"Legacy XP must be preserved");
for(const marker of ["repProgressText()","repProgressPercent()","repProgressAria()"]){
 assert.ok(js.includes(marker),"Level 50 display helper missing: "+marker);
}
console.log("PASS: Reputation Level 50 cap, unchanged Premium Upgrades, preserved high-level legacy saves.");


const compactRentalCard=js.slice(js.indexOf("function rentalCard("),js.indexOf("function offerCard("));
assert.ok(compactRentalCard.includes('item-row rental-compact'),"Rental cards must use the compact mobile layout");
assert.ok(compactRentalCard.includes('rental-compact-bottom'),"Rental progress and trip duration must share one row");
assert.ok(compactRentalCard.includes('data-countdown-rental='),"Rental return countdown must remain live");
assert.ok(compactRentalCard.includes('data-rental-progress='),"Rental progress bar must remain live");
assert.ok(compactRentalCard.includes('formatTripTime('),"Rental total duration must remain visible");
assert.ok(!compactRentalCard.includes('Money arrives automatically'),"Redundant rental payment notice must stay removed");
console.log("PASS: Compact rental cards preserve countdown, progress, and duration.");

const offlineWelcomeSource=js.slice(js.indexOf("function renderModal(){"),js.indexOf("function render(){"));
const welcomeOnly=offlineWelcomeSource.slice(offlineWelcomeSource.indexOf("if(modal==='offline')"),offlineWelcomeSource.indexOf("if(modal==='guide')"));
assert.ok(welcomeOnly.includes("offline-compact-report"),"Offline modal should use a compact summary");
assert.ok(welcomeOnly.includes("offline-compact-net")&&welcomeOnly.includes("r.net"),"Net change must stay prominent");
assert.ok(welcomeOnly.includes("r.revenue")&&welcomeOnly.includes("r.expenses")&&welcomeOnly.includes("r.rentals"),"All report totals must stay visible");
assert.ok(welcomeOnly.includes('<details')&&welcomeOnly.includes('data-compact-info="offline-return-report"'),"Info must expand using the existing persisted details control");
assert.ok(welcomeOnly.indexOf('r.qualified?')>welcomeOnly.indexOf('<details'),"Offline calculation explanation must only appear under Info");
assert.ok(welcomeOnly.includes("Collect & continue")&&welcomeOnly.includes("closemodal"),"Return-to-game action must remain available");
assert.ok(offlineWelcomeSource.includes("modal-offline-compact"),"Offline-only modal style class must be selected");
assert.ok(html.includes('id="ctr-offline-welcome-compact"'),"Compact modal CSS must be bundled");
console.log("PASS: Compact offline welcome report retains metrics, Info disclosure and continue action.");

const garageClassOrderSource=js.match(/function garageClassOrder\(a,b\)\{[^\n]*\}/)?.[0];
const fleetInGarageOrderSource=js.match(/function fleetInGarageOrder\(cars\)\{[^\n]*\}/)?.[0];
assert.ok(garageClassOrderSource&&fleetInGarageOrderSource,"Garage class-order helpers missing");
const orderFleet=vm.runInNewContext(typeSource+"\n"+garageClassOrderSource+"\n"+fleetInGarageOrderSource+"\nfleetInGarageOrder");
const unsortedCars=[{type:"hyper",id:"h"},{type:"limo",id:"l"},{type:"muscle",id:"m"},{type:"partybus",id:"p"},{type:"bus",id:"t"},{type:"donk",id:"d"},{type:"bakkie",id:"b1"},{type:"hatch",id:"a"},{type:"sedan",id:"s"},{type:"bakkie",id:"b2"},{type:"jeep",id:"j"}];
assert.deepEqual(Array.from(orderFleet(unsortedCars),x=>x.type),["hatch","sedan","bakkie","bakkie","jeep","donk","limo","muscle","partybus","bus","hyper"],"Vehicle tabs must follow Garage class order");
assert.deepEqual(Array.from(unsortedCars,x=>x.id),["h","l","m","p","t","d","b1","a","s","b2","j"],"Ordering must not mutate saved fleet data");
assert.ok(js.includes("return garageClassOrder(a,b);"),"Garage must share class ordering");
assert.ok(js.includes("const ordered=fleetInGarageOrder(state.fleet);")&&js.includes("shown.map(renderWorkshopVehicle)"),"Workshop must preserve class-order display without mutating the fleet");
assert.ok(js.includes("const cars=fleetInGarageOrder(state.fleet)")&&js.includes("cars.map(renderPerformanceCar)"),"Performance class-order display mismatch");
assert.ok(js.includes("fleetInGarageOrder(free).map(c=>"),"Branch transfer ordering mismatch");
assert.ok(js.includes("fleetInGarageOrder(state.fleet.filter(canListPlayerAuctionCar))"),"Owned auction ordering mismatch");
assert.ok(js.includes('data-compact-info="garage-bulk-actions"')&&js.includes('data-compact-info="garage-operations"'),"Garage operations must be reachable");
assert.ok(js.includes('data-compact-info="map-details"'),"Map details must remain reachable");
assert.ok(html.includes('id="ctr-responsive-compact-v2"'),"Compact CSS missing");
console.log("PASS: Garage vehicle ordering and responsive Info sections.");

// Section 2: simplified Dashboard preserves rentals and encourages bottom navigation.
const dashStart=js.indexOf("function renderOverview(){");
const dashEnd=js.indexOf("function stat(",dashStart);
const dashMarkup=js.slice(dashStart,dashEnd);
const tipStart=js.indexOf("function smartOverview(){");
const tipEnd=js.indexOf("function dashboardShortcut(",tipStart);
const tipMarkup=js.slice(tipStart,tipEnd);
assert.ok(dashStart>=0&&dashEnd>dashStart&&tipStart>=0&&tipEnd>tipStart,"Dashboard renderer missing");
assert.ok(html.includes('id="ctr-design-foundation-section-01"')&&html.includes('id="ctr-dashboard-section-02"')&&html.includes('id="ctr-dashboard-simplified-2026"'),"Dashboard styling missing");
for(const need of ["smartOverview()","dashboard-rental-desk","dashboard-rental-help","dashboard-rental-actions","state.offers.slice(0,2).map(offerCard)","extraOffers.map(offerCard)","dashboardSoonestRentals(3).map(r=>{","data-countdown-rental","btn('autorent'"]){
 assert.ok(dashMarkup.includes(need),"Simplified Dashboard missing "+need);
}
for(const removed of ["dashboardShortcut(","dashboard-city-strip","dashboard-summary","autoDeskControl()","renderMap(true)","renderLog(5)","nextActions()"]){
 assert.ok(!dashMarkup.includes(removed),"Redundant Dashboard shortcut remains "+removed);
}
assert.ok(tipMarkup.includes("READY TO RENT")&&tipMarkup.includes("PAYMENT ON RETURN"),"At-a-glance fleet totals missing");
assert.ok(js.includes('data-id="progress" data-sub="settings" aria-label="Settings"'),"Header Settings must remain reachable");
assert.ok(js.includes("if(action==='autorent')")&&js.includes("startRental(offer.id)"),"Dispatch logic missing");
assert.ok(js.includes("if(action==='page')")&&js.includes("function renderMapPage()"),"Bottom navigation missing");
console.log("PASS: Simplified Dashboard retains dispatch, requests, active rentals and bottom navigation.");

const soonestSource=js.match(/function dashboardSoonestRentals\(limit=3\)\{[^\n]*\}/)?.[0];
assert.ok(soonestSource,"Dashboard earliest-return sorting helper missing");
const soonestState={rentals:[{id:"later",due:5000},{id:"earliest",due:1000},{id:"last",due:9000},{id:"middle",due:3000}]};
const soonest=vm.runInNewContext(soonestSource+"\ndashboardSoonestRentals",{state:soonestState});
const originalRentalOrder=soonestState.rentals.map(r=>r.id).join(",");
assert.equal(soonest().map(r=>r.id).join(","),"earliest,middle,later","Dashboard must show the three earliest returns");
assert.equal(soonestState.rentals.map(r=>r.id).join(","),originalRentalOrder,"Dashboard sorting must not mutate saved rental order");
soonestState.rentals.push({id:"newSoonest",due:500});
assert.equal(soonest().map(r=>r.id).join(","),"newSoonest,earliest,middle","New shorter rentals must move to the top");
assert.equal(soonest(2).length,2,"Dashboard sorter must respect its requested limit");
console.log("PASS: Dashboard Active Rentals shows earliest returns first without changing saved rental order.");

const dashboardAutoStart=js.indexOf("function dashboardAutoDispatchToggle(){");
const dashboardAutoEnd=js.indexOf("function renderOverview(){",dashboardAutoStart);
assert.ok(dashboardAutoStart>0&&dashboardAutoEnd>dashboardAutoStart,"Dashboard Auto-Dispatch switch renderer missing");
const dashboardAutoSource=js.slice(dashboardAutoStart,dashboardAutoEnd);
for(const marker of ['data-action="toggleautodespatch"','role="switch"','aria-checked=','state.settings.autoDispatch!==false','openupgrade']){
 assert.ok(dashboardAutoSource.includes(marker),"Dashboard Auto-Dispatch control missing "+marker);
}
assert.ok(js.includes('${dashboardAutoDispatchToggle()}'),"Auto-Dispatch switch must appear in the Active Rentals section");
assert.ok(html.includes('dashboard-autodispatch-switch'),"Dashboard Auto-Dispatch control styles missing");
assert.ok(js.includes("if(action==='toggleautodespatch'){if(!up('auto'))return;state.settings.autoDispatch="),"Auto-Dispatch switch must reuse existing action");
console.log("PASS: Compact Dashboard Auto-Dispatch toggle reuses the existing setting without a master automation switch.");



// Section 3: Fleet command shell must render live KPIs, image-backed header,
// all four real section routes, and exactly one working filter toolbar.
const fleetShellStart=js.indexOf("function renderFleet(){");
const fleetShellEnd=js.indexOf("\nconst openInfoPanels",fleetShellStart);
const garageShellStart=js.indexOf("function renderGarage(){");
const garageShellEnd=js.indexOf("\nfunction fleetCard(",garageShellStart);
assert.ok(fleetShellStart>=0&&fleetShellEnd>fleetShellStart&&garageShellStart>=0&&garageShellEnd>garageShellStart,
  "Section 3 Fleet shell or existing Garage functions missing");
assert.ok(html.includes('id="ctr-fleet-shell-section-03"')&&js.includes("function renderFleetFilters(){"),
  "Section 3 scoped styles and existing filter controls must ship offline");
assert.equal((js.match(/data-role="garage-status"/g)||[]).length,1,
  "Status filtering must exist only once, inside Fleet tab shell");
for(const role of ["garage-search","garage-status","garage-branch","garage-sort"])
 assert.ok(js.includes('data-role="'+role+'"'),"Missing Fleet search/filter control: "+role);
const garageMarkup=js.slice(garageShellStart,garageShellEnd);
assert.ok(!garageMarkup.includes('class="fleet-overview"')&&!garageMarkup.includes('class="garage-filters"'),
  "Garage must not duplicate the shared shell KPIs or filtering");
const fleetTestState={fleet:[
 {id:"test-1",type:"hatch",status:"available",tune:0},
 {id:"test-2",type:"limo",status:"rented",tune:1}
],rep:5};
const fleetContext={
 state:fleetTestState,selectedCar:"test-1",activeSub:{fleet:"garage"},
 CAR_IMAGES:{hatch:"assets/city-hatch-side.png",limo:"assets/limo-side.webp"},
 TYPES:[{id:"hatch",unlock:1},{id:"limo",unlock:4}],
 typeOf:id=>({id}),available:()=>[fleetTestState.fleet[0]],
 garageCapacity:()=>10,getResale:()=>125000,vehicleNeedsAttention:()=>false,
 renderHeroArt:()=>"<svg></svg>",arcadeIcon:icon=>'<svg data-icon="'+icon+'"></svg>',
 compact:amount=>String(amount),
 btn:(action,label,cls,attrs)=>'<button data-action="'+action+'" '+(attrs||'')+'>'+label+'</button>',
 renderFleetFilters:()=>'<input data-role="garage-search"><select data-role="garage-status"></select><select data-role="garage-branch"></select><select data-role="garage-sort"></select>',
 renderGarage:()=>"<p>EXISTING GARAGE CONTENT</p>",
 renderDealership:()=>"<p>EXISTING DEALERSHIP CONTENT</p>",
 renderCare:()=>"<p>EXISTING WORKSHOP CONTENT</p>",
 renderTuning:()=>"<p>EXISTING PERFORMANCE CONTENT</p>"
};
const fleetFn=vm.runInNewContext(js.slice(fleetShellStart,fleetShellEnd)+"\nrenderFleet",fleetContext);
const fleetSnapshot=JSON.stringify(fleetTestState.fleet);
const garageShell=fleetFn();
assert.ok(garageShell.includes('src="assets/city-hatch-side.png"'),
  "Fleet header must reuse the selected vehicle artwork");
assert.equal((garageShell.match(/class="fleet-command-tab /g)||[]).length,4,
  "Fleet shell must have exactly four section tabs");
for(const section of ["garage","dealership","care","tuning"])
 assert.ok(garageShell.includes('data-group="fleet" data-id="'+section+'"'),
   "Fleet tab routing missing: "+section);
for(const cls of ["fleet-command-banner","fleet-command-kpis","fleet-command-filters","fleet-command-content"])
 assert.ok(garageShell.includes(cls),"Fleet shell component missing: "+cls);
assert.ok(garageShell.includes("EXISTING GARAGE CONTENT")&&garageShell.includes('data-role="garage-sort"'),
 "Garage body and live sorting must be retained in shell");
for(const [section,label] of [["dealership","DEALERSHIP"],["care","WORKSHOP"],["tuning","PERFORMANCE"]]){
 fleetContext.activeSub.fleet=section;
 const markup=fleetFn();
 assert.ok(markup.includes("EXISTING "+label+" CONTENT"),"Sub-tab failed to render "+section);
 assert.ok(!markup.includes('data-role="garage-search"'),"Garage filters should only appear on Garage");
}
assert.equal(JSON.stringify(fleetTestState.fleet),fleetSnapshot,
 "Fleet shell must never mutate or sort the saved fleet");
console.log("PASS: Section 3 Fleet shell, tab navigation, shared filters, active stats and save-safe rendering.");


// Section 4: garage modes, status pills, parking artwork and safe inspection routing.
assert.ok(html.includes('id="ctr-garage-section-04"'),"Section 4 Garage design CSS must ship offline");
const garageV4Start=js.indexOf("function renderGarage(){");
const garageV4End=js.indexOf("\nfunction fleetCard(",garageV4Start);
const garageV4Body=js.slice(garageV4Start,garageV4End);
for(const token of ["garage-v4","garage-capacity-line","renderGarageQuickFilters()","garage-compact-list-v4","garage-bay-grid-v4","garageDisplay==='list'?fleetCard(x):garageBayCard(x,state.fleet.indexOf(x))","garage-inspection-anchor","data-fleet-count","autoCareControl()","garage-ops-details"]){
 assert.ok(garageV4Body.includes(token),"Garage Section 4 missing existing feature or view: "+token);
}
assert.ok(js.includes("garageDisplay='bays'")&&js.includes("if(action==='garageview')")&&js.includes("if(action==='garagefilter')"),
 "Both new Garage view and quick status actions need live handlers");
assert.ok(js.includes("document.getElementById('garage-inspection-anchor')?.scrollIntoView"),
 "Inspect buttons should bring the selected vehicle into view");
assert.ok(js.includes('data-role="garage-search"')&&js.includes('data-role="garage-sort"'),
 "Section 3 search and sort must be preserved");

const bayV4Start=js.indexOf("function garageBayCard("),bayV4End=js.indexOf("\nfunction garageEmptyBay(",bayV4Start);
const quickV4Start=js.indexOf("function renderGarageQuickFilters("),quickV4End=js.indexOf("\nfunction renderGarage(){",quickV4Start);
assert.ok(bayV4Start>=0&&bayV4End>bayV4Start&&quickV4Start>=0&&quickV4End>quickV4Start,
 "Garage card and status filter renderers missing");
const garageMockState={fleet:[
 {id:"h",type:"hatch",status:"available",plate:"CPT 001",branch:"hq",fuel:82,condition:92,clean:100,tune:0},
 {id:"l",type:"limo",status:"rented",plate:"CPT 002",branch:"hq",fuel:35,condition:70,clean:64,tune:0},
 {id:"p",type:"partybus",status:"incident",plate:"CPT 003",branch:"hq",fuel:12,condition:18,clean:20,tune:0}
]};
const garageMock={
 state:garageMockState,selectedCar:"h",garageStatus:"all",
 CAR_IMAGES:{hatch:"assets/city-hatch-side.png",limo:"assets/limo-side.webp",partybus:"assets/partybus-side.webp"},
 DEST:{hq:{name:"Cape Town HQ"}},typeOf:id=>({id,name:id==="limo"?"Limo":id==="partybus"?"Party Bus":"Hatchback",category:id}),
 carReady:c=>c.status==="available"&&c.condition>=35&&c.fuel>=15,
 vehicleNeedsAttention:c=>c.status==="incident"||(c.status==="available"&&c.fuel<25),
 esc:value=>String(value).replace(/"/g,"&quot;"),round:Math.round,money:value=>"R"+value,
 paintFilter:()=>"none",listBtn:(action,id,label,style)=>'<button data-action="'+action+'" data-id="'+id+'">'+label+"</button>"
};
const bayRenderer=vm.runInNewContext(js.slice(bayV4Start,bayV4End)+"\ngarageBayCard",garageMock);
const readyBay=bayRenderer(garageMockState.fleet[0],0);
const hiredBay=bayRenderer(garageMockState.fleet[1],1);
const incidentBay=bayRenderer(garageMockState.fleet[2],2);
assert.match(readyBay,/garage-bay-status--ready/,"Rental-ready bays should have teal status");
assert.ok(readyBay.includes('src="assets/city-hatch-side.png"')&&readyBay.includes("CPT 001"),
 "Selected bay must use the correct original vehicle artwork and plate");
assert.ok(readyBay.includes('data-action="selectcar"')&&readyBay.includes('garage-bay-health-grid'),
 "Selected bay must preserve inspect controls and condition bars");
assert.ok(hiredBay.includes('src="assets/limo-side.webp"')&&hiredBay.includes("VEHICLE CURRENTLY AWAY"),
 "An on-hire Limo remains in its garage bay with correct image and status");
assert.ok(incidentBay.includes('src="assets/partybus-side.webp"')&&incidentBay.includes("RECOVERY NEEDED"),
 "An incident Party Bus must keep its class artwork and recovery status");
const quickRenderer=vm.runInNewContext(js.slice(quickV4Start,quickV4End)+"\nrenderGarageQuickFilters",garageMock);
const chips=quickRenderer();
assert.equal((chips.match(/data-action="garagefilter"/g)||[]).length,6,
 "Six quick-filter chips must remain functional");
for(const value of ["all","ready","care","out","incident","auction"])
 assert.ok(chips.includes('data-id="'+value+'"'),"Quick filter missing "+value);
const sortingStart=js.indexOf("function garageCars(){"),sortingEnd=js.indexOf("\nfunction visibleDealerCars(",sortingStart);
const sortingCtx={state:garageMockState,garageStatus:"all",garageBranch:"all",garageSort:"type",
 typeOf:garageMock.typeOf,carReady:garageMock.carReady,vehicleNeedsAttention:garageMock.vehicleNeedsAttention,
 garageClassOrder:(a,b)=>["hatch","limo","partybus"].indexOf(a.type)-["hatch","limo","partybus"].indexOf(b.type)};
const orderingTest=vm.runInNewContext(js.slice(sortingStart,sortingEnd)+"\ngarageCars",sortingCtx);
const unsortedInput=[garageMockState.fleet[2],garageMockState.fleet[0],garageMockState.fleet[1]];
sortingCtx.state={fleet:unsortedInput};
const beforeOrder=unsortedInput.map(x=>x.id);
const ordered=orderingTest();
assert.deepEqual(Array.from(ordered,x=>x.id),["h","l","p"],"Garage display must sort by vehicle class");
assert.deepEqual(unsortedInput.map(x=>x.id),beforeOrder,
 "Garage sorting must not mutate saved fleet array");
console.log("PASS: Section 4 Garage parking/list modes, six filters, class artwork, incident states and save-safe ordering.");


// Section 5: Premium vehicle detail presentation must use each car's original artwork,
// accurate current statistics and all existing transactional controls.
assert.ok(html.includes('id="ctr-vehicle-details-section-05"'),
 "The premium Vehicle Detail panel styling must be bundled in the offline game");
const vehicleDetailStart=js.indexOf("function renderCarDetails(c){");
const vehicleDetailEnd=js.indexOf("\nfunction ",vehicleDetailStart+10);
const vehicleDetailJs=js.slice(vehicleDetailStart,vehicleDetailEnd);
assert.ok(vehicleDetailStart>=0&&vehicleDetailEnd>vehicleDetailStart,
 "Section 5 vehicle inspection renderer missing");
for(const token of ["vehicle-v5-stage","vehicle-v5-side","vehicle-v5-roof","vehicle-v5-stats",
 "vehicle-v5-meters","MAP_CAR_IMAGES[t.id]","CAR_IMAGES[t.id]","carHorsepower(c)",
 "fleetInGarageOrder(state.fleet)"])
 assert.ok(vehicleDetailJs.includes(token),"Section 5 vehicle detail missing "+token);
const v5Car={id:"lim-01",type:"limo",plate:"CPT 666",status:"available",branch:"hq",condition:84,
 fuel:72,clean:89,body:96,tune:1,rides:8,paint:"silver",
 parts:{engine:82,tyres:81,brakes:80,oil:79,battery:78}};
const v5Other={id:"hatch-02",type:"hatch",plate:"CPT 123",status:"available",branch:"hq",condition:90,
 fuel:90,clean:90,body:90,tune:0,rides:3,paint:"silver"};
const v5State={fleet:[v5Car,v5Other]};
const v5Ctx={
 state:v5State,typeOf:id=>({id,name:id==="limo"?"Limo":"Hatchback",category:id==="limo"?"Limo":"Hatch",tank:id==="limo"?69:45,rate:id==="limo"?2450:1500}),
 carePrices:()=>({service:0,wash:0,fuel:120}),carReady:c=>c.status==="available"&&c.fuel>=15&&c.condition>=35,
 fleetInGarageOrder:cars=>[...cars].sort((a,b)=>a.type==="hatch"?-1:1),
 getResale:()=>290000,carHorsepower:()=>441,paintFilter:()=>"none",
 CAR_IMAGES:{limo:"assets/limo-side.webp",hatch:"assets/city-hatch-side.png"},
 MAP_CAR_IMAGES:{limo:"assets/limo-topdown.webp",hatch:"assets/city-hatch-topdown.png"},
 renderHeroArt:()=>"<svg></svg>",DEST:{hq:{name:"Cape Town HQ"}},
 PAINTS:{silver:{name:"Glacier Silver",hex:"#b4c6d0"},red:{name:"Racing Red",hex:"#f35c65"}},
 CAR_PARTS:[["engine","⚙️","Engine"],["tyres","🛞","Tyres"],["brakes","🛑","Brakes"],["oil","🛢️","Oil"],["battery","🔋","Battery"]],
 BRANCHES:[{id:"hq",name:"HQ"},{id:"airport",name:"Airport"}],
 owned:()=>true,up:()=>false,careNeeded:()=>true,canListPlayerAuctionCar:()=>true,bodyRepairCost:()=>1000,
 round:Math.round,clamp:(n,a=0,b=100)=>Math.max(a,Math.min(b,n)),
 money:n=>"R"+Math.round(n).toLocaleString("en-ZA"),esc:v=>String(v).replace(/"/g,"&quot;"),
 btn:(action,label,cls,attrs="")=>'<button data-action="'+action+'" '+attrs+'>'+label+"</button>",
 listBtn:(action,id,label,cls,extra="")=>'<button data-action="'+action+'" data-id="'+id+'" '+extra+'>'+label+"</button>"
};
const v5Render=vm.runInNewContext(vehicleDetailJs+"\nrenderCarDetails",v5Ctx);
const baseline=JSON.stringify(v5State.fleet);
const v5Markup=v5Render(v5Car);
assert.ok(v5Markup.includes('src="assets/limo-side.webp"')&&v5Markup.includes('src="assets/limo-topdown.webp"'),
 "Vehicle inspection must render both the matching side and top-down artwork");
assert.ok(v5Markup.includes(v5Ctx.money(Math.round(2450*(1+1*.13))))&&v5Markup.includes("HIRES COMPLETE")&&v5Markup.includes(">8</strong>"),
 "Vehicle stats must show actual tuned base rate and completed hires");
assert.ok(v5Markup.includes("441 HP")&&v5Markup.includes("CPT 666")&&v5Markup.includes("Cape Town HQ"),
 "Vehicle detail must use true car data, power and location");
for(const action of ["garageprev","garagenext","fuel","wash","service","care","tune","bodyrepair",
 "paintcar","transfer","asksell","listauction"])
 assert.ok(v5Markup.includes('data-action="'+action+'"'),
   "Vehicle detail lost action: "+action);
assert.equal(JSON.stringify(v5State.fleet),baseline,"Vehicle display must not mutate fleet state");
const rentedView=v5Render({...v5Car,status:"rented"});
assert.ok(rentedView.includes("ON HIRE")&&rentedView.includes("Currently on hire"),
 "Rented car inspection must clearly describe when it returns");
const incidentView=v5Render({...v5Car,status:"incident"});
assert.ok(incidentView.includes("RECOVERY NEEDED")&&incidentView.includes("Roadside recovery required"),
 "Incident car inspection must preserve recovery restrictions");
assert.ok(js.includes("let ordered=fleetInGarageOrder(state.fleet);if(!ordered.length)return;"),
 "Inspection arrow navigation must use the class-ordered nonmutating fleet view");
console.log("PASS: Section 5 vehicle artwork, real specs, 12 controls, rental restrictions and save-safe class navigation.");


// Section 6: the Workshop UI must render real service prices and reuse the existing
// service, fuel, wash, bodywork, upgrade, roadside and auto-care mechanics.
assert.ok(html.includes('id="ctr-workshop-section-06"'),"Workshop styles must be bundled for offline Android");
const v6WorkshopStart=js.indexOf("function renderWorkshopVehicle(c){");
const v6WorkshopEnd=js.indexOf("\nfunction renderCare(){",v6WorkshopStart);
const v6CareEnd=js.indexOf("\nfunction renderTuning(){",v6WorkshopEnd);
assert.ok(v6WorkshopStart>=0&&v6WorkshopEnd>v6WorkshopStart&&v6CareEnd>v6WorkshopEnd,"Section 6 renderers missing");
const v6WorkshopCode=js.slice(v6WorkshopStart,v6WorkshopEnd);
const v6CareCode=js.slice(v6WorkshopEnd,v6CareEnd);
for(const word of ["carePrices(c)","bodyRepairCost(c)","listBtn('fuel'","listBtn('wash'","listBtn('service'","listBtn('bodyrepair'","listBtn('care'","listBtn('selectcar'","listBtn('resolve'"]){
 assert.ok(v6WorkshopCode.includes(word),"Workshop lost existing maintenance action: "+word);
}
for(const word of ["workshop-hero","workshop-kpis","workshop-upgrade-grid","workshop-service-desk","workshop-fuel-badge","workshop-filterbar","autoCareControl()","const ordered=fleetInGarageOrder(state.fleet)","shown.map(renderWorkshopVehicle)"]){
 assert.ok(v6CareCode.includes(word),"Workshop feature missing: "+word);
}
assert.ok(js.includes("if(action==='workshopfilter')")&&js.includes("workshopFilter='all'"),
 "Workshop status filters must be wired without changing saved state");

const workshopCar={id:"limo-6",type:"limo",status:"available",plate:"CA 600",branch:"hq",fuel:45,condition:68,clean:51,body:81,paint:"silver"};
const workshopRented={...workshopCar,id:"on-road",status:"rented",plate:"CA 900"};
const workshopIncident={...workshopCar,id:"incident-6",status:"incident",plate:"CA 700"};
const workshopGameState={fleet:[workshopCar,workshopRented,workshopIncident],incidents:[{id:"recovery-1",carId:"incident-6"}]};
const mockPrices={service:2380,wash:180,fuel:750};
const workshopCtx={
 state:workshopGameState,selectedCar:"limo-6",
 typeOf:()=>({id:"limo",name:"Limo",category:"Limo",rate:2450,tank:69}),
 carePrices:()=>({...mockPrices}),careNeeded:c=>c.fuel<99.9||c.condition<99.9||c.clean<99.9,
 bodyRepairCost:()=>400,paintFilter:()=>"none",
 CAR_IMAGES:{limo:"assets/limo-side.webp"},DEST:{hq:{name:"Cape Town HQ"}},
 round:Math.round,clamp:(n,a=0,b=100)=>Math.max(a,Math.min(b,n)),
 money:n=>"R"+Math.round(n||0).toLocaleString("en-ZA"),esc:v=>String(v).replace(/"/g,"&quot;"),
 up:()=>false,listBtn:(action,id,label,classes,extra="")=>'<button data-action="'+action+'" data-id="'+id+'" '+extra+'>'+label+"</button>"
};
const renderWorkshopCar=vm.runInNewContext(v6WorkshopCode+"\nrenderWorkshopVehicle",workshopCtx);
const beforeV6=JSON.stringify(workshopGameState.fleet);
const workshopCard=renderWorkshopCar(workshopCar);
assert.ok(workshopCard.includes('src="assets/limo-side.webp"'),"Workshop must use the original Limo artwork");
assert.ok(workshopCard.includes("R2")&&workshopCard.includes("R180")&&workshopCard.includes("R750"),
 "Workshop per-service buttons must use live care prices");
for(const action of ["fuel","wash","service","bodyrepair","care","selectcar"]){
 assert.ok(workshopCard.includes('data-action="'+action+'"'),"Workshop missing button "+action);
}
assert.ok(workshopCard.includes("FUEL")&&workshopCard.includes("MECHANICAL")&&workshopCard.includes("BODY"),
 "Workshop must display accurate vehicle health");
const rentalCardV6=renderWorkshopCar(workshopRented);
assert.ok(rentalCardV6.includes("ON HIRE"),"Workshop must distinguish a rented car");
assert.ok((rentalCardV6.match(/disabled/g)||[]).length>=5,
 "On-hire vehicles must not offer maintenance");
const incidentCardV6=renderWorkshopCar(workshopIncident);
assert.ok(incidentCardV6.includes('data-action="resolve"')&&incidentCardV6.includes('data-id="recovery-1"'),
 "Incident recovery must connect to the actual incident ID");
assert.equal(JSON.stringify(workshopGameState.fleet),beforeV6,
 "Workshop card rendering must never mutate saved fleet data");

const mkUpgrade=(id,price)=>({id,price});
const upgradeList=[mkUpgrade("workshop",175000),mkUpgrade("carwash",75000)];
const careContext={
 ...workshopCtx,UPGRADES:upgradeList,
 workshopFilter:"all",activeSub:{fleet:"care"},fuelPrice:()=>23.7,
 arcadeIcon:id=>'<svg data-icon="'+id+'"></svg>',
 renderHeroArt:()=>"<svg></svg>",
 available:()=>[workshopCar],
 freeCash:()=>500000,
 fleetInGarageOrder:cars=>[...cars].sort((a,b)=>a.id.localeCompare(b.id)),
 renderWorkshopVehicle:renderWorkshopCar,autoCareControl:()=>"<section>AUTO CARE CONTROLS</section>",
 btn:(action,label,classes,extra)=>'<button data-action="'+action+'" '+extra+'>'+label+"</button>"
};
const renderWorkshop=vm.runInNewContext(v6CareCode+"\nrenderCare",careContext);
const workshopAll=renderWorkshop();
for(const target of ["workshop-hero","workshop-upgrade-grid","workshop-service-desk","AUTO CARE CONTROLS","data-action=\"upgrade\"","data-action=\"workshopfilter\""]){
 assert.ok(workshopAll.includes(target),"Workshop main view lost "+target);
}
for(const category of ["all","needs","parked","road","incident"]){
 assert.ok(workshopAll.includes('data-id="'+category+'"'),"Workshop filter missing "+category);
}
careContext.workshopFilter="incident";
const justIncident=renderWorkshop();
assert.ok(justIncident.includes('data-id="recovery-1"')&&!justIncident.includes('data-workshop-car="limo-6"'),
 "Incident filter should show affected vehicle only");
careContext.workshopFilter="needs";
const justCare=renderWorkshop();
assert.ok(justCare.includes('data-workshop-car="limo-6"')&&!justCare.includes('data-workshop-car="on-road"'),
 "Needs-care filter must exclude rentals in progress");
assert.equal(JSON.stringify(workshopGameState.fleet),beforeV6,"Workshop filters must not sort/mutate the saved fleet");
console.log("PASS: Section 6 Workshop service prices, ownership upgrades, statuses, 5 filters, roadside recovery and offline-safe rendering.");



// Section 7 Performance: no gameplay changes, five levels, class order and correct tuning.
assert.ok(html.includes('id="ctr-performance-section-07"'),"Performance CSS missing");
const v7s=js.indexOf("function renderPerformanceCar(c){"),v7p=js.indexOf("\nfunction renderTuning(){",v7s),v7e=js.indexOf("\nfunction renderMapPage(){",v7p);
assert.ok(v7s>=0&&v7p>v7s&&v7e>v7p,"Section 7 view missing");
const v7js=js.slice(v7s,v7e);
for(const token of ["carHorsepower(c)","carHorsepower({...c,tune:level+1})",
 "14000*Math.pow((c.tune||0)+1,1.65)","t.rate*(1+level*.13)",
 "fleetInGarageOrder(state.fleet)","CAR_IMAGES[t.id]","p7-hero","p7-track","p7-compare","listBtn('tune'"]){
 assert.ok(v7js.includes(token),"Section 7 missing "+token);
}
const v7limo={id:"l7",type:"limo",plate:"CA 777",tune:2,status:"available",paint:"silver"};
const v7hatch={...v7limo,id:"h7",type:"hatch",plate:"CA 111",tune:0};
const v7state={fleet:[v7limo,v7hatch],rep:4};
const v7ctx={
 state:v7state,selectedCar:"l7",TYPES:[{id:"classic",name:"Classic",unlock:3,price:40000},{id:"muscle",name:"Muscle",unlock:4,price:140000},{id:"sport",name:"Sports",unlock:5,price:400000},{id:"super",name:"Supercar",unlock:8,price:800000},{id:"hyper",name:"Hypercar",unlock:12,price:1800000}],
 typeOf:id=>id==="limo"?{id,name:"Limo",category:"Luxury",rate:2450}:{id,name:"Hatchback",category:"Economy",rate:500},
 CAR_IMAGES:{limo:"assets/limo-side.webp",hatch:"assets/city-hatch-side.png",classic:"assets/classic-side.webp",muscle:"assets/muscle-side.webp",sport:"assets/sport-side.webp",super:"assets/super-side.webp",hyper:"assets/hyper-side.webp"},
 paintFilter:()=> "none",round:Math.round,money:v=>"R"+Math.round(v).toLocaleString("en-ZA"),freeCash:()=>100000,
 carHorsepower:c=>Math.round((c.type==="limo"?390:98)*(1+(c.tune||0)*.13)),
 esc:v=>String(v).replace(/"/g,"&quot;"),renderHeroArt:()=>"<svg></svg>",arcadeIcon:()=>"<svg></svg>",
 listBtn:(a,id,label,cls,extra="")=>'<button data-action="'+a+'" data-id="'+id+'" '+extra+'>'+label+"</button>",
 fleetInGarageOrder:arr=>[...arr].sort((a,b)=>a.type==="hatch"?-1:b.type==="hatch"?1:0)
};
const v7view=vm.runInNewContext(v7js+"\n({renderPerformanceCar,renderTuning})",v7ctx);
const oldFleet=JSON.stringify(v7state.fleet);
const card=v7view.renderPerformanceCar(v7limo);
assert.ok(card.includes('src="assets/limo-side.webp"')&&card.includes("CA 777"),"Limo artwork/plate incorrect");
assert.ok(card.includes("+26%")&&card.includes('aria-valuenow="2"'),"Level 2 bonus/progress wrong");
assert.ok(card.includes("491")&&card.includes("542"),"Horsepower previews wrong");
assert.ok(card.includes(v7ctx.money(Math.round(2450*(1+2*.13))))&&card.includes(v7ctx.money(Math.round(2450*(1+3*.13)))),"Rate previews must match the exact existing tuning formula");
assert.ok(card.includes(v7ctx.money(Math.round(14000*Math.pow(3,1.65)))),"Tune price changed");
assert.ok(card.includes('data-action="tune"')&&!card.includes(" disabled"),"Parked tuning disabled");
assert.ok(v7view.renderPerformanceCar({...v7limo,tune:5}).includes("FULLY TUNED")&&v7view.renderPerformanceCar({...v7limo,tune:5}).includes("disabled"),"Max level must disable tune");
for(const status of ["rented","transfer","auction","incident"])assert.ok(v7view.renderPerformanceCar({...v7limo,status}).includes("disabled"),"Tuning allowed while "+status);
v7ctx.freeCash=()=>0;
assert.ok(v7view.renderPerformanceCar(v7limo).includes("NEED MORE CASH"),"Insufficient cash state missing");
v7ctx.freeCash=()=>100000;
const view=v7view.renderTuning();
assert.ok(view.indexOf('data-performance-car="h7"')<view.indexOf('data-performance-car="l7"'),"Original class display order changed");
assert.ok(view.includes("Performance Collection")&&view.includes("LOCKED"),"Reputation collection missing");
assert.equal(JSON.stringify(v7state.fleet),oldFleet,"Performance rendering mutated saved fleet");
assert.ok(js.includes("function tune(carId){let c=state.fleet.find(x=>x.id===carId);if(!c||c.status!=='available')")&&js.includes("let cost=round(14000*Math.pow(c.tune+1,1.65));"),"Tuning gameplay changed");
console.log("PASS: Section 7 Performance preview, tuning, eligibility, original art, order, economy and save safety.");



// Section 8: premium Rental Desk and Customer Offers must preserve all existing
// 28 customers, matching, offer expiry, manual car selection and return-only payouts.
assert.ok(html.includes('id="ctr-rental-desk-section-08"'),"Section 8 visual CSS missing from offline HTML");
const v8offerStart=js.indexOf("function offerCard(o){"),v8offerEnd=js.indexOf("\nfunction emptyState(",v8offerStart);
const v8autoStart=js.indexOf("function autoDeskControl(){"),v8autoEnd=js.indexOf("\nfunction renderOverview(){",v8autoStart);
assert.ok(v8offerStart>=0&&v8offerEnd>v8offerStart&&v8autoStart>=0&&v8autoEnd>v8autoStart,"Section 8 renderers missing");
const v8offerSrc=js.slice(v8offerStart,v8offerEnd),v8autoSrc=js.slice(v8autoStart,v8autoEnd);
const v8deskSrc=js.slice(js.indexOf("function renderOverview(){"),js.indexOf("\nfunction stat(",js.indexOf("function renderOverview(){")));
for(const need of ["bestCar(o)","carMatch(c,o)>=0","fleetInGarageOrder(state.fleet.filter", "estimatedRentalPayout(c,o)",
 "data-countdown-offer","data-offer-progress","rental-offer-car-","listBtn('rent'","CAR_IMAGES[typeOf(candidate.type).id]","canServeCategory(o.need,t.category)"]){
 assert.ok(v8offerSrc.includes(need),"Section 8 offer missing "+need);
}
for(const need of ["dashboard-desk-simple","dashboard-rental-help","dashboard-rental-actions",
 "state.offers.slice(0,2).map(offerCard)","extraOffers.map(offerCard)","dashboard-more-offers","btn('autorent'"]){
 assert.ok(v8deskSrc.includes(need),"Simplified Section 8 desk missing "+need);
}
assert.ok(js.includes("function autoDeskControl()")&&js.includes("toggleautodespatch"),"Auto-Dispatch remains available in Business");
assert.ok(!v8deskSrc.includes("state.offers.slice(0,5)"),"All existing customer offers must remain visible");
assert.ok(v8autoSrc.includes("up('auto')")&&v8autoSrc.includes("state.settings.autoDispatch!==false")&&
 v8autoSrc.includes("toggleautodespatch")&&v8autoSrc.includes("openupgrade"),"Auto-Dispatch state controls missing");
assert.ok(js.includes("document.getElementById('rental-offer-car-'+id)?.value||null")&&
 js.includes("startRental(id,chosen)"),"Manual car selector must connect to the existing startRental action");
assert.ok(js.includes("data-offer-progress")&&js.includes("duration=Math.max(1,o.expires-"),"Live offer progress must update without a game balance change");
assert.equal(customerList.length,28,"All 28 customer types must be kept");
const v8mockCar={id:"sedan-8",plate:"CA 808",type:"sedan",branch:"hq",status:"available",tune:1};
const v8second={...v8mockCar,id:"sedan-9",plate:"CA 909"};
const v8offer={id:"offer-8",customer:"Executive Priya",icon:"💼",need:"Sedan",budget:4000,dest:"airport",
 expires:200000,created:140000,contract:null,mult:1.35};
const v8game={fleet:[v8mockCar,v8second],offers:[v8offer],settings:{autoDispatch:true}};
const v8ctx={
 state:v8game,now:()=>160000,OFFER_LIFETIME_MS:60000,carMatch:()=>100,
 bestCar:()=>v8mockCar,fleetInGarageOrder:cars=>[...cars].reverse(),
 estimatedRentalPayout:car=>car.id==="sedan-8"?5250:5400,
 typeOf:()=>({id:"sedan",name:"Sedan",category:"Sedan",rate:1250}),
 TYPES:[{id:"sedan",name:"Sedan",category:"Sedan"}],canServeCategory:()=>true,
 CAR_IMAGES:{sedan:"assets/city-sedan-side.png",hatch:"assets/city-hatch-side.png"},DEST:{airport:{name:"Cape Town International"},hq:{name:"Headquarters"}},
 paintFilter:()=>"none",round:Math.round,clamp:(v,a=0,b=100)=>Math.max(a,Math.min(b,v)),
 money:n=>"R"+Math.round(n).toLocaleString("en-ZA"),relativeTime:t=>Math.ceil((t-160000)/1000)+"s",
 esc:s=>String(s).replaceAll('"',"&quot;"),arcadeIcon:()=>"<svg></svg>",
 listBtn:(action,id,title,cls,extra="")=>'<button data-action="'+action+'" data-id="'+id+'" '+extra+'>'+title+'</button>'
};
const v8offerFn=vm.runInNewContext(v8offerSrc+"\nofferCard",v8ctx);
const v8before=JSON.stringify(v8game);
const v8markup=v8offerFn(v8offer);
assert.ok(v8markup.includes('data-rental-offer="offer-8"')&&v8markup.includes("Executive Priya")&&v8markup.includes("Cape Town International"),
 "Offer must show correct customer and destination");
assert.ok(v8markup.includes(v8ctx.money(4000))&&v8markup.includes(v8ctx.money(5250))&&v8markup.includes("2")&&
 v8markup.includes("RETURN PAYOUT"),"Offer must display real budget, mid-trip payout and eligible count");
assert.ok(v8markup.includes('data-countdown-offer="offer-8"')&&v8markup.includes('data-offer-progress="offer-8"'),
 "Offer needs a live expiry clock and progress bar");
assert.ok(v8markup.includes('id="rental-offer-car-offer-8"')&&v8markup.includes('value="sedan-8"')&&
 v8markup.includes('value="sedan-9"')&&v8markup.includes('data-action="rent"'),"Offer must let players choose among eligible vehicles");
v8ctx.carMatch=c=>c.id==="sedan-8"?100:-1;
const v8single=v8offerFn(v8offer);
assert.ok(v8single.includes('value="sedan-8"')&&!v8single.includes('value="sedan-9"'),"Only compatible eligible vehicles can be chosen");
v8ctx.carMatch=()=>-1;v8ctx.bestCar=()=>null;
const v8none=v8offerFn(v8offer);
assert.ok(v8none.includes("NO READY MATCH")&&v8none.includes("disabled")&&
 v8none.includes("NEEDS MATCH"),"Unmatchable offer must disable dispatch");
assert.equal(JSON.stringify(v8game),v8before,"Offer rendering must not mutate customer or fleet saves");
const v8autoCtx={state:{settings:{autoDispatch:true}},up:()=>false,arcadeIcon:()=>"<svg></svg>",btn:(a,l)=>'<button data-action="'+a+'">'+l+'</button>'};
const v8autoFn=vm.runInNewContext(v8autoSrc+"\nautoDeskControl",v8autoCtx);
assert.ok(v8autoFn().includes('data-action="openupgrade"'),"Locked Auto-Dispatch must lead to upgrades");
v8autoCtx.up=()=>true;
assert.ok(v8autoFn().includes("ACTIVE")&&v8autoFn().includes('data-action="toggleautodespatch"'),"Owned Auto-Dispatch must be controllable");
v8autoCtx.state.settings.autoDispatch=false;
assert.ok(v8autoFn().includes("PAUSED"),"Paused Auto-Dispatch must be distinguished");
assert.ok(js.includes("if(!car||carMatch(car,offer)<0)"),"Existing category/eligibility protection must remain");
assert.ok(js.includes("let seconds=rentalSeconds(),start=now(),payout=rentalPayout(car,offer,seconds)")&&
 js.includes("state.rentals.push({id:uid('rent')"),"Real rentals must use existing duration and payout handlers");
console.log("PASS: Section 8 rental offer art, 28 customer types, expiry, manual car selection, matching, budget, Auto-Dispatch and save safety.");



// Section 9: Active Rentals and true ledger-backed returns without any economy changes.
assert.ok(html.includes('id="ctr-active-rentals-section-09"'),"Section 9 styles missing");
const v9s=js.indexOf("function rentalCard(r){"),v9e=js.indexOf("\nfunction offerCard(o){",v9s);
const v9rs=js.indexOf("function renderRecentReturns(limit=4){"),v9re=js.indexOf("\nfunction renderLog(",v9rs);
assert.ok(v9s>=0&&v9e>v9s&&v9rs>=0&&v9re>v9rs,"Section 9 UI missing");
const v9code=js.slice(v9s,v9e),v9returns=js.slice(v9rs,v9re);
for(const token of ["item-row rental-compact","rental-compact-bottom","data-countdown-rental",
 "data-rental-progress","formatTripTime(","money(r.payout)","CAR_IMAGES[t.id]",
 "rental-trip-v9-route","rental-trip-v9-timeline","btn('page'"]){
 assert.ok(v9code.includes(token),"Section 9 rental missing "+token);
}
for(const token of ["state.ledger||[]","Rental returned · ","money(e.amount)","rental-return-v9","rental-returns-v9-empty"]){
 assert.ok(v9returns.includes(token),"Section 9 return history missing "+token);
}
assert.ok(js.includes("dashboard-simple-trips")&&js.includes("state.rentals.slice(0,3)")&&
 js.includes("function renderRecentReturns(limit=4)")&&js.includes("rental-map-rentals-v9"),
 "Active rentals remain visible on Dashboard; detailed routes and returns remain in the game");
assert.ok(js.includes("el.parentElement?.setAttribute('aria-valuenow'"),"Live progress must update aria value");
const v9car={id:"car9",plate:"CA 900",type:"sedan",paint:"silver"};
const v9rental={id:"r9",carId:"car9",customer:"Family Jacobs",icon:"🚘",from:"hq",dest:"airport",start:100000,due:180000,seconds:80,payout:3400};
const v9state={fleet:[v9car],ledger:[{t:150000,amount:3450,label:"Rental returned · Wedding Party"},{t:140000,amount:600,label:"Upgrade purchased"}],stats:{returned:1}};
const v9ctx={
 state:v9state,typeOf:()=>({id:"sedan",name:"Sedan"}),CAR_IMAGES:{sedan:"assets/executive-sedan-side.webp"},
 paintFilter:()=>"none",arcadeIcon:()=>"<svg></svg>",now:()=>140000,
 DEST:{hq:{name:"Cape Town HQ"},airport:{name:"Cape Town Airport"}},
 clamp:(n,a=0,b=100)=>Math.max(a,Math.min(b,n)),round:Math.round,
 esc:v=>String(v),money:n=>"R"+Math.round(n).toLocaleString("en-ZA"),relativeTime:()=> "40s",formatTripTime:n=>n+"s",
 btn:(action,label,css,extra)=>'<button data-action="'+action+'" '+extra+'>'+label+'</button>'
};
const v9fn=vm.runInNewContext(v9code+"\nrentalCard",v9ctx);
const v9saved=JSON.stringify(v9state),v9render=v9fn(v9rental);
assert.ok(v9render.includes('src="assets/executive-sedan-side.webp"')&&v9render.includes("Family Jacobs")&&v9render.includes("CA 900"),
 "Active rental must show actual car and customer");
assert.ok(v9render.includes("PENDING ON RETURN")&&v9render.includes(v9ctx.money(3400))&&
 v9render.includes("Cape Town HQ")&&v9render.includes("Cape Town Airport"),
 "Active rental must show accurate pending payment and route");
assert.ok(v9render.includes('aria-valuenow="50"')&&v9render.includes('style="width:50%"')&&
 v9render.includes('data-countdown-rental="r9"')&&v9render.includes('data-rental-progress="r9"'),
 "Live return progress must reflect timestamps");
assert.ok(v9render.includes('data-action="page" data-id="map"')&&v9render.includes("80s trip"),"Rental must link to map and show duration");
assert.ok(v9fn({...v9rental,seconds:undefined,start:90000}).includes("90s trip"),"Legacy rentals must use saved timestamps");
const v9history=vm.runInNewContext(v9returns+"\nrenderRecentReturns",v9ctx)();
assert.ok(v9history.includes("Wedding Party")&&v9history.includes(v9ctx.money(3450))&&
 !v9history.includes("Upgrade purchased"),"Return history must use completed rental ledger entries only");
assert.equal(JSON.stringify(v9state),v9saved,"Section 9 rendering must not change saved data");
assert.ok(js.includes("const RENTAL_MIN_SECONDS=20,RENTAL_MAX_SECONDS=300;")&&
 js.includes("earn(r.payout+tip,")&&js.includes("function restoreFinished(){let due=state.rentals.filter(r=>r.due<=now())"),
 "Payment on return, original duration and offline catchup must be preserved");
console.log("PASS: Section 9 rental cards, timestamps, progress, real return ledger, payment timing and save safety.");


// Section 10 Live Map regression: preserve destinations, routes and top-down imagery.
assert.ok(html.includes('id="ctr-live-map-section-10"'),"Section 10 CSS missing");
const m10s=js.indexOf("function mapViewBox(){"),m10r=js.indexOf("function renderMap(compact=false){",m10s),m10e=js.indexOf("\nfunction renderFleet(){",m10r);
const m10p=js.indexOf("function renderMapPage(){"),m10pe=js.indexOf("\nfunction renderCommand(){",m10p);
assert.ok(m10s>=0&&m10r>m10s&&m10e>m10r&&m10p>0&&m10pe>m10p,"Section 10 map render missing");
const map10=js.slice(m10s,m10e),page10=js.slice(m10p,m10pe);
for(const term of ["mapViewBox()","MAP_CAR_IMAGES[car?.type]","MAP_CAR_IMAGES[c.type]","data-mapcar","data-maptransfer","map-route-v10","map-control-v10","zoomplus","zoomminus","mapreset","map-legend-v10"])assert.ok(map10.includes(term),"Map missing "+term);
for(const term of ["live-map-hero-v10","live-map-kpis-v10","renderMap()","data-countdown-transfer","state.rentals.map(rentalCard)","maptheme","data-compact-info=\"map-details\""])assert.ok(page10.includes(term),"Map page missing "+term);
assert.ok(js.includes("if(action==='mapreset'){selectedRental=null;mapFocus='hq';mapZoom=1;render();return;}"),"Map reset missing");
assert.ok(js.includes("document.querySelectorAll('[data-maptransfer]')")&&js.includes("el.setAttribute('viewBox',mapViewBox())"),"Transfer updates missing");
assert.ok(js.includes("const DEST={hq:{name:'Cape Town HQ',x:242,y:234}"),"Original destination coordinates changed");
assert.ok(js.includes("start:c.transferDue-12000,due:c.transferDue"),"12-second transfers changed");
const state10={rentals:[{id:"r",customer:"Demo",carId:"car",from:"hq",dest:"airport",start:100000,due:180000}],fleet:[{id:"car",type:"sedan",plate:"CA 111"}]};
const ctx10={state:state10,DEST:{hq:{name:"HQ",x:242,y:234},airport:{name:"Airport",x:540,y:279}},mapZoom:1.5,mapFocus:"airport",selectedRental:null,now:()=>140000,routePosition:()=>({x:420,y:255}),clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),esc:v=>String(v),owned:()=>false,MAP_CAR_IMAGES:{sedan:"assets/executive-sedan-topdown.webp",hatch:"assets/city-hatch-topdown.png"},mapCarPose:()=> "translate(420 255) rotate(0)",effectiveMapNight:()=>false,relativeTime:()=> "40s"};
const funcs10=vm.runInNewContext(map10+"\n({mapViewBox,renderMap})",ctx10),snapshot10=JSON.stringify(state10);
const vb10=funcs10.mapViewBox().split(" ").map(Number);assert.equal(vb10.length,4);assert.ok(vb10[0]>=0&&vb10[1]>=0&&vb10[2]<1000&&vb10[3]<620);
const markup10=funcs10.renderMap(false);
assert.ok(markup10.includes('href="assets/executive-sedan-topdown.webp"')&&markup10.includes('data-mapcar="r"'),"Original top-down image missing");
assert.ok(markup10.includes("M242 234 Q391 191.5 540 279"),"Route curve altered");
assert.ok(markup10.includes('data-action="mapfocus"')&&markup10.includes('data-action="rentalfocus"')&&markup10.includes('data-action="mapreset"'),"Map actions missing");
assert.ok(!funcs10.renderMap(true).includes('data-action="zoomplus"'),"Dashboard map controls must stay compact");
assert.equal(JSON.stringify(state10),snapshot10,"Map mutated save data");
console.log("PASS: Section 10 map, geometry, original car sprites, zoom/focus, transfers and save safety.");



// Section 11: Business HQ premium presentation, verified financial values and safe navigation.
assert.ok(html.includes('id="ctr-business-command-section-11"'),"Section 11 stylesheet missing");
const v11s=js.indexOf("function renderCommand(){"),v11e=js.indexOf("\nfunction renderBusiness(){",v11s);
const v11biz=js.slice(js.indexOf("function renderBusiness(){"),js.indexOf("\nfunction renderUpgrades(){"));
assert.ok(v11s>=0&&v11e>v11s,"Section 11 Command Centre missing");
const v11code=js.slice(v11s,v11e);
for(const token of ["staffOverhead()","branchOverhead()","bidReserve()","freeCash()","state.rentals.reduce",
 "state.loans.reduce","contractReports||{}","BRANCHES.filter","STAFF.filter","branchReport(b.id)",
 "carReady","garageCapacity()","state.history.slice(-12)","state.ledger||[]","CAR_IMAGES[typeOf(heroVehicle.type).id]",
 "renderHeroArt()","business-v11-hero","business-v11-kpi-grid","business-v11-branch-grid",
 "business-v11-chart","business-v11-transactions","business-v11-task","business-v11-footer",
 "data-group=\"business\"","data-id=\"finance\""]){
 assert.ok(v11code.includes(token),"Section 11 business view missing "+token);
}
assert.ok(!v11code.includes('business-v11-links')&&!v11code.includes('Business Departments'),
 "Business Command Centre must not duplicate the six navigation shortcuts");
for(const destination of ['command','upgrades','branches','contracts','staff','finance']){
 assert.ok(v11biz.includes("['"+destination+"',"),'Missing Business navigation destination '+destination);
}
assert.ok(v11biz.includes("business-shell-v11")&&v11biz.includes("renderTabs('business',tabs)"),
 "Business navigation and existing sub-tabs must remain");
const businessGridStyle=html.split('<style id="ctr-business-square-nav-2026">')[1]?.split('</style>')[0]||'';
assert.ok(businessGridStyle.includes('grid-template-columns:repeat(3,minmax(0,1fr))!important'),'Business options must form three equal columns on phones');
assert.ok(businessGridStyle.includes('aspect-ratio:1 / 1'),'Business navigation options must be square');
assert.ok(businessGridStyle.includes('min-height:80px!important'),'Business navigation buttons must retain touch-friendly size');
assert.ok(v11biz.includes('business-grid-icon')&&v11biz.includes('business-grid-label'),'Business buttons need separate centred icons and labels');
for(const tab of ['command','upgrades','branches','contracts','staff','finance'])
  assert.ok(v11biz.includes("['"+tab+"','<span"),'Business tab must remain available: '+tab);
assert.ok(v11biz.includes("renderTabs('business',tabs)"),'Business tabs must keep existing data-action and active-state handling');

const mock11={
 cash:120000,day:4,rep:5,branches:["hq"],fleet:[
  {id:"car1",type:"limo",status:"available",branch:"hq"},
  {id:"car2",type:"sedan",status:"rented",branch:"hq"}
 ],rentals:[{id:"r1",payout:4200}],contracts:[],staff:["sales"],
 loans:[{remaining:19000}],auction:{bidder:"You",playerBid:15000},
 history:[1200,2400,900],ledger:[
 {t:170000,amount:4200,label:"Rental returned · Family Jacobs"},
 {t:160000,amount:-700,label:"Refuel"}
 ],stats:{earned:70000,spent:25000},contractReports:{},branchReports:{hq:{count:8,revenue:26500}}
};
const mock11Before=JSON.stringify(mock11);
const c11={
 state:mock11,BRANCHES:[{id:"hq",name:"Cape Town HQ",upkeep:1500,price:0},{id:"stellenbosch",name:"Stellenbosch",upkeep:1900,price:350000}],
 STAFF:[{id:"sales",name:"Sales Agent",salary:300},{id:"mechanic",name:"Mechanic",salary:350}],
 CONTRACTS:[{id:"corporate",name:"Corporate"}],up:()=>false,
 owned:id=>id==="hq",staffed:id=>id==="sales",carReady:c=>c.status==="available",
 bidReserve:()=>15000,freeCash:()=>105000,staffOverhead:()=>300,branchOverhead:()=>1500,garageCapacity:()=>10,
 branchReport:id=>mock11.branchReports[id]||{count:0,revenue:0},typeOf:c=>({id:c,name:c}),CAR_IMAGES:{limo:"assets/limo-side.webp"},
 arcadeIcon:()=>"<svg></svg>",renderHeroArt:()=>"<svg class=\"hero-art\"></svg>",
 money:n=>"R"+Math.round(n).toLocaleString("en-ZA"),esc:s=>String(s).replaceAll('"',"&quot;"),
 btn:(action,label,cls,extra="")=>'<button data-action="'+action+'" '+extra+'>'+label+'</button>'
};
const render11=vm.runInNewContext(v11code+"\nrenderCommand",c11);
const markup11=render11();
for(const k of ["BUSINESS","TOTAL COMPANY CASH","AVAILABLE MONEY","RENTALS TO COLLECT","OPERATING COST / DAY",
 "COMPANY PERFORMANCE","Company Performance","Branch Performance","Recent Income","Recent Transactions"]){
 assert.ok(markup11.toLowerCase().includes(k.toLowerCase()),"Section 11 text missing "+k);
}
for(const n of [120000,105000,4200,1800,15000,19000,26500]){
 assert.ok(markup11.includes(c11.money(n)),"Section 11 financial number not shown: "+n);
}
assert.ok(markup11.includes('src="assets/limo-side.webp"'),"Existing vehicle art missing from Business HQ");
assert.ok(markup11.includes("Rental returned · Family Jacobs")&&markup11.includes("Refuel"),"Saved ledger transactions must be shown");
assert.ok(markup11.includes('data-id="upgrades"')&&markup11.includes('data-id="branches"')&&markup11.includes('data-id="finance"')&&markup11.includes('data-id="staff"')&&
 markup11.includes('data-id="contracts"')&&markup11.includes('data-id="overview"')&&markup11.includes('data-id="map"'),"Business shortcuts must link to existing screens");
assert.equal(JSON.stringify(mock11),mock11Before,"Business Command Centre must not mutate saves");
assert.ok(js.includes("function freeCash(){return Math.max(0,state.cash-bidReserve());}")&&
 js.includes("function staffOverhead(){return round(STAFF.filter")&&
 js.includes("function branchOverhead(){return round(BRANCHES.filter"),"Financial cost and auction reservation rules changed");
console.log("PASS: Section 11 Business HQ financial precision, navigation, income charts, branches, staff, reserves and saved-game safety.");

console.log("PASS: JavaScript syntax, 17 vehicle classes, 28 customers, all assets and 73 auction scenarios.");


// Section 12 dealership: premium presentation, no changes to economy or save version.
assert.ok(html.includes('id="ctr-dealership-section-12"'),"Dealership section style missing");
const d12start=js.indexOf("function renderDealership(){"),d12end=js.indexOf("\nfunction renderWorkshopVehicle(",d12start),d12=js.slice(d12start,d12end);
assert.ok(d12start>0&&d12end>d12start,"Dealership renderer missing");
for(const token of ["dealership-v12","dealer-v12-stage","renderHeroArt()","CAR_IMAGES[t.id]","CAR_IMAGES[x.id]","dealer-v12-filter-chips","dealer-comparison","data-dealer-result-count","data-role=\"dealer-search\"","data-role=\"dealer-class\"","data-role=\"dealer-sort\"","data-role=\"dealer-branch\"","freeCash()","bidReserve()","garageCapacity()","data-action=\"dealerfilter\""]){
 assert.ok(d12.includes(token),"Section 12 visual/behaviour feature missing "+token);
}
assert.ok(js.includes("function addCar(typeId,price=null,auction=false,branch='hq',honorExistingAuction=false)")&&
 js.includes("let cost=price??t.price;if(!spend(cost,")&&
 js.includes("state.fleet.push(car)")&&
 js.includes("modal='dealerbuy'")&&
 js.includes("if(action==='confirmbuycar')")&&
 js.includes("addCar(id,null,false,dealerBranch)"),"Purchasing must still route through original transactions");
for(const category of ["['Hatch','Sedan','Coupe','Classic','Limo']","['Bakkie','Jeep','Van','Tow','Truck','Party Bus','Bus']","['Muscle','Donk']","['Donk','Limo','Muscle','Sport','Super','Hyper']"]){
 assert.ok(js.includes(category),"Original dealer categories changed "+category);
}
assert.ok(js.includes("dealerSearch.trim().toLowerCase()"),"Dealer search must filter UI only");
assert.equal(typeList.length,17,"All 17 vehicle classes remain available");
assert.ok(js.includes("s.version!==3")&&js.includes("function saveToSlot(n)"),"Existing save model must remain");
console.log("PASS: Section 12 dealership visuals, 17 vehicles, category/search, comparison, purchase confirmation and save safety.");


// Section 13 Auction House visual integrity; preserve both auction engines.
assert.ok(html.includes('id="ctr-auctions-section-13"'),"Section 13 stylesheet missing");
const a13s=js.indexOf("function renderAuctions(){"),a13e=js.indexOf("\nfunction renderIncidents(){",a13s);
assert.ok(a13s>=0&&a13e>a13s,"Section 13 auction renderers missing");
const a13=js.slice(a13s,a13e);
for(const token of ["auctions-v13","auction-v13-intro","auction-v13-kpis","auction-v13-lot",
"auction-v13-art","auction-v13-desk","auction-v13-lead","auction-v13-bid-values",
"auction-v13-owned-card","auction-v13-owned-art","auction-v13-result",
"auction-v13-clock","data-countdown-auction","data-countdown-owned-auction",
"data-role=\"auction-owned-car\"","CAR_IMAGES[t.id]","CAR_IMAGES[a.type]",
"btn('bid'","btn('buynow'","btn('listauction'","renderHeroArt()","renderPlayerAuctions()"]){
 assert.ok(a13.includes(token),"Section 13 auction UI missing "+token);
}
assert.ok(js.includes("let bid=(a.highest||a.base)+Math.max(1000,round(a.base*.035));")&&
 js.includes("ends:now()+75000")&&
 js.includes("ends:start+75000,nextBidAt:start+5000")&&
 js.includes("const reserve=round(getResale(car)*.85)")&&
 js.includes("if(addCar(a.type,price,true,'hq',!a.tierRules))")&&
 js.includes("a.status='sold';a.salePrice=amount"),
 "Original bid increments, auction durations, reserve prices and settlements must remain");
const a13snapshot={cash:450000,rep:5,fleet:[{id:"car1",type:"hatch",status:"available",plate:"CA 123"},{id:"car2",type:"sedan",status:"auction",plate:"CA 456"}],
 auction:{id:"lot1",type:"limo",base:95000,highest:101000,bidder:"You",playerBid:101000,ends:75000},
 playerAuctions:[{id:"a1",type:"sedan",plate:"CA 456",carId:"car2",status:"active",ends:75000,highest:70000,reserve:65000,bidCount:2,bidder:"Collector"},
 {id:"a2",type:"hatch",plate:"CA 111",status:"sold",bidder:"Dealer",salePrice:90000}]};
const a13copy=JSON.stringify(a13snapshot);
const a13ctx={state:a13snapshot,CAR_IMAGES:{limo:"assets/limo-side.webp",sedan:"assets/executive-sedan-side.webp",hatch:"assets/city-hatch-side.png"},
 typeOf:id=>({id,name:id,price:200000,rate:2500}),auctionBuyNowPrice:()=>145000,round:Math.round,
 bidReserve:()=>101000,freeCash:()=>349000,garageCapacity:()=>10,relativeTime:()=>"45s",
 esc:x=>String(x),money:x=>"R"+Math.round(x).toLocaleString("en-ZA"),renderHeroArt:()=>'<svg class="hero-art"></svg>',
 paneHeading:title=>"<h3>"+title+"</h3>",fleetInGarageOrder:cars=>cars,
 canListPlayerAuctionCar:car=>car.status==='available',getResale:()=>80000,
 btn:(action,label,cls,attrs="")=>'<button data-action="'+action+'" '+attrs+'>'+label+'</button>'};
const auction13fn=vm.runInNewContext(a13+"\nrenderAuctions",a13ctx);
const auction13markup=auction13fn();
for(const imagePath of ["assets/limo-side.webp","assets/executive-sedan-side.webp","assets/city-hatch-side.png"]){
 assert.ok(auction13markup.includes('src="'+imagePath+'"'),"Auction UI missing correct image "+imagePath);
}
for(const control of ['data-countdown-auction="1"','data-countdown-owned-auction="a1"','data-role="auction-owned-car"','data-action="bid"','data-action="buynow"','data-action="listauction"']){
 assert.ok(auction13markup.includes(control),"Auction control missing "+control);
}
assert.ok(auction13markup.includes(a13ctx.money(101000))&&auction13markup.includes(a13ctx.money(145000))&&
 auction13markup.includes(a13ctx.money(65000))&&auction13markup.includes(a13ctx.money(90000)),"Displayed auction financial values incorrect");
assert.ok(auction13markup.includes("You are leading")&&auction13markup.includes("Collector")&&auction13markup.includes("Sold to Dealer"),"Auction status is incomplete");
assert.equal(JSON.stringify(a13snapshot),a13copy,"Auction screen must not mutate saved data");
console.log("PASS: Section 13 premium auction visuals, bidding, live timers, own listings, historic results and save safety.");


// Section 14: Branch network visual integrity without changes to purchase/transfer financial rules.
assert.ok(html.includes('id="ctr-branches-section-14"'),"Section 14 stylesheet missing");
const b14s=js.indexOf("function renderBranches(){"),b14e=js.indexOf("\nfunction renderContracts(){",b14s);
assert.ok(b14s>=0&&b14e>b14s,"Section 14 renderer missing");
const b14code=js.slice(b14s,b14e);
for(const required of ["branches-v14","branch-v14-hero","branch-v14-stat-row","branch-v14-map-frame","renderMap(true)",
 "branch-v14-grid","branch-v14-card","branch-v14-finance","branch-v14-fleet","branch-v14-transfer-form",
 "branch-v14-transfers","data-countdown-transfer","data-role=\"branch-transfer-select\"","CAR_IMAGES[c.type]",
 "branchReport(b.id)","branchOverhead()","BRANCHES.map","btn('page'","listBtn('branch'","listBtn('branchtransfer'",
 "freeCash()","state.fleet.filter","renderHeroArt()","relativeTime(c.transferDue)"]){
 assert.ok(b14code.includes(required),"Section 14 missing "+required);
}
assert.ok(js.includes("function transferCar(carId,branch){")&&
 js.includes("c.transferDue=now()+12000")&&js.includes("c.transferFrom=c.branch")&&
 js.includes("c.status='transfer'")&&
 js.includes("function buildBranch(id){let b=BRANCHES.find")&&
 js.includes("state.branches.push(id)")&&
 js.includes("function branchOverhead(){return round(BRANCHES.filter")&&
 js.includes("function branchReport(id){return state.branchReports?.[id]||{count:0,revenue:0};}")&&
 js.includes("document.querySelectorAll('[data-countdown-transfer]')"),
 "Preserve original branch expansion and live transfer engine");
const b14Branches=[
 {id:"hq",name:"Cape Town HQ",price:0,upkeep:1500,desc:"Flagship"},
 {id:"stellenbosch",name:"Stellenbosch",price:350000,upkeep:1900,desc:"Wine Country"},
 {id:"franschhoek",name:"Franschhoek",price:600000,upkeep:2500,desc:"Scenic tours"}];
const b14state={cash:750000,branches:["hq","stellenbosch"],fleet:[
 {id:"one",type:"sedan",plate:"CA 123",branch:"hq",status:"available"},
 {id:"two",type:"hatch",plate:"CA 456",branch:"stellenbosch",status:"rented"},
 {id:"three",type:"bakkie",plate:"CA 999",branch:"hq",status:"transfer",transferFrom:"hq",transferTo:"stellenbosch",transferDue:12500}
],branchReports:{hq:{revenue:12000,count:8},stellenbosch:{revenue:9000,count:4}}};
const b14saved=JSON.stringify(b14state);
const b14Money=x=>"R"+Math.round(x).toLocaleString("en-ZA");
const b14ctx={
 state:b14state,BRANCHES:b14Branches,DEST:{hq:{name:"Cape Town HQ"},stellenbosch:{name:"Stellenbosch"},franschhoek:{name:"Franschhoek"}},
 CAR_IMAGES:{sedan:"assets/executive-sedan-side.webp",hatch:"assets/city-hatch-side.png",bakkie:"assets/adventure-bakkie-side.png"},
 owned:id=>b14state.branches.includes(id),freeCash:()=>700000,branchOverhead:()=>3400,
 branchReport:id=>b14state.branchReports[id]||{count:0,revenue:0},typeOf:id=>({id,name:id}),
 statusMsg:status=>status.toUpperCase(),fleetInGarageOrder:cars=>[...cars],
 esc:v=>String(v),money:b14Money,relativeTime:()=>"9s",
 renderHeroArt:()=>'<svg class="hero-art"></svg>',renderMap:compact=>compact?'<div class="map-frame-v10">MAP</div>':"",
 btn:(action,label,cls,attrs="")=>'<button data-action="'+action+'" '+attrs+'>'+label+'</button>',
 listBtn:(action,id,label,cls,attrs="")=>'<button data-action="'+action+'" data-id="'+id+'" '+attrs+'>'+label+'</button>'
};
const b14Render=vm.runInNewContext(b14code+"\nrenderBranches",b14ctx);
const b14Markup=b14Render();
for(const field of ["Cape Town HQ","Stellenbosch","Franschhoek","R350","R600","R12","R9","R3","data-action=\"branchtransfer\"","data-action=\"branch\"","data-countdown-transfer=\"three\"","MAP"]){
 assert.ok(b14Markup.includes(field),"Section 14 missing grounded branch UI "+field);
}
for(const asset of ["assets/executive-sedan-side.webp","assets/city-hatch-side.png","assets/adventure-bakkie-side.png"]){
 assert.ok(b14Markup.includes('src="'+asset+'"'),"Section 14 car art mismatch "+asset);
}
assert.ok(b14Markup.includes('data-role="branch-transfer-select" data-id="hq"')&&
 b14Markup.includes('data-role="branch-transfer-select" data-id="stellenbosch"'),
 "Only open branches should offer vehicle transfers");
assert.ok(!b14Markup.includes('data-role="branch-transfer-select" data-id="franschhoek"'),
 "Locked branches must not expose transfer controls");
assert.equal(JSON.stringify(b14state),b14saved,"Rendering branch network must not modify saved game data");
console.log("PASS: Section 14 Branch Network, map reuse, vehicle assignments, accurate money, 12s transfers and save safety.");


// Section 15 Staff: exact roles, payment formulas, UI state and saved-game preservation.
assert.ok(html.includes('id="ctr-staff-section-15"'),"Staff stylesheet missing");
const s15s=js.indexOf("function renderStaff(){"),s15e=js.indexOf("\nfunction renderFinance(){",s15s);
assert.ok(s15s>=0&&s15e>s15s,"Staff view missing");
const s15src=js.slice(s15s,s15e);
for(const word of ["staff-v15-hero","staff-v15-kpis","staff-v15-grid","staff-v15-card","staff-v15-costs",
 "staff-v15-benefit","staff-v15-progress-bar","staff-v15-active-list","staff-v15-payrow","staff-v15-filter",
 "data-action=\"stafffilter\"","money(x.cost)","money(x.salary)","esc(x.desc)","staffOverhead()",
 "branchOverhead()","freeCash()","renderHeroArt()","listBtn('hire'"]){
 assert.ok(s15src.includes(word),"Section 15 employee panel missing "+word);
}
const s15team=vm.runInNewContext(decl("STAFF", "];")+"\nSTAFF");
assert.equal(s15team.length,5);
assert.deepEqual(Array.from(s15team,x=>x.id),["sales","mechanic","driver","concierge","accountant"]);
assert.deepEqual(Array.from(s15team,x=>x.cost),[24000,28000,22000,35000,38000]);
assert.deepEqual(Array.from(s15team,x=>x.salary),[300,350,300,400,450]);
const s15state={day:7,staff:["sales","mechanic"],cash:100000},s15before=JSON.stringify(s15state);
const s15ctx={state:s15state,STAFF:s15team,staffFilter:"all",staffed:id=>s15state.staff.includes(id),
 staffOverhead:()=>585,branchOverhead:()=>1500,freeCash:()=>85000,
 money:n=>"R"+Math.round(n).toLocaleString("en-ZA"),esc:v=>String(v),renderHeroArt:()=>'<svg class="hero-art"></svg>',
 listBtn:(action,id,label,cls,attrs="")=>'<button data-action="'+action+'" data-id="'+id+'" '+attrs+'>'+label+'</button>'};
const s15fn=vm.runInNewContext(s15src+"\nrenderStaff",s15ctx);
const s15view=s15fn();
for(const name of ["Sales Agent","Mechanic","Fleet Driver","Guest Concierge","Accountant"])assert.ok(s15view.includes(name),"Missing employee "+name);
for(const n of [650,585,1500,2085,85000,24000,28000,22000,35000,38000])assert.ok(s15view.includes(s15ctx.money(n)),"Staff value missing "+n);
assert.ok(s15view.includes('data-action="hire" data-id="sales" disabled')&&
 s15view.includes('data-action="hire" data-id="driver"')&&
 s15view.includes('aria-valuenow="2"')&&s15view.includes('style="width:40%"'),"Hiring controls or progress incorrect");
s15ctx.staffFilter="available";
const s15filtered=s15fn();
assert.ok(!s15filtered.includes('aria-label="Sales Agent"')&&s15filtered.includes('aria-label="Fleet Driver"'),"Hiring status filter incorrect");
assert.equal(JSON.stringify(s15state),s15before,"Rendering must not mutate employee saves");
assert.ok(js.includes("function hire(id){let x=STAFF.find(v=>v.id===id);if(!x||staffed(id))return;if(!spend(x.cost,")&&
 js.includes("state.staff.push(id)")&&
 js.includes("function staffOverhead(){return round(STAFF.filter")&&
 js.includes("const total=staffOverhead()+branchOverhead();")&&
 js.includes("if(modal==='staffhire')")&&
 js.includes("if(action==='confirmhire'){if(modal!=='staffhire'||id!==modalCar)return;modal=null;hire(id);afterAction();return;}")&&
 js.includes("s.version!==3"),"Staff transaction, payroll or save rules changed");
console.log("PASS: Section 15 employee roster, hiring confirmation, real wages/effects and save-safe display.");


// Section 16 — verify both redesigned upgrade screens and untouched upgrade engines.
assert.ok(html.includes('id="ctr-upgrades-section-16"'),"Section 16 styling missing from offline HTML");
const standard16Start=js.indexOf("function renderUpgrades(){"),standard16End=js.indexOf("\nfunction renderBranches(){",standard16Start);
const premium16Start=js.indexOf("function renderPremiumUpgrades(){"),premium16End=js.indexOf("\nfunction renderStats(){",premium16Start);
assert.ok(standard16Start>=0&&standard16End>standard16Start&&premium16Start>=0&&premium16End>premium16Start,"Upgrade renderers missing");
const standard16=js.slice(standard16Start,standard16End),premium16=js.slice(premium16Start,premium16End);
for(const token of ["upgrade16-shell","upgrade16-hero","upgrade16-kpis","upgrade16-grid","upgrade16-card","upgrade16-price","autoDeskControl()","autoCareControl()","listBtn('upgrade'","money(x.price)","freeCash()","renderHeroArt()","data-sub=\"premium\""])
 assert.ok(standard16.includes(token),"Section 16 standard UI missing "+token);
for(const token of ["premium16-shell","premium16-grid","premium16-card","premium16-track","premium16-values","premium16-buyrow","premium16-max","PRESTIGE_PERKS.map","[1,5,10]","premiumTotalCost(level+creditUsed,n-creditUsed)","premiumLabel(id,level)","listBtn('premium'","data-qty"])
 assert.ok(premium16.includes(token),"Section 16 premium UI missing "+token);
assert.ok(js.includes("function buyUpgrade(id){let x=UPGRADES.find")&&
 js.includes("function premiumCost(level){return 10000+640*level+80*level*level;}")&&
 js.includes("function premiumTotalCost(level,qty){let total=0;")&&
 js.includes("let credits=Math.min(qty,Math.max(0,Math.floor(Number(state.premiumCredits)||0)));")&&
 js.includes("state.perks[id]=level+qty;")&&js.includes("s.version!==3"),
 "Section 16 must preserve upgrade prices, batch formulas, credits and saves");
console.log("PASS: Section 16 both upgrade screens, 1/5/10 controls, 100-level caps, existing automation and safe economy.");


// Section 17: Event & Contract presentation must retain original mechanisms.
assert.ok(html.includes('id="ctr-events-section-17"'),"Section 17 stylesheet missing");
const e17sections=[["renderContracts","renderStaff",["contract17-grid","data-contract-countdown","listBtn('contract'","contractReport(c.id)","Math.round((c.premium-1)*100)"]],
["renderIncidents","dailyMissions",["event17-inc-vehicle","CAR_IMAGES[c?.type]","listBtn('resolve'","up('insurance')?450:900"]],
["renderChallenges","renderRoadmap",["event17-track","data-countdown-event-day","listBtn('claimmission'","section4Missions()"]],
["renderWeather","renderEvents",["event17-weather-values","renderMap(true)","WEATHER_EFFECTS","btn('maptheme'"]]];
for(const [name,next,tokens] of e17sections){
 const s=js.indexOf("function "+name+"(){"),e=js.indexOf("\nfunction "+next+"(){",s);
 assert.ok(s>=0&&e>s,"Section 17 missing "+name);
 for(const token of tokens)assert.ok(js.slice(s,e).includes(token),name+" missing "+token);
}
const e17contracts=vm.runInNewContext(decl("CONTRACTS", "];")+"\nCONTRACTS");
assert.equal(e17contracts.length,5,"Exactly five contracts must remain");
assert.deepEqual(Array.from(e17contracts,c=>c.period),[34,36,40,42,42],"Contract timers changed");
assert.deepEqual(Array.from(e17contracts,c=>c.rep),[2,3,5,8,10],"Contract unlock requirements changed");
assert.ok(js.includes("function signContract(id){let c=CONTRACTS.find")&&js.includes("state.contractLast[id]=now()")&&
 js.includes("function resolveIncident(id){let inc=state.incidents.find")&&
 js.includes("let cost=up('insurance')?450:900")&&
 js.includes("function claimMission(id){let m=section4Missions()")&&
 js.includes("state.daily.claimed.push(m.id);earn(m.reward,")&&
 js.includes("document.querySelectorAll('[data-countdown-event-day]')")&&
 js.includes("arcadeFx('DAILY REWARD'")&&
 js.includes("arcadeFx('ACHIEVEMENT UNLOCKED'")&&
 js.includes("s.version!==3"),"Existing event logic, notifications or save rules changed");
console.log("PASS: Section 17 original five corporate clients, mission rewards, roadside fees, weather map, timers and visual notification safety.");


// Cross-tab Android layout audit (all six primary pages and their subviews).
const auditSource=(start,end)=>{
 const a=js.indexOf(start),b=js.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,'UI navigation section missing: '+start);
 return js.slice(a,b);
};
const auditCss=(id)=>{
 const css=html.split('<style id="'+id+'">')[1]?.split('</style>')[0];
 assert.ok(css,'Mobile layout stylesheet missing: '+id);
 return css;
};
const mainTabs=auditSource('const NAV=','function btn(');
for(const tab of ['overview','fleet','map','business','events','progress']){
 assert.ok(mainTabs.includes("['"+tab+"'"),'Missing navigation route: '+tab);
}
assert.equal((mainTabs.match(/\['(?:overview|fleet|map|business|events|progress)'/g)||[]).length,6,'Exactly six main navigation tabs must remain');
const mainScreen=auditSource('function render(){','function afterAction(){');
assert.match(mainScreen,/class="mobile-nav"/,'Android dock must be present');
assert.match(mainScreen,/data-action="page"/,'Android dock must keep working navigation');
for(const page of ['overview','fleet','map','business','events']){
 assert.ok(mainScreen.includes("activePage==='"+page+"'"),'Main renderer route missing: '+page);
}
assert.ok(mainScreen.includes('renderProgress()'),'Progress page renderer missing');

const fleetMenu=auditSource('function renderFleet(){','const openInfoPanels=');
for(const sub of ['garage','dealership','care','tuning'])assert.ok(fleetMenu.includes("['"+sub+"'"),'Fleet menu missing '+sub);
assert.match(fleetMenu,/class="fleet-command-tabs"/,'Fleet navigation grid missing');
assert.match(auditCss('ctr-fleet-shell-section-03'),/@media\(max-width:720px\)/,'Fleet requires phone breakpoint');
assert.match(auditCss('ctr-garage-section-04'),/@media\(max-width:720px\)/,'Garage needs mobile layout');
assert.match(auditCss('ctr-dealership-mobile-head-fix-2026'),/grid-template-columns:minmax\(0,1fr\)!important/,'Showroom header must not be squeezed into badge column');
assert.match(auditCss('ctr-workshop-section-06'),/@media\(max-width:720px\)/,'Workshop needs mobile layout');
assert.match(auditCss('ctr-performance-section-07'),/@media\(max-width:720px\)/,'Performance needs mobile layout');

const livePage=auditSource('function renderMapPage(){','function renderCommand(){');
for(const component of ['live-map-hero-v10','live-map-panel-v10','live-map-trips-v10','live-map-places-v10']){
 assert.ok(livePage.includes(component),'Live map content missing '+component);
}
assert.match(auditCss('ctr-live-map-section-10'),/@media\(max-width:720px\)/,'Live map needs phone breakpoint');

const businessMenu=auditSource('function renderBusiness(){','function renderUpgrades(){');
for(const tab of ['command','upgrades','branches','contracts','staff','finance'])assert.ok(businessMenu.includes("['"+tab+"'"),'Business section missing '+tab);
assert.match(businessMenu,/renderTabs\('business',tabs\)/,'Business navigation handler missing');
assert.match(auditCss('ctr-business-square-nav-2026'),/aspect-ratio:1 \/ 1/,'Business buttons must remain square');
for(const id of ['ctr-business-command-section-11','ctr-branches-section-14','ctr-staff-section-15','ctr-upgrades-section-16']){
 assert.match(auditCss(id),/@media\(max-width:/,'Missing responsive Business stylesheet '+id);
}

const eventsMenu=auditSource('function renderEvents(){','function renderAuctions(){');
for(const tab of ['auctions','incidents','challenges','weather'])assert.ok(eventsMenu.includes("['"+tab+"'"),'Events section missing '+tab);
assert.match(eventsMenu,/renderTabs\('events',tabs\)/,'Events tabs must remain interactive');
assert.match(auditCss('ctr-auctions-section-13'),/@media\(max-width:640px\)/,'Auctions need phone breakpoint');
assert.match(auditCss('ctr-events-section-17'),/@media\(max-width:640px\)/,'Events need phone breakpoint');

const progressMenu=auditSource('function renderProgress(){','function renderMilestones(){');
for(const tab of ['milestones','premium','stats','roadmap','settings'])assert.ok(progressMenu.includes("['"+tab+"'"),'Progress section missing '+tab);
assert.match(progressMenu,/renderTabs\('progress',tabs\)/,'Progress tabs must remain interactive');
assert.match(auditCss('ctr-progress-section-18'),/@media\(max-width:580px\)/,'Progress needs phone breakpoint');
assert.match(auditCss('ctr-responsive-compact-v2'),/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/,'Mobile tab layout needs equal columns');
assert.match(auditCss('ctr-dashboard-portrait-alignment-2026'),/safe-area-inset-bottom/,'Main Android dock needs safe-area padding');
assert.ok(js.includes("const KEY='cape-town-rentals-coastline-v3'"),'V3 save structure must remain unchanged');
console.log('PASS: Cross-tab navigation, 19 subviews, portrait CSS rules and Android dock protections.');
