(() => {
  'use strict';
  const D = window.PROCUREMENT_DATA;
  const ALL = [...D.questions, ...D.mockQuestions];
  const BY_ID = new Map(ALL.map(q => [q.id, q]));
  const KEY = 'procurement.study.v1';
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
  const plain = o => !!o && typeof o === 'object' && !Array.isArray(o);
  const empty = () => ({version:1,answers:{},checks:{},revealed:{},bookmarks:[],exams:{},blankAnswers:{},blankChecked:{}});
  let storageAvailable = true;
  let toastTimeout;
  let state = empty();
  const ui = {review:false,search:'',area:'all',type:'all',status:'all',page:1};
  const norm = s => String(s).normalize('NFKC').replace(/[\s,]/g,'').toLowerCase();
  const qScore = (q, checks) => q.rubric.reduce((total,_,i) => total + (checks?.includes(i) ? 5/q.rubric.length : 0),0);
  const fmt = n => Number(n.toFixed(1)).toString();
  const area = id => D.areas.find(a => a.id === Number(id));
  const examInfo = id => D.mocks.find(m => m.id === Number(id));
  const isGraded = q => own(state.checks,q.id);
  const score = q => qScore(q,state.checks[q.id]);

  function sanitize(raw) {
    if (!plain(raw) || raw.version !== 1) throw new Error('지원하지 않는 학습기록 형식입니다.');
    const clean = empty();
    for(const q of D.blanks){
      if(typeof raw.blankAnswers?.[q.id]==='string')clean.blankAnswers[q.id]=raw.blankAnswers[q.id].slice(0,20000);
      if(raw.blankChecked?.[q.id]===true)clean.blankChecked[q.id]=true;
    }
    for (const q of D.questions) {
      if (typeof raw.answers?.[q.id] === 'string') clean.answers[q.id] = raw.answers[q.id].slice(0,20000);
      if (Array.isArray(raw.checks?.[q.id])) clean.checks[q.id] = [...new Set(raw.checks[q.id].filter(i => Number.isInteger(i) && i >= 0 && i < q.rubric.length))];
      if (raw.revealed?.[q.id] === true) clean.revealed[q.id] = true;
    }
    if (Array.isArray(raw.bookmarks)) clean.bookmarks = [...new Set(raw.bookmarks.filter(id => D.questions.some(q => q.id === id)))];
    let running = false;
    for (const m of D.mocks) {
      const e = raw.exams?.[m.id];
      if (!plain(e) || !Number.isFinite(e.startedAt) || e.startedAt <= 0 || e.startedAt > Date.now()+60000) continue;
      const submittedAt = Number.isFinite(e.submittedAt) && e.submittedAt >= e.startedAt ? Math.min(e.submittedAt, Date.now()) : null;
      if (!submittedAt && running) continue;
      if (!submittedAt) running = true;
      const entry = {startedAt:e.startedAt,deadline:e.startedAt + m.minutes*60000,index:Number.isInteger(e.index) ? Math.max(0,Math.min(19,e.index)) : 0,submittedAt,answers:{},checks:{}};
      for (const id of m.ids) {
        if (typeof e.answers?.[id] === 'string') entry.answers[id] = e.answers[id].slice(0,20000);
        if (submittedAt && Array.isArray(e.checks?.[id])) entry.checks[id] = [...new Set(e.checks[id].filter(i => Number.isInteger(i) && i>=0 && i<BY_ID.get(id).rubric.length))];
      }
      clean.exams[m.id] = entry;
    }
    return clean;
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = sanitize(JSON.parse(raw));
  } catch (error) {
    storageAvailable = false;
    // Keep a corrupt or inaccessible storage entry intact; never silently overwrite it.
  }
  function save() {
    if (!storageAvailable) return false;
    try { localStorage.setItem(KEY,JSON.stringify(state)); return true; }
    catch (error) { storageAvailable=false; toast('저장 공간을 사용할 수 없습니다. 학습기록을 내보내 주세요.'); return false; }
  }
  function toast(message) {
    $('#toast').textContent=message; $('#toast').classList.add('visible');
    clearTimeout(toastTimeout); toastTimeout=setTimeout(() => $('#toast').classList.remove('visible'),3500);
  }
  function go(route) { if (location.hash === '#'+route) render(); else location.hash=route; }
  const link = (url,label) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
  function route() { return (location.hash.slice(1)||'home').split('/'); }
  function runningExam() { return D.mocks.find(m => state.exams[m.id] && !state.exams[m.id].submittedAt); }
  function expire() {
    const m=runningExam();
    if (m && Date.now()>=state.exams[m.id].deadline) {
      state.exams[m.id].submittedAt=state.exams[m.id].deadline;
      save(); return true;
    }
    return false;
  }
  function navIcon(key) {
    const paths={blanks:'M4 4h16v16H4Z M7 9h10 M7 15h3 M14 15h3',home:'M3 10 12 3l9 7v10H3Z M9 20v-7h6v7',practice:'M5 3h14v18H5Z M8 8h8 M8 12h8 M8 16h5',theory:'M12 5C8 2 3 3 3 3v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2Z M12 5v16',mocks:'M12 8v5l3 2 M9 2h6 M12 2v3 M20 14a8 8 0 1 1-16 0 8 8 0 0 1 16 0',review:'M5 4h14v17l-7-4-7 4Z',settings:'M4 7h16 M4 17h16 M9 4v6 M15 14v6'};
    return `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[key]}"/></svg>`;
  }
  function shell(content, active) {
    const activeExam=runningExam();
    return `<div class="shell"><aside class="sidebar"><a class="brand" href="#home" aria-label="남서울대학교 AI공공조달학과 · 아로와 함께 학습 홈으로"><img class="department-logo" src="./assets/department-logo.png?v=hires-2" alt="남서울대학교 AI공공조달학과" width="290" height="138"><span class="brand-aro"><img src="./assets/aro-reading.png" alt="앉아서 책을 읽는 학습 파트너 아로" width="1280" height="1280"></span></a><p class="brand-sub">공공조달관리사 실기 시험대비</p>
      <nav class="nav" aria-label="주 메뉴">${[['home','홈'],['theory','핵심이론'],['blanks','빈칸 연습'],['practice','실전 문제'],['mocks','모의고사'],['review','오답·북마크'],['settings','기록·자료 안내']].map(([key,name])=>`<a href="#${key==='blanks'?'blanks/1/1':key}" aria-label="${name}" ${active===key?'class="active" aria-current="page"':''}>${navIcon(key)}<span class="desktop-label">${name}</span><span class="mobile-label">${({home:'홈',theory:'이론',blanks:'빈칸',practice:'실전',mocks:'모의고사',review:'오답·북마크',settings:'기록·자료'})[key]}</span></a>`).join('')}</nav>
      <div class="sidebar-bottom"><strong>2026년 11월 14일</strong>실기시험 · 필답형 150분<br>학습 240문항 / 모의 60문항<br><br>내 기록은 이 브라우저에 저장됩니다.<br><a href="#settings">기록 백업하기</a></div></aside>
      <div class="main-wrap"><header class="topbar"><span class="top-title">공공조달관리사 실기 시험대비 <span class="edition">2026</span></span><div class="reading-controls" role="group" aria-label="글자 크기"><span>글자 크기</span><button data-font="18" aria-label="글자 크기 기본">가</button><button data-font="20" aria-label="글자 크기 크게">가+</button><button data-font="22" aria-label="글자 크기 아주 크게">가++</button></div><span class="local-info">${activeExam?`<a href="#exam/${activeExam.id}">${activeExam.id}회 응시 중 · 이어풀기</a>`:'문제를 읽고, 직접 쓰고, 비교해 보세요.'}</span></header>
      <main id="main" tabindex="-1">${!storageAvailable?'<p class="notice" role="alert">브라우저 저장을 사용할 수 없거나 기존 기록을 읽지 못했습니다. 현재 기록은 새로고침 시 사라질 수 있습니다. 기록·자료 안내에서 백업 후 저장 복구를 선택해 주세요.</p>':''}${content}</main></div></div>`;
  }
  function updateExamCountdown() {
    const timer=$('#exam-countdown');
    if(!timer)return;
    const now=Date.now(), target=Date.parse(D.examDate+'T00:00:00+09:00');
    const remaining=Math.max(0,Math.ceil((target-now)/1000));
    const days=Math.ceil((target-now)/86400000);
    $('#exam-dday').textContent=days>0?'D−'+days:now<target+86400000?'D-DAY':'시험일 경과';
    const values=[Math.floor(remaining/86400),Math.floor(remaining%86400/3600),Math.floor(remaining%3600/60),remaining%60];
    timer.innerHTML=values.map((n,i)=>`<span class="countdown-unit"><b>${String(n).padStart(2,'0')}</b><span>${['일','시간','분','초'][i]}</span></span>`).join('');
  }
  function emphasizeTheory(text, keywords=[]) {
    const terms=keywords.filter(term=>text.includes(term));
    const matches=terms.map(term=>({term,start:text.indexOf(term)})).sort((a,b)=>a.start-b.start||b.term.length-a.term.length);
    let html='',end=0,count=0;
    for(const match of matches){
      if(match.start<end || count>=3)continue;
      html+=esc(text.slice(end,match.start))+`<strong class="theory-keyword"><span class="importance-star" aria-hidden="true"></span>${esc(match.term)}</strong>`;
      end=match.start+match.term.length;count++;
    }
    return html+esc(text.slice(end));
  }
  function home() {
    const graded=D.questions.filter(isGraded), mastered=graded.filter(q=>score(q)>=4.999), wrong=graded.length-mastered.length;
    const remaining=D.questions.find(q=>!isGraded(q));
    return `<section class="hero aro-hero"><div class="hero-copy"><p class="hero-kicker">공공조달관리사 실기 학습</p><h1>아는 것을,<br>답안으로.</h1><p class="hero-intro">공공조달의 기초부터<br>직접 말하고 쓰는 실전 연습까지.</p><p class="hero-description">핵심이론을 이해하고, 내 말로 설명해 보세요.<br>한 문제씩 쌓아가는 나만의 실기 준비.</p><div class="actions"><button class="primary" data-go="q/${remaining?.id||'Q001'}">${graded.length?'이어서 학습하기':'첫 문제 풀기'}</button><button data-go="theory">핵심이론 살펴보기</button></div><p class="hero-footnote">음성으로 답하기 지원 · 이 브라우저에 학습기록 저장</p></div><figure class="aro-portrait"><div class="aro-halo"></div><img src="./assets/aro-department.png" alt="남서울대 심볼과 AI공공조달학과 이름표를 달고 체크리스트를 든 아로" width="1200" height="1312" fetchpriority="high"><figcaption><strong>아로 <span>ARO</span></strong><span>AI공공조달학과 학습 파트너</span></figcaption></figure></section>
      <nav class="study-path" aria-label="추천 학습 순서"><a href="#theory">핵심이론</a><span aria-hidden="true">→</span><a href="#blanks/1/1">빈칸 연습</a><span aria-hidden="true">→</span><a href="#practice">실전 문제</a><span aria-hidden="true">→</span><a href="#mocks">모의고사</a></nav>
      <section class="home-learning"><div class="section-head"><div><h2>오늘은 어디부터 시작할까요?</h2><p>내 학습 단계에 맞는 연습을 선택하세요.</p></div></div><div class="learning-cards"><a href="#theory"><img class="course-mascot" src="./assets/aro-reading.png" alt="" width="90" height="90"><h3>핵심이론</h3><p>8개 영역의 개념과 적용 예시.<br>읽거나 들으면서 차근차근 익혀요.</p><small>8개 영역 · 72개 주제</small></a><a href="#blanks/1/1"><img class="course-mascot" src="./assets/aro-cheer-department.png" alt="" width="90" height="90"><h3>빈칸 연습</h3><p>핵심 용어를 하나씩 떠올려 보세요.<br>빈칸을 채우며 개념을 익혀요.</p><small>8개 영역 · 64문항</small></a><a href="#practice"><img class="course-mascot" src="./assets/aro-write.png" alt="" width="90" height="90"><h3>실전 문제</h3><p>아는 내용을 내 말로 써보세요.<br>모범답안과 비교하며 연습해요.</p><small>8개 영역 · 240문항</small></a><a href="#mocks"><img class="course-mascot" src="./assets/aro-idea.png" alt="" width="90" height="90"><h3>모의고사</h3><p>시간을 정해 실전처럼 풀어보세요.<br>마친 뒤 부족한 부분을 확인해요.</p><small>3회 · 회당 20문항</small></a></div></section>
      <section class="exam-date home-exam"><div><span>실기시험까지</span><strong id="exam-dday"></strong></div><small>2026. 11. 14. 토요일</small><div id="exam-countdown" class="exam-countdown" role="timer" aria-live="off" aria-label="시험일까지 남은 시간"></div><small class="countdown-basis">시험일 0시 기준 · 한국시간</small></section>
      <div class="section-head"><h2>나의 학습 현황</h2><a href="#settings">학습기록 백업</a></div>
      <div class="stats"><div class="stat"><strong>${graded.length}<small> / 240</small></strong><span>채점한 문제</span></div><div class="stat"><strong>${mastered.length}</strong><span>모든 요소 충족</span></div><div class="stat"><strong>${wrong}</strong><span>다시 연습할 문제</span></div><div class="stat"><strong>${Object.values(state.exams).filter(e=>e.submittedAt).length}<small> / 3</small></strong><span>제출한 모의고사</span></div></div>
      <div class="actions" style="margin:20px 0"><button data-go="blanks/1/1">빈칸 연습 · 64문항</button><button data-go="practice">실전 문제 · 240문항</button></div><div class="section-head"><h2>출제영역별 학습</h2><a href="#practice">전체 문제 보기</a></div><div class="areas">${D.areas.map(a=>{
        const done=D.questions.filter(q=>q.area===a.id&&isGraded(q)).length;
        return `<div class="area-row"><span class="area-num">${a.id}</span><div><div class="area-title">${a.name}</div><div class="area-desc">${a.description}</div></div><div class="area-progress"><span class="progress-label">${done} / ${a.count}문항 채점</span><progress value="${done}" max="${a.count}" aria-label="${a.name} 진도"></progress></div><button class="small" data-area-start="${a.id}">학습</button></div>`;
      }).join('')}</div><p class="footer-note">진도는 답안 작성 여부가 아닌 채점 완료 기준입니다. 서술형 점수는 학습자가 체크한 자체 채점요소를 기준으로 합니다.</p>`;
  }
  function filtered(review=false) {
    return D.questions.filter(q=> (ui.area==='all'||q.area===Number(ui.area)) && (ui.type==='all'||q.type===ui.type) && (!ui.search||`${q.id} ${q.prompt} ${area(q.area).name}`.toLowerCase().includes(ui.search.toLowerCase())) &&
      (ui.status==='all' ? (!review || (isGraded(q)&&score(q)<4.999)||state.bookmarks.includes(q.id)) : ui.status==='wrong' ? isGraded(q)&&score(q)<4.999 : ui.status==='bookmarked' ? state.bookmarks.includes(q.id) : ui.status==='new' ? !isGraded(q) : isGraded(q)&&score(q)>=4.999));
  }
  function aroGuide(pose,title,message){
    const images={reading:'aro-reading.png',writing:'aro-department.png',cheer:'aro-cheer-department.png',pencil:'aro-write.png',idea:'aro-idea.png'};
    return `<aside class="aro-guide" aria-label="아로의 학습 안내"><img src="./assets/${images[pose]}" alt="" width="100" height="100"><div><span class="aro-guide-name">학습 파트너 아로</span><strong>${esc(title)}</strong><p>${esc(message)}</p></div></aside>`;
  }
  function learningTabs(selected){
    return `<nav class="learning-tabs" aria-label="연습 방식"><a href="#blanks/1/1" ${selected==='blanks'?'aria-current="page"':''}>빈칸 연습 <small>핵심 용어 64문항</small></a><a href="#practice" ${selected==='practice'?'aria-current="page"':''}>실전 문제 <small>답안 작성 240문항</small></a></nav>`;
  }
  function blanks(id=1){
    const a=area(id)||D.areas[0],list=D.blanks.filter(q=>q.area===a.id);
    const index=Math.max(0,Math.min(list.length-1,Math.trunc(Number(route()[2])||1)-1)),q=list[index];
    const checked=state.blankChecked[q.id],answer=state.blankAnswers[q.id]||'';
    const matched=q.answers.some(x=>norm(x)===norm(answer));
    const count=list.filter(x=>state.blankChecked[x.id]).length;
    return `<h1>빈칸 연습</h1><p class="muted">핵심 용어를 익힌 뒤 실전 답안 작성으로 이어가세요. 각 영역 8문항, 총 64문항입니다.</p>${aroGuide('cheer','빈칸 하나씩, 자신감을 쌓아요.','바로 떠오르지 않아도 괜찮아요. 먼저 생각해 보고 정답과 비교해 보세요.')}${learningTabs('blanks')}<div class="field blank-area"><label for="blank-area">학습할 영역</label><select id="blank-area">${D.areas.map(x=>`<option value="${x.id}" ${a.id===x.id?'selected':''}>${x.id}. ${esc(x.name)} · 8문항</option>`).join('')}</select></div><div class="question-layout"><article class="question-paper blank-paper"><div class="tags"><span class="badge">빈칸형</span><span>${a.id}. ${esc(a.name)} · ${index+1} / 8</span></div><h2 class="question-text">${esc(q.prompt).replace('[빈칸]','<mark class="blank-slot">( 빈칸 )</mark>')}</h2><p class="inline-note">괄호에 들어갈 핵심 용어를 쓰거나 말해 보세요.</p>${voiceControls()}<label class="answer-label" for="blank-answer">빈칸 답안 <span class="saved" id="save-status">${storageAvailable?'입력 즉시 이 기기에 저장':'기기 저장 불가 · 백업 필요'}</span></label><textarea id="blank-answer" data-blank-answer="${q.id}" maxlength="20000" rows="2" placeholder="핵심 용어를 입력하세요.">${esc(answer)}</textarea><div class="answer-actions"><button class="primary" data-blank-check="${q.id}">정답 확인</button><button data-blank-retry="${q.id}">다시 풀기</button></div>${checked?`<section id="blank-feedback" class="blank-feedback" tabindex="-1" role="status"><h3>${matched?'정답입니다':answer.trim()?'정답과 비교해 보세요':'정답을 확인해 보세요'}</h3><p><strong>정답: ${esc(q.answers[0])}</strong></p><p>${esc(q.explanation)}</p>${q.answers.length>1?`<p class="inline-note">인정 표현: ${q.answers.slice(1).map(esc).join(' / ')}</p>`:''}<p class="inline-note">띄어쓰기는 구분하지 않습니다. 다른 표현은 뜻이 같은지 해설과 비교해 주세요.</p><button data-go="theory/${a.id}" class="small">이 영역 핵심이론 보기</button></section>`:''}<div class="section-head blank-pagination"><button data-go="blanks/${a.id}/${index}" ${index===0?'disabled':''}>이전</button><span>${index+1} / 8</span>${index<7?`<button data-go="blanks/${a.id}/${index+2}">다음</button>`:a.id<8?`<button data-go="blanks/${a.id+1}/1">다음 영역</button>`:'<button data-go="practice">실전 문제로</button>'}</div></article><aside class="panel side-note"><h2>영역별 빈칸 연습</h2><p>${esc(a.name)} · 정답 확인 ${count} / 8</p><nav class="blank-grid" aria-label="빈칸 문제 번호">${list.map((x,i)=>`<button data-go="blanks/${a.id}/${i+1}" ${i===index?'aria-current="step"':''} aria-label="${i+1}번 ${state.blankChecked[x.id]?'정답 확인 완료':'미확인'}">${i+1}${state.blankChecked[x.id]?' ✓':''}</button>`).join('')}</nav><p class="inline-note">정답을 확인한 문제에는 ✓ 표시가 붙습니다.</p><button class="full-width" data-area-start="${a.id}">이 영역 실전 문제 풀기</button></aside></div>`;
  }
  function practice(review=false) {
    ui.review=review;
    const list=filtered(review), pages=Math.max(1,Math.ceil(list.length/15)); ui.page=Math.min(ui.page,pages);
    return `${review?'':learningTabs('practice')}<h1>${review?'오답과 북마크':'실전 문제'}</h1><p class="muted">${review?'부족했던 답안을 다시 쓰고, 기억해 둘 문제를 모아 보세요.':'240문항을 영역과 유형별로 골라 연습하세요. 모의고사 전용 60문항은 별도로 구성했습니다.'}</p>
      ${review?'':aroGuide('pencil','한 문제씩, 내 답안을 써봐요.','연습할 영역과 유형을 골라보세요. 아는 내용을 먼저 쓰고 모범답안과 비교해 봐요.')}
      <div class="filters"><div class="field"><label for="search">문제 검색</label><input id="search" type="search" placeholder="예: 선금, 계약, Q001" value="${esc(ui.search)}" maxlength="100"></div>
      <div class="field"><label for="area-filter">출제영역</label><select id="area-filter" data-filter="area"><option value="all">전체 영역</option>${D.areas.map(a=>`<option value="${a.id}" ${ui.area==a.id?'selected':''}>${a.id}. ${a.name}</option>`).join('')}</select></div>
      <div class="field"><label for="type-filter">문제 유형</label><select id="type-filter" data-filter="type">${['all','단답형','서술형','계산형','사례형'].map(t=>`<option value="${t}" ${ui.type===t?'selected':''}>${t==='all'?'전체 유형':t}</option>`).join('')}</select></div>
      <div class="field"><label for="status-filter">학습 상태</label><select id="status-filter" data-filter="status">${[['all',review?'오답 + 북마크':'전체 상태'],['new','미채점'],['wrong','오답·부분점수'],['mastered','모든 요소 충족'],['bookmarked','북마크']].map(([v,t])=>`<option value="${v}" ${ui.status===v?'selected':''}>${t}</option>`).join('')}</select></div></div>
      <div class="section-head"><span class="muted">${list.length}문항</span><button class="small subtle" data-reset-filters>필터 초기화</button></div>
      <div class="question-list">${list.slice((ui.page-1)*15,ui.page*15).map(q=>`<article class="question-row"><span class="qid">${q.id}</span><div><div class="tags"><span class="badge">${q.type}</span><small>${area(q.area).name}</small>${isGraded(q)?`<span class="badge ${score(q)>=4.999?'green':''}">${fmt(score(q))} / 5점</span>`:''}</div><p><a href="#q/${q.id}">${esc(q.prompt)}</a></p></div><button class="small" data-bookmark="${q.id}" aria-label="${q.id} 북마크 ${state.bookmarks.includes(q.id)?'해제':'추가'}" aria-pressed="${state.bookmarks.includes(q.id)}">${state.bookmarks.includes(q.id)?'★':'☆'}</button></article>`).join('')||'<div class="empty"><h2>조건에 맞는 문제가 없습니다.</h2><p class="muted">필터를 바꾸거나 문제를 풀고 채점해 보세요.</p><button data-reset-filters>필터 초기화</button></div>'}</div>
      <div class="pagination"><button data-page="${ui.page-1}" ${ui.page<=1?'disabled':''}>이전</button><span>${ui.page} / ${pages}</span><button data-page="${ui.page+1}" ${ui.page>=pages?'disabled':''}>다음</button></div>`;
  }
  function sourceBlock(q) {
    const a=area(q.area);
    return `<div class="source"><p><strong>학습 참고 범위</strong></p><p>출제기준 ${a.criteria}쪽 · 영역 ${a.id}<br>표준교재 4권 ${esc(a.textbook.replaceAll('PDF ',''))}</p><p>${link(q.area===6?D.sources[3].url:D.sources[2].url,q.area===6?'ISO 공식 위험관리 자료':'국가법령정보센터에서 규정 확인')}<br>작성: ${D.builtOn}</p></div>`;
  }
  function solution(q, checks, context='practice', graded=false) {
    return `<section class="solution"><div class="section-head"><h2>모범답안과 채점요소</h2><span class="score">${graded?fmt(qScore(q,checks))+' / 5점':'미채점'}</span></div><p class="inline-note">공식 채점기준이 아닌 학습용 기준입니다. 표현이 달라도 의미를 충족하면 체크하세요. 각 요소는 동일 배점이며 합계 5점입니다.</p><div class="model-answer">${esc(q.answer)}</div><div class="rubric">${q.rubric.map((r,i)=>`<label><input type="checkbox" data-rubric="${i}" data-qid="${q.id}" data-context="${context}" ${checks?.includes(i)?'checked':''}><span>${esc(r)}</span><em>${fmt(5/q.rubric.length)}점</em></label>`).join('')}</div><div class="actions"><button class="primary" data-grade="${q.id}" data-context="${context}">채점 저장</button><span class="inline-note">미충족이면 체크 없이 저장해도 됩니다.</span></div><h3 style="margin-top:24px">해설</h3><p>${esc(q.explanation)}</p>${sourceBlock(q)}</section>`;
  }
  function voiceControls() {
    return `<div class="voice-panel"><button class="voice-start" data-voice-toggle aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2 M12 19v3 M8 22h8"/></svg><span>음성으로 답하기</span></button><p class="voice-status" role="status" aria-live="polite">버튼을 누르고 말씀하세요. 기존 답안 뒤에 이어 적습니다.</p><p class="voice-interim" aria-live="polite"></p><details class="voice-help"><summary>음성 입력 안내</summary><p>마이크 권한을 허용해 주세요. 브라우저의 음성 인식 서비스가 사용되며 음성이 해당 서비스로 전송될 수 있습니다. 이 사이트는 녹음 파일을 저장하지 않고 인식된 글만 답안으로 저장합니다.</p><p>지원하지 않는 브라우저에서는 휴대폰 키보드의 마이크를 이용할 수 있습니다. 숫자와 전문용어는 인식 후 확인해 주세요.</p></details></div>`;
  }
  function sideTheory(q) { return `<aside class="panel side-note"><h3>${area(q.area).name} · 답안 메모</h3><p>${esc(area(q.area).theory[0][1])}</p><details><summary>작성 순서 확인</summary><p>사실과 조건을 확인하고, 적용 요건을 검토한 뒤 판단·계산 결과와 필요한 조치를 적으세요.</p><p>계산에서는 산식 → 대입 → 단위 → 결과의 순서를 사용하세요.</p></details><p style="margin-top:20px"><a href="#theory/${q.area}">이 영역의 핵심이론 보기</a></p></aside>`; }
  function question(id) {
    const q=BY_ID.get(id); if(!q||q.mock) return notFound();
    let list=filtered(ui.review); if(!list.includes(q)) list=D.questions;
    const index=list.indexOf(q), revealed=state.revealed[id];
    return `${aroGuide('writing','내 말로 답안을 완성해 봐요.','핵심 용어부터 적어보세요. 작성한 뒤 모범답안과 비교하면 더 또렷해져요.')}<div class="question-top"><a class="back-link" href="#practice">문제 목록</a><div class="actions"><button class="small" data-bookmark="${id}" aria-pressed="${state.bookmarks.includes(id)}">${state.bookmarks.includes(id)?'★ 북마크됨':'☆ 북마크'}</button><button class="small" data-print-q="${id}">문제 인쇄</button></div></div><div class="question-layout"><article class="question-paper"><div class="tags"><span class="qid">${id}</span><span class="badge">${q.type}</span><span class="muted">${area(q.area).name}</span></div><h1 class="question-text">${esc(q.prompt)}</h1>${voiceControls()}<label class="answer-label" for="answer">내 답안 <span class="saved" id="save-status">${storageAvailable?'입력 즉시 이 기기에 저장':'저장 불가 · 백업 필요'}</span></label><textarea id="answer" maxlength="20000" data-answer="${id}" placeholder="위의 음성 버튼으로 답하거나, 여기에 직접 입력하세요.">${esc(state.answers[id]||'')}</textarea><div class="answer-actions"><button class="primary" data-reveal="${id}">${revealed?'답안 다시 비교':'답안 확인·채점'}</button><button data-retry="${id}">새 답안으로 재도전</button></div><p class="inline-note">단답·단일 수치 답안은 등록된 표현과 정확히 일치할 때만 채점요소를 자동 선택합니다. 다른 표현과 부분점수는 직접 확인하세요.</p>${revealed?solution(q,state.checks[id],'practice',isGraded(q)):''}<div class="section-head"><button data-go="q/${list[index-1]?.id||id}" ${index===0?'disabled':''}>이전 문제</button><span class="muted">${index+1} / ${list.length}</span><button data-go="q/${list[index+1]?.id||id}" ${index===list.length-1?'disabled':''}>다음 문제</button></div></article>${sideTheory(q)}</div>`;
  }
  function theoryLesson(lesson, index, a) {
    const highlight=text=>emphasizeTheory(text,lesson.keywords);
    return `<section class="theory-lesson" id="${lesson.id}" aria-labelledby="${lesson.id}-heading"><div class="lesson-heading"><span class="lesson-number">${String(index+1).padStart(2,'0')}</span><h3 id="${lesson.id}-heading" tabindex="-1" data-theory-read>${esc(lesson.title)}</h3></div>${lesson.paragraphs.map(text=>`<p data-theory-read>${highlight(text)}</p>`).join('')}<div class="lesson-example"><h4 data-theory-read>적용 예시</h4><p data-theory-read>${highlight(lesson.example)}</p></div><div class="lesson-answer"><h4 data-theory-read>답안에 쓸 핵심</h4><p data-theory-read>${highlight(lesson.answer)}</p></div><div class="lesson-pitfall"><h4 data-theory-read>혼동 주의</h4><p data-theory-read>${highlight(lesson.pitfall)}</p></div>${lesson.references.length?`<p class="lesson-reference">근거 확인 · ${lesson.references.map(ref=>link(ref.url,ref.title)).join(' · ')}</p>`:''}<button class="lesson-listen" data-theory-lesson="${lesson.id}">이 주제 듣기</button><button class="lesson-back" data-theory-jump="theory-contents">학습 목차로</button></section>`;
  }
  function theory(id=1) {
    const a=area(id)||D.areas[0];
    return `<h1>핵심이론</h1><p class="muted">8개 영역의 개념·절차·계산을 익히고, 적용 예시와 답안 핵심으로 정리하세요.</p>${aroGuide('reading','오늘의 개념, 함께 읽어볼까요?','핵심 용어를 읽고 적용 예시를 살펴보세요. 이론 듣기로도 학습할 수 있어요.')}<div class="theory-select field"><label for="theory-select">학습할 영역</label><select id="theory-select">${D.areas.map(x=>`<option value="${x.id}" ${a.id===x.id?'selected':''}>${x.id}. ${x.name}</option>`).join('')}</select></div><div class="theory-layout"><nav class="theory-nav" aria-label="핵심이론 영역">${D.areas.map(x=>`<button class="${a.id===x.id?'active':''}" data-go="theory/${x.id}">${x.id}. ${x.name}</button>`).join('')}</nav><article class="panel theory-body"><span class="badge">영역 ${a.id}</span><h2 style="margin-top:12px" data-theory-read>${a.name}</h2><section class="theory-audio" data-theory-area="${a.id}" aria-label="핵심이론 음성 듣기"><div class="theory-audio-actions"><button class="primary" data-theory-play>이론 듣기</button><button data-theory-pause disabled>일시정지</button><button data-theory-stop disabled>정지</button><label class="theory-voice-choice" for="theory-voice">목소리 <select id="theory-voice"><option value="natural">자연스러운 AI 음성</option><option value="device">기기 기본 음성</option></select></label><label for="theory-rate">읽기 속도 <select id="theory-rate"><option value="0.8">천천히 (0.8배)</option><option value="1" selected>보통 (1배)</option><option value="1.2">빠르게 (1.2배)</option></select></label></div><p class="theory-audio-status" role="status">사람처럼 자연스럽게 읽는 AI 음성입니다.</p></section><div class="theory-toc" id="theory-contents"><h3>이 영역의 학습 목차 <span>${a.lessons.length}개 주제</span></h3><ol>${a.lessons.map((lesson,i)=>`<li><button data-theory-jump="${lesson.id}">${i+1}. ${esc(lesson.title)}</button></li>`).join('')}</ol></div>${a.lessons.map((lesson,i)=>theoryLesson(lesson,i,a)).join('')}<button data-go="blanks/${a.id}/1">이 영역 빈칸 8문항 풀기</button><button class="primary" data-area-start="${a.id}">이 영역 실전 ${a.count}문항 풀기</button>${sourceBlock(D.questions.find(q=>q.area===a.id))}</article></div>`;
  }
  function examTotal(e,m) { return m.ids.reduce((sum,id)=>sum+qScore(BY_ID.get(id),e?.checks[id]),0); }
  function mocks() {
    return `<h1>150분 실전 연습</h1><p class="muted">단원 학습과 별도로 작성한 60문항입니다. 회당 20문항, 문항당 5점, 총 100점으로 구성했습니다.</p><p class="inline-note">20문항·배점·영역 배분은 자체 훈련용 구성입니다. 공식 시험의 문항 수나 배점으로 확정된 정보가 아닙니다.</p>${aroGuide('idea','차분하게, 실전처럼 준비해요.','시작 전 150분의 학습 시간을 확보하세요. 제출 후에는 답안을 함께 돌아봐요.')}<div class="mock-list">${D.mocks.map(m=>{
      const e=state.exams[m.id],graded=e?Object.keys(e.checks).length:0;
      return `<article class="panel mock-card"><div><div class="tags"><span class="badge">150분</span><span class="badge">20문항 · 100점</span>${e?`<span class="badge ${e.submittedAt?'green':'draft'}">${e.submittedAt?'제출 완료':'응시 중'}</span>`:''}</div><h2 style="margin-top:12px">${m.title}</h2><p>${m.subtitle}</p><small>8개 영역 포함 · 학습문항과 별도 · ${e?.submittedAt?`채점 ${graded}/20 · 현재 ${fmt(examTotal(e,m))}점`:'제출 전 해설 숨김 · 새로고침 후 이어풀기'}</small></div><div class="actions"><button class="primary" ${e?`data-go="exam/${m.id}"`:`data-start="${m.id}"`}>${!e?'응시 시작':e.submittedAt?'결과·자기채점':'이어서 응시'}</button>${e?.submittedAt?`<button data-start="${m.id}">다시 응시</button>`:''}<button data-print-mock="${m.id}">문제지 인쇄</button>${e?.submittedAt?`<button data-print-solutions="${m.id}">해설지 인쇄</button>`:''}</div></article>`;
    }).join('')}</div><p class="footer-note">타이머는 시작 시각 기준으로 계속 흐릅니다. 탭을 닫아도 정지하지 않습니다. 제한시간이 지나면 저장된 답안을 제출 처리합니다. 다시 응시하면 해당 회차의 기존 답안과 점수가 교체됩니다.</p>`;
  }
  function exam(id) {
    const m=examInfo(id),e=state.exams[id]; if(!m) return notFound(); if(!e) return mocks();
    const q=BY_ID.get(m.ids[e.index]), submitted=!!e.submittedAt, answered=m.ids.filter(qid=>e.answers[qid]?.trim()).length, graded=Object.keys(e.checks).length;
    return `<div class="exam-header"><h1>${m.title}</h1><span ${submitted?'class="badge green"':'class="timer" id="timer" aria-label="남은 시간"'}>${submitted?'제출 완료':timeLeft(e)}</span></div>
      ${submitted?`<div class="notice">${graded===20?'자기채점 완료':'아직 자기채점 중'} · ${graded}/20문항 채점 · 현재 합계 <strong id="exam-total">${fmt(examTotal(e,m))} / 100점</strong>. 공식 성적·합격 판정이 아닙니다.</div>`:'<p class="inline-note">답안은 자동 저장됩니다. 제출하면 수정할 수 없고 해설·자기채점이 열립니다. 학습 모드와 기록이 분리되어 있습니다.</p>'}
      <div class="question-layout"><article class="question-paper"><div class="tags"><span class="badge">${e.index+1} / 20</span><span class="badge">${q.type}</span><span class="muted">${area(q.area).name} · 5점</span></div><h2 class="question-text">${esc(q.prompt)}</h2>${submitted?'':voiceControls()}<label class="answer-label" for="exam-answer">내 답안 <span class="saved" id="save-status">${submitted?'제출된 답안':storageAvailable?'입력 즉시 저장':'저장 불가 · 백업 필요'}</span></label><textarea id="exam-answer" data-exam-answer="${q.id}" data-exam="${id}" maxlength="20000" ${submitted?'readonly':''} placeholder="답안을 작성하세요.">${esc(e.answers[q.id]||'')}</textarea>${submitted?solution(q,e.checks[q.id],'exam-'+id,own(e.checks,q.id)):''}<div class="section-head"><button data-exam-index="${e.index-1}" data-exam="${id}" ${e.index===0?'disabled':''}>이전</button><span class="muted">${answered}문항 답안 작성</span><button data-exam-index="${e.index+1}" data-exam="${id}" ${e.index===19?'disabled':''}>다음</button></div></article>
      <aside class="panel side-note exam-side">${aroGuide(submitted?'cheer':'idea',submitted?'끝까지 수고했어요.':'한 문제씩 차분하게.',submitted?'채점요소를 확인하며 복습해 보세요.':'문제의 조건과 단위를 확인하세요.')}<h3>${submitted?'문항별 자기채점':'문항 바로가기'}</h3><div class="exam-grid">${m.ids.map((qid,i)=>`<button data-exam-index="${i}" data-exam="${id}" class="${i===e.index?'current ':''}${submitted?own(e.checks,qid)?'answered':'':e.answers[qid]?.trim()?'answered':''}" aria-label="${i+1}번 ${submitted?own(e.checks,qid)?'채점 완료':'미채점':e.answers[qid]?.trim()?'답안 작성됨':'미작성'}" ${i===e.index?'aria-current="step"':''}>${i+1}</button>`).join('')}</div><p class="inline-note" style="margin-top:12px">초록색: ${submitted?'채점 완료':'답안 작성됨'}</p>${submitted?`<p class="score">${fmt(examTotal(e,m))} / 100점</p><button class="full-width" data-go="results/${id}">전체 결과 보기</button><button class="full-width" style="margin-top:10px" data-print-solutions="${id}">해설지 인쇄</button>`:`<button class="primary full-width" data-submit="${id}">시험 제출</button>`}<p style="margin-top:15px"><a href="#mocks">모의고사 목록</a></p></aside></div>`;
  }
  function results(id) {
    const m=examInfo(id),e=state.exams[id]; if(!m||!e?.submittedAt)return mocks();
    const count=Object.keys(e.checks).length;
    return `<h1>${m.title} 결과</h1><div class="aro-completion"><img src="./assets/aro-cheer-department.png" alt="" width="80" height="88"><div><strong>한 번의 연습, 한 걸음의 성장.</strong><p>아로와 함께 작성한 답안을 돌아보세요.</p></div></div><p class="muted">${count}/20문항 자기채점 · 미채점 문항은 현재 합계에 0점으로 표시됩니다.</p><div class="stats"><div class="stat"><strong>${fmt(examTotal(e,m))}<small> / 100</small></strong><span>${count===20?'자기채점 총점':'채점 중 합계'}</span></div><div class="stat"><strong>${m.ids.filter(qid=>e.answers[qid]?.trim()).length}</strong><span>작성한 답안</span></div><div class="stat"><strong>${count}</strong><span>채점 완료</span></div><div class="stat"><strong>${m.ids.filter(qid=>own(e.checks,qid)&&qScore(BY_ID.get(qid),e.checks[qid])<4.999).length}</strong><span>보완할 문제</span></div></div><div class="result-list">${m.ids.map((qid,i)=>{const q=BY_ID.get(qid);return `<div class="result-row"><span>${i+1}번</span><div><p>${esc(q.prompt)}</p><small>${area(q.area).name} · ${own(e.checks,qid)?fmt(qScore(q,e.checks[qid]))+' / 5점':'미채점'}</small></div><button class="small" data-review-exam="${i}" data-exam="${id}">검토</button></div>`;}).join('')}</div><div class="actions" style="margin-top:22px"><button data-go="mocks">목록으로</button><button data-print-solutions="${id}">해설지 인쇄</button></div><p class="footer-note">이 점수는 자체 제작 문항의 자기채점 결과이며 실제 시험 점수를 예측하거나 합격을 보장하지 않습니다.</p>`;
  }
  function settings() {
    return `<h1>내 기록과 학습 자료</h1><p class="muted">브라우저를 바꾸거나 기록을 지우기 전에 백업하세요.</p><div class="settings-grid"><section class="panel"><h2>학습기록 백업</h2><p>빈칸 답안·실전 답안·채점·북마크·모의고사를 파일로 저장합니다. 다른 기기에서는 이 파일을 가져오세요. 자동 기기 동기화는 제공하지 않습니다.</p><button class="primary" data-export>기록 내보내기</button><label for="import" style="display:block;margin-top:20px">백업 파일 가져오기</label><input id="import" type="file" accept="application/json,.json"><p class="inline-note">가져오면 현재 기록을 교체합니다. 기존 기록을 먼저 내보내 두세요.</p>${!storageAvailable?'<button data-recover>저장 복구 시도</button>':''}</section><section class="panel"><h2>학습 안내</h2><p>빈칸 연습 64문항 + 실전 문제 240문항 + 별도 모의고사 60문항입니다. 3회 모의고사끼리도 질문 문구를 중복하지 않았습니다. 같은 개념의 응용·계산 변형은 포함합니다.</p><p>계산문제는 문제에 제시된 비율과 기한 등 조건을 적용하세요.</p><p class="inline-note">공식 출제기준 적용기간 2026.03.01~2028.12.31<br>시험의 법령 적용 기준일: 최종 공식 확인 필요</p></section></div>
      <section class="panel official-schedule" style="margin-top:22px"><h2>2026년 공공조달관리사 시험일정</h2><p>Q넷 수시검정 제1회 시행공고 기준</p><div class="schedule-table-wrap"><table class="schedule-table"><thead><tr><th scope="col">구분</th><th scope="col">원서접수</th><th scope="col">시험일</th><th scope="col">합격자 발표</th></tr></thead><tbody><tr><th scope="row">필기</th><td>9.14(월) ~ 9.17(목)</td><td>10.3(토)</td><td>10.12(월)</td></tr><tr><th scope="row">실기</th><td>10.12(월) ~ 10.15(목)</td><td>11.14(토)</td><td>12.18(금)</td></tr></tbody></table></div><p class="inline-note">접수: 첫날 10:00 ~ 마지막 날 18:00 · 합격자 발표: 09:00<br>시험 시작시간과 시험장은 원서접수 시 별도 공고됩니다.</p><p>${link(D.sources[0].url,'Q넷 시험공고 원문 보기')}</p></section>
      <section class="panel" style="margin-top:22px"><h2>자료와 근거</h2><p>표준교재 4권(417쪽)과 출제기준(18쪽)을 바탕으로 주제를 정리했습니다. 실기 출제기준 PDF는 Q넷 원본의 실기 부분(11~18쪽)을 발췌한 자료입니다. 표준교재는 이 사이트에서 배포하지 않습니다.</p><ul>${D.sources.map(s=>`<li>${link(s.url,s.title)}</li>`).join('')}</ul><p class="inline-note">출제기준 적용기간: 2026.03.01 ~ 2028.12.31 · ${link('https://www.q-net.or.kr/pageLink.do?link=cst/cstReport&jmCd=9777&mcrtrNo=1254','Q넷 출제기준 원본 보기')} · 확인일: 2026.10.09</p><p>오류를 발견하면 문제 번호와 수정 근거를 운영자에게 전달해 주세요. 문제 문구·배점은 공개 검수를 거쳐 수정될 수 있습니다.</p></section>
      <section class="panel" style="margin-top:22px"><h2>기록 초기화</h2><p>이 브라우저에 저장한 학습 답안, 점수, 북마크, 모의고사 기록을 모두 지웁니다.</p><button class="danger" data-reset>모든 학습기록 초기화</button></section>`;
  }
  function notFound(){return '<div class="empty"><h1>문제를 찾을 수 없습니다.</h1><a href="#practice">문제 목록으로 이동</a></div>';}
  function render() {
    const expired=expire(),[view,id]=route();
    let html,active=view;
    if(view==='home')html=home();
    else if(view==='practice'||view==='review')html=practice(view==='review');
    else if(view==='q'){html=question(id);active='practice';}
    else if(view==='blanks'){html=blanks(id);active='blanks';}
    else if(view==='theory')html=theory(id);
    else if(view==='mocks')html=mocks();
    else if(view==='exam'){html=exam(Number(id));active='mocks';}
    else if(view==='results'){html=results(Number(id));active='mocks';}
    else if(view==='settings')html=settings();
    else html=notFound();
    document.dispatchEvent(new Event('study:before-render'));
    $('#app').innerHTML=shell(html,active);
    updateExamCountdown();
    document.dispatchEvent(new Event('study:render'));
    document.title=(view==='q'&&BY_ID.has(id)?id+' · ':'')+'공공조달관리사 실기 시험대비';
    if(expired)toast('시간이 종료되어 저장된 답안을 제출했습니다.');
  }
  function timeLeft(e){const total=Math.max(0,Math.ceil((e.deadline-Date.now())/1000));return `${Math.floor(total/3600).toString().padStart(2,'0')}:${Math.floor(total%3600/60).toString().padStart(2,'0')}:${(total%60).toString().padStart(2,'0')}`;}
  function startExam(id) {
    const m=examInfo(id); if(!m)return;
    const running=runningExam();
    if(running){toast(`${running.id}회 시험이 진행 중입니다. 먼저 제출하거나 이어서 풀어 주세요.`);go('exam/'+running.id);return;}
    if(!confirm(state.exams[id]?`${id}회 기존 답안·점수를 지우고 다시 시작할까요? 필요하면 먼저 기록을 내보내세요.`:`${m.title}를 시작할까요? 150분 타이머는 창을 닫아도 계속 흐릅니다.`))return;
    const now=Date.now(); state.exams[id]={startedAt:now,deadline:now+m.minutes*60000,index:0,answers:{},checks:{},submittedAt:null};save();go('exam/'+id);
  }
  function printQuestions(questions,title,withSolutions=false,answers=null){
    $('#print-area').innerHTML=`<h1>${esc(title)}</h1><p>공공조달관리사 실기</p><p>${questions.length===20?'150분 / 20문항 / 100점 · 자체 훈련용 구성':''}</p>${questions.map((q,i)=>`<section class="print-q"><h2>${i+1}. ${esc(q.prompt)} (5점)</h2>${withSolutions?`<div class="print-solution"><strong>모범답안</strong><br>${esc(q.answer)}</div><p><strong>해설</strong> ${esc(q.explanation)}</p><p>채점요소 ${q.rubric.length}개 · 균등 배점 · 출제기준 ${area(q.area).criteria}쪽</p>${answers?`<p><strong>내 답안</strong> ${esc(answers[q.id]||'(미작성)')}</p>`:''}`:'<div class="writing-space"></div>'}</section>`).join('')}`;
    window.print();
  }
  document.addEventListener('click',event=>{
    const b=event.target.closest('button'); if(!b)return;
    const d=b.dataset;
    if(own(d,'go'))go(d.go);
    else if(own(d,'blankCheck')){
      if(!D.blanks.some(q=>q.id===d.blankCheck))return;
      state.blankChecked[d.blankCheck]=true;save();render();$('#blank-feedback')?.focus();
    }
    else if(own(d,'blankRetry')){
      delete state.blankAnswers[d.blankRetry];delete state.blankChecked[d.blankRetry];save();render();$('#blank-answer')?.focus();
    }
    else if(own(d,'areaStart')){ui.area=d.areaStart;ui.search='';ui.type='all';ui.status='all';ui.page=1;go('practice');}
    else if(own(d,'resetFilters')){Object.assign(ui,{search:'',area:'all',type:'all',status:'all',page:1});render();}
    else if(own(d,'page')){ui.page=Number(d.page);render();$('#main').focus();}
    else if(own(d,'bookmark')){const id=d.bookmark;state.bookmarks=state.bookmarks.includes(id)?state.bookmarks.filter(x=>x!==id):[...state.bookmarks,id];save();render();}
    else if(own(d,'reveal')){
      const q=BY_ID.get(d.reveal);state.revealed[q.id]=true;
      if(!isGraded(q)&&q.rubric.length===1&&['단답형','계산형'].includes(q.type)&&[q.answer,...q.aliases].some(a=>norm(a)===norm(state.answers[q.id]||''))){state.checks[q.id]=[0];toast('등록 답안과 일치하여 채점요소를 선택했습니다.');}
      save();render();$('.solution')?.scrollIntoView({block:'start',behavior:'auto'});
    }
    else if(own(d,'retry')){if(!confirm('이 문제의 기존 답안과 채점 결과를 지우고 다시 풀까요?'))return;delete state.answers[d.retry];delete state.checks[d.retry];delete state.revealed[d.retry];save();render();$('#answer')?.focus();}
    else if(own(d,'grade')){
      const checks=[...document.querySelectorAll('input[data-rubric]:checked')].map(x=>Number(x.dataset.rubric));
      if(d.context.startsWith('exam-')){const e=state.exams[Number(d.context.slice(5))];if(!e?.submittedAt)return;e.checks[d.grade]=checks;}
      else state.checks[d.grade]=checks;
      const y=scrollY;save();render();window.scrollTo(0,y);toast('채점 결과를 저장했습니다.');
    }
    else if(own(d,'start'))startExam(Number(d.start));
    else if(own(d,'examIndex')||own(d,'reviewExam')){const e=state.exams[d.exam];if(!e)return;e.index=Math.max(0,Math.min(19,Number(d.examIndex??d.reviewExam)));save();if(own(d,'reviewExam'))go('exam/'+d.exam);else{render();$('#main').focus();}}
    else if(own(d,'submit')){const e=state.exams[d.submit],m=examInfo(d.submit);if(!e||e.submittedAt)return;const missing=m.ids.filter(id=>!e.answers[id]?.trim()).length;if(confirm(`${missing}문항이 미작성입니다. 제출 후 답안을 수정할 수 없습니다. 제출할까요?`)){e.submittedAt=Date.now();save();render();toast('제출했습니다. 채점요소를 보며 자기채점해 주세요.');}}
    else if(own(d,'printQ'))printQuestions([BY_ID.get(d.printQ)],'단원 연습 '+d.printQ);
    else if(own(d,'printMock')||own(d,'printSolutions')){const id=Number(d.printMock??d.printSolutions),m=examInfo(id);if(own(d,'printSolutions')&&!state.exams[id]?.submittedAt)return;printQuestions(m.ids.map(x=>BY_ID.get(x)),m.title+(own(d,'printSolutions')?' 해설지':' 문제지'),own(d,'printSolutions'),own(d,'printSolutions')?state.exams[id]?.answers:null);}
    else if(own(d,'export')){
      const blob=new Blob([JSON.stringify({app:'procurement-study',version:1,exportedAt:new Date().toISOString(),data:state},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='공공조달관리사 실기 시험대비-학습기록-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('학습기록 백업 파일을 저장합니다.');
    }
    else if(own(d,'recover')){if(!confirm('현재 화면의 기록으로 브라우저 저장을 복구할까요? 읽지 못한 기존 저장 데이터가 있으면 교체됩니다.'))return;storageAvailable=true;save();render();toast(storageAvailable?'저장 기능을 복구했습니다.':'브라우저 저장을 사용할 수 없습니다.');}
    else if(own(d,'reset')){if(confirm('빈칸 답안을 포함한 모든 학습 답안·점수·북마크·모의고사를 삭제할까요? 백업하지 않은 기록은 복구할 수 없습니다.')){state=empty();try{localStorage.removeItem(KEY);storageAvailable=true;}catch(error){storageAvailable=false;}save();render();toast('학습기록을 초기화했습니다.');}}
  });
  let searchTimeout;
  document.addEventListener('input',event=>{
    const el=event.target;
    if(el.id==='search'){ui.search=el.value;ui.page=1;clearTimeout(searchTimeout);searchTimeout=setTimeout(()=>{if(!['practice','review'].includes(route()[0]))return;const pos=el.selectionStart;render();$('#search').focus();try{$('#search').setSelectionRange(pos,pos);}catch(error){}},180);}
    else if(el.dataset.blankAnswer){
      state.blankAnswers[el.dataset.blankAnswer]=el.value;delete state.blankChecked[el.dataset.blankAnswer];
      const feedback=$('#blank-feedback');if(feedback){feedback.hidden=true;feedback.textContent='';}
      save();$('#save-status').textContent=storageAvailable?'저장됨':'기기 저장 불가 · 백업 필요';
    }
    else if(el.dataset.answer){
      state.answers[el.dataset.answer]=el.value;
      // A changed answer must never retain a score earned by the previous answer.
      delete state.checks[el.dataset.answer];
      document.querySelectorAll('input[data-rubric]').forEach(input=>{input.checked=false;});
      if($('.solution .score'))$('.solution .score').textContent='다시 채점 필요';
      save();$('#save-status').textContent=storageAvailable?'저장됨':'기기 저장 불가 · 백업 필요';
    }
    else if(el.dataset.examAnswer){if(expire()){render();toast('시험시간이 종료되었습니다.');return;}const e=state.exams[el.dataset.exam];if(e&&!e.submittedAt){e.answers[el.dataset.examAnswer]=el.value;save();$('#save-status').textContent=storageAvailable?'저장됨':'기기 저장 불가 · 백업 필요';const nav=document.querySelector(`.exam-grid [data-exam-index="${e.index}"]`);nav?.classList.toggle('answered',!!el.value.trim());}}
  });
  document.addEventListener('change',async event=>{
    const el=event.target;
    if(el.id==='theory-select'){go('theory/'+el.value);}
    else if(el.id==='blank-area'){go('blanks/'+el.value+'/1');}
    else if(el.dataset.filter){ui[el.dataset.filter]=el.value;ui.page=1;render();}
    else if(el.id==='import'&&el.files[0]){
      try{const file=el.files[0];if(file.size>5*1024*1024)throw new Error('5MB 이하의 백업 파일을 선택해 주세요.');const raw=JSON.parse(await file.text());if(raw.app!=='procurement-study'||raw.version!==1)throw new Error('공공조달관리사 실기 시험대비 백업 파일이 아닙니다.');const next=sanitize(raw.data);if(!confirm('현재 기록을 백업 파일의 기록으로 교체할까요? 진행 중 모의고사 기록도 교체됩니다.')){el.value='';return;}state=next;save();render();toast('기록을 가져왔습니다.');}catch(error){toast(error instanceof SyntaxError?'JSON 파일을 읽을 수 없습니다. 올바른 백업 파일을 선택해 주세요.':error.message);el.value='';}
    }
  });
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-theory-jump]');if(!button)return;
    const target=document.getElementById(button.dataset.theoryJump);if(!target)return;
    const focusTarget=target.querySelector('h3');if(focusTarget){focusTarget.tabIndex=-1;focusTarget.focus({preventScroll:true});}
    target.scrollIntoView({block:'start',behavior:'auto'});
  });
  window.addEventListener('hashchange' ,()=>{clearTimeout(searchTimeout);render();window.scrollTo(0,0);$('#main').focus({preventScroll:true});});
  window.addEventListener('storage',event=>{if(event.key===KEY){try{state=event.newValue?sanitize(JSON.parse(event.newValue)):empty();render();toast('다른 탭에서 변경된 학습기록을 반영했습니다.');}catch(error){toast('다른 탭의 기록을 읽지 못했습니다. 백업을 확인해 주세요.');}}});
  document.addEventListener('visibilitychange',updateExamCountdown);
  setInterval(()=>{updateExamCountdown();if(expire()){render();toast('150분이 종료되어 저장된 답안을 제출했습니다.');return;}const m=runningExam();if(m&&$('#timer')){$('#timer').textContent=timeLeft(state.exams[m.id]);$('#timer').classList.toggle('urgent',state.exams[m.id].deadline-Date.now()<300000);}},1000);
  render();
})();
