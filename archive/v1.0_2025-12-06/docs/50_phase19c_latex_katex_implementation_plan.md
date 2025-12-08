# Phase 19-C: HWP 수식 → LaTeX/KaTeX 구현 계획

**작성일**: 2025-11-28
**목표**: HML 파일의 수식을 LaTeX로 변환하고 KaTeX로 웹에서 렌더링

---

## 전체 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                        Phase 19-C 구조                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [HML 파일]                                                     │
│      │                                                          │
│      ▼                                                          │
│  ┌─────────────────────┐                                       │
│  │ EQUATION/SCRIPT 추출 │  ← HMLParser                          │
│  └─────────────────────┘                                       │
│      │                                                          │
│      ▼                                                          │
│  ┌─────────────────────┐                                       │
│  │ hwp_to_latex()      │  ← 새로운 변환 모듈                     │
│  │ - 전처리            │                                        │
│  │ - 명령어 변환        │                                        │
│  │ - 글꼴 처리          │                                        │
│  │ - 후처리            │                                        │
│  └─────────────────────┘                                       │
│      │                                                          │
│      ▼                                                          │
│  ┌─────────────────────┐                                       │
│  │ ParsedProblem       │  ← content_latex 필드 추가             │
│  └─────────────────────┘                                       │
│      │                                                          │
│      ▼                                                          │
│  ┌─────────────────────┐                                       │
│  │ API Response        │  ← latex 필드 포함                     │
│  └─────────────────────┘                                       │
│      │                                                          │
│      ▼                                                          │
│  ┌─────────────────────┐                                       │
│  │ React + KaTeX       │  ← 프론트엔드 렌더링                    │
│  └─────────────────────┘                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step 1: HWP → LaTeX 변환 모듈 생성

### 1.1 파일 생성

**파일**: `backend/app/services/hangul/hwp_latex_converter.py`

```python
"""
Phase 19-C: HWP 수식 → LaTeX 변환기

HWP 수식편집기 문법을 KaTeX 호환 LaTeX로 변환
"""
import re
from typing import Optional, Tuple, List


class HwpLatexConverter:
    """HWP 수식을 LaTeX로 변환하는 클래스"""

    # HWP → LaTeX 명령어 매핑
    COMMAND_MAP = {
        # 비교 연산자 (대소문자 모두)
        'LEQ': r'\leq',
        'leq': r'\leq',
        'GEQ': r'\geq',
        'geq': r'\geq',
        'NEQ': r'\neq',
        'neq': r'\neq',

        # 산술 연산자
        'times': r'\times',
        'TIMES': r'\times',
        'div': r'\div',
        'DIV': r'\div',
        'pm': r'\pm',
        'PM': r'\pm',
        'mp': r'\mp',
        'MP': r'\mp',

        # 특수 기호
        'infty': r'\infty',
        'INFTY': r'\infty',
        'cdot': r'\cdot',
        'CDOT': r'\cdot',
        'cdots': r'\cdots',
        'CDOTS': r'\cdots',

        # 그리스 문자 (소문자)
        'alpha': r'\alpha',
        'beta': r'\beta',
        'gamma': r'\gamma',
        'delta': r'\delta',
        'epsilon': r'\epsilon',
        'theta': r'\theta',
        'pi': r'\pi',
        'sigma': r'\sigma',
        'omega': r'\omega',

        # 그리스 문자 (대문자)
        'ALPHA': 'A',
        'BETA': 'B',
        'GAMMA': r'\Gamma',
        'DELTA': r'\Delta',
        'THETA': r'\Theta',
        'PI': r'\Pi',
        'SIGMA': r'\Sigma',
        'OMEGA': r'\Omega',

        # 함수
        'sin': r'\sin',
        'cos': r'\cos',
        'tan': r'\tan',
        'log': r'\log',
        'ln': r'\ln',
        'lim': r'\lim',
        'sum': r'\sum',
        'int': r'\int',
        'sqrt': r'\sqrt',
    }

    # 괄호 매핑
    BRACKET_MAP = {
        ('LEFT', '('): r'\left(',
        ('RIGHT', ')'): r'\right)',
        ('LEFT', '['): r'\left[',
        ('RIGHT', ']'): r'\right]',
        ('LEFT', '|'): r'\left|',
        ('RIGHT', '|'): r'\right|',
        ('LEFT', '{'): r'\left\{',
        ('RIGHT', '}'): r'\right\}',
        ('LEFT', '⌊'): r'\left\lfloor',
        ('RIGHT', '⌋'): r'\right\rfloor',
        ('LEFT', '⌈'): r'\left\lceil',
        ('RIGHT', '⌉'): r'\right\rceil',
    }

    def __init__(self):
        pass

    def convert(self, hwp_eq: str) -> str:
        """
        HWP 수식을 LaTeX로 변환

        Args:
            hwp_eq: HWP 수식 문자열

        Returns:
            LaTeX 문자열
        """
        if not hwp_eq:
            return ""

        text = hwp_eq

        # 1. 전처리
        text = self._preprocess(text)

        # 2. 괄호 처리 (LEFT/RIGHT)
        text = self._convert_brackets(text)

        # 3. 분수 처리 (over)
        text = self._convert_fractions(text)

        # 4. 제곱근 처리 (sqrt)
        text = self._convert_sqrt(text)

        # 5. 글꼴 명령어 처리 (rm, it, bold)
        text = self._convert_font_commands(text)

        # 6. 기본 명령어 변환
        text = self._convert_basic_commands(text)

        # 7. 후처리
        text = self._postprocess(text)

        return text

    def _preprocess(self, text: str) -> str:
        """전처리: 공백 정규화"""
        # 백틱(`) → thin space placeholder
        text = text.replace('`', ' ')

        # 여러 공백 정리
        text = re.sub(r'\s+', ' ', text)

        return text.strip()

    def _convert_brackets(self, text: str) -> str:
        """LEFT/RIGHT 괄호 변환"""
        # LEFT ( → \left(
        text = re.sub(r'\bLEFT\s*\(\s*', r'\\left( ', text)
        text = re.sub(r'\bRIGHT\s*\)\s*', r'\\right) ', text)

        # LEFT [ → \left[
        text = re.sub(r'\bLEFT\s*\[\s*', r'\\left[ ', text)
        text = re.sub(r'\bRIGHT\s*\]\s*', r'\\right] ', text)

        # LEFT | → \left|
        text = re.sub(r'\bLEFT\s*\|\s*', r'\\left| ', text)
        text = re.sub(r'\bRIGHT\s*\|\s*', r'\\right| ', text)

        # LEFT { → \left\{
        text = re.sub(r'\bLEFT\s*\{\s*', r'\\left\\{ ', text)
        text = re.sub(r'\bRIGHT\s*\}\s*', r'\\right\\} ', text)

        return text

    def _convert_fractions(self, text: str) -> str:
        """분수 변환: {a} over {b} → \frac{a}{b}"""
        # 패턴: {분자} over {분모}
        pattern = r'\{([^}]*)\}\s*over\s*\{([^}]*)\}'

        def replace_frac(match):
            numerator = match.group(1).strip()
            denominator = match.group(2).strip()
            return f'\\frac{{{numerator}}}{{{denominator}}}'

        # 반복 적용 (중첩 분수 처리)
        prev = ""
        while prev != text:
            prev = text
            text = re.sub(pattern, replace_frac, text, flags=re.IGNORECASE)

        return text

    def _convert_sqrt(self, text: str) -> str:
        """제곱근 변환: sqrt{x} → \sqrt{x}"""
        text = re.sub(r'\bsqrt\s*\{', r'\\sqrt{', text, flags=re.IGNORECASE)
        return text

    def _convert_font_commands(self, text: str) -> str:
        """
        글꼴 명령어 변환

        rm ABC → \mathrm{ABC}
        it xyz → xyz (기본이 이탤릭이므로 제거)
        bold X → \mathbf{X}
        """
        # rm 처리: rm 뒤의 연속 문자를 \mathrm{}로 감싸기
        # 패턴: rm 다음에 오는 영문자/숫자 그룹
        def replace_rm(match):
            content = match.group(1).strip()
            if content:
                return f'\\mathrm{{{content}}}'
            return ''

        # rm 뒤에 오는 단어 처리
        text = re.sub(r'\brm\s+([A-Za-z0-9]+)', replace_rm, text)

        # it 제거 (기본이 이탤릭)
        text = re.sub(r'\bit\s+', '', text)
        text = re.sub(r'\bit\b', '', text)

        # bold 처리
        def replace_bold(match):
            content = match.group(1).strip()
            if content:
                return f'\\mathbf{{{content}}}'
            return ''

        text = re.sub(r'\bbold\s+([A-Za-z0-9]+)', replace_bold, text, flags=re.IGNORECASE)

        return text

    def _convert_basic_commands(self, text: str) -> str:
        """기본 명령어 변환"""
        for hwp_cmd, latex_cmd in self.COMMAND_MAP.items():
            # 단어 경계로 매칭
            pattern = r'\b' + re.escape(hwp_cmd) + r'\b'
            text = re.sub(pattern, latex_cmd, text)

        return text

    def _postprocess(self, text: str) -> str:
        """후처리: 정리"""
        # 이중 백슬래시 정리
        text = text.replace('\\\\', '\\')

        # 불필요한 공백 정리
        text = re.sub(r'\s+', ' ', text)

        # 수식 앞뒤 공백 제거
        text = text.strip()

        return text


# 편의 함수
_converter = HwpLatexConverter()


def hwp_to_latex(hwp_eq: str) -> str:
    """
    HWP 수식을 LaTeX로 변환하는 편의 함수

    Args:
        hwp_eq: HWP 수식 문자열

    Returns:
        LaTeX 문자열
    """
    return _converter.convert(hwp_eq)
```

### 1.2 테스트 코드

**파일**: `test_hwp_latex.py` (프로젝트 루트)

```python
"""HWP → LaTeX 변환 테스트"""
import sys
sys.path.insert(0, 'backend')

from app.services.hangul.hwp_latex_converter import hwp_to_latex

test_cases = [
    # (HWP 입력, 예상 LaTeX 출력)
    ('LEFT | x-5 RIGHT | <3', r'\left| x-5 \right| <3'),
    ('a<x<8', 'a<x<8'),
    ('rm 1', r'\mathrm{1}'),
    ('rm A it LEFT (-1, 2 RIGHT )', r'\mathrm{A} \left( -1, 2 \right)'),
    ('2 x+1 leq 5 leq x+a', r'2 x+1 \leq 5 \leq x+a'),
    ('{5} over {4}', r'\frac{5}{4}'),
    ('sqrt{2}', r'\sqrt{2}'),
    ('3 sqrt{2}', r'3 \sqrt{2}'),
    ('{ sqrt{5}} over {5}', r'\frac{ \sqrt{5}}{5}'),
    ('4 x-y=0', '4 x-y=0'),
    ('alpha + beta', r'\alpha + \beta'),
    ('rm ABC', r'\mathrm{ABC}'),
]

print("=" * 70)
print("HWP → LaTeX 변환 테스트")
print("=" * 70)

passed = 0
failed = 0

for hwp_input, expected in test_cases:
    result = hwp_to_latex(hwp_input)
    # 공백 정규화 후 비교
    result_norm = ' '.join(result.split())
    expected_norm = ' '.join(expected.split())

    if result_norm == expected_norm:
        status = "PASS"
        passed += 1
    else:
        status = "FAIL"
        failed += 1

    print(f"\n[{status}]")
    print(f"  HWP:      {hwp_input}")
    print(f"  LaTeX:    {result}")
    print(f"  Expected: {expected}")

print("\n" + "=" * 70)
print(f"결과: {passed}/{passed+failed} 통과")
print("=" * 70)
```

---

## Step 2: ParsedProblem 데이터 구조 확장

### 2.1 parser_base.py 수정

**파일**: `backend/app/services/hangul/parser_base.py`

**변경사항**:
```python
@dataclass
class ParsedProblem:
    """파싱된 개별 문제"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    number: str = ""
    content_text: str = ""                     # 일반 텍스트 (기존)
    content_latex: str = ""                    # LaTeX 포함 텍스트 (신규)
    content_images: List[str] = field(default_factory=list)
    content_equations: List[str] = field(default_factory=list)  # LaTeX 수식 목록 (신규)

    # 정답 정보
    answer: Optional[str] = None
    answer_latex: Optional[str] = None         # 정답 LaTeX (신규)
    answer_type: str = "unknown"

    # 해설 정보
    explanation: Optional[str] = None

    # 추가 정보
    points: Optional[float] = None

    def to_dict(self) -> Dict[str, Any]:
        """딕셔너리로 변환"""
        return {
            "id": self.id,
            "number": self.number,
            "content_text": self.content_text,
            "content_latex": self.content_latex,      # 추가
            "content_images": self.content_images,
            "content_equations": self.content_equations,  # 추가
            "answer": self.answer,
            "answer_latex": self.answer_latex,        # 추가
            "answer_type": self.answer_type,
            "explanation": self.explanation,
            "points": self.points,
        }
```

---

## Step 3: HMLParser에 LaTeX 변환 통합

### 3.1 hml_parser.py 수정

**파일**: `backend/app/services/hangul/hml_parser.py`

**추가할 import**:
```python
from .hwp_latex_converter import hwp_to_latex
```

**추가할 메서드**:
```python
def _extract_equations_as_latex(self) -> List[Tuple[str, str]]:
    """
    모든 EQUATION 태그에서 수식 추출 및 LaTeX 변환

    Returns:
        List[Tuple[str, str]]: [(원본 HWP, LaTeX), ...]
    """
    equations = []

    if self.root is None:
        return equations

    for eq_elem in self.root.iter('EQUATION'):
        script = eq_elem.find('.//SCRIPT')
        if script is not None and script.text:
            hwp_eq = script.text.strip()
            latex_eq = hwp_to_latex(hwp_eq)
            equations.append((hwp_eq, latex_eq))

    return equations


def _build_content_with_latex(self, problem_index: int) -> Tuple[str, str, List[str]]:
    """
    문제 본문을 LaTeX 수식 포함 형태로 구성

    Args:
        problem_index: 문제 인덱스 (0부터)

    Returns:
        Tuple[content_text, content_latex, equations_list]
    """
    # 구현 필요: AUTONUM 위치 기반으로 해당 문제의 수식들 추출
    # 텍스트와 수식을 조합하여 content_latex 생성
    pass
```

**_extract_by_endnote 메서드 수정**:
```python
def _extract_by_endnote(self, endnotes: List, paragraphs: List[str]) -> List[ParsedProblem]:
    """Phase 19-B + 19-C: ENDNOTE 기반 문제 추출 + LaTeX"""
    problems = []

    # 1. ENDNOTE에서 정답 추출
    answers = self._extract_answers_from_endnotes(endnotes)

    # 2. AUTONUM으로 문제 본문 위치 파악
    problem_contents = self._find_problem_contents_by_autonum()

    # 3. 배점 정보 추출
    points_map = self._extract_points_map(paragraphs)

    # 4. 수식 정보 추출 (신규)
    all_equations = self._extract_equations_as_latex()

    # 5. 문제 객체 생성
    for i, answer_info in enumerate(answers):
        problem = ParsedProblem(
            number=str(i + 1),
            answer=answer_info['answer'],
            answer_type=answer_info['type']
        )

        # 문제 본문 매핑
        if i < len(problem_contents):
            problem.content_text = problem_contents[i]

        # LaTeX 변환 정답 (신규)
        if answer_info['raw']:
            problem.answer_latex = hwp_to_latex(answer_info['raw'])

        # 배점 매핑
        if i + 1 in points_map:
            problem.points = points_map[i + 1]

        problems.append(problem)

    return problems
```

---

## Step 4: 프론트엔드 KaTeX 설정

### 4.1 KaTeX 설치

```bash
cd frontend
npm install katex
npm install @types/katex  # TypeScript 타입
```

### 4.2 KaTeX 컴포넌트 생성

**파일**: `frontend/src/components/MathDisplay.tsx`

```tsx
import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathDisplayProps {
  latex: string;
  displayMode?: boolean;
  className?: string;
}

/**
 * KaTeX로 LaTeX 수식을 렌더링하는 컴포넌트
 */
export const MathDisplay: React.FC<MathDisplayProps> = ({
  latex,
  displayMode = false,
  className = '',
}) => {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current && latex) {
      try {
        katex.render(latex, containerRef.current, {
          throwOnError: false,
          displayMode,
          strict: false,
        });
      } catch (error) {
        console.error('KaTeX render error:', error);
        if (containerRef.current) {
          containerRef.current.textContent = latex;
        }
      }
    }
  }, [latex, displayMode]);

  return <span ref={containerRef} className={className} />;
};

/**
 * 텍스트 내 $...$ 구문을 KaTeX로 변환
 */
export const MathText: React.FC<{ text: string; className?: string }> = ({
  text,
  className = '',
}) => {
  // $...$로 감싸진 부분을 찾아서 분리
  const parts = text.split(/(\$[^$]+\$)/g);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.startsWith('$') && part.endsWith('$')) {
          // 수식 부분
          const latex = part.slice(1, -1);
          return <MathDisplay key={index} latex={latex} />;
        }
        // 일반 텍스트
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

export default MathDisplay;
```

### 4.3 문제 표시 컴포넌트 수정

**파일**: `frontend/src/components/ProblemDisplay.tsx` (예시)

```tsx
import React from 'react';
import { MathText } from './MathDisplay';

interface Problem {
  number: string;
  content_text: string;
  content_latex?: string;
  answer: string;
  answer_latex?: string;
  points?: number;
}

interface ProblemDisplayProps {
  problem: Problem;
}

export const ProblemDisplay: React.FC<ProblemDisplayProps> = ({ problem }) => {
  // content_latex가 있으면 사용, 없으면 content_text
  const displayContent = problem.content_latex || problem.content_text;

  return (
    <div className="problem-item p-4 border rounded mb-4">
      <div className="problem-header flex justify-between items-center mb-2">
        <span className="font-bold text-lg">문제 {problem.number}</span>
        {problem.points && (
          <span className="text-sm text-gray-500">{problem.points}점</span>
        )}
      </div>

      <div className="problem-content mb-2">
        <MathText text={displayContent} />
      </div>

      <div className="problem-answer text-blue-600">
        정답: {problem.answer_latex ? (
          <MathText text={`$${problem.answer_latex}$`} />
        ) : (
          problem.answer
        )}
      </div>
    </div>
  );
};
```

---

## Step 5: API 응답 형식 업데이트

### 5.1 기존 API 응답 확장

API 응답에 `content_latex`, `answer_latex`, `content_equations` 필드가 자동으로 포함됨
(ParsedProblem.to_dict()에서 처리)

**예시 응답**:
```json
{
  "problems": [
    {
      "number": "1",
      "content_text": "부등식 |x-5|<3의 해가 a<x<8일 때, 실수 a의 값은?",
      "content_latex": "부등식 $\\left|x-5\\right|<3$의 해가 $a<x<8$일 때, 실수 $a$의 값은?",
      "content_equations": ["\\left|x-5\\right|<3", "a<x<8"],
      "answer": "②",
      "answer_latex": "2",
      "answer_type": "choice",
      "points": 4.2
    }
  ]
}
```

---

## Step 6: 테스트 및 검증

### 6.1 백엔드 테스트

```bash
cd pdf
python test_hwp_latex.py
```

### 6.2 통합 테스트

```bash
python test_phase19c.py
```

**test_phase19c.py**:
```python
"""Phase 19-C 통합 테스트"""
import sys
sys.path.insert(0, 'backend')

from app.services.hangul.hml_parser import HMLParser

file_path = r'C:\MYCLAUDE_PROJECT\pdf\.claude\내신 2024년 인천 미추홀구 인화여고 고1 공통 1학기기말 수학상.Hml'

parser = HMLParser(file_path)
result = parser.parse()

print("=" * 70)
print("Phase 19-C: LaTeX 변환 테스트")
print("=" * 70)

for i, problem in enumerate(result.problems[:5]):
    print(f"\n[문제 {problem.number}]")
    print(f"  일반 텍스트: {problem.content_text[:80]}...")
    if problem.content_latex:
        print(f"  LaTeX: {problem.content_latex[:80]}...")
    print(f"  정답: {problem.answer}")
    if problem.answer_latex:
        print(f"  정답 LaTeX: {problem.answer_latex}")
```

### 6.3 프론트엔드 테스트

1. 개발 서버 실행
2. 브라우저에서 문제 표시 확인
3. 수식이 이탤릭 변수로 렌더링되는지 확인

---

## 구현 순서 요약

| 단계 | 작업 | 파일 | 예상 시간 |
|------|------|------|----------|
| 1 | HWP→LaTeX 변환기 구현 | `hwp_latex_converter.py` | - |
| 2 | 변환기 테스트 | `test_hwp_latex.py` | - |
| 3 | ParsedProblem 확장 | `parser_base.py` | - |
| 4 | HMLParser 통합 | `hml_parser.py` | - |
| 5 | 통합 테스트 | `test_phase19c.py` | - |
| 6 | KaTeX 설치 | `npm install` | - |
| 7 | MathDisplay 컴포넌트 | `MathDisplay.tsx` | - |
| 8 | 문제 표시 UI 업데이트 | 관련 컴포넌트들 | - |
| 9 | 전체 테스트 | 브라우저 확인 | - |

---

## 예상 결과

### Before (현재)
```
1. 부등식 |x-5|<3의 해가 a<x<8일 때, 실수 a의 값은?
   (일반 텍스트, x가 직립체)
```

### After (구현 후)
```
1. 부등식 |𝑥−5|<3의 해가 𝑎<𝑥<8일 때, 실수 𝑎의 값은?
   (KaTeX 렌더링, x가 이탤릭 수학 글꼴)
```

---

**작성자**: Claude (Opus)
**다음 단계**: "진행해줘"로 구현 시작
