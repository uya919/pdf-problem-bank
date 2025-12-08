# Phase 20-H: Word Boundary 정규식 수정 구현 계획

## 개요

HWP 수식에서 `geq0`, `overlineAB` 등 명령어 뒤에 공백 없이 숫자/문자가 오는 패턴이 LaTeX로 변환되지 않는 문제 해결

**관련 에러 리포트:** [52_phase20_error_geq_overline_word_boundary.md](52_phase20_error_geq_overline_word_boundary.md)

---

## 구현 단계

### Step 1: _convert_basic_commands() 수정

**파일:** `backend/app/services/hangul/hwp_latex_converter.py`
**위치:** 라인 524-533

**현재 코드:**
```python
def _convert_basic_commands(self, text: str) -> str:
    for hwp_cmd, latex_cmd in self.COMMAND_MAP.items():
        pattern = r'\b' + re.escape(hwp_cmd) + r'\b'  # 문제!
        escaped_latex = latex_cmd.replace('\\', '\\\\')
        text = re.sub(pattern, escaped_latex, text)
    return text
```

**수정 내용:**
```python
def _convert_basic_commands(self, text: str) -> str:
    """
    기본 명령어 변환 (COMMAND_MAP 사용)

    Phase 20-H: Look-ahead 사용하여 숫자 뒤에도 매칭되도록 수정
    - geq0 → \geq 0
    - leq5 → \leq 5
    """
    # 긴 명령어 먼저 처리 (subseteq > subset 순서)
    sorted_commands = sorted(
        self.COMMAND_MAP.items(),
        key=lambda x: len(x[0]),
        reverse=True
    )

    for hwp_cmd, latex_cmd in sorted_commands:
        # \b: 앞에 word boundary
        # (?![a-zA-Z]): 뒤에 영문자가 아니면 매칭 (숫자, 공백, 연산자 OK)
        pattern = r'\b' + re.escape(hwp_cmd) + r'(?![a-zA-Z])'
        escaped_latex = latex_cmd.replace('\\', '\\\\')
        text = re.sub(pattern, escaped_latex, text)

    return text
```

**테스트 케이스:**
| 입력 | 기대 출력 |
|------|-----------|
| `geq 5` | `\geq 5` |
| `geq0` | `\geq 0` |
| `x geq0` | `x \geq 0` |
| `leq5` | `\leq 5` |
| `subset` | `\subset` (subseteq와 구분) |

---

### Step 2: _convert_decorations() 수정

**파일:** `backend/app/services/hangul/hwp_latex_converter.py`
**위치:** 라인 362-368

**현재 코드:**
```python
# === 단순 패턴 ===
# deco{...} → \deco{...}
pattern = rf'\b{deco}\s*\{{'
replacement = rf'\\{deco}{{'
text = re.sub(pattern, replacement, text)
```

**수정 내용 (중괄호 패턴 처리 후 추가):**
```python
# === 단순 패턴: 중괄호 있음 ===
# deco{...} → \deco{...}
pattern = rf'\b{deco}\s*\{{'
replacement = rf'\\{deco}{{'
text = re.sub(pattern, replacement, text)

# === Phase 20-H: 중괄호 없음 패턴 추가 ===
# decoABC → \deco{ABC}
# 단, 이미 \deco로 변환된 것은 제외
pattern_no_brace = rf'(?<!\\)\b{deco}([A-Za-z0-9]+)'
replacement_no_brace = rf'\\{deco}{{\1}}'
text = re.sub(pattern_no_brace, replacement_no_brace, text)
```

**테스트 케이스:**
| 입력 | 기대 출력 |
|------|-----------|
| `overline{AB}` | `\overline{AB}` |
| `overlineAB` | `\overline{AB}` |
| `overlinePQ` | `\overline{PQ}` |
| `barx` | `\bar{x}` |
| `vecv` | `\vec{v}` |
| `hatA` | `\hat{A}` |

---

### Step 3: 단위 테스트 작성

**파일:** `backend/app/services/hangul/test_hwp_latex_converter.py` (신규)

```python
"""Phase 20-H: Word Boundary 수정 테스트"""
import pytest
from hwp_latex_converter import hwp_to_latex

class TestWordBoundaryFix:
    """geq/overline 등 word boundary 문제 수정 테스트"""

    # Step 1 테스트: 비교 연산자
    @pytest.mark.parametrize("hwp,expected", [
        ("geq 5", r"\geq 5"),
        ("geq0", r"\geq 0"),
        ("x geq0", r"x \geq 0"),
        ("leq5", r"\leq 5"),
        ("neq0", r"\neq 0"),
    ])
    def test_comparison_operators(self, hwp, expected):
        result = hwp_to_latex(hwp)
        assert expected in result or result == expected

    # Step 2 테스트: 장식 기호
    @pytest.mark.parametrize("hwp,expected", [
        ("overline{AB}", r"\overline{AB}"),
        ("overlineAB", r"\overline{AB}"),
        ("barx", r"\bar{x}"),
        ("vecv", r"\vec{v}"),
    ])
    def test_decorations_no_brace(self, hwp, expected):
        result = hwp_to_latex(hwp)
        assert expected in result

    # 기존 기능 회귀 테스트
    @pytest.mark.parametrize("hwp,expected", [
        ("rm A", r"\mathrm{A}"),
        ("{5} over {4}", r"\frac{5}{4}"),
        ("sqrt{x}", r"\sqrt{x}"),
        ("LEFT ( x RIGHT )", r"\left( x \right)"),
    ])
    def test_existing_features(self, hwp, expected):
        result = hwp_to_latex(hwp)
        assert expected in result
```

---

### Step 4: 통합 테스트

**Debug Panel에서 테스트:**

1. 브라우저에서 Debug Panel 열기
2. Test Conversion 입력란에 다음 테스트:
   - `geq0` → `\geq 0` 확인
   - `overlineAB` → `\overline{AB}` 확인
   - `x leq5` → `x \leq 5` 확인

---

## 구현 순서

| 순서 | 작업 | 난이도 | 예상 영향 |
|------|------|--------|-----------|
| 1 | `_convert_basic_commands()` 수정 | 쉬움 | 낮음 (기존 동작 유지) |
| 2 | `_convert_decorations()` 수정 | 쉬움 | 낮음 |
| 3 | 단위 테스트 작성 | 보통 | 없음 |
| 4 | Debug Panel 통합 테스트 | 쉬움 | 없음 |

---

## 주의사항

### 1. 명령어 길이 순서 정렬 필수
```python
# subseteq (8글자) > subset (6글자) 순서로 처리해야
# subset이 먼저 매칭되어 "eq"가 남는 것 방지
sorted_commands = sorted(COMMAND_MAP.items(), key=lambda x: len(x[0]), reverse=True)
```

### 2. 중복 변환 방지
```python
# 이미 \overline으로 변환된 것은 다시 변환하지 않음
pattern_no_brace = rf'(?<!\\)\b{deco}([A-Za-z0-9]+)'
#                     ^^^^^^ negative lookbehind
```

### 3. 기존 테스트 회귀 확인
- `rm A` → `\mathrm{A}`
- `{5} over {4}` → `\frac{5}{4}`
- 기존 정상 동작 유지 확인

---

## 완료 기준

- [ ] Step 1: `_convert_basic_commands()` 수정 완료
- [ ] Step 2: `_convert_decorations()` 수정 완료
- [ ] Step 3: 단위 테스트 통과
- [ ] Step 4: Debug Panel에서 실제 테스트 통과
- [ ] 기존 기능 회귀 테스트 통과

---

*작성일: 2025-11-29*
*Phase: 20-H*
*예상 작업 시간: 30분*
