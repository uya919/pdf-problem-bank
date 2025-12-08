# -*- coding: utf-8 -*-
"""
실제 HML 파일에서 발견된 패턴 테스트
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.hangul.hwp_latex_converter import hwp_to_latex
from app.services.hangul.hml_parser import clean_hwp_equation

print("=" * 60)
print("실제 HML 파일 패턴 테스트")
print("=" * 60)

# 실제 HML에서 추출된 수식들 (content_equations에서)
actual_equations = [
    "{rm{A}} it",
    "{rm{B}} it",
    "overline{{rm{AB}} it }= overline{{rm{BC}} it }`",
    "rm A it LEFT (a,`` b RIGHT )`",
]

print("\n=== content_equations 원본 패턴 테스트 ===")
for eq in actual_equations:
    latex = hwp_to_latex(eq)
    plain = clean_hwp_equation(eq)
    print(f"입력: {repr(eq)}")
    print(f"  LaTeX: {repr(latex)}")
    print(f"  Plain: {repr(plain)}")

    # 체크
    raw_patterns = [
        "overline{{rm{",
        "{rm{",
        "}} it",
    ]
    has_raw = any(p in latex for p in raw_patterns)
    print(f"  원본패턴 남음: {'YES ❌' if has_raw else 'NO ✓'}")
    print()

# 중요: overline{{rm{AB}} it } 패턴 집중 테스트
print("\n=== overline 복합 패턴 집중 테스트 ===")
overline_tests = [
    # (입력, 기대 결과 포함 문자열)
    ("overline{{rm{AB}} it }", "\\overline"),  # 기본 패턴
    ("overline{{rm{AB}} it }= overline{{rm{BC}} it }", "\\overline"),  # 등호 포함
    ("overline{{rm{AB}}}",  "\\overline"),  # it 없음
    ("overline{{rm{AB}} }", "\\overline"),  # it 없고 공백만
]

for test_input, expected in overline_tests:
    result = hwp_to_latex(test_input)
    ok = expected in result and "overline{{rm{" not in result
    status = "OK ✓" if ok else "FAIL ❌"
    print(f"[{status}] {test_input}")
    print(f"  결과: {result}")
    if not ok:
        print(f"  기대: {expected}")
    print()

# 문제점 분석
print("\n=== 문제점 분석 ===")
test_eq = "overline{{rm{AB}} it }= overline{{rm{BC}} it }"
print(f"테스트 입력: {test_eq}")

# 단계별 변환
import re

text = test_eq

# 1. 전처리 (백틱 → 공백)
text_step1 = text.replace('`', ' ').replace('~', ' ')
print(f"1. 전처리 후: {repr(text_step1)}")

# 2. _convert_decorations 패턴
# deco{{rm{ABC}} it } → \deco{\mathrm{ABC}}
pattern = r'\boverline\s*\{\{rm\{([^}]*)\}\}\s*it\s*\}'
matches = list(re.finditer(pattern, text_step1))
print(f"2. 패턴 매칭: {len(matches)}개")
for m in matches:
    print(f"   매칭: {repr(m.group())} -> 캡처: {m.group(1)}")

# 문제 확인: 등호(=) 뒤에도 같은 패턴이 있는지
if len(matches) < 2:
    print("\n!!! 문제 발견: 패턴이 2개 매칭되어야 하는데 1개만 매칭됨")
    print("이유 분석...")

    # 두 번째 overline 패턴 찾기
    second_pattern = r'overline\{\{rm\{[^}]*\}\}'
    second_matches = list(re.finditer(second_pattern, text_step1))
    print(f"   두 번째 패턴 검색: {len(second_matches)}개")
    for m in second_matches:
        print(f"   매칭: {repr(m.group())}")
