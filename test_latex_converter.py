"""
Phase 19-C 테스트: HWP → LaTeX 변환기 검증
"""
import sys
import os

# 백엔드 패키지 경로 추가
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.services.hangul.hwp_latex_converter import hwp_to_latex, HwpLatexConverter

print("=" * 70)
print("Phase 19-C: HWP → LaTeX 변환기 테스트")
print("=" * 70)

# 테스트 케이스: (HWP 수식, 기대 결과 설명)
test_cases = [
    # 1. 절댓값 (문제 1번)
    ("LEFT | x-5 RIGHT | <3", "절댓값 |x-5| < 3"),

    # 2. 부등식 범위
    ("a<x<8", "부등식 범위 a < x < 8"),

    # 3. rm (직립체)
    ("rm A", "직립체 A → \\mathrm{A}"),
    ("rm ABC", "직립체 ABC → \\mathrm{ABC}"),

    # 4. 좌표 표기
    ("rm A it LEFT (-1, 2 RIGHT )", "점 A(-1, 2)"),

    # 5. leq/geq (비교연산자)
    ("2x+1 leq 5 leq x+a", "연쇄부등식 ≤"),
    ("x geq 3", "x ≥ 3"),

    # 6. 분수
    ("{5} over {4}", "분수 5/4 → \\frac{5}{4}"),
    ("-{5} over {4}", "음의 분수 -5/4"),

    # 7. 제곱근
    ("sqrt{2}", "제곱근 √2"),
    ("sqrt{x+1}", "제곱근 √(x+1)"),

    # 8. 위첨자/아래첨자
    ("x^2", "x의 제곱"),
    ("x SUP 2", "x의 제곱 (SUP)"),
    ("a SUB 1", "a₁ (SUB)"),

    # 9. 그리스 문자
    ("alpha + beta", "α + β"),
    ("DELTA x", "Δx"),

    # 10. 혼합 수식
    ("rm A it LEFT ( alpha , beta RIGHT )", "점 A(α, β)"),

    # 11. 삼각함수
    ("sin theta", "sin θ"),
    ("cos^2 x + sin^2 x = 1", "삼각함수 항등식"),

    # 12. 백틱(thin space) 처리
    ("LEFT |  `x-5 ` RIGHT | <3`", "백틱 포함 수식"),

    # 13. pm (플러스마이너스)
    ("x = 3 pm 2", "x = 3 ± 2"),

    # 14. times (곱셈)
    ("2 times 3", "2 × 3"),
]

print("\n" + "-" * 70)
print("변환 결과")
print("-" * 70)

success_count = 0
for i, (hwp_eq, description) in enumerate(test_cases, 1):
    try:
        latex = hwp_to_latex(hwp_eq)
        print(f"\n[{i:2d}] {description}")
        print(f"     HWP:   {hwp_eq}")
        print(f"     LaTeX: {latex}")
        success_count += 1
    except Exception as e:
        print(f"\n[{i:2d}] {description} - ERROR!")
        print(f"     HWP:   {hwp_eq}")
        print(f"     Error: {e}")

print("\n" + "=" * 70)
print(f"결과: {success_count}/{len(test_cases)} 성공")
print("=" * 70)

# 실제 HML 파일에서 추출한 수식 테스트
print("\n" + "-" * 70)
print("실제 HML 파일 수식 테스트 (인화여고)")
print("-" * 70)

# 실제 HML 파일에서 가져온 수식들
real_equations = [
    "LEFT |  `x-5 ` RIGHT | <3`",  # 1번 문제
    "a<x<8`",  # 1번 문제 해
    "rm 1",  # 보기 번호
    "rm 2",
    "rm 3",
    "rm 4",
    "rm 5",
    "{5} over {4}",  # 분수
    "sqrt{2}",
    "2 x+1  leq 5  leq x+a`",
]

for eq in real_equations:
    latex = hwp_to_latex(eq)
    print(f"  HWP: {eq:40s} → LaTeX: {latex}")
