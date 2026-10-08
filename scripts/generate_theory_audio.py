"""Generate static Korean narration; pip install edge-tts (build-time only).

Only authored theory is sent to the synthesis service. Resume from manifest.
Re-run build_data.py after generation to attach matching audio to lessons.
"""
import asyncio
import hashlib
import json
import re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
VOICE='ko-KR-SunHiNeural'

def narration(lesson):
    text='\n\n'.join([lesson['title']+'.',*lesson['paragraphs'],'적용 예시. '+lesson['example'],'답안에 쓸 핵심. '+lesson['answer'],'혼동 주의. '+lesson['pitfall']])
    for old,new in [('RFI','알 에프 아이'),('RFQ','알 에프 큐'),('RFP','알 에프 피'),('MAS','마스'),('SWOT','스왓'),('ISO 31000','아이 에스 오 삼만 천'),('PQ','피 큐'),('SW','소프트웨어'),('PC','피씨')]:text=text.replace(old,new)
    text=re.sub(r'(?<=\d),(?=\d)','',text)
    for old,new in [('→',', 다음으로 '),('÷',' 나누기 '),('×',' 곱하기 '),('−',' 빼기 '),('+',' 더하기 '),('=',' 은 '),('%',' 퍼센트'),('≤',' 이하 '),('<',' 미만 '),('·',', '),(' / ','. ')]:text=text.replace(old,new)
    return text

def fingerprint(lesson):
    return hashlib.sha256((VOICE+'\n'+narration(lesson)).encode('utf-8')).hexdigest()

async def main():
    import edge_tts
    data=json.loads((ROOT/'data.js').read_text(encoding='utf-8').split('window.PROCUREMENT_DATA = ',1)[1].strip().removesuffix(';'))
    folder=ROOT/'assets/audio';folder.mkdir(parents=True,exist_ok=True)
    manifest_path=folder/'manifest.json'
    manifest=json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else {}
    lessons=[x for a in data['areas'] for x in a['lessons']]
    semaphore=asyncio.Semaphore(2)
    failures=[]
    async def generate(lesson):
        async with semaphore:
            key=lesson['id'];digest=fingerprint(lesson)
            filename=f'{key}-{digest[:12]}.mp3';path=folder/filename
            if manifest.get(key,{}).get('hash')==digest and path.exists():return
            for attempt in range(3):
                try:
                    temporary=path.with_suffix('.part')
                    await asyncio.wait_for(edge_tts.Communicate(narration(lesson),VOICE,rate='-5%').save(str(temporary)),timeout=90)
                    if temporary.stat().st_size<1000:raise ValueError('Audio output is too short')
                    temporary.replace(path)
                    manifest[key]={'hash':digest,'src':'assets/audio/'+filename,'voice':VOICE,'label':'자연스러운 AI 음성 · 선희'}
                    manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
                    print(f'Generated {key} ({len(manifest)}/{len(lessons)})',flush=True)
                    return
                except Exception as error:
                    if attempt==2:failures.append((key,type(error).__name__));print(f'FAILED {key}: {type(error).__name__}',flush=True)
                    else:await asyncio.sleep(2*(attempt+1))
    await asyncio.gather(*(generate(x) for x in lessons))
    if failures:raise RuntimeError(failures)
    print('Complete: 72 natural-voice lessons',flush=True)

if __name__=='__main__':asyncio.run(main())
