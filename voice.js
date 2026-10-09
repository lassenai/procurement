(() => {
  'use strict';
  const fontKey='procurement.reading-size';
  let size='18';try{if(['18','20','22'].includes(localStorage.getItem(fontKey)))size=localStorage.getItem(fontKey);}catch(e){}
  function applySize(){document.documentElement.style.fontSize=size+'px';document.querySelectorAll('[data-font]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.font===size)));}
  let session=null;
  function message(text){const node=document.querySelector('.voice-status');if(node)node.textContent=text;}
  function paint(listening){const b=document.querySelector('[data-voice-toggle]');if(b){b.setAttribute('aria-pressed',String(listening));b.querySelector('span').textContent=listening?'말하기 종료':'음성으로 답하기';}const input=document.querySelector('textarea[data-answer],textarea[data-exam-answer],textarea[data-blank-answer]');if(input&&!input.hasAttribute('data-submitted')){if(session?.input===input||!listening)input.readOnly=listening||!!input.dataset.locked;}}
  function cancel(){const s=session;if(!s)return;session=null;s.rec.onresult=null;s.rec.onend=null;s.rec.onerror=null;try{s.rec.abort();}catch(e){}if(s.input.isConnected)s.input.readOnly=false;}
  function available(){return window.SpeechRecognition||window.webkitSpeechRecognition;}
  // Some mobile recognizers expose successive hypotheses as separate final
  // results. Collapse only a growing prefix chain (3+ results), never ordinary
  // repeated words, arbitrary overlaps, or text from a previous recording.
  function recognitionText(parts){
    const output=[];
    for(let i=0;i<parts.length;){
      let end=i+1,growing=false;
      while(end<parts.length&&parts[end].startsWith(parts[end-1])){
        growing ||= parts[end].length>parts[end-1].length;
        end++;
      }
      if(end-i>=3&&growing){output.push(parts[end-1]);i=end;}
      else {output.push(parts[i]);i++;}
    }
    return output.join(' ');
  }
  function init(){applySize();const b=document.querySelector('[data-voice-toggle]');if(!b)return;if(!available()||!window.isSecureContext){b.disabled=true;b.querySelector('span').textContent='키보드 마이크로 답하기';message('이 브라우저에서는 직접 음성 입력을 지원하지 않습니다. 답안 칸을 누른 뒤 휴대폰 키보드의 마이크를 이용해 주세요.');}}
  function start(){
    if(session){session.stopping=true;message('말씀을 마무리하고 있습니다…');try{session.rec.stop();}catch(e){cancel();paint(false);}return;}
    const Ctor=available(), input=document.querySelector('textarea[data-answer],textarea[data-exam-answer],textarea[data-blank-answer]');
    if(!Ctor||!input||input.readOnly||!window.isSecureContext)return;
    let rec;try{rec=new Ctor();}catch(e){message('음성 입력을 시작할 수 없습니다. 키보드의 마이크를 이용해 주세요.');return;}
    const s={rec,input,base:input.value,finals:new Map(),error:false,stopping:false};session=s;
    rec.lang='ko-KR';rec.continuous=false;rec.interimResults=true;
    paint(true);message('마이크를 연결하고 있습니다. 권한 요청을 확인해 주세요.');
    rec.onstart=()=>{if(session===s)message('듣고 있습니다. 한 문장씩 말씀하세요. 말이 끝나면 자동으로 마무리합니다.');};
    rec.onresult=event=>{
      if(session!==s||!input.isConnected)return;
      const finals=[],interims=[];
      for(let i=0;i<event.results.length;i++){
        const result=event.results[i];
        const transcript=result[0].transcript.trim();
        if(!transcript)continue;
        if(result.isFinal)finals.push([i,transcript]);
        else interims.push(transcript);
      }
      // results is the current session snapshot; do not retain stale indices.
      s.finals=new Map(finals);
      const text=recognitionText(finals.map(x=>x[1]));
      const interim=recognitionText(interims);
      const value=[s.base.trimEnd(),text].filter(Boolean).join('\n').slice(0,20000);
      if(text&&input.value!==value){input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));}
      const preview=document.querySelector('.voice-interim');if(preview)preview.textContent=interim?'인식 중: '+interim:'';
    };
    rec.onerror=e=>{if(session!==s)return;s.error=true;const messages={'not-allowed':'마이크 사용이 허용되지 않았습니다. 브라우저의 사이트 설정에서 마이크를 허용한 뒤 다시 눌러 주세요.','service-not-allowed':'이 브라우저의 음성 서비스가 허용되지 않았습니다. 다른 지원 브라우저 또는 키보드 마이크를 이용해 주세요.','audio-capture':'마이크를 찾을 수 없습니다. 연결과 다른 앱의 마이크 사용을 확인해 주세요.','network':'음성 서비스에 연결하지 못했습니다. 인터넷 연결을 확인하거나 키보드 마이크를 이용해 주세요.','no-speech':'음성을 듣지 못했습니다. 버튼을 눌러 다시 말씀해 주세요.','aborted':'음성 입력을 중지했습니다.'};message(messages[e.error]||'음성 인식을 완료하지 못했습니다. 다시 시도하거나 키보드 마이크를 이용해 주세요.');};
    rec.onend=()=>{if(session!==s)return;session=null;input.readOnly=false;paint(false);const preview=document.querySelector('.voice-interim');if(preview)preview.textContent='';if(!s.error)message(s.finals.size?'음성을 답안에 적었습니다. 더 말하려면 음성으로 답하기를 다시 누르세요. 내용을 확인한 뒤 답안을 비교하세요.':'인식된 답안이 없습니다. 버튼을 눌러 다시 말씀해 주세요.');};
    try{rec.start();}catch(e){cancel();paint(false);message('마이크를 시작하지 못했습니다. 권한을 확인하거나 키보드 마이크를 이용해 주세요.');}
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');
    if(b?.dataset.font){size=b.dataset.font;try{localStorage.setItem(fontKey,size);}catch(e){}applySize();return;}
    if(b?.hasAttribute('data-voice-toggle')){start();return;}
    // End capture before any answer navigation, grading, printing or exam submission.
    if(session&&e.target.closest('button,a')){cancel();paint(false);}
  },true);
  document.addEventListener('study:before-render',cancel);
  document.addEventListener('study:render',init);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancel();paint(false);message('화면을 떠나 음성 입력을 멈췄습니다.');}});
  window.addEventListener('pagehide',cancel);
  init();
})();
// Static neural narration is the default; browser synthesis remains optional.
(() => {
  'use strict';
  const synth=window.speechSynthesis;
  const supported=!!synth && typeof window.SpeechSynthesisUtterance==='function';
  const find=s=>document.querySelector(s);
  let run=null,rate='1',mode='natural';
  try{
    const saved=localStorage.getItem('procurement.theory-rate');if(['0.8','1','1.2'].includes(saved))rate=saved;
    const voice=localStorage.getItem('procurement.theory-voice');if(['natural','device'].includes(voice))mode=voice;
  }catch(e){}
  function area(){return window.PROCUREMENT_DATA.areas.find(a=>a.id===Number(find('[data-theory-area]')?.dataset.theoryArea));}
  function available(){return mode==='natural'?!!area()?.lessons.every(l=>l.audio?.src):supported;}
  function paint(message){
    const play=find('[data-theory-play]');if(!play)return;
    play.disabled=!available()||!!run;
    const pause=find('[data-theory-pause]');pause.disabled=!run;pause.textContent=run?.paused?'이어듣기':'일시정지';
    find('[data-theory-stop]').disabled=!run;
    document.querySelectorAll('[data-theory-lesson]').forEach(button=>{
      const active=!!run&&(run.mode==='natural'?run.items?.[run.index]?.id===button.dataset.theoryLesson:run.lessonId===button.dataset.theoryLesson);
      button.disabled=!available();button.textContent=active?'이 주제 듣기 정지':'이 주제 듣기';button.setAttribute('aria-pressed',String(active));
    });
    if(message)find('.theory-audio-status').textContent=message;
  }
  function stop(message){
    const previous=run;run=null;
    if(previous?.audio){previous.audio.onended=null;previous.audio.onerror=null;previous.audio.pause();previous.audio.removeAttribute('src');previous.audio.load();}
    if(previous?.mode==='device'&&supported)synth.cancel();
    paint(message);
  }
  function progress(session){return session.mode==='natural'?`읽는 중 · ${session.index+1}/${session.items.length} · ${session.items[session.index].title}`:`읽는 중 · ${session.index+1}/${session.chunks.length}`;}
  function playAudio(session){
    if(run!==session)return;
    session.paused=false;paint(progress(session));
    session.audio.play().catch(()=>{if(run===session)stop('음성 재생을 시작하지 못했습니다. 이론 듣기를 다시 눌러 주세요.');});
  }
  function nextAudio(session){
    if(run!==session)return;
    if(session.index>=session.items.length){stop('선택한 핵심이론을 모두 읽었습니다.');return;}
    session.audio.src='./'+session.items[session.index].audio.src;
    session.audio.playbackRate=Number(rate);playAudio(session);
  }
  function speak(session){
    if(run!==session)return;
    if(session.index>=session.chunks.length){run=null;paint('선택한 핵심이론을 모두 읽었습니다.');return;}
    const utterance=new SpeechSynthesisUtterance(session.chunks[session.index]);session.utterance=utterance;
    utterance.lang='ko-KR';utterance.rate=Number(rate);
    const voices=synth.getVoices().filter(v=>/^ko(?:[-_]|$)/i.test(v.lang));
    const korean=voices.find(v=>/natural|neural|premium|enhanced/i.test(v.name))||voices[0];if(korean)utterance.voice=korean;
    utterance.onend=()=>{if(run!==session||session.utterance!==utterance)return;session.index++;if(!session.paused)speak(session);else session.between=true;};
    utterance.onerror=()=>{if(run===session&&session.utterance===utterance)stop('기기 음성을 재생하지 못했습니다. 자연스러운 AI 음성을 선택해 주세요.');};
    paint(progress(session));synth.speak(utterance);
  }
  function start(lessonId){
    if(!available())return;stop();
    const session={mode,index:0,paused:false,lessonId};run=session;
    if(mode==='natural'){
      session.items=area().lessons.filter(l=>!lessonId||l.id===lessonId);
      session.audio=new Audio();session.audio.preload='auto';
      session.audio.onended=()=>{if(run===session){session.index++;nextAudio(session);}};
      session.audio.onerror=()=>{if(run===session)stop('음원을 불러오지 못했습니다. 연결을 확인하고 다시 시도하거나 기기 기본 음성을 선택해 주세요.');};
      nextAudio(session);
    }else{
      session.chunks=[];
      const scope=lessonId?document.getElementById(lessonId):find('.theory-body');
      scope.querySelectorAll('[data-theory-read]').forEach(node=>{
        for(const sentence of node.textContent.trim().match(/[^.!?。]+[.!?。]*\s*/g)||[])
          for(let i=0;i<sentence.length;i+=140)session.chunks.push(sentence.slice(i,i+140));
      });
      synth.cancel();synth.resume();speak(session);
    }
  }
  function init(){
    if(!find('[data-theory-play]'))return;
    find('#theory-rate').value=rate;find('#theory-voice').value=mode;
    paint(mode==='natural'?(available()?'사람처럼 자연스럽게 읽는 AI 음성입니다. 실제 사람의 녹음은 아닙니다.':'이 영역의 AI 음원이 아직 준비되지 않았습니다. 기기 기본 음성을 선택할 수 있습니다.'):(supported?'기기에 설치된 한국어 음성으로 읽습니다.':'이 브라우저는 기기 음성을 지원하지 않습니다. 자연스러운 AI 음성을 선택해 주세요.'));
  }
  document.addEventListener('click',event=>{
    const lessonButton=event.target.closest('[data-theory-lesson]');
    if(lessonButton){if(lessonButton.getAttribute('aria-pressed')==='true')stop('듣기를 멈췄습니다.');else start(lessonButton.dataset.theoryLesson);return;}
    if(event.target.closest('[data-theory-play]')){if(!run)start();}
    else if(event.target.closest('[data-theory-stop]'))stop('듣기를 멈췄습니다. 이론 듣기 또는 이 주제 듣기를 눌러 다시 시작하세요.');
    else if(event.target.closest('[data-theory-pause]')&&run){
      run.paused=!run.paused;
      if(run.mode==='natural'){if(run.paused)run.audio.pause();else playAudio(run);}
      else if(run.paused)synth.pause();
      else{synth.resume();if(run.between){run.between=false;speak(run);}}
      paint(run.paused?'일시정지했습니다. 이어듣기를 누르면 계속 읽습니다.':progress(run));
    }
  });
  document.addEventListener('change',event=>{
    if(event.target.id==='theory-voice'){
      stop();mode=event.target.value;try{localStorage.setItem('procurement.theory-voice',mode);}catch(e){}init();
    }else if(event.target.id==='theory-rate'){
      rate=event.target.value;try{localStorage.setItem('procurement.theory-rate',rate);}catch(e){}
      if(run?.mode==='natural')run.audio.playbackRate=Number(rate);
      else if(run){const next={mode:'device',chunks:run.chunks,index:run.index,lessonId:run.lessonId,paused:false};stop();synth.resume();run=next;speak(next);}
    }
  });
  document.addEventListener('study:before-render',()=>{if(run)stop();});
  document.addEventListener('study:render',init);
  window.addEventListener('pagehide',()=>{if(run)stop();});
  init();
})();
