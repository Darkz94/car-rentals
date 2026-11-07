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
