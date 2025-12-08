# -*- coding: utf-8 -*-
"""
Phase 20-P: 버그 수정 테스트

버그 A: rm 음수 패턴 (rm - 2 → -2)
버그 B: 마지막 문제 범위 에러 (정답 섹션 포함)
"""
import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.hangul.hwp_latex_converter import hwp_to_latex


# =============================================================================
# 버그 A: rm 음수 패턴 테스트
# =============================================================================

class TestRmNegativePattern:
    """Phase 20-P: rm 음수 패턴 테스트"""

    def test_rm_negative_2(self):
        """rm - 2 → -2 (음수 변환)"""
        result = hwp_to_latex('rm - 2')
        assert '-2' in result
        assert 'rm' not in result.lower()

    def test_rm_negative_1(self):
        """rm - 1 → -1 (음수 변환)"""
        result = hwp_to_latex('rm - 1')
        assert '-1' in result
        assert 'rm' not in result.lower()

    def test_rm_negative_10(self):
        """rm - 10 → -10 (두 자리 음수)"""
        result = hwp_to_latex('rm - 10')
        assert '-10' in result
        assert 'rm' not in result.lower()

    def test_rm_negative_no_space(self):
        """rm -3 → -3 (공백 없이)"""
        result = hwp_to_latex('rm -3')
        assert '-3' in result
        assert 'rm' not in result.lower()

    # 기존 동작 유지 테스트 (회귀 방지)
    def test_rm_letter_unchanged(self):
        """rm A → \\mathrm{A} (기존 동작 유지)"""
        result = hwp_to_latex('rm A')
        assert r'\mathrm{A}' in result

    def test_rm_word_unchanged(self):
        """rm ABC → \\mathrm{ABC} (기존 동작 유지)"""
        result = hwp_to_latex('rm ABC')
        assert r'\mathrm{ABC}' in result

    def test_rm_number_positive(self):
        """rm 123 → \\mathrm{123} (양수는 mathrm)"""
        result = hwp_to_latex('rm 123')
        assert r'\mathrm{123}' in result

    def test_rm_mixed(self):
        """rm A2 → \\mathrm{A2} (혼합)"""
        result = hwp_to_latex('rm A2')
        assert r'\mathrm{A2}' in result


# =============================================================================
# 버그 B: 정답 섹션 제거 테스트
# =============================================================================

class TestAnswerSectionRemoval:
    """Phase 20-P: 정답 섹션 패턴 제거 테스트"""

    def test_remove_quick_answer_pattern(self):
        """(빠른 정답) 패턴 제거"""
        from app.services.hangul.hml_parser import HMLParser

        # HMLParser의 _clean_problem_content 직접 테스트
        parser = HMLParser.__new__(HMLParser)  # __init__ 없이 인스턴스 생성

        content = "쓰시오. (빠른 정답)2025.10.28"
        cleaned = parser._clean_problem_content(content)
        assert '빠른 정답' not in cleaned
        assert '2025.10.28' not in cleaned

    def test_remove_quick_answer_with_space(self):
        """(빠른 정답) 공백 포함 패턴 제거"""
        from app.services.hangul.hml_parser import HMLParser

        parser = HMLParser.__new__(HMLParser)

        content = "쓰시오. (빠른 정답) 2025.10.28"
        cleaned = parser._clean_problem_content(content)
        assert '빠른 정답' not in cleaned

    def test_preserve_normal_content(self):
        """일반 내용 보존 (정답 패턴 없음)"""
        from app.services.hangul.hml_parser import HMLParser

        parser = HMLParser.__new__(HMLParser)

        content = "삼각형 OAP의 넓이를 구하시오."
        cleaned = parser._clean_problem_content(content)
        assert '넓이' in cleaned
        assert '구하시오' in cleaned


# =============================================================================
# Phase 20-P: HMLParser rm 패턴 수정 테스트 (근본 원인 수정)
# =============================================================================

class TestHmlParserRmNegativeFix:
    """Phase 20-P/20-P-2: HMLParser._fix_rm_patterns_in_latex() 테스트"""

    def test_fix_rm_negative_in_latex_space(self):
        """rm - 2 → -2 (공백 포함)"""
        from app.services.hangul.hml_parser import HMLParser

        parser = HMLParser.__new__(HMLParser)
        result = parser._fix_rm_patterns_in_latex('① -3 ② rm - 2 ③ rm - 1')
        assert 'rm' not in result
        assert '-2' in result
        assert '-1' in result

    def test_fix_rm_negative_in_latex_no_space(self):
        """rm -3 → -3 (공백 없이)"""
        from app.services.hangul.hml_parser import HMLParser

        parser = HMLParser.__new__(HMLParser)
        result = parser._fix_rm_patterns_in_latex('값은 rm -5이다')
        assert 'rm' not in result
        assert '-5' in result

    def test_fix_preserves_mathrm(self):
        """\\mathrm{...}은 보존 (rm이 아닌 경우)"""
        from app.services.hangul.hml_parser import HMLParser

        parser = HMLParser.__new__(HMLParser)
        # mathrm은 변경 X (단어 경계 \b 덕분)
        result = parser._fix_rm_patterns_in_latex(r'\mathrm{A} + rm - 2')
        assert r'\mathrm{A}' in result
        assert '-2' in result


# =============================================================================
# 통합 테스트: 실제 파일 파싱
# =============================================================================

class TestIntegration:
    """Phase 20-P: 실제 파일 통합 테스트"""

    TEST_FILE = r"C:\MYCLAUDE_PROJECT\pdf\.claude\내신 2024년 인천 미추홀구 인화여고 고1 공통 1학기기말 수학상.Hml"

    @pytest.mark.skipif(
        not os.path.exists(r"C:\MYCLAUDE_PROJECT\pdf\.claude\내신 2024년 인천 미추홀구 인화여고 고1 공통 1학기기말 수학상.Hml"),
        reason="테스트 파일 없음"
    )
    def test_problem_8_no_rm_error(self):
        """문제 8: rm 에러 없음"""
        from app.services.hangul import HMLParser

        parser = HMLParser(self.TEST_FILE)
        result = parser.parse()

        # 문제 8 찾기 (0-indexed: 7)
        problem_8 = None
        for p in result.problems:
            if p.number == 8:
                problem_8 = p
                break

        if problem_8:
            # rm 이 남아있으면 안됨
            assert 'rm -' not in problem_8.content_latex
            assert 'rm - ' not in problem_8.content_latex

    @pytest.mark.skipif(
        not os.path.exists(r"C:\MYCLAUDE_PROJECT\pdf\.claude\내신 2024년 인천 미추홀구 인화여고 고1 공통 1학기기말 수학상.Hml"),
        reason="테스트 파일 없음"
    )
    def test_problem_21_no_answer_section(self):
        """문제 21: 정답 섹션 미포함"""
        from app.services.hangul import HMLParser

        parser = HMLParser(self.TEST_FILE)
        result = parser.parse()

        # 마지막 문제 (문제 21)
        last_problem = result.problems[-1]

        # 정답 섹션 텍스트가 없어야 함
        assert '빠른 정답' not in last_problem.content_text
        assert '빠른 정답' not in last_problem.content_latex


# =============================================================================
# Phase 20-P-2: RM 대문자 패턴 테스트
# =============================================================================

class TestRmUppercasePattern:
    """Phase 20-P-2: RM 대문자 패턴 테스트"""

    def test_rm_uppercase_letter(self):
        """RM A → \\mathrm{A} (대문자 RM)"""
        result = hwp_to_latex('RM A')
        assert r'\mathrm{A}' in result
        assert 'RM ' not in result

    def test_rm_uppercase_multiple_letters(self):
        """RM ABC → \\mathrm{ABC} (대문자 RM + 복수 문자)"""
        result = hwp_to_latex('RM ABC')
        assert r'\mathrm{ABC}' in result

    def test_rm_uppercase_negative(self):
        """RM - 2 → -2 (대문자 RM 음수)"""
        result = hwp_to_latex('RM - 2')
        assert '-2' in result
        assert 'RM' not in result

    def test_rm_mixed_case_Rm(self):
        """Rm A → \\mathrm{A} (혼합 대소문자)"""
        result = hwp_to_latex('Rm A')
        assert r'\mathrm{A}' in result

    def test_rm_mixed_case_rM(self):
        """rM A → \\mathrm{A} (혼합 대소문자)"""
        result = hwp_to_latex('rM A')
        assert r'\mathrm{A}' in result


class TestHmlParserRmUppercaseFix:
    """Phase 20-P-2: HMLParser RM 대문자 수정 테스트"""

    def test_fix_rm_uppercase_in_latex(self):
        """RM A → \\mathrm{A} (HMLParser 메서드)"""
        from app.services.hangul.hml_parser import HMLParser
        parser = HMLParser.__new__(HMLParser)
        result = parser._fix_rm_patterns_in_latex('점 RM A의 좌표')
        assert 'RM ' not in result
        assert r'\mathrm{A}' in result

    def test_fix_rm_uppercase_negative_in_latex(self):
        """RM - 2 → -2 (HMLParser 메서드)"""
        from app.services.hangul.hml_parser import HMLParser
        parser = HMLParser.__new__(HMLParser)
        result = parser._fix_rm_patterns_in_latex('값은 RM - 2이다')
        assert 'RM' not in result
        assert '-2' in result


# =============================================================================
# 통합 테스트: 문제 16 검증
# =============================================================================

class TestIntegrationProblem16:
    """Phase 20-P-2: 문제 16 RM 에러 통합 테스트"""

    TEST_FILE = r"C:\MYCLAUDE_PROJECT\pdf\.claude\내신 2024년 인천 미추홀구 인화여고 고1 공통 1학기기말 수학상.Hml"

    @pytest.mark.skipif(
        not os.path.exists(r"C:\MYCLAUDE_PROJECT\pdf\.claude\내신 2024년 인천 미추홀구 인화여고 고1 공통 1학기기말 수학상.Hml"),
        reason="테스트 파일 없음"
    )
    def test_problem_16_no_rm_uppercase_error(self):
        """문제 16: RM 대문자 에러 없음"""
        from app.services.hangul import HMLParser

        parser = HMLParser(self.TEST_FILE)
        result = parser.parse()

        # 문제 16 찾기
        problem_16 = None
        for p in result.problems:
            if p.number == 16:
                problem_16 = p
                break

        if problem_16:
            # RM A 패턴이 남아있으면 안됨
            assert 'RM A' not in problem_16.content_latex
            assert 'RM ' not in problem_16.content_latex


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
