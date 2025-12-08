# -*- coding: utf-8 -*-
"""
Phase 19-G 문제 조사 스크립트
"""
import re
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.hangul.hml_parser import clean_hwp_equation
from app.services.hangul.hwp_latex_converter import hwp_to_latex

# 1. HML 파일에서 overline 패턴 찾기
print("=" * 60)
print("1. HML 파일에서 overline 패턴 찾기")
print("=" * 60)

file_path = r'C:\MYCLAUDE_PROJECT\pdf\.claude\내신 2024년 인천 미추홀구 인화여고 고1 공통 1학기기말 수학상.Hml'
try:
    with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()

    # overline 패턴 찾기
    patterns = re.findall(r'overline[^\<]{0,100}', content)
    print(f"overline 패턴 발견: {len(patterns)}개")
    for i, p in enumerate(patterns[:5]):
        print(f"  {i+1}. {repr(p[:80])}")
except Exception as e:
    print(f"파일 읽기 오류: {e}")

# 2. 변환 함수 직접 테스트
print("\n" + "=" * 60)
print("2. 변환 함수 직접 테스트")
print("=" * 60)

test_cases = [
    "overline{{rm{AB}} it }= overline{{rm{BC}} it }",
    "overline{AB}",
    "overline{{rm{AB}}}",
    "{rm{AB}}",
    "{{rm{AB}} it }",
]

for tc in test_cases:
    plain = clean_hwp_equation(tc)
    latex = hwp_to_latex(tc)
    print(f"\n입력: {tc}")
    print(f"  Plain: {plain}")
    print(f"  LaTeX: {latex}")

# 3. 모듈 로드 상태 확인
print("\n" + "=" * 60)
print("3. 모듈 로드 상태")
print("=" * 60)

from app.services.hangul import hml_parser, hwp_latex_converter
print(f"hml_parser 모듈 경로: {hml_parser.__file__}")
print(f"hwp_latex_converter 모듈 경로: {hwp_latex_converter.__file__}")

# hml_parser.py에서 Phase 19-G 패턴 확인
with open(hml_parser.__file__, 'r', encoding='utf-8') as f:
    content = f.read()
    if 'Phase 19-G' in content:
        print("hml_parser.py: Phase 19-G 패턴 존재함 ✓")
    else:
        print("hml_parser.py: Phase 19-G 패턴 없음 ✗")

# hwp_latex_converter.py에서 _convert_decorations 확인
with open(hwp_latex_converter.__file__, 'r', encoding='utf-8') as f:
    content = f.read()
    if '_convert_decorations' in content:
        print("hwp_latex_converter.py: _convert_decorations 함수 존재함 ✓")
    else:
        print("hwp_latex_converter.py: _convert_decorations 함수 없음 ✗")

    if 'overline' in content:
        print("hwp_latex_converter.py: overline 패턴 존재함 ✓")
    else:
        print("hwp_latex_converter.py: overline 패턴 없음 ✗")

print("\n" + "=" * 60)
print("조사 완료")
print("=" * 60)
