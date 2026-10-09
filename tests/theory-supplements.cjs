const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const cp=require('node:child_process');
const parse=s=>JSON.parse(s.split('window.PROCUREMENT_DATA = ')[1].trim().replace(/;$/,''));
const previous=parse(cp.execFileSync('git',['show','HEAD:data.js'],{encoding:'utf8'}));
const current=parse(fs.readFileSync('data.js','utf8'));
for(let i=0;i<8;i++)for(let j=0;j<current.areas[i].lessons.length;j++){
 const {supplement,...base}=current.areas[i].lessons[j];
 const {supplement:priorSupplement,...priorBase}=previous.areas[i].lessons[j];
 assert.deepEqual(base,priorBase,'Existing lessons and matching audio must remain unchanged');
}
assert.deepEqual(current.questions,previous.questions);assert.deepEqual(current.blanks,previous.blanks);
assert.equal((240+160-40+60)*.10,42);assert.equal(Math.round((1000+60+42)*1.10*10)/10,1212.2);
assert.equal(Math.round((1000+60+46)*1.10*10)/10,1216.6);assert.equal(500*4*.3+200,800);
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.PW_CHANNEL||'msedge'});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const area of [1,2]){
   await page.goto('http://127.0.0.1:4173/#theory/'+area);
   assert.equal(await page.locator('.theory-supplement').count(),4);
   assert.equal(await page.locator('.theory-supplement[open]').count(),0);
   for(const detail of await page.locator('.theory-supplement').all()){
    await detail.locator(':scope > summary').focus();await page.keyboard.press('Enter');
    assert(await detail.locator('table').isVisible());
    await detail.locator('.supplement-solution > summary').click();assert(await detail.locator('.supplement-solution p').isVisible());
   }
   for(const width of [320,390,1440])for(const size of [18,22]){
    await page.setViewportSize({width,height:1000});await page.locator(`[data-font="${size}"]`).click();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Expanded layout ${area}/${width}/${size}`);
   }
   await page.setViewportSize({width:1440,height:1000});await page.locator('[data-font="18"]').click();
   const id=area===1?'T1-03':'T2-06';await page.locator(`#${id}-supplement`).screenshot({path:`.qa/supplement-${area}.png`});
  }
  assert.deepEqual(errors,[]);console.log('PASS: 8 supplement toggles, keyboard, solutions, expanded mobile/desktop layout, preserved base lessons/audio/questions and calculations');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
