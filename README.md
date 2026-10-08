# 공공조달관리사 실기 시험대비

공공조달관리사 실기 대비 반응형 학습 사이트. 2026년 10월 8일 초안.

- 단원별 **240문항**: 24 / 24 / 36 / 48 / 36 / 24 / 24 / 24문항
- 학습문항과 별도로 작성한 **모의고사 3회, 각 20문항**
- **빈칸 연습 64문항**: 8개 영역별 8문항, 실전·모의고사와 합계 364문항
- 핵심이론 8개 영역·72개 상세 주제(설명·적용 예시·답안 핵심·혼동 주의), 영역별 목차·음성 듣기·중요어 강조
- 문항별 모범답안·해설·채점요소·학습 참고 범위
- 답안 자동 저장, 제한적인 정확 일치 채점, 채점요소별 자기채점
- 검색·영역/유형/학습상태 필터, 오답·북마크
- 모의고사 150분, 새로고침 후 복원, 종료 시 제출, 제출 후 답안 잠금
- 문제지·해설지 인쇄, 학습기록 JSON 내보내기·가져오기

## 초안의 범위

전체 문항이 작성되어 있으나 **문항별 법령·전문가 검수 전**입니다. 공식 기출이나 공식 채점기준이 아닙니다. 모의고사의 20문항·100점·영역 비중은 자체 훈련용 구성입니다. 공식 출제 비중이나 적중률을 주장하지 않습니다.

계산문제의 비율·기한·산식은 문제에 제시한 가정입니다. 실제 계약의 보증률, 지체상금률, 금액 기준 등으로 일반화하지 마세요. 시험의 법령 적용 기준일은 최종 공식 확인이 필요합니다. 채점은 각 문항 5점, 요소별 균등 배점이며 화면 표시만 소수 첫째 자리로 반올림합니다. 모의고사 합계는 반올림 전 점수로 계산합니다.

참고 페이지는 출제기준과 학습 주제의 연결 범위입니다. 해당 페이지가 모든 자체 답안을 직접 입증한다는 의미가 아닙니다. 원본 PDF와 강의자료는 배포물에 넣지 않았습니다. 일부 개념은 반복 학습을 위한 사례·수치 변형이 있으며 300문항의 질문 문구는 각각 다릅니다.

## 실행

별도 앱 빌드나 API 키가 필요하지 않습니다. `index.html`을 열거나 프로젝트 폴더에서 다음을 실행하세요.

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

브라우저에서 `http://127.0.0.1:4173/`을 엽니다. 파일 직접 열기는 브라우저에 따라 저장 동작이 다를 수 있어 로컬 서버 사용을 권장합니다. Pretendard 폰트는 로컬 파일로 제공합니다. 분석 도구는 없습니다. 음성 입력 사용 시 브라우저의 음성 인식 서비스에 연결될 수 있습니다.

## GitHub Pages에 올리기

목표 주소: https://lassenai.github.io/procurement/

### 간단한 업로드

저장소 루트에 `index.html`, `styles.css`, `modern.css`, `app.js`, `voice.js`, `data.js`, `.nojekyll`과 `assets/` 폴더을 올리세요. Settings → Pages → Deploy from a branch → `main`, `/ (root)`를 선택합니다. 파일은 모두 상대경로를 사용하고 화면 이동은 해시 경로이므로 `/procurement/` 하위에서도 작동합니다.

### 소스 전체와 자동 배포

이 프로젝트의 소스를 `lassenai/procurement` 저장소에 올리고 Settings → Pages의 Source를 **GitHub Actions**로 선택합니다. 포함된 `.github/workflows/pages.yml`은 `main`에 변경을 올릴 때 문항 데이터를 생성·구조 검사한 후 공개 웹 파일과 assets 폴더만 배포합니다. 배포 방식은 위 두 방법 중 하나를 선택하세요.

`.research/`, `.qa/`, 개인 학습기록 백업, 원본 PDF는 저장소에 올리지 마세요. `.gitignore`에 연구·테스트 산출물 제외 규칙이 있습니다. 운영 배포는 GitHub Actions 방식으로 관리합니다.

## 문항 수정

- `content/questions.txt`: 단원별 문항 원고. `# 1`~`# 8` 아래 `유형|질문|답안|해설` 형식
- `content/mocks.txt`: 모의고사 원고. `# 1`~`# 3` 아래 `영역번호|유형|질문|답안|해설` 형식
- 답안의 `;`는 개별 채점요소를 구분합니다. 질문·해설에는 `|`를 사용하지 마세요.
- `content/theory.txt`: 상세 이론 원고. `# 영역번호` 아래 `제목|본문|예시|답안핵심|혼동주의|중요어` 형식. 본문 문단은 `¶`, 중요어는 `;`로 구분합니다.
- `scripts/build_data.py`: 영역 정보, 이론 원고 파싱, 공개 근거 링크, 명시적 허용답안 및 데이터 생성
- `data.js`: 브라우저에서 읽는 생성 결과. 직접 수정하지 마세요.

```powershell
python scripts/build_data.py
python tests/check_content.py
```

문항 ID는 원고 순서에 따라 만들어집니다. 공개 후 기존 문항을 재정렬하면 저장된 답안이 다른 문제에 연결될 수 있으므로 순서를 유지하고, 구조를 크게 바꿀 때는 저장 버전과 이전 절차도 변경해야 합니다.

## 테스트

정적 콘텐츠 검사: `python tests/check_content.py`

브라우저 검사: 개발용으로 `npm install`, `npx playwright install chromium`을 실행하고 로컬 서버를 시작한 뒤 `npm run test:e2e`를 실행합니다. `BASE_URL`로 테스트 주소를 바꿀 수 있습니다. 이미 설치된 Edge를 이용하려면 `PW_CHANNEL=msedge`를 설정하세요. 앱 실행에는 npm 설치가 필요하지 않습니다.

테스트는 **독립 브라우저 컨텍스트**를 사용해 실제 사용자의 학습기록을 건드리지 않습니다. QA 캡처는 `.qa/`에 저장합니다. 테스트 결과는 법령 정확성이나 공식 출제 적합성 검증을 대신하지 않습니다.

## 기록과 제한

학습기록은 이 사이트 주소의 브라우저 localStorage에만 저장됩니다. PC·휴대폰 간 자동 동기화는 없습니다. 사이트 주소나 브라우저를 바꾸기 전에 JSON으로 내보내세요. 가져오기는 기존 기록 전체를 교체합니다. 새로 응시하면 해당 회차의 이전 답안·점수가 교체됩니다.

모의고사는 기기의 시작시각으로 종료를 계산하므로 브라우저를 닫아도 시간이 흐릅니다. 기기 시계를 조작하는 것까지 막는 감독 시험 시스템은 아닙니다. 정적 사이트이므로 소스에 정답이 포함되어 있으며 유료 문제 보호나 보안 시험용으로 설계하지 않았습니다.

## 다음 검수

1. 공식 시험 법령 적용 기준일 확인
2. 수치·기한·기관별 차이와 예외를 조문 단위로 대조
3. 서술형 허용 표현 및 배점의 전문가 검토
4. 원가계산·실제 데이터표 해석 등 심화문항 비중 보강
5. 수험생 시범 사용 후 난이도와 150분 분량 조정


## 모바일·음성 UI 개편

- moa-voice-app의 현재 Theme.kt와 같은 Pretendard Regular/Medium/SemiBold를 포함했습니다. OFL 라이선스는 assets/fonts/에 있습니다.
- 휴대폰 하단 고정 탐색, 이론 영역 선택 메뉴, 큰 입력 버튼, 18/20/22px 글자 크기를 제공합니다. 크기 선택은 이 브라우저에 저장됩니다.
- 학원 자료 표시는 공개 UI와 배포 데이터에서 제외했습니다. 참고 문구는 “출제기준 …쪽”, “표준교재 4권 …쪽”으로 정리했습니다.
- 한국어 SpeechRecognition/webkitSpeechRecognition을 이용합니다. 마이크 권한과 브라우저 지원, 서비스 연결이 필요합니다. 지원되지 않으면 키보드 음성 입력을 안내합니다.
- 확정된 음성만 기존 답안 뒤에 추가하고 자동 저장합니다. 인식 중 문장은 별도로 표시합니다. 화면 이동, 제출, 탭 숨김 시 마이크를 중지합니다.
- 녹음 파일은 사이트가 저장하지 않습니다. 브라우저 음성 서비스가 원격으로 오디오를 처리할 수 있으므로 앱 내 음성 안내에서 이를 알립니다.
- 인식 결과는 자동 제출하지 않습니다. 숫자와 전문용어를 확인한 뒤 답안 비교·채점을 선택하세요.
- 음성 이벤트·오류·종료·화면 이동은 가상 인식기로 테스트했습니다. 실제 마이크의 인식 정확도와 휴대폰별 동작은 실기기 확인이 필요합니다.
- 공식 브라우저 문서: https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition

추가 기능 테스트: `node tests/voice.cjs`. 테스트는 가상 인식 이벤트를 사용하므로 음성 서비스의 실제 인식률을 검증하지 않습니다.

로고는 제공 이미지에서 built-in image_gen으로 고해상도 복원했습니다. 저장 위치는 `assets/department-logo.png`이며, 원본과 완전히 동일한 공식 벡터 파일을 의미하지는 않습니다. 로고 문구·색상·형상을 원본과 시각 대조했습니다.

이미지 복원 프롬프트: “Faithful high resolution restoration of the attached existing Korean university department logo. Preserve exactly the geometric interlocking blue teal mint symbol on the left, the two lines of Korean lettering on the right, their proportions, positions and original colors. Text exactly '남서울대학교' on first line and 'AI공공조달학과' on second line. Plain pure white background. Reconstruct crisp smooth clean edges and legible typography from the small reference, no redesign, no new decoration, no extra text. Wide horizontal logo, tightly framed with only a small uniform white margin. Output a high resolution faithful reproduction, around 1500 px wide.”


로고 배경 수정: built-in image_gen으로 실제 알파 투명 배경을 적용했습니다. 최종 파일은 assets/department-logo.png (1815×866 RGBA)입니다. 수정 프롬프트: “Background extraction only. Remove the white background from this exact existing logo and replace it with actual transparent alpha, including the white negative spaces within the symbol and letters. Preserve precisely the navy blue, teal and mint symbol, all Korean lettering, exact shape, layout, proportions, original canvas framing and high resolution. No redesign, no new text, no changed colors, no shadow, no outlines, no white halo, no checkerboard baked into pixels. Output RGBA PNG with true transparent background.”


## 상세 핵심이론 보강 (2026-10-08)

기존 32개 짧은 이론을 72개 상세 주제로 교체했습니다. 영역별 주제 수는 8 / 10 / 10 / 12 / 10 / 8 / 7 / 7입니다. 업로드 자료의 문제·빈칸·OX·계산에서 다루는 개념을 추출해 표준교재와 출제기준의 영역에 맞춰 설명과 예시를 새로 작성했습니다. 원문 문제나 해설의 일괄 전재가 아닙니다.

공개 화면에는 표준교재·출제기준 범위와 확인한 공식 법령·ISO 링크만 표시합니다. 법령의 일반원칙과 특례를 구분하며 현재 확인한 조문과 실제 시험 적용 기준일을 동일시하지 않습니다. 특히 제조원가의 이윤과 매출총이익, 품목조정률 산정대상의 범위, 보증금 상계 예외를 구별했습니다. 기존 300문항과 저장키·ID는 유지합니다.

`node tests/theory.cjs`는 72개 주제의 표시, 강조 후 원문 보존, 목차 이동, 세 글자 크기·세 화면 폭과 음성 재생 제어를 검사합니다. 음성 검사는 브라우저 음성합성 API 모의 객체를 사용하며 실제 기기의 발음·음질·장시간 재생을 보장하는 검사는 아닙니다.


## 자연스러운 AI 음성 (2026-10-08)

기본 이론 듣기는 Microsoft 한국어 SunHiNeural로 미리 생성한 72개 MP3(약 90분)를 재생합니다. 실제 사람의 녹음이 아닌 합성 음성이며 화면에 AI 음성임을 표시합니다. 각 주제 듣기·정지, 영역 연속 재생, 일시정지·이어듣기, 0.8/1/1.2배속을 지원합니다. 선택 가능한 기기 기본 음성은 기존 Web Speech 방식을 유지합니다.

`assets/audio/`와 그 안의 `manifest.json`을 함께 배포해야 합니다. 방문자의 답안이나 마이크 내용을 음원 생성에 사용하지 않습니다. 정적 MP3는 사이트에서 내려받아 재생하며 런타임 API 키·서버가 필요하지 않습니다. 재생 실패 시 메시지를 보여주고 기기 음성은 사용자가 직접 선택합니다.

제작에는 [edge-tts](https://github.com/rany2/edge-tts)와 Microsoft의 온라인 음성 서비스를 사용했습니다. 지원 음성은 [Microsoft 문서](https://learn.microsoft.com/ko-kr/azure/ai-services/speech-service/language-support)를 참고하세요. 생성 서비스의 장기 가용성은 별개이며 이미 만든 파일은 정적으로 재생됩니다.

이론을 수정했다면 `edge-tts`를 별도 개발 환경에 설치하고 `python scripts/build_data.py`, `python scripts/generate_theory_audio.py`, `python scripts/build_data.py` 순으로 실행합니다. 생성 단계에서는 작성된 이론 원고만 외부 음성 서비스로 전송합니다. 본문·목소리 지문이 일치하는 음원만 데이터에 연결하므로 바뀐 이론에 예전 낭독이 자동 연결되지 않습니다. 생성 중간 실패는 재실행하면 이어서 처리합니다. 원고가 바뀌어 새 음원이 필요하면 해당 영역의 AI 재생을 비활성화하며 기기 음성은 계속 사용할 수 있습니다.

`node tests/natural-audio.cjs`로 실제 MP3 재생, 72개 파일의 미디어 해석, 제어·오류·영역 이동 중지를 검사합니다.

## 모바일 브라우저 검증 (2026-10-08)

### 빈칸 연습과 실전 문제

기존 문제 연습 240문항의 화면 이름을 ‘실전 문제’로 변경했습니다. 기존 문제 ID와 학습기록은 유지합니다. `content/blanks.txt`에 8개 영역별 8문항, 총 64개의 빈칸 연습을 별도로 작성했습니다. 핵심이론의 개념을 복습하는 문제이며 실제 시험의 빈칸형 출제를 확정한다는 뜻은 아닙니다. 각 행에는 관련 이론 ID, 빈칸 문장, 인정 답안, 해설을 저장합니다.

홈·실전 문제 상단·영역별 핵심이론에서 빈칸 연습으로 이동합니다. 빈칸 답안과 정답 확인 상태도 기존 저장키의 별도 필드에 자동 저장하며 백업·복원에 포함합니다. 이전 백업은 빈칸 기록이 없어도 가져올 수 있습니다. 음성 입력과 글자 크기 조절을 지원합니다. `npm run test:blanks`로 Chromium/WebKit에서 64문항의 답안 비교·수정·재도전·저장, 음성 입력 모의 객체, 모바일 크기와 백업 호환성을 확인합니다.

`npm run test:mobile`은 Playwright Chromium의 Pixel 7 모사 환경과 WebKit의 iPhone 13 / iPhone SE 모사 환경을 사용합니다. 실행 전에 `npx playwright install chromium webkit`으로 테스트 엔진을 설치합니다. 각 환경에서 주요 7개 화면 × 글자 크기 3단계 × 세로/가로 방향(42가지)의 가로 넘침, 하단 메뉴 터치 이동, 답안 저장·새로고침·채점, 모의고사 제출, 이론 목차와 실제 MP3 재생·일시정지·이어듣기를 확인합니다. `.qa/mobile/`에 화면과 결과를 저장합니다. 음성 선택창은 최소 16px로 표시합니다.

이는 Windows에서 실행한 브라우저 엔진 및 모바일 화면 모사 검사입니다. 실제 Android Chrome이나 iOS Safari 앱을 직접 실행한 검사가 아니므로 OS 키보드, 마이크 권한·음성인식, 노치·홈 표시줄, 잠금/백그라운드 음성 재생은 실제 기기에서 별도 확인해야 합니다.
