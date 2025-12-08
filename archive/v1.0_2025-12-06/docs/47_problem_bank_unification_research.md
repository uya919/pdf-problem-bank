# 문제은행 통합 연구 리포트

**Phase 23 준비 연구**
**작성일:** 2025-12-02
**작성자:** Claude Code (Opus)

---

## 1. 연구 목적

### 1.1 핵심 질문
1. HML/HWPX 파싱 결과와 PDF 라벨링 결과를 어떻게 구분하여 저장할 것인가?
2. PDF 라벨링된 이미지에 Mathpix OCR을 적용하면 HML/HWPX 파싱 결과와 동일한 형식이 되는가?
3. 통합 문제은행 UI를 어떻게 재설계해야 하는가?

### 1.2 배경
현재 시스템은 두 가지 독립적인 문제 소스를 가지고 있다:
- **HML/HWPX 파서**: 한글 문서에서 구조화된 텍스트+LaTeX 추출
- **PDF 라벨링**: 이미지 크롭 기반 문제 추출

---

## 2. 현재 데이터 형식 분석

### 2.1 HML/HWPX 파싱 결과 (구조화된 형식)

```python
# backend/app/services/hangul/parser_base.py
@dataclass
class ParsedProblem:
    id: str                              # UUID
    number: str                          # "1", "2", "01-1"

    # 콘텐츠 (이중 형식)
    content_text: str                    # 순수 텍스트
    content_latex: str                   # LaTeX 인라인 포함

    # 수식
    content_equations: List[str]         # 원본 HWP 수식
    content_equations_latex: List[str]   # LaTeX 변환본

    # 이미지
    content_images: List[str]            # 이미지 참조

    # 정답/해설
    answer: Optional[str]
    answer_latex: Optional[str]
    answer_type: str                     # choice|value|expression
    explanation: Optional[str]
    points: Optional[float]
```

**저장 위치:** `dataset_root/problem_bank/problems/{id}.json`

**장점:**
- 텍스트 검색 가능
- LaTeX 수식 렌더링 가능
- 정답/해설 분리 저장
- 메타데이터 풍부

**단점:**
- 원본 레이아웃 손실
- 이미지 별도 관리 필요

### 2.2 PDF 라벨링 결과 (이미지 형식)

```python
# 저장 구조
dataset_root/{document_id}/problems/
├── {doc_id}_p{page:04d}_{group_id}.png   # 크롭된 이미지
└── {doc_id}_p{page:04d}_{group_id}.json  # 메타데이터
```

**메타데이터 구조:**
```json
{
  "document_id": "pdf_doc_001",
  "page_index": 0,
  "group_id": "G1",
  "bbox": [100, 200, 400, 500],
  "image_path": "problems/doc_001_p0000_G1.png",
  "metadata": {
    "subject": "수학",
    "grade": "1학년",
    "difficulty": 3
  }
}
```

**장점:**
- 원본 레이아웃 보존
- 복잡한 수식/도표 그대로 표현
- 단순한 저장 구조

**단점:**
- 텍스트 검색 불가
- 정답/해설 없음
- OCR 없이는 내용 접근 불가

### 2.3 Mathpix API 출력 형식

```json
{
  "request_id": "abc123",
  "text": "방정식 \\( x + 2 = 5 \\) 를 풀어라.",
  "latex_styled": "방정식 $x + 2 = 5$ 를 풀어라.",
  "confidence": 0.95,
  "confidence_rate": 0.92,
  "is_printed": true,
  "is_handwritten": false,
  "data": [
    {"type": "latex", "value": "x + 2 = 5"}
  ]
}
```

**특징:**
- `text`: Mathpix Markdown (인라인 수식 `\( \)`, 블록 수식 `\[ \]`)
- `latex_styled`: LaTeX 형식 ($ 구분자)
- `confidence`: 인식 신뢰도 (0.0~1.0)
- `data`: 추출된 수식 배열

---

## 3. 형식 호환성 분석

### 3.1 비교표

| 필드 | HML/HWPX 파서 | Mathpix API | 호환성 |
|------|---------------|-------------|--------|
| **텍스트** | `content_text` | `text` (MD) | ✅ 변환 가능 |
| **LaTeX** | `content_latex` | `latex_styled` | ✅ 동일 형식 |
| **수식 목록** | `content_equations_latex` | `data[].value` | ✅ 매핑 가능 |
| **정답** | `answer` | ❌ 없음 | ⚠️ 수동 입력 필요 |
| **해설** | `explanation` | ❌ 없음 | ⚠️ 수동 입력 필요 |
| **신뢰도** | 100% (네이티브) | 90-98% | ⚠️ 검수 필요 |
| **이미지 참조** | `content_images` | ❌ 없음 | ✅ 원본 유지 |

### 3.2 변환 가능성

**Mathpix → HML/HWPX 형식 변환:**

```python
def convert_mathpix_to_parsed_problem(
    mathpix_response: dict,
    original_image_path: str,
    document_id: str,
    page_index: int,
    group_id: str
) -> ParsedProblem:
    """
    Mathpix API 응답을 ParsedProblem 형식으로 변환
    """
    # 텍스트 변환: \( \) → $ $
    text = mathpix_response.get("text", "")
    latex_styled = mathpix_response.get("latex_styled", "")

    # 구분자 통일
    content_latex = text.replace(r"\(", "$").replace(r"\)", "$")
    content_latex = content_latex.replace(r"\[", "$$").replace(r"\]", "$$")

    # 순수 텍스트 추출
    content_text = re.sub(r'\$[^$]+\$', '', content_latex).strip()
    content_text = re.sub(r'\$\$[^$]+\$\$', '', content_text).strip()

    # 수식 추출
    equations_latex = [
        d["value"] for d in mathpix_response.get("data", [])
        if d.get("type") == "latex"
    ]

    return ParsedProblem(
        id=str(uuid.uuid4()),
        number="",  # 수동 입력 필요
        content_text=content_text,
        content_latex=content_latex,
        content_equations=[],  # 원본 HWP 형식 없음
        content_equations_latex=equations_latex,
        content_images=[original_image_path],  # 원본 이미지 참조
        answer=None,  # 수동 입력 필요
        answer_latex=None,
        answer_type="unknown",
        explanation=None,
        points=None,
        # 추가 메타데이터
        source_type="pdf_ocr",
        source_document_id=document_id,
        source_page_index=page_index,
        source_group_id=group_id,
        ocr_confidence=mathpix_response.get("confidence", 0.0)
    )
```

### 3.3 결론: 형식 통합 가능

**✅ 가능:** Mathpix OCR 결과를 HML/HWPX 파싱 결과와 동일한 형식으로 변환 가능

**⚠️ 제한사항:**
1. **정답 없음**: Mathpix는 정답을 추출하지 않음 → 수동 입력 필요
2. **해설 없음**: 해설도 별도 작업 필요
3. **신뢰도 차이**: OCR은 100% 정확하지 않음 → 검수 UI 필요
4. **원본 HWP 수식 없음**: `content_equations`는 빈 배열

---

## 4. 통합 데이터 모델 제안

### 4.1 새로운 Problem 스키마

```python
@dataclass
class UnifiedProblem:
    """
    Phase 23: 통합 문제 모델
    HML/HWPX, PDF+OCR 모든 소스를 지원
    """
    # 기본 식별자
    id: str                              # UUID
    number: str                          # 문제 번호

    # 콘텐츠 (이중 형식)
    content_text: str                    # 순수 텍스트
    content_latex: str                   # LaTeX 포함 텍스트
    content_equations_latex: List[str]   # 수식 목록

    # 이미지 (원본 보존)
    content_images: List[str]            # 이미지 경로
    thumbnail_url: Optional[str]         # 썸네일 (PDF 크롭)
    original_image_url: Optional[str]    # 원본 크롭 이미지

    # 정답/해설
    answer: Optional[str]
    answer_latex: Optional[str]
    answer_type: str                     # choice|value|expression|unknown
    explanation: Optional[str]
    explanation_latex: Optional[str]

    # 메타데이터
    metadata: ProblemMetadata

    # 소스 추적 (핵심 구분 필드)
    source: ProblemSource

    # 상태
    status: str                          # draft|review|confirmed
    ocr_confidence: Optional[float]      # OCR 신뢰도 (0.0~1.0)

    # 타임스탬프
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime]       # Soft delete

@dataclass
class ProblemSource:
    """문제 출처 정보 - 소스 타입 구분의 핵심"""

    type: str  # "hml" | "hwpx" | "pdf_labeled" | "pdf_ocr" | "manual"

    # 문서 참조
    document_id: Optional[str]           # 원본 문서 ID
    document_name: Optional[str]         # 원본 문서 이름
    page_index: Optional[int]            # 페이지 번호
    group_id: Optional[str]              # 그룹 ID (PDF 라벨링)

    # 메타데이터
    book_name: Optional[str]             # 교재명
    chapter: Optional[str]               # 단원
    year: Optional[int]                  # 연도 (시험지)

    # OCR 정보 (pdf_ocr 타입인 경우)
    ocr_provider: Optional[str]          # "mathpix" | "tesseract" | etc
    ocr_timestamp: Optional[datetime]
    ocr_confidence: Optional[float]
```

### 4.2 저장 구조 제안

```
dataset_root/
├── problem_bank/                        # 통합 문제은행
│   ├── index.json                       # 마스터 인덱스
│   │
│   ├── problems/                        # 문제 JSON
│   │   ├── by_source/                   # 소스별 분류
│   │   │   ├── hml/
│   │   │   ├── hwpx/
│   │   │   ├── pdf_labeled/
│   │   │   └── pdf_ocr/
│   │   └── {problem_id}.json
│   │
│   ├── images/                          # 이미지 저장
│   │   ├── originals/                   # 원본 크롭 이미지
│   │   ├── thumbnails/                  # 썸네일
│   │   └── embedded/                    # HML/HWPX 임베디드
│   │
│   ├── answers/
│   └── explanations/
│
└── {document_id}/                       # 기존 PDF 라벨링 데이터
    └── problems/                        # (레거시, 마이그레이션 대상)
```

---

## 5. UI 재설계 제안

### 5.1 문제은행 메인 페이지

```
┌─────────────────────────────────────────────────────────────┐
│  문제은행                                    [+ 문제 추가]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ 전체    │ │ 한글파일 │ │ PDF+OCR │ │ 이미지만 │           │
│  │ 1,234   │ │   856   │ │   251   │ │   127   │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                             │
│  ┌─ 필터 ──────────────────────────────────────────────┐   │
│  │ 소스: [전체 ▼]  과목: [수학 ▼]  학년: [전체 ▼]      │   │
│  │ 검색: [____________________] [검색]                  │   │
│  │ 상태: ○ 전체  ○ 검수 필요  ○ 확정됨                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─ 문제 목록 ─────────────────────────────────────────┐   │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐     │   │
│  │  │ [HML]  │  │ [OCR]  │  │ [IMG]  │  │ [HML]  │     │   │
│  │  │ 수학1  │  │ ⚠ 95%  │  │ No OCR │  │ 수학2  │     │   │
│  │  │ 1번    │  │ 3번    │  │ 5번    │  │ 2번    │     │   │
│  │  │ ✓ 정답 │  │ - 정답 │  │ - 정답 │  │ ✓ 정답 │     │   │
│  │  └────────┘  └────────┘  └────────┘  └────────┘     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 소스 타입별 배지

| 소스 타입 | 배지 | 색상 | 설명 |
|-----------|------|------|------|
| `hml` | HML | 🟢 Green | 한글 HML 파싱 |
| `hwpx` | HWPX | 🟢 Green | 한글 HWPX 파싱 |
| `pdf_ocr` | OCR | 🟡 Yellow | PDF + Mathpix OCR |
| `pdf_labeled` | IMG | 🔵 Blue | PDF 이미지만 (OCR 없음) |
| `manual` | 수동 | ⚪ Gray | 수동 입력 |

### 5.3 OCR 검수 필요 표시

```tsx
function ProblemCard({ problem }: { problem: UnifiedProblem }) {
  const needsReview = problem.source.type === 'pdf_ocr'
    && problem.ocr_confidence < 0.95;

  return (
    <Card className={needsReview ? 'border-warning' : ''}>
      {/* 소스 타입 배지 */}
      <SourceBadge type={problem.source.type} />

      {/* OCR 신뢰도 표시 */}
      {problem.source.type === 'pdf_ocr' && (
        <ConfidenceBadge
          value={problem.ocr_confidence}
          showWarning={needsReview}
        />
      )}

      {/* 콘텐츠 */}
      {problem.original_image_url ? (
        <img src={problem.original_image_url} alt="문제" />
      ) : (
        <MathDisplay latex={problem.content_latex} />
      )}

      {/* 정답 상태 */}
      <AnswerStatus hasAnswer={!!problem.answer} />
    </Card>
  );
}
```

### 5.4 새로운 탭 구조

```tsx
<Tabs defaultValue="all">
  <TabsList>
    <Tab value="all">전체 ({stats.total})</Tab>
    <Tab value="korean">한글파일 ({stats.hml + stats.hwpx})</Tab>
    <Tab value="pdf_ocr">PDF+OCR ({stats.pdf_ocr})</Tab>
    <Tab value="image_only">이미지만 ({stats.pdf_labeled})</Tab>
    <Tab value="needs_review">검수 필요 ({stats.needsReview})</Tab>
    <Tab value="trash">휴지통 ({stats.trash})</Tab>
  </TabsList>
</Tabs>
```

---

## 6. 구현 로드맵

### Phase 23-A: 데이터 모델 통합 (1주)

1. `UnifiedProblem` 모델 구현
2. `ProblemSource` 소스 타입 구분
3. 마이그레이션 스크립트 작성
   - 기존 HML/HWPX 문제 → 새 형식
   - 기존 PDF 라벨링 → 새 형식

### Phase 23-B: Mathpix OCR 통합 (1주)

1. Mathpix API 클라이언트 구현
2. OCR 변환 서비스 구현
3. 신뢰도 기반 검수 플래그

```python
# backend/app/services/ocr/mathpix_client.py
class MathpixClient:
    async def ocr_image(self, image_path: str) -> MathpixResponse:
        """이미지를 OCR하여 텍스트+LaTeX 반환"""

    async def convert_to_problem(
        self,
        response: MathpixResponse,
        source_info: ProblemSource
    ) -> UnifiedProblem:
        """Mathpix 응답을 UnifiedProblem으로 변환"""
```

### Phase 23-C: 통합 API 구현 (1주)

```python
# 새로운 통합 API 엔드포인트
GET  /api/problems                    # 통합 목록 (필터 지원)
GET  /api/problems/{id}               # 상세 조회
POST /api/problems                    # 수동 생성
POST /api/problems/import/hml         # HML에서 가져오기
POST /api/problems/import/hwpx        # HWPX에서 가져오기
POST /api/problems/import/pdf-labeled # PDF 라벨링에서 가져오기
POST /api/problems/ocr/{problem_id}   # OCR 적용
PATCH /api/problems/{id}              # 수정 (검수 포함)
DELETE /api/problems/{id}             # 삭제 (soft)

GET /api/problems/stats               # 소스별 통계
GET /api/problems/sources             # 소스 타입 목록
```

### Phase 23-D: 통합 UI 구현 (2주)

1. `UnifiedProblemBankPage.tsx` 신규 작성
2. 소스 타입 필터 UI
3. OCR 검수 워크플로우
4. 배치 OCR 적용 기능

---

## 7. 비용 분석

### 7.1 Mathpix API 비용

| 플랜 | 가격 | 요청 수 | 문제당 비용 |
|------|------|---------|-------------|
| Free | $0 | 1,000/월 | $0 |
| Starter | $9.99/월 | 5,000/월 | $0.002 |
| Pro | $49/월 | 100,000/월 | $0.0005 |

**예상 사용량:**
- 1,000페이지 라벨링 목표
- 페이지당 평균 5문제 = 5,000문제
- Starter 플랜으로 충분 (월 $9.99)

### 7.2 저장 공간

| 소스 타입 | 문제당 크기 | 1,000문제 |
|-----------|-------------|-----------|
| HML/HWPX (JSON) | ~2KB | ~2MB |
| PDF (이미지+JSON) | ~50KB | ~50MB |
| PDF+OCR (이미지+JSON) | ~52KB | ~52MB |

---

## 8. 권장 사항

### 8.1 즉시 구현 (Phase 23)

1. **통합 데이터 모델**: `UnifiedProblem` + `ProblemSource`
2. **소스 타입 구분**: 명확한 `source.type` 필드
3. **통합 UI**: 탭 기반 소스 필터링
4. **Mathpix 통합**: PDF 라벨링 → OCR → 검수 워크플로우

### 8.2 선택적 구현

1. **자동 OCR**: 라벨링 완료 시 자동 Mathpix 호출
2. **배치 OCR**: 기존 이미지 일괄 OCR
3. **검수 UI**: OCR 결과 수정 인터페이스

### 8.3 권장하지 않음

1. **강제 OCR**: 모든 이미지에 OCR 강제 적용
   - 비용 증가, 복잡한 도표는 인식률 낮음

2. **이미지 삭제**: OCR 후 원본 이미지 삭제
   - 원본 보존 필수 (복구 불가)

---

## 9. 결론

### 9.1 핵심 발견

1. **형식 통합 가능**: Mathpix OCR 출력을 HML/HWPX 파싱 결과와 동일한 형식으로 변환 가능
2. **정답 수동 입력 필요**: OCR은 정답을 추출하지 않음
3. **검수 필요**: OCR 신뢰도가 100%가 아니므로 검수 워크플로우 필요

### 9.2 추천 접근법

```
[PDF 업로드] → [자동 페이지 분할] → [수동 라벨링]
                                         ↓
                              [Mathpix OCR 적용] (선택)
                                         ↓
                              [OCR 결과 검수] (신뢰도 < 95%)
                                         ↓
                              [정답 수동 입력]
                                         ↓
                              [통합 문제은행 저장]
                                    ↙     ↘
                        [소스: pdf_ocr]  [소스: pdf_labeled]
                        (텍스트 검색 O)   (이미지만, 검색 X)
```

### 9.3 다음 단계

1. **Phase 23 계획 수립**: 상세 구현 계획 작성
2. **프로토타입**: 통합 데이터 모델 + 기본 UI
3. **Mathpix 테스트**: 실제 PDF 문제 OCR 정확도 검증

---

## 참고 자료

- [Mathpix API v3 Reference](https://docs.mathpix.com/)
- [Mathpix OCR User Guide](https://mathpix.com/docs/convert/best-practices)
- [Mathpix Text Endpoint](https://mathpix.com/blog/mathpix-text-endpoint)

---

*연구 완료: 2025-12-02*
