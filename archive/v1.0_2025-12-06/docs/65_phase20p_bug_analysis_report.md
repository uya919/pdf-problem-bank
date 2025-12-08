# Phase 20-P: 버그 분석 리포트

## 개요

**작성일:** 2025-11-29
**Phase:** 20-P
**상태:** 분석 완료

문제 8, 21에서 발견된 두 가지 버그에 대한 심층 분석 결과입니다.

---

## 1. 버그 A: 문제 8 - `rm` 변환 에러

### 1.1 증상

```
입력: rm - 2
출력: rm - 2  (변환 안됨)
기대: \mathrm{-2} 또는 -2
```

**content_latex에서 발견:**
```
② $rm - 2$ ③ $rm - 1$
```

**content_equations_latex에서 발견:**
```
- rm - 2
- rm - 1
```

### 1.2 원인 분석

**파일:** [hwp_latex_converter.py:231](backend/app/services/hangul/hwp_latex_converter.py#L231)

```python
self.rm_pattern = re.compile(r'\brm\s+([A-Za-z0-9]+)')
```

**문제점:**
- 패턴 `[A-Za-z0-9]+`는 **영문자와 숫자만** 매칭
- **하이픈(`-`)이 포함되지 않음**
- `rm - 2`에서 `- 2`가 패턴에 매칭되지 않아 변환 실패

### 1.3 입력 데이터 분석

HWP 수식에서 음수 표현:
```
rm - 2   (음수 -2)
rm - 1   (음수 -1)
```

`rm` 뒤에 공백 + 하이픈 + 공백 + 숫자 형태로 입력됨.

### 1.4 해결 방안

**Option A:** 패턴 확장
```python
# 기존
self.rm_pattern = re.compile(r'\brm\s+([A-Za-z0-9]+)')

# 수정: 하이픈, 공백 포함
self.rm_pattern = re.compile(r'\brm\s+(-?\s*[A-Za-z0-9]+)')
```

**Option B:** 별도 패턴 추가
```python
# rm - 숫자 (음수) 패턴 추가
text = re.sub(r'\brm\s+-\s*(\d+)', r'-\1', text)  # rm - 2 → -2
```

**권장:** Option B - 별도 패턴 추가

### 1.5 영향 범위

- `\mathrm{}` 변환이 필요한 음수 표현
- 선택지에서 음수 상수 표시 (②, ③ 등)

---

## 2. 버그 B: 문제 21 - 문제 범위 에러

### 2.1 증상

```
기대 출력: ...삼각형 OAP의 넓이를 구하는 풀이 과정과 답을 쓰시오.
실제 출력: ...쓰시오. (빠른 정답)2025.10.28 (빠른 정답) 2025.10.28
```

문제 본문 뒤에 **정답 섹션 텍스트가 포함**됨.

### 2.2 원인 분석

**파일:** [hml_parser.py:732-735](backend/app/services/hangul/hml_parser.py#L732-L735)

```python
# 다음 문제의 P 태그 인덱스 (또는 끝)
if i + 1 < len(autonum_positions):
    end_idx = autonum_positions[i + 1]['p_index']
else:
    end_idx = len(all_p_elements)  # 마지막 문제 → 모든 P 태그 끝까지
```

**문제점:**
1. 문제 21이 **마지막 문제**임
2. `end_idx = len(all_p_elements)` → 문서 끝까지 모든 P 태그 포함
3. 정답/해설 섹션의 "(빠른 정답)" 텍스트도 범위에 포함

**추가 문제:** [hml_parser.py:784-848](backend/app/services/hangul/hml_parser.py#L784-L848)

`_clean_problem_content()`에서 "(빠른 정답)" 패턴을 **제거하지 않음**.

### 2.3 해결 방안

**Option A:** `_clean_problem_content()`에 패턴 추가
```python
# "(빠른 정답)" 및 날짜 패턴 제거
content = re.sub(r'\(빠른\s*정답\)\s*\d{4}\.\d{2}\.\d{2}\s*', '', content)
```

**Option B:** 마지막 문제 범위 제한
```python
# 마지막 문제의 경우 P 태그 개수 제한
if i + 1 < len(autonum_positions):
    end_idx = autonum_positions[i + 1]['p_index']
else:
    # 마지막 문제: 현재 위치 + 최대 15개 P 태그로 제한
    end_idx = min(len(all_p_elements), start_idx + 15)
```

**Option C:** 정답 섹션 시작점 감지
```python
# "(빠른 정답)" 텍스트가 나오면 거기서 중단
for p_idx in range(start_idx, end_idx):
    text = get_text(all_p_elements[p_idx])
    if '빠른 정답' in text:
        end_idx = p_idx
        break
```

**권장:** Option A + Option C 조합

### 2.4 영향 범위

- 마지막 문제 (시험지 마지막 번호)
- 정답/해설 섹션이 문제 뒤에 붙는 형식의 문서

---

## 3. 추가 발견 사항

### 3.1 문제 8에 두 문제가 합쳐짐

**content_latex 내용:**
```
세 수 또는 식의 합이 모두 같을 때, 양수 x, y에 대하여 x + y의 값은?
① √2 ② 2 ③ 3√2 ④ 4 ⑤ 5√2

x에 대한 이차부등식 x² + 2kx - 3k < 0이 해를 갖지 않도록 하는 정수 k의 최솟값은?
① -3 ② rm -2 ③ rm -1 ④ 0 ⑤ 1
```

**분석:**
- 문제 8에 **두 개의 다른 문제**가 포함됨
- 첫 번째: x + y 값 문제
- 두 번째: 이차부등식 문제 (rm 에러 발생)

**가능한 원인:**
- HML 파일에서 두 문제가 같은 AUTONUM에 연결됨
- 또는 P 태그 범위 계산 문제

**해결 방안:**
- HML 파일 구조 확인 필요
- 또는 `start_idx - 3` (Line 746) 조정 검토

### 3.2 "수식입니다." 접두사

**content_equations_latex:**
```
- 수식입니다.\frac{15}{2}
```

**분석:**
- HWP 개체 대체 텍스트가 수식에 붙음
- `_clean_problem_content()`에서 본문은 정제하지만 수식 배열은 별도 처리 안됨

---

## 4. 수정 대상 파일

| 파일 | 수정 내용 |
|------|----------|
| [hwp_latex_converter.py](backend/app/services/hangul/hwp_latex_converter.py) | `rm - 숫자` 패턴 추가 |
| [hml_parser.py](backend/app/services/hangul/hml_parser.py) | "(빠른 정답)" 패턴 제거, 마지막 문제 범위 제한 |

---

## 5. 우선순위

| 버그 | 심각도 | 빈도 | 우선순위 |
|------|--------|------|----------|
| A: rm 변환 에러 | 중간 | 높음 | **1** |
| B: 문제 범위 에러 | 높음 | 낮음 (마지막 문제만) | **2** |

---

## 6. 결론

두 버그 모두 **정규식 패턴 부족** 또는 **범위 계산 로직 미흡**으로 발생.

### 버그 A (rm 에러)
- 음수 표현 `rm - N` 패턴 미지원
- 해결: 별도 패턴 추가

### 버그 B (범위 에러)
- 마지막 문제에서 정답 섹션 포함
- 해결: 정답 섹션 감지 + 패턴 제거

---

*Phase 20-P 분석 완료: 2025-11-29*
*작성: Claude Code (Opus 4.5)*
