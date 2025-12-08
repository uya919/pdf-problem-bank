# Phase 19-B: ENDNOTE 기반 문제 추출 상세 구현 계획

**작성일**: 2025-11-28
**작성자**: Claude Code (Opus)
**목표**: HML 파일에서 ENDNOTE 태그를 활용하여 21문제 전체 검출

---

## 1. 현재 상태 분석

### 1.1 현재 코드 구조
```
backend/app/services/hangul/
├── parser_base.py      # ParsedProblem, ParseResult 정의
├── hml_parser.py       # HMLParser 클래스 (수정 대상)
├── hwpx_parser.py      # HWPX 파서
└── problem_extractor.py # ProblemExtractor (텍스트 기반 추출)
```

### 1.2 현재 흐름
```python
# hml_parser.py - parse() 메서드
def parse(self):
    # 1. XML 파싱
    self.tree = ET.parse(self.file_path)
    self.root = self.tree.getroot()

    # 2. 텍스트 추출 (P 태그 기반)
    paragraphs = self.extract_text()

    # 3. 문제 단위 분리 (ProblemExtractor 사용)
    result.problems = self.extractor.extract_problems(paragraphs)
    # ↑ 여기서 보기(①~⑤) 패턴에 의존 → 주관식 누락
```

### 1.3 문제점
| 문제 | 원인 | 영향 |
|------|------|------|
| 주관식 누락 | 보기 패턴 의존 | 4문제 미검출 |
| ENDNOTE 미활용 | 텍스트 추출만 | 문제 수 파악 불가 |
| AUTONUM 미활용 | 위치 정보 없음 | 문제 본문 분리 불가 |

---

## 2. 구현 목표

### 2.1 최종 목표
```
현재: 16개 검출 (76%)
목표: 21개 검출 (100%)

추가 정보:
- 문제 유형 분류 (객관식/주관식/서술형)
- 정답 정확 추출
- 배점 정보 매핑
```

### 2.2 성공 기준
| 항목 | 기준 |
|------|------|
| 문제 수 | 21개 전체 검출 |
| 정답 | 21개 모두 정확 |
| 유형 분류 | 객관식 17개, 주관식 4개 구분 |
| 기존 호환 | ENDNOTE 없는 파일도 정상 동작 |

---

## 3. 상세 구현 계획

### 3.1 단계 개요
```
Step 1: ENDNOTE 감지 및 정답 추출
Step 2: AUTONUM 위치 기반 문제 본문 매핑
Step 3: 문제 유형 자동 분류
Step 4: 배점 정보 매핑
Step 5: 기존 로직과 통합 (폴백)
Step 6: 테스트 및 검증
```

---

## Step 1: ENDNOTE 감지 및 정답 추출

### 1.1 목표
- ENDNOTE 태그에서 문제 수와 정답 추출
- HWP 수식 정리하여 정답 텍스트 정규화

### 1.2 코드 변경

**파일**: `backend/app/services/hangul/hml_parser.py`

```python
# parse() 메서드 수정
def parse(self) -> ParseResult:
    """HML 파일 파싱"""
    result = ParseResult(
        file_name=self.file_name,
        file_type='hml'
    )

    try:
        # 1. XML 파싱
        self.tree = ET.parse(self.file_path)
        self.root = self.tree.getroot()

        # 2. 텍스트 추출
        paragraphs = self.extract_text()

        # 3. 이미지 추출
        images = self.extract_images()

        # 4. 메타데이터 추출
        result.detected_metadata = self._extract_metadata()

        # Phase 19-B: ENDNOTE 기반 추출 우선 시도
        endnotes = list(self.root.iter('ENDNOTE'))
        if len(endnotes) >= 3:  # 최소 3개 이상이면 ENDNOTE 기반 사용
            result.problems = self._extract_by_endnote(endnotes, paragraphs)
            result.detected_metadata['extraction_method'] = 'endnote'
        else:
            # 기존 방식 (폴백)
            result.problems = self.extractor.extract_problems(paragraphs)
            result.detected_metadata['extraction_method'] = 'text_pattern'

        result.success = True

    except ET.ParseError as e:
        result.success = False
        result.errors.append(f"XML 파싱 오류: {str(e)}")
    except Exception as e:
        result.success = False
        result.errors.append(f"파싱 오류: {str(e)}")

    return result
```

### 1.3 새 메서드: `_extract_by_endnote()`

```python
def _extract_by_endnote(
    self,
    endnotes: List[ET.Element],
    paragraphs: List[str]
) -> List[ParsedProblem]:
    """
    Phase 19-B: ENDNOTE 기반 문제 추출

    Args:
        endnotes: ENDNOTE 태그 리스트
        paragraphs: 추출된 텍스트 문단들

    Returns:
        List[ParsedProblem]: 추출된 문제 리스트
    """
    problems = []

    # 1. ENDNOTE에서 정답 추출
    answers = self._extract_answers_from_endnotes(endnotes)

    # 2. AUTONUM으로 문제 본문 위치 파악
    problem_contents = self._find_problem_contents_by_autonum()

    # 3. 배점 정보 추출
    points_map = self._extract_points_map(paragraphs)

    # 4. 문제 객체 생성
    for i, answer_info in enumerate(answers):
        problem = ParsedProblem(
            number=str(i + 1),
            answer=answer_info['answer'],
            answer_type=answer_info['type']
        )

        # 문제 본문 매핑
        if i < len(problem_contents):
            problem.content_text = problem_contents[i]

        # 배점 매핑
        if i + 1 in points_map:
            problem.points = points_map[i + 1]

        problems.append(problem)

    return problems
```

### 1.4 새 메서드: `_extract_answers_from_endnotes()`

```python
def _extract_answers_from_endnotes(
    self,
    endnotes: List[ET.Element]
) -> List[Dict[str, str]]:
    """
    ENDNOTE 태그에서 정답 추출

    Returns:
        List[Dict]: [{'answer': '②', 'type': 'choice'}, ...]
    """
    answers = []

    for note in endnotes:
        note_text = ''.join(note.itertext()).strip()

        # [정답] 패턴 찾기
        ans_match = re.search(r'\[정답\]\s*(.+)', note_text)

        if ans_match:
            raw_answer = ans_match.group(1).strip()

            # HWP 수식 정리
            answer = clean_hwp_equation(raw_answer)

            # "수식입니다." 접두사 제거
            answer = re.sub(r'^수식입니다\.?\s*', '', answer)

            # 유형 판별
            answer_type = self._classify_answer_type(answer)

            answers.append({
                'answer': answer,
                'type': answer_type,
                'raw': raw_answer
            })
        else:
            # [정답] 패턴이 없으면 전체 텍스트를 정답으로
            answers.append({
                'answer': note_text,
                'type': 'unknown',
                'raw': note_text
            })

    return answers
```

### 1.5 새 메서드: `_classify_answer_type()`

```python
def _classify_answer_type(self, answer: str) -> str:
    """
    정답 유형 분류

    Returns:
        'choice': 객관식 (①~⑤)
        'value': 단답형 (숫자)
        'expression': 수식
        'text': 텍스트
    """
    # 객관식 (원문자)
    if re.match(r'^[①②③④⑤]$', answer):
        return 'choice'

    # 숫자 값
    if re.match(r'^-?\d+\.?\d*$', answer):
        return 'value'

    # 분수 형태
    if re.match(r'^\(?-?\d+\)?/\(?-?\d+\)?$', answer):
        return 'value'

    # 부등식/범위 (주관식)
    if '≤' in answer or '≥' in answer or 'LEQ' in answer or 'GEQ' in answer:
        return 'expression'

    # 방정식/함수
    if '=' in answer and ('x' in answer or 'y' in answer):
        return 'expression'

    # 기타 텍스트
    return 'text'
```

---

## Step 2: AUTONUM 위치 기반 문제 본문 매핑

### 2.1 목표
- AUTONUM(NumberType='Endnote')의 위치로 문제 본문 범위 파악
- 각 문제의 시작점과 끝점 결정

### 2.2 새 메서드: `_find_problem_contents_by_autonum()`

```python
def _find_problem_contents_by_autonum(self) -> List[str]:
    """
    AUTONUM 위치 기반 문제 본문 추출

    Returns:
        List[str]: 문제별 본문 텍스트
    """
    if self.root is None:
        return []

    # 1. AUTONUM(Endnote) 위치 수집
    autonum_positions = []
    all_p_elements = list(self.root.iter('P'))

    for p_idx, p_elem in enumerate(all_p_elements):
        for autonum in p_elem.iter('AUTONUM'):
            if autonum.get('NumberType') == 'Endnote':
                num = int(autonum.get('Number', 0))
                autonum_positions.append({
                    'number': num,
                    'p_index': p_idx,
                    'p_elem': p_elem
                })

    # 번호순 정렬
    autonum_positions.sort(key=lambda x: x['number'])

    # 2. 각 문제의 본문 범위 결정
    problem_contents = []

    for i, pos in enumerate(autonum_positions):
        # 현재 문제의 P 태그 인덱스
        start_idx = pos['p_index']

        # 다음 문제의 P 태그 인덱스 (또는 끝)
        if i + 1 < len(autonum_positions):
            end_idx = autonum_positions[i + 1]['p_index']
        else:
            end_idx = len(all_p_elements)

        # 해당 범위의 텍스트 추출
        content_parts = []
        for p_idx in range(start_idx, end_idx):
            p_text = self._get_paragraph_text(all_p_elements[p_idx])
            if p_text.strip():
                content_parts.append(p_text.strip())

        # [정답], [X.XX점] 등 메타 정보 제거
        content = ' '.join(content_parts)
        content = self._clean_problem_content(content)

        problem_contents.append(content)

    return problem_contents
```

### 2.3 새 메서드: `_clean_problem_content()`

```python
def _clean_problem_content(self, content: str) -> str:
    """
    문제 본문에서 메타 정보 제거

    제거 대상:
    - [정답] ②
    - [4.20점]
    - 중복된 정보
    """
    # [정답] 태그 제거
    content = re.sub(r'\[정답\]\s*[①②③④⑤\d\w/≤≥\s\.\-\+\=]+', '', content)

    # [X.XX점] 태그 제거
    content = re.sub(r'\[\d+\.?\d*점\]', '', content)

    # 문제 번호 앞의 메타 정보 제거 (수학영역, 제2교시 등)
    content = re.sub(r'^(수학영역|제\d+교시|선입니다)\s*', '', content)

    # 여러 공백 정리
    content = re.sub(r'\s+', ' ', content)

    return content.strip()
```

---

## Step 3: 문제 유형 자동 분류

### 3.1 목표
- 객관식 / 주관식 / 서술형 자동 분류
- ParsedProblem.answer_type 필드 활용

### 3.2 분류 기준

```python
# 이미 _classify_answer_type()에서 처리됨

# 추가 분류: 서술형 판별
def _is_descriptive_problem(self, content: str, points: float) -> bool:
    """서술형 문제 판별"""
    # 1. 배점 기준 (7점 이상)
    if points and points >= 7.0:
        return True

    # 2. 키워드 기준
    descriptive_keywords = [
        '풀이 과정', '과정과 답', '과정을 쓰',
        '이유를 설명', '증명하', '서술하'
    ]
    for keyword in descriptive_keywords:
        if keyword in content:
            return True

    return False
```

### 3.3 유형 체계

| answer_type | 설명 | 예시 |
|-------------|------|------|
| `choice` | 객관식 (5지선다) | ①, ②, ③, ④, ⑤ |
| `value` | 단답형 (숫자) | 60, -8, 15/2 |
| `expression` | 수식/범위 | -8≤x≤3, y=-3x+10 |
| `descriptive` | 서술형 | 풀이 과정 + 답 |

---

## Step 4: 배점 정보 매핑

### 4.1 목표
- [X.XX점] 패턴에서 배점 추출
- 문제 번호와 배점 매핑

### 4.2 새 메서드: `_extract_points_map()`

```python
def _extract_points_map(self, paragraphs: List[str]) -> Dict[int, float]:
    """
    배점 정보 추출 및 문제 번호 매핑

    Returns:
        Dict[int, float]: {문제번호: 배점}
    """
    points_map = {}
    full_text = '\n'.join(paragraphs)

    # [X.XX점] 패턴 모두 찾기
    points_matches = list(re.finditer(r'\[(\d+\.?\d*)점\]', full_text))

    # 문제 번호와 배점 매핑 (순서 기반)
    # ENDNOTE 수와 배점 수가 다를 수 있음
    # → 배점 태그 이전의 보기/정답 패턴으로 문제 번호 추론

    # 간단한 방법: 순서대로 매핑
    for i, match in enumerate(points_matches):
        problem_num = i + 1  # 1부터 시작
        points_value = float(match.group(1))
        points_map[problem_num] = points_value

    return points_map
```

### 4.3 배점 매핑 개선 (향후)

```python
# 더 정확한 매핑을 위해 배점 태그 주변 컨텍스트 분석
# 예: [정답] 바로 뒤에 오는 [X.XX점]을 해당 문제의 배점으로
def _extract_points_map_advanced(self, paragraphs: List[str]) -> Dict[int, float]:
    """
    [정답]과 [X.XX점]의 위치 관계로 정확한 매핑
    """
    # 추후 구현
    pass
```

---

## Step 5: 기존 로직과 통합 (폴백)

### 5.1 목표
- ENDNOTE가 없는 파일도 정상 동작
- 기존 ProblemExtractor 로직 유지

### 5.2 통합 전략

```python
def parse(self) -> ParseResult:
    # ... XML 파싱 ...

    # Phase 19-B: ENDNOTE 기반 추출 우선 시도
    endnotes = list(self.root.iter('ENDNOTE'))

    if len(endnotes) >= 3:
        # ENDNOTE 기반 추출
        result.problems = self._extract_by_endnote(endnotes, paragraphs)
        result.detected_metadata['extraction_method'] = 'endnote'
    else:
        # 기존 방식 (ProblemExtractor)
        result.problems = self.extractor.extract_problems(paragraphs)
        result.detected_metadata['extraction_method'] = 'text_pattern'

    # 검출 결과 검증
    if len(result.problems) == 0:
        result.warnings.append("문제를 검출하지 못했습니다.")
    elif len(result.problems) < 5:
        result.warnings.append(f"검출된 문제 수가 적습니다: {len(result.problems)}개")
```

### 5.3 폴백 조건

| 조건 | 사용 방식 |
|------|-----------|
| ENDNOTE >= 3개 | ENDNOTE 기반 |
| ENDNOTE < 3개 | 기존 텍스트 패턴 |
| ENDNOTE 파싱 실패 | 기존 텍스트 패턴 |

---

## Step 6: 테스트 및 검증

### 6.1 테스트 케이스

```python
# test_phase19b.py

def test_endnote_extraction():
    """ENDNOTE 기반 추출 테스트"""
    file_path = r'내신 2024년 인천 미추홀구 인화여고...Hml'
    parser = HMLParser(file_path)
    result = parser.parse()

    # 검증 1: 문제 수
    assert len(result.problems) == 21, f"Expected 21, got {len(result.problems)}"

    # 검증 2: 정답 정확성
    expected_answers = {
        1: '②', 2: '④', 3: '①', 4: '③', 5: '④',
        6: '③', 7: '⑤', 8: '①', 9: '③', 10: '④',
        11: '⑤', 12: '①', 13: '②', 14: '②', 15: '⑤',
        16: '①', 17: '⑤',
        18: '-8≤x≤3',  # 또는 '-8 ≤ x ≤ 3'
        19: 'y=-3x+10',  # 또는 여러 형태
        20: '60',
        21: '15/2'  # 또는 '(15)/(2)'
    }

    for num, expected in expected_answers.items():
        actual = result.problems[num - 1].answer
        # 공백/형식 차이 허용
        assert expected in actual or actual in expected, \
            f"문제 {num}: expected '{expected}', got '{actual}'"

    # 검증 3: 유형 분류
    for i in range(17):  # 1~17번
        assert result.problems[i].answer_type == 'choice', \
            f"문제 {i+1}: expected 'choice', got '{result.problems[i].answer_type}'"

    print("모든 테스트 통과!")
```

### 6.2 수동 검증 체크리스트

- [ ] 인화여고 파일: 21문제 검출
- [ ] 객관식 17개 정답 정확
- [ ] 주관식 4개 정답 정확
- [ ] 배점 정보 매핑 (있는 경우)
- [ ] ENDNOTE 없는 파일 정상 동작
- [ ] 기존 HWPX 파일 영향 없음

---

## 4. 파일 변경 요약

### 4.1 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `hml_parser.py` | parse() 수정, 5개 새 메서드 추가 |

### 4.2 새 메서드 목록

| 메서드 | 역할 |
|--------|------|
| `_extract_by_endnote()` | ENDNOTE 기반 문제 추출 (메인) |
| `_extract_answers_from_endnotes()` | ENDNOTE에서 정답 추출 |
| `_classify_answer_type()` | 정답 유형 분류 |
| `_find_problem_contents_by_autonum()` | 문제 본문 위치 파악 |
| `_clean_problem_content()` | 본문 정리 |
| `_extract_points_map()` | 배점 정보 추출 |

### 4.3 코드 변경 라인 수 (예상)

| 구분 | 라인 수 |
|------|---------|
| parse() 수정 | ~15줄 |
| 새 메서드들 | ~150줄 |
| **총 추가** | **~165줄** |

---

## 5. 구현 순서 (권장)

```
1. _extract_answers_from_endnotes() 구현 및 테스트
   → 21개 정답 추출 확인

2. _classify_answer_type() 구현
   → 객관식/주관식 분류 확인

3. parse() 수정 (ENDNOTE 분기 추가)
   → 기본 동작 확인

4. _find_problem_contents_by_autonum() 구현
   → 문제 본문 매핑 확인

5. _extract_points_map() 구현
   → 배점 정보 매핑 확인

6. 전체 통합 테스트
   → 21문제 전체 검출 확인
```

---

## 6. 리스크 및 대응

### 6.1 잠재적 리스크

| 리스크 | 대응 방안 |
|--------|-----------|
| ENDNOTE 없는 파일 | 폴백 로직으로 기존 방식 사용 |
| AUTONUM 순서 오류 | Number 속성으로 정렬 |
| HWP 수식 변환 오류 | clean_hwp_equation() 보완 |
| 배점 매핑 불일치 | 순서 기반 매핑 + 경고 로그 |

### 6.2 호환성 고려

- 기존 HWPX 파서에 영향 없음
- 기존 ProblemExtractor 유지
- API 응답 형식 변경 없음

---

## 7. 예상 결과

### 7.1 인화여고 파일 파싱 결과 (예상)

```json
{
  "file_name": "내신 2024년...Hml",
  "file_type": "hml",
  "problems": [
    {"number": "1", "answer": "②", "answer_type": "choice", "points": null},
    {"number": "2", "answer": "④", "answer_type": "choice", "points": 4.2},
    ...
    {"number": "18", "answer": "-8≤x≤3", "answer_type": "expression", "points": 4.0},
    {"number": "19", "answer": "y=-3x+10 또는 y=-3x-10", "answer_type": "expression", "points": null},
    {"number": "20", "answer": "60", "answer_type": "value", "points": null},
    {"number": "21", "answer": "15/2", "answer_type": "value", "points": 7.0}
  ],
  "detected_metadata": {
    "extraction_method": "endnote",
    "detected_grade": "고1",
    "detected_subject": "수학",
    "detected_semester": "1학기",
    "detected_exam_type": "기말고사"
  },
  "stats": {
    "total_problems": 21,
    "problems_with_answer": 21,
    "problems_with_explanation": 0
  }
}
```

### 7.2 개선 효과

| 지표 | Before | After |
|------|--------|-------|
| 검출율 | 76% (16/21) | 100% (21/21) |
| 정답 정확도 | 76% | 100% |
| 유형 분류 | 없음 | 객관식/주관식 구분 |

---

*작성: Claude Code (Opus)*
*날짜: 2025-11-28*
