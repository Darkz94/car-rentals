import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const source=fs.readFileSync(path.resolve(import.meta.dirname,'../index.html'),'utf8');
const js=source.split('<script>')[1]?.split('</script>')[0];
assert.ok(js,'script exists');
new vm.Script(js);
for(const name of ['logVehicle','restorationPrice','findSalvage','buySalvage','restoreSalvage','carHistoryPanel','restorationPanel'])assert.ok(js.includes('function '+name+'('),name);
for(const token of ['salvageOffers:[]','status:\'restoration\'','mileageKnown','serviceHistory','tripKm','restorationPanel()'])assert.ok(js.includes(token),token);
assert.ok(js.includes("const KEY='cape-town-rentals-coastline-v3'"));
const fleet=js.split('function renderFleet(){')[1]?.split('const openInfoPanels=')[0]||'';
const care=js.split('function renderCare(){')[1]?.split('function renderTuning(){')[0]||'';
assert.ok(fleet.includes("selected==='restoration'?restorationPanel()"),'Fleet Restoration tab must render original projects');
assert.ok(fleet.includes("['restoration','Restoration'"),'A dedicated fifth Fleet tab must exist');
assert.ok(!care.includes('restorationPanel()'),'Workshop must not duplicate Restoration');
assert.ok(source.includes(' .fleet-command-tabs{grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}'),'Compact portrait Fleet tabs must use a 3-column grid');

// Exercise the real restoration state machine using a controllable clock.
const getFunction=(name)=>{
 const start=js.indexOf('function '+name+'('),end=js.indexOf('\nfunction ',start+1);
 assert.ok(start>=0&&end>start,'Missing function '+name);
 return js.slice(start,end);
};
const functionSource=['logVehicle','restorationPrice','restorationStageDuration','restorationWorkProgress','restoreSalvage'].map(getFunction).join('\n');
const durations=[2,5,10,15],names=['Diagnostics','Mechanical rebuild','Bodywork restoration','Roadworthy inspection & detail'];
const fixture={
 nowMs:1000000,
 state:{cash:500000,stats:{services:0,washes:0,filled:0},fleet:[
  {id:'a',status:'restoration',type:'hatch',plate:'CA 111',condition:20,body:25,clean:5,fuel:20,
   mileage:92000,serviceHistory:[],parts:{engine:20},restoration:{stage:0,spent:15000,purchase:15000}},
  {id:'b',status:'restoration',type:'hatch',plate:'CA 222',condition:15,body:30,clean:8,fuel:20,
   mileage:105000,serviceHistory:[],parts:{engine:15},restoration:{stage:0,spent:15000,purchase:15000}}
 ]},
 spentCalls:0
};
const context={
 state:fixture.state,now:()=>fixture.nowMs,Number,Math,round:Math.round,RESTORATION_STAGE_MINUTES:durations,
 RESTORATION_STAGE_NAMES:names,
 typeOf:()=>({price:89000}),CAR_PARTS:[['engine'],['tyres'],['brakes'],['oil'],['battery']],
 money:value=>'R'+value,notify:()=>{},note:()=>{},
 spend:value=>{fixture.spentCalls++;if(value>fixture.state.cash)return false;fixture.state.cash-=value;return true;}
};
vm.createContext(context);vm.runInContext(functionSource,context);
const car=fixture.state.fleet[0],other=fixture.state.fleet[1];
for(const [n,mins] of durations.entries())assert.equal(context.restorationStageDuration(n),mins*60000);
assert.equal(context.restoreSalvage('a'),true,'First stage must start');
assert.equal(fixture.spentCalls,1,'Charge only at start');
assert.equal(car.restoration.stage,0,'Starting does not finish or advance the stage');
assert.equal(car.restoration.work.dueAt-fixture.nowMs,120000);
assert.equal(context.restoreSalvage('a'),false,'Cannot skip cooldown using a second click');
assert.equal(fixture.spentCalls,1,'No repeat charge during cooldown');
assert.equal(context.restoreSalvage('b'),true,'Can start second project independently');
assert.equal(other.restoration.work.dueAt-fixture.nowMs,120000);
assert.equal(other.restoration.stage,0);
assert.equal(context.restorationWorkProgress(car.restoration.work,fixture.nowMs),0);
fixture.nowMs+=60000;
assert.equal(context.restorationWorkProgress(car.restoration.work,fixture.nowMs),50);
assert.equal(context.restoreSalvage('a'),false,'Cannot finish diagnostics at one minute');
// Simulate closing and reopening: work is persisted JSON, not a JavaScript timeout.
const reopened=JSON.parse(JSON.stringify(car));
fixture.state.fleet[0]=reopened;
fixture.nowMs+=60000;
assert.equal(context.restoreSalvage('a'),true,'Collect once when deadline reached after app restart');
assert.equal(reopened.restoration.stage,1);
assert.equal(reopened.restoration.work,undefined);
assert.equal(fixture.spentCalls,2,'Collect must not re-charge (second payment was car b)');
assert.equal(reopened.serviceHistory.filter(x=>x.kind==='Restoration completed').length,1);
assert.equal(context.restoreSalvage('a'),true,'Start next paid stage');
assert.equal(reopened.restoration.work.dueAt-fixture.nowMs,300000,'Stage 2 is 5 minutes');
assert.equal(context.restoreSalvage('a'),false,'Cannot instantly claim mechanical work');
fixture.nowMs+=300000;
assert.equal(context.restoreSalvage('a'),true,'Collect mechanical stage');
assert.equal(reopened.condition,100);
assert.equal(reopened.restoration.stage,2);
assert.equal(context.restoreSalvage('a'),true,'Start bodywork stage');
assert.equal(reopened.restoration.work.dueAt-fixture.nowMs,600000,'Stage 3 is 10 minutes');
assert.equal(reopened.body,25,'Starting bodywork must not repair panels');
fixture.nowMs+=600000;
assert.equal(context.restoreSalvage('a'),true,'Collect bodywork');
assert.equal(reopened.body,100);
assert.equal(context.restoreSalvage('a'),true,'Start final stage');
assert.equal(reopened.restoration.work.dueAt-fixture.nowMs,900000,'Final stage is longest: 15 minutes');
assert.equal(reopened.status,'restoration','Car remains unrentable during roadworthy');
fixture.nowMs+=899999;
assert.equal(context.restoreSalvage('a'),false,'One millisecond early cannot claim final stage');
assert.equal(reopened.status,'restoration');
fixture.nowMs+=1;
assert.equal(context.restoreSalvage('a'),true);
assert.equal(reopened.status,'available');
assert.equal(reopened.restoration.stage,4);
assert.equal(reopened.restoration.work,undefined);
assert.equal(context.restoreSalvage('a'),false,'No repeat final-stage reward');
assert.equal(reopened.serviceHistory.filter(x=>x.kind==='Restoration started').length,4);
assert.equal(reopened.serviceHistory.filter(x=>x.kind==='Restoration completed').length,4);
assert.equal(fixture.spentCalls,5,'Four stage charges for car a; one for car b');
assert.equal(other.restoration.stage,0,'Second car remains independently in progress');
assert.match(js,/data-restoration-timer/);
assert.match(js,/data-restoration-fill/);
assert.match(js,/function refreshLive\(\)/);
console.log('PASS: 2/5/10/15-minute cooldowns, real-time save persistence, independent jobs, no instant repairs, one charge per stage.');
