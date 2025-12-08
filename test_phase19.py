"""
Phase 19 테스트: HML 파싱 개선 검증
"""
import sys
import os

# 백엔드 패키지 경로 추가
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.services.hangul.hml_parser import HMLParser, clean_hwp_equation
from app.services.hangul.problem_extractor import ProblemExtractor

# 테스트 1: HWP 수식 변환 테스트
print("=" * 60)
print("[테스트 1] HWP 수식 → 텍스트 변환")
print("=" * 60)

test_equations = [
    ("rm 1", "1"),
    ("rm 2", "2"),
    ("rm A it LEFT (-1, 2 RIGHT )", "A (-1, 2)"),
    ("LEFT | x-5 RIGHT | < 3", "|x-5| < 3"),
    ("2 x+1 leq 5 leq x+a", "2 x+1 ≤ 5 ≤ x+a"),
    ("{5} over {4}", "(5)/(4)"),
    ("sqrt{2}", "√(2)"),
    ("rm ABC", "ABC"),
]

for eq_input, expected in test_equations:
    result = clean_hwp_equation(eq_input)
    status = "PASS" if result == expected else "FAIL"
    print(f"  [{status}] '{eq_input}' -> '{result}' (expected: '{expected}')")

# 테스트 2: HML 파일 파싱
print("\n" + "=" * 60)
print("[테스트 2] HML 파일 파싱")
print("=" * 60)

file_path = r'C:\MYCLAUDE_PROJECT\pdf\.claude\내신 2024년 인천 미추홀구 인화여고 고1 공통 1학기기말 수학상.Hml'

try:
    parser = HMLParser(file_path)
    result = parser.parse()

    print(f"  파싱 성공: {result.success}")
    print(f"  검출된 문제 수: {len(result.problems)}")

    if result.errors:
        print(f"  오류: {result.errors}")

    if result.problems:
        print(f"\n  처음 5개 문제:")
        for i, prob in enumerate(result.problems[:5]):
            print(f"    [{i+1}] 번호: {prob.number}")
            print(f"        정답: {prob.answer or '없음'}")
            print(f"        배점: {prob.points or '없음'}")
            # 내용 미리보기 (처음 100자)
            content_preview = prob.content_text[:100] if prob.content_text else ""
            content_preview = content_preview.replace('\n', ' ')
            print(f"        내용: {content_preview}...")
            print()
except Exception as e:
    print(f"  오류 발생: {e}")
    import traceback
    traceback.print_exc()

# 테스트 3: 문제 패턴 감지
print("\n" + "=" * 60)
print("[테스트 3] 문서 패턴 감지")
print("=" * 60)

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    extractor = ProblemExtractor()
    pattern = extractor._detect_document_pattern(content)
    print(f"  감지된 패턴: {pattern}")

    # [출제의도] 개수
    import re
    purpose_count = len(re.findall(r'\[출제의도\]', content))
    print(f"  [출제의도] 개수: {purpose_count}")

except Exception as e:
    print(f"  오류: {e}")

print("\n" + "=" * 60)
print("테스트 완료")
print("=" * 60)
