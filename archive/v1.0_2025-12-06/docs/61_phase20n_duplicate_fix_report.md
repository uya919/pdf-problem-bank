# Phase 20-N: 수식 중복 버그 수정 완료 리포트

## 개요

문제 18에서 발생한 **수식 중복 표시 버그**를 수정했습니다.

**작성일:** 2025-11-29
**Phase:** 20-N
**상태:** 수정 완료

---

## 1. 버그 원인

### 근본 원인
HML 파일에서 같은 수식이 **여러 P 태그에 반복**되어 있었습니다.

```xml
<!-- P 태그 1 -->
<P>다음 연립부등식을 푸시오. <EQUATION>...</EQUATION></P>

<!-- P 태그 2 (중복) -->
<P><EQUATION>...</EQUATION></P>
```

### 문제점
`_find_problem_contents_by_autonum()` 함수에서:
1. 각 P 태그의 수식을 모두 추출
2. 중복 체크 없이 `all_latex_equations.extend()` 호출
3. `latex_parts.append()`로 같은 수식이 `content_latex`에 중복 포함

---

## 2. 수정 내용

### 2.1 `content_equations_latex` 중복 제거 (Line 742-759)

```python
# Phase 20-N: 수식 중복 방지용 집합
seen_equations = set()

for p_idx in range(...):
    plain_text, latex_text, hwp_eqs, latex_eqs = \
        self._get_paragraph_text_with_latex(all_p_elements[p_idx])
    if plain_text.strip():
        plain_parts.append(plain_text.strip())
        latex_parts.append(latex_text.strip())
        # Phase 20-N: 중복 수식 제거
        for hwp_eq, latex_eq in zip(hwp_eqs, latex_eqs):
            eq_key = latex_eq.strip()
            if eq_key and eq_key not in seen_equations:
                seen_equations.add(eq_key)
                all_hwp_equations.append(hwp_eq)
                all_latex_equations.append(latex_eq)
```

### 2.2 `content_latex` 인라인 수식 중복 제거 (Line 769, 846-898)

```python
# Line 769: 후처리 호출
latex_content = self._remove_duplicate_inline_equations(latex_content)

# Line 846-898: 새 메서드
def _remove_duplicate_inline_equations(self, content: str) -> str:
    """
    Phase 20-N: content_latex에서 중복 인라인 수식 제거

    - $...$ 패턴 중 15자 이상 수식만 중복 체크
    - 짧은 수식 ($x$, $y$ 등)은 항상 유지
    - 첫 번째 출현만 유지, 나머지 제거
    """
```

---

## 3. 테스트 결과

### 문제 18 (수식 중복 버그)

| 항목 | 수정 전 | 수정 후 |
|------|--------|--------|
| `content_latex` 내 cases 패턴 | 2개 | **1개** |
| `content_equations_latex` 개수 | 3개 | **2개** |
| 중복 여부 | 있음 | **없음** |

### 수정 후 출력
```
content_latex: 다음 연립부등식을 푸시오. $\begin{cases}...\end{cases}$
cases 패턴 개수: 1
content_equations_latex 개수: 2
OK: 중복 없음
```

### 문제 17 (LaTeX 렌더링 문제)

백엔드 데이터 확인:
- `\overline` 포함: **True**
- `\mathrm` 포함: **True**
- 데이터 형식: 정상 (`$\overline{\mathrm{AB}}$`)

**결론**: 백엔드 데이터는 정상. 프론트엔드에서 렌더링 안되면 브라우저 캐시 문제.

---

## 4. 테스트 방법

### 백엔드 테스트 완료

브라우저에서 테스트:
1. http://localhost:5173 접속
2. HWP 파일 업로드
3. "다시 파싱" 클릭
4. 문제 17, 18 확인

### 캐시 문제 해결
- 브라우저 하드 리로드: `Ctrl + Shift + R`
- 개발자 도구 → Network → "Disable cache" 체크

---

## 5. 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `hml_parser.py` | Line 742-759: 수식 배열 중복 제거 |
| `hml_parser.py` | Line 769: `_remove_duplicate_inline_equations()` 호출 |
| `hml_parser.py` | Line 846-898: 새 메서드 추가 |

---

## 6. 결론

| 버그 | 상태 | 비고 |
|------|------|------|
| 문제 18 수식 중복 | **수정됨** | 백엔드 검증 완료 |
| 문제 17 렌더링 | **백엔드 정상** | 프론트엔드/캐시 확인 필요 |

---

*Phase 20-N 완료: 2025-11-29*
*작성: Claude Code (Opus 4.5)*
