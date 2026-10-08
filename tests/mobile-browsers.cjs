const pw=require(process.env.PLAYWRIGHT_PACKAGE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=process.env.BASE_URL||'http://127.0.0.1:4173/';
const out=path.resolve(__dirname,'../.qa/mobile');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const results=[];
 for(const [engine,device] of [['chromium','Pixel 7'],['webkit','iPhone 13'],['webkit','iPhone SE']]){
  const browser=await pw[engine].launch({headless:true});
  try{
   const context=await browser.newContext({...pw.devices[device],acceptDownloads:true});
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
   await page.addInitScript(()=>{const A=window.Audio;window.Audio=function(...args){const a=new A(...args);window.testAudio=a;return a;};window.Audio.prototype=A.prototype;});
   const visit=async r=>{await page.goto(base+'#'+r);await page.locator('#main').waitFor();};
   const layout=async label=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),device+' overflow '+label);
   await visit('home');await page.screenshot({path:path.join(out,device.replaceAll(' ','-')+'-home.png'),fullPage:true});
   for(const landscape of [false,true]){
    const v=pw.devices[device].viewport;await page.setViewportSize(landscape?{width:v.height,height:v.width}:v);
    for(const size of [18,20,22]){
     for(const r of ['home','practice','q/Q001','theory/1','theory/4','mocks','settings']){
      await visit(r);await page.locator(`[data-font="${size}"]`).click();await layout(r+' '+size+' '+landscape);
     }
    }
   }
   await page.setViewportSize(pw.devices[device].viewport);
   for(const route of ['home','practice','theory','mocks','review','settings']){
    await page.locator(`.nav a[href="#${route}"]`).tap();await page.waitForFunction(r=>location.hash==='#'+r,route);await layout('nav '+route);
   }
   await visit('q/Q001');
   await page.locator('#answer').fill('경쟁입찰참가자격등록');await page.locator('[data-reveal]').tap();await page.locator('[data-grade]').tap();
   await page.reload();assert.equal(await page.locator('#answer').inputValue(),'경쟁입찰참가자격등록');assert.equal(await page.locator('.solution .score').innerText(),'5 / 5점');
   await page.screenshot({path:path.join(out,device.replaceAll(' ','-')+'-answer.png'),fullPage:true});
   await visit('mocks');await page.locator('[data-start="1"]').tap();await page.locator('#exam-answer').fill('모바일 답안');await page.reload();assert.equal(await page.locator('#exam-answer').inputValue(),'모바일 답안');await layout('exam');
   await page.locator('[data-submit="1"]').tap();assert.equal(await page.locator('#exam-answer').getAttribute('readonly'),'');
   await visit('theory/1');await page.locator('.theory-toc button').last().tap();assert.equal(await page.evaluate(()=>document.activeElement.id),'T1-08-heading');await page.locator('.lesson-back').last().tap();
   await page.locator('[data-theory-play]').tap();
   let audio='passed';try{await page.waitForFunction(()=>window.testAudio?.currentTime>0,null,{timeout:12000});await page.locator('[data-theory-pause]').tap();assert(await page.evaluate(()=>testAudio.paused));await page.locator('[data-theory-pause]').tap();await page.waitForFunction(()=>!testAudio.paused);await page.locator('[data-theory-stop]').tap();assert(await page.evaluate(()=>testAudio.paused));}catch(e){audio='FAILED: '+e.message+' '+await page.locator('.theory-audio-status').textContent();}
   await page.screenshot({path:path.join(out,device.replaceAll(' ','-')+'-theory.png')});
   await page.locator('[data-font="18"]').click();
   const controls=await page.locator('select').evaluateAll(es=>es.map(e=>({id:e.id,font:getComputedStyle(e).fontSize})));
   assert(controls.every(c=>parseFloat(c.font)>=16),'mobile select text must be at least 16px');
   assert.deepEqual(errors,[]);results.push({engine,device,layout:'42 route/font/orientation combinations passed',answers:'save, reload, grade, mock submit passed',audio,controls});console.log(JSON.stringify(results.at(-1)));
   await context.close();
  }finally{await browser.close();}
 }
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({base,at:new Date().toISOString(),results},null,2));
 if(results.some(r=>r.audio!=='passed'))process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1);});
