# 문제-해설 분리 및 자동 매칭 시스템 연구 리포트

**날짜**: 2025-11-28
**요청**: 문제와 해설을 분리 저장하고, 템플릿에서 문제 선택 시 해설이 자동으로 마지막에 붙는 시스템
**분석 파일**:
- `내신 2024년 인천 미추홀구 인화여고 고1 공통 1학기기말 수학상.Hml`
- `[21차][고2][라이트SSEN 수학1]01-지수-125제.hwpx`
- `동산고등학교_1학년_2024_2학기기말_수학(하)_공통_문제_정답.hwp`

---

## 1. 실제 파일 구조 분석

### 1.1 HML 파일 구조 (인화여고)

```
추출된 텍스트 패턴:
┌─────────────────────────────────────────────────────────┐
│ "부등식 의 해가 일 때, 실수 의 값은?"                    │  ← 문제
│ " [정답] ②"                                             │  ← 정답
│ "[4.20점]"                                              │  ← 배점
├─────────────────────────────────────────────────────────┤
│ "두 점 에 대하여 선분 의 중점을 지나고..."               │  ← 문제
│ " [정답] ④"                                             │  ← 정답
│ "[4.30점]"                                              │  ← 배점
└─────────────────────────────────────────────────────────┘

마지막 섹션:
"내신 2024년 인천 미추홀구 인화여고 고1공통 1학기기말 수학상(빠른 정답)"
```

**특징**:
- 문제 바로 뒤에 `[정답]` 태그
- 객관식: `[정답] ①~⑤`
- 주관식: `[정답]` 뒤에 수식/숫자
- 배점 정보: `[4.20점]`, `[5.00점]` 등
- 마지막에 "빠른 정답" 요약 섹션

### 1.2 HWPX 파일 구조 (라이트SSEN 125제)

```
추출된 텍스트 패턴:
┌─────────────────────────────────────────────────────────┐
│ "01-1 거듭제곱"                                         │  ← 단원
│ "[~] 다음 식을 간단히 하시오."                          │  ← 문제 그룹
│ " 정답 "  (수식)                                        │  ← 문제1 정답
│ " 정답 "  (수식)                                        │  ← 문제2 정답
├─────────────────────────────────────────────────────────┤
│ "01-2 거듭제곱근의 뜻과 성질"                           │  ← 다음 단원
│ "[~] 다음 중 옳은 것에는 ○를..."                        │  ← 문제 그룹
│ " 정답 ○"                                              │  ← 정답
│ "의 제곱근은 의 근이므로"                               │  ← 풀이
│ "따라서 실수인 는 이다."                                │  ← 풀이 계속
└─────────────────────────────────────────────────────────┘

통계:
- 총 985개 텍스트 세그먼트
- "정답" 125회 (125제 문제집과 일치!)
```

**특징**:
- 단원별 구분: `01-1`, `01-2`, ...
- 문제 그룹: `[1~5]`, `[6~10]` 형태
- 정답과 풀이가 같은 섹션에 포함
- 풀이 과정이 상세히 기술됨

### 1.3 HWP 파일 구조 (동산고)

```
OLE 스트림 구조:
├── PrvText           ← 미리보기 텍스트 (전체 요약)
├── BodyText/Section0 ← 본문 (zlib 압축)
├── BinData/BIN0001   ← 이미지
├── DocInfo           ← 문서 정보
└── FileHeader        ← 파일 헤더
```

**특징**:
- 바이너리 형식으로 직접 파싱 필요
- zlib 압축 해제 필요
- 텍스트와 이미지 분리 저장

---

## 2. 문제-해설 패턴 분류

### 2.1 발견된 패턴 유형

| 유형 | 패턴 | 예시 |
|------|------|------|
| **패턴 A** | 문제 직후 정답 | `문제... [정답] ②` |
| **패턴 B** | 문제 + 풀이 + 정답 | `문제... 풀이... 정답: ` |
| **패턴 C** | 문제 섹션 / 정답 섹션 분리 | 앞: 문제들, 뒤: 정답표 |
| **패턴 D** | 문제번호-정답 쌍 | `1번 ② 2번 ④ ...` |

### 2.2 정답/해설 마커 패턴

```python
ANSWER_MARKERS = [
    # 정답 마커
    r'\[정답\]\s*[①②③④⑤]',      # [정답] ②
    r'\[정답\]\s*\d+',             # [정답] 15
    r'정답\s*[:：]\s*',            # 정답:
    r'답\s*[:：]\s*',              # 답:

    # 해설 마커
    r'\[해설\]',                   # [해설]
    r'\[풀이\]',                   # [풀이]
    r'해설\s*[:：]',               # 해설:
    r'풀이\s*[:：]',               # 풀이:

    # 섹션 구분 마커
    r'정답\s*(및|과|&)\s*해설',    # 정답 및 해설
    r'빠른\s*정답',                # 빠른 정답
    r'정답표',                     # 정답표
]
```

### 2.3 문제 번호 패턴

```python
PROBLEM_NUMBER_PATTERNS = [
    r'^(\d+)\.\s',                 # 1. 2. 3.
    r'^(\d+)\)\s',                 # 1) 2) 3)
    r'^\[(\d+)\]\s',               # [1] [2] [3]
    r'^(\d+)번\s',                 # 1번 2번
    r'^문제\s*(\d+)',              # 문제 1
    r'^\((\d+)\)\s',               # (1) (2) (3)
    r'^(\d+)-(\d+)',               # 01-1, 01-2 (하위 문제)
]
```

---

## 3. 데이터 모델 설계

### 3.1 핵심 엔티티

```typescript
// 문제 (Problem)
interface Problem {
  id: string;
  document_id: string;        // 원본 문서 ID
  number: string;             // 문제 번호 (1, 2, 01-1 등)
  display_number?: string;    // 표시 번호 (재정렬 시)

  // 문제 내용
  content: {
    text: string;             // 텍스트 내용
    equations: Equation[];    // 수식들
    images: Image[];          // 이미지들
    tables: Table[];          // 표
  };

  // 메타데이터
  metadata: {
    subject: string;          // 과목 (수학)
    grade: string;            // 학년 (고1, 중2)
    chapter: string;          // 단원 (지수, 부등식)
    difficulty: number;       // 난이도 (1-5)
    points?: number;          // 배점 (4.20점)
    type: 'multiple' | 'short' | 'essay';  // 문제 유형
    tags: string[];           // 태그
  };

  // 관계
  answer_id: string;          // 연결된 정답 ID
  explanation_id?: string;    // 연결된 해설 ID (선택적)
}

// 정답 (Answer)
interface Answer {
  id: string;
  problem_id: string;         // 연결된 문제 ID
  type: 'choice' | 'value' | 'expression';

  // 정답 내용
  content: {
    choice?: number;          // 객관식: 1~5
    value?: string;           // 값: "15", "x=3"
    expression?: string;      // 수식: LaTeX 형태
  };

  created_at: string;
}

// 해설 (Explanation)
interface Explanation {
  id: string;
  problem_id: string;         // 연결된 문제 ID

  // 해설 내용
  content: {
    text: string;             // 텍스트 설명
    steps: ExplanationStep[]; // 단계별 풀이
    equations: Equation[];    // 수식들
    images: Image[];          // 그림/도표
  };

  created_at: string;
}

// 해설 단계
interface ExplanationStep {
  order: number;
  description: string;
  equation?: string;
}
```

### 3.2 문제-정답-해설 관계

```
┌─────────────────────────────────────────────────────────────────┐
│                        Problem (문제)                           │
│  id: "prob_001"                                                 │
│  number: "1"                                                    │
│  content: { text: "부등식의 해가...", equations: [...] }       │
│  answer_id: "ans_001"                                           │
│  explanation_id: "exp_001"                                      │
└─────────────────────────────────────────────────────────────────┘
          │                                    │
          │ 1:1                               │ 1:1 (optional)
          ▼                                    ▼
┌─────────────────────┐          ┌───────────────────────────────┐
│   Answer (정답)      │          │    Explanation (해설)          │
│  id: "ans_001"       │          │  id: "exp_001"                 │
│  problem_id: "prob_001"│        │  problem_id: "prob_001"        │
│  content: {          │          │  content: {                    │
│    choice: 2  (②)   │          │    steps: [                    │
│  }                   │          │      "주어진 조건에서...",      │
│                      │          │      "따라서 x = ..."          │
└─────────────────────┘          │    ]                           │
                                  │  }                              │
                                  └───────────────────────────────┘
```

---

## 4. 분리 알고리즘

### 4.1 HML/HWPX 파서

```python
import re
from dataclasses import dataclass
from typing import List, Optional, Tuple

@dataclass
class ParsedProblem:
    number: str
    content: str
    answer: Optional[str]
    explanation: Optional[str]
    points: Optional[float]

class HMLParser:
    """HML/HWPX 파일에서 문제-정답-해설 분리"""

    # 정답 패턴
    ANSWER_PATTERN = re.compile(
        r'\[정답\]\s*([①②③④⑤]|\d+|.+?)(?=\[|\n|$)'
    )

    # 배점 패턴
    POINTS_PATTERN = re.compile(r'\[(\d+\.?\d*)점\]')

    # 문제 번호 패턴
    PROBLEM_PATTERN = re.compile(r'^(\d+)\.')

    def parse_document(self, content: str) -> List[ParsedProblem]:
        """
        문서 전체를 파싱하여 문제 목록 반환
        """
        problems = []

        # 1단계: 문제 단위로 분할
        segments = self._split_by_problems(content)

        for segment in segments:
            problem = self._parse_segment(segment)
            if problem:
                problems.append(problem)

        return problems

    def _split_by_problems(self, content: str) -> List[str]:
        """문제 번호 기준으로 분할"""
        # 문제 시작점 찾기
        pattern = re.compile(r'(?=\n\d+\.\s)')
        segments = pattern.split(content)
        return [s.strip() for s in segments if s.strip()]

    def _parse_segment(self, segment: str) -> Optional[ParsedProblem]:
        """개별 세그먼트에서 문제/정답/해설 추출"""

        # 문제 번호 추출
        num_match = self.PROBLEM_PATTERN.search(segment)
        if not num_match:
            return None
        number = num_match.group(1)

        # 정답 추출
        answer_match = self.ANSWER_PATTERN.search(segment)
        answer = answer_match.group(1).strip() if answer_match else None

        # 배점 추출
        points_match = self.POINTS_PATTERN.search(segment)
        points = float(points_match.group(1)) if points_match else None

        # 문제 내용 추출 (정답 이전까지)
        if answer_match:
            content = segment[:answer_match.start()].strip()
        else:
            content = segment.strip()

        # 해설 추출 (정답 이후)
        explanation = None
        if answer_match:
            after_answer = segment[answer_match.end():].strip()
            # 다음 문제 시작 전까지가 해설
            if after_answer and not self.PROBLEM_PATTERN.match(after_answer):
                explanation = after_answer

        return ParsedProblem(
            number=number,
            content=content,
            answer=answer,
            explanation=explanation,
            points=points
        )
```

### 4.2 분리 전략 (상황별)

```python
class SeparationStrategy:
    """문서 유형에 따른 분리 전략"""

    @staticmethod
    def detect_pattern(content: str) -> str:
        """
        문서의 문제-정답 패턴 자동 감지

        Returns:
            'inline': 문제 직후 정답
            'section': 섹션 분리 (문제들 / 정답들)
            'mixed': 풀이 포함 혼합
        """
        # 패턴 A: 인라인 정답 (문제 바로 뒤)
        inline_count = len(re.findall(r'\[정답\]', content))

        # 패턴 C: 섹션 분리
        has_answer_section = bool(re.search(
            r'(정답\s*(및|과)?\s*해설|빠른\s*정답|정답표)',
            content
        ))

        # 패턴 B: 풀이 포함
        has_explanation = bool(re.search(
            r'(따라서|그러므로|풀이|∴)',
            content
        ))

        if has_answer_section:
            return 'section'
        elif has_explanation and inline_count > 0:
            return 'mixed'
        elif inline_count > 0:
            return 'inline'
        else:
            return 'unknown'

    @staticmethod
    def separate_by_pattern(content: str, pattern: str) -> dict:
        """패턴에 따른 분리 실행"""

        if pattern == 'inline':
            return SeparationStrategy._separate_inline(content)
        elif pattern == 'section':
            return SeparationStrategy._separate_section(content)
        elif pattern == 'mixed':
            return SeparationStrategy._separate_mixed(content)
        else:
            # 기본: 인라인으로 시도
            return SeparationStrategy._separate_inline(content)

    @staticmethod
    def _separate_section(content: str) -> dict:
        """섹션 분리 방식: 문제부/정답부 분리"""

        # '정답 및 해설' 또는 '빠른 정답' 위치 찾기
        section_markers = [
            r'정답\s*(및|과)?\s*해설',
            r'빠른\s*정답',
            r'정답표',
            r'─+\s*정답\s*─+',
        ]

        split_pos = None
        for marker in section_markers:
            match = re.search(marker, content)
            if match:
                split_pos = match.start()
                break

        if split_pos:
            problem_section = content[:split_pos]
            answer_section = content[split_pos:]
            return {
                'problems': problem_section,
                'answers': answer_section
            }

        return {'problems': content, 'answers': ''}
```

---

## 5. 시험지 생성 시스템

### 5.1 템플릿 시스템과 연동

```
사용자 워크플로우:
┌─────────────────────────────────────────────────────────────────┐
│  1. 문제 선택                                                   │
│     - 필터링 (과목, 단원, 난이도)                               │
│     - 문제 미리보기                                             │
│     - 선택: 문제 3, 7, 12, 15, 21                              │
│                                                                 │
│  2. 템플릿 선택                                                 │
│     - 4문제/페이지                                              │
│     - 해설 포함 여부: [✓]                                       │
│     - 해설 위치: [마지막 페이지]                                │
│                                                                 │
│  3. 자동 생성                                                   │
│     ┌─────────────────────┐                                    │
│     │ 시험지 1페이지       │                                    │
│     │ 1. 문제 3           │                                    │
│     │ 2. 문제 7           │                                    │
│     │ 3. 문제 12          │                                    │
│     │ 4. 문제 15          │                                    │
│     └─────────────────────┘                                    │
│     ┌─────────────────────┐                                    │
│     │ 시험지 2페이지       │                                    │
│     │ 5. 문제 21          │                                    │
│     └─────────────────────┘                                    │
│     ┌─────────────────────┐                                    │
│     │ 정답 및 해설         │  ← 자동 생성                      │
│     │ 1. ② / 해설...      │                                    │
│     │ 2. ④ / 해설...      │                                    │
│     │ 3. 15 / 해설...     │                                    │
│     │ 4. ① / 해설...      │                                    │
│     │ 5. ③ / 해설...      │                                    │
│     └─────────────────────┘                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 자동 해설 매칭 알고리즘

```typescript
interface WorksheetConfig {
  problems: string[];           // 선택된 문제 ID들
  template: TemplateConfig;     // 템플릿 설정
  includeAnswers: boolean;      // 정답 포함
  includeExplanations: boolean; // 해설 포함
  answerPosition: 'inline' | 'end' | 'separate';  // 정답 위치
}

interface GeneratedWorksheet {
  problemPages: Page[];         // 문제 페이지들
  answerPages: Page[];          // 정답/해설 페이지들
}

function generateWorksheet(config: WorksheetConfig): GeneratedWorksheet {
  const { problems, template, includeAnswers, includeExplanations, answerPosition } = config;

  // 1. 선택된 문제들의 정답/해설 자동 조회
  const problemsWithAnswers = problems.map((problemId, index) => {
    const problem = getProblem(problemId);
    const answer = getAnswer(problem.answer_id);
    const explanation = includeExplanations
      ? getExplanation(problem.explanation_id)
      : null;

    return {
      newNumber: index + 1,       // 새 문제 번호
      originalNumber: problem.number,
      problem,
      answer,
      explanation
    };
  });

  // 2. 문제 페이지 생성
  const problemPages = generateProblemPages(
    problemsWithAnswers,
    template,
    answerPosition === 'inline'  // 인라인이면 정답도 함께
  );

  // 3. 정답/해설 페이지 생성 (end 또는 separate인 경우)
  let answerPages: Page[] = [];

  if (includeAnswers && answerPosition !== 'inline') {
    answerPages = generateAnswerPages(
      problemsWithAnswers,
      template,
      includeExplanations
    );
  }

  return { problemPages, answerPages };
}

function generateAnswerPages(
  items: ProblemWithAnswer[],
  template: TemplateConfig,
  includeExplanations: boolean
): Page[] {
  const pages: Page[] = [];
  let currentPage = createNewAnswerPage(template);

  items.forEach((item, index) => {
    const answerBlock = createAnswerBlock(item, includeExplanations);

    if (!canFitInPage(currentPage, answerBlock)) {
      pages.push(currentPage);
      currentPage = createNewAnswerPage(template);
    }

    addBlockToPage(currentPage, answerBlock);
  });

  if (currentPage.blocks.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}

function createAnswerBlock(
  item: ProblemWithAnswer,
  includeExplanation: boolean
): AnswerBlock {
  return {
    problemNumber: item.newNumber,
    answer: formatAnswer(item.answer),
    explanation: includeExplanation ? item.explanation?.content : null
  };
}

function formatAnswer(answer: Answer): string {
  switch (answer.type) {
    case 'choice':
      return ['①', '②', '③', '④', '⑤'][answer.content.choice - 1];
    case 'value':
      return answer.content.value;
    case 'expression':
      return answer.content.expression;
  }
}
```

### 5.3 정답/해설 레이아웃 옵션

```
옵션 1: 빠른 정답 (표 형식)
┌───────────────────────────────────────┐
│          빠른 정답                     │
├─────┬─────┬─────┬─────┬─────┬─────────┤
│  1  │  2  │  3  │  4  │  5  │         │
├─────┼─────┼─────┼─────┼─────┤         │
│  ②  │  ④  │ 15  │  ①  │  ③  │         │
└─────┴─────┴─────┴─────┴─────┴─────────┘

옵션 2: 정답 + 간단 해설
┌───────────────────────────────────────┐
│  1. ②                                 │
│     a² + b² = (a+b)² - 2ab 이용       │
├───────────────────────────────────────┤
│  2. ④                                 │
│     연립방정식을 풀면 x=3, y=2         │
├───────────────────────────────────────┤
│  3. 15                                │
│     조건에서 f(x) = x² + 2x - 3       │
└───────────────────────────────────────┘

옵션 3: 상세 풀이
┌───────────────────────────────────────┐
│  1. [정답] ②                          │
│                                        │
│  [풀이]                                │
│  주어진 조건에서                       │
│  a + b = 5, ab = 6                    │
│                                        │
│  따라서                                │
│  a² + b² = (a+b)² - 2ab               │
│         = 25 - 12 = 13                │
└───────────────────────────────────────┘
```

---

## 6. 데이터베이스 스키마

### 6.1 테이블 구조

```sql
-- 문제 테이블
CREATE TABLE problems (
    id VARCHAR(36) PRIMARY KEY,
    document_id VARCHAR(36) NOT NULL,
    number VARCHAR(20) NOT NULL,

    -- 내용 (JSON)
    content_text TEXT,
    content_equations JSON,
    content_images JSON,

    -- 메타데이터
    subject VARCHAR(50),
    grade VARCHAR(20),
    chapter VARCHAR(100),
    difficulty INT,
    points DECIMAL(4,2),
    problem_type VARCHAR(20),
    tags JSON,

    -- 관계
    answer_id VARCHAR(36),
    explanation_id VARCHAR(36),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_document (document_id),
    INDEX idx_subject_chapter (subject, chapter),
    INDEX idx_difficulty (difficulty)
);

-- 정답 테이블
CREATE TABLE answers (
    id VARCHAR(36) PRIMARY KEY,
    problem_id VARCHAR(36) NOT NULL,
    answer_type VARCHAR(20) NOT NULL,

    -- 정답 내용
    choice_number INT,
    value_text VARCHAR(500),
    expression_latex VARCHAR(1000),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
);

-- 해설 테이블
CREATE TABLE explanations (
    id VARCHAR(36) PRIMARY KEY,
    problem_id VARCHAR(36) NOT NULL,

    -- 해설 내용
    content_text TEXT,
    steps JSON,
    equations JSON,
    images JSON,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
);

-- 시험지 테이블
CREATE TABLE worksheets (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(200),
    template_id VARCHAR(36),

    -- 설정
    include_answers BOOLEAN DEFAULT TRUE,
    include_explanations BOOLEAN DEFAULT FALSE,
    answer_position VARCHAR(20) DEFAULT 'end',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 시험지-문제 관계 테이블
CREATE TABLE worksheet_problems (
    worksheet_id VARCHAR(36) NOT NULL,
    problem_id VARCHAR(36) NOT NULL,
    display_number INT NOT NULL,

    PRIMARY KEY (worksheet_id, problem_id),
    FOREIGN KEY (worksheet_id) REFERENCES worksheets(id) ON DELETE CASCADE,
    FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
);
```

### 6.2 API 엔드포인트

```
# 문제 관리
GET    /api/problems                    # 문제 목록 (필터링)
GET    /api/problems/{id}               # 문제 상세
GET    /api/problems/{id}/answer        # 문제의 정답
GET    /api/problems/{id}/explanation   # 문제의 해설

# 문서 파싱
POST   /api/documents/parse             # HML/HWPX/HWP 파싱
       Body: { file: File }
       Response: { problems: [], answers: [], explanations: [] }

# 시험지 생성
POST   /api/worksheets                  # 시험지 생성
       Body: {
         title: string,
         problem_ids: string[],
         template_id: string,
         include_answers: boolean,
         include_explanations: boolean,
         answer_position: 'inline' | 'end' | 'separate'
       }

GET    /api/worksheets/{id}/pdf         # PDF 다운로드
       Query: { type: 'all' | 'problems' | 'answers' }
```

---

## 7. 구현 계획

### Phase A: 파서 구현 (핵심)

```
A-1. HML 파서
     - XML 파싱
     - 문제/정답/해설 패턴 인식
     - 수식/이미지 추출

A-2. HWPX 파서
     - ZIP 압축 해제
     - section.xml 파싱
     - BinData 이미지 추출

A-3. 문제-정답 매칭
     - 패턴 자동 감지
     - 번호 기반 매칭
     - 검증 로직
```

### Phase B: 데이터 모델

```
B-1. DB 스키마 구현
B-2. Problem/Answer/Explanation API
B-3. 관계 관리 로직
```

### Phase C: 시험지 생성

```
C-1. 문제 선택 UI
C-2. 정답/해설 옵션 설정
C-3. 자동 번호 재정렬
C-4. PDF 생성 (정답 페이지 포함)
```

### Phase D: 고급 기능

```
D-1. 정답 표시 형식 커스터마이징
D-2. 해설 상세도 조절
D-3. 정답지 별도 PDF
D-4. 채점표 자동 생성
```

---

## 8. 결론

### 핵심 발견

1. **실제 파일에서 문제-정답 분리 가능**
   - HML: `[정답]` 태그로 명확히 구분
   - HWPX: `정답` 텍스트로 인식 가능
   - 125제 파일에서 125개 정답 정확히 감지

2. **다양한 패턴 존재**
   - 인라인 (문제 직후 정답)
   - 섹션 분리 (문제부/정답부)
   - 혼합 (풀이 포함)

3. **자동 매칭 구현 가능**
   - 문제 번호 ↔ 정답 번호 매칭
   - 1:1 관계로 저장
   - 시험지 생성 시 자동 조회

### 권장 구현 순서

| 순서 | 작업 | 효과 |
|------|------|------|
| 1 | HML/HWPX 파서 | 문제-정답 분리 |
| 2 | DB 스키마 | 관계 저장 |
| 3 | 문제 선택 UI | 사용자 인터페이스 |
| 4 | 자동 정답 생성 | 템플릿과 연동 |
| 5 | PDF 출력 | 최종 결과물 |

### 예상 결과

```
입력: 문제 5개 선택 (3, 7, 12, 15, 21번)
       ↓
출력 PDF:
  - 1~2페이지: 문제 (새 번호 1~5)
  - 3페이지: 정답 및 해설 (자동 생성)
     1. ②  (원래 3번 정답)
     2. ④  (원래 7번 정답)
     3. 15 (원래 12번 정답)
     4. ①  (원래 15번 정답)
     5. ③  (원래 21번 정답)
```

---

*리포트 작성: Claude Code (Opus)*
*날짜: 2025-11-28*
