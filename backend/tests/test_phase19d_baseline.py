# -*- coding: utf-8 -*-
"""
Phase 19-D: 기준 테스트 (Baseline Test)
개발 전 현재 상태를 기록하여 회귀 방지
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.hangul import HMLParser

# 테스트 파일 경로
TEST_FILE = r"C:\MYCLAUDE_PROJECT\pdf\.claude\내신 2024년 인천 미추홀구 인화여고 고1 공통 1학기기말 수학상.Hml"


def test_baseline():
    """현재 상태 기준 테스트"""
    parser = HMLParser(TEST_FILE)
    result = parser.parse()

    print("=" * 60)
    print("Phase 19-D Baseline Test")
    print("=" * 60)

    # 1. 문제 개수
    print(f"\n[1] 문제 개수: {len(result.problems)}")
    assert len(result.problems) >= 20, "문제가 20개 이상이어야 함"

    # 2. 첫 번째 문제 상세
    p1 = result.problems[0]
    print(f"\n[2] 문제 1 상세:")
    print(f"    번호: {p1.number}")
    print(f"    정답: {p1.answer}")
    print(f"    정답유형: {p1.answer_type}")
    print(f"    본문(처음 100자): {p1.content_text[:100]}...")
    print(f"    LaTeX(처음 100자): {p1.content_latex[:100]}...")

    # 3. LaTeX 변환 확인
    has_latex = '$' in p1.content_latex
    print(f"\n[3] LaTeX 변환: {'OK' if has_latex else 'NO'}")

    # 4. 현재 문제점 기록
    print(f"\n[4] 현재 문제점:")
    issues = []
    if '내신' in p1.content_text or '인화여고' in p1.content_text:
        issues.append("- 헤더 정보 포함됨")
    if '수학영역수학영역' in p1.content_text or p1.content_text.count('수학영역') > 2:
        issues.append("- '수학영역' 반복됨")
    if '사각형입니다' in p1.content_text or '선입니다' in p1.content_text:
        issues.append("- HWP 개체 대체 텍스트 포함")
    if not p1.content_text.startswith(('부등식', '방정식', '점', '함수', '두', '세', '실수')):
        issues.append("- 문제 키워드로 시작하지 않음")

    for issue in issues:
        print(f"    {issue}")

    if not issues:
        print("    (문제 없음)")

    # 5. 정답 추출 확인
    answers_ok = sum(1 for p in result.problems if p.answer)
    print(f"\n[5] 정답 있는 문제: {answers_ok}/{len(result.problems)}")

    print("\n" + "=" * 60)
    print("Baseline 기록 완료")
    print("=" * 60)

    return {
        'problem_count': len(result.problems),
        'has_latex': has_latex,
        'issues': issues,
        'answers_count': answers_ok,
    }


if __name__ == '__main__':
    test_baseline()
