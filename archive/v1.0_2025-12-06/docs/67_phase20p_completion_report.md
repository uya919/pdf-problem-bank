# Phase 20-P: 버그 수정 완료 리포트

## 개요

**완료일:** 2025-11-29
**Phase:** 20-P
**상태:** 완료

---

## 1. 수정된 버그

### 버그 A: rm 음수 패턴 (문제 8)

**증상:**
```
입력: rm - 2
출력: rm - 2 (변환 안됨)
기대: -2
```

**원인:**
- `rm_pattern`이 `[A-Za-z0-9]+`만 매칭
- 음수 기호(`-`)가 포함되지 않음

**해결:**
- `rm_negative_pattern` 추가: `r'\brm\s+-\s*(\d+)'`
- `_postprocess()` 수정: 음수 보존

**수정 파일:** [hwp_latex_converter.py](../backend/app/services/hangul/hwp_latex_converter.py)
- Line 238-239: 패턴 정의
- Line 616-618: 패턴 적용
- Line 689-693: postprocess 음수 보존

---

### 버그 B: 정답 섹션 포함 (문제 21)

**증상:**
```
기대: ...쓰시오.
실제: ...쓰시오. (빠른 정답)2025.10.28
```

**원인:**
- 마지막 문제 범위가 문서 끝까지 포함
- `_clean_problem_content()`에서 정답 패턴 미제거

**해결:**
- `(빠른 정답)` 및 날짜 패턴 제거 추가

**수정 파일:** [hml_parser.py](../backend/app/services/hangul/hml_parser.py)
- Line 803-806: 정답 섹션 패턴 제거

---

## 2. 테스트 결과

### Phase 20-P 테스트 (13개)

| 테스트 | 결과 |
|--------|------|
| TestRmNegativePattern (8개) | PASSED |
| TestAnswerSectionRemoval (3개) | PASSED |
| TestIntegration (2개) | PASSED |

### 회귀 테스트 (12개)

| 테스트 파일 | 결과 |
|-------------|------|
| test_phase20a_converter.py (10개) | PASSED |
| test_phase19d_baseline.py (1개) | PASSED |
| test_phase19e_choices.py (1개) | PASSED |

**전체 결과: 25개 테스트 모두 통과**

---

## 3. 수정 상세

### 3.1 hwp_latex_converter.py

```python
# Line 238-239: 패턴 추가
self.rm_negative_pattern = re.compile(r'\brm\s+-\s*(\d+)')

# Line 616-618: 패턴 적용 (기존 rm 패턴보다 먼저)
text = self.rm_negative_pattern.sub(r'-\1', text)

# Line 689-693: postprocess 수정
text = re.sub(r'\s*([+=<>])\s*', r' \1 ', text)  # - 제외
text = re.sub(r'(\S)\s*-\s*(\S)', r'\1 - \2', text)  # 양쪽에 문자 있을 때만
```

### 3.2 hml_parser.py

```python
# Line 803-806: _clean_problem_content() 내
content = re.sub(r'\(빠른\s*정답\)[\s\d.]*', '', content)
content = re.sub(r'\d{4}\.\d{2}\.\d{2}', '', content)
```

---

## 4. TDD 접근 방식

### 단계별 진행

1. **Step 0**: 테스트 파일 생성 (`test_phase20p_bugs.py`)
2. **Step 1**: rm 음수 패턴 수정 (RED → GREEN → VERIFY)
3. **Step 2**: 정답 섹션 패턴 제거 (RED → GREEN → VERIFY)
4. **최종**: 전체 회귀 테스트 통과

### 안정성 확보

- 기존 패턴 수정 X, 새 패턴 추가
- 각 단계마다 회귀 테스트 실행
- 음수 패턴을 먼저 처리하여 기존 동작 유지

---

## 5. 검증 방법

### 자동 테스트
```bash
pytest tests/test_phase20p_bugs.py -v
```

### 수동 검증
1. http://localhost:5173 접속
2. HWP 파일 업로드 및 파싱
3. 확인:
   - 문제 8: `rm - 2` → `-2` 변환
   - 문제 21: `(빠른 정답)` 텍스트 없음

---

## 6. 결론

Phase 20-P에서 두 가지 버그를 TDD 방식으로 안정적으로 수정했습니다.

- **버그 A (rm 음수)**: 별도 패턴 추가로 기존 동작에 영향 없이 수정
- **버그 B (정답 섹션)**: 패턴 제거로 마지막 문제 범위 정상화

모든 테스트 통과, 회귀 없음 확인.

---

*Phase 20-P 완료: 2025-11-29*
*작성: Claude Code (Opus 4.5)*
