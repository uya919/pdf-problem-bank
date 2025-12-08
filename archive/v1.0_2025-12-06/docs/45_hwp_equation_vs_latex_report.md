# HWP 수식 문법 vs LaTeX 분석 리포트

**작성일**: 2025-11-28
**작성자**: Claude Code (Opus)
**주제**: HWP/HML 수식 표현과 LaTeX 차이점 분석

---

## 1. 요약 (Executive Summary)

### 1.1 문제 현상
```
기대 출력: ① 1② 2③ 3④ 4⑤ 5
실제 출력: ① rm 1② rm 2③ rm 3④ rm 4⑤ rm 5
```

### 1.2 원인
HWP 수식에서 `rm`은 **"Roman"(로만체)** 명령어로, 일반 텍스트(비이탤릭)를 표현합니다.
`rm 1`은 "1을 로만체(수직)로 표시"라는 의미입니다.

### 1.3 핵심 발견
| 항목 | HWP 수식 | LaTeX |
|------|----------|-------|
| 로만체 | `rm 1` | `\mathrm{1}` |
| 이탤릭 | `it x` | `x` (기본) |
| 분수 | `a over b` | `\frac{a}{b}` |
| 제곱근 | `sqrt a` | `\sqrt{a}` |
| 백슬래시 | **사용 안 함** | **필수** |

---

## 2. HWP 수식 문법 분석

### 2.1 분석 결과 통계
```
총 수식 수: 227개
발견된 명령어: 31종

상위 명령어:
  rm (로만체)    : 123회  ← 핵심!
  LEFT/RIGHT    :  66회  (괄호 확대)
  it (이탤릭)    :  32회
  over (분수)    :  20회
  sqrt (제곱근)  :   8회
  leq (≤)       :   7회
```

### 2.2 `rm` 명령어 상세

#### 문제의 근원
```
HWP 원본:       ① rm 1② rm 2③ rm 3④ rm 4⑤ rm 5
실제 의미:      ① 1    ② 2    ③ 3    ④ 4    ⑤ 5
```

#### `rm` 사용 패턴
```
rm 1, rm 2, rm 3, rm 4, rm 5     → 답안 보기 번호
rm 10, rm 11, rm 12, rm 13, rm 14 → 계산 결과 값
rm A, rm B, rm C                  → 점/도형 이름
rm ABC, rm AB                     → 삼각형/선분 이름
rm 500, rm 200, rm 4400           → 단위가 있는 수
```

#### 왜 `rm`을 사용하는가?
수학에서:
- **변수**는 이탤릭: *x*, *y*, *a*, *b* (기울어진 글꼴)
- **상수/숫자**는 로만: 1, 2, 3, A, B, sin, cos (수직 글꼴)

HWP는 이를 구분하기 위해:
- `rm 1` = 숫자 1 (로만체, 수직)
- `it x` = 변수 x (이탤릭, 기울임)

---

## 3. HWP 수식 vs LaTeX 비교

### 3.1 기본 명령어 비교

| 개념 | HWP 수식 | LaTeX | 설명 |
|------|----------|-------|------|
| 분수 | `a over b` | `\frac{a}{b}` | HWP는 공백 구분 |
| 제곱근 | `sqrt a` | `\sqrt{a}` | HWP는 중괄호 불필요 |
| 위첨자 | `x^2` | `x^{2}` | 동일하나 HWP는 중괄호 생략 가능 |
| 아래첨자 | `x_1` | `x_{1}` | 동일 |
| 로만체 | `rm ABC` | `\mathrm{ABC}` | HWP는 백슬래시 없음 |
| 이탤릭 | `it x` | `\mathit{x}` | HWP 기본은 로만 |
| 볼드 | `bf x` | `\mathbf{x}` | |

### 3.2 괄호 확대

| HWP 수식 | LaTeX | 렌더링 |
|----------|-------|--------|
| `LEFT ( x RIGHT )` | `\left( x \right)` | (x) 자동 크기 |
| `LEFT | x RIGHT |` | `\left| x \right|` | \|x\| 절댓값 |

### 3.3 특수 기호

| 개념 | HWP 수식 | LaTeX | 기호 |
|------|----------|-------|------|
| 작거나 같음 | `leq` | `\leq` | ≤ |
| 크거나 같음 | `geq` | `\geq` | ≥ |
| 같지 않음 | `neq` | `\neq` | ≠ |
| 무한대 | `infty` | `\infty` | ∞ |
| 플마 | `pm` | `\pm` | ± |

### 3.4 핵심 차이점

1. **백슬래시 유무**
   ```
   HWP:   sqrt 2
   LaTeX: \sqrt{2}
   ```

2. **중괄호 사용**
   ```
   HWP:   {a+b} over {c+d}
   LaTeX: \frac{a+b}{c+d}
   ```

3. **공백의 의미**
   ```
   HWP:   rm ABC  (ABC를 로만체로)
   LaTeX: \mathrm{ABC}
   ```

4. **기본 글꼴**
   ```
   HWP:   기본 로만체, it로 이탤릭 지정
   LaTeX: 기본 이탤릭, \mathrm으로 로만 지정
   ```

---

## 4. 실제 수식 예시 비교

### 4.1 간단한 수식
| 표현 | HWP | LaTeX |
|------|-----|-------|
| 2차 방정식 | `4 x-y=0` | `4x-y=0` |
| 절대값 부등식 | `LEFT | x-5 RIGHT | < 3` | `\left|x-5\right| < 3` |
| 연립부등식 | `2 x+1 leq 5 leq x+a` | `2x+1 \leq 5 \leq x+a` |

### 4.2 좌표/점
| 표현 | HWP | LaTeX |
|------|-----|-------|
| 점 A | `rm A it LEFT (-1, 2 RIGHT )` | `\mathrm{A}(-1, 2)` |
| 삼각형 ABC | `rm ABC` | `\mathrm{ABC}` 또는 `\triangle ABC` |

### 4.3 분수
| 표현 | HWP | LaTeX |
|------|-----|-------|
| 4분의 5 | `{5} over {4}` | `\frac{5}{4}` |
| 루트2 | `sqrt{2}` | `\sqrt{2}` |

---

## 5. 해결 방안

### 5.1 방안 A: HWP 수식 → 텍스트 변환 (권장)

단순히 숫자/문자만 추출하는 경우:

```python
def hwp_equation_to_text(equation: str) -> str:
    """HWP 수식에서 표시용 텍스트 추출"""
    import re

    # rm/it 제거 (로만체/이탤릭 지시자)
    text = re.sub(r'\b(rm|it|bf)\s+', '', equation)

    # LEFT/RIGHT 괄호 명령 → 실제 괄호
    text = re.sub(r'\bLEFT\s*\(', '(', text)
    text = re.sub(r'\bRIGHT\s*\)', ')', text)
    text = re.sub(r'\bLEFT\s*\|', '|', text)
    text = re.sub(r'\bRIGHT\s*\|', '|', text)

    # 백틱 제거
    text = text.replace('`', '')

    # 여러 공백 → 하나로
    text = re.sub(r'\s+', ' ', text).strip()

    return text
```

**변환 예시:**
```
입력: rm 1
출력: 1

입력: rm A it LEFT (-1, 2 RIGHT )
출력: A (-1, 2)

입력: LEFT | x-5 RIGHT | < 3
출력: |x-5| < 3
```

### 5.2 방안 B: HWP 수식 → LaTeX 변환

수식 표현을 유지해야 하는 경우:

```python
def hwp_equation_to_latex(equation: str) -> str:
    """HWP 수식을 LaTeX로 변환"""
    import re

    text = equation

    # rm → \mathrm{}
    text = re.sub(r'\brm\s+(\S+)', r'\\mathrm{\1}', text)

    # it → \mathit{}
    text = re.sub(r'\bit\s+(\S+)', r'\\mathit{\1}', text)

    # over → \frac{}{}
    text = re.sub(r'\{([^}]+)\}\s*over\s*\{([^}]+)\}', r'\\frac{\1}{\2}', text)

    # sqrt → \sqrt{}
    text = re.sub(r'\bsqrt\s*\{([^}]+)\}', r'\\sqrt{\1}', text)
    text = re.sub(r'\bsqrt\s+(\S+)', r'\\sqrt{\1}', text)

    # LEFT/RIGHT → \left/\right
    text = re.sub(r'\bLEFT\s*', r'\\left', text)
    text = re.sub(r'\bRIGHT\s*', r'\\right', text)

    # 비교 연산자
    text = re.sub(r'\bleq\b', r'\\leq', text)
    text = re.sub(r'\bgeq\b', r'\\geq', text)
    text = re.sub(r'\bneq\b', r'\\neq', text)

    # 백틱 제거
    text = text.replace('`', '')

    return text
```

**변환 예시:**
```
입력: rm 1
출력: \mathrm{1}

입력: {5} over {4}
출력: \frac{5}{4}

입력: 2 x+1 leq 5
출력: 2 x+1 \leq 5
```

### 5.3 방안 C: 답안 보기 전용 간소화

답안 ①②③④⑤의 숫자만 필요한 경우:

```python
def extract_choice_number(equation: str) -> str:
    """답안 보기에서 숫자만 추출"""
    import re

    # 'rm N' 패턴에서 숫자만 추출
    match = re.match(r'^rm\s+(\d+)$', equation.strip())
    if match:
        return match.group(1)

    return equation
```

---

## 6. 구현 권장 사항

### 6.1 즉시 적용 (Phase 19)

`hml_parser.py`의 텍스트 추출 시 수식 정리:

```python
def _clean_equation_text(self, text: str) -> str:
    """수식 텍스트 정리"""
    # rm/it 명령어 제거
    text = re.sub(r'\b(rm|it|bf)\s+', '', text)
    # LEFT/RIGHT 정리
    text = re.sub(r'\bLEFT\s*([(\[|])', r'\1', text)
    text = re.sub(r'\bRIGHT\s*([)\]|])', r'\1', text)
    # 백틱 제거
    text = text.replace('`', '')
    return text.strip()
```

### 6.2 EQUATION 태그 특별 처리

```python
def _get_paragraph_text(self, p_elem) -> str:
    """문단에서 텍스트 추출 (수식 정리 포함)"""
    texts = []

    for elem in p_elem.iter():
        if elem.tag == 'EQUATION':
            # 수식은 정리해서 추출
            eq_text = ''.join(elem.itertext())
            eq_text = self._clean_equation_text(eq_text)
            texts.append(eq_text)
        elif elem.tag == 'CHAR' and elem.text:
            texts.append(elem.text)

    return ''.join(texts)
```

---

## 7. HWP 수식 명령어 전체 목록

### 7.1 글꼴 스타일
| 명령어 | 의미 | 예시 |
|--------|------|------|
| `rm` | Roman (로만체/수직) | `rm ABC` |
| `it` | Italic (이탤릭/기울임) | `it x` |
| `bf` | Bold (굵은체) | `bf A` |

### 7.2 수학 구조
| 명령어 | 의미 | 예시 |
|--------|------|------|
| `over` | 분수 | `a over b` |
| `sqrt` | 제곱근 | `sqrt 2` |
| `sum` | 시그마 | `sum from 1 to n` |
| `int` | 적분 | `int` |
| `lim` | 극한 | `lim` |
| `cases` | 케이스 분기 | `cases{...}` |

### 7.3 비교/관계 연산자
| 명령어 | 의미 | 기호 |
|--------|------|------|
| `leq` | 작거나 같음 | ≤ |
| `geq` | 크거나 같음 | ≥ |
| `neq` | 같지 않음 | ≠ |
| `approx` | 약 | ≈ |

### 7.4 괄호
| 명령어 | 의미 |
|--------|------|
| `LEFT (` | 왼쪽 괄호 (자동 크기) |
| `RIGHT )` | 오른쪽 괄호 |
| `LEFT |` | 왼쪽 절댓값 |
| `RIGHT |` | 오른쪽 절댓값 |

### 7.5 그리스 문자
| 명령어 | 기호 |
|--------|------|
| `alpha` | α |
| `beta` | β |
| `gamma` | γ |
| `theta` | θ |
| `omega` | ω |
| `pi` | π |

---

## 8. 결론

### 8.1 문제 원인
`rm 1, rm 2...`가 나타나는 이유는 HWP가 **숫자를 로만체로 표시**하기 위해 `rm` 명령어를 사용하기 때문입니다.

### 8.2 핵심 차이
| | HWP 수식 | LaTeX |
|--|---------|-------|
| **철학** | 명령어에 백슬래시 없음 | 모든 명령어에 백슬래시 |
| **기본 글꼴** | 로만체 | 이탤릭 |
| **구분자** | 공백 | 중괄호 |

### 8.3 권장 해결책

1. **표시용**: `rm`, `it` 등 글꼴 명령어를 제거하여 순수 텍스트로 변환
2. **수식 유지**: HWP → LaTeX 변환기 구현

---

## 부록: 테스트 케이스

```python
# 테스트 입력 → 기대 출력
test_cases = [
    ("rm 1", "1"),
    ("rm 2", "2"),
    ("rm A it LEFT (-1, 2 RIGHT )", "A (-1, 2)"),
    ("LEFT | x-5 RIGHT | < 3", "|x-5| < 3"),
    ("{5} over {4}", "5/4"),
    ("sqrt{2}", "√2"),
    ("2 x+1 leq 5", "2x+1 ≤ 5"),
]
```

---

*작성: Claude Code (Opus)*
*날짜: 2025-11-28*
