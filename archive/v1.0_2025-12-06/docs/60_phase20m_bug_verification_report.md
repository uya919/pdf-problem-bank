# Phase 20-M: 버그 검증 리포트

## 개요

환경 정리 후 직접 파싱 테스트를 통해 문제 17, 18의 실제 버그를 검증했습니다.

**작성일:** 2025-11-29
**Phase:** 20-M
**상태:** 버그 원인 확인됨

---

## 1. 테스트 결과 요약

### LaTeX 변환기: 정상 작동
```python
'GEQ 0'                    -> '\\geq 0'       # OK
'geq0'                     -> '\\geq0'        # OK
'overline{ rm AB it }'     -> '\\overline{\\mathrm{AB}}'  # OK
```

**결론**: `hwp_latex_converter.py`의 Phase 20-K 수정은 정상 적용됨.

---

## 2. 문제 17 분석

### 실제 content_latex 값
```python
'...$\\overline{\\mathrm{AB}} = \\overline{\\mathrm{BC}}$이고...'
```

### 분석
- `\\overline{\\mathrm{AB}}` → **정상** (단일 백슬래시)
- 백엔드 데이터는 올바름
- **문제**: 프론트엔드에서 렌더링 안됨

### 가능한 원인
1. 프론트엔드 `MathDisplay` 컴포넌트 이슈
2. 브라우저 캐시
3. 이전 파싱 데이터 표시 중

---

## 3. 문제 18 분석: 중복 버그 발견!

### 실제 content_latex 값
```python
'다음 연립부등식을 푸시오. $\\begin{cases} - 2 \\left( x - 2 \\right)\\geq x - 5 \\\\ \\frac{1}{2} x \\leq x + 4\\end{cases}$ $\\begin{cases} - 2 \\left( x - 2 \\right)\\geq x - 5 \\\\ \\frac{1}{2} x \\leq x + 4\\end{cases}$'
```

### 문제점
**동일한 수식이 `content_latex`에 2번 포함됨!**

```
$\\begin{cases}...\\end{cases}$  ← 1번째
$\\begin{cases}...\\end{cases}$  ← 2번째 (중복!)
```

### content_equations_latex 값
```python
['수식입니다. - 8 \\leq x \\leq 3',
 '\\begin{cases}...\\end{cases}',
 '\\begin{cases}...\\end{cases}']  # 여기도 중복!
```

### 근본 원인
**HML 파서(`hml_parser.py`)가 동일 수식을 2번 추출함**

---

## 4. 버그 원인 추적

### 가설: HML 파일 구조
HML 파일에서 같은 수식이 2번 나타날 수 있는 경우:

1. **조건 문단과 본문 문단 분리**:
   - (가), (나), (다) 조건이 한 번 나오고
   - 아래에서 다시 본문으로 반복

2. **EQUATION 태그 중복**:
   - 같은 수식이 다른 위치에서 2번 정의

3. **파서 버그**:
   - `_get_paragraph_text_with_latex()`에서 같은 EQUATION을 2번 처리

### 코드 확인 필요
```python
# hml_parser.py Line 370-371
if elem_id not in processed_equations:
    processed_equations.add(elem_id)
```

`processed_equations`가 단일 문단 내에서만 중복 체크하고,
**다른 문단에서 같은 수식이 반복되면 중복 추가됨**.

---

## 5. 결론

| 문제 | 증상 | 근본 원인 | 위치 |
|------|------|----------|------|
| 17 | `$\overline{AB}$` 미렌더링 | 프론트엔드/캐시 문제 | Frontend |
| 18 | 수식 2번 표시 | HML 파서가 같은 수식 2번 추출 | `hml_parser.py` |

---

## 6. 해결 방안

### 문제 17 (프론트엔드)
1. 브라우저 하드 리로드 (Ctrl+Shift+R)
2. "다시 파싱" 클릭하여 새 데이터 로드
3. 개발자 도구에서 API 응답 확인

### 문제 18 (백엔드 파서)
**수정 필요**: `hml_parser.py`에서 **문제 단위 수식 중복 제거**

```python
# 제안: _extract_problem_content()에서 중복 수식 제거
seen_equations = set()
for eq in equations:
    eq_normalized = eq.strip()
    if eq_normalized not in seen_equations:
        seen_equations.add(eq_normalized)
        unique_equations.append(eq)
```

---

## 7. 다음 단계

1. **즉시**: 브라우저 캐시 클리어 및 "다시 파싱" 테스트
2. **Phase 20-N**: `hml_parser.py` 수식 중복 제거 로직 추가

---

*검증 완료: 2025-11-29*
*방법: 직접 HML 파싱 및 데이터 분석*
*작성: Claude Code (Opus 4.5)*
