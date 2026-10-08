const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||'playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const base=process.env.BASE_URL||'http://127.0.0.1:4173/';
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.PW_CHANNEL||'msedge'});
 const c=await browser.newContext({viewport:{width:390,height:844}});
 await c.addInitScript(()=>{
  class Recognition{
   constructor(){window.testRec=this;this.aborted=false;}
   start(){this.onstart?.();}
   stop(){this.stopped=true;}
   abort(){this.aborted=true;}
   emit(parts){const results=parts.map(([text,final])=>Object.assign([{transcript:text}],{isFinal:final}));this.onresult?.({resultIndex:0,results});}
  }
  window.SpeechRecognition=Recognition;
 });
 const p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'#q/Q001');await p.locator('#answer').fill('기존 답안');
 await p.locator('[data-voice-toggle]').click();assert.equal(await p.locator('#answer').getAttribute('readonly'),'');
 await p.evaluate(()=>testRec.emit([['경쟁입찰',false]]));assert.equal(await p.locator('#answer').inputValue(),'기존 답안');assert.match(await p.locator('.voice-interim').innerText(),/경쟁입찰/);
 await p.evaluate(()=>testRec.emit([['경쟁입찰참가자격등록',true]]));assert.equal(await p.locator('#answer').inputValue(),'기존 답안\n경쟁입찰참가자격등록');
 await p.evaluate(()=>testRec.emit([['경쟁입찰참가자격등록',true]]));assert.equal(await p.locator('#answer').inputValue(),'기존 답안\n경쟁입찰참가자격등록');
 await p.locator('[data-voice-toggle]').click();await p.evaluate(()=>{testRec.emit([['경쟁입찰참가자격등록',true],['자격을 확인한다',true]]);testRec.onend?.();});
 assert.equal(await p.locator('#answer').inputValue(),'기존 답안\n경쟁입찰참가자격등록 자격을 확인한다');assert.equal(await p.locator('#answer').getAttribute('readonly'),null);
 await p.reload();assert.match(await p.locator('#answer').inputValue(),/자격을 확인한다/);console.log('PASS: interim, final, no duplicates, append, late final after stop, persistence');
 await p.locator('[data-voice-toggle]').click();await p.evaluate(()=>{testRec.onerror?.({error:'not-allowed'});testRec.onend?.();});assert.match(await p.locator('.voice-status').innerText(),/허용되지/);assert.equal(await p.locator('#answer').getAttribute('readonly'),null);
 await p.locator('[data-voice-toggle]').click();await p.evaluate(()=>{window.oldRec=testRec;window.late=testRec.onresult;});await p.locator('[data-go="q/Q002"]').click();await p.locator('[data-answer="Q002"]').waitFor();assert.equal(await p.evaluate(()=>oldRec.aborted),true);await p.evaluate(()=>late({results:[Object.assign([{transcript:'잘못된 문항 입력'}],{isFinal:true})]}));assert.equal(await p.locator('#answer').inputValue(),'');console.log('PASS: permission errors and navigation cancel isolation');
 for(const size of ['18','20','22']){
  await p.locator(`[data-font="${size}"]`).click();
  assert.equal(await p.evaluate(()=>getComputedStyle(document.documentElement).fontSize),size+'px');
  for(const width of [320,390,768,1440]){
   await p.setViewportSize({width,height:950});
   for(const route of ['home','q/Q002','theory/6','practice','mocks','settings']){
    await p.goto(base+'#'+route);await p.waitForLoadState('networkidle');
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,route+' '+size+' '+width);
    assert(!/학원|첨부 출제기준|출제기준 PDF/.test(await p.locator('#main').innerText()));
   }
  }
 }
 await p.reload();assert.equal(await p.evaluate(()=>getComputedStyle(document.documentElement).fontSize),'22px');console.log('PASS: 3 font sizes x 4 widths x 6 screens, preference restore and source labels');
 await p.setViewportSize({width:390,height:844});await p.goto(base+'#theory/1');await p.locator('[data-font="18"]').click();await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:path.resolve('.qa/new-mobile-theory.png'),fullPage:true});
 await p.goto(base+'#q/Q002');await p.screenshot({path:path.resolve('.qa/new-mobile-voice.png'),fullPage:true});
 await p.setViewportSize({width:1440,height:1000});await p.goto(base+'#home');await p.screenshot({path:path.resolve('.qa/new-desktop.png'),fullPage:true});
 const fallback=await browser.newContext();await fallback.addInitScript(()=>{window.SpeechRecognition=undefined;window.webkitSpeechRecognition=undefined;});const fp=await fallback.newPage();await fp.goto(base+'#q/Q001');assert.equal(await fp.locator('[data-voice-toggle]').isDisabled(),true);assert.match(await fp.locator('.voice-status').innerText(),/키보드/);await fp.locator('#answer').fill('직접 입력 가능');console.log('PASS: unsupported fallback preserves text entry');
 assert.equal(errors.length,0,errors.join('\n'));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
