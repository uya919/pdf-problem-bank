# Phase 20-H: Word Boundary 문제 심층 분석 리포트

## 개요

HWP 수식의 `geq0`, `overlineAB` 등이 LaTeX로 변환되지 않는 문제에 대한 심층 분석 결과입니다.

**작성일:** 2025-11-29
**Phase:** 20-H
**분석 수준:** 전체 앱 파이프라인

---

## 1. 분석 결과 요약

### 핵심 발견사항

| 항목 | 상태 | 설명 |
|------|------|------|
| `hwp_latex_converter.py` | ✅ 수정 완료 | `_convert_basic_commands()`, `_convert_decorations()` 정상 |
| `clean_hwp_equation()` | ❌ 미수정 | `hml_parser.py`의 별도 함수 - 동일 버그 존재 |
| 테스트 HML 파일 | ✅ 정상 | 모든 수식이 `GEQ 0` (공백 있음) 형태 |
| `content_latex` 필드 | ✅ 정상 | LaTeX 변환 올바르게 수행됨 |
| 프론트엔드 렌더링 | ✅ 정상 | KaTeX 렌더링 로직 문제 없음 |

---

## 2. 데이터 흐름 분석

### 2.1 변환 파이프라인 구조

```
HML 파일
    ↓
HMLParser.parse()
    ↓
_find_problem_contents_by_autonum()
    ↓
_get_paragraph_text_with_latex()
    ↓
┌────────────────────────────────────────────────┐
│  EQUATION 태그 내용:                            │
│    ├─ plain_parts: clean_hwp_equation() ❌버그  │
│    └─ latex_parts: hwp_to_latex() ✅수정됨      │
│                                                 │
│  TEXT/CHAR 태그 내용:                           │
│    ├─ plain_parts: 그대로 추가                  │
│    └─ latex_parts: 그대로 추가 (변환 안함!)     │
└────────────────────────────────────────────────┘
    ↓
content_text = plain_parts 결합
content_latex = latex_parts 결합
    ↓
Frontend (MathDisplay)
    ↓
content_latex 우선 사용 (없으면 content_text)
```

### 2.2 두 개의 변환 함수

#### `hwp_to_latex()` - 수정 완료 ✅
```python
# hwp_latex_converter.py:531-554
pattern = r'\b' + re.escape(hwp_cmd) + r'(?![a-zA-Z])'
# (?![a-zA-Z]): 뒤에 영문자가 아니면 매칭 (숫자 OK)
```

**테스트 결과:**
```python
hwp_to_latex('geq0')      → '\\geq0'      ✅
hwp_to_latex('geq 0')     → '\\geq 0'     ✅
hwp_to_latex('overlineAB') → '\\overline{AB}' ✅
```

#### `clean_hwp_equation()` - 미수정 ❌
```python
# hml_parser.py:92-98
text = re.sub(r'\bGEQ\b', '≥', text)
text = re.sub(r'\bgeq\b', '≥', text)  # ← 여전히 \b 사용!
```

**테스트 결과:**
```python
clean_hwp_equation('geq0')      → 'geq0'      ❌ 변환 안됨
clean_hwp_equation('geq 0')     → '≥ 0'       ✅
clean_hwp_equation('overlineAB') → 'overlineAB' ❌ 변환 안됨
```

---

## 3. 실제 파싱 테스트 결과

### 테스트 파일
```
내신 2024년 인천 미추홀구 인화여고 고1 공통 1학기기말 수학상.Hml
```

### 문제 15 분석

**원본 HWP 수식:**
```
{cases{``x ^{2} -2x-3 GEQ 0#``x ^{2} - LEFT (a+5 RIGHT )x+5a<0}}
```

**변환 결과:**
| 필드 | 값 |
|------|-----|
| equations_latex | `\begin{cases}x^{2} - 2x - 3 \geq 0 \\ x^{2} - (a+5)x+5a<0\end{cases}` ✅ |
| content_latex | `연립부등식 $\begin{cases}...\geq 0...\end{cases}$을 만족시키는...` ✅ |
| content_text | `연립부등식 { x^{2} -2x-3 ≥ 0 / x^{2} - (a+5)x+5a<0 }...` ✅ |

**결론:** 이 파일에서는 모든 수식이 `GEQ 0` (공백 있음) 형태로 되어 있어 정상 변환됨.

### 문제가 되는 케이스

`geq0` (공백 없음) 패턴을 사용하는 HML 파일이 있다면:
- `content_latex`: `$...\geq0...$` ✅ (hwp_to_latex가 수정됨)
- `content_text`: `...geq0...` ❌ (clean_hwp_equation은 미수정)

프론트엔드는 `content_latex`를 우선 사용하므로 대부분 정상 표시됨.

---

## 4. 잠재적 문제점

### 4.1 content_latex가 비어있는 경우

`content_latex`가 비어있으면 프론트엔드가 `content_text`로 폴백:
```tsx
// HangulUploadPage.tsx:188
<MathDisplay latex={problem.content_latex || problem.content_text || '(내용 없음)'} />
```

이 경우 `content_text`의 `geq0`가 그대로 표시됨.

### 4.2 TEXT 태그 내 수식 명령어

EQUATION 태그가 아닌 일반 TEXT 태그에 수식 명령어가 있으면:
```python
# hml_parser.py:398-400
if text_content:
    plain_parts.append(text_content)
    latex_parts.append(text_content)  # 변환 없이 그대로!
```

이 텍스트는 LaTeX 변환을 거치지 않음 (의도된 동작).

### 4.3 캐시 문제

- 브라우저 캐시
- TanStack Query 캐시
- 백엔드 싱글톤 인스턴스 캐시

이전 파싱 결과가 캐시되어 표시될 수 있음.

---

## 5. 권장 조치

### 5.1 즉시 조치 (선택적)

`clean_hwp_equation()` 함수도 동일하게 수정:

```python
# hml_parser.py:92-98 수정
# 기존
text = re.sub(r'\bgeq\b', '≥', text)
# 변경
text = re.sub(r'\bgeq(?![a-zA-Z])', '≥', text)
```

**참고:** `content_text`는 plain text 표시용이므로, 대부분의 경우 영향 없음.

### 5.2 캐시 클리어

사용자가 문제를 경험한다면:
1. 브라우저 하드 리로드 (Ctrl+Shift+R)
2. 백엔드 서버 재시작
3. "다시파싱" 버튼 클릭

### 5.3 디버그 방법

콘솔에서 확인:
```javascript
// 브라우저 개발자 도구
console.log(problem.content_latex);
console.log(problem.content_text);
```

---

## 6. 결론

| 질문 | 답변 |
|------|------|
| `hwp_latex_converter.py` 수정됨? | ✅ 예, Phase 20-H에서 수정 완료 |
| LaTeX 변환 작동함? | ✅ 예, `geq0` → `\geq0` 정상 |
| 프론트엔드 표시 정상? | ✅ 예, `content_latex` 사용 시 정상 |
| `clean_hwp_equation()` 수정됨? | ❌ 아니오, 별도 수정 필요 (선택적) |
| 테스트 HML 파일에 문제 있음? | ❌ 아니오, 모두 `GEQ 0` (공백 있음) 형태 |

### 사용자 보고 원인 추정

1. **캐시된 이전 결과** 표시됨
2. 또는 **`content_text` 폴백** (content_latex가 비어있는 경우)
3. 또는 **다른 HML 파일**의 특수 패턴

### Phase 20-H 상태

✅ **주요 수정 완료**: `hwp_latex_converter.py`의 `_convert_basic_commands()`, `_convert_decorations()` 수정됨

⚠️ **추가 수정 권장**: `hml_parser.py`의 `clean_hwp_equation()` 함수도 동일 패턴 수정

---

*분석 완료: 2025-11-29*
*분석 방법: 전체 앱 파이프라인 코드 추적 + 실제 HML 파일 파싱 테스트*
