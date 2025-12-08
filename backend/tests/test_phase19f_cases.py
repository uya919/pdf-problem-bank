# -*- coding: utf-8 -*-
"""
Phase 19-F: cases 구조 변환 테스트
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.hangul.hml_parser import clean_hwp_equation
from app.services.hangul.hwp_latex_converter import hwp_to_latex


def test_cases_plain_text():
    """cases → plain text 변환 테스트"""
    test_cases = [
        # (입력, 기대 포함 문자열)
        (
            "{cases{x GEQ 0#y LEQ 0}}",
            "/"  # 행 구분자가 /로 변환되었는지
        ),
        (
            "{cases{x+y=5#x-y=1}}",
            "{ x+y=5 / x-y=1 }"
        ),
        (
            "{cases{A#B#C}}",
            "{ A / B / C }"
        ),
        (
            "{cases{``x ^{2} -2x-3 GEQ 0#``x ^{2} - LEFT (a+5 RIGHT )x+5a<0}}",
            "/"  # 복잡한 연립부등식도 / 구분자 포함
        ),
    ]

    print("=" * 60)
    print("Phase 19-F: cases → plain text 테스트")
    print("=" * 60)

    success = 0
    for hwp_input, expected in test_cases:
        result = clean_hwp_equation(hwp_input)
        # cases 패턴이 사라졌는지 확인
        no_cases = "{cases{" not in result
        has_expected = expected in result

        if no_cases and has_expected:
            status = "OK"
            success += 1
        else:
            status = "FAIL"

        print(f"[{status}] {hwp_input[:40]}...")
        if status == "FAIL":
            print(f"  기대 포함: {expected}")
            print(f"  결과: {result}")
            print(f"  cases 제거: {no_cases}")

    print(f"\n결과: {success}/{len(test_cases)} 성공")
    return success == len(test_cases)


def test_cases_latex():
    """cases → LaTeX 변환 테스트"""
    test_cases = [
        # (입력, 기대 포함 문자열)
        (
            "{cases{x GEQ 0#y LEQ 0}}",
            "\\begin{cases}"
        ),
        (
            "{cases{x+y=5#x-y=1}}",
            "\\end{cases}"
        ),
        (
            "{cases{A#B#C}}",
            "\\\\"  # 행 구분자가 \\로 변환되었는지
        ),
    ]

    print("\n" + "=" * 60)
    print("Phase 19-F: cases → LaTeX 테스트")
    print("=" * 60)

    success = 0
    for hwp_input, expected in test_cases:
        result = hwp_to_latex(hwp_input)
        # cases 패턴이 LaTeX로 변환되었는지 확인
        no_cases = "{cases{" not in result
        has_expected = expected in result

        if no_cases and has_expected:
            status = "OK"
            success += 1
        else:
            status = "FAIL"

        print(f"[{status}] {hwp_input[:40]}...")
        if status == "FAIL":
            print(f"  기대 포함: {expected}")
            print(f"  결과: {result}")

    print(f"\n결과: {success}/{len(test_cases)} 성공")
    return success == len(test_cases)


def test_deg_conversion():
    """DEG 변환 테스트"""
    print("\n" + "=" * 60)
    print("Phase 19-F: DEG 변환 테스트")
    print("=" * 60)

    # Plain text 테스트
    plain_tests = [
        ("90 DEG", "°"),
        ("ANGLE A = 30 DEG", "∠"),
    ]

    success = 0
    for hwp_input, expected in plain_tests:
        result = clean_hwp_equation(hwp_input)
        if expected in result:
            status = "OK"
            success += 1
        else:
            status = "FAIL"
        print(f"[{status}] Plain: {hwp_input} → {result}")

    # LaTeX 테스트
    latex_tests = [
        ("90 DEG", "circ"),  # ^{\circ}
    ]

    for hwp_input, expected in latex_tests:
        result = hwp_to_latex(hwp_input)
        if expected in result:
            status = "OK"
            success += 1
        else:
            status = "FAIL"
        print(f"[{status}] LaTeX: {hwp_input} → {result}")

    total = len(plain_tests) + len(latex_tests)
    print(f"\n결과: {success}/{total} 성공")
    return success == total


def test_complex_equation():
    """실제 문제 15번 수식 테스트"""
    print("\n" + "=" * 60)
    print("Phase 19-F: 복잡한 연립부등식 테스트")
    print("=" * 60)

    # 실제 HML 파일에서 추출한 수식
    hwp_input = "{cases{``x ^{2} -2x-3 GEQ 0#``x ^{2} - LEFT (a+5 RIGHT )x+5a<0}}"

    # Plain text 변환
    plain_result = clean_hwp_equation(hwp_input)
    plain_ok = "{cases{" not in plain_result and "/" in plain_result

    # LaTeX 변환
    latex_result = hwp_to_latex(hwp_input)
    latex_ok = "\\begin{cases}" in latex_result and "\\end{cases}" in latex_result

    print(f"입력: {hwp_input[:50]}...")
    print(f"\nPlain Text 결과:")
    print(f"  {plain_result}")
    print(f"  상태: {'OK' if plain_ok else 'FAIL'}")

    print(f"\nLaTeX 결과:")
    print(f"  {latex_result}")
    print(f"  상태: {'OK' if latex_ok else 'FAIL'}")

    return plain_ok and latex_ok


if __name__ == '__main__':
    results = []
    results.append(("cases → plain text", test_cases_plain_text()))
    results.append(("cases → LaTeX", test_cases_latex()))
    results.append(("DEG 변환", test_deg_conversion()))
    results.append(("복잡한 연립부등식", test_complex_equation()))

    print("\n" + "=" * 60)
    print("Phase 19-F: 최종 결과")
    print("=" * 60)
    all_passed = True
    for name, passed in results:
        status = "PASS" if passed else "FAIL"
        print(f"  [{status}] {name}")
        if not passed:
            all_passed = False

    print(f"\n전체: {'모두 통과' if all_passed else '일부 실패'}")
