# Phase 19-E: 객관식 보기 추출 문제 연구 리포트

**작성일**: 2025-11-29
**상태**: 분석 완료 / 개선 필요

---

## 1. 문제 현상

### 1.1 증상
- **문제 본문**: 정상 추출 (Phase 19-D 성공)
- **객관식 보기**: 숫자가 붙어서 표시됨

### 1.2 예시

**현재 표시 (문제 3)**:
```
삼각형 ABC의 무게중심 G의 좌표가 (2,5)일 때, a+b의 값은? (단, a, b는 상수이다.) ① 101112 ④ 1314
```

**기대 표시**:
```
삼각형 ABC의 무게중심 G의 좌표가 (2,5)일 때, a+b의 값은? (단, a, b는 상수이다.)
① 10  ② 11  ③ 12  ④ 13  ⑤ 14
```

### 1.3 문제 유형별 분석

| 문제 번호 | 현재 표시 | 원인 |
|----------|----------|------|
| 문제 1 | ① 1② 2③ 3④ 4⑤ 5 | 공백 없음 |
| 문제 3 | ① 101112 ④ 1314 | ②③ 누락, 숫자 병합 |
| 문제 6 | 보기 일부 누락 | 파싱 실패 |

---

## 2. HML 파일 구조 분석

### 2.1 선택지의 XML 구조

```xml
<!-- P[1]: 선택지 행 1 (①②③) -->
<P ParaShape="3">
  <CHAR>①</CHAR>
  <TEXT> </TEXT>
  <EQUATION>
    <SCRIPT>rm 1</SCRIPT>
  </EQUATION>
  <CHAR>②</CHAR>
  <TEXT> </TEXT>
  <EQUATION>
    <SCRIPT>rm 2</SCRIPT>
  </EQUATION>
  <CHAR>③</CHAR>
  <TEXT> </TEXT>
  <EQUATION>
    <SCRIPT>rm 3</SCRIPT>
  </EQUATION>
</P>

<!-- P[2]: 선택지 행 2 (④⑤) -->
<P ParaShape="3">
  <CHAR>④</CHAR>
  <TEXT> </TEXT>
  <EQUATION>
    <SCRIPT>rm 4</SCRIPT>
  </EQUATION>
  <CHAR>⑤</CHAR>
  <TEXT> </TEXT>
  <EQUATION>
    <SCRIPT>rm 5</SCRIPT>
  </EQUATION>
</P>
```

### 2.2 핵심 발견

1. **선택지는 별도 P 태그**: 문제 본문과 분리되어 있음
2. **한 행에 2-3개 선택지**: P[1]에 ①②③, P[2]에 ④⑤
3. **번호는 CHAR 태그**: `<CHAR>①</CHAR>`
4. **값은 EQUATION 태그**: `<EQUATION><SCRIPT>rm 10</SCRIPT></EQUATION>`
5. **공백은 TEXT 태그**: `<TEXT> </TEXT>`

### 2.3 복잡한 선택지 예시

```xml
<!-- 문제 3의 선택지 (두 자리 숫자) -->
<EQUATION>
  <SCRIPT>rm 10</SCRIPT>  <!-- "10" -->
</EQUATION>
<EQUATION>
  <SCRIPT>rm 11</SCRIPT>  <!-- "11" -->
</EQUATION>
```

---

## 3. 현재 파서 분석

### 3.1 선택지 추출 로직 부재

**파일**: `backend/app/services/hangul/hml_parser.py`

```python
# 현재 코드 (line 640-645)
for p in content_ps:
    text = ''.join(p.itertext())  # 모든 텍스트 단순 연결
    plain_content += text
```

**문제점**:
- 선택지 전용 추출 로직 없음
- 모든 P 태그 텍스트를 단순 연결
- CHAR, TEXT, EQUATION 구분 없이 처리

### 3.2 `_clean_problem_content()`의 문제

```python
# Line 688 - 선택지 패턴을 제거하는 코드
content = re.sub(r'^[①②③④⑤]\s*[\d\.\w]*\s*[①②③④⑤]\s*[\d\.\w]*\s*', '', content)
```

**문제점**:
- 앞쪽 선택지를 **제거**하는 로직
- 선택지를 정리하는 게 아니라 삭제함
- 이로 인해 일부 선택지가 누락됨

### 3.3 `clean_hwp_equation()` 함수

**파일**: `backend/app/services/hangul/equation_utils.py`

```python
def clean_hwp_equation(script: str) -> str:
    """HWP 수식을 LaTeX로 변환"""
    # "rm 10" → "10" (공백 없이 반환)
    script = re.sub(r'^rm\s+', '', script)
    return script.strip()
```

**문제점**:
- `rm 10` → `10` 변환 시 앞뒤 공백 없음
- 연속된 선택지가 `1011121314`처럼 붙어버림

### 3.4 ParsedProblem 데이터 모델

**파일**: `backend/app/services/hangul/parser_base.py`

```python
@dataclass
class ParsedProblem:
    number: str
    content_text: str      # 본문 + 선택지 혼합
    content_latex: str
    answer: str
    answer_type: str
    # choices: List[str]   # ← 없음!
```

**문제점**:
- `choices` 필드 없음
- 선택지가 `content_text`에 포함되어 구조적 분리 불가

---

## 4. 근본 원인

### 4.1 원인 요약

| 원인 | 설명 | 영향 |
|------|------|------|
| 선택지 추출 로직 부재 | P 태그를 단순 연결 | 공백/줄바꿈 손실 |
| clean_hwp_equation | 공백 없이 반환 | 숫자 병합 |
| _clean_problem_content | 선택지 패턴 제거 | 일부 선택지 누락 |
| ParsedProblem 구조 | choices 필드 없음 | 구조적 표현 불가 |

### 4.2 데이터 흐름

```
HML P 태그들
    ↓
itertext()로 텍스트 추출 (공백 손실)
    ↓
clean_hwp_equation() (추가 공백 없음)
    ↓
단순 문자열 연결
    ↓
_clean_problem_content() (일부 선택지 제거)
    ↓
"① 101112 ④ 1314" 출력
```

---

## 5. 해결 방안

### 5.1 단기 해결: 선택지 공백 추가

```python
def _extract_text_with_spacing(self, p_element) -> str:
    """P 태그에서 텍스트 추출 (선택지 공백 유지)"""
    result = []
    for elem in p_element.iter():
        if elem.tag == 'CHAR':
            # 선택지 번호 앞에 공백 추가
            text = elem.text or ''
            if text in '①②③④⑤':
                result.append(f' {text} ')
            else:
                result.append(text)
        elif elem.tag == 'TEXT':
            result.append(elem.text or '')
        elif elem.tag == 'SCRIPT':
            # 수식 값 뒤에 공백 추가
            eq_text = clean_hwp_equation(elem.text or '')
            result.append(f'{eq_text} ')
    return ''.join(result)
```

### 5.2 중기 해결: 선택지 별도 추출

```python
def _extract_choices(self, content_ps: List[Element]) -> List[str]:
    """P 태그들에서 선택지 추출"""
    choices = []
    choice_pattern = re.compile(r'[①②③④⑤]')

    for p in content_ps:
        text = ''.join(p.itertext())
        if choice_pattern.search(text):
            # 선택지가 포함된 P 태그 파싱
            parts = re.split(r'([①②③④⑤])', text)
            for i in range(1, len(parts), 2):
                symbol = parts[i]
                value = parts[i+1].strip() if i+1 < len(parts) else ''
                choices.append(f'{symbol} {value}')

    return choices
```

### 5.3 장기 해결: 데이터 모델 확장

```python
@dataclass
class ParsedProblem:
    number: str
    content_text: str       # 문제 본문만
    content_latex: str
    choices: List[str]      # ['① 1', '② 2', '③ 3', '④ 4', '⑤ 5']
    answer: str
    answer_type: str
```

### 5.4 `_clean_problem_content()` 수정

```python
def _clean_problem_content(self, content: str) -> str:
    # 기존: 선택지 제거
    # content = re.sub(r'^[①②③④⑤]...', '', content)

    # 수정: 선택지 공백 정규화
    content = re.sub(r'([①②③④⑤])\s*', r' \1 ', content)
    content = re.sub(r'\s+', ' ', content)
    return content.strip()
```

---

## 6. 구현 우선순위

### 6.1 Phase 19-E 구현 범위

| 우선순위 | 작업 | 복잡도 | 효과 |
|---------|------|--------|------|
| 1 | 선택지 공백 정규화 | 낮음 | 높음 |
| 2 | CHAR/SCRIPT 태그 처리 개선 | 중간 | 높음 |
| 3 | choices 필드 추가 | 중간 | 중간 |
| 4 | 프론트엔드 선택지 표시 | 낮음 | 높음 |

### 6.2 즉시 적용 가능한 수정

```python
# hml_parser.py의 _clean_problem_content() 수정

# 1. 선택지 제거 코드 삭제 (line 688)
# content = re.sub(r'^[①②③④⑤]...', '', content)  # 삭제

# 2. 선택지 공백 정규화 추가
content = re.sub(r'([①②③④⑤])(\S)', r'\1 \2', content)  # 번호 뒤 공백
content = re.sub(r'(\S)([①②③④⑤])', r'\1 \2', content)  # 번호 앞 공백
```

---

## 7. 테스트 케이스

### 7.1 선택지 추출 검증

```python
def test_choice_extraction():
    parser = HMLParser('test.hml')
    result = parser.parse()

    problem1 = result.problems[0]

    # 선택지가 공백으로 구분되어야 함
    assert '① 1' in problem1.content_text
    assert '② 2' in problem1.content_text

    # 숫자가 붙어있으면 안 됨
    assert '101112' not in problem1.content_text
    assert '1314' not in problem1.content_text
```

### 7.2 다양한 선택지 형식

```python
# 테스트할 선택지 형식들
test_cases = [
    '① 1 ② 2 ③ 3 ④ 4 ⑤ 5',           # 단순 숫자
    '① 10 ② 11 ③ 12 ④ 13 ⑤ 14',      # 두 자리 숫자
    '① √2 ② 2√2 ③ 3 ④ 4 ⑤ 5',        # 수식 포함
    '① a+b ② a-b ③ ab ④ a/b ⑤ a²',   # 변수 포함
]
```

---

## 8. 예상 결과

### 8.1 수정 전

```
문제 3: 삼각형 ABC의 무게중심... ① 101112 ④ 1314
```

### 8.2 수정 후

```
문제 3: 삼각형 ABC의 무게중심...
① 10  ② 11  ③ 12  ④ 13  ⑤ 14
```

---

## 9. 관련 파일

| 파일 | 역할 | 수정 필요 |
|------|------|----------|
| `hml_parser.py` | HML 파싱 | O |
| `equation_utils.py` | 수식 변환 | O |
| `parser_base.py` | 데이터 모델 | O |
| `HangulUploadPage.tsx` | 프론트엔드 | O |

---

## 10. 결론

### 10.1 핵심 발견

1. **선택지 전용 추출 로직 부재**: 단순 텍스트 연결로 공백 손실
2. **EQUATION 처리 문제**: `rm 10` → `10` 변환 시 공백 없음
3. **정제 로직 오류**: 선택지를 제거하는 regex 존재
4. **데이터 모델 한계**: choices 필드 없음

### 10.2 권장 조치

**즉시 조치**:
- `_clean_problem_content()`에서 선택지 제거 로직 삭제
- 선택지 기호 앞뒤 공백 정규화 추가

**중기 조치**:
- `_extract_text_with_spacing()` 메서드 추가
- ParsedProblem에 choices 필드 추가

---

*Phase 19-E 연구 리포트 - 2025-11-29*
