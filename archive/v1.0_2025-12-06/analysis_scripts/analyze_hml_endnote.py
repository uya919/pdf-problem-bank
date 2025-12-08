"""
HML 미주(ENDNOTE) 구조 심층 분석
- ENDNOTE와 AUTONUM 관계 파악
- 문제-정답 매핑 구조 분석
"""
import xml.etree.ElementTree as ET
import re
from collections import defaultdict

file_path = r'C:\MYCLAUDE_PROJECT\pdf\.claude\내신 2024년 인천 미추홀구 인화여고 고1 공통 1학기기말 수학상.Hml'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

root = ET.fromstring(content)

print("=" * 80)
print("HML 미주(ENDNOTE) 구조 심층 분석")
print("=" * 80)

# 1. ENDNOTE 전체 내용 추출
print("\n[1] ENDNOTE 태그 전체 분석 (21개)")
print("-" * 60)

endnotes = []
for i, note in enumerate(root.iter('ENDNOTE')):
    text = ''.join(note.itertext()).strip()
    endnotes.append({
        'index': i + 1,
        'text': text,
        'attrs': dict(note.attrib)
    })
    print(f"미주 {i+1:2d}: {text}")

# 2. AUTONUM 태그 분석
print("\n" + "=" * 80)
print("[2] AUTONUM 태그 분석")
print("-" * 60)

autonums = []
for i, num in enumerate(root.iter('AUTONUM')):
    attrs = dict(num.attrib)
    # 부모 태그 확인
    autonums.append({
        'index': i,
        'attrs': attrs,
    })
    print(f"AUTONUM {i:2d}: {attrs}")

# 3. AUTONUMFORMAT 태그 분석
print("\n" + "=" * 80)
print("[3] AUTONUMFORMAT 태그 분석 (자동번호 형식)")
print("-" * 60)

for i, fmt in enumerate(root.iter('AUTONUMFORMAT')):
    attrs = dict(fmt.attrib)
    print(f"Format {i:2d}: {attrs}")

# 4. P 태그와 ENDNOTE 관계 분석
print("\n" + "=" * 80)
print("[4] P 태그 - ENDNOTE 관계 분석")
print("-" * 60)

# P 태그 내에 AUTONUM이 있는 경우 찾기
p_with_autonum = []
for i, p in enumerate(root.iter('P')):
    autonums_in_p = list(p.iter('AUTONUM'))
    if autonums_in_p:
        text = ''.join(p.itertext()).strip()
        p_with_autonum.append({
            'p_index': i,
            'autonum_count': len(autonums_in_p),
            'autonum_types': [dict(a.attrib).get('NumType', '?') for a in autonums_in_p],
            'text_preview': text[:100]
        })

print(f"AUTONUM 포함 P 태그: {len(p_with_autonum)}개")
for item in p_with_autonum[:15]:
    print(f"  P[{item['p_index']:3d}] AUTONUM: {item['autonum_types']}")
    print(f"         텍스트: {item['text_preview'][:60]}...")

# 5. 문제 구조 추론: 보기(①~⑤)와 정답 관계
print("\n" + "=" * 80)
print("[5] 보기(①~⑤)와 정답 관계 분석")
print("-" * 60)

all_text = ''.join(root.itertext())

# 원문자 연속 그룹 상세 분석
choice_groups = re.findall(r'①[^①]*②[^②]*③[^③]*④[^④]*⑤[^⑤]*?\[정답\]\s*([①②③④⑤])', all_text)
print(f"보기 그룹 후 [정답] 패턴: {len(choice_groups)}개")
print(f"정답들: {choice_groups}")

# 6. 점수 패턴과 위치 분석
print("\n" + "=" * 80)
print("[6] 배점 패턴 위치 분석")
print("-" * 60)

points_matches = list(re.finditer(r'\[(\d+\.?\d*)점\]', all_text))
print(f"[X.XX점] 패턴: {len(points_matches)}개")
for i, m in enumerate(points_matches):
    context_start = max(0, m.start() - 30)
    context_end = min(len(all_text), m.end() + 30)
    context = all_text[context_start:context_end].replace('\n', ' ')
    print(f"  [{i+1:2d}] {m.group()} 위치 {m.start()}: ...{context}...")

# 7. SECTION 내 구조 상세 분석
print("\n" + "=" * 80)
print("[7] SECTION 내 문단-미주 구조")
print("-" * 60)

section = root.find('.//SECTION')
if section:
    # P 태그 순서대로 순회
    p_list = list(section.iter('P'))
    print(f"SECTION 내 P 태그: {len(p_list)}개")

    # 각 P 태그의 구조 분석
    for i, p in enumerate(p_list[:50]):
        has_autonum = len(list(p.iter('AUTONUM'))) > 0
        has_equation = len(list(p.iter('EQUATION'))) > 0
        text = ''.join(p.itertext()).strip()

        # 특별한 태그가 있는 P만 출력
        if has_autonum or '정답' in text or '점]' in text:
            indicators = []
            if has_autonum:
                indicators.append('AUTONUM')
            if has_equation:
                indicators.append('EQ')
            if '정답' in text:
                indicators.append('ANSWER')
            if '점]' in text:
                indicators.append('POINT')

            print(f"  P[{i:3d}] [{','.join(indicators):15s}] {text[:60]}...")

# 8. 문제 본문 추출 시도
print("\n" + "=" * 80)
print("[8] 문제 본문 추출 시도")
print("-" * 60)

# AUTONUM Type='Endnote'인 것을 문제 시작점으로
problem_starts = []
for i, p in enumerate(root.iter('P')):
    for autonum in p.iter('AUTONUM'):
        if autonum.get('NumType') == 'Endnote':
            text = ''.join(p.itertext()).strip()
            problem_starts.append({
                'p_index': i,
                'text': text
            })

print(f"NumType='Endnote' AUTONUM이 있는 P: {len(problem_starts)}개")
for i, ps in enumerate(problem_starts[:25]):
    print(f"  문제 {i+1:2d}: {ps['text'][:70]}...")

# 9. 미주 번호와 문제 매핑
print("\n" + "=" * 80)
print("[9] 문제-정답 매핑 (미주 기반)")
print("-" * 60)

# 각 문제의 정답 추출
for i, note in enumerate(endnotes):
    ans_match = re.search(r'\[정답\]\s*([①②③④⑤\d]+)', note['text'])
    answer = ans_match.group(1) if ans_match else '?'

    # 배점 추출 (있으면)
    point_match = re.search(r'\[(\d+\.?\d*)점\]', note['text'])
    points = point_match.group(1) if point_match else '?'

    print(f"  문제 {i+1:2d}: 정답={answer}, 배점={points}점, 미주내용={note['text'][:50]}...")

# 10. 문제 본문과 정답 결합
print("\n" + "=" * 80)
print("[10] 최종: 문제 본문 + 정답 결합")
print("-" * 60)

# 문제 본문 찾기 (보기 패턴 기반)
# ① ~ ⑤ 패턴이 있는 텍스트 블록을 문제 본문으로
problem_contents = re.findall(
    r'([^①]*①[^①]*②[^②]*③[^③]*④[^④]*⑤[^\[]*)',
    all_text
)

print(f"보기 패턴 기반 문제 블록: {len(problem_contents)}개")

for i, content in enumerate(problem_contents[:21]):
    # 문제 시작 부분 추출 (① 이전)
    before_choice = content.split('①')[0].strip()[-100:]  # 마지막 100자
    print(f"\n문제 {i+1:2d}:")
    print(f"  본문(끝부분): ...{before_choice[:60]}...")

    # 해당 미주의 정답
    if i < len(endnotes):
        ans_match = re.search(r'\[정답\]\s*([①②③④⑤\d]+)', endnotes[i]['text'])
        answer = ans_match.group(1) if ans_match else '?'
        print(f"  정답: {answer}")

print("\n" + "=" * 80)
print("분석 완료")
print("=" * 80)
