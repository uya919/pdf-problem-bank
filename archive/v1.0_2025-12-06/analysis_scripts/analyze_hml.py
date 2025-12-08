"""
HML 파일 분석 스크립트
"""
import os
import xml.etree.ElementTree as ET
import re
from collections import Counter

file_path = r'C:\MYCLAUDE_PROJECT\pdf\.claude\내신 2024년 인천 미추홀구 인화여고 고1 공통 1학기기말 수학상.Hml'

print("=" * 60)
print("HML 파일 분석 리포트")
print("=" * 60)

# 1. 파일 기본 정보
print(f"\n[1] 파일 정보")
print(f"    경로: {file_path}")
print(f"    존재: {os.path.exists(file_path)}")
print(f"    크기: {os.path.getsize(file_path):,} bytes")

# 2. 파일 읽기
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

print(f"    문자 수: {len(content):,}")
print(f"    줄 수: {content.count(chr(10)):,}")

# 3. XML 구조 분석
print(f"\n[2] XML 구조 분석")

# 태그 카운트
tag_pattern = re.compile(r'<([a-zA-Z_][a-zA-Z0-9_]*)')
tags = tag_pattern.findall(content)
tag_counts = Counter(tags)

print(f"    총 태그 수: {len(tags):,}")
print(f"    고유 태그 종류: {len(tag_counts)}")
print(f"\n    상위 20개 태그:")
for tag, count in tag_counts.most_common(20):
    print(f"      - <{tag}>: {count:,}회")

# 4. P 태그 관련 분석
print(f"\n[3] P 태그 분석 (문단)")
p_tags = [t for t in tags if t == 'P']
print(f"    <P> 태그 수: {len(p_tags):,}")

# CHAR 태그
char_tags = [t for t in tags if t == 'CHAR']
print(f"    <CHAR> 태그 수: {len(char_tags):,}")

# TEXT 태그
text_tags = [t for t in tags if t == 'TEXT']
print(f"    <TEXT> 태그 수: {len(text_tags):,}")

# T 태그
t_tags = [t for t in tags if t == 'T']
print(f"    <T> 태그 수: {len(t_tags):,}")

# 5. XML 파싱 시도
print(f"\n[4] XML 파싱 시도")
try:
    root = ET.fromstring(content)
    print(f"    루트 태그: {root.tag}")
    print(f"    루트 속성: {root.attrib}")

    # 네임스페이스 확인
    ns_match = re.match(r'\{([^}]+)\}', root.tag)
    if ns_match:
        ns = ns_match.group(1)
        print(f"    네임스페이스: {ns}")
    else:
        print(f"    네임스페이스: 없음")

    # 자식 요소들
    children = list(root)
    print(f"    직계 자식 수: {len(children)}")
    for i, child in enumerate(children[:10]):
        tag_name = child.tag.split('}')[-1] if '}' in child.tag else child.tag
        print(f"      [{i}] <{tag_name}>")

except ET.ParseError as e:
    print(f"    XML 파싱 에러: {e}")

# 6. 텍스트 내용 추출 시도
print(f"\n[5] 텍스트 내용 샘플")

# <T> 태그 내의 텍스트 추출
t_content_pattern = re.compile(r'<T>([^<]+)</T>')
t_contents = t_content_pattern.findall(content)

print(f"    <T> 태그 내 텍스트 수: {len(t_contents):,}")
print(f"\n    처음 30개 텍스트:")
for i, text in enumerate(t_contents[:30]):
    text_preview = text[:50].replace('\n', ' ')
    print(f"      [{i:2d}] {text_preview}")

# 7. 문제 패턴 검색
print(f"\n[6] 문제 패턴 검색")

# 파서가 사용하는 패턴들
patterns = [
    (r'^(\d+)\.\s', 'N. (숫자+점+공백)'),
    (r'^(\d+)\)\s', 'N) (숫자+괄호+공백)'),
    (r'^\[(\d+)\]\s', '[N] (대괄호숫자)'),
    (r'^(\d+)번\s', 'N번'),
    (r'^문제\s*(\d+)', '문제 N'),
]

for pattern, desc in patterns:
    matches = []
    for text in t_contents:
        if re.match(pattern, text.strip()):
            matches.append(text.strip()[:40])
    print(f"\n    {desc}:")
    print(f"      매칭 수: {len(matches)}")
    if matches:
        for m in matches[:5]:
            print(f"        - '{m}'")

# 8. 실제 숫자로 시작하는 텍스트 확인
print(f"\n[7] 숫자로 시작하는 텍스트")
number_start = [t.strip() for t in t_contents if t.strip() and t.strip()[0].isdigit()]
print(f"    숫자로 시작하는 텍스트 수: {len(number_start)}")
for i, text in enumerate(number_start[:20]):
    print(f"      [{i:2d}] '{text[:60]}'")

# 9. 특이한 패턴 확인
print(f"\n[8] 특수 패턴 확인")

# 원문자 (①②③...) 확인
circled_numbers = re.findall(r'[①②③④⑤⑥⑦⑧⑨⑩]', content)
print(f"    원문자(①②...) 수: {len(circled_numbers)}")

# 괄호 숫자
paren_numbers = re.findall(r'\((\d+)\)', content)
print(f"    괄호 숫자 (N) 수: {len(paren_numbers)}")

# 10. HML 구조의 문제 텍스트 추출 방식 확인
print(f"\n[9] 파일 시작 부분 (2000자)")
print("-" * 60)
print(content[:2000])
print("-" * 60)
