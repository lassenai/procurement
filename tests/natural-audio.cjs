const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||'playwright');
const assert=require('node:assert/strict');
const base=process.env.BASE_URL||'http://127.0.0.1:4173/';
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.PW_CHANNEL||'msedge'});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{const NativeAudio=window.Audio;window.Audio=function(...args){const audio=new NativeAudio(...args);window.testAudio=audio;return audio;};window.Audio.prototype=NativeAudio.prototype;});
  await page.goto(base+'#theory/1');
  assert.equal(await page.locator('#theory-voice').inputValue(),'natural');
  await page.click('[data-theory-play]');
  await page.waitForFunction(()=>window.testAudio.currentTime>0,{},{timeout:15000});
  assert(await page.evaluate(()=>Number.isFinite(testAudio.duration)&&testAudio.duration>10));
  await page.click('[data-theory-pause]');assert(await page.evaluate(()=>testAudio.paused));
  await page.selectOption('#theory-rate','1.2');assert.equal(await page.evaluate(()=>testAudio.playbackRate),1.2);
  await page.click('[data-theory-pause]');assert(!await page.evaluate(()=>testAudio.paused));
  await page.evaluate(()=>testAudio.onended());
  await page.waitForFunction(()=>testAudio.currentSrc.includes('T1-02')&&testAudio.currentTime>0);
  await page.click('[data-theory-stop]');assert(await page.evaluate(()=>testAudio.paused));
  assert(await page.locator('[data-theory-pause]').isDisabled());
  await page.click('[data-theory-lesson="T1-04"]');
  await page.waitForFunction(()=>testAudio.currentSrc.includes('T1-04')&&testAudio.currentTime>0);
  await page.evaluate(()=>testAudio.onerror());assert((await page.locator('.theory-audio-status').textContent()).includes('불러오지 못했습니다'));
  await page.click('[data-theory-play]');
  await page.evaluate(()=>location.hash='theory/2');
  await page.waitForFunction(()=>document.querySelector('[data-theory-area]')?.dataset.theoryArea==='2');
  assert(await page.evaluate(()=>testAudio.paused));
  const lengths=await page.evaluate(async()=>{
   const items=window.PROCUREMENT_DATA.areas.flatMap(a=>a.lessons);
   const results=[];
   for(let i=0;i<items.length;i+=4){
    const batch=await Promise.all(items.slice(i,i+4).map(l=>new Promise((resolve,reject)=>{
     const audio=document.createElement('audio');const timer=setTimeout(()=>reject(Error(l.id+' metadata timeout')),15000);
     audio.preload='metadata';audio.onloadedmetadata=()=>{clearTimeout(timer);const duration=audio.duration;audio.removeAttribute('src');audio.load();resolve({id:l.id,duration});};
     audio.onerror=()=>{clearTimeout(timer);reject(Error(l.id+' invalid audio'));};audio.src='./'+l.audio.src;
    })));results.push(...batch);
   }return results;
  });
  assert.equal(lengths.length,72);assert(lengths.every(x=>Number.isFinite(x.duration)&&x.duration>10));
  for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  assert.deepEqual(errors,[]);
  console.log('PASS: real MP3 playback, pause/resume/rate, next lesson, per-topic playback, error, route cancel, all 72 audio files decoded.');
  console.log('Total narration minutes:',Math.round(lengths.reduce((sum,x)=>sum+x.duration,0)/60));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
