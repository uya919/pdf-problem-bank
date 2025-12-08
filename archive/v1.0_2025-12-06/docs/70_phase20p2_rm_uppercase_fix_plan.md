# Phase 20-P-2: RM 대문자 버그 수정 개발 계획

## 개요

**작성일:** 2025-11-29
**Phase:** 20-P-2
**목표:** 대문자 `RM` 패턴이 변환되지 않는 버그 수정
**관련 문서:** [69_phase20p2_rm_uppercase_bug_analysis.md](69_phase20p2_rm_uppercase_bug_analysis.md)

---

## 1. 현재 상태

### 1.1 버그 요약

| 항목 | 내용 |
|------|------|
| 문제 위치 | 문제 16 |
| 증상 | `점 $RM A$의 좌표가` (대문자 RM 미변환) |
| 기대값 | `점 $\mathrm{A}$의 좌표가` |
| 근본 원인 | `rm_pattern`에 `re.IGNORECASE` 누락 |

### 1.2 영향 범위

- **hwp_latex_converter.py**: `rm_pattern`, `rm_negative_pattern`
- **hml_parser.py**: `_fix_rm_negative_in_latex()` 메서드

---

## 2. 개발 방식

### TDD (Test-Driven Development)

```
Step 0: 테스트 작성 (RED)
    ↓
Step 1: 최소 구현 (GREEN)
    ↓
Step 2: 리팩토링 (REFACTOR)
    ↓
Step 3: 회귀 테스트 (VERIFY)
```

---

## 3. 단계별 개발 계획

### Step 0: 테스트 케이스 추가

**파일:** `backend/tests/test_phase20p_bugs.py`

**추가할 테스트:**

```python
# =============================================================================
# Phase 20-P-2: RM 대문자 패턴 테스트
# =============================================================================

class TestRmUppercasePattern:
    """Phase 20-P-2: RM 대문자 패턴 테스트"""

    def test_rm_uppercase_letter(self):
        """RM A → \\mathrm{A} (대문자 RM)"""
        result = hwp_to_latex('RM A')
        assert r'\mathrm{A}' in result
        assert 'RM ' not in result

    def test_rm_uppercase_multiple_letters(self):
        """RM ABC → \\mathrm{ABC} (대문자 RM + 복수 문자)"""
        result = hwp_to_latex('RM ABC')
        assert r'\mathrm{ABC}' in result

    def test_rm_uppercase_negative(self):
        """RM - 2 → -2 (대문자 RM 음수)"""
        result = hwp_to_latex('RM - 2')
        assert '-2' in result
        assert 'RM' not in result

    def test_rm_mixed_case_Rm(self):
        """Rm A → \\mathrm{A} (혼합 대소문자)"""
        result = hwp_to_latex('Rm A')
        assert r'\mathrm{A}' in result

    def test_rm_mixed_case_rM(self):
        """rM A → \\mathrm{A} (혼합 대소문자)"""
        result = hwp_to_latex('rM A')
        assert r'\mathrm{A}' in result


class TestHmlParserRmUppercaseFix:
    """Phase 20-P-2: HMLParser._fix_rm_patterns_in_latex() 테스트"""

    def test_fix_rm_uppercase_in_latex(self):
        """RM A → \\mathrm{A} (HMLParser 메서드)"""
        from app.services.hangul.hml_parser import HMLParser
        parser = HMLParser.__new__(HMLParser)
        result = parser._fix_rm_patterns_in_latex('점 RM A의 좌표')
        assert 'RM ' not in result
        assert r'\mathrm{A}' in result

    def test_fix_rm_uppercase_negative_in_latex(self):
        """RM - 2 → -2 (HMLParser 메서드)"""
        from app.services.hangul.hml_parser import HMLParser
        parser = HMLParser.__new__(HMLParser)
        result = parser._fix_rm_patterns_in_latex('값은 RM - 2이다')
        assert 'RM' not in result
        assert '-2' in result
```

**예상 결과:** 모든 테스트 FAILED (RED)

---

### Step 1: hwp_latex_converter.py 수정

**파일:** `backend/app/services/hangul/hwp_latex_converter.py`

#### 1.1 rm_pattern 수정 (Line 231)

```python
# 수정 전
self.rm_pattern = re.compile(r'\brm\s+([A-Za-z0-9]+)')

# 수정 후
self.rm_pattern = re.compile(r'\brm\s+([A-Za-z0-9]+)', re.IGNORECASE)
```

#### 1.2 rm_negative_pattern 수정 (Line 239)

```python
# 수정 전
self.rm_negative_pattern = re.compile(r'\brm\s+-\s*(\d+)')

# 수정 후
self.rm_negative_pattern = re.compile(r'\brm\s+-\s*(\d+)', re.IGNORECASE)
```

**예상 결과:** `TestRmUppercasePattern` 테스트 PASSED (GREEN)

---

### Step 2: hml_parser.py 수정

**파일:** `backend/app/services/hangul/hml_parser.py`

#### 2.1 메서드 이름 변경 및 확장 (Line 858-874)

```python
# 수정 전
def _fix_rm_negative_in_latex(self, content: str) -> str:
    """Phase 20-P: latex_content에서 rm 음수 패턴 수정"""
    content = re.sub(r'\brm\s+-\s*(\d+)', r'-\1', content)
    return content

# 수정 후
def _fix_rm_patterns_in_latex(self, content: str) -> str:
    """
    Phase 20-P-2: latex_content에서 rm 패턴 수정

    EQUATION 태그 밖의 일반 텍스트에 있는 rm 패턴을 처리.
    hwp_latex_converter.py를 거치지 않은 텍스트에 적용.

    처리 패턴:
    - rm - 2 → -2 (음수)
    - RM A → \\mathrm{A} (대문자 rm + 문자)
    """
    # 1. 음수 패턴: rm - 2 → -2, RM - 1 → -1
    content = re.sub(r'\brm\s+-\s*(\d+)', r'-\1', content, flags=re.IGNORECASE)

    # 2. 대문자 RM 문자 패턴: RM A → \mathrm{A}
    # 소문자 rm은 이미 hwp_to_latex()에서 처리됨
    # 대문자 RM만 추가 처리 (EQUATION 태그 밖에서 발생)
    content = re.sub(r'\bRM\s+([A-Za-z0-9]+)', r'\\mathrm{\1}', content)

    return content
```

#### 2.2 호출 위치 업데이트 (Line 768-769)

```python
# 수정 전
latex_content = self._clean_problem_content(latex_content)
latex_content = self._fix_rm_negative_in_latex(latex_content)

# 수정 후
latex_content = self._clean_problem_content(latex_content)
latex_content = self._fix_rm_patterns_in_latex(latex_content)
```

#### 2.3 기존 메서드 호출 위치 모두 업데이트

메서드 이름이 변경되므로, `_fix_rm_negative_in_latex` 호출 위치를 모두 찾아 `_fix_rm_patterns_in_latex`로 변경.

**예상 결과:** `TestHmlParserRmUppercaseFix` 테스트 PASSED (GREEN)

---

### Step 3: 테스트 파일 업데이트

**파일:** `backend/tests/test_phase20p_bugs.py`

#### 3.1 기존 테스트 클래스 메서드 이름 업데이트

```python
# 수정 전
class TestHmlParserRmNegativeFix:
    def test_fix_rm_negative_in_latex_space(self):
        result = parser._fix_rm_negative_in_latex(...)

# 수정 후
class TestHmlParserRmNegativeFix:
    def test_fix_rm_patterns_in_latex_space(self):
        result = parser._fix_rm_patterns_in_latex(...)
```

---

### Step 4: 회귀 테스트

**실행 명령:**

```bash
cd backend
pytest tests/test_phase20p_bugs.py -v
pytest tests/test_phase20a_converter.py -v
pytest tests/test_phase19d_baseline.py -v
pytest tests/test_phase19e_choices.py -v
```

**예상 결과:**

| 테스트 파일 | 테스트 수 | 결과 |
|-------------|-----------|------|
| test_phase20p_bugs.py | 21개 (+5) | PASSED |
| test_phase20a_converter.py | 10개 | PASSED |
| test_phase19d_baseline.py | 1개 | PASSED |
| test_phase19e_choices.py | 1개 | PASSED |
| **총계** | **33개** | **ALL PASSED** |

---

### Step 5: 통합 테스트

**수동 검증:**

1. 백엔드 서버 재시작
2. http://localhost:5173 접속
3. "다시 파싱" 버튼 클릭
4. 문제 16 확인:
   - **수정 전:** `점 $RM A$의 좌표가`
   - **수정 후:** `점 $\mathrm{A}$의 좌표가`

---

## 4. 수정 요약

### 4.1 변경 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| hwp_latex_converter.py | `rm_pattern`, `rm_negative_pattern`에 `re.IGNORECASE` 추가 |
| hml_parser.py | `_fix_rm_negative_in_latex()` → `_fix_rm_patterns_in_latex()` 확장 |
| test_phase20p_bugs.py | 대문자 RM 테스트 케이스 추가, 메서드명 업데이트 |

### 4.2 코드 변경량

| 항목 | 수량 |
|------|------|
| 변경 파일 | 3개 |
| 추가 라인 | ~30줄 |
| 수정 라인 | ~10줄 |
| 삭제 라인 | ~5줄 |
| 새 테스트 | 7개 |

---

## 5. 롤백 계획

문제 발생 시:

1. `re.IGNORECASE` 제거
2. 메서드명 `_fix_rm_patterns_in_latex` → `_fix_rm_negative_in_latex` 복원
3. 새 테스트 케이스 제거

---

## 6. 체크리스트

- [ ] Step 0: 테스트 케이스 추가 (RED 확인)
- [ ] Step 1: hwp_latex_converter.py 수정
- [ ] Step 2: hml_parser.py 수정
- [ ] Step 3: 테스트 파일 업데이트
- [ ] Step 4: 회귀 테스트 전체 통과
- [ ] Step 5: 프론트엔드 수동 검증
- [ ] 문서 업데이트

---

*Phase 20-P-2 개발 계획 작성: 2025-11-29*
*작성: Claude Code (Opus 4.5)*
