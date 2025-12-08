# Phase 19-F: 연립부등식/연립방정식 수식 변환 - 상세 개발 계획

**작성일**: 2025-11-29
**상태**: 계획 수립 완료
**우선순위**: 높음

---

## 1. 목표

### 1.1 핵심 목표
HWP `{cases{...#...}}` 구조를 올바른 LaTeX `\begin{cases}...\end{cases}`로 변환하여 KaTeX에서 연립부등식/연립방정식이 정상적으로 렌더링되도록 한다.

### 1.2 기대 결과

| 상태 | 현재 표시 | 기대 표시 |
|------|----------|----------|
| 웹 | `{cases{x ≥Wgeq 0# y Wleq 0}}` | $\begin{cases}x \geq 0\\y \leq 0\end{cases}$ |
| Plain Text | `{cases{x ≥ 0#y ≤ 0}}` | `{ x ≥ 0 / y ≤ 0 }` |
| LaTeX | 변환 없음 | `\begin{cases}x \geq 0\\y \leq 0\end{cases}` |

---

## 2. 아키텍처 분석

### 2.1 현재 데이터 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│                     HML 파일 (XML)                               │
│  <EQUATION><SCRIPT>{cases{A GEQ 0#B LEQ 0}}</SCRIPT></EQUATION> │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ hml_parser.py: _get_paragraph_text_with_latex()                 │
│  1. EQUATION 태그 발견                                           │
│  2. eq_text 추출: "{cases{A GEQ 0#B LEQ 0}}"                    │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────────┐
│ clean_hwp_equation()    │     │ hwp_to_latex()                  │
│ → content_text          │     │ → content_latex                 │
│                         │     │                                 │
│ 현재: cases 미변환      │     │ 현재: cases 미변환              │
│ "{cases{A ≥ 0#B ≤ 0}}"  │     │ "{cases{A \geq 0#B \leq 0}}"   │
└─────────────────────────┘     └─────────────────────────────────┘
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────────┐
│ ParsedProblem           │     │ MathDisplay.tsx (KaTeX)         │
│  .content_text          │     │  $...$  패턴 렌더링             │
│                         │     │                                 │
│ 읽기용 텍스트 표시      │     │ 현재: 렌더링 실패 → 폴백 표시  │
└─────────────────────────┘     └─────────────────────────────────┘
```

### 2.2 수정 대상 파일

| 파일 | 역할 | 수정 내용 |
|------|------|----------|
| `backend/app/services/hangul/hml_parser.py` | plain text 변환 | `clean_hwp_equation()`에 cases 변환 추가 |
| `backend/app/services/hangul/hwp_latex_converter.py` | LaTeX 변환 | `_convert_cases()` 메서드 추가 |
| `backend/tests/test_phase19f_cases.py` | 테스트 | 신규 테스트 파일 생성 |

---

## 3. HWP cases 문법 상세 분석

### 3.1 기본 구조

```
{cases{행1#행2#행3}}
```

- **외부 중괄호**: `{cases{...}}`
- **내부 중괄호**: 연립 수식 시작/끝
- **`#`**: 행 구분자 (각 방정식/부등식 구분)

### 3.2 실제 예시 (HML 파일 기반)

```
원본: {cases{``x ^{2} -2x-3 GEQ 0#``x ^{2} - LEFT (a+5 RIGHT )x+5a<0}}

분해:
- 행1: ``x ^{2} -2x-3 GEQ 0
- 행2: ``x ^{2} - LEFT (a+5 RIGHT )x+5a<0
```

### 3.3 변환 규칙

| HWP 원본 | Plain Text | LaTeX |
|----------|------------|-------|
| `{cases{A#B}}` | `{ A / B }` | `\begin{cases}A\\B\end{cases}` |
| `{cases{A#B#C}}` | `{ A / B / C }` | `\begin{cases}A\\B\\C\end{cases}` |
| `#` (cases 내부) | ` / ` | `\\` |

### 3.4 엣지 케이스

| 케이스 | 예시 | 처리 방법 |
|--------|------|----------|
| 중첩 중괄호 | `{cases{{a} over {b}#c}}` | 분수 먼저 처리 후 cases |
| 빈 행 | `{cases{A##B}}` | 빈 행 허용 |
| 단일 행 | `{cases{A}}` | 단일 행도 cases로 처리 |
| cases 외부 # | `A#B` (cases 밖) | 무시 또는 공백 |

---

## 4. 단계별 구현 계획

### 4.1 Step 1: clean_hwp_equation() cases 변환 (Plain Text)

**파일**: `backend/app/services/hangul/hml_parser.py`
**위치**: Line 34-106 (`clean_hwp_equation()` 함수)

**변경 사항**:
```python
def clean_hwp_equation(equation: str) -> str:
    text = equation

    # Phase 19-F Step 1: cases 구조 변환 (plain text)
    # {cases{A#B#C}} → { A / B / C }
    def convert_cases_to_text(match):
        content = match.group(1)
        # # → /
        rows = content.split('#')
        formatted_rows = ' / '.join(row.strip() for row in rows)
        return f'{{ {formatted_rows} }}'

    # 비탐욕적 매칭으로 중첩 처리
    text = re.sub(r'\{cases\{([^}]*(?:\{[^}]*\}[^}]*)*)\}\}',
                  convert_cases_to_text, text)

    # ... 기존 코드 ...
```

**구현 위치**: Line ~55 (기존 변환 전에 추가)

**테스트 케이스**:
```python
# 입력
"{cases{``x ^{2} -2x-3 GEQ 0#``x ^{2} - LEFT (a+5 RIGHT )x+5a<0}}"

# 기대 출력
"{ x² - 2x - 3 ≥ 0 / x² - (a+5)x + 5a < 0 }"
```

---

### 4.2 Step 2: DEG 변환 추가 (Plain Text)

**파일**: `backend/app/services/hangul/hml_parser.py`
**위치**: Line 71-81 (수학 기호 변환 섹션)

**변경 사항**:
```python
# Phase 19-F Step 2: 각도 기호
text = re.sub(r'\bDEG\b', '°', text)
text = re.sub(r'\bdeg\b', '°', text)
```

**테스트 케이스**:
```python
# 입력
"angle A = 90 DEG"

# 기대 출력
"∠A = 90°"
```

---

### 4.3 Step 3: HwpLatexConverter에 _convert_cases() 추가 (LaTeX)

**파일**: `backend/app/services/hangul/hwp_latex_converter.py`
**위치**: Line 236-275 (`convert()` 메서드)

**새 메서드 추가**:
```python
def _convert_cases(self, text: str) -> str:
    """
    Phase 19-F: cases 구조를 LaTeX cases 환경으로 변환

    {cases{A#B#C}} → \\begin{cases}A\\\\B\\\\C\\end{cases}
    """
    def replace_cases(match):
        content = match.group(1)
        # # → \\\\
        rows = content.split('#')
        latex_rows = ' \\\\ '.join(row.strip() for row in rows)
        return f'\\begin{{cases}}{latex_rows}\\end{{cases}}'

    # 패턴: {cases{...}} - 중첩 중괄호 허용
    pattern = r'\{cases\{([^}]*(?:\{[^}]*\}[^}]*)*)\}\}'
    return re.sub(pattern, replace_cases, text)
```

**convert() 메서드 수정**:
```python
def convert(self, hwp_eq: str) -> str:
    # ...

    # 1. 전처리
    text = self._preprocess(text)

    # Phase 19-F Step 3: cases 변환 (다른 변환보다 먼저!)
    text = self._convert_cases(text)

    # 2. 괄호 처리 (LEFT/RIGHT)
    text = self._convert_brackets(text)

    # ... 나머지 기존 코드 ...
```

**중요**: cases 변환은 **다른 모든 변환보다 먼저** 실행되어야 함
- 이유: cases 내부의 수식들은 나중에 개별 변환됨

**테스트 케이스**:
```python
# 입력
"{cases{x GEQ 0#y LEQ 0}}"

# 기대 출력
"\\begin{cases}x \\geq 0 \\\\ y \\leq 0\\end{cases}"
```

---

### 4.4 Step 4: DEG LaTeX 변환 추가

**파일**: `backend/app/services/hangul/hwp_latex_converter.py`
**위치**: COMMAND_MAP (Line 24-219)

**변경 사항**:
```python
COMMAND_MAP = {
    # ... 기존 매핑 ...

    # Phase 19-F Step 4: 각도 기호
    'DEG': r'^{\circ}',  # 또는 '°' 직접 사용
    # 주의: 소문자 deg는 \deg (도 함수)와 구분 필요
}
```

**주의사항**:
- `deg` (소문자)는 기존에 `\deg` (도 함수)로 매핑됨
- `DEG` (대문자)만 `°` 각도 기호로 추가

---

### 4.5 Step 5: 중첩 cases 지원 (선택사항)

**복잡도**: 높음
**우선순위**: 낮음

중첩 cases 패턴 (드문 경우):
```
{cases{{cases{A#B}}#C}}
```

→ 반복 적용으로 해결:
```python
# 최대 3회 반복 (깊은 중첩 드문)
for _ in range(3):
    prev = text
    text = re.sub(pattern, replace_cases, text)
    if prev == text:
        break
```

---

## 5. 테스트 계획

### 5.1 단위 테스트 파일

**파일**: `backend/tests/test_phase19f_cases.py`

```python
# -*- coding: utf-8 -*-
"""
Phase 19-F: cases 변환 테스트
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.hangul.hml_parser import clean_hwp_equation
from app.services.hangul.hwp_latex_converter import hwp_to_latex


def test_cases_plain_text():
    """cases → plain text 변환 테스트"""
    test_cases = [
        # (입력, 기대 출력)
        (
            "{cases{x GEQ 0#y LEQ 0}}",
            "{ x ≥ 0 / y ≤ 0 }"
        ),
        (
            "{cases{x+y=5#x-y=1}}",
            "{ x + y = 5 / x - y = 1 }"
        ),
        (
            "{cases{A#B#C}}",
            "{ A / B / C }"
        ),
    ]

    print("=== cases → plain text 테스트 ===")
    for hwp_input, expected in test_cases:
        result = clean_hwp_equation(hwp_input)
        status = "OK" if expected in result else "FAIL"
        print(f"[{status}] {hwp_input[:30]}...")
        if status == "FAIL":
            print(f"  기대: {expected}")
            print(f"  결과: {result}")


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
    ]

    print("\n=== cases → LaTeX 테스트 ===")
    for hwp_input, expected_contains in test_cases:
        result = hwp_to_latex(hwp_input)
        status = "OK" if expected_contains in result else "FAIL"
        print(f"[{status}] {hwp_input[:30]}...")
        if status == "FAIL":
            print(f"  기대 포함: {expected_contains}")
            print(f"  결과: {result}")


def test_deg_conversion():
    """DEG 변환 테스트"""
    test_cases = [
        ("90 DEG", "90°"),
        ("angle A = 30 DEG", "∠A = 30°"),
    ]

    print("\n=== DEG 변환 테스트 ===")
    for hwp_input, expected_contains in test_cases:
        result = clean_hwp_equation(hwp_input)
        status = "OK" if "°" in result else "FAIL"
        print(f"[{status}] {hwp_input} → {result}")


if __name__ == '__main__':
    test_cases_plain_text()
    test_cases_latex()
    test_deg_conversion()
```

### 5.2 통합 테스트

**파일**: 기존 `backend/tests/test_phase19e_choices.py` 활용

```python
def test_problem15_equation():
    """문제 15번 연립부등식 렌더링 테스트"""
    parser = HMLParser(TEST_FILE)
    result = parser.parse()

    p15 = result.problems[14]  # 0-indexed

    # cases 패턴이 변환되었는지 확인
    assert "{cases{" not in p15.content_text
    assert "{cases{" not in p15.content_latex

    # LaTeX가 올바른 형식인지 확인
    assert "\\begin{cases}" in p15.content_latex
    assert "\\end{cases}" in p15.content_latex
```

### 5.3 수동 테스트

1. 백엔드 서버 재시작
2. 프론트엔드에서 HML 파일 업로드
3. 문제 15번 확인
4. 연립부등식이 정상 렌더링되는지 확인

---

## 6. 구현 순서 및 체크리스트

### 6.1 구현 순서

```
Step 1: clean_hwp_equation() cases 변환
   ↓
Step 2: clean_hwp_equation() DEG 변환
   ↓
Step 3: HwpLatexConverter._convert_cases() 추가
   ↓
Step 4: COMMAND_MAP에 DEG 추가
   ↓
Step 5: 테스트 파일 생성 및 실행
   ↓
Step 6: 통합 테스트 (HML 파일 파싱)
   ↓
Step 7: 웹 UI 수동 테스트
```

### 6.2 체크리스트

- [ ] Step 1: `clean_hwp_equation()`에 cases → plain text 변환 추가
- [ ] Step 2: `clean_hwp_equation()`에 DEG → ° 변환 추가
- [ ] Step 3: `HwpLatexConverter`에 `_convert_cases()` 메서드 추가
- [ ] Step 4: `convert()`에서 cases 변환 호출 (다른 변환보다 먼저)
- [ ] Step 5: COMMAND_MAP에 DEG 추가
- [ ] Step 6: 테스트 파일 생성 (`test_phase19f_cases.py`)
- [ ] Step 7: 단위 테스트 실행 및 통과
- [ ] Step 8: 통합 테스트 (문제 15번 확인)
- [ ] Step 9: 웹 UI 수동 테스트
- [ ] Step 10: 완료 리포트 작성

---

## 7. 리스크 및 대응

### 7.1 잠재적 문제

| 리스크 | 영향 | 대응 방안 |
|--------|------|----------|
| 중첩 중괄호 매칭 실패 | 일부 수식 변환 안 됨 | 비탐욕적 패턴 + 반복 적용 |
| cases 외부 # 오변환 | 다른 수식 깨짐 | cases 패턴 내부만 처리 |
| DEG vs deg 혼동 | 도 함수와 각도 기호 혼동 | 대소문자 구분 처리 |
| LaTeX 이스케이프 오류 | KaTeX 렌더링 실패 | 백슬래시 이중 이스케이프 |

### 7.2 회귀 테스트

기존 기능이 정상 동작하는지 확인:
- Phase 19-E: 선택지 추출 (17/17)
- Phase 19-D: 문제 경계 추출
- Phase 19-C: 기본 LaTeX 변환 (분수, 제곱근 등)

---

## 8. 예상 소요 시간

| 단계 | 예상 작업량 |
|------|------------|
| Step 1-2: Plain Text 변환 | 코드 10줄 |
| Step 3-4: LaTeX 변환 | 코드 20줄 |
| Step 5-6: 테스트 | 코드 50줄 |
| Step 7-9: 검증 | 수동 테스트 |

**총 예상 코드 변경량**: ~80줄

---

## 9. 관련 문서

- [31_phase19f_equation_cases_research_report.md](31_phase19f_equation_cases_research_report.md) - 연구 리포트
- [30_phase19e_completion_report.md](30_phase19e_completion_report.md) - Phase 19-E 완료 리포트
- [45_hwp_equation_vs_latex_report.md](45_hwp_equation_vs_latex_report.md) - HWP 수식 문법 분석

---

*Phase 19-F 개발 계획 - 2025-11-29*
