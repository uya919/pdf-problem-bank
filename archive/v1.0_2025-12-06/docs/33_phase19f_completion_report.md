# Phase 19-F: 연립부등식/연립방정식 수식 변환 - 완료 리포트

**작성일**: 2025-11-29
**상태**: 완료

---

## 1. 개요

### 1.1 목표
- HWP `{cases{...#...}}` 구조를 LaTeX `\begin{cases}...\end{cases}`로 변환
- 연립부등식/연립방정식이 KaTeX에서 정상 렌더링되도록 개선

### 1.2 결과
- **cases 변환**: 완료 (Plain Text + LaTeX)
- **DEG 변환**: 완료 (각도 기호 °)
- **단위 테스트**: 10/10 통과
- **통합 테스트**: 17/17 객관식 문제 정상

---

## 2. 수정된 파일

### 2.1 `backend/app/services/hangul/hml_parser.py`

#### 변경 1: cases → plain text 변환 (Line 55-69)
```python
# Phase 19-F Step 1: cases 구조 변환 (plain text)
# {cases{A#B#C}} → { A / B / C }
def convert_cases_to_text(match):
    content = match.group(1)
    rows = content.split('#')
    formatted_rows = ' / '.join(row.strip() for row in rows)
    return f'{{ {formatted_rows} }}'

# 중첩 cases 처리를 위해 반복 적용
for _ in range(3):
    prev_text = text
    text = re.sub(r'\{cases\{([^}]*(?:\{[^}]*\}[^}]*)*)\}\}',
                  convert_cases_to_text, text)
    if prev_text == text:
        break
```

#### 변경 2: DEG/ANGLE 변환 (Line 99-102)
```python
# Phase 19-F Step 2: 각도 기호 (DEG → °)
text = re.sub(r'\bDEG\b', '°', text)
text = re.sub(r'\bANGLE\b', '∠', text)
text = re.sub(r'\bangle\b', '∠', text)
```

### 2.2 `backend/app/services/hangul/hwp_latex_converter.py`

#### 변경 1: _convert_cases() 메서드 추가 (Line 280-303)
```python
def _convert_cases(self, text: str) -> str:
    """
    Phase 19-F: cases 구조를 LaTeX cases 환경으로 변환
    {cases{A#B#C}} → \\begin{cases}A\\\\B\\\\C\\end{cases}
    """
    def replace_cases(match):
        content = match.group(1)
        rows = content.split('#')
        latex_rows = ' \\\\ '.join(row.strip() for row in rows)
        return f'\\begin{{cases}}{latex_rows}\\end{{cases}}'

    pattern = r'\{cases\{([^}]*(?:\{[^}]*\}[^}]*)*)\}\}'

    for _ in range(3):
        prev = text
        text = re.sub(pattern, replace_cases, text)
        if prev == text:
            break

    return text
```

#### 변경 2: convert() 호출 순서 수정 (Line 254-255)
```python
# Phase 19-F: cases 변환 (다른 변환보다 먼저!)
text = self._convert_cases(text)
```

#### 변경 3: COMMAND_MAP에 DEG 추가 (Line 148-149)
```python
# Phase 19-F: 각도 기호 (DEG → °)
'DEG': r'^{\circ}',
```

---

## 3. 테스트 결과

### 3.1 단위 테스트 (`test_phase19f_cases.py`)

| 테스트 | 결과 |
|--------|------|
| cases → plain text | 4/4 성공 |
| cases → LaTeX | 3/3 성공 |
| DEG 변환 | 3/3 성공 |
| 복잡한 연립부등식 | 통과 |

### 3.2 통합 테스트 (HML 파일 파싱)

- **객관식 문제 (1-17)**: 17/17 선택지 정상
- **주관식 문제 (18-21)**: 선택지 없음 (정상)
- **문제 15번 cases 변환**: 성공

### 3.3 문제 15번 변환 결과

**원본 HWP**:
```
{cases{``x ^{2} -2x-3 GEQ 0#``x ^{2} - LEFT (a+5 RIGHT )x+5a<0}}
```

**Plain Text**:
```
{ x ^{2} -2x-3 ≥ 0 / x ^{2} - (a+5 )x+5a<0 }
```

**LaTeX**:
```latex
\begin{cases}x ^{2} - 2x - 3 \geq 0 \\ x ^{2} - \left( a + 5 \right)x + 5a < 0\end{cases}
```

---

## 4. 변환 규칙 요약

| HWP 원본 | Plain Text | LaTeX |
|----------|------------|-------|
| `{cases{A#B}}` | `{ A / B }` | `\begin{cases}A\\B\end{cases}` |
| `{cases{A#B#C}}` | `{ A / B / C }` | `\begin{cases}A\\B\\C\end{cases}` |
| `DEG` | `°` | `^{\circ}` |
| `ANGLE` | `∠` | `\angle` |

---

## 5. 회귀 테스트

- **Phase 19-E**: 선택지 추출 정상 (17/17)
- **Phase 19-D**: 문제 경계 추출 정상
- **Phase 19-C**: 기본 LaTeX 변환 정상

---

## 6. 관련 문서

- [31_phase19f_equation_cases_research_report.md](31_phase19f_equation_cases_research_report.md) - 연구 리포트
- [32_phase19f_equation_cases_implementation_plan.md](32_phase19f_equation_cases_implementation_plan.md) - 개발 계획
- [30_phase19e_completion_report.md](30_phase19e_completion_report.md) - Phase 19-E 완료 리포트

---

## 7. Phase 19 시리즈 완료 요약

| Phase | 목표 | 상태 |
|-------|------|------|
| 19-A | HML 파싱 기본 구조 | 완료 |
| 19-B | 문제/정답 추출 | 완료 |
| 19-C | LaTeX 변환 | 완료 |
| 19-D | 문제 경계 추출 개선 | 완료 |
| 19-E | 객관식 선택지 추출 | 완료 |
| **19-F** | **연립부등식 cases 변환** | **완료** |

---

*Phase 19-F 완료 - 2025-11-29*
