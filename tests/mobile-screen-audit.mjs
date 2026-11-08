import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const contentTypes={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{
 let filename;
 try {
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  filename=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(filename!==root&&!filename.startsWith(root+path.sep)){res.writeHead(403).end();return}
 }catch(err){res.writeHead(400).end();return}
 fs.readFile(filename,(err,data)=>{
  if(err){res.writeHead(404).end();return}
  res.writeHead(200,{'Content-Type':contentTypes[path.extname(filename)]||'application/octet-stream'});
  res.end(data);
 });
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const address=server.address(),url='http://127.0.0.1:'+address.port+'/';
const scenarios=[
 ['overview',null],
 ['fleet','garage'],['fleet','dealership'],['fleet','care'],['fleet','tuning'],
 ['map',null],
 ['business','command'],['business','upgrades'],['business','branches'],
 ['business','contracts'],['business','staff'],['business','finance'],
 ['events','auctions'],['events','incidents'],['events','challenges'],['events','weather'],
 ['progress','milestones'],['progress','premium'],['progress','stats'],
 ['progress','roadmap'],['progress','settings']
];
const problems=[];
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
try{
 for(const width of [360,412]){
  const page=await browser.newPage({viewport:{width,height:820},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  const jsErrors=[];
  page.on('pageerror',error=>jsErrors.push(String(error?.message||error)));
  await page.goto(url,{waitUntil:'load',timeout:60000});
  await page.locator('.mobile-nav').waitFor({timeout:25000});
  for(const [route,sub] of scenarios){
   const name=route+(sub?'/'+sub:'');
   try{
    await page.evaluate(({route,sub})=>{
      const main=[...document.querySelectorAll('.mobile-nav button[data-action="page"]')].find(el=>el.dataset.id===route);
      if(!main)throw Error('Missing navigation button '+route);
      main.click();
      if(sub){
       const btn=[...document.querySelectorAll('button[data-action="sub"]')].find(el=>el.dataset.group===route&&el.dataset.id===sub);
       if(!btn)throw Error('Missing submenu '+route+'/'+sub);
       btn.click();
      }
    },{route,sub});
    await page.waitForTimeout(70);
    const result=await page.evaluate(()=>{
      const view=innerWidth;
      const root=document.documentElement;
      const visible=el=>{const r=el.getBoundingClientRect(),st=getComputedStyle(el);return r.width>0&&r.height>0&&st.display!=='none'&&st.visibility!=='hidden'};
      const focus=[...document.querySelectorAll('.main,.main > .topbar,.main .fleet-command-banner,.main .dealer-pavilion-header,.main .progress18-hero,.main .event17-hero,.main .live-map-hero-v10,.main .business-v11-hero')].filter(visible);
      const outside=focus.filter(el=>{let r=el.getBoundingClientRect();return r.left < -14 || r.right > view+14}).map(el=>({className:typeof el.className==='string'?el.className.slice(0,85):'',left:Math.round(el.getBoundingClientRect().left),right:Math.round(el.getBoundingClientRect().right)}));
      const narrow=[...document.querySelectorAll('.dealer-pavilion-header h2')].filter(visible).map(el=>({width:Math.round(el.getBoundingClientRect().width),parent:Math.round(el.closest('.dealer-pavilion-header').getBoundingClientRect().width)})).filter(x=>x.width<x.parent*.67);
      const dock=[...document.querySelectorAll('.mobile-nav button')].filter(visible);
      return {bodyWidth:Math.round(root.scrollWidth),view, outside,narrow, dock:dock.length,
        activeDock:document.querySelectorAll('.mobile-nav button.active').length};
    });
    console.log(width+'px '+name+': '+JSON.stringify(result));
    if(result.bodyWidth>width+15)problems.push(width+'px '+name+' horizontal page overflow '+result.bodyWidth+'px');
    if(result.outside.length)problems.push(width+'px '+name+' panel outside viewport '+JSON.stringify(result.outside));
    if(result.narrow.length)problems.push(width+'px '+name+' compressed dealership title '+JSON.stringify(result.narrow));
    if(result.dock!==6||result.activeDock!==1)problems.push(width+'px '+name+' bottom navigation invalid '+JSON.stringify(result));
    if(route==='overview'&&!sub){
      // Exercise the Dashboard switch with a purchased Auto-Dispatch Desk.
      // This browser's test state is restored; no production data or saved games are involved.
      const auto=await page.evaluate(()=>{
        const originalUpgrades={...state.upgrades};
        const originalSettings={...state.settings,autoCare:{...state.settings.autoCare}};
        try{
          state.upgrades.auto=false;render();
          const locked=!!document.querySelector('.dashboard-autodispatch-unlock')&&!document.querySelector('.dashboard-autodispatch-switch');
          state.upgrades.auto=true;state.settings.autoDispatch=true;render();
          let toggle=document.querySelector('.dashboard-autodispatch-switch');
          const initiallyOn=!!toggle&&toggle.getAttribute('aria-checked')==='true';
          const touchHeight=toggle?.getBoundingClientRect().height||0;
          const careBefore=JSON.stringify(state.settings.autoCare);
          const offlineBefore=state.settings.offlineEarnings;
          toggle?.click();
          const paused=state.settings.autoDispatch===false&&document.querySelector('.dashboard-autodispatch-switch')?.getAttribute('aria-checked')==='false';
          const untouched=JSON.stringify(state.settings.autoCare)===careBefore&&state.settings.offlineEarnings===offlineBefore;
          document.querySelector('.dashboard-autodispatch-switch')?.click();
          const resumed=state.settings.autoDispatch===true&&document.querySelector('.dashboard-autodispatch-switch')?.getAttribute('aria-checked')==='true';
          return {locked,initiallyOn,paused,resumed,untouched,touchHeight};
        }finally{
          state.upgrades=originalUpgrades;
          state.settings=originalSettings;
          render();save(true);
        }
      });
      console.log(width+'px Dashboard Auto-Dispatch: '+JSON.stringify(auto));
      if(!auto.locked||!auto.initiallyOn||!auto.paused||!auto.resumed||!auto.untouched||auto.touchHeight<44)
        problems.push(width+'px Dashboard Auto-Dispatch switch invalid '+JSON.stringify(auto));
    }
    if(route==='overview'&&!sub){
      // Temporary fixture checks actual visual order; the original game state is restored immediately.
      const earliest=await page.evaluate(()=>{
        const originalRentals=state.rentals;
        try{
          const t=Date.now(),carId=state.fleet[0]?.id;
          if(!carId)return {error:'Starter car missing'};
          state.rentals=[
            {id:'sort-later',carId,customer:'Later Return',start:t-1000,due:t+180000,payout:1000},
            {id:'sort-soonest',carId,customer:'First Return',start:t-1000,due:t+15000,payout:1000},
            {id:'sort-last',carId,customer:'Last Return',start:t-1000,due:t+240000,payout:1000},
            {id:'sort-middle',carId,customer:'Second Return',start:t-1000,due:t+65000,payout:1000}
          ];
          const savedOrder=state.rentals.map(r=>r.customer).join(',');
          render();
          const shown=[...document.querySelectorAll('[aria-label="Active Rentals"] .dashboard-trip-row b')].map(el=>el.textContent.trim());
          const orderAfter=state.rentals.map(r=>r.customer).join(',');
          const badge=document.querySelector('[aria-label="Active Rentals"] .dashboard-simple-count')?.textContent.trim();
          return {shown,savedOrder,orderAfter,badge};
        }finally{
          state.rentals=originalRentals;
          render();
        }
      });
      console.log(width+'px earliest Dashboard rentals: '+JSON.stringify(earliest));
      if(earliest.error||earliest.shown?.join(',')!=='First Return,Second Return,Later Return'||
         earliest.savedOrder!==earliest.orderAfter||earliest.badge!=='4 ACTIVE')
         problems.push(width+'px Dashboard rental order invalid '+JSON.stringify(earliest));
    }
    if(route==='overview'){
      const header=await page.evaluate(()=>{
        const banner=document.querySelector('.dashboard-header');
        return {
          present:!!banner,
          unwantedRibbon:!!document.querySelector('.dashboard-header .arcade-page-copy'),
          logo:!!document.querySelector('.dashboard-header .arcade-brand-text'),
          level:!!document.querySelector('.dashboard-header .arcade-rep-chip'),
          cash:!!document.querySelector('.dashboard-header .chip.cash'),
          settings:!!document.querySelector('.dashboard-header .arcade-settings'),
          gridRows:banner?getComputedStyle(banner).gridTemplateRows:null
        };
      });
      console.log(width+'px Dashboard header without redundant title: '+JSON.stringify(header));
      if(!header.present||header.unwantedRibbon||!header.logo||!header.level||!header.cash||!header.settings)
        problems.push(width+'px Dashboard header unexpectedly missing a primary element '+JSON.stringify(header));
      if(header.gridRows?.trim().split(' ').filter(Boolean).length!==2)
        problems.push(width+'px Dashboard header has unused grid row '+JSON.stringify(header));
    }
    if(route==='business'&&sub==='command'){
      // One navigation grid only: all six business destinations, no duplicated department shortcuts.
      const business=await page.evaluate(()=>({
        navIds:[...document.querySelectorAll('.business-shell-v11 .business-v11-nav button[data-action="sub"][data-group="business"]')].map(btn=>btn.dataset.id),
        duplicateSections:document.querySelectorAll('.business-v11-links').length,
        priorities:!!document.querySelector('.business-v11-tasks')
      }));
      const expected=['command','upgrades','branches','contracts','staff','finance'];
      if(JSON.stringify(business.navIds)!==JSON.stringify(expected)||business.duplicateSections!==0||!business.priorities)
        problems.push(width+'px Business navigation duplicated or missing '+JSON.stringify(business));
    }
    if(route==='business'&&sub==='contracts'){
      // Exercise a signed contract with a large Rand total without changing saved game state.
      const earned=await page.evaluate(()=>{
        const grid=document.querySelector('.contract17-grid');
        if(!grid)return {error:'Contracts grid missing'};
        const fixture=document.createElement('article');
        fixture.className='contract17-card signed';
        fixture.innerHTML='<div class="contract17-card-body"><div class="contract17-count"><div><small>Returns</small><b>129</b></div><div><small>Earned</small><b>R12 345 678</b></div><div><small>Open leads</small><b>1</b></div></div></div>';
        grid.prepend(fixture);
        const amount=fixture.querySelector('.contract17-count>div:nth-child(2) b');
        const range=document.createRange();range.selectNodeContents(amount);
        const textRect=range.getBoundingClientRect(),boxRect=amount.getBoundingClientRect();
        const layout={lineCount:range.getClientRects().length,withinBox:textRect.left>=boxRect.left-1&&textRect.right<=boxRect.right+1};
        fixture.remove();
        return layout;
      });
      console.log(width+'px contracts earned amount: '+JSON.stringify(earned));
      if(earned.error||earned.lineCount!==1||!earned.withinBox)problems.push(width+'px contract earned amount wraps or overflows '+JSON.stringify(earned));
    }
   }catch(err){problems.push(width+'px '+name+': '+String(err));}
  }
  if(jsErrors.length)problems.push(width+'px browser script errors: '+jsErrors.slice(0,8).join('; '));
  await page.close();
 }
}finally{
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
if(problems.length){
 for(const issue of problems)console.error('MOBILE ISSUE: '+issue);
 throw Error('Mobile screen audit found '+problems.length+' issue(s).');
}
assert.equal(scenarios.length,21,'Every primary tab and submenu must be checked');
console.log('PASS: 21 views at 360px and 412px; no critical overflow, squeezed dealership heading or broken dock.');
