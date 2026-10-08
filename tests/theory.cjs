const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||'playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const base=process.env.BASE_URL||'http://127.0.0.1:4173/';
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.PW_CHANNEL||'msedge'});
 try {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
   window.spoken=[];window.cancelCount=0;
   Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{lang:'ko-KR'}],cancel:()=>window.cancelCount++,pause:()=>window.paused=true,resume:()=>window.paused=false,speak:u=>{window.currentUtterance=u;window.spoken.push(u.text);}}});
  });
  await page.goto(base+'#theory/1');
  let total=0;
  for(let id=1;id<=8;id++){
   await page.evaluate(id=>location.hash='theory/'+id,id);
   await page.waitForFunction(id=>document.querySelector('.theory-body h2').textContent===window.PROCUREMENT_DATA.areas[id-1].name,id);
   const expected=[8,10,10,12,10,8,7,7][id-1];
   assert.equal(await page.locator('.theory-lesson').count(),expected);total+=expected;
   assert.equal(await page.locator('.theory-toc button').count(),expected);
   const readable=await page.evaluate(id=>{
    const lessons=window.PROCUREMENT_DATA.areas[id-1].lessons;
    return lessons.every(l=>{
     const el=document.getElementById(l.id);
     return el.querySelectorAll('.theory-keyword').length>0 && [...el.querySelectorAll(':scope > p[data-theory-read]')].map(n=>n.textContent).join('\n')===l.paragraphs.join('\n') && el.querySelector('.lesson-example p').textContent===l.example && el.querySelector('.lesson-answer p').textContent===l.answer && el.querySelector('.lesson-pitfall p').textContent===l.pitfall;
    });
   },id);
   assert(readable,'plain theory text must survive highlight rendering');
   assert(!/학원|강의자료|첨부 출제기준|학습용 초안/.test(await page.locator('.theory-body').textContent()));
   for(const width of [320,390,1440]){
    await page.setViewportSize({width,height:900});
    for(const size of [18,20,22]){
     await page.click(`[data-font="${size}"]`);
     assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow');
    }
   }
   await page.locator('.theory-toc button').last().click();
   assert.equal(await page.evaluate(()=>document.activeElement.id),`T${id}-${String(expected).padStart(2,'0')}-heading`);
   await page.locator('.lesson-back').last().click();
   assert(await page.locator('.theory-toc').evaluate(n=>n.getBoundingClientRect().top>=0));
  }
  assert.equal(total,72);
  await page.goto(base+'#theory/4');
  await page.selectOption('#theory-voice','device');
  await page.click('[data-theory-play]');
  assert(await page.locator('[data-theory-play]').isDisabled());
  await page.click('[data-theory-pause]');assert(await page.evaluate(()=>window.paused));
  await page.click('[data-theory-pause]');assert(!await page.evaluate(()=>window.paused));
  await page.selectOption('#theory-rate','0.8');assert.equal(await page.evaluate(()=>window.currentUtterance.rate),.8);
  await page.evaluate(()=>{let i=0;while(document.querySelector('[data-theory-play]').disabled&&i++<1000)window.currentUtterance.onend();});
  assert((await page.locator('.theory-audio-status').textContent()).includes('모두 읽었습니다'));
  const spoken=await page.evaluate(()=>window.spoken.join(' '));
  assert(spoken.includes('선금급률')&&spoken.includes('21만원')&&spoken.includes('혼동 주의'));
  assert(!/학습 목차로|근거 확인|국가법령정보센터|★/.test(spoken));
  await page.click('[data-theory-play]');const old=await page.evaluate(()=>window.cancelCount);
  await page.evaluate(()=>location.hash='theory/2');
  await page.waitForFunction(()=>document.querySelector('.theory-body h2').textContent===window.PROCUREMENT_DATA.areas[1].name);
  assert(await page.evaluate(old=>window.cancelCount>old,old));
  await page.click('[data-theory-play]');await page.click('[data-theory-stop]');assert(await page.locator('[data-theory-stop]').isDisabled());
  await page.setViewportSize({width:390,height:844});await page.click('[data-font="18"]');
  await page.locator('[data-theory-jump="T2-06"]').click();
  await page.screenshot({path:path.resolve(__dirname,'../.qa/theory-expanded-mobile.png')});
  const unsupported=await browser.newPage();
  await unsupported.addInitScript(()=>Object.defineProperty(window,'speechSynthesis',{value:undefined}));
  await unsupported.goto(base+'#theory/1');await unsupported.selectOption('#theory-voice','device');assert(await unsupported.locator('[data-theory-play]').isDisabled());
  assert.deepEqual(errors,[]);
  console.log('PASS: 72 lessons, emphasis/text preservation, TOC focus, 8 areas × 3 widths × 3 sizes, full theory audio and cancellation.');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
