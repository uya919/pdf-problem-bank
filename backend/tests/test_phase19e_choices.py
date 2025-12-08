# -*- coding: utf-8 -*-
"""
Phase 19-E: 선택지 추출 테스트
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.hangul import HMLParser

TEST_FILE = r"C:\MYCLAUDE_PROJECT\pdf\.claude\내신 2024년 인천 미추홀구 인화여고 고1 공통 1학기기말 수학상.Hml"


def test_choices():
    """선택지 추출 테스트"""
    parser = HMLParser(TEST_FILE)
    result = parser.parse()

    print("=" * 60)
    print("Phase 19-E: 선택지 추출 테스트")
    print("=" * 60)

    issues = []
    good = 0

    # 전체 문제 확인
    for i, p in enumerate(result.problems):
        num = i + 1
        text = p.content_text

        # 선택지 기호 개수
        choice_symbols = [c for c in '①②③④⑤' if c in text]
        choice_count = len(choice_symbols)

        # 숫자 병합 확인 (두 자리 숫자가 붙어있는 경우)
        has_merged = any(x in text for x in [
            '101112', '1112', '1213', '1314', '1415',  # 연속 두자리
            '678', '789', '910',  # 연속 한자리
            '①②', '②③', '③④', '④⑤'  # 기호 붙음
        ])

        # 기호 앞뒤 공백 확인
        has_spacing = True
        for sym in '①②③④⑤':
            if sym in text:
                idx = text.find(sym)
                # 기호 뒤에 공백 또는 숫자가 있어야 함
                if idx + 1 < len(text):
                    next_char = text[idx + 1]
                    if next_char not in ' 0123456789√(':
                        has_spacing = False

        problem_ok = choice_count >= 3 and not has_merged

        if problem_ok:
            good += 1
            status = "OK"
        else:
            status = "ISSUE"
            if choice_count < 3:
                issues.append(f"문제 {num}: 선택지 {choice_count}개만 발견")
            if has_merged:
                issues.append(f"문제 {num}: 숫자 병합됨")

        # 처음 80자 미리보기
        preview = text[:80].replace('\n', ' ')
        print(f"{num:2d}. [{status}] 선택지:{choice_count} | {preview}...")

    print()
    print("=" * 60)
    print(f"결과: {good}/{len(result.problems)} 문제 선택지 정상")
    print("=" * 60)

    if issues:
        print("\n문제점:")
        for issue in issues[:10]:  # 최대 10개만 표시
            print(f"  - {issue}")

    # 회귀 테스트: 문제 본문 확인
    print("\n[회귀 테스트] 문제 본문 확인:")
    p1 = result.problems[0]
    has_header = '내신' in p1.content_text or '인화여고' in p1.content_text
    print(f"  헤더 포함: {'YES - 문제' if has_header else 'NO - OK'}")

    return {
        'good': good,
        'total': len(result.problems),
        'issues': issues
    }


if __name__ == '__main__':
    test_choices()
