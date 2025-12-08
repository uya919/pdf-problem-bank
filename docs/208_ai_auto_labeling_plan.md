# Phase 55: AI 자동 라벨링 상세 계획

**문서 번호**: 208
**상위 문서**: [plan.md](plan.md)
**예상 시간**: 12시간
**비용**: 책 1권당 ~1,000원

---

## 목표

```
Before: PDF 업로드 → 수동 그룹핑 (30분) → 수동 연결 (20분) = 50분+
After:  PDF 업로드 → AI 자동 분석 → 검토/수정 (5분) = 5분
```

---

## Phase 55-A: AI 문제 분석 API (4시간)

### 구현 내용

```python
# backend/app/services/ai/problem_analyzer.py

async def analyze_page_with_ai(
    image_path: str,
    model: str = "gemini-1.5-flash"  # 또는 "claude-3-haiku"
) -> dict:
    """
    AI로 페이지 분석하여 문제 구조 추출

    Returns:
        {
            "problems": [
                {"number": "19", "y_percent": 15, "type": "child", "parent": "p1"},
                {"number": "20", "y_percent": 35, "type": "child", "parent": "p1"}
            ],
            "parents": [
                {"id": "p1", "y_percent": 5, "content": "두 다항식 A, B 정의"}
            ]
        }
    """
```

### API 엔드포인트

```
POST /api/ai/analyze-page
{
    "document_id": "doc_123",
    "page_number": 15,
    "model": "gemini"  // 또는 "claude"
}

Response:
{
    "success": true,
    "problems": [...],
    "parents": [...],
    "confidence": 0.94
}
```

### 프롬프트

```
이 수학 문제집 페이지를 분석해서 JSON으로 응답해줘.

1. 각 문제의 번호와 위치 (y좌표를 페이지 높이의 %로)
2. 모문제(공통 조건)가 있으면 식별하고, 어떤 문제들이 참조하는지
3. 문제 유형 (객관식/주관식/서술형)

JSON 형식:
{
  "problems": [
    {"number": "19", "y_percent": 15, "type": "child", "parent": "p1"}
  ],
  "parents": [
    {"id": "p1", "y_percent": 5, "content_summary": "조건 요약"}
  ]
}
```

---

## Phase 55-B: AI 해설 분석 API (2시간)

### 구현 내용

```python
# backend/app/services/ai/solution_analyzer.py

async def analyze_solution_page(
    image_path: str,
    model: str = "gemini-1.5-flash"
) -> dict:
    """
    해설 페이지 분석

    Returns:
        {
            "solutions": [
                {"problem_number": "19", "y_percent": 10},
                {"problem_number": "20", "y_percent": 45}
            ]
        }
    """
```

### 프롬프트

```
이 해설집 페이지를 분석해서 JSON으로 응답해줘.

각 해설이 몇 번 문제의 풀이인지, 위치(y좌표 %)를 알려줘.
여러 문제가 합쳐진 해설이면 "19-21"처럼 표시해.

JSON 형식:
{
  "solutions": [
    {"problem_number": "19", "y_percent": 10},
    {"problem_number": "20-21", "y_percent": 50}
  ]
}
```

---

## Phase 55-C: 자동 매칭 로직 (2시간)

### 구현 내용

```python
# backend/app/services/ai/auto_matcher.py

def auto_match_problems_solutions(
    problems: list,
    solutions: list
) -> list:
    """
    문제 번호 기반 자동 매칭

    Returns:
        [
            {
                "problem_number": "19",
                "solution_number": "19",
                "confidence": "high"
            }
        ]
    """

    links = []
    for prob in problems:
        # 정확히 일치
        exact = find_exact_match(prob["number"], solutions)
        if exact:
            links.append({
                "problem": prob,
                "solution": exact,
                "confidence": "high"
            })
            continue

        # 범위 매칭 (19번 → 19-21번 해설)
        range_match = find_range_match(prob["number"], solutions)
        if range_match:
            links.append({
                "problem": prob,
                "solution": range_match,
                "confidence": "medium"
            })

    return links
```

---

## Phase 55-D: 검토/수정 UI (4시간)

### 새로운 UI 컴포넌트

```
frontend/src/features/ai-labeling/
├── components/
│   ├── AIAnalysisButton.tsx      # "AI 분석 시작" 버튼
│   ├── AIResultReview.tsx        # 결과 검토 화면
│   ├── ConfidenceIndicator.tsx   # 신뢰도 표시
│   └── QuickEditPanel.tsx        # 빠른 수정 패널
├── hooks/
│   ├── useAIAnalysis.ts          # AI 분석 호출
│   └── useAutoMatch.ts           # 자동 매칭
└── types.ts
```

### 검토 화면 UI

```
┌─────────────────────────────────────────────────────────────┐
│  AI 분석 결과 검토                        페이지 15/200     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  [페이지 이미지 + AI 그룹 오버레이]                 │   │
│  │                                                     │   │
│  │   ┌─ 모문제 (94%) ─────────────────────────┐       │   │
│  │   │ 두 다항식 A=..., B=...                 │       │   │
│  │   └────────────────────────────────────────┘       │   │
│  │                                                     │   │
│  │   ┌─ 19번 (96%) ─┐    ┌─ 20번 (95%) ─┐            │   │
│  │   │ A+B          │    │ A-B          │            │   │
│  │   │ → 해설 19번  │    │ → 해설 20번  │            │   │
│  │   └──────────────┘    └──────────────┘            │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  문제 목록:                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ☑ 19번  모문제: [공통조건 ▼]  해설: [19번 ▼]  96%  │   │
│  │ ☑ 20번  모문제: [공통조건 ▼]  해설: [20번 ▼]  95%  │   │
│  │ ☑ 21번  모문제: [공통조건 ▼]  해설: [21번 ▼]  94%  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [← 이전] [✓ 모두 승인 (Enter)] [수정 모드 (E)] [다음 →]  │
└─────────────────────────────────────────────────────────────┘
```

### 단축키

| 키 | 기능 |
|----|------|
| `Enter` | 현재 페이지 승인, 다음으로 |
| `E` | 수정 모드 (기존 라벨링 UI) |
| `←` / `→` | 이전/다음 페이지 |
| `1-9` | 해당 번호 문제 선택 |
| `P` | 모문제 연결 변경 |
| `S` | 해설 연결 변경 |

---

## 비용 분석

| 모델 | 페이지당 | 책 1권 (200p) | 속도 |
|------|---------|---------------|------|
| Gemini Flash | ~$0.001 | ~$0.30 (400원) | 빠름 |
| Claude Haiku | ~$0.005 | ~$1.00 (1,400원) | 빠름 |
| Gemini Pro | ~$0.01 | ~$2.50 (3,500원) | 중간 |
| Claude Sonnet | ~$0.03 | ~$6.00 (8,000원) | 중간 |

**권장**: Gemini Flash로 시작, 정확도 부족 시 Pro/Sonnet 전환

---

## 실행 순서

```
1. 55-A (AI 문제 분석) ← 핵심, 먼저 구현
   ↓ 테스트: 단일 페이지 분석 확인
2. 55-B (AI 해설 분석)
   ↓ 테스트: 해설 페이지 분석 확인
3. 55-C (자동 매칭)
   ↓ 테스트: 문제-해설 매칭 확인
4. 55-D (검토 UI)
   ↓ 테스트: 전체 워크플로우 확인
```

---

## 관련 문서

- [207_parent_problem_context_feasibility_report.md](207_parent_problem_context_feasibility_report.md) - 모문제-하위문제 연결
- [reference/ai_automation/154_gemini_ai_automation_comprehensive_research.md](reference/ai_automation/154_gemini_ai_automation_comprehensive_research.md) - Gemini 연구

---

*승인 후 실행: "Phase 55-A 진행해줘"*
