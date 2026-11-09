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
 ['fleet','garage'],['fleet','dealership'],['fleet','care'],['fleet','restoration'],['fleet','tuning'],
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
    if(route==='fleet'&&sub==='restoration'){
      const panel=await page.evaluate(()=>({
        navCount:document.querySelectorAll('.fleet-command-tabs button[data-action="sub"][data-group="fleet"]').length,
        selected:document.querySelector('button[data-action="sub"][data-group="fleet"][data-id="restoration"]')?.getAttribute('aria-selected'),
        ownPanel:!!document.querySelector('section[aria-label="Vehicle restoration projects"]'),
        duplicateWorkshop:!!document.querySelector('.workshop-service-desk'),
        activeLabel:document.querySelector('button[data-action="sub"][data-group="fleet"][data-id="restoration"] .fleet-command-tab-label')?.textContent.trim(),
        cardWidth:document.querySelector('section[aria-label="Vehicle restoration projects"]')?.getBoundingClientRect().width
      }));
      if(panel.navCount!==5||panel.selected!=='true'||!panel.ownPanel||panel.duplicateWorkshop||panel.activeLabel!=='Restoration'||!panel.cardWidth)
        problems.push(width+'px Restoration tab routing invalid '+JSON.stringify(panel));
      const cooldown=await page.evaluate(()=>{
        const c=state.fleet[0];
        const priorStatus=c.status,priorRestoration=c.restoration;
        const previouslySelected=selectedCar;
        try{
          const t=Date.now();
          c.status='restoration';
          c.restoration={stage:0,spent:3000,purchase:3000,work:{stage:0,startedAt:t-30000,dueAt:t+90000}};
          render();
          const root=document.querySelector('[data-restoration-work]');
          const button=root?.closest('[data-restoration-car]')?.querySelector('[data-action="restoresalvage"]');
          const start={found:!!root,disabled:!!button?.disabled,clock:root?.querySelector('[data-restoration-timer]')?.textContent,
            bar:Number(root?.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')||0)};
          c.restoration.work.dueAt=t-1;
          refreshLive();
          const finished={buttonEnabled:!button?.disabled,buttonLabel:button?.textContent.trim(),clock:root?.querySelector('[data-restoration-timer]')?.textContent};
          return {start,finished};
        }finally{c.status=priorStatus;c.restoration=priorRestoration;selectedCar=previouslySelected;render();}
      });
      if(!cooldown.start.found||!cooldown.start.disabled||!cooldown.start.clock||cooldown.start.bar<=0||
        !cooldown.finished.buttonEnabled||!cooldown.finished.buttonLabel?.includes('Collect')||cooldown.finished.clock!=='READY TO COLLECT')
        problems.push(width+'px Restoration cooldown UI invalid '+JSON.stringify(cooldown));
    }
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
    if(route==='overview'&&!sub){
      // Verify the royal VIP card is legible on compact Android screens without changing production data.
      const vipCard=await page.evaluate(()=>{
        const oldOffers=state.offers.slice();
        let fixture=null;
        try{
          const offer=newOffer(null,'royal-guest-amara');
          if(!offer)return {error:'Royal VIP customer not generated'};
          fixture=document.createElement('div');
          fixture.style.width='100%';
          fixture.innerHTML=offerCard(offer);
          document.querySelector('.main').appendChild(fixture);
          const card=fixture.querySelector('.rental-offer-v8--vip');
          const meta=card?.querySelector('.rental-offer-v8-identity')?.textContent||'';
          const finance=card?.querySelector('.rental-offer-v8-finance')?.textContent||'';
          const box=card?.getBoundingClientRect();
          return {exists:!!card,meta,finance,withinViewport:!!box&&box.left>=-3&&box.right<=innerWidth+3,percent:offer.vipBonus};
        }finally{
          if(fixture)fixture.remove();
          state.offers=oldOffers;
          render();
        }
      });
      console.log(width+'px VIP booking card: '+JSON.stringify(vipCard));
      if(vipCard.error||!vipCard.exists||!vipCard.withinViewport||vipCard.percent!==.75||
         !vipCard.meta.includes('VIP BOOKING')||!vipCard.meta.includes('ANY READY VEHICLE')||
         !vipCard.finance.includes('VEHICLE BASED')||vipCard.finance.includes('R0'))
        problems.push(width+'px VIP booking card invalid '+JSON.stringify(vipCard));
    }
    if(route==='overview'&&!sub){
      // Large lifetime figures must remain readable in three columns at phone widths.
      const amounts=await page.evaluate(()=>{
        const oldCash=state.cash,oldEarned=state.stats.earned;
        try{
          state.cash=9876543;state.stats.earned=48226872;render();
          const summary=document.querySelector('.dashboard-simplified .dashboard-reference-summary');
          const cells=[...(summary?.querySelectorAll('.dashboard-summary-card')||[])];
          const read=cell=>{
            const value=cell?.querySelector('strong');
            const compact=value?.querySelector('.dashboard-money-compact');
            const full=value?.querySelector('.dashboard-money-full');
            const range=document.createRange();
            if(compact)range.selectNodeContents(compact);
            const rect=range.getBoundingClientRect(),box=value?.getBoundingClientRect();
            return {text:compact?.textContent?.trim(),digits:value?.getAttribute('aria-label')?.replace(/\D/g,''),
              shown:!!compact&&getComputedStyle(compact).display!=='none',
              fullHidden:!!full&&getComputedStyle(full).display==='none',
              fits:!!box&&rect.width<=box.width+1&&value.scrollWidth<=value.clientWidth+1,
              boxWidth:Math.round(box?.width||0)};
          };
          return {cardCount:cells.length,bank:read(cells[0]),earned:read(cells[2]),
            columns:summary?getComputedStyle(summary).gridTemplateColumns:null};
        }finally{state.cash=oldCash;state.stats.earned=oldEarned;render();}
      });
      console.log(width+'px Dashboard financial figures: '+JSON.stringify(amounts));
      if(amounts.cardCount!==3||amounts.bank.text!=='R9.88m'||amounts.earned.text!=='R48.23m'||
         amounts.bank.digits!=='9876543'||amounts.earned.digits!=='48226872'||
         !amounts.bank.shown||!amounts.earned.shown||
         !amounts.bank.fullHidden||!amounts.earned.fullHidden||!amounts.bank.fits||!amounts.earned.fits)
        problems.push(width+'px Dashboard money values clipped or wrapped '+JSON.stringify(amounts));
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
    if(route==='business'&&sub==='branches'){
      // Regression: Branch statistics must not collapse into four narrow Android columns.
      const branchMetrics=await page.evaluate(()=>{
        const before=state.branchReports;
        try{
          state.branchReports={...before,hq:{...(before?.hq||{}),count:2860,revenue:45316820}};
          render();
          const row=document.querySelector('.branches-v14 .branch-v14-stat-row');
          const cards=[...(row?.querySelectorAll('.branch-v14-stat')||[])];
          const boxes=cards.map(el=>el.getBoundingClientRect());
          const fits=cards.every(card=>{
            const frame=card.getBoundingClientRect(),amount=card.querySelector('strong');
            if(!amount)return false;
            const value=amount.getBoundingClientRect();
            return value.left>=frame.left-2&&value.right<=frame.right+2&&amount.scrollWidth<=amount.clientWidth+2;
          });
          const moneyCard=cards[2]?.querySelector('strong');
          const full=moneyCard?.querySelector('.branch-v14-money-full');
          const compact=moneyCard?.querySelector('.branch-v14-money-compact');
          const onTwoRows=cards.length===4&&Math.abs(boxes[0].top-boxes[1].top)<=2&&boxes[2].top>boxes[0].bottom-2&&Math.abs(boxes[2].top-boxes[3].top)<=2;
          return {cardCount:cards.length,onTwoRows,fits,columns:row?getComputedStyle(row).gridTemplateColumns:null,
            fullHidden:!!full&&getComputedStyle(full).display==='none',
            compactShown:!!compact&&getComputedStyle(compact).display!=='none',
            exactAmount:moneyCard?.title||'',shortAmount:compact?.textContent||''};
        }finally{
          state.branchReports=before;render();
        }
      });
      console.log(width+'px Branch KPI 2x2 mobile layout: '+JSON.stringify(branchMetrics));
      if(!branchMetrics.onTwoRows||!branchMetrics.fits||!branchMetrics.fullHidden||!branchMetrics.compactShown||
         branchMetrics.exactAmount.replace(/\D/g,'')!=='45316820'||!/^R45\.32m$/.test(branchMetrics.shortAmount))
        problems.push(width+'px Branch stats overflow or wrong money label '+JSON.stringify(branchMetrics));
    }
    if(route==='business'&&sub==='branches'){
      // A large fleet must not push the next location below 26 expanded vehicle cards.
      // Exercise native dropdown open/close and persistence across normal game renders.
      const dropdown=await page.evaluate(()=>{
        const originalFleet=state.fleet,key='branch-vehicles-hq',wasExpanded=openInfoPanels.has(key);
        try{
          const seed=originalFleet[0];
          if(!seed)return {error:'No starter vehicle'};
          state.fleet=Array.from({length:26},(_,i)=>({...seed,id:'branch-dropdown-fixture-'+i,plate:'CA '+(100+i)+'-999',branch:'hq',status:i%2?'rented':'available'}));
          openInfoPanels.delete(key);
          render();
          const details=document.querySelector('.branch-v14-fleet[data-compact-info="branch-vehicles-hq"]');
          const summary=details?.querySelector('summary');
          const initial={collapsed:details?.open===false,count:summary?.textContent.includes('26 vehicles'),height:Math.round(details?.getBoundingClientRect().height||0),
            cars:details?.querySelectorAll('.branch-v14-car').length,branchPurchase:!!document.querySelector('.branch-v14-lock-actions button[data-action="branch"]')};
          summary?.click();
          const opened={expanded:details?.open===true,height:Math.round(details?.getBoundingClientRect().height||0)};
          render();
          const again=document.querySelector('.branch-v14-fleet[data-compact-info="branch-vehicles-hq"]');
          const persisted=again?.open===true;
          again?.querySelector('summary')?.click();
          const closedAgain=again?.open===false;
          render();
          return {initial,opened,persisted,closedAgain};
        }finally{
          state.fleet=originalFleet;
          if(wasExpanded)openInfoPanels.add(key);else openInfoPanels.delete(key);
          render();
        }
      });
      console.log(width+'px Branch assigned vehicle dropdown: '+JSON.stringify(dropdown));
      if(dropdown.error||!dropdown.initial.collapsed||!dropdown.initial.count||dropdown.initial.cars!==26||
        !dropdown.initial.branchPurchase||dropdown.initial.height>80||!dropdown.opened.expanded||
        dropdown.opened.height<500||!dropdown.persisted||!dropdown.closedAgain)
        problems.push(width+'px Branch assigned vehicles dropdown failed '+JSON.stringify(dropdown));
    }
    if(route==='business'&&sub==='command'){
      // One navigation grid only: all six business destinations, no duplicated department shortcuts.
      const business=await page.evaluate(()=>({
        navIds:[...document.querySelectorAll('.business-shell-v11 .business-v11-nav button[data-action="sub"][data-group="business"]')].map(btn=>btn.dataset.id),
        duplicateSections:document.querySelectorAll('.business-v11-links').length,
        priorities:!!document.querySelector('.business-v11-tasks')
      }));
      const tileLayout=await page.evaluate(()=>{
        const nav=document.querySelector('.business-shell-v11 .business-v11-nav .tabs');
        const buttons=[...nav.querySelectorAll('button[data-action="sub"][data-group="business"]')];
        const navBox=nav.getBoundingClientRect();
        const rects=buttons.map(b=>{const r=b.getBoundingClientRect();const label=b.querySelector('.business-grid-label');
          const l=label?.getBoundingClientRect();return {
            id:b.dataset.id,width:Math.round(r.width),height:Math.round(r.height),
            left:r.left,right:r.right,top:r.top,bottom:r.bottom,
            labelFits:!!l&&l.left>=r.left-3&&l.right<=r.right+3,
            iconPresent:!!b.querySelector('.business-grid-icon')
          };
        });
        return {count:buttons.length,gridHeight:Math.round(navBox.height),columns:getComputedStyle(nav).gridTemplateColumns,tiles:rects};
      });
      console.log(width+'px compact Business tiles: '+JSON.stringify(tileLayout));
      if(tileLayout.count!==6||tileLayout.gridHeight>155||
        tileLayout.tiles.some(t=>t.height<60||t.height>72||t.left<-2||t.right>width+2||!t.labelFits||!t.iconPresent)||
        Math.abs(tileLayout.tiles[0].top-tileLayout.tiles[2].top)>3||
        Math.abs(tileLayout.tiles[3].top-tileLayout.tiles[5].top)>3||
        tileLayout.tiles[3].top<=tileLayout.tiles[0].bottom)
        problems.push(width+'px Business navigation tiles too tall, clipped or misaligned '+JSON.stringify(tileLayout));
      const expected=['command','upgrades','branches','contracts','staff','finance'];
      if(JSON.stringify(business.navIds)!==JSON.stringify(expected)||business.duplicateSections!==0||!business.priorities)
        problems.push(width+'px Business navigation duplicated or missing '+JSON.stringify(business));
    }
    if(route==='business'&&sub==='staff'){
      // Staff cards must remain genuinely compact, not just fit horizontally.
      // Confirm benefit text, both pay amounts, employment status and Hire controls survive.
      const staffLayout=await page.evaluate(()=>{
        const cards=[...document.querySelectorAll('.staff-v15-grid .staff-v15-card')];
        const widths=cards.map(card=>{
          const rect=card.getBoundingClientRect();
          const role=card.querySelector('.staff-v15-body h4');
          const benefit=card.querySelector('.staff-v15-benefit b');
          const status=card.querySelector('.staff-v15-sub');
          const costs=card.querySelectorAll('.staff-v15-cost strong');
          const button=card.querySelector('.staff-v15-action button');
          const btnRect=button?.getBoundingClientRect();
          const benefitRect=benefit?.getBoundingClientRect();
          return {
            height:Math.round(rect.height),left:rect.left,right:rect.right,
            role:role?.textContent.trim(),benefit:benefit?.textContent.trim(),
            status:status?.textContent.trim(),prices:[...costs].map(el=>el.textContent.trim()),
            buttonHeight:btnRect?.height||0,buttonAction:button?.dataset.action,
            benefitInCard:!!benefitRect&&benefitRect.left>=rect.left-2&&benefitRect.right<=rect.right+2
          };
        });
        return {count:cards.length,cards:widths};
      });
      console.log(width+'px compact staff roster: '+JSON.stringify(staffLayout));
      if(staffLayout.count!==5||staffLayout.cards.some(c=>c.height>295||c.left<-3||c.right>width+3||
        !c.role||!c.benefit||!c.status||c.prices.length!==2||!c.benefitInCard||
        c.buttonAction!=='hire'||c.buttonHeight<40))
        problems.push(width+'px Staff cards too tall, clipped, or missing staff details '+JSON.stringify(staffLayout));
    }
    if(route==='business'&&sub==='contracts'){
      // All five original and twelve new partner cards must fit Android portrait widths.
      const partnerLayout=await page.evaluate(()=>{
        const cards=[...document.querySelectorAll('.contract17-grid .contract17-card')];
        const beyond=cards.map((card,i)=>{
          const r=card.getBoundingClientRect();
          return {index:i,left:r.left,right:r.right};
        }).filter(box=>box.left < -3||box.right > innerWidth+3);
        return {count:cards.length,beyond};
      });
      console.log(width+'px contract partner layout: '+JSON.stringify(partnerLayout));
      if(partnerLayout.count!==17||partnerLayout.beyond.length)
        problems.push(width+'px Contract cards missing or clipped '+JSON.stringify(partnerLayout));
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
assert.equal(scenarios.length,22,'Every primary tab and submenu must be checked');
console.log('PASS: 22 views at 360px and 412px; no critical overflow, squeezed dealership heading or broken dock.');
