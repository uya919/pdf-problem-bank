# Phase 19-F: 연립부등식/연립방정식 수식 변환 오류 연구 리포트

**작성일**: 2025-11-29
**상태**: 분석 완료 / 개선 필요

---

## 1. 문제 현상

### 1.1 증상
문제 15번에서 연립부등식 수식이 올바르게 렌더링되지 않음

**현재 웹 표시:**
```
연립부등식 {cases{x ^{2} - 2x - 3 ≥Wgeq 0# x ^{2} - Wleft( a + 5 Wright)x + 5a < 0}}을 만족시키는...
```

**기대 표시:**
```
연립부등식 { x² - 2x - 3 ≥ 0
            x² - (a+5)x + 5a < 0 } 을 만족시키는...
```

### 1.2 발생 패턴
- **`{cases{...#...}}`** 구조가 포함된 모든 수식
- **연립부등식, 연립방정식** 유형 문제

---

## 2. 원인 분석

### 2.1 데이터 흐름 추적

```
HML 원본 EQUATION
    ↓
{cases{``x ^{2} -2x-3 GEQ 0#``x ^{2} - LEFT (a+5 RIGHT )x+5a<0}}`
    ↓
clean_hwp_equation() → content_text
    ↓
{cases{x ^{2} -2x-3 ≥ 0#x ^{2} - (a+5 )x+5a<0}}
    ↓
hwp_to_latex() → content_latex
    ↓
${cases{x ^{2} - 2x - 3 \\geq 0# x ^{2} - \left( a + 5 \right)x + 5a < 0}}$
    ↓
KaTeX 렌더링 실패 (cases 미지원)
    ↓
백슬래시 이스케이프 오류 표시
```

### 2.2 핵심 문제: `cases` 구조 미변환

| HWP 문법 | LaTeX 변환 필요 | 현재 상태 |
|----------|----------------|----------|
| `{cases{A#B}}` | `\begin{cases}A\\B\end{cases}` | **변환 안 됨** |
| `#` (행 구분) | `\\` (줄바꿈) | **변환 안 됨** |
| `DEG` | `°` 또는 `^\circ` | **변환 안 됨** |

### 2.3 코드 분석

#### 2.3.1 `clean_hwp_equation()` (hml_parser.py:34-106)

**지원 항목:**
- ✅ `rm`, `it`, `bf` 글꼴 명령어
- ✅ `LEFT/RIGHT` 괄호
- ✅ `LEQ/GEQ/NEQ` 비교 연산자
- ✅ `sqrt` 제곱근
- ✅ 분수 (`over`)
- ✅ 그리스 문자

**미지원 항목:**
- ❌ `{cases{...#...}}` 연립 구조
- ❌ `#` 행 구분자
- ❌ `DEG` (도)
- ❌ `angle` (각도 기호)

#### 2.3.2 `HwpLatexConverter.convert()` (hwp_latex_converter.py)

**지원 항목:**
- ✅ `LEFT/RIGHT` → `\left/\right`
- ✅ `over` → `\frac{}{}`
- ✅ `sqrt` → `\sqrt{}`
- ✅ `rm/it/bold` 글꼴
- ✅ 기본 수학 기호 (COMMAND_MAP)

**미지원 항목:**
- ❌ `{cases{...}}` → `\begin{cases}...\end{cases}`
- ❌ `#` → `\\`
- ❌ `DEG` → `°`

### 2.4 백슬래시 렌더링 오류

웹에서 `\geq`가 `Wgeq`로, `\left`가 `Wleft`로 표시되는 이유:

1. **KaTeX 렌더링 실패**: `cases`가 유효한 LaTeX가 아니어서 렌더링 실패
2. **폴백 텍스트 표시**: 에러 시 원본 텍스트 그대로 표시
3. **HTML 이스케이프**: `\g` → 특수 시퀀스로 해석되어 `g` 손실, `W`처럼 보임

---

## 3. HWP `cases` 문법 분석

### 3.1 HWP 수식편집기 문법

```
{cases{식1#식2#식3}}
```

- `{cases{...}}`: 연립 시작/끝
- `#`: 행 구분자 (줄바꿈)
- 내부에 일반 HWP 수식 문법 사용 가능

### 3.2 예시

| HWP 원본 | 의미 |
|----------|------|
| `{cases{x GEQ 0#y LEQ 0}}` | x ≥ 0, y ≤ 0 연립 |
| `{cases{A#B#C}}` | 3행 연립 |

### 3.3 LaTeX 대응

```latex
\begin{cases}
x \geq 0 \\
y \leq 0
\end{cases}
```

---

## 4. 해결 방안

### 4.1 단기 해결: `clean_hwp_equation()` 수정

**plain text용 변환:**

```python
# cases 구조 변환 (읽기 쉬운 텍스트)
# {cases{식1#식2}} → { 식1 / 식2 }
def convert_cases_to_text(text):
    pattern = r'\{cases\{([^}]*(?:\{[^}]*\}[^}]*)*)\}\}'
    def replace_cases(match):
        content = match.group(1)
        # # → 줄바꿈 또는 슬래시
        content = content.replace('#', ' / ')
        return f'{{ {content} }}'
    return re.sub(pattern, replace_cases, text)
```

### 4.2 중기 해결: `hwp_to_latex()` 수정

**LaTeX용 변환:**

```python
# cases 구조를 LaTeX cases 환경으로 변환
def _convert_cases(self, text: str) -> str:
    """
    {cases{A#B#C}} → \begin{cases}A\\B\\C\end{cases}
    """
    pattern = r'\{cases\{([^}]*(?:\{[^}]*\}[^}]*)*)\}\}'

    def replace_cases(match):
        content = match.group(1)
        # # → \\
        rows = content.split('#')
        latex_rows = ' \\\\ '.join(row.strip() for row in rows)
        return f'\\begin{{cases}}{latex_rows}\\end{{cases}}'

    return re.sub(pattern, replace_cases, text)
```

### 4.3 추가 수정 필요 사항

| 항목 | 현재 | 수정 |
|------|------|------|
| `DEG` | 변환 안 됨 | `°` 또는 `^\circ` |
| `ANGLE` | `\angle` | 유지 (정상) |
| `#` (cases 외부) | 그대로 | `\quad` 또는 공백 |

---

## 5. 구현 우선순위

| 우선순위 | 작업 | 복잡도 | 효과 |
|---------|------|--------|------|
| 1 | cases → plain text 변환 | 낮음 | 높음 |
| 2 | cases → LaTeX 변환 | 중간 | 높음 |
| 3 | DEG 변환 추가 | 낮음 | 낮음 |
| 4 | 중첩 cases 지원 | 높음 | 낮음 |

---

## 6. 테스트 케이스

### 6.1 연립부등식

```python
# 입력
"{cases{``x ^{2} -2x-3 GEQ 0#``x ^{2} - LEFT (a+5 RIGHT )x+5a<0}}"

# content_text 기대값
"{ x² - 2x - 3 ≥ 0 / x² - (a+5)x + 5a < 0 }"

# content_latex 기대값
"\\begin{cases}x^{2} - 2x - 3 \\geq 0\\\\x^{2} - \\left(a + 5\\right)x + 5a < 0\\end{cases}"
```

### 6.2 연립방정식

```python
# 입력
"{cases{x+y=5#x-y=1}}"

# content_text 기대값
"{ x + y = 5 / x - y = 1 }"

# content_latex 기대값
"\\begin{cases}x + y = 5\\\\x - y = 1\\end{cases}"
```

---

## 7. 관련 파일

| 파일 | 역할 | 수정 필요 |
|------|------|----------|
| `hml_parser.py` | `clean_hwp_equation()` | **O** |
| `hwp_latex_converter.py` | `HwpLatexConverter` | **O** |
| `MathDisplay.tsx` | KaTeX 렌더링 | - |

---

## 8. 영향 받는 문제 유형

HML 파일에서 `{cases{` 패턴이 포함된 문제:

- 연립부등식 문제 (문제 15, 18 등)
- 연립방정식 문제
- 조건부 정의 함수 문제
- 경우의 수 문제

---

## 9. 결론

### 9.1 근본 원인
- **`{cases{...#...}}`** HWP 연립 구조가 LaTeX로 변환되지 않음
- 변환기에 cases 구조 처리 로직 부재

### 9.2 권장 조치

**즉시:**
1. `clean_hwp_equation()`에 cases → plain text 변환 추가
2. `hwp_to_latex()`에 cases → `\begin{cases}...\end{cases}` 변환 추가

**중기:**
3. `DEG` → `°` 변환 추가
4. 중첩 cases 지원 테스트

---

*Phase 19-F 연구 리포트 - 2025-11-29*
