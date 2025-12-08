"""
HML 파일 심층 분석 스크립트
- 미주(ENDNOTE) 구조 분석
- 문제 패턴 분석
- 21문제 검출을 위한 구조 파악
"""
import xml.etree.ElementTree as ET
import re
from collections import Counter, defaultdict

file_path = r'C:\MYCLAUDE_PROJECT\pdf\.claude\내신 2024년 인천 미추홀구 인화여고 고1 공통 1학기기말 수학상.Hml'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

root = ET.fromstring(content)

print("=" * 80)
print("HML 파일 심층 분석 리포트")
print("=" * 80)

# 1. 모든 태그 종류 수집
print("\n[1] 모든 XML 태그 종류")
print("-" * 40)
all_tags = Counter()
for elem in root.iter():
    all_tags[elem.tag] += 1

print(f"총 태그 종류: {len(all_tags)}")
print("\n상위 30개 태그:")
for tag, count in all_tags.most_common(30):
    print(f"  {tag:30s}: {count:5d}")

# 2. ENDNOTE 관련 태그 찾기 (미주)
print("\n" + "=" * 80)
print("[2] ENDNOTE/FOOTNOTE 관련 태그 분석 (미주/각주)")
print("-" * 40)

endnote_tags = [tag for tag in all_tags if 'NOTE' in tag.upper() or 'FOOT' in tag.upper() or 'END' in tag.upper()]
print(f"NOTE 관련 태그: {endnote_tags}")

for tag in endnote_tags:
    print(f"\n  {tag} 태그 ({all_tags[tag]}개):")
    for i, elem in enumerate(root.iter(tag)):
        if i < 5:  # 처음 5개만
            text = ''.join(elem.itertext())[:100]
            attrs = dict(elem.attrib)
            print(f"    [{i}] attrs={attrs}")
            print(f"        text: {text[:80]}...")

# 3. 정답 패턴 분석
print("\n" + "=" * 80)
print("[3] 정답 패턴 분석")
print("-" * 40)

all_text = ''.join(root.itertext())

# 원문자 패턴
circled_count = len(re.findall(r'[①②③④⑤]', all_text))
print(f"원문자 (①②③④⑤) 총 개수: {circled_count}")

# "정답" 문자열
answer_patterns = {
    '정답': len(re.findall(r'정답', all_text)),
    '[정답]': len(re.findall(r'\[정답\]', all_text)),
    '답:': len(re.findall(r'답\s*:', all_text)),
    '답)': len(re.findall(r'답\s*\)', all_text)),
}
print(f"정답 관련 패턴: {answer_patterns}")

# 4. 빠른 정답 섹션 분석
print("\n" + "=" * 80)
print("[4] 빠른 정답 섹션 분석")
print("-" * 40)

# "빠른 정답" 위치 찾기
quick_answer_pos = all_text.find('빠른 정답')
if quick_answer_pos == -1:
    quick_answer_pos = all_text.find('빠른정답')

if quick_answer_pos >= 0:
    print(f"'빠른 정답' 위치: {quick_answer_pos}")
    quick_section = all_text[quick_answer_pos:quick_answer_pos+500]
    print(f"빠른 정답 섹션 (500자):\n{quick_section}")

    # N) 패턴 찾기 (1) ~ 21))
    bracket_pattern = re.findall(r'(\d+)\)', quick_section)
    print(f"\nN) 패턴 발견: {bracket_pattern}")
else:
    print("'빠른 정답' 섹션을 찾을 수 없음")

# 5. 문제 번호 패턴 분석
print("\n" + "=" * 80)
print("[5] 문제 번호 패턴 분석")
print("-" * 40)

# 다양한 문제 번호 패턴
patterns = {
    'N. (마침표)': r'(?:^|\s)(\d{1,2})\.\s',
    'N) (괄호)': r'(?:^|\s)(\d{1,2})\)\s',
    '[N] (대괄호)': r'\[(\d{1,2})\]',
    '【N】 (겹낫표)': r'【(\d{1,2})】',
    '(N) (소괄호)': r'\((\d{1,2})\)',
    'N번 (번)': r'(\d{1,2})번',
    '문제N': r'문제\s*(\d{1,2})',
    '제N문': r'제\s*(\d{1,2})\s*문',
}

for name, pattern in patterns.items():
    matches = re.findall(pattern, all_text)
    unique = sorted(set(int(m) for m in matches if m.isdigit()))
    print(f"  {name:20s}: {len(matches):3d}회, 고유값: {unique[:25]}")

# 6. 출제의도 패턴
print("\n" + "=" * 80)
print("[6] 출제의도/배점 패턴")
print("-" * 40)

purpose_count = len(re.findall(r'\[출제의도\]', all_text))
points_count = len(re.findall(r'\[\d+\.?\d*점\]', all_text))
points_alt = len(re.findall(r'\d+\.?\d*점', all_text))

print(f"[출제의도] 패턴: {purpose_count}회")
print(f"[X.XX점] 패턴: {points_count}회")
print(f"X.XX점 패턴 (대괄호 없음): {points_alt}회")

# 점수 추출
all_points = re.findall(r'(\d+\.?\d*)점', all_text)
print(f"점수 값들: {Counter(all_points).most_common(10)}")

# 7. P 태그 (문단) 구조 분석
print("\n" + "=" * 80)
print("[7] 문단(P) 구조 분석")
print("-" * 40)

p_elements = list(root.iter('P'))
print(f"총 P 태그 수: {len(p_elements)}")

# 문단별 텍스트 길이 분포
para_lengths = []
for p in p_elements:
    text = ''.join(p.itertext())
    para_lengths.append(len(text))

print(f"문단 길이 범위: {min(para_lengths)} ~ {max(para_lengths)}")
print(f"평균 문단 길이: {sum(para_lengths)/len(para_lengths):.1f}")

# 긴 문단들 (문제 본문일 가능성)
long_paras = [(i, len(''.join(p.itertext()))) for i, p in enumerate(p_elements) if len(''.join(p.itertext())) > 100]
print(f"100자 이상 문단 수: {len(long_paras)}")

# 8. SECTION 구조
print("\n" + "=" * 80)
print("[8] SECTION 구조 분석")
print("-" * 40)

sections = list(root.iter('SECTION'))
print(f"총 SECTION 수: {len(sections)}")

for i, sec in enumerate(sections):
    p_in_sec = len(list(sec.iter('P')))
    text_preview = ''.join(sec.itertext())[:100].replace('\n', ' ')
    print(f"  Section {i}: P태그 {p_in_sec}개, 시작: {text_preview}...")

# 9. 원문자 주변 컨텍스트 (보기 분석)
print("\n" + "=" * 80)
print("[9] 원문자(①~⑤) 주변 컨텍스트")
print("-" * 40)

# 원문자가 연속으로 나오는 패턴 (보기)
choice_groups = re.findall(r'①[^①]*②[^②]*③[^③]*④[^④]*⑤[^⑤]{0,50}', all_text)
print(f"① ~ ⑤ 연속 그룹 수: {len(choice_groups)}")

for i, group in enumerate(choice_groups[:10]):
    preview = group[:80].replace('\n', ' ')
    print(f"  [{i:2d}] {preview}...")

# 10. 미주 위치 추적
print("\n" + "=" * 80)
print("[10] ENDNOTE 상세 분석")
print("-" * 40)

# ENDNOTE 태그의 부모 구조
for note_tag in ['ENDNOTE', 'endnote', 'Endnote', 'FOOTNOTE', 'footnote', 'Footnote']:
    notes = list(root.iter(note_tag))
    if notes:
        print(f"\n{note_tag} 태그 발견: {len(notes)}개")
        for i, note in enumerate(notes[:5]):
            print(f"  [{i}] 속성: {dict(note.attrib)}")
            text = ''.join(note.itertext())[:100]
            print(f"      내용: {text}")

# 11. 특수 속성 분석
print("\n" + "=" * 80)
print("[11] 특수 속성이 있는 태그 분석")
print("-" * 40)

# Id 속성을 가진 태그들
id_elements = [(elem.tag, elem.get('Id'), ''.join(elem.itertext())[:50])
               for elem in root.iter() if elem.get('Id')]
print(f"Id 속성을 가진 태그: {len(id_elements)}개")
for tag, id_val, text in id_elements[:10]:
    print(f"  {tag}: Id={id_val}, text={text[:30]}...")

# 12. TEXT 태그 분석 (실제 텍스트)
print("\n" + "=" * 80)
print("[12] CHAR/TEXT 태그 내용 분석")
print("-" * 40)

# CHAR 태그의 Type 속성
char_types = Counter()
for char in root.iter('CHAR'):
    char_types[char.get('Type', 'None')] += 1
print(f"CHAR Type 분포: {dict(char_types)}")

# 13. 문제 시작점 후보 찾기
print("\n" + "=" * 80)
print("[13] 문제 시작점 후보 분석")
print("-" * 40)

# 숫자 + 마침표로 시작하는 문단
problem_candidates = []
for i, p in enumerate(p_elements):
    text = ''.join(p.itertext()).strip()
    if text:
        # 문제 시작 패턴
        if re.match(r'^\d{1,2}[\.\)]\s', text):
            problem_candidates.append((i, text[:80]))
        elif re.match(r'^【\d+】', text):
            problem_candidates.append((i, text[:80]))
        elif re.match(r'^\[\d+\]', text):
            problem_candidates.append((i, text[:80]))

print(f"문제 시작 후보 수: {len(problem_candidates)}")
for idx, preview in problem_candidates[:25]:
    print(f"  P[{idx:3d}]: {preview}")

# 14. 전체 텍스트에서 1~21 패턴 검색
print("\n" + "=" * 80)
print("[14] 1~21 문제번호 상세 검색")
print("-" * 40)

for num in range(1, 22):
    # 다양한 패턴으로 검색
    patterns_for_num = [
        (f'{num}. ', f'"{num}. "'),
        (f'{num}) ', f'"{num}) "'),
        (f'【{num}】', f'【{num}】'),
        (f'[{num}]', f'[{num}]'),
        (f'{num}번', f'{num}번'),
    ]

    found_patterns = []
    for pattern, name in patterns_for_num:
        if pattern in all_text:
            found_patterns.append(name)

    if found_patterns:
        print(f"  문제 {num:2d}: {', '.join(found_patterns)}")
    else:
        print(f"  문제 {num:2d}: 못찾음")

# 15. 실제 문제 텍스트 샘플
print("\n" + "=" * 80)
print("[15] 처음 20개 문단 텍스트 샘플")
print("-" * 40)

for i, p in enumerate(p_elements[:20]):
    text = ''.join(p.itertext()).strip()
    if text:
        preview = text[:100].replace('\n', ' ')
        print(f"  P[{i:3d}] ({len(text):4d}자): {preview}")

print("\n" + "=" * 80)
print("분석 완료")
print("=" * 80)
