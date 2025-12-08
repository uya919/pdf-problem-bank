# Phase 22: Intelligence Layer 상세 구현 계획

**생성일**: 2025-12-02
**상위 계획**: [plan.md](plan.md)
**목표**: AI 기반 자동 OCR + 태깅 시스템 구축

---

## 개요

Phase 22는 "10초 안에 문제 등록"의 핵심인 AI 자동화 레이어입니다.

```
┌─────────────────────────────────────────────────────────────┐
│                    Intelligence Layer                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   [문제 이미지]                                              │
│        │                                                     │
│        ▼                                                     │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│   │  B-1        │    │  B-2        │    │  B-3        │     │
│   │  Mathpix    │───▶│  Claude     │───▶│  Vector     │     │
│   │  OCR        │    │  Tagging    │    │  Search     │     │
│   │             │    │             │    │  (선택)     │     │
│   └─────────────┘    └─────────────┘    └─────────────┘     │
│        │                   │                   │             │
│        ▼                   ▼                   ▼             │
│   [LaTeX 수식]       [단원/난이도]       [유사문제]          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## B-1: Mathpix OCR 연동

### 목표
수학 문제 이미지에서 **LaTeX 수식**을 추출하여 검색 및 편집 가능하게 함

### API 정보
- **엔드포인트**: `https://api.mathpix.com/v3/text`
- **인증**: App ID + App Key (`.env`에 저장됨)
- **비용**: $0.002/요청 (월 $10-20 예상)

### 구현 단계

#### Step 1: 환경 설정 확인
```
파일: .env (이미 생성됨)
─────────────────────────
MATHPIX_APP_ID=hyeyum_******
MATHPIX_APP_KEY=49189c******
```

#### Step 2: Mathpix 서비스 클래스 생성
```
파일: backend/app/services/ai/mathpix_service.py
─────────────────────────────────────────────────
class MathpixService:
    """
    Mathpix OCR API 래퍼

    기능:
    - 이미지 → LaTeX 변환
    - Base64 인코딩 처리
    - 에러 핸들링 및 재시도
    - 비용 추적 로깅
    """

    async def image_to_latex(self, image_path: str) -> MathpixResult:
        """
        이미지에서 LaTeX 수식 추출

        Returns:
            MathpixResult:
                - latex: str (변환된 LaTeX)
                - confidence: float (0-1)
                - text: str (일반 텍스트)
                - cost: float (이 요청의 비용)
        """
```

#### Step 3: 응답 모델 정의
```
파일: backend/app/models/ai_models.py
─────────────────────────────────────
@dataclass
class MathpixResult:
    latex: str              # $$x^2 + 2x + 1 = 0$$
    latex_styled: str       # 스타일 포함 버전
    text: str               # 일반 텍스트 부분
    confidence: float       # 신뢰도 (0-1)
    is_printed: bool        # 인쇄체 여부
    is_handwritten: bool    # 손글씨 여부

@dataclass
class MathpixError:
    error_code: str
    message: str
    retry_after: int | None
```

#### Step 4: API 라우터 추가
```
파일: backend/app/routers/ai.py
──────────────────────────────
POST /api/ai/ocr
- 요청: { "image_path": "..." } 또는 { "image_base64": "..." }
- 응답: MathpixResult

POST /api/ai/ocr/batch
- 요청: { "image_paths": ["...", "..."] }
- 응답: { "results": [MathpixResult, ...] }
```

#### Step 5: 에러 핸들링
```python
# 재시도 로직 (지수 백오프)
MAX_RETRIES = 3
RETRY_DELAYS = [1, 2, 4]  # 초

# 에러 코드별 처리
- 401: API 키 오류 → 설정 확인 알림
- 429: Rate limit → 대기 후 재시도
- 500: 서버 오류 → 재시도
```

#### Step 6: 비용 모니터링
```python
# 요청별 비용 로깅
logger.info(f"Mathpix OCR: {image_path}, cost=${cost:.4f}, total_today=${daily_total:.2f}")

# 일일 한도 경고
if daily_total > DAILY_LIMIT_WARNING:
    logger.warning(f"Mathpix 일일 비용 경고: ${daily_total:.2f}")
```

### 테스트 체크리스트
- [ ] 단일 이미지 OCR 성공
- [ ] 배치 처리 (10개 이미지)
- [ ] 손글씨 인식 테스트
- [ ] 복잡한 수식 (분수, 적분, 행렬)
- [ ] 에러 핸들링 (잘못된 이미지)
- [ ] 비용 로깅 확인

---

## B-2: LLM 기반 자동 태깅

### 목표
문제 내용을 분석하여 **단원 분류** + **난이도 예측**을 자동화

### 분류 체계
기존 `math_tree.json` 활용:
```
학년 → 대단원 → 중단원 → 소단원
예: 고등수학(상) → 다항식 → 다항식의 연산 → 다항식의 덧셈과 뺄셈
```

### 구현 단계

#### Step 1: Claude API 설정
```
파일: .env
─────────────
ANTHROPIC_API_KEY=sk-ant-...
```

#### Step 2: 프롬프트 설계
```
파일: backend/app/services/ai/prompts/tagging_prompt.py
───────────────────────────────────────────────────────
TAGGING_SYSTEM_PROMPT = """
당신은 수학 문제 분류 전문가입니다.

주어진 수학 문제를 분석하여 다음을 판단합니다:
1. 학년/과정 (예: 중1, 고등수학(상))
2. 대단원
3. 중단원
4. 소단원
5. 난이도 (1-5)
6. 문제 유형 (개념, 계산, 응용, 심화)

반드시 아래 분류 체계를 사용하세요:
{classification_tree}

JSON 형식으로만 응답하세요.
"""

TAGGING_USER_PROMPT = """
다음 수학 문제를 분류해주세요:

---
{problem_text}
---

{latex_content}
"""
```

#### Step 3: 태깅 서비스 클래스
```
파일: backend/app/services/ai/tagging_service.py
────────────────────────────────────────────────
class TaggingService:
    """
    Claude API 기반 문제 자동 태깅

    기능:
    - 단원 분류 (math_tree.json 기반)
    - 난이도 예측 (1-5)
    - 문제 유형 분류
    - 신뢰도 점수 산출
    """

    def __init__(self):
        self.client = Anthropic()
        self.classification_tree = self._load_math_tree()

    async def tag_problem(
        self,
        text: str,
        latex: str | None = None,
        image_path: str | None = None
    ) -> TaggingResult:
        """
        문제 자동 태깅

        Args:
            text: 문제 텍스트
            latex: Mathpix에서 추출한 LaTeX (선택)
            image_path: 이미지 경로 (Vision API용, 선택)

        Returns:
            TaggingResult:
                - grade: str (학년)
                - major_unit: str (대단원)
                - middle_unit: str (중단원)
                - minor_unit: str (소단원)
                - difficulty: int (1-5)
                - problem_type: str
                - confidence: float (0-1)
                - reasoning: str (판단 근거)
        """
```

#### Step 4: 응답 검증
```python
class TaggingValidator:
    """태깅 결과가 math_tree.json과 일치하는지 검증"""

    def validate(self, result: TaggingResult) -> ValidationResult:
        # 1. 대단원이 존재하는지
        # 2. 중단원이 대단원에 속하는지
        # 3. 소단원이 중단원에 속하는지
        # 4. 난이도가 1-5 범위인지
        pass

    def find_closest_match(self, invalid_unit: str) -> str:
        """잘못된 단원명을 가장 유사한 것으로 매핑"""
        pass
```

#### Step 5: API 라우터
```
파일: backend/app/routers/ai.py (확장)
──────────────────────────────────────
POST /api/ai/tag
- 요청: { "text": "...", "latex": "...", "image_path": "..." }
- 응답: TaggingResult

POST /api/ai/tag/batch
- 요청: { "problems": [...] }
- 응답: { "results": [TaggingResult, ...] }
```

#### Step 6: 프롬프트 최적화
```
목표: 토큰 사용량 최소화 + 정확도 최대화

전략:
1. math_tree.json 압축 전송 (현재 단원만)
2. Few-shot 예시 3개 포함
3. 응답 포맷 엄격 지정 (JSON only)
4. 캐싱 (동일 문제 재요청 방지)
```

### 테스트 체크리스트
- [ ] 단순 문제 분류 (이차방정식)
- [ ] 복합 문제 분류 (여러 단원 걸침)
- [ ] 난이도 예측 일관성
- [ ] 잘못된 단원명 자동 수정
- [ ] 비용 추적 (토큰 사용량)

---

## B-3: 벡터 검색 및 중복 탐지 (선택)

### 목표
유사 문제 검색 및 중복 등록 방지

### 구현 단계 (MVP 이후)

#### Step 1: 임베딩 모델 선택
```
옵션 A: OpenAI text-embedding-3-small ($0.02/1M tokens)
옵션 B: 로컬 모델 (sentence-transformers)

권장: 옵션 A (정확도 높음, 비용 저렴)
```

#### Step 2: 벡터 저장소
```
옵션 A: FAISS (로컬, 무료)
옵션 B: pgvector (PostgreSQL 확장)
옵션 C: Pinecone (클라우드)

권장: 옵션 A (초기 단계, 무료)
```

#### Step 3: 유사도 검색 API
```
POST /api/ai/similar
- 요청: { "text": "...", "threshold": 0.95 }
- 응답: { "similar_problems": [...], "is_duplicate": bool }
```

---

## 통합 파이프라인

### 전체 흐름
```
[문제 이미지 업로드]
        │
        ▼
┌───────────────────┐
│ 1. Mathpix OCR    │  ← B-1
│    (LaTeX 추출)   │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ 2. Claude 태깅    │  ← B-2
│    (단원/난이도)  │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ 3. 중복 체크      │  ← B-3 (선택)
│    (유사문제)     │
└───────────────────┘
        │
        ▼
[사용자 검수 UI]     ← Phase 23
```

### 통합 서비스
```
파일: backend/app/services/ai/pipeline_service.py
────────────────────────────────────────────────
class AIPipelineService:
    """
    OCR → 태깅 → 중복체크 통합 파이프라인
    """

    async def process_problem(
        self,
        image_path: str,
        skip_duplicate_check: bool = False
    ) -> PipelineResult:
        """
        문제 이미지 전체 처리

        Returns:
            PipelineResult:
                - ocr_result: MathpixResult
                - tagging_result: TaggingResult
                - similar_problems: list[Problem] | None
                - total_cost: float
                - processing_time: float
        """
```

---

## 파일 구조

```
backend/app/services/ai/
├── __init__.py
├── mathpix_service.py      # B-1: OCR
├── tagging_service.py      # B-2: 태깅
├── vector_service.py       # B-3: 벡터 검색
├── pipeline_service.py     # 통합 파이프라인
└── prompts/
    ├── __init__.py
    └── tagging_prompt.py   # 프롬프트 템플릿

backend/app/models/
└── ai_models.py            # AI 관련 데이터 모델

backend/app/routers/
└── ai.py                   # AI API 엔드포인트
```

---

## 비용 예측

| 서비스 | 단가 | 일 100문제 | 월 비용 |
|--------|------|-----------|---------|
| Mathpix OCR | $0.002/요청 | $0.20 | $6 |
| Claude API | ~$0.003/문제 | $0.30 | $9 |
| OpenAI Embedding | $0.00002/문제 | $0.002 | $0.06 |
| **합계** | - | **$0.50** | **$15** |

---

## 실행 순서

### Day 1-2: B-1 Mathpix OCR
1. [ ] MathpixService 클래스 생성
2. [ ] API 라우터 추가 (/api/ai/ocr)
3. [ ] 테스트 (단일 이미지, 배치)
4. [ ] 에러 핸들링 완성

### Day 3-5: B-2 Claude 태깅
1. [ ] anthropic 패키지 설치
2. [ ] 프롬프트 설계 및 테스트
3. [ ] TaggingService 클래스 생성
4. [ ] 검증 로직 구현
5. [ ] API 라우터 추가 (/api/ai/tag)

### Day 6-7: 통합 및 테스트
1. [ ] PipelineService 구현
2. [ ] 엔드투엔드 테스트
3. [ ] 비용 모니터링 대시보드 (선택)

---

## 승인 체크리스트

B-1, B-2를 승인하시려면 plan.md에서 체크해주세요:

```markdown
### B-1: Mathpix OCR 연동
**상태**: [x] 승인  ← 이렇게 변경

### B-2: LLM 기반 자동 태깅
**상태**: [x] 승인  ← 이렇게 변경
```

---

*"진행해줘"라고 말씀하시면 B-1부터 구현을 시작합니다.*
