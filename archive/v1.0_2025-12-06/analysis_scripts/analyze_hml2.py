"""
HML 파일 상세 분석 - TEXT 태그 구조 확인
"""
import os
import xml.etree.ElementTree as ET
import re

file_path = r'C:\MYCLAUDE_PROJECT\pdf\.claude\내신 2024년 인천 미추홀구 인화여고 고1 공통 1학기기말 수학상.Hml'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

print("=" * 70)
print("HML TEXT 태그 구조 분석")
print("=" * 70)

# XML 파싱
root = ET.fromstring(content)

# 1. TEXT 태그 분석
print("\n[1] TEXT 태그 구조 분석")
text_elements = list(root.iter('TEXT'))
print(f"    TEXT 태그 수: {len(text_elements)}")

# 첫 10개 TEXT 태그의 전체 구조 출력
print("\n    처음 10개 TEXT 태그 구조:")
for i, text_elem in enumerate(text_elements[:10]):
    print(f"\n    --- TEXT #{i} ---")
    # 자식 요소들
    children = list(text_elem)
    print(f"    자식 수: {len(children)}")
    for j, child in enumerate(children[:5]):
        print(f"      [{j}] <{child.tag}> text='{child.text}' tail='{child.tail}'")

    # TEXT 요소의 전체 텍스트 추출
    all_text = ET.tostring(text_elem, encoding='unicode', method='text')
    print(f"    전체 텍스트: '{all_text[:100]}'")

# 2. CHAR 태그 분석
print("\n" + "=" * 70)
print("[2] CHAR 태그 구조 분석")
char_elements = list(root.iter('CHAR'))
print(f"    CHAR 태그 수: {len(char_elements)}")

# 문자가 포함된 CHAR 태그 확인
chars_with_text = []
for char_elem in char_elements:
    # CHAR 자체의 text와 tail
    if char_elem.text and char_elem.text.strip():
        chars_with_text.append(('text', char_elem.text.strip()))
    if char_elem.tail and char_elem.tail.strip():
        chars_with_text.append(('tail', char_elem.tail.strip()))
    # 자식들의 text/tail
    for child in char_elem:
        if child.text and child.text.strip():
            chars_with_text.append(('child_text', child.text.strip()))
        if child.tail and child.tail.strip():
            chars_with_text.append(('child_tail', child.tail.strip()))

print(f"    텍스트가 있는 위치: {len(chars_with_text)}")
print(f"\n    처음 30개:")
for i, (loc, text) in enumerate(chars_with_text[:30]):
    print(f"      [{i:2d}] {loc:12s}: '{text[:50]}'")

# 3. P 태그 분석
print("\n" + "=" * 70)
print("[3] P (문단) 태그 전체 텍스트 추출")

p_elements = list(root.iter('P'))
print(f"    P 태그 수: {len(p_elements)}")

para_texts = []
for p_elem in p_elements:
    # itertext()로 모든 텍스트 추출
    full_text = ''.join(p_elem.itertext()).strip()
    if full_text:
        para_texts.append(full_text)

print(f"    비어있지 않은 문단: {len(para_texts)}")
print(f"\n    처음 40개 문단 텍스트:")
for i, text in enumerate(para_texts[:40]):
    text_preview = text[:80].replace('\n', ' ')
    print(f"      [{i:2d}] '{text_preview}'")

# 4. 문제 패턴 검색
print("\n" + "=" * 70)
print("[4] 추출된 문단에서 문제 패턴 검색")

patterns = [
    (r'^(\d+)\.\s', 'N. (숫자+점+공백)'),
    (r'^(\d+)\)\s', 'N) (숫자+괄호+공백)'),
    (r'^\[(\d+)\]\s', '[N] (대괄호숫자)'),
    (r'^(\d+)번\s', 'N번'),
    (r'^문제\s*(\d+)', '문제 N'),
    (r'^(\d+)\s+', 'N (숫자+공백)'),  # 추가 패턴
]

for pattern, desc in patterns:
    matches = []
    for text in para_texts:
        if re.match(pattern, text.strip()):
            matches.append(text.strip()[:60])
    print(f"\n    {desc}:")
    print(f"      매칭 수: {len(matches)}")
    if matches:
        for m in matches[:10]:
            print(f"        - '{m}'")

# 5. 숫자로 시작하는 문단 확인
print("\n" + "=" * 70)
print("[5] 숫자로 시작하는 문단")

number_paras = [p for p in para_texts if p and p[0].isdigit()]
print(f"    숫자로 시작하는 문단 수: {len(number_paras)}")
for i, text in enumerate(number_paras[:30]):
    print(f"      [{i:2d}] '{text[:80]}'")

# 6. BODY 구조 분석
print("\n" + "=" * 70)
print("[6] BODY 구조 분석")

body = root.find('BODY')
if body is not None:
    print(f"    BODY 자식 수: {len(list(body))}")
    for i, child in enumerate(list(body)[:10]):
        print(f"      [{i}] <{child.tag}>")
        for j, subchild in enumerate(list(child)[:5]):
            print(f"          [{j}] <{subchild.tag}>")

# 7. 수식 분석
print("\n" + "=" * 70)
print("[7] EQUATION (수식) 분석")

eq_elements = list(root.iter('EQUATION'))
print(f"    EQUATION 태그 수: {len(eq_elements)}")
print(f"\n    처음 10개 수식:")
for i, eq in enumerate(eq_elements[:10]):
    eq_text = ''.join(eq.itertext()).strip()
    print(f"      [{i}] '{eq_text[:60]}'")
