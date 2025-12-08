# Phase 20-P: 안정적인 버그 수정 개발 계획

## 개요

**작성일:** 2025-11-29
**Phase:** 20-P
**목표:** TDD 기반 안정적 버그 수정

### 문제 정의
1. **버그 A:** 문제 8 - `rm - 2` 변환 에러
2. **버그 B:** 문제 21 - 문제 범위 에러 (정답 섹션 포함)

### 안정성 원칙
> "하나 고치면 다른 에러가 생기는" 문제를 방지하기 위한 TDD 접근

---

## 1. 현재 상태 스냅샷

### 1.1 기존 테스트 파일

| 파일 | 역할 |
|------|------|
| `test_phase19d_baseline.py` | 기준 테스트 (문제 개수, 정답 추출) |
| `test_phase19e_choices.py` | 선택지 추출 테스트 |
| `test_phase19f_cases.py` | 다양한 케이스 테스트 |
| `test_phase19g_decorations.py` | 장식/스타일 테스트 |
| `test_phase20a_converter.py` | LaTeX 변환 테스트 |
| `test_phase20c_di.py` | 의존성 주입 테스트 |

### 1.2 버그 위치

| 버그 | 파일 | 라인 | 현재 코드 |
|------|------|------|-----------|
| A | `hwp_latex_converter.py` | 231 | `r'\brm\s+([A-Za-z0-9]+)'` |
| B | `hml_parser.py` | 732-735 | `end_idx = len(all_p_elements)` |
| B | `hml_parser.py` | 784-848 | `_clean_problem_content()` |

---

## 2. TDD 개발 단계

### 단계 0: 현재 상태 기록 (Before)

```
목표: 수정 전 현재 동작을 테스트로 기록
결과: 테스트 실패 상태 확인 (버그 재현)
```

**테스트 파일 생성:** `test_phase20p_bugs.py`

```python
# 버그 A: rm 음수 패턴 테스트
def test_rm_negative_number_FAIL():
    """버그 A: 현재 실패하는 테스트 (수정 전)"""
    from app.services.hangul.hwp_latex_converter import hwp_to_latex

    # 현재 상태: 변환되지 않음
    result = hwp_to_latex('rm - 2')
    assert 'rm - 2' in result  # 현재: 변환 안됨 (버그)

def test_rm_negative_number_EXPECTED():
    """버그 A: 기대 동작 (수정 후 통과해야 함)"""
    from app.services.hangul.hwp_latex_converter import hwp_to_latex

    result = hwp_to_latex('rm - 2')
    # 기대: -2 또는 \mathrm{-2}
    assert 'rm - 2' not in result  # rm 제거됨
    assert '-2' in result  # 음수 유지

# 버그 B: 마지막 문제 범위 테스트
def test_last_problem_no_answer_section():
    """버그 B: 마지막 문제에 정답 섹션 미포함"""
    from app.services.hangul import HMLParser

    TEST_FILE = r"C:\MYCLAUDE_PROJECT\pdf\.claude\내신 2024년..."
    parser = HMLParser(TEST_FILE)
    result = parser.parse()

    last_problem = result.problems[-1]  # 문제 21
    assert '빠른 정답' not in last_problem.content_text
    assert '2025.10.28' not in last_problem.content_text
```

---

### 단계 1: 버그 A 수정 - rm 음수 패턴

**수정 범위:** `hwp_latex_converter.py` 1개 파일

#### Step 1-1: 테스트 먼저 작성 (RED)

```python
class TestRmNegativePattern:
    """Phase 20-P: rm 음수 패턴 테스트"""

    def test_rm_negative_2(self):
        """rm - 2 → -2"""
        result = hwp_to_latex('rm - 2')
        assert '-2' in result
        assert 'rm' not in result

    def test_rm_negative_1(self):
        """rm - 1 → -1"""
        result = hwp_to_latex('rm - 1')
        assert '-1' in result
        assert 'rm' not in result

    def test_rm_positive_unchanged(self):
        """rm A → \\mathrm{A} (기존 동작 유지)"""
        result = hwp_to_latex('rm A')
        assert r'\mathrm{A}' in result

    def test_rm_number(self):
        """rm 123 → \\mathrm{123} (기존 동작 유지)"""
        result = hwp_to_latex('rm 123')
        assert r'\mathrm{123}' in result
```

#### Step 1-2: 코드 수정 (GREEN)

**파일:** `hwp_latex_converter.py`

```python
# Line ~231: _compile_patterns() 에 추가
# Phase 20-P: rm 음수 패턴 (rm - 숫자)
self.rm_negative_pattern = re.compile(r'\brm\s+-\s*(\d+)')

# Line ~XX: convert() 메서드 내 rm 변환 부분
# Phase 20-P: rm 음수 먼저 처리
text = self.rm_negative_pattern.sub(r'-\1', text)  # rm - 2 → -2
# 기존 rm 패턴 (영문자/숫자)
text = self.rm_pattern.sub(r'\\mathrm{\1}', text)  # rm A → \mathrm{A}
```

**핵심 원칙:**
- 기존 `rm_pattern` 수정 X
- 새 패턴 `rm_negative_pattern` 추가
- 음수 패턴을 먼저 처리 (순서 중요)

#### Step 1-3: 회귀 테스트 (VERIFY)

```bash
# 기존 테스트 모두 통과 확인
pytest backend/tests/test_phase20a_converter.py -v
pytest backend/tests/test_phase20p_bugs.py::TestRmNegativePattern -v
```

#### Step 1-4: Git 커밋 (CHECKPOINT)

```bash
git add backend/app/services/hangul/hwp_latex_converter.py
git add backend/tests/test_phase20p_bugs.py
git commit -m "Phase 20-P Step 1: Fix rm negative number pattern"
```

---

### 단계 2: 버그 B 수정 - 정답 섹션 감지

**수정 범위:** `hml_parser.py` 1개 파일

#### Step 2-1: 테스트 먼저 작성 (RED)

```python
class TestAnswerSectionDetection:
    """Phase 20-P: 정답 섹션 감지 테스트"""

    def test_detect_quick_answer_pattern(self):
        """(빠른 정답) 패턴 감지"""
        content = "쓰시오. (빠른 정답)2025.10.28"
        cleaned = _clean_answer_section(content)
        assert '빠른 정답' not in cleaned
        assert '2025.10.28' not in cleaned

    def test_preserve_normal_content(self):
        """일반 내용 보존"""
        content = "삼각형 OAP의 넓이를 구하시오."
        cleaned = _clean_answer_section(content)
        assert content == cleaned
```

#### Step 2-2: 코드 수정 - 방법 A (패턴 제거)

**파일:** `hml_parser.py`

```python
# _clean_problem_content() 메서드 내 (Line ~795)

# Phase 20-P: (빠른 정답) 및 날짜 패턴 제거
content = re.sub(r'\(빠른\s*정답\)[\s\d.]*', '', content)
content = re.sub(r'\d{4}\.\d{2}\.\d{2}', '', content)  # 날짜 형식
```

#### Step 2-3: 회귀 테스트 (VERIFY)

```bash
# 기존 테스트 + 새 테스트
pytest backend/tests/test_phase19d_baseline.py -v
pytest backend/tests/test_phase20p_bugs.py::TestAnswerSectionDetection -v
```

#### Step 2-4: Git 커밋 (CHECKPOINT)

```bash
git add backend/app/services/hangul/hml_parser.py
git commit -m "Phase 20-P Step 2: Remove answer section patterns"
```

---

### 단계 3: 버그 B 강화 - 마지막 문제 범위 제한

**이 단계는 선택적** - 단계 2로 충분하면 스킵

#### Step 3-1: 추가 안전장치

```python
# hml_parser.py Line ~732-735

# Phase 20-P: 마지막 문제 범위 제한
if i + 1 < len(autonum_positions):
    end_idx = autonum_positions[i + 1]['p_index']
else:
    # 마지막 문제: 정답 섹션 시작점 감지
    end_idx = len(all_p_elements)
    for p_idx in range(start_idx, end_idx):
        p_text = self._get_text(all_p_elements[p_idx])
        if '빠른 정답' in p_text or '정답 및 해설' in p_text:
            end_idx = p_idx
            break
```

---

## 3. 테스트 실행 순서

### 3.1 전체 테스트 스위트

```bash
# 0. 전체 기존 테스트 (수정 전 기준)
pytest backend/tests/ -v --tb=short

# 1. 버그 A 수정 후
pytest backend/tests/test_phase20a_converter.py -v
pytest backend/tests/test_phase20p_bugs.py::TestRmNegativePattern -v

# 2. 버그 B 수정 후
pytest backend/tests/test_phase19d_baseline.py -v
pytest backend/tests/test_phase20p_bugs.py::TestAnswerSectionDetection -v

# 3. 전체 회귀 테스트
pytest backend/tests/ -v --tb=short
```

### 3.2 수동 검증

```
1. http://localhost:5173 접속
2. HWP 파일 업로드
3. "다시 파싱" 클릭
4. 확인:
   - 문제 8: rm - 2 → -2 표시
   - 문제 21: (빠른 정답) 없음, 그림까지만 표시
```

---

## 4. 롤백 전략

### Git 기반 롤백

```bash
# 단계별 커밋 태그
git tag phase20p-before-fix
git tag phase20p-step1-rm-pattern
git tag phase20p-step2-answer-section

# 문제 발생 시 롤백
git checkout phase20p-before-fix -- backend/app/services/hangul/
```

### 파일별 백업

```
backend/app/services/hangul/
├── hwp_latex_converter.py      # 수정 대상
├── hwp_latex_converter.py.bak  # 백업 (수정 전)
├── hml_parser.py               # 수정 대상
└── hml_parser.py.bak           # 백업 (수정 전)
```

---

## 5. 체크리스트

### 수정 전 체크

- [ ] 기존 테스트 모두 통과 확인
- [ ] 현재 상태 스크린샷 저장
- [ ] Git 커밋/태그 생성

### 단계 1 (rm 패턴) 체크

- [ ] 테스트 파일 작성
- [ ] 테스트 실패 확인 (RED)
- [ ] 코드 수정
- [ ] 테스트 통과 확인 (GREEN)
- [ ] 회귀 테스트 통과
- [ ] Git 커밋

### 단계 2 (정답 섹션) 체크

- [ ] 테스트 파일 작성
- [ ] 테스트 실패 확인 (RED)
- [ ] 코드 수정
- [ ] 테스트 통과 확인 (GREEN)
- [ ] 회귀 테스트 통과
- [ ] Git 커밋

### 최종 체크

- [ ] 전체 테스트 스위트 통과
- [ ] 브라우저에서 문제 8, 21 확인
- [ ] 다른 문제들 영향 없음 확인

---

## 6. 예상 위험 및 대응

| 위험 | 가능성 | 대응 |
|------|--------|------|
| rm 패턴 순서 충돌 | 중간 | 음수 패턴 먼저 처리 |
| 정답 패턴이 문제 내용에 포함 | 낮음 | 문서 후반부에서만 제거 |
| 다른 문제 범위 변경 | 낮음 | 마지막 문제만 특별 처리 |
| 기존 테스트 실패 | 중간 | 롤백 후 분석 |

---

## 7. 구현 순서 요약

```
[단계 0] 테스트 파일 생성 → 현재 상태 기록
    ↓
[단계 1] rm 음수 패턴 수정
    - 테스트 작성 (RED)
    - 코드 수정 (GREEN)
    - 회귀 테스트
    - Git 커밋
    ↓
[단계 2] 정답 섹션 패턴 제거
    - 테스트 작성 (RED)
    - 코드 수정 (GREEN)
    - 회귀 테스트
    - Git 커밋
    ↓
[단계 3] (선택) 범위 제한 강화
    ↓
[최종] 전체 검증 및 완료 리포트
```

---

## 8. 다음 단계

1. 사용자 승인 후 "진행해줘" 명령
2. 테스트 파일부터 생성
3. 단계별 TDD 진행
4. 각 단계마다 중간 결과 보고

---

*Phase 20-P 개발 계획 완료: 2025-11-29*
*작성: Claude Code (Opus 4.5)*
