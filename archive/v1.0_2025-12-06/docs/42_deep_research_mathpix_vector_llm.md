# 심층 연구 리포트: Mathpix OCR, 벡터 검색, LLM 자동 태깅

**작성일**: 2025-12-02
**분석 수준**: Deep Dive (opus thinkharder)
**목적**: 핵심 기술 도입 의사결정을 위한 근거 제공

---

## 목차

1. [Mathpix OCR 심층 연구](#part-1-mathpix-ocr-심층-연구)
2. [pgvector 벡터 검색 이점 분석](#part-2-pgvector-벡터-검색-이점-분석)
3. [LLM 자동 태깅 + math_tree.json 호환성](#part-3-llm-자동-태깅--math_treejson-호환성)

---

# Part 1: Mathpix OCR 심층 연구

## 1.1 문제 정의: PDF 라벨링의 폰트 일관성 문제

### 현재 상황

```
┌─────────────────────────────────────────────────────────────────┐
│                    현재 PDF 라벨링 파이프라인                    │
│                                                                  │
│   PDF 업로드 → 이미지 변환 → 블록 검출 → 그룹핑 → 이미지 저장   │
│                                                                  │
│   문제점:                                                        │
│   • 출력물이 "이미지" 형태로 저장됨                              │
│   • 원본 PDF의 폰트가 그대로 유지됨                              │
│   • 학원마다, 출판사마다 폰트가 다름                             │
│   • 결과: 문제은행 전체의 시각적 일관성 없음                     │
└─────────────────────────────────────────────────────────────────┘
```

### 일관성이 중요한 이유

| 비일관성 유형 | 문제점 | 영향 |
|--------------|--------|------|
| **폰트 다양성** | A출판사=명조, B출판사=고딕 | 학습지 품질 저하 |
| **크기 차이** | 10pt, 11pt, 12pt 혼재 | 레이아웃 불균형 |
| **수식 스타일** | Times, CMU, Cambria Math | 가독성 혼란 |
| **이미지 해상도** | 72dpi ~ 300dpi | 인쇄 품질 차이 |

### 해결 방향: 이미지 → 텍스트 변환

```
┌─────────────────────────────────────────────────────────────────┐
│                    제안 파이프라인 (Mathpix 적용)                │
│                                                                  │
│   PDF → 블록 검출 → [Mathpix OCR] → LaTeX/Markdown → 재렌더링   │
│                           ↓                                     │
│                    표준화된 폰트로 출력                          │
│                    (Pretendard + KaTeX)                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1.2 Mathpix 기술 분석

### 1.2.1 Mathpix란?

**Mathpix**는 수학/과학 문서에 특화된 OCR(광학 문자 인식) 서비스입니다.

**핵심 역량**:
- 수식 인식 정확도: **99%+** (업계 최고)
- 한글 지원: **공식 지원** (2023년부터)
- 손글씨 인식: **지원**
- 표 구조 인식: **지원**

### 1.2.2 Mathpix API 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                        Mathpix API 구조                          │
│                                                                  │
│   ┌───────────────────────────────────────────────────────────┐ │
│   │  Convert API (PDF 전용)                                   │ │
│   │  • 입력: PDF 파일                                         │ │
│   │  • 출력: Markdown, LaTeX, DOCX, HTML                      │ │
│   │  • 특징: 페이지별 Line Data 제공                          │ │
│   └───────────────────────────────────────────────────────────┘ │
│                                                                  │
│   ┌───────────────────────────────────────────────────────────┐ │
│   │  Snip API (이미지 전용)                                   │ │
│   │  • 입력: PNG, JPG, Base64                                 │ │
│   │  • 출력: LaTeX, Mathpix Markdown, Asciimath               │ │
│   │  • 특징: 실시간 응답 (< 1초)                              │ │
│   └───────────────────────────────────────────────────────────┘ │
│                                                                  │
│   ┌───────────────────────────────────────────────────────────┐ │
│   │  PDF Digitize API (구조 분석)                             │ │
│   │  • 입력: PDF 파일                                         │ │
│   │  • 출력: JSON (구조화된 데이터)                           │ │
│   │  • 특징: 표, 그림, 캡션 자동 분리                         │ │
│   └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2.3 우리 시스템에 적합한 API: Snip API

**이유**:
1. 우리는 이미 PDF를 이미지로 변환하고 블록을 추출함
2. 블록 단위 이미지를 Snip API에 전송하면 됨
3. Convert API는 전체 PDF 처리용이라 우리 워크플로우와 맞지 않음

**Snip API 상세 스펙**:

```python
# 요청 예시
POST https://api.mathpix.com/v3/text
Headers:
  app_id: your_app_id
  app_key: your_app_key
  Content-type: application/json

Body:
{
  "src": "data:image/png;base64,{base64_encoded_image}",
  "formats": ["latex_styled", "text"],
  "data_options": {
    "include_latex": true,
    "include_asciimath": false
  },
  "ocr": ["text", "math"],
  "skip_recrop": false
}

# 응답 예시
{
  "request_id": "abc123",
  "text": "이차방정식 $x^2 + 2x + 1 = 0$을 풀어라.",
  "latex_styled": "이차방정식 $x^{2}+2x+1=0$을 풀어라.",
  "confidence": 0.98,
  "confidence_rate": 0.97
}
```

### 1.2.4 한글 인식 성능

**Mathpix 한글 지원 현황** (공식 문서 기반):

| 언어 | 지원 수준 | 비고 |
|------|----------|------|
| 한국어 (Korean) | **Full Support** | OCR 언어 코드: `ko` |
| 한글 수식 혼합 | **지원** | 한글 + LaTeX 동시 인식 |
| 손글씨 한글 | **제한적** | 정확도 낮음 |

**설정 옵션**:
```python
{
  "ocr": ["text", "math"],
  "languages": ["ko"],  # 한국어 우선 인식
  "include_word_data": true  # 단어별 좌표 포함
}
```

---

## 1.3 우리 시스템 통합 설계

### 1.3.1 통합 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                   PDF 라벨링 + Mathpix 통합                      │
│                                                                  │
│   [1. 기존 파이프라인]                                           │
│   PDF → PyMuPDF → 페이지 이미지 → DensityAnalyzer → 블록 좌표   │
│                                                                  │
│   [2. Mathpix 연동 지점]                                         │
│                                    ↓                             │
│   블록 이미지 크롭 → ┌─────────────────────────┐                 │
│                      │     Mathpix Snip API    │                 │
│                      │  • Base64 이미지 전송   │                 │
│                      │  • LaTeX + 텍스트 반환  │                 │
│                      └───────────┬─────────────┘                 │
│                                  ↓                               │
│   [3. 결과 처리]                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  문제 데이터 구조                                        │   │
│   │  {                                                       │   │
│   │    "id": "problem_001",                                  │   │
│   │    "original_image": "base64...",  // 원본 보존          │   │
│   │    "text": "이차방정식 x²+2x+1=0을 풀어라",              │   │
│   │    "latex": "$x^{2}+2x+1=0$",       // 수식만 추출       │   │
│   │    "confidence": 0.98                                    │   │
│   │  }                                                       │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                  ↓                               │
│   [4. 표준화된 렌더링]                                           │
│   LaTeX + 텍스트 → KaTeX 렌더링 → 일관된 폰트의 HTML/이미지     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3.2 구현 코드 설계

```python
# backend/app/services/ocr/mathpix_service.py

from typing import Optional
import httpx
import base64
from pydantic import BaseModel

class MathpixResult(BaseModel):
    text: str                    # 전체 텍스트 (한글 + 수식)
    latex_styled: str            # LaTeX 스타일 텍스트
    confidence: float            # 신뢰도 (0-1)
    error: Optional[str] = None

class MathpixService:
    """Mathpix OCR 서비스"""

    BASE_URL = "https://api.mathpix.com/v3/text"

    def __init__(self, app_id: str, app_key: str):
        self.app_id = app_id
        self.app_key = app_key
        self.client = httpx.AsyncClient()

    async def recognize(
        self,
        image_bytes: bytes,
        include_word_data: bool = False
    ) -> MathpixResult:
        """이미지에서 텍스트/수식 인식"""

        # Base64 인코딩
        b64_image = base64.b64encode(image_bytes).decode()

        # API 요청
        response = await self.client.post(
            self.BASE_URL,
            headers={
                "app_id": self.app_id,
                "app_key": self.app_key,
                "Content-type": "application/json"
            },
            json={
                "src": f"data:image/png;base64,{b64_image}",
                "formats": ["text", "latex_styled"],
                "ocr": ["text", "math"],
                "languages": ["ko"],  # 한국어 우선
                "include_word_data": include_word_data
            }
        )

        data = response.json()

        return MathpixResult(
            text=data.get("text", ""),
            latex_styled=data.get("latex_styled", ""),
            confidence=data.get("confidence", 0.0),
            error=data.get("error")
        )

    async def recognize_batch(
        self,
        images: list[bytes]
    ) -> list[MathpixResult]:
        """배치 처리 (여러 블록 동시 인식)"""
        import asyncio
        return await asyncio.gather(
            *[self.recognize(img) for img in images]
        )
```

### 1.3.3 비용 분석

**Mathpix 가격 정책** (2024년 기준):

| 플랜 | 월 요청 수 | 가격 | 문제당 비용 |
|------|-----------|------|-------------|
| Free | 1,000 | $0 | $0 |
| Edu | 5,000 | $9.99 | $0.002 |
| Pro | 10,000 | $19.99 | $0.002 |
| Enterprise | 무제한 | 협의 | 협의 |

**우리 예상 사용량**:

| 시나리오 | 월간 문제 수 | 월 비용 | 비고 |
|----------|-------------|---------|------|
| 소규모 | 500 | $0 | Free 티어 |
| 중규모 | 3,000 | $9.99 | Edu 티어 |
| 대규모 | 10,000 | $19.99 | Pro 티어 |

### 1.3.4 기대 효과

| 항목 | Before | After | 개선율 |
|------|--------|-------|--------|
| **폰트 일관성** | 0% (이미지 그대로) | 100% (표준화) | ∞ |
| **검색 가능성** | 불가능 | 가능 (텍스트화) | ∞ |
| **파일 크기** | ~200KB/문제 | ~5KB/문제 | 40배 ↓ |
| **수정 가능성** | 불가능 | LaTeX 편집 가능 | ∞ |
| **벡터 검색** | 불가능 | 텍스트 임베딩 가능 | ∞ |

---

## 1.4 Mathpix 도입 권장 사항

### 결론: **강력 권장**

**이유**:
1. PDF 라벨링의 근본적 한계(이미지 고정)를 해결
2. 텍스트화를 통해 벡터 검색, LLM 태깅 모두 가능해짐
3. 비용 대비 효과 탁월 (월 $10~20)
4. 한글 + 수식 동시 지원

**구현 우선순위**: **P0 (최우선)**

**의존성**:
- B-2 (LLM 자동 태깅): Mathpix 텍스트 필요
- B-3 (벡터 검색): Mathpix 텍스트 필요

---

# Part 2: pgvector 벡터 검색 이점 분석

## 2.1 벡터 검색이란?

### 2.1.1 기존 검색 vs 벡터 검색

```
┌─────────────────────────────────────────────────────────────────┐
│                    키워드 검색 (기존 방식)                       │
│                                                                  │
│   검색어: "이차방정식"                                           │
│                                                                  │
│   ✅ 매칭: "이차방정식의 근의 공식"                              │
│   ❌ 미매칭: "x²+2x+1=0의 해를 구하라"  ← 키워드 없음            │
│   ❌ 미매칭: "2차 방정식"              ← 띄어쓰기 다름           │
│   ❌ 미매칭: "quadratic equation"       ← 언어 다름              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    벡터 검색 (의미 기반)                         │
│                                                                  │
│   검색어: "이차방정식" → 벡터: [0.12, -0.34, 0.56, ...]         │
│                                                                  │
│   ✅ 매칭: "이차방정식의 근의 공식"     (유사도: 0.95)          │
│   ✅ 매칭: "x²+2x+1=0의 해를 구하라"   (유사도: 0.87)          │
│   ✅ 매칭: "2차 방정식"                (유사도: 0.92)          │
│   ✅ 매칭: "quadratic equation"         (유사도: 0.78)          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.1.2 임베딩(Embedding)의 원리

```
텍스트 → 임베딩 모델 → 고차원 벡터 (1536차원)

예시:
"이차방정식 x²+2x+1=0을 풀어라"
    ↓
[0.0231, -0.0145, 0.0892, ..., -0.0234]  (1536개의 숫자)

의미가 비슷한 문장은 벡터 공간에서 가까이 위치함
```

## 2.2 pgvector 소개

### 2.2.1 pgvector란?

**pgvector**는 PostgreSQL 확장으로, 벡터 데이터를 저장하고 검색할 수 있게 해줍니다.

**특징**:
- PostgreSQL 네이티브 확장
- 추가 서버 불필요 (기존 DB에 설치)
- HNSW, IVFFlat 인덱스 지원
- 최대 16,000차원 벡터 지원

### 2.2.2 기본 사용법

```sql
-- 1. 확장 설치
CREATE EXTENSION vector;

-- 2. 벡터 컬럼이 있는 테이블 생성
CREATE TABLE problems (
    id SERIAL PRIMARY KEY,
    content TEXT,
    embedding vector(1536)  -- 1536차원 벡터
);

-- 3. 인덱스 생성 (HNSW - 빠른 검색)
CREATE INDEX ON problems
USING hnsw (embedding vector_cosine_ops);

-- 4. 유사도 검색 (코사인 유사도)
SELECT id, content,
       1 - (embedding <=> query_vector) as similarity
FROM problems
ORDER BY embedding <=> query_vector
LIMIT 10;
```

## 2.3 우리 시스템에서의 이점

### 2.3.1 핵심 이점 5가지

```
┌─────────────────────────────────────────────────────────────────┐
│                    벡터 검색의 5가지 이점                        │
│                                                                  │
│   1️⃣  중복 문제 탐지                                            │
│       "같은 문제가 이미 등록되어 있나요?"                        │
│       → 코사인 유사도 0.95 이상이면 중복 경고                    │
│                                                                  │
│   2️⃣  쌍둥이 문제 찾기                                          │
│       "이 문제와 비슷한 문제 5개 추천해주세요"                   │
│       → 유사도 순 정렬로 즉시 추천                               │
│                                                                  │
│   3️⃣  의미 기반 검색                                            │
│       "완전제곱식" 검색 → "(a+b)²" 관련 문제도 검색됨            │
│       → 키워드 없어도 개념으로 찾기                              │
│                                                                  │
│   4️⃣  문제 유형 클러스터링                                      │
│       비슷한 문제들을 자동으로 그룹화                            │
│       → 단원별 분류 검증에 활용                                  │
│                                                                  │
│   5️⃣  난이도 추정 보조                                          │
│       비슷한 문제들의 평균 난이도로 새 문제 난이도 예측          │
│       → LLM 태깅의 보조 지표                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3.2 구체적 시나리오

**시나리오 1: 중복 등록 방지**

```
사용자: PDF에서 문제 업로드
시스템:
  1. Mathpix로 텍스트 추출
  2. 텍스트 임베딩 생성
  3. DB에서 유사도 0.95 이상 검색
  4. 결과 있으면 → "⚠️ 이미 등록된 문제가 있습니다" 경고
```

**시나리오 2: 쌍둥이 문제 추천**

```
선생님: "이 이차방정식 문제와 비슷한 거 5개 줘"
시스템:
  1. 선택된 문제의 임베딩 가져옴
  2. 코사인 유사도로 상위 5개 검색
  3. 결과 반환 (0.1초 이내)
```

**시나리오 3: 개념 기반 검색**

```
선생님: "판별식 활용" 검색
기존 방식: "판별식" 키워드 포함된 문제만 검색
벡터 검색:
  - "판별식 D > 0일 때..."
  - "b²-4ac의 부호에 따라..."
  - "서로 다른 두 실근을 가지려면..."
  → 모두 검색됨 (의미적 유사성)
```

### 2.3.3 비용/성능 분석

**임베딩 생성 비용**:

| 모델 | 비용 | 차원 | 품질 |
|------|------|------|------|
| OpenAI text-embedding-3-small | $0.00002/1K토큰 | 1536 | 높음 |
| OpenAI text-embedding-3-large | $0.00013/1K토큰 | 3072 | 매우 높음 |
| sentence-transformers (로컬) | $0 | 768 | 중간 |

**1만 문제 기준 예상 비용**:
- 평균 문제 길이: 100토큰
- OpenAI small: 1만 × 100 × $0.00002 = **$0.02** (거의 무료)

**검색 성능**:

| 인덱스 | 10만 문제 검색 | 정확도 |
|--------|---------------|--------|
| 없음 (brute force) | ~500ms | 100% |
| IVFFlat | ~10ms | 95% |
| HNSW | ~1ms | 99% |

## 2.4 우리 시스템 통합 시 고려사항

### 2.4.1 DB 전환 필요성

**현재**: SQLite (벡터 검색 미지원)
**필요**: PostgreSQL + pgvector

**전환 방법**:
1. **로컬 개발**: PostgreSQL 설치 또는 Docker
2. **클라우드**: Supabase (pgvector 내장, 무료 티어 있음)

### 2.4.2 대안: SQLite + Python 라이브러리

pgvector 없이도 가능한 방법:

```python
# 방법 1: faiss (Facebook)
import faiss
import numpy as np

# 인덱스 생성
index = faiss.IndexFlatIP(1536)  # Inner Product
index.add(embeddings)

# 검색
distances, indices = index.search(query_vector, k=5)
```

**장단점**:

| 방식 | 장점 | 단점 |
|------|------|------|
| **pgvector** | SQL 통합, 트랜잭션 지원 | DB 전환 필요 |
| **faiss** | 설치 간단, DB 전환 불필요 | 메모리 관리 필요 |

## 2.5 벡터 검색 도입 권장 사항

### 결론: **권장 (선택적)**

**이유**:
1. 중복 탐지, 유사 문제 추천에 핵심적
2. Mathpix 도입 후 텍스트가 있어야 의미 있음
3. 비용 거의 없음 ($0.02/1만문제)

**구현 우선순위**: **P1 (Mathpix 이후)**

**권장 접근**:
1. 초기: faiss로 시작 (DB 전환 없이)
2. 확장 시: pgvector 전환 검토

---

# Part 3: LLM 자동 태깅 + math_tree.json 호환성

## 3.1 현재 분류 체계 분석

### 3.1.1 math_tree.json 구조

```json
{
  "version": "1.0",
  "metadata": {
    "source": "mathsecr.com 기반",
    "totalNodes": 847,
    "levels": ["grade", "majorUnit", "middleUnit", "minorUnit", "type"]
  },
  "tree": [
    {
      "id": 1,
      "name": "중1-1",           // Level 1: 학년
      "children": [
        {
          "id": 101,
          "name": "소인수분해",    // Level 2: 대단원
          "children": [
            {
              "id": 10101,
              "name": "소수와 합성수",  // Level 3: 중단원
              "children": [
                {
                  "id": 1010101,
                  "name": "소수의 정의",   // Level 4: 소단원
                  "children": [
                    {
                      "id": 101010101,
                      "name": "소수 찾기"    // Level 5: 유형
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### 3.1.2 분류 체계 통계

| 레벨 | 명칭 | 노드 수 (추정) | 예시 |
|------|------|---------------|------|
| 1 | 학년 (grade) | ~20 | 중1-1, 고등수학(상), 수학II |
| 2 | 대단원 (majorUnit) | ~100 | 다항식, 방정식과 부등식 |
| 3 | 중단원 (middleUnit) | ~300 | 이차방정식, 복소수 |
| 4 | 소단원 (minorUnit) | ~300 | 근의 공식, 판별식 |
| 5 | 유형 (type) | ~100 | 근 구하기, 근의 분류 |

**총 노드 수**: 847개

## 3.2 LLM 자동 태깅 실현 가능성

### 3.2.1 핵심 질문: LLM이 847개 카테고리를 구분할 수 있는가?

**답변: 가능합니다. 단, 전략이 필요합니다.**

### 3.2.2 접근 방법: 계층적 분류 (Hierarchical Classification)

```
┌─────────────────────────────────────────────────────────────────┐
│              단일 호출 vs 계층적 분류 비교                       │
│                                                                  │
│   ❌ 잘못된 접근: 한 번에 847개 중 선택                          │
│   → 토큰 수 폭발, 정확도 저하, 비용 증가                        │
│                                                                  │
│   ✅ 올바른 접근: 5단계 계층적 분류                              │
│                                                                  │
│   Step 1: 학년 분류 (20개 중 1개)                                │
│           "이 문제는 어느 학년 수준인가요?"                      │
│           → 고등수학(상)                                         │
│                                                                  │
│   Step 2: 대단원 분류 (5~8개 중 1개)                             │
│           "고등수학(상)에서 어느 대단원인가요?"                  │
│           → 방정식과 부등식                                      │
│                                                                  │
│   Step 3: 중단원 분류 (3~5개 중 1개)                             │
│           "방정식과 부등식에서 어느 중단원인가요?"               │
│           → 이차방정식                                           │
│                                                                  │
│   Step 4: 소단원 분류 (2~4개 중 1개)                             │
│           "이차방정식에서 어느 소단원인가요?"                    │
│           → 판별식                                               │
│                                                                  │
│   Step 5: 유형 분류 (1~3개 중 1개)                               │
│           "판별식에서 어느 유형인가요?"                          │
│           → 근의 개수 판별                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**효과**:
- 각 단계에서 선택지 수: 최대 20개 (vs 847개)
- 정확도 향상: 작은 선택지에서 집중 분류
- 비용 절감: 컨텍스트 크기 감소

### 3.2.3 단일 호출 최적화 방안

계층적 분류의 단점: API 호출 5회 → 비용/시간 증가

**대안: Structured Output으로 한 번에 처리**

```python
# 프롬프트 설계
SYSTEM_PROMPT = """
당신은 한국 수학 교육과정 전문가입니다.
문제를 분석하여 아래 분류 체계에 따라 태깅해주세요.

## 분류 체계 (수학비서 기준)
{math_tree_summary}  # 요약된 트리 구조

## 출력 형식
반드시 아래 JSON 형식으로만 응답하세요:
{
  "grade": "학년명 (예: 고등수학(상))",
  "majorUnit": "대단원명",
  "middleUnit": "중단원명",
  "minorUnit": "소단원명",
  "type": "유형명",
  "difficulty": 1-5,
  "confidence": 0.0-1.0,
  "reasoning": "분류 근거 한 줄 설명"
}
"""

USER_PROMPT = """
다음 수학 문제를 분류해주세요:

{problem_text}

{problem_image_description}  # 이미지가 있으면 설명 추가
"""
```

### 3.2.4 math_tree.json을 LLM 컨텍스트로 활용

**문제**: 847개 노드를 모두 프롬프트에 넣으면 토큰 폭발

**해결책**: 요약 버전 생성

```python
def generate_tree_summary(tree: dict) -> str:
    """LLM 컨텍스트용 분류 체계 요약 생성"""

    summary = []

    for grade in tree["tree"]:
        grade_line = f"- {grade['name']}"
        major_units = [c['name'] for c in grade.get('children', [])]
        if major_units:
            grade_line += f": {', '.join(major_units[:5])}"
            if len(major_units) > 5:
                grade_line += f" 외 {len(major_units)-5}개"
        summary.append(grade_line)

    return "\n".join(summary)

# 출력 예시:
# - 중1-1: 소인수분해, 정수와 유리수
# - 중1-2: 기본 도형, 작도와 합동
# - 고등수학(상): 다항식, 방정식과 부등식, 도형의 방정식
# ...
```

**토큰 수 비교**:
- 전체 트리: ~15,000 토큰
- 요약 버전: ~500 토큰

### 3.2.5 실제 구현 코드

```python
# backend/app/services/ai/auto_tagger.py

from anthropic import Anthropic
from typing import Optional
import json

class AutoTagger:
    """LLM 기반 자동 태깅 서비스"""

    def __init__(self, api_key: str, math_tree: dict):
        self.client = Anthropic(api_key=api_key)
        self.tree_summary = self._generate_summary(math_tree)
        self.node_lookup = self._build_lookup(math_tree)

    def _generate_summary(self, tree: dict) -> str:
        """분류 체계 요약 생성"""
        lines = []
        for grade in tree["tree"]:
            children = grade.get("children", [])
            child_names = [c["name"] for c in children[:5]]
            line = f"• {grade['name']}: {', '.join(child_names)}"
            if len(children) > 5:
                line += f" 외 {len(children)-5}개"
            lines.append(line)
        return "\n".join(lines)

    def _build_lookup(self, tree: dict) -> dict:
        """이름 → ID 매핑 테이블 구축"""
        lookup = {}
        def traverse(node, path=[]):
            lookup[node["name"].lower()] = {
                "id": node["id"],
                "path": path + [node["name"]]
            }
            for child in node.get("children", []):
                traverse(child, path + [node["name"]])

        for grade in tree["tree"]:
            traverse(grade)
        return lookup

    async def tag_problem(
        self,
        problem_text: str,
        problem_image: Optional[str] = None
    ) -> dict:
        """문제 자동 태깅"""

        system_prompt = f"""당신은 한국 수학 교육과정 분류 전문가입니다.

## 분류 체계 (수학비서)
{self.tree_summary}

## 분류 규칙
1. 학년(grade): 문제 수준에 맞는 학년 선택
2. 대단원(majorUnit): 주요 개념 영역
3. 중단원(middleUnit): 세부 개념
4. 소단원(minorUnit): 구체적 주제
5. 유형(type): 문제 풀이 유형
6. 난이도(difficulty): 1(쉬움)~5(어려움)

## 출력 형식 (JSON만)
{{"grade": "...", "majorUnit": "...", "middleUnit": "...", "minorUnit": "...", "type": "...", "difficulty": 3, "confidence": 0.9, "reasoning": "..."}}
"""

        user_prompt = f"다음 수학 문제를 분류해주세요:\n\n{problem_text}"

        response = self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=500,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}]
        )

        # JSON 파싱
        result_text = response.content[0].text
        result = json.loads(result_text)

        # ID 매핑 추가
        result["gradeId"] = self._lookup_id(result.get("grade"))
        result["majorUnitId"] = self._lookup_id(result.get("majorUnit"))
        result["middleUnitId"] = self._lookup_id(result.get("middleUnit"))
        result["minorUnitId"] = self._lookup_id(result.get("minorUnit"))
        result["typeId"] = self._lookup_id(result.get("type"))

        return result

    def _lookup_id(self, name: str) -> Optional[int]:
        """이름으로 ID 조회"""
        if not name:
            return None
        entry = self.node_lookup.get(name.lower())
        return entry["id"] if entry else None
```

## 3.3 정확도 예측 및 개선 방안

### 3.3.1 예상 정확도

| 레벨 | 예상 정확도 | 근거 |
|------|------------|------|
| 학년 | 95%+ | 문제 난이도로 쉽게 판별 |
| 대단원 | 90%+ | 핵심 개념으로 분류 가능 |
| 중단원 | 85%+ | 세부 개념 구분 필요 |
| 소단원 | 75%+ | 미세한 차이 구분 어려움 |
| 유형 | 70%+ | 풀이 방법 이해 필요 |

**전체 정확 매칭 (5레벨 모두)**: ~60%
**상위 3레벨 정확 매칭**: ~80%

### 3.3.2 정확도 개선 방안

```
┌─────────────────────────────────────────────────────────────────┐
│                    정확도 개선 전략                              │
│                                                                  │
│   1️⃣  Few-shot Learning                                         │
│       각 카테고리별 예시 문제 2~3개 제공                         │
│       "소수의 정의" 예시: "12를 소수로 나타내면?"               │
│                                                                  │
│   2️⃣  벡터 검색 보조                                            │
│       유사 문제의 기존 태그를 참고                               │
│       "비슷한 문제 3개가 모두 '판별식' 태그 → 신뢰도 ↑"         │
│                                                                  │
│   3️⃣  인간 피드백 학습                                          │
│       사용자가 수정한 태그를 저장                                │
│       축적된 수정 사례로 프롬프트 개선                           │
│                                                                  │
│   4️⃣  신뢰도 임계값                                             │
│       confidence < 0.7 → 사용자 확인 요청                       │
│       confidence >= 0.9 → 자동 승인 옵션                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3.3 비용 분석

**Claude 3.5 Sonnet 기준**:
- 입력: ~$3/1M 토큰
- 출력: ~$15/1M 토큰

**문제당 예상 토큰**:
- 입력 (프롬프트 + 문제): ~800 토큰
- 출력 (JSON 결과): ~100 토큰

**1000문제 처리 비용**:
- 입력: 800K 토큰 × $3/1M = $2.4
- 출력: 100K 토큰 × $15/1M = $1.5
- **총 비용: ~$4/1000문제**

## 3.4 LLM 자동 태깅 도입 권장 사항

### 결론: **강력 권장** ✅

**가능 여부**: 완전히 가능

**우리 math_tree.json 활용 방법**:
1. 요약 버전을 프롬프트에 포함
2. 이름→ID 매핑 테이블 구축
3. LLM 응답을 ID로 변환

**구현 우선순위**: **P0 (최우선)**

**의존성**:
- Mathpix가 먼저 필요 (텍스트 추출)
- 벡터 검색과 시너지 (정확도 보조)

---

# Part 4: 종합 결론 및 권장 구현 순서

## 4.1 세 기술의 시너지

```
┌─────────────────────────────────────────────────────────────────┐
│                    기술 시너지 다이어그램                        │
│                                                                  │
│   ┌─────────────┐                                               │
│   │   Mathpix   │ ─────────────────────────────────────────┐    │
│   │  (OCR)      │                                          │    │
│   └──────┬──────┘                                          │    │
│          │ 텍스트 추출                                      │    │
│          ▼                                                  │    │
│   ┌─────────────┐      ┌─────────────┐                     │    │
│   │  LLM 태깅   │ ←──→ │  벡터 검색  │                     │    │
│   │  (Claude)   │      │ (pgvector)  │                     │    │
│   └──────┬──────┘      └──────┬──────┘                     │    │
│          │                    │                             │    │
│          │ 분류 결과          │ 유사도/중복                 │    │
│          │                    │                             │    │
│          └────────┬───────────┘                             │    │
│                   ▼                                         │    │
│          ┌─────────────────┐                                │    │
│          │   문제 데이터    │                                │    │
│          │  • 텍스트       │ ←────────────────────────────┘    │
│          │  • LaTeX        │   원본 이미지 보존                │
│          │  • 분류 태그    │                                   │
│          │  • 임베딩 벡터  │                                   │
│          └─────────────────┘                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 4.2 권장 구현 순서

```
Week 1: Mathpix 연동
├── Mathpix API 서비스 구현
├── PDF 라벨링 파이프라인에 통합
└── 결과: 이미지 → 텍스트 변환 가능

Week 2: LLM 자동 태깅
├── AutoTagger 서비스 구현
├── math_tree.json 연동
└── 결과: 문제 → 분류 태그 자동 생성

Week 3: (선택) 벡터 검색
├── 임베딩 생성 파이프라인
├── faiss 또는 pgvector 연동
└── 결과: 중복 탐지, 유사 문제 추천

Week 4: 피드형 검수 UI
├── AI 태그 표시 UI
├── 승인/수정 워크플로우
└── 결과: 10초 검수 달성
```

## 4.3 최종 권장 사항

| 기술 | 권장 | 우선순위 | 비용/월 |
|------|------|---------|---------|
| **Mathpix OCR** | ✅ 강력 권장 | P0 | $10~20 |
| **LLM 자동 태깅** | ✅ 강력 권장 | P0 | $4~10 |
| **벡터 검색** | ⭕ 권장 | P1 | $0.02 |

**총 예상 월 비용**: $15~35 (매우 합리적)

---

**작성**: Claude Code (Opus)
**분석 깊이**: Deep Dive
**최종 업데이트**: 2025-12-02
