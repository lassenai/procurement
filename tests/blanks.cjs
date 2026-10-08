const pw=require(process.env.PLAYWRIGHT_PACKAGE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.BASE_URL||'http://127.0.0.1:4173/';
(async()=>{
 for(const engine of ['chromium','webkit']){
  const browser=await pw[engine].launch({headless:true});
  try{
   const page=await browser.newPage({...pw.devices[engine==='webkit'?'iPhone SE':'Pixel 7']});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
   await page.addInitScript(()=>{window.SpeechRecognition=class{constructor(){window.testRecognition=this;}start(){this.onstart?.();}stop(){this.onend?.();}abort(){}};});
   await page.goto(base+'#practice');assert.equal(await page.locator('#main h1').innerText(),'실전 문제');await page.locator('.learning-tabs a').first().click();await page.locator('#blank-answer').waitFor();
   const bank=await page.evaluate(()=>PROCUREMENT_DATA.blanks);assert.equal(bank.length,64);
   for(const q of bank){
    await page.goto(base+'#blanks/'+q.area+'/'+Number(q.id.split('-')[1]));
    await page.waitForFunction(id=>document.querySelector('#blank-answer')?.dataset.blankAnswer===id,q.id);
    assert.equal(await page.locator('#blank-answer').getAttribute('data-blank-answer'),q.id);
    assert.equal(await page.locator('.blank-slot').count(),1);assert.equal(await page.locator('#blank-feedback').count(),0);
    await page.locator('#blank-answer').fill(q.answers.at(-1));await page.locator('[data-blank-check]').click();assert.equal(await page.locator('#blank-feedback h3').innerText(),'정답입니다');
   }
   await page.reload();assert.equal(await page.locator('#blank-feedback h3').innerText(),'정답입니다');
   await page.locator('#blank-answer').fill('오답');assert(!await page.locator('#blank-feedback').isVisible());await page.locator('[data-blank-check]').click();assert.equal(await page.locator('#blank-feedback h3').innerText(),'정답과 비교해 보세요');
   await page.locator('[data-blank-retry]').click();assert.equal(await page.locator('#blank-answer').inputValue(),'');
   await page.locator('[data-voice-toggle]').click();await page.evaluate(()=>{const r=[{transcript:'무결성'}];r.isFinal=true;testRecognition.onresult({results:[r]});testRecognition.stop();});assert.equal(await page.locator('#blank-answer').inputValue(),'무결성');
   await page.locator('#blank-area').selectOption('1');await page.locator('#blank-answer').waitFor();await page.reload();assert.equal(await page.locator('#blank-area').inputValue(),'1');
   for(const width of [320,390,844]){await page.setViewportSize({width,height:800});for(const size of [18,20,22]){await page.locator(`[data-font="${size}"]`).click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}}
   await page.setViewportSize({width:390,height:844});await page.locator('[data-font="18"]').click();fs.mkdirSync('.qa',{recursive:true});await page.screenshot({path:'.qa/blanks-'+engine+'.png',fullPage:true});
   await page.goto(base+'#settings');const dl=page.waitForEvent('download');await page.locator('[data-export]').click();const backup=await dl;await backup.saveAs('.qa/blanks-backup-'+engine+'.json');const data=JSON.parse(fs.readFileSync('.qa/blanks-backup-'+engine+'.json'));assert.equal(data.data.blankAnswers['B8-08'],'무결성');
   await page.locator('[data-reset]').click();await page.locator('#import').setInputFiles('.qa/blanks-backup-'+engine+'.json');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('procurement.study.v1')).blankAnswers['B8-08']==='무결성');
   // Previous backups without blank records still import normally.
   delete data.data.blankAnswers;delete data.data.blankChecked;data.data.answers.Q001='이전 답안';await page.locator('#import').setInputFiles({name:'old.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await page.waitForFunction(()=>JSON.parse(localStorage.getItem('procurement.study.v1')).answers.Q001==='이전 답안');
   assert.deepEqual(errors,[]);console.log('PASS',engine,'64 blank questions, aliases, persistence, invalidation, retry, voice mock, fonts, backup roundtrip and old backup compatibility');
  }finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exit(1);});
