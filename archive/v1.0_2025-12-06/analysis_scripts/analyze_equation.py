"""
HWP 수식 문법 분석 스크립트
"""
import os
import xml.etree.ElementTree as ET
import re
from collections import Counter

file_path = r'C:\MYCLAUDE_PROJECT\pdf\.claude\내신 2024년 인천 미추홀구 인화여고 고1 공통 1학기기말 수학상.Hml'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

root = ET.fromstring(content)

print("=" * 70)
print("HWP 수식(EQUATION) 문법 분석")
print("=" * 70)

# 모든 EQUATION 태그 추출
equations = []
for eq in root.iter('EQUATION'):
    eq_text = ''.join(eq.itertext()).strip()
    if eq_text:
        equations.append(eq_text)

print(f"\n총 수식 수: {len(equations)}")

# 1. 수식에서 사용된 명령어 추출
print("\n" + "=" * 70)
print("[1] HWP 수식 명령어 분석")
print("=" * 70)

# HWP 수식 명령어 패턴 (백슬래시 없이 사용)
commands = []
for eq in equations:
    # 영문 명령어 추출 (2글자 이상)
    found = re.findall(r'\b([a-zA-Z]{2,})\b', eq)
    commands.extend(found)

cmd_counts = Counter(commands)
print(f"\n발견된 명령어 종류: {len(cmd_counts)}")
print("\n상위 30개 명령어:")
for cmd, count in cmd_counts.most_common(30):
    print(f"  {cmd:20s}: {count:4d}회")

# 2. 특수 기호/연산자 분석
print("\n" + "=" * 70)
print("[2] 특수 기호 및 연산자")
print("=" * 70)

special_patterns = {
    'over': r'\bover\b',           # 분수
    'sqrt': r'\bsqrt\b',           # 제곱근
    'leq': r'\bleq\b',             # ≤
    'geq': r'\bgeq\b',             # ≥
    'times': r'\btimes\b',         # ×
    'pm': r'\bpm\b',               # ±
    'LEFT/RIGHT': r'\b(LEFT|RIGHT)\b',  # 괄호 확대
    'rm': r'\brm\b',               # 로만체 (일반 텍스트)
    'it': r'\bit\b',               # 이탤릭
    'bf': r'\bbf\b',               # 볼드
    'sum': r'\bsum\b',             # 시그마
    'int': r'\bint\b',             # 적분
    'lim': r'\blim\b',             # 극한
    'infty': r'\binfty\b',         # 무한대
    'pi': r'\bpi\b',               # 파이
    'alpha-omega': r'\b(alpha|beta|gamma|theta)\b',  # 그리스 문자
}

for name, pattern in special_patterns.items():
    matches = []
    for eq in equations:
        found = re.findall(pattern, eq, re.IGNORECASE)
        matches.extend(found)
    if matches:
        print(f"  {name:20s}: {len(matches):4d}회")

# 3. rm (로만체) 명령어 상세 분석
print("\n" + "=" * 70)
print("[3] 'rm' 명령어 상세 분석 (핵심!)")
print("=" * 70)

rm_examples = []
for eq in equations:
    if 'rm' in eq.lower():
        rm_examples.append(eq)

print(f"\n'rm' 포함 수식: {len(rm_examples)}개")
print("\n처음 30개 예시:")
for i, eq in enumerate(rm_examples[:30]):
    print(f"  [{i:2d}] {eq}")

# 4. rm 뒤에 오는 내용 분석
print("\n" + "=" * 70)
print("[4] 'rm' 뒤의 내용 패턴 분석")
print("=" * 70)

rm_contents = []
for eq in equations:
    found = re.findall(r'\brm\s+(\S+)', eq)
    rm_contents.extend(found)

rm_content_counts = Counter(rm_contents)
print(f"\n'rm' 뒤의 내용 종류: {len(rm_content_counts)}")
print("\n상위 20개:")
for content, count in rm_content_counts.most_common(20):
    print(f"  rm {content:20s}: {count:4d}회")

# 5. 전체 수식 샘플 출력
print("\n" + "=" * 70)
print("[5] 전체 수식 샘플 (처음 50개)")
print("=" * 70)

for i, eq in enumerate(equations[:50]):
    print(f"  [{i:2d}] {eq}")

# 6. 숫자 보기 패턴 분석
print("\n" + "=" * 70)
print("[6] 답안 보기 패턴 (①②③④⑤ 관련)")
print("=" * 70)

# 원문자 주변 컨텍스트 찾기
choice_pattern = re.compile(r'[①②③④⑤][^①②③④⑤]*')
all_text = ''.join(root.itertext())
choices = choice_pattern.findall(all_text)[:20]

print(f"\n원문자 주변 텍스트 샘플:")
for i, choice in enumerate(choices):
    preview = choice[:80].replace('\n', ' ')
    print(f"  [{i:2d}] {preview}")
