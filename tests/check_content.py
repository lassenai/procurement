"""Structural/content integrity checks. Not a substitute for legal review."""
import json
import re
from pathlib import Path
from collections import Counter

root=Path(__file__).resolve().parents[1]
raw=(root/'data.js').read_text(encoding='utf-8')
data=json.loads(raw.split('window.PROCUREMENT_DATA = ',1)[1].rstrip().removesuffix(';'))
q=data['questions']; mocks=data['mockQuestions']; all_q=q+mocks
assert len(q)==240 and len(mocks)==60
assert Counter(x['area'] for x in q)==dict(enumerate([24,24,36,48,36,24,24,24],1))
assert len({x['id'] for x in all_q})==300
assert len({x['prompt'] for x in all_q})==300
for x in all_q:
    assert x['type'] in {'단답형','서술형','계산형','사례형'}
    assert len(x['prompt'])>15 and len(x['explanation'])>10
    assert x['answer'] and x['rubric'] and all(x['rubric'])
    assert x['answer']=='\n'.join(x['rubric'])
    assert '초안' in x['status']
    assert len(x['rubric'])==len(set(x['rubric']))
    assert not any(word in x['prompt'] for word in ['TODO','placeholder','예시문제 추가'])
by_id={x['id']:x for x in all_q}
seen=set()
for m in data['mocks']:
    assert m['minutes']==150 and len(m['ids'])==20
    assert not seen.intersection(m['ids'])
    seen.update(m['ids'])
    assert {by_id[id]['area'] for id in m['ids']}==set(range(1,9))
    assert all(by_id[id]['mock']==m['id'] for id in m['ids'])
assert not seen.intersection(x['id'] for x in q)
assert len(data['areas'])==8
assert [len(a['lessons']) for a in data['areas']]==[8,10,10,12,10,8,7,7]
lessons=[lesson for a in data['areas'] for lesson in a['lessons']]
assert len(lessons)==72 and len({x['id'] for x in lessons})==72
for a in data['areas']:
    assert len(a['theory'])==len(a['lessons'])
    for lesson in a['lessons']:
        assert len(lesson['paragraphs'])>=2
        assert all(lesson[key] for key in ['title','example','answer','pitfall','keywords'])
        text=lesson['title']+' '+' '.join(lesson['paragraphs']+[lesson['example'],lesson['answer'],lesson['pitfall']])
        assert all(term in text for term in lesson['keywords']),lesson['id']
        assert not any(term in text for term in ['학원','학습용 초안','TODO','placeholder'])
        assert all(ref['url'].startswith('https://') for ref in lesson['references'])

# Independently recompute worked examples from the expanded theory.
by_lesson={x['id']:x for x in lessons}
for id,result,expected in [
    ('T2-05',800+40-20,'820만원'),
    ('T2-06',(300+200+1000*.06)*.1,'56만원'),
    ('T2-07',400*3*.5,'600만원'),
    ('T2-08',100*.2+140*.3+180*.5,'152개'),
    ('T2-09',300/(5-3),'150개'),
    ('T3-05',90/100*80+18,'90점'),
    ('T3-08',5000+300-100,'5,200만원'),
    ('T4-05',5000-6000*5000/20000,'3,500만원'),
    ('T4-08',15000-12000,'3,000원'),
    ('T4-09',1000*.7*.05*(1-.4),'21만원'),
    ('T4-12',4000*.0005*(8-2),'12만원'),
    ('T5-02',12*30,'360만원'),
    ('T6-06',4000*(.05-.02)-60,'60만원'),
    ('T8-06',2/(2+8)*100,'20%'),
]:
    assert expected in by_lesson[id]['example'],id
    numeric=float(re.search(r'[\d,]+(?:\.\d+)?',expected).group().replace(',',''))
    assert abs(result-numeric)<1e-8,(id,result,numeric)

# Independently recompute representative multi-step arithmetic problems.
cases=[
 ('최근 3년 수요가 100개', (100+140+180)/3, '140개'),
 ('수요 100개, 140개',100*.2+140*.3+180*.5,'152개'),
 ('고정비 300만원',300/(5-3),'150개'),
 ('선금 공제액=물가변동',5000*.06*.4,'120만원'),
 ('지체상금 산정대상 금액 4,000',4000*.0005*6,'12만원'),
 ('최종 계약금액 합계가 표의 백만원',126/420*100,'A기관 비중 30%'),
 ('최근 3년 구매량은 200',200*.2+240*.3+300*.5,'262개'),
 ('계약금액 2억원, 선금',5000-6000*5000/20000,'3,500만원'),
 ('사고 시 손실이 4,000',4000*.05-4000*.02-60,'60만원'),
 ('물가변동 적용대가 1억2,000',12000*.03*(1-.25),'270만원'),
]
for prefix,value,expected in cases:
    match=[x for x in all_q if x['prompt'].startswith(prefix)]
    assert len(match)==1,prefix
    assert expected in match[0]['answer'],(prefix,expected)
    numeric=float(re.search(r'[\d,]+(?:\.\d+)?',expected).group().replace(',',''))
    assert abs(numeric-value)<1e-8,(prefix,numeric,value)

print('PASS: 240 practice + 60 separate mock questions, 8 areas, 3 x 20 mock sets, 300 unique prompts.')
print('PASS: schemas, rubrics, draft metadata, 72 detailed theory lessons and 24 independent arithmetic checks.')
print('Types:',dict(Counter(x['type'] for x in q)))
