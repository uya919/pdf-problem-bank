# Phase 20 종합 버그 분석 리포트

## 개요

HWP → LaTeX 변환 시스템의 **심층 분석 리포트**입니다.

**작성일:** 2025-11-29
**분석 모드:** OPUS THINKHARDER
**상태:** 분석 완료, 수정 계획 수립

---

## 1. 버그 현황 요약

| 문제 번호 | 증상 | 근본 원인 | 심각도 | 상태 |
|----------|------|----------|--------|------|
| 18 | 수식 2번 표시 | HML 파서 중복 추출 | 높음 | **수정됨** |
| 12 | `√5over5` 표시 | 분수 패턴 정규식 버그 | 높음 | 미수정 |
| 17 | (가)(나)(다) 중복 + 수식 미렌더링 | 텍스트 중복 + 프론트엔드 | 높음 | 미수정 |

---

## 2. 버그 A: 분수 변환 실패 (문제 12)

### 2.1 증상

```
화면 표시: √5over5, 3√5over5, 6√5over5
올바른 표시: √5/5, 3√5/5, 6√5/5 (분수 형태)
```

### 2.2 데이터 분석

```python
# 백엔드 content_latex 출력
'① ${\\sqrt{5}} over {5}$ ② $\\frac{4}{5}$ ③ ${3 \\sqrt{5}} over {5}$'
```

**주목**:
- `{\\sqrt{5}} over {5}` → 변환 실패 (over 그대로)
- `\\frac{4}{5}` → 변환 성공

### 2.3 근본 원인

#### 정규식 패턴 분석

```python
# hwp_latex_converter.py Line 237
self.frac_pattern = re.compile(r'\{([^}]*)\}\s*over\s*\{([^}]*)\}', re.IGNORECASE)
```

**문제점**: `[^}]*`는 중첩 중괄호를 처리하지 못함

#### 실패 케이스

```
입력: {\\sqrt{5}} over {5}
      ↑        ↑↑
      {        }}  ← 이중 중괄호

패턴 분석:
- \{ : '{' 매칭 (위치 0)
- [^}]* : '\\sqrt{5' 매칭 ('}' 만나면 멈춤)
- \} : '}' 매칭 (위치 9)
- 다음 기대: 공백 + 'over'
- 실제: '}' (위치 10) ← 불일치! 매칭 실패
```

#### 성공 케이스 비교

```
입력: {4} over {5}  ← 단순 케이스
패턴이 정상 매칭됨 → \frac{4}{5}
```

### 2.4 해결 방안

#### Option 1: 균형 중괄호 매칭 (권장)

```python
def _find_balanced_braces(self, text: str, start: int) -> Tuple[int, int]:
    """균형 잡힌 중괄호 찾기"""
    if start >= len(text) or text[start] != '{':
        return (-1, -1)

    depth = 0
    for i in range(start, len(text)):
        if text[i] == '{':
            depth += 1
        elif text[i] == '}':
            depth -= 1
            if depth == 0:
                return (start + 1, i)  # 내용 범위 반환
    return (-1, -1)
```

#### Option 2: 반복 전처리

```python
# 이중 중괄호를 단일로 변환
text = re.sub(r'\{\{([^{}]*)\}\}', r'{\1}', text)
```

#### Option 3: 확장 정규식 (단순)

```python
# 중첩 1단계까지 허용
pattern = r'\{((?:[^{}]|\{[^{}]*\})*)\}\s*over\s*\{((?:[^{}]|\{[^{}]*\})*)\}'
```

---

## 3. 버그 B: 텍스트 중복 (문제 17)

### 3.1 증상

```
화면 표시:
(가) 삼각형 OAC는 넓이가 6√3인 정삼각형이다.
(나) 선분 AC 위의 점 D에 대하여...
(다) AB = BC이고...
(가) 삼각형 OAC는 넓이가 6√3인 정삼각형이다.  ← 중복!
(나) 선분 AC 위의 점 D에 대하여...  ← 중복!
(다) AB =  ← 잘림!
```

### 3.2 데이터 분석

```python
content_latex = '다음 조건을 만족시킨다. (가) 삼각형 $\\mathrm{OAC}$는...
...(다) $\\overline{\\mathrm{AB}} = \\overline{\\mathrm{BC}}$이고...
(가) 삼각형 $\\mathrm{OAC}$는...  # ← 중복 시작
...(다) $\\overline{\\mathrm{AB}} ='  # ← 잘림
```

### 3.3 근본 원인

#### HML 파일 구조

```xml
<!-- 문제 본문 -->
<P>다음 조건을 만족시킨다.</P>
<P>(가) 삼각형 OAC는...</P>
<P>(나) 선분 AC 위의 점...</P>
<P>(다) AB = BC이고...</P>

<!-- 선택지 영역 (동일 내용 반복) -->
<P>(가) 삼각형 OAC는...</P>
<P>(나) 선분 AC 위의 점...</P>
<P>(다) AB =...</P>  <!-- 잘린 버전 -->
```

#### 파서 동작

```python
# hml_parser.py Line 746
for p_idx in range(max(0, start_idx - 3), min(end_idx, start_idx + 20)):
    # 모든 P 태그의 내용을 latex_parts에 추가
    latex_parts.append(latex_text.strip())
```

**문제점**:
- Phase 20-N에서 **수식 중복**만 제거함
- **텍스트 중복**은 여전히 발생

### 3.4 해결 방안

#### Option 1: 텍스트 부분 중복 제거

```python
def _remove_duplicate_text_parts(self, content: str) -> str:
    """
    반복되는 텍스트 패턴 제거

    (가)...(나)...(다)... (가)...(나)...(다)...
    → (가)...(나)...(다)... (첫 번째만 유지)
    """
    # (가), (나), (다) 또는 ①, ②, ③ 패턴 감지
    pattern = r'(\([가-힣]\)|\([a-z]\)|[①-⑩])'
    markers = re.findall(pattern, content)

    if len(markers) < 2:
        return content

    # 첫 마커 반복 위치 찾기
    first_marker = markers[0]
    first_pos = content.find(first_marker)
    second_pos = content.find(first_marker, first_pos + 1)

    if second_pos > 0:
        # 첫 번째 발생만 유지
        return content[:second_pos].strip()

    return content
```

#### Option 2: P 태그 범위 제한

```python
# 현재: start_idx + 20
# 변경: 다음 문제 시작 전까지만
for p_idx in range(start_idx, min(end_idx, next_problem_idx)):
```

---

## 4. 버그 C: 수식 미렌더링 (문제 17)

### 4.1 증상

스크린샷에서 `$\overline{\mathrm{AB}}$`가 텍스트로 표시됨.

### 4.2 분석

#### 백엔드 데이터 확인

```python
# 백엔드 출력 (정상)
'$\\overline{\\mathrm{AB}} = \\overline{\\mathrm{BC}}$'
```

백엔드 데이터는 **정상**입니다.

#### 프론트엔드 의심 영역

1. **KaTeX 렌더링 문제**
   - `MathDisplay.tsx`가 `$...$` 패턴 인식 실패?

2. **브라우저 캐시**
   - 이전 파싱 데이터가 캐시됨?

3. **폰트 문제**
   - 백슬래시(`\`)가 다른 문자로 표시?

### 4.3 스크린샷 분석

스크린샷에서 `$Woverline{Wmathrm{AB}}` 형태가 보임.
- `\`가 `W`로 표시되는 것은 **폰트 렌더링 문제** 가능성
- 또는 **JSON 이스케이프 문제**

#### JSON 직렬화 확인 필요

```javascript
// 프론트엔드에서 확인
console.log('Raw content_latex:', JSON.stringify(problem.content_latex));
```

---

## 5. 수정 우선순위

| 순위 | 버그 | 영향 범위 | 수정 난이도 | 예상 작업량 |
|------|------|----------|------------|------------|
| 1 | 분수 변환 (문제 12) | 모든 분수 수식 | 중간 | 1시간 |
| 2 | 텍스트 중복 (문제 17) | 조건부 문제 | 중간 | 1시간 |
| 3 | 수식 미렌더링 | 프론트엔드 | 낮음 | 캐시 클리어 |

---

## 6. 수정 계획 (Phase 20-O)

### 6.1 분수 변환 수정

**파일**: `hwp_latex_converter.py`

```python
def _convert_fractions(self, text: str) -> str:
    """분수 변환: {a} over {b} → \\frac{a}{b}"""

    # Phase 20-O: 중첩 중괄호 처리
    def find_content_in_braces(s, start):
        """균형 잡힌 중괄호 내용 추출"""
        if start >= len(s) or s[start] != '{':
            return None, start
        depth = 0
        content_start = start + 1
        for i in range(start, len(s)):
            if s[i] == '{':
                depth += 1
            elif s[i] == '}':
                depth -= 1
                if depth == 0:
                    return s[content_start:i], i + 1
        return None, start

    result = []
    i = 0
    while i < len(text):
        # '{' 찾기
        if text[i] == '{':
            # 분자 추출
            numerator, after_num = find_content_in_braces(text, i)
            if numerator is not None:
                # 'over' 키워드 확인
                over_match = re.match(r'\s*over\s*', text[after_num:], re.IGNORECASE)
                if over_match:
                    over_end = after_num + over_match.end()
                    # 분모 추출
                    if over_end < len(text) and text[over_end] == '{':
                        denominator, after_denom = find_content_in_braces(text, over_end)
                        if denominator is not None:
                            result.append(f'\\frac{{{numerator}}}{{{denominator}}}')
                            i = after_denom
                            continue
        result.append(text[i])
        i += 1

    return ''.join(result)
```

### 6.2 텍스트 중복 제거

**파일**: `hml_parser.py`

```python
def _remove_duplicate_text_blocks(self, content: str) -> str:
    """
    Phase 20-O: 반복되는 텍스트 블록 제거

    (가)...(나)...(다)... (가)...(나)...(다)...
    → (가)...(나)...(다)... (첫 번째만 유지)
    """
    # 조건 마커 패턴
    condition_markers = [
        r'\(가\)', r'\(나\)', r'\(다\)', r'\(라\)', r'\(마\)',
        r'\(a\)', r'\(b\)', r'\(c\)', r'\(d\)', r'\(e\)',
    ]

    for marker in condition_markers:
        # 마커가 2번 이상 나오면 첫 번째 세트만 유지
        matches = list(re.finditer(marker, content))
        if len(matches) >= 2:
            # 첫 번째와 두 번째 위치
            first_pos = matches[0].start()
            second_pos = matches[1].start()

            # 같은 마커가 중복 → 첫 번째 세트만 유지
            if matches[0].group() == matches[1].group():
                # 두 번째 마커 바로 앞까지만 유지
                content = content[:second_pos].strip()
                break

    return content
```

---

## 7. 검증 계획

### 7.1 단위 테스트

```python
# 분수 변환 테스트
assert hwp_to_latex('{\\sqrt{5}} over {5}') == '\\frac{\\sqrt{5}}{5}'
assert hwp_to_latex('{3 \\sqrt{5}} over {5}') == '\\frac{3 \\sqrt{5}}{5}'
assert hwp_to_latex('{4} over {5}') == '\\frac{4}{5}'

# 중첩 분수 테스트
assert hwp_to_latex('{{a} over {b}} over {c}') == '\\frac{\\frac{a}{b}}{c}'
```

### 7.2 통합 테스트

```python
# HML 파싱 후 content_latex 확인
result = parser.parse()
p12 = next(p for p in result.problems if p.number == '12')
assert 'over' not in p12.content_latex  # 'over' 키워드 없어야 함
assert '\\frac' in p12.content_latex    # \frac 있어야 함

p17 = next(p for p in result.problems if p.number == '17')
assert p17.content_latex.count('(가)') == 1  # (가)가 1번만 나와야 함
```

---

## 8. 히스토리 및 교훈

### 8.1 Phase 20 수정 이력

| Phase | 날짜 | 수정 내용 | 결과 |
|-------|------|----------|------|
| 20-A | 11-28 | 싱글톤 개선 | 개발 환경 자동 갱신 |
| 20-H | 11-28 | 숫자 뒤 연산자 매칭 | `geq0` → `\geq 0` |
| 20-I | 11-28 | 이중 변환 방지 | `\\\\geq` 버그 수정 |
| 20-K | 11-29 | overline 이중 백슬래시 | 기본 케이스 해결 |
| 20-N | 11-29 | 수식 중복 제거 | 문제 18 해결 |
| 20-O | 예정 | 분수/텍스트 중복 | 문제 12, 17 해결 |

### 8.2 교훈

1. **정규식 한계**: 중첩 구조는 정규식만으로 처리 어려움 → 파서 함수 필요
2. **데이터 흐름 추적**: 백엔드/프론트엔드 경계에서 문제 발생 → 양쪽 확인 필요
3. **환경 문제**: 다중 서버 실행 시 수정 반영 안됨 → 서버 관리 중요
4. **점진적 개선**: 한 번에 완벽 불가 → 이슈 발견 → 수정 → 검증 사이클

---

## 9. 결론

### 즉시 수정 필요

1. **분수 변환** (`hwp_latex_converter.py`): 균형 중괄호 매칭 구현
2. **텍스트 중복** (`hml_parser.py`): 조건부 마커 중복 제거

### 확인 필요

3. **수식 렌더링**: 프론트엔드 캐시 클리어 후 재테스트

### 다음 단계

Phase 20-O에서 위 수정 사항 구현 → 테스트 → 검증

---

*분석 완료: 2025-11-29*
*분석 모드: OPUS THINKHARDER*
*작성: Claude Code (Opus 4.5)*
