# Phase 20-P-2: RM 대문자 버그 분석 리포트

## 개요

**작성일:** 2025-11-29
**Phase:** 20-P-2
**상태:** 분석 완료
**심각도:** 높음
**관련 Phase:** 20-P (rm 음수 버그 수정)

---

## 1. 문제 현상

### 1.1 사용자 보고

프론트엔드 화면에서 문제 16에 다음과 같이 표시됨:

```
점 $RM A$의 좌표가 $(-3, 1)$이고
```

**기대 결과:**
```
점 $\mathrm{A}$의 좌표가 $(-3, 1)$이고
```
또는
```
점 $A$의 좌표가 $(-3, 1)$이고
```

### 1.2 데이터 분석 결과

```python
# content_latex에서 발견된 패턴
'점 $RM A$의 좌표가'

# content_equations_latex에서 발견
['RM A', ...]  # EQUATION 태그 내부에도 RM A가 있음
```

---

## 2. 원인 분석

### 2.1 현재 rm 패턴 정의

**hwp_latex_converter.py:231**
```python
self.rm_pattern = re.compile(r'\brm\s+([A-Za-z0-9]+)')
```

**문제점:**
- 이 패턴은 **소문자 `rm`만** 매칭
- **대문자 `RM`은 매칭되지 않음**
- HWP 파일에서 대문자로 작성된 경우 변환 실패

### 2.2 Phase 20-P와의 차이

| Phase | 버그 | 패턴 | 문제 |
|-------|------|------|------|
| 20-P | `rm - 2` | 음수 패턴 | EQUATION 태그 밖 텍스트 |
| **20-P-2** | `RM A` | 대문자 rm | **EQUATION 태그 내부에서도 발생** |

### 2.3 데이터 흐름 추적

```
[HML 파일]
    ↓ EQUATION 태그 내부: "RM A"
[_convert_to_latex()]
    ↓ hwp_to_latex() 호출
[hwp_latex_converter._convert_rm_bold_it()]
    ↓ rm_pattern = r'\brm\s+([A-Za-z0-9]+)'
    ↓ 대문자 RM은 매칭 안됨!
[결과: "RM A" 그대로 반환]
```

---

## 3. 비교 분석

### 3.1 정상 변환 예시

같은 문제 16에서 정상적으로 변환된 패턴들:

| 원본 | 변환 결과 | 정상 여부 |
|------|-----------|-----------|
| `rm ABC` | `\mathrm{ABC}` | O |
| `rm G` | `\mathrm{G}` | O |
| `rm GA` | `\mathrm{GA}` | O |
| **`RM A`** | **`RM A`** | **X (미변환)** |

### 3.2 대소문자 패턴 비교

현재 코드에서 대소문자 처리:

```python
# rm 패턴 - 대소문자 구분 X (소문자만 매칭)
self.rm_pattern = re.compile(r'\brm\s+([A-Za-z0-9]+)')

# bold 패턴 - re.IGNORECASE 있음
self.bold_pattern = re.compile(r'\bbold\s+([A-Za-z0-9]+)', re.IGNORECASE)

# rmbold 패턴 - re.IGNORECASE 있음
text = re.sub(r'\brmbold\s+([A-Za-z0-9]+)', replace_rmbold, text, flags=re.IGNORECASE)
```

**불일치 발견:** `bold`와 `rmbold`는 대소문자 무시하지만, `rm`은 대소문자 무시 안함!

---

## 4. 영향 범위

### 4.1 영향받는 파일

- `hwp_latex_converter.py`: rm_pattern 정의
- `hml_parser.py`: `_fix_rm_negative_in_latex()` 메서드 (Phase 20-P에서 추가)

### 4.2 영향받는 케이스

1. **EQUATION 태그 내부**: `RM X` 대문자 패턴
2. **EQUATION 태그 외부**: `RM X` 대문자 패턴 (latex_content에 그대로 추가)

---

## 5. 해결 방안

### 방안 A: rm_pattern에 IGNORECASE 추가 (권장)

**hwp_latex_converter.py:231**
```python
# 수정 전
self.rm_pattern = re.compile(r'\brm\s+([A-Za-z0-9]+)')

# 수정 후
self.rm_pattern = re.compile(r'\brm\s+([A-Za-z0-9]+)', re.IGNORECASE)
```

**장점:**
- 간단한 수정
- 기존 동작에 영향 없음 (소문자 rm도 계속 매칭)
- bold, rmbold와 일관성 유지

**단점:**
- 없음

### 방안 B: rm_negative_pattern에도 IGNORECASE 추가

**hwp_latex_converter.py:239**
```python
# 수정 전
self.rm_negative_pattern = re.compile(r'\brm\s+-\s*(\d+)')

# 수정 후
self.rm_negative_pattern = re.compile(r'\brm\s+-\s*(\d+)', re.IGNORECASE)
```

**hml_parser.py:873**
```python
# 수정 전
content = re.sub(r'\brm\s+-\s*(\d+)', r'-\1', content)

# 수정 후
content = re.sub(r'\brm\s+-\s*(\d+)', r'-\1', content, flags=re.IGNORECASE)
```

### 방안 C: _fix_rm_negative_in_latex 확장 (추가)

**hml_parser.py에 rm 문자 패턴도 처리 추가:**
```python
def _fix_rm_patterns_in_latex(self, content: str) -> str:
    """Phase 20-P-2: latex_content에서 rm 패턴 수정"""
    # 음수 패턴: RM - 2 → -2, rm - 1 → -1
    content = re.sub(r'\brm\s+-\s*(\d+)', r'-\1', content, flags=re.IGNORECASE)
    # 문자 패턴: RM A → \mathrm{A}
    content = re.sub(r'\bRM\s+([A-Za-z0-9]+)', r'\\mathrm{\1}', content)
    return content
```

---

## 6. 권장 수정 계획

### Step 1: hwp_latex_converter.py 수정

```python
# Line 231
self.rm_pattern = re.compile(r'\brm\s+([A-Za-z0-9]+)', re.IGNORECASE)

# Line 239
self.rm_negative_pattern = re.compile(r'\brm\s+-\s*(\d+)', re.IGNORECASE)
```

### Step 2: hml_parser.py 수정

```python
# Line 873: _fix_rm_negative_in_latex() 내부
content = re.sub(r'\brm\s+-\s*(\d+)', r'-\1', content, flags=re.IGNORECASE)

# 추가: RM 대문자 문자 패턴 처리
content = re.sub(r'\bRM\s+([A-Za-z0-9]+)', r'\\mathrm{\1}', content)
```

### Step 3: 테스트 추가

```python
# test_phase20p_bugs.py에 추가
def test_rm_uppercase_A(self):
    """RM A → \mathrm{A} (대문자 RM)"""
    result = hwp_to_latex('RM A')
    assert r'\mathrm{A}' in result
    assert 'RM' not in result

def test_rm_uppercase_negative(self):
    """RM - 2 → -2 (대문자 RM 음수)"""
    result = hwp_to_latex('RM - 2')
    assert '-2' in result
    assert 'RM' not in result
```

---

## 7. 테스트 계획

### 7.1 새 테스트 케이스

| 입력 | 기대 출력 | 설명 |
|------|-----------|------|
| `RM A` | `\mathrm{A}` | 대문자 RM + 문자 |
| `RM ABC` | `\mathrm{ABC}` | 대문자 RM + 복수 문자 |
| `RM - 2` | `-2` | 대문자 RM + 음수 |
| `Rm A` | `\mathrm{A}` | 혼합 대소문자 |
| `rM A` | `\mathrm{A}` | 혼합 대소문자 |

### 7.2 회귀 테스트

기존 테스트 모두 통과 확인:
- test_phase20p_bugs.py
- test_phase20a_converter.py
- test_phase19d_baseline.py
- test_phase19e_choices.py

---

## 8. 결론

### 8.1 근본 원인

**`rm_pattern` 정규식에 `re.IGNORECASE` 플래그가 없음**

HWP 파일에서 `RM`이 대문자로 작성된 경우 변환이 실패함.
`bold`, `rmbold` 패턴은 이미 IGNORECASE를 사용하지만, `rm` 패턴만 누락됨.

### 8.2 해결 방향

1. **hwp_latex_converter.py**: `rm_pattern`과 `rm_negative_pattern`에 `re.IGNORECASE` 추가
2. **hml_parser.py**: `_fix_rm_negative_in_latex()`에서도 대소문자 무시 처리

### 8.3 예상 작업량

- 수정: 4줄 변경
- 테스트: 5개 추가
- 회귀 테스트: 기존 28개 확인

---

*Phase 20-P-2 분석 완료: 2025-11-29*
*작성: Claude Code (Opus 4.5)*
