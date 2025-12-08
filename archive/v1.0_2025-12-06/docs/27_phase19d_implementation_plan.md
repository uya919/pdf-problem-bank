# Phase 19-D: 문제 경계 추출 개선 - 상세 개발 계획

**작성일**: 2025-11-29
**목표**: 안정성을 유지하면서 문제 추출 품질 개선

---

## 1. 개발 원칙

### 1.1 안정성 우선

```
✅ 기존 기능 유지 (회귀 방지)
✅ 각 단계별 독립적 테스트
✅ 롤백 가능한 구조
✅ 점진적 개선 (Big Bang 금지)
```

### 1.2 변경 범위 최소화

```
단계 1-2: _clean_problem_content() 수정만
단계 3:   ParsedProblem에 필드 추가
단계 4:   새 메서드 추가 (기존 메서드 수정 최소화)
단계 5:   기존 로직 교체 (충분한 테스트 후)
```

---

## 2. 단계별 개발 계획

### 📋 단계 0: 준비 작업 (30분)

#### 0-1. 테스트 데이터 준비

```bash
# 테스트용 HML 파일 복사
cp ".claude/내신 2024년 인천...Hml" "backend/tests/fixtures/"
```

#### 0-2. 현재 상태 스냅샷

```python
# backend/tests/test_hml_parser_baseline.py
"""Phase 19-D 시작 전 기준 테스트"""

def test_baseline_problem_count():
    """현재 추출되는 문제 수 기록"""
    parser = HMLParser(TEST_FILE)
    result = parser.parse()

    # 현재 값 기록 (변경 전 기준)
    assert len(result.problems) == 21  # 예상값

def test_baseline_content_latex():
    """LaTeX 변환이 작동하는지 확인"""
    parser = HMLParser(TEST_FILE)
    result = parser.parse()

    # content_latex에 $ 기호 포함 확인
    assert '$' in result.problems[0].content_latex
```

#### 0-3. 기존 코드 백업

```python
# hml_parser.py 백업 (git으로 관리되지만 명시적 복사)
# _clean_problem_content() 원본 저장
```

---

### 📋 단계 1: 텍스트 정제 패턴 추가 (1시간)

**목표**: 헤더/메타 정보 제거 패턴 확장

#### 1-1. 제거할 패턴 정의

```python
# 추가할 정규식 패턴
HEADER_PATTERNS = [
    # 문서 헤더: "내신 2024년 인천 미추홀구 인화여고 고1 공통 1학기기말 수학상"
    r'내신\s*\d{4}년[^부방점직함]*?(?=부등식|방정식|점\s*[A-Z]|직선|함수|다항식)',

    # HWP 개체 대체 텍스트
    r'(선입니다|사각형입니다|원입니다|직선입니다|삼각형입니다)\.?',

    # 반복되는 "수학영역"
    r'(수학영역\s*){2,}',
    r'^수학영역\s*',

    # 교시 정보
    r'제?\d+교시',

    # 학년/시험 정보
    r'고\d\s*(공통)?\s*\d학기\s*(기말|중간)',
]
```

#### 1-2. `_clean_problem_content()` 수정

```python
def _clean_problem_content(self, content: str) -> str:
    """
    Phase 19-D: 문제 본문 정제 (확장)

    제거 대상:
    - [정답] ②
    - [4.20점]
    - 문서 헤더 (내신 2024년...)
    - HWP 개체 대체 텍스트
    - 반복 텍스트
    """
    # === 기존 패턴 (유지) ===
    # [정답] 태그 제거
    content = re.sub(r'\[정답\]\s*[①②③④⑤\d\w/≤≥\s\.\-\+\=]*', '', content)

    # [X.XX점] 태그 제거
    content = re.sub(r'\[\d+\.?\d*점\]', '', content)

    # === Phase 19-D: 새 패턴 추가 ===

    # 1. HWP 개체 대체 텍스트 제거
    content = re.sub(r'(선입니다|사각형입니다|원입니다|직선입니다|삼각형입니다)\.?', '', content)

    # 2. 반복 "수학영역" 제거
    content = re.sub(r'(수학영역\s*){2,}', '', content)
    content = re.sub(r'^수학영역\s*', '', content)

    # 3. 교시 정보 제거
    content = re.sub(r'제?\d+교시\s*', '', content)

    # 4. 문서 헤더 제거 (문제 키워드 전까지)
    # "내신 2024년 인천..." → "부등식"/"방정식" 앞까지 제거
    problem_keywords = r'(부등식|방정식|이차방정식|연립부등식|함수|점\s*[A-Z]|직선|삼각형|다항식|원|좌표평면|두\s*수|세\s*수|실수|정수|자연수)'
    header_pattern = rf'^.*?(?={problem_keywords})'
    content = re.sub(header_pattern, '', content, flags=re.DOTALL)

    # 5. 여러 공백 정리
    content = re.sub(r'\s+', ' ', content)

    return content.strip()[:500]
```

#### 1-3. 단계 1 테스트

```python
def test_step1_header_removal():
    """헤더 정보가 제거되는지 확인"""
    parser = HMLParser(TEST_FILE)
    result = parser.parse()

    problem1 = result.problems[0]

    # 헤더 미포함 확인
    assert '내신' not in problem1.content_text
    assert '인화여고' not in problem1.content_text
    assert '수학영역수학영역' not in problem1.content_text

    # 문제 본문 포함 확인
    assert '부등식' in problem1.content_text or 'x' in problem1.content_text
```

#### 1-4. 검증 포인트

```
□ 기존 21개 문제가 여전히 추출되는가?
□ content_latex에 LaTeX 마크업이 있는가?
□ 헤더 정보가 제거되었는가?
□ 문제 본문이 유지되는가?
```

---

### 📋 단계 2: 문제 본문 시작점 감지 (1시간)

**목표**: 문제 키워드 기반으로 본문 시작점 정확히 찾기

#### 2-1. 문제 키워드 패턴 정의

```python
# 문제 시작 키워드 (수학 문제 특화)
PROBLEM_START_KEYWORDS = [
    # 수식 관련
    r'부등식', r'방정식', r'이차방정식', r'연립부등식', r'연립방정식',
    r'함수', r'다항식', r'이차함수', r'삼차함수',

    # 도형 관련
    r'점\s*[A-Z]', r'직선', r'원', r'삼각형', r'사각형', r'평면',
    r'좌표평면', r'좌표',

    # 수 관련
    r'두\s*수', r'세\s*수', r'실수', r'정수', r'자연수', r'유리수',
    r'두\s*실수', r'세\s*실수',

    # 조건 관련
    r'다음\s*(조건|중|을|과)', r'아래\s*(조건|그림)',
]
```

#### 2-2. `_find_problem_start()` 새 메서드

```python
def _find_problem_start(self, text: str) -> int:
    """
    Phase 19-D: 문제 본문 시작 위치 찾기

    Args:
        text: 전체 텍스트

    Returns:
        문제 시작 인덱스 (없으면 0)
    """
    keywords = [
        r'부등식', r'방정식', r'함수', r'다항식',
        r'점\s*[A-Z]', r'직선', r'원', r'삼각형',
        r'두\s*수', r'세\s*수', r'실수', r'정수',
        r'다음', r'아래',
    ]

    pattern = '|'.join(keywords)
    match = re.search(pattern, text)

    if match:
        return match.start()
    return 0
```

#### 2-3. `_clean_problem_content()` 수정

```python
def _clean_problem_content(self, content: str) -> str:
    # ... 기존 코드 ...

    # Phase 19-D: 문제 시작점 찾기
    start_idx = self._find_problem_start(content)
    if start_idx > 0:
        content = content[start_idx:]

    return content.strip()[:500]
```

#### 2-4. 단계 2 테스트

```python
def test_step2_problem_start():
    """문제 시작점이 정확한지 확인"""
    parser = HMLParser(TEST_FILE)
    result = parser.parse()

    # 문제 1: "부등식"으로 시작해야 함
    assert result.problems[0].content_text.startswith('부등식')

    # 또는 문제 키워드로 시작
    first_word = result.problems[0].content_text.split()[0]
    assert first_word in ['부등식', '방정식', '점', '직선', '함수', '두', '세', '실수']
```

---

### 📋 단계 3: 문제 번호 추출 (1시간)

**목표**: 문제 번호를 별도 필드에 정확히 저장

#### 3-1. ParsedProblem 현재 상태 확인

```python
# parser_base.py - 이미 number 필드 있음
@dataclass
class ParsedProblem:
    number: str = ""  # 원본 문제 번호 (1, 2, 01-1 등)
```

#### 3-2. 문제 번호 추출 개선

```python
def _extract_problem_numbers(self) -> Dict[int, int]:
    """
    Phase 19-D: 문제 번호 P 태그 위치 매핑

    Returns:
        Dict[int, int]: {문제번호: P태그인덱스}
    """
    number_positions = {}
    all_p = list(self.root.iter('P'))

    for i, p in enumerate(all_p):
        text = ''.join(p.itertext()).strip()

        # 단독 숫자 패턴 (1~30)
        if re.match(r'^\d{1,2}$', text):
            num = int(text)
            if 1 <= num <= 30 and num not in number_positions:
                number_positions[num] = i

    return number_positions
```

#### 3-3. `_extract_by_endnote()` 수정

```python
def _extract_by_endnote(self, endnotes, paragraphs) -> List[ParsedProblem]:
    # ... 기존 코드 ...

    # Phase 19-D: 문제 번호 위치 추출
    number_positions = self._extract_problem_numbers()

    for i, answer_info in enumerate(answers):
        problem = ParsedProblem(
            number=str(i + 1),  # "1", "2", ...
            # ...
        )

        # 문제 본문 매핑
        if i < len(problem_contents):
            # ...

        # Phase 19-D: 문제 번호 형식 개선
        problem.number = f"{i + 1}."  # "1." 형식으로 저장
```

#### 3-4. 단계 3 테스트

```python
def test_step3_problem_number():
    """문제 번호가 정확한지 확인"""
    parser = HMLParser(TEST_FILE)
    result = parser.parse()

    assert result.problems[0].number == "1." or result.problems[0].number == "1"
    assert result.problems[1].number == "2." or result.problems[1].number == "2"
```

---

### 📋 단계 4: 선택지 추출 (1.5시간)

**목표**: ①②③④⑤ 선택지를 별도로 추출

#### 4-1. ParsedProblem 필드 추가

```python
# parser_base.py
@dataclass
class ParsedProblem:
    # ... 기존 필드 ...

    # Phase 19-D: 선택지 필드 추가
    choices: List[str] = field(default_factory=list)  # ["1", "2", "3", "4", "5"]
    choices_latex: List[str] = field(default_factory=list)  # LaTeX 버전
```

#### 4-2. 선택지 추출 메서드

```python
def _extract_choices(self, start_p_idx: int, end_p_idx: int) -> List[str]:
    """
    Phase 19-D: 선택지 추출

    Args:
        start_p_idx: 문제 시작 P 인덱스
        end_p_idx: 문제 끝 P 인덱스

    Returns:
        선택지 리스트 ["1", "2", "3", "4", "5"]
    """
    all_p = list(self.root.iter('P'))
    choices = []

    # ①②③④⑤ 패턴
    choice_pattern = re.compile(r'([①②③④⑤])\s*(.+?)(?=[①②③④⑤]|$)')

    for i in range(start_p_idx, min(end_p_idx, len(all_p))):
        text = ''.join(all_p[i].itertext())

        if '①' in text:
            matches = choice_pattern.findall(text)
            for marker, content in matches:
                # "rm 1" → "1" 정리
                clean_content = re.sub(r'\brm\s+', '', content).strip()
                choices.append(clean_content)

    return choices[:5]  # 최대 5개
```

#### 4-3. to_dict() 업데이트

```python
# parser_base.py
def to_dict(self) -> Dict[str, Any]:
    return {
        # ... 기존 필드 ...
        "choices": self.choices,
        "choices_latex": self.choices_latex,
    }
```

#### 4-4. 프론트엔드 타입 업데이트

```typescript
// frontend/src/api/hangul.ts
export interface ParsedProblem {
  // ... 기존 필드 ...
  choices?: string[];        // Phase 19-D
  choices_latex?: string[];  // Phase 19-D
}
```

#### 4-5. 단계 4 테스트

```python
def test_step4_choices():
    """선택지가 추출되는지 확인"""
    parser = HMLParser(TEST_FILE)
    result = parser.parse()

    # 문제 1은 객관식 (5지선다)
    if result.problems[0].answer_type == 'choice':
        assert len(result.problems[0].choices) == 5
        assert '1' in result.problems[0].choices or '2' in result.problems[0].choices
```

---

### 📋 단계 5: 문제 경계 로직 개선 (2시간)

**목표**: AUTONUM 기반에서 문제 번호 기반으로 전환

#### 5-1. 새로운 추출 메서드 (기존 메서드 유지)

```python
def _find_problem_contents_by_number(self) -> List[Dict]:
    """
    Phase 19-D: 문제 번호 P 태그 기반 본문 추출

    기존 _find_problem_contents_by_autonum()과 병행 사용
    """
    if self.root is None:
        return []

    all_p = list(self.root.iter('P'))
    number_positions = self._extract_problem_numbers()

    # 문제 번호 순 정렬
    sorted_numbers = sorted(number_positions.keys())

    problem_contents = []

    for i, num in enumerate(sorted_numbers):
        start_idx = number_positions[num]

        # 다음 문제 번호 또는 끝
        if i + 1 < len(sorted_numbers):
            next_num = sorted_numbers[i + 1]
            end_idx = number_positions[next_num]
        else:
            end_idx = len(all_p)

        # 본문 추출 (문제 번호 P 제외, 선택지 포함)
        plain_parts = []
        latex_parts = []
        choices = []

        for p_idx in range(start_idx + 1, min(end_idx, start_idx + 15)):
            p = all_p[p_idx]
            text = ''.join(p.itertext())

            # 선택지 P 태그 확인
            if '①' in text:
                choices = self._extract_choices_from_text(text)
                continue  # 선택지는 별도 저장

            # [정답] P 태그 스킵
            if '[정답]' in text:
                continue

            # 본문 추출
            plain_text, latex_text, _, _ = self._get_paragraph_text_with_latex(p)
            if plain_text.strip():
                plain_parts.append(plain_text.strip())
                latex_parts.append(latex_text.strip())

        # 정제
        plain_content = ' '.join(plain_parts)
        plain_content = self._clean_problem_content(plain_content)

        latex_content = ' '.join(latex_parts)
        latex_content = self._clean_problem_content(latex_content)

        problem_contents.append({
            'number': str(num),
            'text': plain_content,
            'latex': latex_content,
            'choices': choices,
        })

    return problem_contents
```

#### 5-2. 점진적 전환 (Feature Flag)

```python
def _extract_by_endnote(self, endnotes, paragraphs) -> List[ParsedProblem]:
    """ENDNOTE 기반 문제 추출"""

    # Phase 19-D: 새 로직 사용 여부 (점진적 전환)
    USE_NUMBER_BASED_EXTRACTION = True

    if USE_NUMBER_BASED_EXTRACTION:
        # 새 로직: 문제 번호 기반
        problem_contents = self._find_problem_contents_by_number()
    else:
        # 기존 로직: AUTONUM 기반
        problem_contents = self._find_problem_contents_by_autonum()

    # ... 나머지 로직 ...
```

#### 5-3. 단계 5 테스트

```python
def test_step5_number_based_extraction():
    """문제 번호 기반 추출이 정확한지 확인"""
    parser = HMLParser(TEST_FILE)
    result = parser.parse()

    problem1 = result.problems[0]

    # 헤더 없음
    assert '내신' not in problem1.content_text

    # 문제 번호 있음
    assert problem1.number in ['1', '1.']

    # 본문 있음
    assert len(problem1.content_text) > 10

    # 선택지 있음 (객관식인 경우)
    if problem1.answer_type == 'choice':
        assert len(problem1.choices) >= 4
```

---

## 3. 테스트 전략

### 3.1 단계별 테스트 파일

```
backend/tests/
├── test_hml_parser_baseline.py    # 기준 테스트
├── test_phase19d_step1.py         # 단계 1: 텍스트 정제
├── test_phase19d_step2.py         # 단계 2: 시작점 감지
├── test_phase19d_step3.py         # 단계 3: 문제 번호
├── test_phase19d_step4.py         # 단계 4: 선택지
├── test_phase19d_step5.py         # 단계 5: 경계 로직
└── fixtures/
    └── test_hml_file.hml          # 테스트 파일
```

### 3.2 회귀 테스트 체크리스트

```
□ 문제 개수: 21개 유지
□ 정답 추출: 모든 문제에 정답 있음
□ LaTeX 변환: $...$ 패턴 포함
□ 정답 유형: choice/value/expression 정확
□ API 응답: content_latex 필드 있음
```

### 3.3 수동 테스트

```
□ 브라우저에서 HML 업로드
□ 미리보기에서 문제 1번 확인
□ 헤더 정보 없음 확인
□ 수식 렌더링 확인
□ 문제은행 저장 후 조회
```

---

## 4. 롤백 계획

### 4.1 각 단계별 롤백

```python
# 단계 1-2 롤백: _clean_problem_content() 원복
# 단계 3 롤백: number 필드 처리만 원복
# 단계 4 롤백: choices 필드 무시 (프론트에서 Optional)
# 단계 5 롤백: USE_NUMBER_BASED_EXTRACTION = False
```

### 4.2 전체 롤백

```bash
# Git으로 Phase 19-D 이전 커밋으로 복원
git checkout HEAD~N -- backend/app/services/hangul/
```

---

## 5. 일정 추정

| 단계 | 작업 | 예상 시간 |
|------|------|----------|
| 0 | 준비 작업 | 30분 |
| 1 | 텍스트 정제 패턴 | 1시간 |
| 2 | 시작점 감지 | 1시간 |
| 3 | 문제 번호 추출 | 1시간 |
| 4 | 선택지 추출 | 1.5시간 |
| 5 | 경계 로직 개선 | 2시간 |
| - | 테스트 및 검증 | 1시간 |
| **합계** | | **8시간** |

---

## 6. 위험 요소 및 대응

### 6.1 위험 요소

| 위험 | 영향 | 대응 |
|------|------|------|
| 정규식 성능 저하 | 파싱 속도 감소 | 패턴 최적화, 캐싱 |
| 다른 HML 형식 | 호환성 문제 | 다중 파일 테스트 |
| 선택지 없는 문제 | 빈 배열 | Optional 처리 |
| 문제 번호 중복 | 매핑 오류 | 첫 번째만 사용 |

### 6.2 대응 전략

```python
# 방어적 코딩
def _extract_choices(self, ...):
    try:
        # 추출 로직
    except Exception as e:
        logger.warning(f"선택지 추출 실패: {e}")
        return []  # 빈 배열 반환 (기능 유지)
```

---

## 7. 승인 요청

### 7.1 승인 항목

```
□ 전체 개발 계획 승인
□ 단계별 진행 승인
□ 시작 승인
```

### 7.2 시작 조건

- 사용자 "진행해줘" 명령 시 단계 0부터 순차 진행
- 각 단계 완료 시 테스트 결과 보고
- 문제 발생 시 해당 단계 롤백 후 대안 제시

---

*Phase 19-D 상세 개발 계획서 - 안정성 우선 점진적 개선*
