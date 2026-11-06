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
assert.ok(js.includes("['Bakkie','Jeep','Van','Tow','Truck','Party Bus','Bus']"), "Tow Truck and Party Bus must appear in Commercial & Tours");
const donk = byId.get("donk");
assert.ok(donk, "Missing Donk");
assert.equal(typeList.findIndex(t => t.id === "donk"), typeList.findIndex(t => t.id === "limo")-1, "Donk belongs immediately before Limo");
assert.equal(typeList.findIndex(t => t.id === "donk"), typeList.findIndex(t => t.id === "truck")+1, "Donk follows Delivery Truck");
assert.equal(donk.category, "Donk");
assert.equal(donk.price, 365000);
assert.equal(donk.rate, 2300);
assert.equal(donk.tank, 68);
assert.equal(donk.unlock, 4);
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
assert.equal(limo.unlock,4);
assert.equal(horsepower.limo,390);
assert.ok(limo.price>donk.price&&limo.price<byId.get("muscle").price,"Limo price must sit between Donk and Muscle");
assert.ok(limo.rate>donk.rate&&limo.rate<byId.get("muscle").rate,"Limo rental rate must sit between Donk and Muscle");
assert.deepEqual(Array.from(customerList.filter(c=>c.need==="Limo").map(c=>c.id).sort()),["airport-vip-transfer","matric-farewell","wedding-chauffeur"],"Three dedicated Limo customers required");
assert.ok(!("Limo" in equivalence),"Limo customers must use exact category matching");
assert.ok(js.includes("['Hatch','Sedan','Coupe','Classic','Limo'].includes(t.category)"),"Limo must appear in executive dealership category");
assert.ok(js.includes("let t=pick(TYPES.filter(x=>x.unlock<=state.rep));"),"Generic auction lots must include the new Limo at level 4");

const partyBus=byId.get("partybus");
assert.ok(partyBus,"Party Bus vehicle must exist");
assert.equal(typeList.findIndex(t=>t.id==="partybus"),typeList.findIndex(t=>t.id==="muscle")+1,"Party Bus follows Muscle");
assert.equal(typeList.findIndex(t=>t.id==="partybus"),typeList.findIndex(t=>t.id==="bus")-1,"Party Bus must immediately precede Tour Bus");
assert.equal(partyBus.category,"Party Bus");
assert.equal(partyBus.price,495000);
assert.equal(partyBus.rate,2850);
assert.equal(partyBus.tank,115);
assert.equal(partyBus.unlock,5);
assert.equal(horsepower.partybus,300);
assert.ok(partyBus.price>byId.get("muscle").price&&partyBus.price<byId.get("bus").price,"Party Bus purchase price should fall between Muscle and Tour Bus");
assert.ok(partyBus.rate>byId.get("bus").rate&&partyBus.rate<byId.get("sport").rate,"Party Bus rate should fall between Tour Bus and Sports");
assert.deepEqual(Array.from(customerList.filter(c=>c.need==="Party Bus").map(c=>c.id).sort()),
  ["bachelorette-party","birthday-bash-crew","corporate-celebration-shuttle"],"Three dedicated Party Bus requests must exist");
assert.ok(!("Party Bus" in equivalence),"Party Bus uses exact-category matching");
assert.ok(js.includes("type==='bus'||type==='partybus'||type==='classic'"),"Party Bus top-down sprite must have map rotation");
assert.ok(js.includes("['Bakkie','Jeep','Van','Tow','Truck','Party Bus','Bus'].includes(t.category)"),"Party Bus appears in Commercial & Tours");
assert.ok(js.includes("let t=pick(TYPES.filter(x=>x.unlock<=state.rep));"),"Random auction must include unlocked Party Bus models");

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
assert.equal(successful, 70, "Failed auction bidding, owned-sale or protection scenarios");
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
const awardRepXP=vm.runInNewContext(repSource+"\n"+awardSource+"\nawardRepXP",
  {state:progressState,note:()=>{}});
for(let i=0;i<299;i++)awardRepXP(10);
assert.equal(progressState.rep,9, "299 rentals should not reach Reputation 10");
awardRepXP(10);
assert.equal(progressState.rep,10, "300 rentals should reach Reputation 10");
assert.equal(progressState.xp,0, "XP should reset on the exact Reputation 10 threshold");
console.log("PASS: Reputation 2 to 10 needs exactly 300 base-XP rentals.");

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
assert.ok(js.includes("fleetInGarageOrder(state.fleet).map(x=>smallCar(x,{action:'care'}))"),"Workshop ordering mismatch");
assert.ok(js.includes("fleetInGarageOrder(state.fleet).map(c=>{let t=typeOf(c.type),cost="),"Performance ordering mismatch");
assert.ok(js.includes("fleetInGarageOrder(free).map(c=>"),"Branch transfer ordering mismatch");
assert.ok(js.includes("fleetInGarageOrder(state.fleet.filter(canListPlayerAuctionCar))"),"Owned auction ordering mismatch");
assert.ok(js.includes('data-compact-info="garage-bulk-actions"')&&js.includes('data-compact-info="garage-operations"'),"Garage operations must be reachable");
assert.ok(js.includes('data-compact-info="map-details"'),"Map details must remain reachable");
assert.ok(html.includes('id="ctr-responsive-compact-v2"'),"Compact CSS missing");
console.log("PASS: Garage vehicle ordering and responsive Info sections.");

// Section 2: artwork-backed dashboard controls and routing may change visually,
// but must never stop dispatching cars or hide live activity.
const dashStart=js.indexOf("function renderOverview(){");
const dashEnd=js.indexOf("function stat(",dashStart);
const dashMarkup=js.slice(dashStart,dashEnd);
const dashTileStart=js.indexOf("function dashboardShortcut(");
const dashTileEnd=js.indexOf("function autoDeskControl()",dashTileStart);
assert.ok(dashStart>=0&&dashEnd>dashStart&&dashTileStart>=0&&dashTileEnd>dashTileStart,
  "Section 2 Dashboard helper functions missing");
assert.ok(html.includes('id="ctr-design-foundation-section-01"')&&html.includes('id="ctr-dashboard-section-02"'),
  "Arcade styling must ship with both Dashboard and shared design tokens");
assert.equal((dashMarkup.match(/dashboardShortcut\(/g)||[]).length,9,"Dashboard needs all nine quick action tiles");
for(const part of ["smartOverview()","dashboard-city-strip","dashboard-summary","dashboard-rental-desk",
                  "autoDeskControl()","map(rentalCard)","map(offerCard)","renderMap(true)",
                  "renderLog(5)","nextActions()"]){
 assert.ok(dashMarkup.includes(part),"Dashboard regression: missing "+part);
}
const dashIconStart=js.indexOf("function arcadeIcon("),dashIconEnd=js.indexOf("function renderHeroArt(",dashIconStart);
assert.ok(dashIconStart>=0&&dashIconEnd>dashIconStart,"Section 2 illustrated arcade icon renderer missing");
const shortcutFn=vm.runInNewContext(js.slice(dashIconStart,dashIconEnd)+"\n"+js.slice(dashTileStart,dashTileEnd)+"\ndashboardShortcut");
assert.match(shortcutFn("🔑","Dispatch Rental","rental","","gold"),/class="arcade-art-icon"/,
  "Dispatch shortcut must render the custom illustrated icon");
assert.match(shortcutFn("🚘","Garage","fleet","garage"),/class="arcade-art-icon"/,
  "Garage shortcut must render the custom illustrated icon");
assert.ok(js.includes('data-id="progress" data-sub="settings" aria-label="Settings"'),
  "Header gear must route to real Settings rather than the game guide");
assert.ok(html.includes("SECTION 02 POLISH")&&js.includes("function renderHeroArt()"),
  "Cape Town scene and portrait polish must be bundled for offline Android");
assert.match(shortcutFn("🔑","Dispatch Rental","rental","","gold"),/data-action="autorent"/,
  "Dispatch tile must initiate a real rental, not merely open the Garage");
assert.match(shortcutFn("🚘","Garage","fleet","garage"),/data-action="dashshortcut" data-id="fleet" data-sub="garage"/);
assert.match(shortcutFn("🔧","Workshop & Wash","fleet","care"),/data-sub="care"/);
assert.match(shortcutFn("🎟️","Auctions","events","auctions"),/data-sub="auctions"/);
assert.match(shortcutFn("💼","Staff","business","staff"),/data-sub="staff"/);
assert.ok(js.includes("if(action==='dashshortcut')")&&js.includes("const destinations={fleet:"),
  "Quick-action tab navigation must be routed through the existing app handler");
assert.ok(js.includes("if(action==='autorent')")&&js.includes("startRental(offer.id)"),
  "The Dashboard must keep the original rental dispatch logic");
console.log("PASS: Dashboard section 2 uses live dispatch, 9 routed actions, live rentals, requests, city status and saved game foundation.");



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

console.log("PASS: JavaScript syntax, 17 vehicle classes, 28 customers, all assets and 70 auction scenarios.");
