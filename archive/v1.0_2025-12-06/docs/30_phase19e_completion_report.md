# Phase 19-E: 객관식 선택지 추출 개선 - 완료 리포트

**작성일**: 2025-11-29
**상태**: 완료

---

## 1. 개요

### 1.1 목표
- 객관식 보기가 숫자가 붙어서 표시되는 문제 해결
- 예: `① 101112 ④ 1314` → `① 10 ② 11 ③ 12 ④ 13 ⑤ 14`

### 1.2 결과
- **17/17 객관식 문제 선택지 정상 추출 (100%)**
- 모든 선택지 기호(①②③④⑤) 정상 표시
- 숫자/값 공백 분리 완료
- 헤더/푸터 정보 제거 유지

---

## 2. 수정된 파일

### 2.1 `backend/app/services/hangul/hml_parser.py`

#### 수정 1: P 태그 추출 범위 확장 (Line 631-632)
```python
# Phase 19-E: 범위 확장 (10 → 20) - 선택지 P 태그 포함
for p_idx in range(max(0, start_idx - 3), min(end_idx, start_idx + 20)):
```
**효과**: 선택지가 포함된 P 태그까지 추출 범위 확장

#### 수정 2: elem.tail 텍스트 처리 (Line 307-310)
```python
# Phase 19-E: tail 텍스트 처리 (선택지 기호 ②③ 등이 TAB.tail에 있음)
if elem.tail:
    plain_parts.append(elem.tail)
    latex_parts.append(elem.tail)
```
**효과**: TAB.tail에 있는 선택지 기호(②③) 추출

#### 수정 3: 수식 뒤 공백 추가 (Line 273-275)
```python
# Phase 19-E: 수식 뒤 공백 추가 (선택지 숫자 병합 방지)
cleaned = clean_hwp_equation(eq_text)
plain_parts.append(cleaned + ' ')
```
**효과**: `101112` → `10 11 12` 숫자 분리

#### 수정 4: 선택지 공백 정규화 (Line 697-700)
```python
# Phase 19-E: 선택지 공백 정규화 (기호 앞뒤 공백 확보)
content = re.sub(r'([①②③④⑤])(\S)', r'\1 \2', content)  # 기호 뒤 공백
content = re.sub(r'(\S)([①②③④⑤])', r'\1 \2', content)  # 기호 앞 공백
```
**효과**: 선택지 기호 앞뒤 공백 보장

#### 수정 5: 문서 헤더 패턴 제거 (Line 693-695)
```python
# Phase 19-E: 문서 헤더 패턴 제거 (어디서든 나타날 수 있음)
content = re.sub(r'내신\s*\d{4}년[^①②③④⑤]*?(수학상|수학)\s*\d*\s*', '', content)
```
**효과**: 본문 중간에 나타나는 헤더 정보 제거

---

## 3. 근본 원인 분석

### 3.1 발견된 문제

| 원인 | 설명 | 해결 |
|------|------|------|
| elem.tail 미처리 | ②③ 기호가 TAB.tail에 있었음 | tail 추출 추가 |
| 수식 공백 없음 | `rm 10` → `10` 변환 시 공백 누락 | 공백 추가 |
| P 태그 범위 부족 | 선택지 P 태그가 범위 밖 | 10 → 20 확장 |
| 헤더 중간 삽입 | tail 처리로 헤더도 추출됨 | 헤더 제거 패턴 추가 |

### 3.2 HML 선택지 구조

```xml
<P>  <!-- P[46] - 선택지 행 1 -->
  <CHAR>① </CHAR>
  <EQUATION><SCRIPT>rm 6</SCRIPT></EQUATION>
  <TAB/>② <TAB/>  <!-- ② 는 TAB.tail에 있음! -->
  <EQUATION><SCRIPT>rm 7</SCRIPT></EQUATION>
  <TAB/>③ <TAB/>  <!-- ③ 도 TAB.tail에 있음! -->
  <EQUATION><SCRIPT>rm 8</SCRIPT></EQUATION>
</P>
```

핵심 발견: **선택지 기호 ②③이 TAB 요소의 tail 텍스트에 위치**

---

## 4. 테스트 결과

### 4.1 선택지 추출 결과

| 문제 | 수정 전 | 수정 후 |
|------|---------|---------|
| 문제 1 | `① 1② 2③ 3④ 4⑤ 5` | `① 1 ② 2 ③ 3 ④ 4 ⑤ 5` |
| 문제 3 | `① 101112 ④ 1314` | `① 10 ② 11 ③ 12 ④ 13 ⑤ 14` |
| 문제 4 | `① 6 7 8 ④ 9 10` | `① 6 ② 7 ③ 8 ④ 9 ⑤ 10` |

### 4.2 전체 결과

- **객관식 문제 (1-17)**: 17/17 선택지 정상
- **주관식 문제 (18-21)**: 선택지 없음 (정상)
- **헤더 제거**: 정상 작동
- **회귀 테스트**: 통과

---

## 5. 관련 문서

- [28_phase19e_choice_extraction_research_report.md](28_phase19e_choice_extraction_research_report.md) - 연구 리포트
- [29_phase19e_choice_extraction_implementation_plan.md](29_phase19e_choice_extraction_implementation_plan.md) - 구현 계획
- [27_phase19d_completion_report.md](27_phase19d_completion_report.md) - Phase 19-D 완료 리포트

---

## 6. Phase 19 시리즈 완료 요약

| Phase | 목표 | 상태 |
|-------|------|------|
| 19-A | HML 파싱 기본 구조 | 완료 |
| 19-B | 문제/정답 추출 | 완료 |
| 19-C | LaTeX 변환 | 완료 |
| 19-D | 문제 경계 추출 개선 | 완료 |
| 19-E | 객관식 선택지 추출 | 완료 |

---

*Phase 19-E 완료 - 2025-11-29*
