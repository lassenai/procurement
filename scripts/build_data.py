"""Build the reviewed-by-editor draft bank; stdlib only, UTF-8 sources."""
from pathlib import Path
import json
import re
from generate_theory_audio import fingerprint

ROOT = Path(__file__).resolve().parents[1]
AREA_NAMES = ['입찰 참가 준비','입찰계획 수립','입찰실행 관리','계약일반관리','유형별 계약관리','리스크 관리','법제도 활용','전자조달·데이터']
COUNTS = [24,24,36,48,36,24,24,24]
CRITERIA = ['11~12','12~13','13~14','14~15','15~16','16~17','17','17~18']
TEXTBOOK = ['제1장, PDF 7~62쪽','제2~3장, PDF 65~138쪽','제4장, PDF 141~174쪽','제5~6장, PDF 177~244쪽','제6~7장, PDF 245~392쪽','독립된 장 없음. 공식 위험관리 자료로 보완','제8장, PDF 395~417쪽','제1~2장, PDF 7~92쪽 및 각 장의 전자절차']
ACADEMY = ['핵심이론 PDF 1~21쪽','핵심이론 PDF 22~63쪽','핵심이론 PDF 64~97쪽','핵심이론 PDF 98~132쪽 / 5주차 / 6주차 연습문제','핵심이론 PDF 133~181쪽 / 5주차','핵심이론 PDF 182~196쪽 / 6주차 PDF 1~13쪽','핵심이론 PDF 197~213쪽 / 7주차','핵심이론 PDF 214~221쪽 / 7주차']
DESCRIPTIONS = ['자격·직접생산·등록·목록화','수요 분석·경제성·공급계획','제안서·평가·가격·협상','체결·보증·선금·조정·종결','물품·용역·공사·MAS·하도급','식별·평가·대응·모니터링','적용 법령·분쟁·우대제도','전자업무·정보보호·데이터 해석']
PUBLIC_SOURCES = [
 {'title':'조달청 시험공고 · 시험일·접수일','url':'https://www.pps.go.kr/hrd/home/UserBoardActionUpdate.do?BO_CODE=NOTICE&BO_IDX=6705&method=detail'},
 {'title':'조달청 2026.10.08 교재·법령 적용 유의사항','url':'https://www.pps.go.kr/hrd/home/UserBoardActionUpdate.do?BO_CODE=NOTICE&BO_IDX=7127&method=detail'},
 {'title':'국가법령정보센터 · 적용 법령과 시행일 확인','url':'https://www.law.go.kr/'},
 {'title':'ISO 31000 · 위험관리 공식 안내','url':'https://www.iso.org/standards/popular/iso-31000-family'},
 {'title':'나라장터','url':'https://www.g2b.go.kr/'},
]
THEORY_COUNTS = [8,10,10,12,10,8,7,7]
THEORY_LINKS = {
    '保': {'title':'국가계약법 시행령 제50조 · 계약보증금','url':'https://www.law.go.kr/lsLinkCommonInfo.do?lsJoLnkSeq=1029775009'},
    '귀속': {'title':'국가계약법 시행령 제51조 · 계약보증금 귀속','url':'https://law.go.kr/LSW/lsLinkCommonInfo.do?lspttninfSeq=68570'},
    '물가': {'title':'국가계약법 시행령 제64조 · 물가변동 조정','url':'https://www.law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1031494393'},
    '산식': {'title':'국가계약법 시행규칙 제74조 · 조정 산식','url':'https://www.law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1031493781'},
    '검사': {'title':'국가계약법 시행령 제55조 · 검사','url':'https://law.go.kr/lsLinkCommonInfo.do?chrClsCd=010202&lspttninfSeq=68572'},
    '위험': {'title':'ISO 31000 · 위험관리 지침','url':'https://www.iso.org/standards/popular/iso-31000-family'},
}

def parse_theory():
    groups=[[] for _ in AREA_NAMES]
    area=0
    for line_no,line in enumerate((ROOT/'content/theory.txt').read_text(encoding='utf-8').splitlines(),1):
        if not line.strip(): continue
        if line.startswith('# '): area=int(line[2:]); continue
        fields=line.split('|')
        assert 1<=area<=8 and len(fields)==6, ('theory',line_no,len(fields))
        title,body,example,answer,pitfall,keywords=fields
        key=None
        if title=='보증의 종류와 계약보증금': key='保'
        elif title.startswith('계약보증금 귀속'): key='귀속'
        elif title.startswith('물가변동의 기간'): key='물가'
        elif title.startswith(('품목조정률','물가변동 증액')): key='산식'
        elif title.startswith('검사·검수·대금'): key='검사'
        elif title.startswith('위험의 정의'): key='위험'
        lessons=groups[area-1]
        lessons.append(dict(id=f'T{area}-{len(lessons)+1:02}',title=title,paragraphs=body.split('¶'),example=example,answer=answer,pitfall=pitfall,keywords=keywords.split(';'),references=[THEORY_LINKS[key]] if key else []))
    assert [len(g) for g in groups]==THEORY_COUNTS
    return groups


def parse(path, mock=False):
    result=[]; section=0; per={}
    for line_no,line in enumerate(path.read_text(encoding='utf-8').splitlines(),1):
        if not line.strip(): continue
        if line.startswith('# '): section=int(line[2:]); continue
        fields=line.split('|')
        assert len(fields)==(5 if mock else 4),(path.name,line_no,len(fields))
        area=int(fields.pop(0)) if mock else section
        kind,prompt,answer,explanation=fields
        assert kind in ['단답형','서술형','사례형','계산형']
        per[section]=per.get(section,0)+1
        qid=f'M{section}-{per[section]:02d}' if mock else f'Q{len(result)+1:03d}'
        rubric=answer.split(';')
        # Explicit aliases only. No fuzzy semantic grading.
        aliases={'SWOT 분석':['SWOT'],'MAS':['다수공급자계약'],'ADR':['대안적 분쟁 해결','대안적분쟁해결'],'ISO 31000':['ISO31000:2018'],'적격심사낙찰제':['적격심사']}.get(answer,[])
        result.append(dict(id=qid,area=area,type=kind,prompt=prompt,answer='\n'.join(rubric),rubric=rubric,explanation=explanation,aliases=aliases,status='초안 · 법령·전문가 검수 전',mock=section if mock else None))
    assert list(per.values())==([20,20,20] if mock else COUNTS),per
    return result

def main():
    questions=parse(ROOT/'content/questions.txt')
    mocks=parse(ROOT/'content/mocks.txt',True)
    all_q=questions+mocks
    assert len(set(q['id'] for q in all_q))==300
    assert len(set(q['prompt'] for q in all_q))==300
    lessons=parse_theory()
    blanks=[]
    blank_area=0
    for line in (ROOT/'content/blanks.txt').read_text(encoding='utf-8').splitlines():
        if not line.strip(): continue
        if line.startswith('# '): blank_area=int(line[2:]); continue
        lesson,prompt,answers,explanation=line.split('|')
        assert 1<=blank_area<=8 and prompt.count('[빈칸]')==1
        assert any(l['id']==lesson for l in lessons[blank_area-1])
        index=1+sum(q['area']==blank_area for q in blanks)
        blanks.append(dict(id=f'B{blank_area}-{index:02}',area=blank_area,lesson=lesson,prompt=prompt,answers=answers.split(';'),explanation=explanation))
    assert [sum(q['area']==i for q in blanks) for i in range(1,9)]==[8]*8
    assert len({q['prompt'] for q in blanks})==64
    audio_path=ROOT/'assets/audio/manifest.json'
    audio_manifest=json.loads(audio_path.read_text(encoding='utf-8')) if audio_path.exists() else {}
    for group in lessons:
        for lesson in group:
            audio=audio_manifest.get(lesson['id'])
            if audio and audio.get('hash')==fingerprint(lesson) and (ROOT/audio['src']).is_file():
                lesson['audio']=audio
    areas=[dict(id=i+1,name=n,count=COUNTS[i],description=DESCRIPTIONS[i],criteria=CRITERIA[i],textbook=TEXTBOOK[i],lessons=lessons[i],theory=[[x['title'],' '.join(x['paragraphs'])] for x in lessons[i]]) for i,n in enumerate(AREA_NAMES)]
    data=dict(version='2026.10.08-theory.2',examDate='2026-11-14',builtOn='2026-10-08',areas=areas,questions=questions,mockQuestions=mocks,sources=PUBLIC_SOURCES,mocks=[dict(id=i,title=f'실전 모의고사 {i}회',subtitle=['기본 절차와 계산의 연결','계약 이행과 판단의 정확성','변경·위험·분쟁 종합 연습'][i-1],ids=[q['id'] for q in mocks if q['mock']==i],minutes=150) for i in range(1,4)])
    data['blanks']=blanks
    (ROOT/'data.js').write_text('/* Generated by scripts/build_data.py. Edit content/*.txt, then rebuild. */\nwindow.PROCUREMENT_DATA = '+json.dumps(data,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
    print(f'Built {len(questions)} practice + {len(mocks)} separate mock questions; {len(areas)} areas. Unique prompts: 300.')

if __name__=='__main__': main()
