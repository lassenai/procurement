/* Run against a local server. Uses a fresh isolated browser context. */
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=(process.env.BASE_URL||'http://127.0.0.1:4173/').replace(/\/?$/,'/');
const out=path.resolve(__dirname,'../.qa');
fs.mkdirSync(out,{recursive:true});
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.PW_CHANNEL?{channel:process.env.PW_CHANNEL}:{})});
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  const visit=async route=>{await page.goto(base+'#'+route);await page.waitForLoadState('networkidle');};
  const noOverflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  let passed=0;
  const pass=s=>{console.log('PASS:',s);passed++;};
  try{
    await visit('home');assert.equal(await page.locator('.area-row').count(),8);
    assert.deepEqual(await page.evaluate(()=>[PROCUREMENT_DATA.questions.length,PROCUREMENT_DATA.mockQuestions.length]),[240,60]);
    await page.screenshot({path:path.join(out,'desktop-home.png'),fullPage:true});pass('home and content counts');
    await page.locator('[data-area-start="4"]').click();
    assert.equal(await page.locator('#area-filter').inputValue(),'4');
    await page.locator('#type-filter').selectOption('계산형');
    const titles=await page.locator('.question-row .badge').allTextContents();assert(titles.includes('계산형'));
    await page.locator('#search').fill('선금');await page.waitForTimeout(300);assert((await page.locator('.question-row').count())>0);
    await page.locator('#search').fill('존재하지않는무작위검색어');await page.waitForTimeout(300);assert.equal(await page.locator('.question-row').count(),0);pass('area/type/search and empty state');
    await visit('q/Q001');await page.locator('#answer').fill('경쟁입찰참가자격등록');await page.locator('[data-reveal]').click();
    assert.equal(await page.locator('[data-rubric="0"]').isChecked(),true);await page.locator('[data-grade]').click();
    await page.reload();assert.equal(await page.locator('#answer').inputValue(),'경쟁입찰참가자격등록');assert.equal(await page.locator('.solution .score').innerText(),'5 / 5점');
    await page.locator('#answer').fill('수정한 답안');assert.equal(await page.locator('[data-rubric="0"]').isChecked(),false);
    assert.equal(await page.evaluate(()=>Object.hasOwn(JSON.parse(localStorage.getItem('procurement.study.v1')).checks,'Q001')),false);
    await page.locator('[data-grade]').click();await page.locator('[data-bookmark]').click();
    await visit('review');await page.locator('[data-reset-filters]').click();assert.equal(await page.locator('.question-row').count(),1);pass('answer persistence, score invalidation, zero score, wrong list and bookmark');
    await visit('mocks');await page.locator('[data-start="1"]').click();assert.equal(await page.locator('.solution').count(),0);
    const deadline=await page.evaluate(()=>JSON.parse(localStorage.getItem('procurement.study.v1')).exams['1'].deadline);
    await page.locator('#exam-answer').fill('첫 답안');await page.locator('.exam-grid [data-exam-index="1"]').click();await page.locator('#exam-answer').fill('둘째 답안');
    await page.reload();assert.equal(await page.locator('#exam-answer').inputValue(),'둘째 답안');
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('procurement.study.v1')).exams['1'].deadline),deadline);
    await page.locator('[data-submit="1"]').click();assert.equal(await page.locator('#exam-answer').getAttribute('readonly'),'');
    await page.locator('[data-rubric="0"]').check();await page.locator('[data-grade]').click();
    await page.locator('[data-go="results/1"]').click();await page.locator('.result-row').first().waitFor();assert.equal(await page.locator('.result-row').count(),20);pass('mock timer restoration, answers, hidden solutions, submit lock and partial scoring');
    await visit('mocks');await page.locator('[data-start="2"]').click();await page.locator('#exam-answer').fill('시간 종료 전 저장');
    await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('procurement.study.v1'));s.exams['2'].startedAt=Date.now()-150*60000-2000;s.exams['2'].deadline=s.exams['2'].startedAt+150*60000;localStorage.setItem('procurement.study.v1',JSON.stringify(s));});
    await page.reload();assert.equal(await page.locator('#exam-answer').getAttribute('readonly'),'');assert.equal(await page.locator('#exam-answer').inputValue(),'시간 종료 전 저장');pass('expired mock auto-submits on restore');
    await visit('settings');const dl=page.waitForEvent('download');await page.locator('[data-export]').click();const download=await dl;const backup=path.join(out,'backup.json');await download.saveAs(backup);
    const saved=JSON.parse(fs.readFileSync(backup,'utf8'));assert.equal(saved.app,'procurement-study');assert.equal(saved.data.answers.Q001,'수정한 답안');
    await page.locator('[data-reset]').click();assert.equal(await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('procurement.study.v1')).answers).length),0);
    await page.locator('#import').setInputFiles(backup);await page.waitForTimeout(150);await visit('q/Q001');assert.equal(await page.locator('#answer').inputValue(),'수정한 답안');
    await visit('settings');await page.locator('#import').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{broken')});await page.waitForTimeout(100);assert.match(await page.locator('#toast').innerText(),/JSON/);pass('backup export/import, reset, malformed import');
    await page.evaluate(()=>{window.print=()=>{window.__printed=true;};});await visit('mocks');await page.evaluate(()=>{window.print=()=>{window.__printed=true;};});await page.locator('[data-print-mock="3"]').click();assert.equal(await page.locator('#print-area .print-q').count(),20);assert.equal(await page.locator('#print-area .print-solution').count(),0);
    await page.locator('[data-print-solutions="1"]').click();assert.equal(await page.locator('#print-area .print-solution').count(),20);
    await page.emulateMedia({media:'print'});assert.equal(await page.locator('#app').isVisible(),false);assert.equal(await page.locator('#print-area').isVisible(),true);await page.emulateMedia({media:'screen'});pass('question/solution printing and print CSS');
    await page.setViewportSize({width:390,height:844});
    for(const r of ['home','practice','q/Q040','theory/6','mocks','exam/1','results/1','settings']){await visit(r);await noOverflow();}
    await visit('home');await page.screenshot({path:path.join(out,'mobile-home.png'),fullPage:true});
    await visit('q/Q090');await page.locator('#answer').fill('200만원');await page.locator('[data-reveal]').click();await page.locator('#main h1').click();await page.screenshot({path:path.join(out,'mobile-question.png'),fullPage:true});
    await page.setViewportSize({width:320,height:700});for(const r of ['home','practice','exam/1','settings']){await visit(r);await noOverflow();}pass('390px and 320px responsive routes');
    // Every authored question can be opened and has nonempty answer controls.
    await page.setViewportSize({width:1280,height:900});await visit('q/Q001');
    for(let i=1;i<=240;i++){const id='Q'+String(i).padStart(3,'0');await page.evaluate(id=>{location.hash='q/'+id;},id);await page.waitForFunction(id=>document.querySelector('[data-answer]')?.dataset.answer===id,id);assert((await page.locator('.question-text').innerText()).length>15);}
    assert.equal(errors.length,0,errors.join('\n'));pass('all 240 question routes and no JavaScript exceptions');
    const locked=await browser.newContext();await locked.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('blocked','QuotaExceededError');};});const lp=await locked.newPage();await lp.goto(base+'#q/Q001');await lp.locator('#answer').fill('백업이 필요한 답안');assert.match(await lp.locator('#save-status').innerText(),/저장 불가/);await lp.goto(base+'#settings');assert.equal(await lp.locator('[data-export]').count(),1);await locked.close();pass('storage failure keeps in-memory backup available');
    fs.writeFileSync(path.join(out,'test-results.json'),JSON.stringify({passed,errors,base,at:new Date().toISOString()},null,2));console.log(`All ${passed} browser test groups passed.`);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
