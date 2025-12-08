# Phase 20-I: 이중 백슬래시 버그 수정 리포트

## 개요

HWP 수식의 `GEQ`, `overline{ rm AB it }` 등이 LaTeX로 변환될 때 이중 백슬래시(`\\geq`)가 생성되어 KaTeX 렌더링이 실패하는 버그를 수정했습니다.

**작성일:** 2025-11-29
**Phase:** 20-I
**상태:** ✅ 완료

---

## 1. 버그 증상

### 관찰된 현상
- 문제 15, 16, 17에서 `geq0`, `overlineAB` 등이 그대로 표시됨
- 다시 파싱, 하드 리로드해도 동일 증상 지속

### 실제 데이터
```python
# 문제 15 content_latex (버그 상태)
'\\begin{cases}x ^{2} - 2x - 3 \\\\geq 0 \\\\ ...'  # ❌ \\\\geq (2개 백슬래시)

# 문제 17 content_latex (버그 상태)
'$\\\\overline{\\mathrm{AB}} = ...'  # ❌ \\\\overline (2개 백슬래시)
```

**KaTeX 렌더링 결과:**
- `\\geq` (1개 백슬래시) → ≥ (정상)
- `\\\\geq` (2개 백슬래시) → `\geq` 텍스트 그대로 표시 (버그)

---

## 2. 근본 원인 분석

### 2.1 문제 발생 위치

**`hwp_latex_converter.py`의 두 함수:**
1. `_convert_basic_commands()` - 기본 명령어 변환 (GEQ, geq, leq 등)
2. `_convert_decorations()` - 장식 기호 변환 (overline, bar, hat 등)

### 2.2 버그 메커니즘: 이중 변환

#### Case 1: `GEQ 0` 변환 과정

```
[COMMAND_MAP 순회]
1. GEQ (대문자) 처리:
   - 패턴: \bGEQ(?![a-zA-Z])
   - 매칭: "GEQ"
   - 결과: \geq 0

2. geq (소문자) 처리:
   - 패턴: \bgeq(?![a-zA-Z])
   - 매칭: "\geq"의 "geq" 부분!  ← 버그!
   - 결과: \\geq 0  (이중 백슬래시)
```

**원인:** `\b` (word boundary)가 백슬래시(`\`)를 비단어 문자로 인식하여, `\geq`에서 `\`와 `g` 사이에 word boundary가 존재함.

#### Case 2: `overline{ rm AB it }` 변환 과정

```
[_convert_decorations 루프]
1. 복합 패턴 #4 매칭:
   - 패턴: \boverline\s*\{\s*rm\s+([A-Za-z0-9]+)\s*it\s*\}
   - 매칭: "overline{ rm AB it }"
   - 결과: \overline{\mathrm{AB}}

2. 단순 패턴 #5 매칭:
   - 패턴: \boverline\s*\{{
   - 매칭: "\overline{"의 "overline{" 부분!  ← 버그!
   - 결과: \\overline{\mathrm{AB}}  (이중 백슬래시)
```

---

## 3. 해결책

### 3.1 핵심 수정: Negative Lookbehind 추가

**기존 패턴:**
```python
pattern = r'\b' + re.escape(hwp_cmd) + r'(?![a-zA-Z])'
```

**수정된 패턴:**
```python
pattern = r'(?<!\\)\b' + re.escape(hwp_cmd) + r'(?![a-zA-Z])'
#          ^^^^^^^^^ 추가: 백슬래시 뒤에서는 매칭 안함
```

`(?<!\\)`: Negative lookbehind - 앞에 백슬래시가 있으면 매칭하지 않음

### 3.2 수정된 파일

#### `hwp_latex_converter.py`

**수정 1: `_convert_basic_commands()` (라인 551)**
```python
# Phase 20-I: 이중 변환 버그 수정
# (?<!\\): 백슬래시 뒤에서는 매칭 안함 (이미 변환된 \geq 내의 geq 재매칭 방지)
pattern = r'(?<!\\)\b' + re.escape(hwp_cmd) + r'(?![a-zA-Z])'
```

**수정 2: `_convert_decorations()` 단순 패턴 (라인 365)**
```python
# Phase 20-I: (?<!\\) 추가 - 이미 변환된 \deco 재매칭 방지
pattern = rf'(?<!\\)\b{deco}\s*\{{'
```

---

## 4. 테스트 결과

### 수정 전
| 입력 | 출력 | 상태 |
|------|------|------|
| `GEQ 0` | `\\\\geq 0` | ❌ 버그 |
| `geq 0` | `\\geq 0` | ✅ |
| `overline{ rm AB it }` | `\\\\overline{\\mathrm{AB}}` | ❌ 버그 |

### 수정 후
| 입력 | 출력 | 상태 |
|------|------|------|
| `GEQ 0` | `\\geq 0` | ✅ |
| `geq 0` | `\\geq 0` | ✅ |
| `GEQ0` | `\\geq0` | ✅ |
| `geq0` | `\\geq0` | ✅ |
| `overline{ rm AB it }` | `\\overline{\\mathrm{AB}}` | ✅ |
| `overlineAB` | `\\overline{AB}` | ✅ |
| `x GEQ 5 AND y LEQ 10` | `x \\geq 5 AND y \\leq 10` | ✅ |

---

## 5. 기술적 배경

### Word Boundary (`\b`)의 동작

정규식에서 `\b`는 단어 문자(`[a-zA-Z0-9_]`)와 비단어 문자 사이의 경계를 의미합니다.

```
문자열: \geq
위치:   0123

\b 위치:
- 0과 1 사이 (\ = 비단어, g = 단어) ← word boundary 존재!
- 4 이후 (q 뒤) ← word boundary 존재
```

따라서 `\bgeq`는 `\geq` 내의 `geq`를 매칭합니다.

### Negative Lookbehind (`(?<!...)`)

`(?<!\\)`: "앞에 백슬래시가 없으면 매칭"

```python
import re

# (?<!\\)\bgeq 테스트
re.search(r'(?<!\\)\bgeq', 'geq')    # 매칭 O (앞에 \ 없음)
re.search(r'(?<!\\)\bgeq', r'\geq')  # 매칭 X (앞에 \ 있음)
```

---

## 6. 영향 범위

### 수정된 함수
- `HwpLatexConverter._convert_basic_commands()`
- `HwpLatexConverter._convert_decorations()`

### 영향받는 명령어
- 모든 COMMAND_MAP 항목 (geq, leq, neq, times, alpha, beta, ...)
- 모든 장식 기호 (overline, underline, bar, hat, vec, dot, ...)

### 하위 호환성
- 정상 입력에 대해서는 동일한 출력 생성
- 버그가 발생하던 케이스만 수정됨

---

## 7. 결론

| 항목 | 수정 전 | 수정 후 |
|------|---------|---------|
| `GEQ` 변환 | `\\\\geq` (버그) | `\\geq` (정상) |
| `overline{}` 변환 | `\\\\overline` (버그) | `\\overline` (정상) |
| 소문자 명령어 | 정상 | 정상 |
| KaTeX 렌더링 | 실패 | 성공 |

### Phase 20-I 상태: ✅ 완료

---

*분석 완료: 2025-11-29*
*분석 방법: 단계별 변환 추적 + 정규식 동작 분석 + 테스트 검증*
