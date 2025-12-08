# Phase 19-D: 문제 경계 추출 연구 리포트

**작성일**: 2025-11-29
**상태**: 분석 완료 / 개선 필요

---

## 1. 문제 현상

### 1.1 증상
- 문제 1번이 다음과 같이 표시됨:
  ```
  수학영역내신 2024년 인천 미추홀구 인화여고 고1공통 1학기기말 수학상1제2교시수학영역
  |x - 5| < 3의 해가 a < x < 8일 때, 실수 a의 값은? 수학영역 수학영역 수학영역 수학영역
  ```

### 1.2 기대 동작
- 문제 1번은 다음과 같이 표시되어야 함:
  ```
  1. 부등식 |x-5|<3의 해가 a < x < 8일 때, 실수 a의 값은?
  ① 1  ② 2  ③ 3  ④ 4  ⑤ 5
  ```

### 1.3 문제점 요약
| 항목 | 현재 상태 | 기대 상태 |
|------|----------|----------|
| 문제 번호 | 없음 | "1." 포함 |
| 헤더 정보 | 포함됨 | 제거되어야 함 |
| 선택지 | 없음 | ①②③④⑤ 포함 |
| 반복 텍스트 | "수학영역" 반복 | 없음 |

---

## 2. HML 파일 구조 분석

### 2.1 전체 구조

```
HML 파일
├── SECTION (1개)
│   ├── P[0]: SECDEF + 헤더정보 + 문제본문 + [정답] (AUTONUM #1)
│   ├── P[1]: ① 1② 2③ 3 (선택지)
│   ├── P[2]: ④ 4⑤ 5 (선택지)
│   ├── ...
│   ├── P[14]: "1" (문제 번호 단독)
│   ├── ...
│   └── P[155]: ...
│
└── ENDNOTE (21개)
    ├── ENDNOTE #1: [정답] ②
    ├── ENDNOTE #2: [정답] ②
    └── ...
```

### 2.2 P[0] 상세 분석 (핵심 문제)

**P[0]에 포함된 내용:**
```xml
<P ParaShape="8">
  <SECDEF>...</SECDEF>                    <!-- 섹션 정의 (페이지 설정) -->
  <TEXT>수학영역...</TEXT>                 <!-- 헤더/메타 정보 -->
  <TEXT>내신 2024년 인천...</TEXT>         <!-- 문서 제목 -->
  <TEXT>[정답]</TEXT>                      <!-- 정답 마커 -->
  <AUTONUM NumberType="Endnote" Number="1"/>  <!-- 미주 참조 -->
  <TEXT>부등식</TEXT>                      <!-- 문제 본문 시작 -->
  <EQUATION>LEFT | x-5 RIGHT | < 3</EQUATION>  <!-- 수식 -->
  <TEXT>의 해가...</TEXT>
</P>
```

**문제점:**
- P[0] 하나에 **SECDEF + 헤더 + 문제본문**이 모두 포함
- AUTONUM이 **문제 본문 내에 삽입**되어 있음 (미주 참조)

### 2.3 AUTONUM 위치 분석

**발견:** 동일 번호의 AUTONUM이 **두 번** 나타남

| AUTONUM #1 | P 인덱스 | 내용 |
|------------|----------|------|
| 첫 번째 | P[0] | 헤더 + 문제본문 + [정답] 부등식... |
| 두 번째 | P[18] | [정답] ② |

**원인:**
- HML은 미주(Endnote) 시스템 사용
- 본문에서 AUTONUM은 "참조 위치" 표시
- ENDNOTE 영역에서 AUTONUM은 "정답 내용" 표시

---

## 3. 현재 파서 로직 분석

### 3.1 `_find_problem_contents_by_autonum()` 코드

```python
# Line 621
for p_idx in range(max(0, start_idx - 3), min(end_idx, start_idx + 10)):
```

**문제점:**
- `start_idx = 0` (P[0]에 AUTONUM #1이 있음)
- `range(max(0, 0-3), min(18, 0+10))` = `range(0, 10)`
- **P[0]~P[9]까지 모두 가져옴** → 헤더 정보 포함

### 3.2 `_clean_problem_content()` 제거 패턴

```python
# 현재 제거 패턴
content = re.sub(r'\[정답\]\s*[①②③④⑤\d\w/≤≥\s\.\-\+\=]*', '', content)
content = re.sub(r'\[\d+\.?\d*점\]', '', content)
content = re.sub(r'^(수학영역|제\d+교시|선입니다|사각형입니다)\s*', '', content)
```

**제거되지 않는 것:**
- "내신 2024년 인천 미추홀구 인화여고..." (문서 제목)
- "고1공통 1학기기말 수학상" (시험 정보)
- "사각형입니다.제2교시" (HWP 개체 대체 텍스트)
- 반복되는 "수학영역" 텍스트

---

## 4. 올바른 문제 구조

### 4.1 문제 1번의 실제 위치

```
P[14]: "1"                           ← 문제 번호
P[15]: "사각형입니다.제2교시"         ← 메타 (제거 필요)
P[16]: "제2교시"                     ← 메타 (제거 필요)
P[17]: "수학영역"                    ← 메타 (제거 필요)

※ 실제 문제 본문은 P[0]에 있음 (SECDEF와 섞임)

P[0]의 문제 부분: "부등식 |x-5| < 3의 해가 a < x < 8일 때, 실수 a의 값은?"

P[1]: "① 1② 2③ 3"                  ← 선택지 1-3
P[2]: "④ 4⑤ 5"                     ← 선택지 4-5

P[18]: "[정답] ②"                   ← 정답 (ENDNOTE 영역)
```

### 4.2 기대하는 추출 결과

```python
{
    'number': '1',
    'content_text': '부등식 |x-5| < 3의 해가 a < x < 8일 때, 실수 a의 값은?',
    'content_latex': '부등식 $\\left| x - 5 \\right| < 3$의 해가 $a < x < 8$일 때, 실수 $a$의 값은?',
    'choices': ['1', '2', '3', '4', '5'],  # 선택지 별도 추출
    'answer': '②',
    'answer_type': 'choice'
}
```

---

## 5. 근본 원인

### 5.1 HML 파일의 특수 구조

**내신 시험지 HML 파일의 특징:**
1. **P[0]에 모든 것이 압축**: SECDEF + 헤더 + 첫 문제 본문
2. **미주(Endnote) 시스템**: 정답은 문서 끝에 별도 저장
3. **선택지 별도 P 태그**: 각 선택지가 개별 P 태그

### 5.2 현재 파서의 한계

| 가정 | 현실 |
|------|------|
| AUTONUM 주변이 문제 본문 | P[0]에는 헤더 + 본문 혼합 |
| P 태그 단위 추출 | 하나의 P에 여러 요소 |
| 앞 3개/뒤 10개 P가 관련 | 헤더 정보까지 포함됨 |

---

## 6. 해결 방안

### 6.1 단기 해결: 더 정교한 텍스트 정제

```python
def _clean_problem_content_v2(self, content: str) -> str:
    """개선된 문제 본문 정제"""

    # 1. 문서 헤더 패턴 제거
    content = re.sub(r'내신\s*\d{4}년.*?수학[상하]?\d?', '', content)

    # 2. HWP 개체 대체 텍스트 제거
    content = re.sub(r'(선입니다|사각형입니다|원입니다|직선입니다)\.?', '', content)

    # 3. 반복되는 "수학영역" 제거
    content = re.sub(r'(수학영역\s*)+', '', content)

    # 4. 제N교시 제거
    content = re.sub(r'제\d+교시', '', content)

    # 5. 문제 시작 패턴 찾기: "부등식", "방정식", "점", "직선" 등
    problem_start = re.search(
        r'(부등식|방정식|이차방정식|연립부등식|함수|점\s*[A-Z]|직선|삼각형|'
        r'다항식|원|좌표평면|두\s*수|세\s*수)',
        content
    )
    if problem_start:
        content = content[problem_start.start():]

    # 6. [정답] 이후 제거
    content = re.sub(r'\[정답\].*', '', content)

    return content.strip()
```

### 6.2 중기 해결: 문제 구조 재설계

**새로운 추출 로직:**

```python
def _extract_problem_smart(self) -> List[ParsedProblem]:
    """
    개선된 문제 추출

    1. ENDNOTE에서 정답 먼저 추출 (21개)
    2. 본문에서 문제 번호 P 태그 찾기
    3. 문제 번호 → 다음 문제 번호 사이가 문제 영역
    4. 선택지는 ①②③④⑤ 패턴으로 별도 추출
    """

    # Step 1: 정답 추출
    answers = self._extract_answers_from_endnotes()  # 기존 메서드

    # Step 2: 문제 번호 위치 찾기
    number_positions = []
    for i, p in enumerate(all_p_elements):
        text = ''.join(p.itertext()).strip()
        if re.match(r'^\d{1,2}$', text):  # 1~25 단독 숫자
            num = int(text)
            if 1 <= num <= len(answers):
                number_positions.append({'number': num, 'p_index': i})

    # Step 3: 각 문제 영역 추출
    for i, pos in enumerate(number_positions):
        start = pos['p_index']
        end = number_positions[i+1]['p_index'] if i+1 < len(number_positions) else len(all_p)

        # 문제 본문: start~end 사이
        # 선택지: ① 포함 P 태그
        # 메타 정보 제외: "수학영역", "제2교시" 등
```

### 6.3 장기 해결: 문제 본문 분리 저장

HML 파일의 구조적 특성상, **P[0]에서 문제 본문만 추출**하는 것은 어려움.

**권장 접근:**
1. **정답(ENDNOTE)에서 문제 번호 매핑**
2. **수식(EQUATION)을 기준으로 문제 본문 추출**
3. **선택지는 ①②③④⑤ 패턴으로 그룹화**

---

## 7. 구현 우선순위

### 7.1 Phase 19-D 구현 범위

| 우선순위 | 작업 | 복잡도 |
|---------|------|--------|
| 1 | `_clean_problem_content()` 패턴 추가 | 낮음 |
| 2 | 문제 번호 P 태그 기반 경계 설정 | 중간 |
| 3 | 선택지 별도 추출 | 중간 |
| 4 | 문제 본문 시작 키워드 감지 | 낮음 |

### 7.2 즉시 적용 가능한 수정

```python
# hml_parser.py의 _clean_problem_content() 확장

# 추가할 패턴들:
patterns_to_remove = [
    r'내신\s*\d{4}년.*?(?=부등식|방정식|점\s|직선|함수)',  # 헤더 ~ 문제시작
    r'(선입니다|사각형입니다|원입니다)\.?',  # HWP 개체
    r'(수학영역\s*){2,}',  # 반복 "수학영역"
    r'고\d.*?기말',  # 학년/시험 정보
]
```

---

## 8. 테스트 케이스

### 8.1 정상 추출 검증

```python
def test_problem_extraction():
    parser = HMLParser('내신_2024년_인화여고.hml')
    result = parser.parse()

    problem1 = result.problems[0]

    # 문제 번호 검증
    assert problem1.number == '1'

    # 헤더 미포함 검증
    assert '내신 2024년' not in problem1.content_text
    assert '인화여고' not in problem1.content_text

    # 문제 본문 검증
    assert '부등식' in problem1.content_text
    assert '|x-5|' in problem1.content_text or 'x - 5' in problem1.content_text

    # 선택지 제외 검증 (선택지는 별도 필드로 분리 필요)
    # assert '①' not in problem1.content_text
```

---

## 9. 결론

### 9.1 핵심 발견

1. **HML 파일 구조의 특수성**: P[0]에 SECDEF + 헤더 + 문제본문이 모두 포함
2. **AUTONUM 이중 출현**: 같은 번호가 본문과 ENDNOTE에서 각각 나타남
3. **현재 파서 한계**: AUTONUM 위치 기반 추출이 헤더 정보를 포함시킴

### 9.2 권장 조치

**즉시 조치:**
- `_clean_problem_content()`에 헤더/메타 정보 제거 패턴 추가

**중기 조치:**
- 문제 번호 P 태그 기반 경계 설정
- 선택지 별도 추출 및 저장

### 9.3 예상 결과

수정 후 문제 1번 표시:
```
1. 부등식 |x-5| < 3의 해가 a < x < 8일 때, 실수 a의 값은?
```

---

## 10. 참고

### 10.1 분석에 사용된 스크립트

- `backend/analyze_hml.py` - AUTONUM 위치 분석
- `backend/analyze_hml_detail.py` - P 태그 상세 분석
- `backend/analyze_hml_sections.py` - SECTION 구조 분석

### 10.2 관련 파일

- `backend/app/services/hangul/hml_parser.py` - HML 파서 (수정 대상)
- `docs/25_phase19c_latex_rendering_issue_report.md` - 이전 연구 리포트

---

*이 리포트는 문제 경계 추출 이슈에 대한 심층 분석 결과입니다.*
