r"""
Phase 19-C: HWP 수식 → LaTeX 변환기

HWP 수식편집기 문법을 KaTeX 호환 LaTeX로 변환

HWP 수식 문법:
- rm: Roman (직립체) → \mathrm{}
- it: Italic (기울임) → 기본값
- bold: 굵게 → \mathbf{}
- LEFT/RIGHT: 괄호 → \left/\right
- over: 분수 → \frac{}{}
- sqrt: 제곱근 → \sqrt{}
- leq/LEQ: ≤ → \leq
- geq/GEQ: ≥ → \geq
"""
import re
from typing import Optional, List, Tuple


class HwpLatexConverter:
    """HWP 수식을 LaTeX로 변환하는 클래스"""

    # HWP → LaTeX 명령어 매핑 (대소문자 모두 포함)
    COMMAND_MAP = {
        # 비교 연산자
        'LEQ': r'\leq',
        'leq': r'\leq',
        'GEQ': r'\geq',
        'geq': r'\geq',
        'NEQ': r'\neq',
        'neq': r'\neq',
        'APPROX': r'\approx',
        'approx': r'\approx',
        'EQUIV': r'\equiv',
        'equiv': r'\equiv',

        # 산술 연산자
        'times': r'\times',
        'TIMES': r'\times',
        'div': r'\div',
        'DIV': r'\div',
        'pm': r'\pm',
        'PM': r'\pm',
        'mp': r'\mp',
        'MP': r'\mp',
        'cdot': r'\cdot',
        'CDOT': r'\cdot',

        # 특수 기호
        'infty': r'\infty',
        'INFTY': r'\infty',
        'cdots': r'\cdots',
        'CDOTS': r'\cdots',
        'ldots': r'\ldots',
        'LDOTS': r'\ldots',
        'vdots': r'\vdots',
        'VDOTS': r'\vdots',
        'ddots': r'\ddots',
        'DDOTS': r'\ddots',
        'therefore': r'\therefore',
        'THEREFORE': r'\therefore',
        'because': r'\because',
        'BECAUSE': r'\because',

        # 그리스 문자 (소문자)
        'alpha': r'\alpha',
        'beta': r'\beta',
        'gamma': r'\gamma',
        'delta': r'\delta',
        'epsilon': r'\epsilon',
        'varepsilon': r'\varepsilon',
        'zeta': r'\zeta',
        'eta': r'\eta',
        'theta': r'\theta',
        'vartheta': r'\vartheta',
        'iota': r'\iota',
        'kappa': r'\kappa',
        'lambda': r'\lambda',
        'mu': r'\mu',
        'nu': r'\nu',
        'xi': r'\xi',
        'pi': r'\pi',
        'rho': r'\rho',
        'sigma': r'\sigma',
        'tau': r'\tau',
        'upsilon': r'\upsilon',
        'phi': r'\phi',
        'varphi': r'\varphi',
        'chi': r'\chi',
        'psi': r'\psi',
        'omega': r'\omega',

        # 그리스 문자 (대문자) - 일부는 로마자와 동일
        'ALPHA': 'A',
        'BETA': 'B',
        'GAMMA': r'\Gamma',
        'DELTA': r'\Delta',
        'EPSILON': 'E',
        'ZETA': 'Z',
        'ETA': 'H',
        'THETA': r'\Theta',
        'IOTA': 'I',
        'KAPPA': 'K',
        'LAMBDA': r'\Lambda',
        'MU': 'M',
        'NU': 'N',
        'XI': r'\Xi',
        'PI': r'\Pi',
        'RHO': 'P',
        'SIGMA': r'\Sigma',
        'TAU': 'T',
        'UPSILON': r'\Upsilon',
        'PHI': r'\Phi',
        'CHI': 'X',
        'PSI': r'\Psi',
        'OMEGA': r'\Omega',

        # 함수 (자동 직립체)
        'sin': r'\sin',
        'cos': r'\cos',
        'tan': r'\tan',
        'cot': r'\cot',
        'sec': r'\sec',
        'csc': r'\csc',
        'arcsin': r'\arcsin',
        'arccos': r'\arccos',
        'arctan': r'\arctan',
        'sinh': r'\sinh',
        'cosh': r'\cosh',
        'tanh': r'\tanh',
        'log': r'\log',
        'ln': r'\ln',
        'exp': r'\exp',
        'lim': r'\lim',
        'limsup': r'\limsup',
        'liminf': r'\liminf',
        'max': r'\max',
        'min': r'\min',
        'sup': r'\sup',
        'inf': r'\inf',
        'det': r'\det',
        'dim': r'\dim',
        'ker': r'\ker',
        'gcd': r'\gcd',
        'lcm': r'\text{lcm}',
        'deg': r'\deg',

        # Phase 19-F: 각도 기호 (DEG → °)
        'DEG': r'^{\circ}',

        # 큰 연산자
        'sum': r'\sum',
        'SUM': r'\sum',
        'prod': r'\prod',
        'PROD': r'\prod',
        'int': r'\int',
        'INT': r'\int',
        'oint': r'\oint',
        'OINT': r'\oint',
        'iint': r'\iint',
        'IINT': r'\iint',
        'iiint': r'\iiint',
        'IIINT': r'\iiint',
        'bigcup': r'\bigcup',
        'BIGCUP': r'\bigcup',
        'bigcap': r'\bigcap',
        'BIGCAP': r'\bigcap',

        # 집합
        'in': r'\in',
        'notin': r'\notin',
        'subset': r'\subset',
        'SUBSET': r'\subset',
        'supset': r'\supset',
        'SUPSET': r'\supset',
        'subseteq': r'\subseteq',
        'SUBSETEQ': r'\subseteq',
        'supseteq': r'\supseteq',
        'SUPSETEQ': r'\supseteq',
        'cup': r'\cup',
        'CUP': r'\cup',
        'cap': r'\cap',
        'CAP': r'\cap',
        'emptyset': r'\emptyset',
        'EMPTYSET': r'\emptyset',

        # 화살표
        'rightarrow': r'\rightarrow',
        'RIGHTARROW': r'\Rightarrow',
        'leftarrow': r'\leftarrow',
        'LEFTARROW': r'\Leftarrow',
        'leftrightarrow': r'\leftrightarrow',
        'LEFTRIGHTARROW': r'\Leftrightarrow',
        'to': r'\to',
        'TO': r'\to',

        # 기타
        'angle': r'\angle',
        'ANGLE': r'\angle',
        'perp': r'\perp',
        'PERP': r'\perp',
        'parallel': r'\parallel',
        'PARALLEL': r'\parallel',
        'triangle': r'\triangle',
        'TRIANGLE': r'\triangle',
        'square': r'\square',
        'SQUARE': r'\square',
        'forall': r'\forall',
        'FORALL': r'\forall',
        'exists': r'\exists',
        'EXISTS': r'\exists',
        'neg': r'\neg',
        'NEG': r'\neg',
        'land': r'\land',
        'LAND': r'\land',
        'lor': r'\lor',
        'LOR': r'\lor',
        'partial': r'\partial',
        'PARTIAL': r'\partial',
        'nabla': r'\nabla',
        'NABLA': r'\nabla',
    }

    def __init__(self):
        # 정규식 패턴 미리 컴파일
        self._compile_patterns()

    def _compile_patterns(self):
        """자주 사용하는 패턴 미리 컴파일"""
        # rm 패턴: rm 뒤의 영문자/숫자 (Phase 20-P-2: 대소문자 무시)
        self.rm_pattern = re.compile(r'\brm\s+([A-Za-z0-9]+)', re.IGNORECASE)
        # bold 패턴
        self.bold_pattern = re.compile(r'\bbold\s+([A-Za-z0-9]+)', re.IGNORECASE)
        # it 패턴
        self.it_pattern = re.compile(r'\bit\s+')
        # Phase 20-O: 분수 패턴 - over 키워드 찾기용 (중괄호는 별도 처리)
        self.over_keyword_pattern = re.compile(r'\bover\b', re.IGNORECASE)
        # Phase 20-P: rm 음수 패턴 (rm - 숫자 또는 rm -숫자)
        # Phase 20-P-2: 대소문자 무시 추가
        self.rm_negative_pattern = re.compile(r'\brm\s+-\s*(\d+)', re.IGNORECASE)

    def _find_balanced_braces(self, text: str, start: int) -> Tuple[int, int]:
        """
        Phase 20-O: 균형 잡힌 중괄호 쌍 찾기

        Args:
            text: 검색할 문자열
            start: 검색 시작 위치 (여는 중괄호 '{' 위치)

        Returns:
            (내용 시작, 내용 끝) 튜플. 매칭 실패 시 (-1, -1)

        Example:
            text = "{\\sqrt{5}} over {6}"
            _find_balanced_braces(text, 0) → (1, 10)  # "\\sqrt{5}"
        """
        if start < 0 or start >= len(text) or text[start] != '{':
            return (-1, -1)

        depth = 0
        content_start = start + 1

        for i in range(start, len(text)):
            if text[i] == '{':
                depth += 1
            elif text[i] == '}':
                depth -= 1
                if depth == 0:
                    return (content_start, i)

        # 매칭되는 닫는 중괄호 없음
        return (-1, -1)

    def convert(self, hwp_eq: str) -> str:
        """
        HWP 수식을 LaTeX로 변환

        Args:
            hwp_eq: HWP 수식 문자열

        Returns:
            LaTeX 문자열
        """
        if not hwp_eq or not hwp_eq.strip():
            return ""

        text = hwp_eq

        # 1. 전처리
        text = self._preprocess(text)

        # Phase 19-F: cases 변환 (다른 변환보다 먼저!)
        text = self._convert_cases(text)

        # Phase 19-G: 장식 기호 변환 (overline, bar, hat 등)
        text = self._convert_decorations(text)

        # 2. 괄호 처리 (LEFT/RIGHT)
        text = self._convert_brackets(text)

        # 3. 분수 처리 (over)
        text = self._convert_fractions(text)

        # 4. 제곱근 처리 (sqrt)
        text = self._convert_sqrt(text)

        # 5. 위첨자/아래첨자 처리
        text = self._convert_scripts(text)

        # 6. 글꼴 명령어 처리 (rm, it, bold)
        text = self._convert_font_commands(text)

        # 7. 기본 명령어 변환
        text = self._convert_basic_commands(text)

        # 8. 후처리
        text = self._postprocess(text)

        return text

    def _convert_cases(self, text: str) -> str:
        """
        Phase 19-F: cases 구조를 LaTeX cases 환경으로 변환

        {cases{A#B#C}} → \\begin{cases}A\\\\B\\\\C\\end{cases}
        """
        def replace_cases(match):
            content = match.group(1)
            # # → \\
            rows = content.split('#')
            latex_rows = ' \\\\ '.join(row.strip() for row in rows)
            return f'\\begin{{cases}}{latex_rows}\\end{{cases}}'

        # 패턴: {cases{...}} - 중첩 중괄호 허용
        pattern = r'\{cases\{([^}]*(?:\{[^}]*\}[^}]*)*)\}\}'

        # 중첩 cases 처리를 위해 반복 적용
        for _ in range(3):
            prev = text
            text = re.sub(pattern, replace_cases, text)
            if prev == text:
                break

        return text

    def _convert_decorations(self, text: str) -> str:
        """
        Phase 19-G: 장식 기호 변환

        overline{x} → \\overline{x}
        bar{x} → \\bar{x}
        hat{x} → \\hat{x}
        vec{x} → \\vec{x}
        dot{x} → \\dot{x}
        ddot{x} → \\ddot{x}
        tilde{x} → \\tilde{x}
        underline{x} → \\underline{x}
        """
        # 장식 기호 목록
        decorations = [
            'overline', 'underline',  # 긴 장식
            'bar', 'hat', 'vec', 'dot', 'ddot', 'tilde',
            'check', 'acute', 'grave', 'breve', 'widehat', 'widetilde'
        ]

        for deco in decorations:
            # === 복합 패턴 먼저 처리 (deco 안에 rm 패턴) ===

            # 1. deco{{rm{ABC}} it } → \deco{\mathrm{ABC}}
            # Phase 20-K: (?<!\\) 추가 - 이미 변환된 \deco 재매칭 방지
            text = re.sub(
                rf'(?<!\\)\b{deco}\s*\{{\{{rm\{{([^}}]*)\}}\}}\s*it\s*\}}',
                rf'\\{deco}{{\\mathrm{{\1}}}}',
                text
            )

            # 2. deco{{rm{ABC}}} → \deco{\mathrm{ABC}}
            # Phase 20-K: (?<!\\) 추가 - 이미 변환된 \deco 재매칭 방지
            text = re.sub(
                rf'(?<!\\)\b{deco}\s*\{{\{{rm\{{([^}}]*)\}}\}}\}}',
                rf'\\{deco}{{\\mathrm{{\1}}}}',
                text
            )

            # 3. deco{{ rm ABC it }} → \deco{\mathrm{ABC}}
            # Phase 20-K: (?<!\\) 추가 - 이미 변환된 \deco 재매칭 방지
            text = re.sub(
                rf'(?<!\\)\b{deco}\s*\{{\{{\s*rm\s+([A-Za-z0-9]+)\s*it\s*\}}\}}',
                rf'\\{deco}{{\\mathrm{{\1}}}}',
                text
            )

            # 4. deco{ rm ABC it } → \deco{\mathrm{ABC}}
            # Phase 20-K: (?<!\\) 추가 - 이미 변환된 \deco 재매칭 방지
            text = re.sub(
                rf'(?<!\\)\b{deco}\s*\{{\s*rm\s+([A-Za-z0-9]+)\s*it\s*\}}',
                rf'\\{deco}{{\\mathrm{{\1}}}}',
                text
            )

            # === 단순 패턴: 중괄호 있음 ===
            # deco{...} → \deco{...}
            # Phase 20-I: (?<!\\) 추가 - 이미 변환된 \deco 재매칭 방지
            pattern = rf'(?<!\\)\b{deco}\s*\{{'
            replacement = rf'\\{deco}{{'
            text = re.sub(pattern, replacement, text)

            # === Phase 20-H: 중괄호 없음 패턴 추가 ===
            # decoABC → \deco{ABC}
            # 단, 이미 \deco로 변환된 것은 제외 (negative lookbehind)
            pattern_no_brace = rf'(?<!\\)\b{deco}([A-Za-z0-9]+)'
            replacement_no_brace = rf'\\{deco}{{\1}}'
            text = re.sub(pattern_no_brace, replacement_no_brace, text)

        return text

    def _preprocess(self, text: str) -> str:
        """전처리: 공백 및 특수문자 정규화"""
        # 백틱(`) → thin space (무시)
        text = text.replace('`', ' ')

        # 틸데(~) → 공백
        text = text.replace('~', ' ')

        # 여러 공백 정리
        text = re.sub(r'\s+', ' ', text)

        return text.strip()

    def _convert_brackets(self, text: str) -> str:
        """LEFT/RIGHT 괄호 변환"""
        # LEFT ( → \left(
        text = re.sub(r'\bLEFT\s*\(\s*', r'\\left( ', text)
        text = re.sub(r'\bRIGHT\s*\)\s*', r' \\right)', text)

        # LEFT [ → \left[
        text = re.sub(r'\bLEFT\s*\[\s*', r'\\left[ ', text)
        text = re.sub(r'\bRIGHT\s*\]\s*', r' \\right]', text)

        # LEFT | → \left|  (절댓값)
        text = re.sub(r'\bLEFT\s*\|\s*', r'\\left| ', text)
        text = re.sub(r'\bRIGHT\s*\|\s*', r' \\right|', text)

        # LEFT { → \left\{
        text = re.sub(r'\bLEFT\s*\{\s*', r'\\left\\{ ', text)
        text = re.sub(r'\bRIGHT\s*\}\s*', r' \\right\\}', text)

        # 바닥/천장 함수
        text = re.sub(r'\bLEFT\s*⌊\s*', r'\\left\\lfloor ', text)
        text = re.sub(r'\bRIGHT\s*⌋\s*', r' \\right\\rfloor', text)
        text = re.sub(r'\bLEFT\s*⌈\s*', r'\\left\\lceil ', text)
        text = re.sub(r'\bRIGHT\s*⌉\s*', r' \\right\\rceil', text)

        return text

    def _convert_fractions(self, text: str) -> str:
        """
        Phase 20-O: 분수 변환 (균형 잡힌 중괄호 매칭 사용)

        {a} over {b} → \\frac{a}{b}
        {\\sqrt{5}} over {5} → \\frac{\\sqrt{5}}{5}

        중첩된 중괄호도 올바르게 처리합니다.
        """
        max_iterations = 20
        iteration = 0

        while iteration < max_iterations:
            # over 키워드 찾기
            match = self.over_keyword_pattern.search(text)
            if not match:
                break

            over_start = match.start()
            over_end = match.end()

            # over 앞에서 닫는 중괄호 } 찾기 (역방향 검색)
            num_end = -1
            for i in range(over_start - 1, -1, -1):
                if text[i] == '}':
                    num_end = i
                    break
                elif text[i] not in ' \t\n':
                    # 공백이 아닌 문자가 나오면 중괄호 패턴 아님
                    break

            if num_end == -1:
                # 분자 중괄호 없음 - 이 over 건너뛰기
                # over를 임시 마커로 치환하여 무한 루프 방지
                text = text[:over_start] + '\x00OVER\x00' + text[over_end:]
                iteration += 1
                continue

            # 분자 여는 중괄호 { 찾기 (역방향 매칭)
            depth = 0
            num_start = -1
            for i in range(num_end, -1, -1):
                if text[i] == '}':
                    depth += 1
                elif text[i] == '{':
                    depth -= 1
                    if depth == 0:
                        num_start = i
                        break

            if num_start == -1:
                # 분자 여는 중괄호 없음
                text = text[:over_start] + '\x00OVER\x00' + text[over_end:]
                iteration += 1
                continue

            # over 뒤에서 여는 중괄호 { 찾기
            den_start = -1
            for i in range(over_end, len(text)):
                if text[i] == '{':
                    den_start = i
                    break
                elif text[i] not in ' \t\n':
                    # 공백이 아닌 문자가 나오면 중괄호 패턴 아님
                    break

            if den_start == -1:
                # 분모 중괄호 없음
                text = text[:over_start] + '\x00OVER\x00' + text[over_end:]
                iteration += 1
                continue

            # 분모 닫는 중괄호 찾기 (균형 잡힌 매칭)
            den_content_start, den_content_end = self._find_balanced_braces(text, den_start)
            if den_content_end == -1:
                # 분모 닫는 중괄호 없음
                text = text[:over_start] + '\x00OVER\x00' + text[over_end:]
                iteration += 1
                continue

            den_end = den_content_end  # } 위치

            # 분자, 분모 내용 추출
            numerator = text[num_start + 1:num_end].strip()
            denominator = text[den_content_start:den_content_end].strip()

            # frac으로 변환
            frac_text = f'\\frac{{{numerator}}}{{{denominator}}}'

            # 원본 텍스트 치환
            text = text[:num_start] + frac_text + text[den_end + 1:]

            iteration += 1

        # 임시 마커 복원
        text = text.replace('\x00OVER\x00', 'over')

        return text

    def _convert_sqrt(self, text: str) -> str:
        """제곱근 변환: sqrt{x} → \\sqrt{x}"""
        # sqrt{...}
        text = re.sub(r'\bsqrt\s*\{', r'\\sqrt{', text, flags=re.IGNORECASE)
        # SQRT{...}
        text = re.sub(r'\bSQRT\s*\{', r'\\sqrt{', text)
        return text

    def _convert_scripts(self, text: str) -> str:
        """위첨자/아래첨자 처리"""
        # SUP → ^
        text = re.sub(r'\bSUP\s*', '^', text)
        text = re.sub(r'\bsup\s*', '^', text)

        # SUB → _
        text = re.sub(r'\bSUB\s*', '_', text)
        text = re.sub(r'\bsub\s*', '_', text)

        return text

    def _convert_font_commands(self, text: str) -> str:
        """
        글꼴 명령어 변환

        rm ABC → \\mathrm{ABC}
        it xyz → xyz (기본이 이탤릭이므로 제거)
        bold X → \\mathbf{X}
        """
        # === Phase 19-G: 중괄호 패턴 먼저 처리 ===

        # 1. {{rm{ABC}} it } → \mathrm{ABC}
        # (이중 중괄호 + it 지시자)
        text = re.sub(
            r'\{\{rm\{([^}]*)\}\}\s*it\s*\}',
            r'\\mathrm{\1}',
            text
        )

        # 2. {rm{ABC}} → \mathrm{ABC}
        # (단순 중괄호)
        text = re.sub(
            r'\{rm\{([^}]*)\}\}',
            r'\\mathrm{\1}',
            text
        )

        # 3. {rm{ABC} it } → \mathrm{ABC}
        # (공백 포함)
        text = re.sub(
            r'\{rm\{([^}]*)\}\s*it\s*\}',
            r'\\mathrm{\1}',
            text
        )

        # 4. { rm ABC it } → \mathrm{ABC}
        # (중괄호 안에 rm 공백 패턴)
        text = re.sub(
            r'\{\s*rm\s+([A-Za-z0-9]+)\s*it\s*\}',
            r'\\mathrm{\1}',
            text
        )

        # === Phase 20-P: rm 음수 패턴 먼저 처리 ===
        # rm - 2 → -2, rm -3 → -3 (음수는 mathrm 없이 그대로)
        text = self.rm_negative_pattern.sub(r'-\1', text)

        # === 기존 rm 패턴 (공백 구분) ===
        # rm ABC → \mathrm{ABC}
        def replace_rm(match):
            content = match.group(1).strip()
            if content:
                return f'\\mathrm{{{content}}}'
            return ''

        text = self.rm_pattern.sub(replace_rm, text)

        # rmbold 처리 (rm + bold)
        def replace_rmbold(match):
            content = match.group(1).strip()
            if content:
                return f'\\mathbf{{\\mathrm{{{content}}}}}'
            return ''

        text = re.sub(r'\brmbold\s+([A-Za-z0-9]+)', replace_rmbold, text, flags=re.IGNORECASE)

        # bold 처리
        def replace_bold(match):
            content = match.group(1).strip()
            if content:
                return f'\\mathbf{{{content}}}'
            return ''

        text = self.bold_pattern.sub(replace_bold, text)

        # it 제거 (수식에서 기본이 이탤릭)
        text = self.it_pattern.sub('', text)
        text = re.sub(r'\bit\b', '', text)

        return text

    def _convert_basic_commands(self, text: str) -> str:
        """
        기본 명령어 변환 (COMMAND_MAP 사용)

        Phase 20-H: Look-ahead 사용하여 숫자 뒤에도 매칭되도록 수정
        - geq0 → \\geq 0
        - leq5 → \\leq 5
        """
        # 긴 명령어 먼저 처리 (subseteq > subset 순서)
        sorted_commands = sorted(
            self.COMMAND_MAP.items(),
            key=lambda x: len(x[0]),
            reverse=True
        )

        for hwp_cmd, latex_cmd in sorted_commands:
            # Phase 20-I: 이중 변환 버그 수정
            # (?<!\\): 백슬래시 뒤에서는 매칭 안함 (이미 변환된 \geq 내의 geq 재매칭 방지)
            # \b: 앞에 word boundary
            # (?![a-zA-Z]): 뒤에 영문자가 아니면 매칭 (숫자, 공백, 연산자 OK)
            pattern = r'(?<!\\)\b' + re.escape(hwp_cmd) + r'(?![a-zA-Z])'
            # re.sub에서 백슬래시 이스케이프 필요
            escaped_latex = latex_cmd.replace('\\', '\\\\')
            text = re.sub(pattern, escaped_latex, text)

        return text

    def _postprocess(self, text: str) -> str:
        """후처리: 정리 및 최적화"""
        # 이중 백슬래시 정리 (\\\ → \\)
        text = re.sub(r'\\{3,}', r'\\\\', text)

        # 불필요한 공백 정리
        text = re.sub(r'\s+', ' ', text)

        # 연산자 주변 공백 정리
        # Phase 20-P: 음수 보존 (-숫자는 그대로 유지)
        # 단, -가 숫자 앞에 붙어있는 경우 (음수)는 제외
        text = re.sub(r'\s*([+=<>])\s*', r' \1 ', text)  # +, =, <, > 만 처리
        text = re.sub(r'(\S)\s*-\s*(\S)', r'\1 - \2', text)  # - 주변 공백 (양쪽에 문자가 있을 때만)

        # 중괄호 내부 공백 정리
        text = re.sub(r'\{\s+', '{', text)
        text = re.sub(r'\s+\}', '}', text)

        # 수식 앞뒤 공백 제거
        text = text.strip()

        return text


# =============================================================================
# Phase 20-A: 개선된 싱글톤 패턴
# =============================================================================
# 개발 환경: 파일 변경 시 자동으로 새 인스턴스 생성
# 프로덕션: 싱글톤 유지 (성능 최적화)
# =============================================================================

import os as _os
from typing import Optional as _Optional

# 싱글톤 관리 변수
_converter: _Optional[HwpLatexConverter] = None
_converter_file_mtime: float = 0


def _should_recreate_converter() -> bool:
    """
    컨버터 재생성 필요 여부 판단

    Returns:
        bool: 재생성이 필요하면 True
    """
    global _converter, _converter_file_mtime

    # 인스턴스가 없으면 생성 필요
    if _converter is None:
        return True

    # 프로덕션 환경: 재생성 안함
    app_env = _os.getenv('APP_ENV', 'development').lower()
    if app_env in ('prod', 'production'):
        return False

    # 개발 환경: 파일 변경 시 재생성
    try:
        current_mtime = _os.path.getmtime(__file__)
        if current_mtime != _converter_file_mtime:
            return True
    except OSError:
        pass

    return False


def _get_converter() -> HwpLatexConverter:
    """
    컨버터 인스턴스 반환 (필요 시 재생성)

    Returns:
        HwpLatexConverter: 컨버터 인스턴스
    """
    global _converter, _converter_file_mtime

    if _should_recreate_converter():
        _converter = HwpLatexConverter()
        try:
            _converter_file_mtime = _os.path.getmtime(__file__)
        except OSError:
            _converter_file_mtime = 0

    return _converter


def hwp_to_latex(hwp_eq: str) -> str:
    """
    HWP 수식을 LaTeX로 변환하는 편의 함수

    Phase 20-A:
    - 개발 환경: 파일 변경 시 자동으로 새 인스턴스 사용
    - 프로덕션: 싱글톤 유지 (성능 최적화)

    Args:
        hwp_eq: HWP 수식 문자열

    Returns:
        LaTeX 문자열

    Example:
        >>> hwp_to_latex("LEFT | x-5 RIGHT | < 3")
        '\\left| x - 5 \\right| < 3'

        >>> hwp_to_latex("{5} over {4}")
        '\\frac{5}{4}'

        >>> hwp_to_latex("rm A")
        '\\mathrm{A}'
    """
    return _get_converter().convert(hwp_eq)


def convert_equation_list(equations: List[str]) -> List[Tuple[str, str]]:
    """
    여러 수식을 일괄 변환

    Args:
        equations: HWP 수식 문자열 리스트

    Returns:
        List[(원본, LaTeX)] 튜플 리스트
    """
    return [(eq, hwp_to_latex(eq)) for eq in equations]


def get_converter_instance() -> HwpLatexConverter:
    """
    컨버터 인스턴스 직접 접근 (테스트/디버깅용)

    Returns:
        HwpLatexConverter: 현재 컨버터 인스턴스
    """
    return _get_converter()


def get_converter_info() -> dict:
    """
    컨버터 상태 정보 반환 (디버깅용)

    Returns:
        dict: 컨버터 상태 정보
    """
    global _converter, _converter_file_mtime

    return {
        'instance_exists': _converter is not None,
        'instance_id': id(_converter) if _converter else None,
        'file_mtime': _converter_file_mtime,
        'current_file_mtime': _os.path.getmtime(__file__) if _os.path.exists(__file__) else None,
        'app_env': _os.getenv('APP_ENV', '(not set)'),
    }
