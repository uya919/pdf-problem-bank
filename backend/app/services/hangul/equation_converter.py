"""
Phase 17-B: Hancom 수식 스크립트 → LaTeX 변환기

Hancom Equation Script를 LaTeX 형식으로 변환합니다.
"""
import re
from typing import Tuple, List


class HancomToLatexConverter:
    """
    Hancom 수식 스크립트를 LaTeX로 변환하는 클래스

    지원 문법:
    - ^{n}: 위첨자 (지수)
    - _{n}: 아래첨자
    - TIMES: 곱셈 기호 (×)
    - ÷: 나눗셈 기호
    - {a} over {b}: 분수
    - sqrt{a}: 제곱근
    - root{n}of{a}: n제곱근
    - LEFT ( / RIGHT ): 괄호
    - bold{}: 굵은 글씨
    - !=: 같지 않음 (≠)
    - `: 공백
    """

    def __init__(self):
        # 단순 치환 규칙 (순서 중요!)
        self.simple_replacements = [
            # 연산자
            (r'\s*TIMES\s*', r' \\times '),
            (r'÷', r' \\div '),
            (r'!=', r' \\neq '),
            (r'<=', r' \\leq '),
            (r'>=', r' \\geq '),

            # 괄호
            (r'LEFT\s*\(', r'\\left('),
            (r'RIGHT\s*\)', r'\\right)'),
            (r'LEFT\s*\[', r'\\left['),
            (r'RIGHT\s*\]', r'\\right]'),
            (r'LEFT\s*\{', r'\\left\\{'),
            (r'RIGHT\s*\}', r'\\right\\}'),

            # 공백 (backtick)
            (r'`', r'\\,'),

            # 그리스 문자
            (r'\balpha\b', r'\\alpha'),
            (r'\bbeta\b', r'\\beta'),
            (r'\bgamma\b', r'\\gamma'),
            (r'\bdelta\b', r'\\delta'),
            (r'\btheta\b', r'\\theta'),
            (r'\bpi\b', r'\\pi'),
            (r'\bsigma\b', r'\\sigma'),
            (r'\bomega\b', r'\\omega'),

            # 기타 기호
            (r'\binfty\b', r'\\infty'),
            (r'\bpm\b', r'\\pm'),
            (r'\bmp\b', r'\\mp'),
            (r'\bcdot\b', r'\\cdot'),
            (r'\bldots\b', r'\\ldots'),
            (r'\bcdots\b', r'\\cdots'),
        ]

    def convert(self, hancom_script: str) -> str:
        """
        Hancom 수식 스크립트를 LaTeX로 변환

        Args:
            hancom_script: Hancom 수식 스크립트 문자열

        Returns:
            LaTeX 문자열
        """
        if not hancom_script:
            return ''

        result = hancom_script.strip()

        # 1. 복잡한 패턴 먼저 처리 (분수, 루트 등)
        result = self._convert_fractions(result)
        result = self._convert_roots(result)
        result = self._convert_bold(result)

        # 2. 단순 치환
        for pattern, replacement in self.simple_replacements:
            result = re.sub(pattern, replacement, result)

        # 3. 정리
        result = self._cleanup(result)

        return result

    def _convert_fractions(self, text: str) -> str:
        """분수 변환: {a} over {b} → \\frac{a}{b}"""
        # 중첩 괄호를 처리하기 위한 반복
        max_iterations = 20
        for _ in range(max_iterations):
            # 가장 안쪽의 {내용} over {내용} 패턴부터 찾기
            # 내부에 over가 없는 단순 패턴
            pattern = r'\{([^{}]*)\}\s*over\s*\{([^{}]*)\}'
            match = re.search(pattern, text)
            if not match:
                break

            numerator = match.group(1)
            denominator = match.group(2)
            replacement = f'\\frac{{{numerator}}}{{{denominator}}}'
            text = text[:match.start()] + replacement + text[match.end():]

        return text

    def _convert_roots(self, text: str) -> str:
        """루트 변환"""
        # sqrt{a} → \sqrt{a}
        text = re.sub(r'sqrt\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}', r'\\sqrt{\1}', text)

        # root{n}of{a} → \sqrt[n]{a}
        pattern = r'root\s*\{(\d+)\}\s*of\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}'
        text = re.sub(pattern, r'\\sqrt[\1]{\2}', text)

        return text

    def _convert_bold(self, text: str) -> str:
        """굵은 글씨 변환: bold{a} → \\mathbf{a}"""
        # bold 뒤에 중괄호가 있는 경우
        text = re.sub(r'bold\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}', r'\\mathbf{\1}', text)

        # bold 뒤에 단일 문자/숫자가 있는 경우 (예: bold1)
        text = re.sub(r'bold(\d+)', r'\\mathbf{\1}', text)
        text = re.sub(r'bold([a-zA-Z])', r'\\mathbf{\1}', text)

        return text

    def _cleanup(self, text: str) -> str:
        """최종 정리"""
        # 연속 공백 정리
        text = re.sub(r'\s+', ' ', text)

        # 불필요한 공백 제거
        text = re.sub(r'\s*\^\s*', '^', text)
        text = re.sub(r'\s*_\s*', '_', text)

        # 빈 중괄호 제거
        text = re.sub(r'\{\s*\}', '', text)

        return text.strip()

    def to_unicode(self, hancom_script: str) -> str:
        """
        간단한 수식을 Unicode 문자로 변환 (LaTeX 없이)

        복잡한 수식은 원본 유지
        """
        if not hancom_script:
            return ''

        result = hancom_script.strip()

        # 0. 전처리: 불완전한 bold 태그 처리 (닫는 괄호 누락 케이스)
        # bold{ ... 로 시작하고 닫히지 않은 경우 제거
        if result.startswith('bold{') and result.count('{') > result.count('}'):
            result = result[5:].lstrip()  # bold{ 제거
        # {bold{...}} 형태 처리
        result = re.sub(r'^\{bold\{(.+)\}\}$', r'\1', result)

        # 위첨자 숫자
        superscripts = {
            '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
            '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
            '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
            'n': 'ⁿ', 'i': 'ⁱ',
        }

        # 아래첨자 숫자
        subscripts = {
            '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
            '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
            '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
            'a': 'ₐ', 'e': 'ₑ', 'o': 'ₒ', 'x': 'ₓ',
        }

        # 1. 먼저 위첨자/아래첨자 변환 (중괄호 내용)
        def replace_superscript(match):
            content = match.group(1)
            if len(content) <= 3 and all(c in superscripts for c in content):
                return ''.join(superscripts.get(c, c) for c in content)
            return f'^{{{content}}}'

        result = re.sub(r'\^\{([^{}]+)\}', replace_superscript, result)

        def replace_subscript(match):
            content = match.group(1)
            if len(content) <= 3 and all(c in subscripts for c in content):
                return ''.join(subscripts.get(c, c) for c in content)
            return f'_{{{content}}}'

        result = re.sub(r'_\{([^{}]+)\}', replace_subscript, result)

        # 2. 분수 변환: {a} over {b} → (a)/(b) 또는 a/b
        def replace_fraction(match):
            num = match.group(1).strip()
            denom = match.group(2).strip()
            # 간단한 경우 괄호 없이
            if len(num) <= 2 and len(denom) <= 2:
                return f'{num}/{denom}'
            return f'({num})/({denom})'

        # 분수 패턴 반복 처리 (중첩 분수 지원)
        for _ in range(5):
            new_result = re.sub(r'\{([^{}]*)\}\s*over\s*\{([^{}]*)\}', replace_fraction, result)
            if new_result == result:
                break
            result = new_result

        # 3. 연산자 변환
        result = re.sub(r'\s*TIMES\s*', ' × ', result)
        # ÷ 문자 처리 (다양한 인코딩 및 키워드)
        result = result.replace('÷', ' ÷ ')
        result = result.replace('\u00f7', ' ÷ ')  # Latin-1 division sign
        result = re.sub(r'\s*div\s*', ' ÷ ', result)  # div 키워드
        result = result.replace('!=', ' ≠ ')
        result = result.replace('<=', ' ≤ ')
        result = result.replace('>=', ' ≥ ')

        # 4. 괄호 정리
        result = re.sub(r'LEFT\s*\(', '(', result)
        result = re.sub(r'RIGHT\s*\)', ')', result)
        result = re.sub(r'LEFT\s*\[', '[', result)
        result = re.sub(r'RIGHT\s*\]', ']', result)

        # 5. backtick 공백 제거
        result = result.replace('`', ' ')

        # 6. bold 제거 (중첩 중괄호 지원)
        for _ in range(3):
            new_result = re.sub(r'bold\s*\{([^{}]*)\}', r'\1', result)
            if new_result == result:
                break
            result = new_result
        result = re.sub(r'bold(\w+)', r'\1', result)
        # 남은 bold 키워드만 제거
        result = result.replace('bold', '')

        # 7. sqrt 처리: sqrt{a} → √a
        result = re.sub(r'sqrt\s*\{([^{}]*)\}', r'√\1', result)

        # 8. 남은 단독 중괄호 제거
        for _ in range(3):
            new_result = re.sub(r'\{([^{}]+)\}', r'\1', result)
            if new_result == result:
                break
            result = new_result

        # 9. 정리
        result = re.sub(r'\s+', ' ', result)

        return result.strip()


# 전역 인스턴스
converter = HancomToLatexConverter()


def hancom_to_latex(script: str) -> str:
    """Hancom 스크립트를 LaTeX로 변환하는 헬퍼 함수"""
    return converter.convert(script)


def hancom_to_unicode(script: str) -> str:
    """Hancom 스크립트를 Unicode로 변환하는 헬퍼 함수"""
    return converter.to_unicode(script)
