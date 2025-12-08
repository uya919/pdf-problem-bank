# Phase 19-C: HWP 수식 → LaTeX/KaTeX 변환 연구 리포트

**작성일**: 2025-11-28
**목적**: 한글(HWP) 수식편집기 문법을 LaTeX/KaTeX로 정확하게 변환하여 웹에서 수학 기호를 올바르게 렌더링

---

## 1. 문제 정의

### 현재 상태
- HML 파일에서 EQUATION 태그의 SCRIPT 내용을 추출
- 단순 텍스트 변환 (rm 제거, leq→≤ 등)
- **결과**: 변수 x가 일반 텍스트로 표시됨 (수학 기호 𝑥가 아님)

### 목표 상태
- HWP 수식을 LaTeX 형식으로 정확히 변환
- KaTeX로 웹에서 수학적으로 올바르게 렌더링
- **결과**: `|𝑥−5| < 3` 형태로 표시 (이탤릭 변수, 적절한 기호)

---

## 2. HWP 수식편집기 문법 분석

### 2.1 기본 규칙 (한컴 공식 문서)

| 특성 | 설명 |
|------|------|
| 기본 글꼴 | 영문/변수는 **이탤릭**이 기본 |
| 항 구분 | 빈칸, Enter, Tab으로 구분 |
| 그룹화 | `{ }` 중괄호로 묶음 |
| 9자 규칙 | 한 낱말이 9자 초과시 두 항으로 분리 |

### 2.2 글꼴 명령어

| HWP 명령 | 의미 | LaTeX 변환 |
|----------|------|------------|
| `rm` | Roman (직립체) | `\mathrm{}` |
| `it` | Italic (기울임) | 기본값 또는 `\mathit{}` |
| `bold` | 굵게 | `\mathbf{}` |
| `rmbold` | 직립+굵게 | `\mathbf{\mathrm{}}` |

**예시**:
- HWP: `rm ABC` → LaTeX: `\mathrm{ABC}` (직립체 ABC)
- HWP: `rm A it x` → LaTeX: `\mathrm{A} x` (직립 A, 이탤릭 x)

### 2.3 수식 구조 명령어

| HWP 명령 | 의미 | LaTeX 변환 |
|----------|------|------------|
| `{a} over {b}` | 분수 | `\frac{a}{b}` |
| `sqrt{x}` | 제곱근 | `\sqrt{x}` |
| `x^2` 또는 `x SUP 2` | 위첨자 | `x^{2}` |
| `x_1` 또는 `x SUB 1` | 아래첨자 | `x_{1}` |
| `LEFT ( ... RIGHT )` | 자동 크기 괄호 | `\left( ... \right)` |
| `LEFT | ... RIGHT |` | 절댓값 | `\left| ... \right|` |

### 2.4 비교 연산자

| HWP 명령 | 의미 | LaTeX 변환 | 유니코드 |
|----------|------|------------|----------|
| `leq` / `LEQ` | ≤ | `\leq` | ≤ |
| `geq` / `GEQ` | ≥ | `\geq` | ≥ |
| `neq` / `NEQ` | ≠ | `\neq` | ≠ |
| `pm` | ± | `\pm` | ± |
| `times` | × | `\times` | × |

### 2.5 그리스 문자

| HWP 명령 | LaTeX | 유니코드 |
|----------|-------|----------|
| `alpha` | `\alpha` | α |
| `beta` | `\beta` | β |
| `gamma` | `\gamma` | γ |
| `ALPHA` | `A` | A (대문자는 로마자) |
| `DELTA` | `\Delta` | Δ |

### 2.6 특수 공백

| HWP | 의미 | LaTeX |
|-----|------|-------|
| ` ` (백틱) | 1/4 빈칸 | `\,` (thin space) |
| ``` `` ``` | 1/2 빈칸 | `\:` |
| `~` | 1칸 빈칸 | `\quad` |

---

## 3. 실제 HML 파일 수식 예시

### 문제 1번 관련 수식들 (인화여고 파일)

```
[1] LEFT |  `x-5 ` RIGHT | <3`     → |x-5| < 3
[2] a<x<8`                          → a < x < 8
[3] rm 1, rm 2, rm 3, rm 4, rm 5    → 보기 번호 ①②③④⑤
[4] rm A it LEFT (-1,`` 2 RIGHT )   → 점 A(-1, 2)
[5] 2 x+1  leq 5  leq x+a`         → 2x+1 ≤ 5 ≤ x+a
[6] -{5} over {4}                   → -5/4
[7] sqrt{2}                         → √2
```

---

## 4. hml_equation_parser 라이브러리 분석

### 4.1 설치
```bash
pip install hml_equation_parser
```

### 4.2 기본 사용법
```python
import hml_equation_parser as hp
latex = hp.eq2latex("LEFT | x-5 RIGHT | <3")
# 결과: \left | x-5 \right | <3
```

### 4.3 지원 변환 (convertMap.json)

**지원됨** (195개 항목):
- `LEQ` → `\leq` ✓
- `GEQ` → `\geq` ✓
- `LEFT`/`RIGHT` → `\left`/`\right` ✓
- `sqrt` → `\sqrt` ✓
- `alpha`, `beta` → `\alpha`, `\beta` ✓
- `times` → `\times` ✓

**미지원** (추가 필요):
- `leq` (소문자) → `\leq`
- `geq` (소문자) → `\geq`
- `rm` → `\mathrm{}`
- `it` → (제거 또는 `\mathit{}`)
- `bold` → `\mathbf{}`

---

## 5. LaTeX/KaTeX 수학 글꼴

### 5.1 기본 원칙 (TeX)

- **수학 모드 기본**: 영문자는 이탤릭 (변수로 해석)
- **함수명**: sin, cos, log 등은 직립체 (`\sin`, `\cos`)
- **단위/라벨**: 직립체 사용 (`\mathrm{kg}`, `\mathrm{점 A}`)

### 5.2 KaTeX 글꼴 명령어

| 명령어 | 용도 | 예시 |
|--------|------|------|
| (기본) | 변수 | `x` → 𝑥 |
| `\mathrm{}` | 직립 텍스트 | `\mathrm{A}` → A |
| `\mathit{}` | 다중 문자 이탤릭 | `\mathit{var}` → 𝑣𝑎𝑟 |
| `\mathbf{}` | 굵은 글꼴 | `\mathbf{v}` → **v** |
| `\text{}` | 일반 텍스트 | `\text{점}` → 점 |

### 5.3 KaTeX 렌더링 예시

| LaTeX | 렌더링 결과 |
|-------|-------------|
| `\left\|x-5\right\| < 3` | \|𝑥−5\| < 3 |
| `a < x < 8` | 𝑎 < 𝑥 < 8 |
| `\frac{5}{4}` | ⁵⁄₄ |
| `\sqrt{2}` | √2 |
| `2x+1 \leq 5` | 2𝑥+1 ≤ 5 |

---

## 6. 구현 전략

### 6.1 변환 파이프라인

```
HML 파일
    ↓
EQUATION/SCRIPT 추출
    ↓
HWP 수식 문자열
    ↓
[1단계] 전처리
    - 백틱(`) → thin space
    - 대소문자 정규화
    ↓
[2단계] hml_equation_parser 호출
    - 기본 변환 수행
    ↓
[3단계] 후처리 (추가 변환)
    - leq/geq → \leq/\geq
    - rm {...} → \mathrm{...}
    - it 제거
    ↓
[4단계] LaTeX 정리
    - 불필요한 공백 제거
    - 중괄호 정리
    ↓
LaTeX 문자열
    ↓
KaTeX 렌더링 (프론트엔드)
```

### 6.2 새로운 변환 함수 설계

```python
def hwp_to_latex(hwp_eq: str) -> str:
    """
    HWP 수식 문자열을 LaTeX로 변환

    Args:
        hwp_eq: HWP 수식 편집기 문법 문자열

    Returns:
        LaTeX 형식 문자열 (KaTeX 호환)
    """
    # 1. 전처리
    text = preprocess_hwp(hwp_eq)

    # 2. 기본 변환 (hml_equation_parser 활용 또는 자체 구현)
    text = convert_basic_commands(text)

    # 3. 글꼴 명령어 처리
    text = convert_font_commands(text)

    # 4. 후처리
    text = postprocess_latex(text)

    return text
```

### 6.3 프론트엔드 KaTeX 통합

```tsx
// React 컴포넌트
import katex from 'katex';
import 'katex/dist/katex.min.css';

function MathDisplay({ latex }: { latex: string }) {
  const html = katex.renderToString(latex, {
    throwOnError: false,
    displayMode: false, // inline
  });

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
```

---

## 7. 데이터 구조 변경

### 7.1 ParsedProblem 확장

```python
@dataclass
class ParsedProblem:
    # 기존 필드들...

    # 새 필드: 수식 정보
    content_equations: List[str]       # LaTeX 수식 목록
    content_text_with_math: str        # 수식 마커 포함 텍스트
    answer_latex: Optional[str]        # 정답 LaTeX 형식
```

### 7.2 API 응답 형식

```json
{
  "number": "1",
  "content_text": "부등식 |x-5|<3의 해가 a<x<8일 때, 실수 a의 값은?",
  "content_latex": "부등식 $\\left|x-5\\right|<3$의 해가 $a<x<8$일 때, 실수 $a$의 값은?",
  "answer": "②",
  "answer_latex": "2"
}
```

---

## 8. 참고 자료

### 공식 문서
- [한컴 수식 파일 형식 PDF](https://cdn.hancom.com/link/docs/한글문서파일형식_수식_revision1.3.pdf)
- [한컴 수식 명령어 도움말](https://help.hancom.com/hoffice/multi/ko_kr/hwp/insert/equation/equation(explanation).htm)
- [KaTeX 공식 문서](https://katex.org/)
- [KaTeX 지원 함수 목록](https://katex.org/docs/supported.html)

### 오픈소스 도구
- [hml-equation-parser (GitHub)](https://github.com/OpenBapul/hml-equation-parser)
- [hml_equation_parser (PyPI)](https://pypi.org/project/hml_equation_parser/)

### 참고 문헌
- [Overleaf - Mathematical fonts](https://www.overleaf.com/learn/latex/Mathematical_fonts)
- [TeX StackExchange - Math mode fonts](https://tex.stackexchange.com/questions/58098/what-are-all-the-font-styles-i-can-use-in-math-mode)

---

## 9. 구현 우선순위

### Phase 19-C-1: 기본 변환기 구현
1. `hwp_to_latex()` 함수 작성
2. 주요 명령어 변환 (leq, geq, over, sqrt, LEFT/RIGHT)
3. 글꼴 명령어 처리 (rm, it, bold)

### Phase 19-C-2: 파서 통합
1. HMLParser에 LaTeX 변환 통합
2. ParsedProblem에 latex 필드 추가
3. API 응답에 latex 포함

### Phase 19-C-3: 프론트엔드 렌더링
1. KaTeX 라이브러리 설치
2. 수식 렌더링 컴포넌트 구현
3. 문제 표시 UI 업데이트

---

**작성자**: Claude (Opus)
**상태**: 연구 완료, 구현 대기
