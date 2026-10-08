from pathlib import Path
r=Path(__file__).resolve().parents[1]
p=r/'app.js';s=p.read_text(encoding='utf-8')
s=s.replace("const ui = {search:","const ui = {review:false,search:")
s=s.replace("function practice(review=false) {", "function practice(review=false) {\n    ui.review=review;")
s=s.replace("filtered(route()[0]==='review')","filtered(ui.review)")
s=s.replace('첨부 출제기준 PDF ${a.criteria}쪽','출제기준 ${a.criteria}쪽')
s=s.replace('<br>학원 ${esc(a.academy)}','')
s=s.replace('표준교재 4권 ${esc(a.textbook)}','표준교재 4권 ${esc(a.textbook.replaceAll(\'PDF \',\'\'))}')
s=s.replace('출제기준 PDF ${area(q.area).criteria}쪽','출제기준 ${area(q.area).criteria}쪽')
s=s.replace('첨부된 표준교재 4권(417쪽), 출제기준(18쪽), 학원 자료 7개를 참고했습니다. 원본 PDF·강의자료는 이 사이트에 배포하지 않습니다. 핵심이론·1주차 자료의 중복을 고려해 주제를 정리했습니다.','표준교재 4권(417쪽)과 출제기준(18쪽)을 바탕으로 주제를 정리했습니다. 원본 자료는 이 사이트에서 배포하지 않습니다.')
s=s.replace('아는 내용을<br>답안으로 만드는 연습.','공공조달 관리실무<br>실기 답안 연습')
s=s.replace('8개 출제영역을 차근차근 풀고, 빠뜨린 채점요소를 확인하세요.<br>오늘의 한 문제부터 150분 실전 연습까지.','말하거나 쓰면서 답안을 정리하세요.<br>핵심이론부터 실전 모의고사까지 한곳에서 학습합니다.')
s=s.replace('class="brand" href="#home"><span class="brandmark" aria-hidden="true">조</span>조달연습실</a><p class="brand-sub">공공조달관리사 실기 답안훈련</p>', 'class="brand" href="#home" aria-label="공공조달 실기 홈"><img class="department-logo" src="./assets/department-logo.png" alt="남서울대학교 AI공공조달학과" width="290" height="138"></a><p class="brand-sub">공공조달관리사 · 실기 학습</p>')
old="${name}</a>`).join('')}</nav>"
new="${navIcon(key)}<span class=\"desktop-label\">${name}</span><span class=\"mobile-label\">${({home:'홈',practice:'문제',theory:'이론',mocks:'모의고사',review:'복습',settings:'설정'})[key]}</span></a>`).join('')}</nav>"
assert old in s;s=s.replace(old,new,1)
s=s.replace('<span>2026 실기 대비 ${draft}</span><span class="local-info">','<span class="top-title">공공조달 실기 <span class="edition">2026</span></span><div class="reading-controls" role="group" aria-label="글자 크기"><span>글자 크기</span><button data-font="18" aria-label="글자 크기 기본">가</button><button data-font="20" aria-label="글자 크기 크게">가+</button><button data-font="22" aria-label="글자 크기 아주 크게">가++</button></div><span class="local-info">')
s=s.replace("function shell(content, active) {",'''function navIcon(key) {
    const paths={home:'M3 10 12 3l9 7v10H3Z M9 20v-7h6v7',practice:'M5 3h14v18H5Z M8 8h8 M8 12h8 M8 16h5',theory:'M12 5C8 2 3 3 3 3v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2Z M12 5v16',mocks:'M12 8v5l3 2 M9 2h6 M12 2v3 M20 14a8 8 0 1 1-16 0 8 8 0 0 1 16 0',review:'M5 4h14v17l-7-4-7 4Z',settings:'M4 7h16 M4 17h16 M9 4v6 M15 14v6'};
    return `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[key]}"/></svg>`;
  }
  function shell(content, active) {''')
s=s.replace('<div class="theory-layout"><nav','<div class="theory-select field"><label for="theory-select">학습할 영역</label><select id="theory-select">${D.areas.map(x=>`<option value="${x.id}" ${a.id===x.id?\'selected\':\'\'}>${x.id}. ${x.name}</option>`).join(\'\')}</select></div><div class="theory-layout"><nav')
s=s.replace("if(el.dataset.filter){", "if(el.id==='theory-select'){go('theory/'+el.value);}\n    else if(el.dataset.filter){")
s=s.replace('<label class="answer-label" for="answer">', '${voiceControls()}<label class="answer-label" for="answer">')
s=s.replace('<label class="answer-label" for="exam-answer">','${submitted?\'\':voiceControls()}<label class="answer-label" for="exam-answer">')
s=s.replace('placeholder="핵심 내용과 판단 근거를 직접 써 보세요."','placeholder="위의 음성 버튼으로 답하거나, 여기에 직접 입력하세요."')
s=s.replace("function sideTheory(q)",'''function voiceControls() {
    return `<div class="voice-panel"><button class="voice-start" data-voice-toggle aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2 M12 19v3 M8 22h8"/></svg><span>음성으로 답하기</span></button><p class="voice-status" role="status" aria-live="polite">버튼을 누르고 말씀하세요. 기존 답안 뒤에 이어 적습니다.</p><p class="voice-interim" aria-live="polite"></p><details class="voice-help"><summary>음성 입력 안내</summary><p>마이크 권한을 허용해 주세요. 브라우저의 음성 인식 서비스가 사용되며 음성이 해당 서비스로 전송될 수 있습니다. 이 사이트는 녹음 파일을 저장하지 않고 인식된 글만 답안으로 저장합니다.</p><p>지원하지 않는 브라우저에서는 휴대폰 키보드의 마이크를 이용할 수 있습니다. 숫자와 전문용어는 인식 후 확인해 주세요.</p></details></div>`;
  }
  function sideTheory(q)''')
s=s.replace("$('#app').innerHTML=shell(html,active);","document.dispatchEvent(new Event('study:before-render'));\n    $('#app').innerHTML=shell(html,active);\n    document.dispatchEvent(new Event('study:render'));")
p.write_text(s,encoding='utf-8')
p=r/'scripts/build_data.py';s=p.read_text(encoding='utf-8').replace('독립된 장 없음. 학원 6주차와 공식 위험관리 자료로 보완','독립된 장 없음. 공식 위험관리 자료로 보완')
s=s.replace(',academy=ACADEMY[i]', '')
p.write_text(s,encoding='utf-8')
print('Applied app redesign')
