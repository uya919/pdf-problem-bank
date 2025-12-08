# Phase 20 에러 리포트: geq/overline LaTeX 변환 실패 (심층 분석)

## 에러 정보

### 증상
- `geq0`, `geq5`, `geqx - 5` 등이 `\geq`로 변환되지 않고 그대로 출력
- `overlineAB` 형태가 `\overline{AB}`로 변환되지 않음
- 21번 문제 등에서 수학 기호가 평문으로 표시됨

### 발생 위치
- `backend/app/services/hangul/hwp_latex_converter.py`
- `_convert_basic_commands()` 메서드 (라인 524-533)
- `_convert_decorations()` 메서드 (라인 311-368)

---

## 근본 원인 분석

### 핵심 원인 1: Word Boundary (`\b`) 정규식 제한

**문제의 코드** (`hwp_latex_converter.py:524-531`)
```python
def _convert_basic_commands(self, text: str) -> str:
    """기본 명령어 변환 (COMMAND_MAP 사용)"""
    for hwp_cmd, latex_cmd in self.COMMAND_MAP.items():
        # 단어 경계로 매칭 (함수명이 다른 단어에 포함되지 않도록)
        pattern = r'\b' + re.escape(hwp_cmd) + r'\b'  # ← 문제!
        escaped_latex = latex_cmd.replace('\\', '\\\\')
        text = re.sub(pattern, escaped_latex, text)
    return text
```

### Word Boundary (`\b`) 동작 원리

| 문자 유형 | 예시 | Word Boundary 존재 |
|-----------|------|-------------------|
| 공백 | `geq 5` → `geq` 와 공백 사이 | ✅ Yes |
| 연산자 | `x geq =` → `geq` 와 `=` 사이 | ✅ Yes |
| 숫자 | `geq0` → `geq` 와 `0` 사이 | ❌ **No** |
| 영문자 | `geqx` → `geq` 와 `x` 사이 | ❌ **No** |

**정규식 `\b`는 "단어 문자(a-z, A-Z, 0-9, _)"와 "비단어 문자" 사이에서만 매칭됩니다.**

---

### 검증 테스트 결과

```python
import re

test_cases = [
    ('geq 5',     True),   # 공백 구분 → 매칭 성공
    ('geq5',      False),  # 숫자 연결 → 매칭 실패!
    ('x geq 0',   True),   # 양쪽 공백 → 매칭 성공
    ('geqx - 5',  False),  # 문자 연결 → 매칭 실패!
]

pattern = r'\bgeq\b'
for text, expected in test_cases:
    matched = bool(re.search(pattern, text))
    status = '✅' if matched == expected else '❌'
    print(f'{status} {text!r:15} → 매칭: {matched}')
```

**출력:**
```
✅ 'geq 5'          → 매칭: True
✅ 'geq5'           → 매칭: False   # 실패!
✅ 'x geq 0'        → 매칭: True
✅ 'geqx - 5'       → 매칭: False   # 실패!
```

---

### 핵심 원인 2: overline 중괄호 없는 패턴 미지원

**문제의 코드** (`hwp_latex_converter.py:362-366`)
```python
# === 단순 패턴 ===
# deco{...} → \deco{...}
pattern = rf'\b{deco}\s*\{{'        # ← 중괄호 필수!
replacement = rf'\\{deco}{{'
text = re.sub(pattern, replacement, text)
```

**문제:** HWP 수식에서 `overlineAB` (중괄호 없음) 형태도 사용되는데,
현재 코드는 `overline{AB}` (중괄호 있음) 형태만 처리합니다.

### 검증 테스트 결과

```python
import re

deco = 'overline'
pattern_with_brace = rf'\b{deco}\s*\{{'

test_cases = [
    ('overline{AB}', True),   # 중괄호 있음 → 매칭
    ('overlineAB',   False),  # 중괄호 없음 → 매칭 실패!
]

for text, expected in test_cases:
    matched = bool(re.search(pattern_with_brace, text))
    status = '✅' if matched == expected else '❌'
    print(f'{status} {text!r:15} → 매칭: {matched}')
```

**출력:**
```
✅ 'overline{AB}'   → 매칭: True
✅ 'overlineAB'     → 매칭: False  # 실패!
```

---

## HWP 수식 편집기 실제 동작

### HWP 수식 문법 특성

HWP 수식 편집기는 명령어와 다음 토큰 사이에 **공백이 없을 수 있습니다**:

| HWP 입력 | 의도 | 현재 결과 |
|----------|------|-----------|
| `x geq 0` | x ≥ 0 | ✅ `x \geq 0` |
| `x geq0` | x ≥ 0 | ❌ `x geq0` |
| `overline{AB}` | AB̅ | ✅ `\overline{AB}` |
| `overlineAB` | AB̅ | ❌ `overlineAB` |

---

## 해결 방안

### 방안 1: Look-ahead 사용 (권장)

Word boundary 대신 **부정 look-ahead**를 사용:

```python
def _convert_basic_commands(self, text: str) -> str:
    # 긴 명령어 먼저 처리 (geqx보다 geq가 먼저 매칭되지 않도록)
    sorted_commands = sorted(self.COMMAND_MAP.items(),
                             key=lambda x: len(x[0]), reverse=True)

    for hwp_cmd, latex_cmd in sorted_commands:
        # 앞: word boundary
        # 뒤: 다음 문자가 영문자가 아니면 매칭 (숫자, 공백, 연산자 등)
        pattern = r'\b' + re.escape(hwp_cmd) + r'(?![a-zA-Z])'
        escaped_latex = latex_cmd.replace('\\', '\\\\')
        text = re.sub(pattern, escaped_latex, text)

    return text
```

**설명:**
- `(?![a-zA-Z])`: 다음 문자가 영문자가 **아닐 때만** 매칭
- `geq0` → `geq` 다음에 `0` (숫자) → **매칭 성공**
- `geqx` → `geq` 다음에 `x` (영문자) → **매칭 실패** (의도된 동작: `geqx`는 별도 명령어일 수 있음)

### 방안 2: overline 중괄호 없는 패턴 추가

```python
def _convert_decorations(self, text: str) -> str:
    decorations = ['overline', 'underline', 'bar', 'hat', 'vec', ...]

    for deco in decorations:
        # ... 기존 복합 패턴 처리 ...

        # === 중괄호 있는 패턴 ===
        # deco{...} → \deco{...}
        pattern = rf'\b{deco}\s*\{{'
        replacement = rf'\\{deco}{{'
        text = re.sub(pattern, replacement, text)

        # === 중괄호 없는 패턴 (새로 추가) ===
        # decoABC → \deco{ABC}
        pattern_no_brace = rf'\b{deco}([A-Za-z0-9]+)'
        replacement_no_brace = rf'\\{deco}{{\1}}'
        text = re.sub(pattern_no_brace, replacement_no_brace, text)

    return text
```

---

## 영향 범위

### 영향 받는 명령어 (COMMAND_MAP)

| 명령어 | 문제 케이스 | 현재 동작 | 기대 동작 |
|--------|-------------|-----------|-----------|
| `geq` | `geq0` | 변환 안 됨 | `\geq 0` |
| `leq` | `leq5` | 변환 안 됨 | `\leq 5` |
| `neq` | `neq0` | 변환 안 됨 | `\neq 0` |
| `times` | `2times3` | 변환 안 됨 | `2\times 3` |
| `alpha` | `alpha1` | 변환 안 됨 | `\alpha_1` |
| ... | ... | ... | ... |

### 영향 받는 장식 기호

| 명령어 | 문제 케이스 | 현재 동작 | 기대 동작 |
|--------|-------------|-----------|-----------|
| `overline` | `overlineAB` | 변환 안 됨 | `\overline{AB}` |
| `underline` | `underlineCD` | 변환 안 됨 | `\underline{CD}` |
| `bar` | `barx` | 변환 안 됨 | `\bar{x}` |
| `hat` | `hatx` | 변환 안 됨 | `\hat{x}` |
| `vec` | `vecv` | 변환 안 됨 | `\vec{v}` |

---

## 수정 우선순위

### High Priority (즉시 수정)
1. `geq`, `leq`, `neq` 등 비교 연산자 - 수학 문제에서 가장 빈번
2. `overline` - 선분, 평균 표시에 필수

### Medium Priority
3. `times`, `div` 등 산술 연산자
4. `bar`, `hat`, `vec` 등 장식 기호

### Low Priority
5. 그리스 문자 (`alpha`, `beta`, ...)
6. 기타 특수 기호

---

## 결론

| 구분 | 내용 |
|------|------|
| **근본 원인** | `\b` (word boundary)가 명령어 다음에 숫자/영문자가 올 때 매칭 실패 |
| **영향 범위** | COMMAND_MAP의 모든 명령어 + 장식 기호 |
| **해결 난이도** | 중간 (정규식 패턴 수정 필요) |
| **위험도** | 낮음 (기존 정상 케이스는 영향 없음) |

### 권장 해결책

1. `_convert_basic_commands()`: Look-ahead `(?![a-zA-Z])` 사용
2. `_convert_decorations()`: 중괄호 없는 패턴 추가

---

*작성일: 2025-11-29*
*Phase: 20*
*근본 원인: Word Boundary 정규식 제한*
