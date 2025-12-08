# -*- coding: utf-8 -*-
"""
Phase 19-G: 장식 기호 및 중괄호 패턴 변환 테스트
- overline, bar, hat, vec, dot, tilde 등 장식 기호
- {rm{...}}, {{rm{...}} it } 중괄호 패턴
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.hangul.hml_parser import clean_hwp_equation
from app.services.hangul.hwp_latex_converter import hwp_to_latex


def test_overline_latex():
    """overline → LaTeX 변환 테스트"""
    test_cases = [
        # (입력, 기대 포함 문자열)
        ("overline{AB}", "\\overline{"),
        ("overline{x}", "\\overline{x}"),
        ("overline{ AB }", "\\overline{"),
    ]

    print("=" * 60)
    print("Phase 19-G: overline → LaTeX 테스트")
    print("=" * 60)

    success = 0
    for hwp_input, expected in test_cases:
        result = hwp_to_latex(hwp_input)
        # overline 명령어가 LaTeX로 변환되었는지
        no_raw = "overline{" not in result or "\\overline{" in result
        has_expected = expected in result

        if has_expected:
            status = "OK"
            success += 1
        else:
            status = "FAIL"

        print(f"[{status}] {hwp_input}")
        print(f"  → {result}")
        if status == "FAIL":
            print(f"  기대 포함: {expected}")

    print(f"\n결과: {success}/{len(test_cases)} 성공")
    return success == len(test_cases)


def test_bar_latex():
    """bar → LaTeX 변환 테스트"""
    test_cases = [
        ("bar{x}", "\\bar{x}"),
        ("bar{AB}", "\\bar{"),
        ("bar{ x }", "\\bar{"),
    ]

    print("\n" + "=" * 60)
    print("Phase 19-G: bar → LaTeX 테스트")
    print("=" * 60)

    success = 0
    for hwp_input, expected in test_cases:
        result = hwp_to_latex(hwp_input)
        has_expected = expected in result

        if has_expected:
            status = "OK"
            success += 1
        else:
            status = "FAIL"

        print(f"[{status}] {hwp_input}")
        print(f"  → {result}")
        if status == "FAIL":
            print(f"  기대 포함: {expected}")

    print(f"\n결과: {success}/{len(test_cases)} 성공")
    return success == len(test_cases)


def test_other_decorations_latex():
    """기타 장식 기호 → LaTeX 변환 테스트"""
    test_cases = [
        ("hat{x}", "\\hat{"),
        ("vec{AB}", "\\vec{"),
        ("dot{x}", "\\dot{"),
        ("ddot{x}", "\\ddot{"),
        ("tilde{x}", "\\tilde{"),
        ("underline{ABC}", "\\underline{"),
    ]

    print("\n" + "=" * 60)
    print("Phase 19-G: 기타 장식 기호 → LaTeX 테스트")
    print("=" * 60)

    success = 0
    for hwp_input, expected in test_cases:
        result = hwp_to_latex(hwp_input)
        has_expected = expected in result

        if has_expected:
            status = "OK"
            success += 1
        else:
            status = "FAIL"

        print(f"[{status}] {hwp_input}")
        print(f"  → {result}")
        if status == "FAIL":
            print(f"  기대 포함: {expected}")

    print(f"\n결과: {success}/{len(test_cases)} 성공")
    return success == len(test_cases)


def test_brace_rm_patterns_latex():
    """중괄호 rm 패턴 → LaTeX 변환 테스트"""
    test_cases = [
        # {rm{ABC}} → \mathrm{ABC}
        ("{rm{AB}}", "\\mathrm{AB}"),
        ("{rm{ABC}}", "\\mathrm{ABC}"),
        # {rm{ABC} it } → \mathrm{ABC}
        ("{rm{AB} it }", "\\mathrm{AB}"),
        # {{rm{ABC}} it } → \mathrm{ABC}
        ("{{rm{AB}} it }", "\\mathrm{AB}"),
    ]

    print("\n" + "=" * 60)
    print("Phase 19-G: 중괄호 rm 패턴 → LaTeX 테스트")
    print("=" * 60)

    success = 0
    for hwp_input, expected in test_cases:
        result = hwp_to_latex(hwp_input)
        # rm{ 패턴이 사라지고 \mathrm이 있는지
        no_raw_rm = "{rm{" not in result
        has_expected = expected in result

        if no_raw_rm and has_expected:
            status = "OK"
            success += 1
        else:
            status = "FAIL"

        print(f"[{status}] {hwp_input}")
        print(f"  → {result}")
        if status == "FAIL":
            print(f"  기대 포함: {expected}")
            print(f"  rm 제거: {no_raw_rm}")

    print(f"\n결과: {success}/{len(test_cases)} 성공")
    return success == len(test_cases)


def test_overline_plain_text():
    """overline → plain text 변환 테스트"""
    test_cases = [
        # overline{AB} → (AB) 또는 AB로 변환
        ("overline{AB}", "AB"),  # AB가 포함되어야
        ("overline{x}", "x"),
    ]

    print("\n" + "=" * 60)
    print("Phase 19-G: overline → plain text 테스트")
    print("=" * 60)

    success = 0
    for hwp_input, expected in test_cases:
        result = clean_hwp_equation(hwp_input)
        # overline 명령어가 제거되었는지
        no_overline = "overline{" not in result
        has_expected = expected in result

        if no_overline and has_expected:
            status = "OK"
            success += 1
        else:
            status = "FAIL"

        print(f"[{status}] {hwp_input}")
        print(f"  → {result}")
        if status == "FAIL":
            print(f"  기대 포함: {expected}")
            print(f"  overline 제거: {no_overline}")

    print(f"\n결과: {success}/{len(test_cases)} 성공")
    return success == len(test_cases)


def test_brace_rm_plain_text():
    """중괄호 rm 패턴 → plain text 변환 테스트"""
    test_cases = [
        ("{rm{AB}}", "AB"),
        ("{rm{ABC}}", "ABC"),
        ("{rm{AB} it }", "AB"),
        ("{{rm{AB}} it }", "AB"),
    ]

    print("\n" + "=" * 60)
    print("Phase 19-G: 중괄호 rm 패턴 → plain text 테스트")
    print("=" * 60)

    success = 0
    for hwp_input, expected in test_cases:
        result = clean_hwp_equation(hwp_input)
        # rm 패턴이 제거되었는지
        no_rm = "{rm{" not in result
        has_expected = expected in result

        if no_rm and has_expected:
            status = "OK"
            success += 1
        else:
            status = "FAIL"

        print(f"[{status}] {hwp_input}")
        print(f"  → {result}")
        if status == "FAIL":
            print(f"  기대 포함: {expected}")
            print(f"  rm 제거: {no_rm}")

    print(f"\n결과: {success}/{len(test_cases)} 성공")
    return success == len(test_cases)


def test_problem17_actual_case():
    """문제 17번 실제 케이스 테스트

    원본: overline{{rm{AB}} it }= overline{{rm{BC}} it }
    기대: \\overline{\\mathrm{AB}} = \\overline{\\mathrm{BC}}
    """
    print("\n" + "=" * 60)
    print("Phase 19-G: 문제 17번 실제 케이스 테스트")
    print("=" * 60)

    hwp_input = "overline{{rm{AB}} it }= overline{{rm{BC}} it }"

    # LaTeX 변환
    latex_result = hwp_to_latex(hwp_input)
    latex_ok = (
        "\\overline{" in latex_result and
        "overline{{rm{" not in latex_result  # 원본 패턴 제거됨
    )

    # Plain text 변환
    plain_result = clean_hwp_equation(hwp_input)
    plain_ok = (
        "overline{{rm{" not in plain_result and
        "AB" in plain_result and
        "BC" in plain_result
    )

    print(f"입력: {hwp_input}")
    print(f"\nLaTeX 결과:")
    print(f"  {latex_result}")
    print(f"  상태: {'OK' if latex_ok else 'FAIL'}")
    print(f"  \\overline 포함: {'\\overline{' in latex_result}")

    print(f"\nPlain Text 결과:")
    print(f"  {plain_result}")
    print(f"  상태: {'OK' if plain_ok else 'FAIL'}")

    return latex_ok and plain_ok


def test_combined_overline_rm():
    """overline + rm 복합 패턴 테스트"""
    test_cases = [
        # overline 안에 rm 패턴
        ("overline{{rm{AB}}}", "\\overline{"),
        ("overline{{rm{AB}} it }", "\\overline{"),
    ]

    print("\n" + "=" * 60)
    print("Phase 19-G: overline + rm 복합 패턴 테스트")
    print("=" * 60)

    success = 0
    for hwp_input, expected in test_cases:
        result = hwp_to_latex(hwp_input)
        has_expected = expected in result
        # 원본 패턴이 제거되었는지
        no_raw = "overline{{rm{" not in result

        if has_expected and no_raw:
            status = "OK"
            success += 1
        else:
            status = "FAIL"

        print(f"[{status}] {hwp_input}")
        print(f"  → {result}")
        if status == "FAIL":
            print(f"  기대 포함: {expected}")
            print(f"  원본 패턴 제거: {no_raw}")

    print(f"\n결과: {success}/{len(test_cases)} 성공")
    return success == len(test_cases)


if __name__ == '__main__':
    results = []
    results.append(("overline → LaTeX", test_overline_latex()))
    results.append(("bar → LaTeX", test_bar_latex()))
    results.append(("기타 장식 → LaTeX", test_other_decorations_latex()))
    results.append(("중괄호 rm → LaTeX", test_brace_rm_patterns_latex()))
    results.append(("overline → plain text", test_overline_plain_text()))
    results.append(("중괄호 rm → plain text", test_brace_rm_plain_text()))
    results.append(("문제 17번 실제 케이스", test_problem17_actual_case()))
    results.append(("overline + rm 복합", test_combined_overline_rm()))

    print("\n" + "=" * 60)
    print("Phase 19-G: 최종 결과")
    print("=" * 60)
    all_passed = True
    for name, passed in results:
        status = "PASS" if passed else "FAIL"
        print(f"  [{status}] {name}")
        if not passed:
            all_passed = False

    print(f"\n전체: {'모두 통과' if all_passed else '일부 실패'}")
