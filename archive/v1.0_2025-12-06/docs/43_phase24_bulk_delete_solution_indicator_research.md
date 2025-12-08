# Phase 24 연구 리포트: 일괄 삭제 & 해설 연결 표시

---

## Executive Summary

크롭 문제은행의 UX 개선을 위한 두 가지 기능에 대한 심층 연구 결과입니다:

1. **일괄 삭제 (Bulk Delete)**: 여러 문제를 한 번에 선택하여 삭제
2. **해설 연결 표시 (Solution Linking Indicator)**: 해설이 연결된 문제와 그렇지 않은 문제 구별

---

## 1. 현재 시스템 분석

### 1.1 현재 삭제 기능 구현 상태

#### Backend API (`export.py:403-442`)

```python
@router.delete("/documents/{document_id}/problems/{page_index}/{group_id}")
async def delete_problem(document_id: str, page_index: int, group_id: str):
    """특정 문제 삭제 (Phase 5)"""
    # PNG 이미지 파일 삭제
    # 메타데이터 JSON 파일 삭제
    return {"message": "success"}
```

**현재 한계:**
- 한 번에 하나의 문제만 삭제 가능
- 여러 문제 삭제 시 N번의 API 호출 필요
- 네트워크 오버헤드 및 UX 저하

#### Frontend (`CropProblemBank.tsx:51-69`)

```typescript
const handleDelete = async (problem: ExportedProblem) => {
  if (!confirm('이 문제를 삭제하시겠습니까?')) return;
  await deleteProblemMutation.mutateAsync({...});
};
```

**현재 UI:**
- 각 문제 카드에 개별 삭제 버튼
- 멀티 선택 기능 없음
- 삭제 전 개별 확인 대화상자

### 1.2 기존 해설 연결 시스템 (Phase 22)

**중요 발견**: Phase 22에서 이미 완전한 문제-해설 매칭 시스템이 구현되어 있습니다!

#### 데이터 구조

```typescript
// frontend/src/api/client.ts (lines 74-88)
export interface GroupLink {
  linkedGroupId: string;      // 연결된 그룹 ID
  linkedDocumentId: string;   // 연결된 문서 ID
  linkedPageIndex: number;    // 연결된 페이지
  linkedName: string;         // 표시 이름
  linkType: 'problem' | 'solution';  // 역할
  linkedAt: number;           // 연결 시간
}

export interface ProblemGroup {
  id: string;
  link?: GroupLink;  // ← 이미 정의됨!
}
```

#### 매칭 세션 저장소

```
{DATASET_ROOT}/
├── matching/
│   └── {sessionId}.json     # 매칭 세션 데이터
└── _system/
    └── document_pairs.json  # 문서 페어 정보
```

---

## 2. 일괄 삭제 기능 설계

### 2.1 사용자 워크플로우

```
┌─────────────────────────────────────────────────────────────────┐
│  문제은행 화면                                                    │
├─────────────────────────────────────────────────────────────────┤
│  [검색...]  [문서별 ▼]  [그리드 ▣ / 목록 ☰]  [✓ 선택 모드]      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ☑ 3개 선택됨          [전체 선택] [선택 해제] [삭제]     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────┐                        │
│  │ ☑ │  │ ☐ │  │ ☑ │  │ ☐ │  │ ☑ │  ← 체크박스                │
│  │ 🖼 │  │ 🖼 │  │ 🖼 │  │ 🖼 │  │ 🖼 │                        │
│  │#1  │  │#2  │  │#3  │  │#4  │  │#5  │                        │
│  └────┘  └────┘  └────┘  └────┘  └────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Backend API 설계

#### 새 엔드포인트

```python
# POST 사용 (DELETE는 body 지원이 불안정)
@router.post("/problems/bulk-delete")
async def bulk_delete_problems(
    request: BulkDeleteRequest
) -> BulkDeleteResponse:
    """
    여러 문제 일괄 삭제

    Request Body:
    {
        "problems": [
            {"document_id": "doc1", "page_index": 0, "group_id": "L1"},
            {"document_id": "doc1", "page_index": 1, "group_id": "R2"},
            {"document_id": "doc2", "page_index": 5, "group_id": "L3"}
        ]
    }

    Response:
    {
        "success": true,
        "deleted_count": 3,
        "failed_count": 0,
        "errors": []
    }
    """
```

#### Pydantic 모델

```python
from pydantic import BaseModel
from typing import List, Optional

class ProblemIdentifier(BaseModel):
    document_id: str
    page_index: int
    group_id: str

class BulkDeleteRequest(BaseModel):
    problems: List[ProblemIdentifier]

class BulkDeleteResponse(BaseModel):
    success: bool
    deleted_count: int
    failed_count: int
    errors: List[str]
```

#### 구현 로직

```python
@router.post("/problems/bulk-delete")
async def bulk_delete_problems(request: BulkDeleteRequest):
    deleted = 0
    failed = 0
    errors = []

    for problem in request.problems:
        try:
            doc_dir = config.get_document_dir(problem.document_id)
            problems_dir = doc_dir / "problems"
            base_name = f"{problem.document_id}_p{problem.page_index:04d}_{problem.group_id}"

            # PNG 삭제
            image_file = problems_dir / f"{base_name}.png"
            if image_file.exists():
                image_file.unlink()

            # JSON 삭제
            meta_file = problems_dir / f"{base_name}.json"
            if meta_file.exists():
                meta_file.unlink()

            deleted += 1

        except Exception as e:
            failed += 1
            errors.append(f"{problem.document_id}/{problem.group_id}: {str(e)}")

    return BulkDeleteResponse(
        success=failed == 0,
        deleted_count=deleted,
        failed_count=failed,
        errors=errors
    )
```

### 2.3 Frontend 구현

#### API 클라이언트 (`client.ts`)

```typescript
// 새 타입 정의
export interface BulkDeleteRequest {
  problems: Array<{
    document_id: string;
    page_index: number;
    group_id: string;
  }>;
}

export interface BulkDeleteResponse {
  success: boolean;
  deleted_count: number;
  failed_count: number;
  errors: string[];
}

// API 함수
bulkDeleteProblems: async (request: BulkDeleteRequest): Promise<BulkDeleteResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/export/problems/bulk-delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return response.json();
},
```

#### 새 Hook (`useDocuments.ts`)

```typescript
export function useBulkDeleteProblems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.bulkDeleteProblems,
    onSuccess: (result) => {
      // 모든 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['problems'] });
      queryClient.invalidateQueries({ queryKey: ['allExportedProblems'] });
    },
  });
}
```

#### UI 컴포넌트 수정 (`CropProblemBank.tsx`)

```typescript
export function CropProblemBank() {
  // 기존 상태...

  // 새 상태: 선택 모드
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedProblems, setSelectedProblems] = useState<Set<string>>(new Set());

  const bulkDeleteMutation = useBulkDeleteProblems();

  // 문제 고유 키 생성
  const getProblemKey = (p: ExportedProblem) =>
    `${p.document_id}::${p.page_index}::${p.group_id}`;

  // 선택 토글
  const toggleSelect = (problem: ExportedProblem) => {
    const key = getProblemKey(problem);
    const newSelected = new Set(selectedProblems);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedProblems(newSelected);
  };

  // 전체 선택
  const selectAll = () => {
    const allKeys = data?.problems.map(getProblemKey) || [];
    setSelectedProblems(new Set(allKeys));
  };

  // 전체 해제
  const deselectAll = () => {
    setSelectedProblems(new Set());
  };

  // 일괄 삭제
  const handleBulkDelete = async () => {
    if (selectedProblems.size === 0) return;

    if (!confirm(`${selectedProblems.size}개의 문제를 삭제하시겠습니까?`)) return;

    // 키에서 문제 정보 파싱
    const problemsToDelete = Array.from(selectedProblems).map(key => {
      const [document_id, page_index, group_id] = key.split('::');
      return { document_id, page_index: parseInt(page_index), group_id };
    });

    try {
      const result = await bulkDeleteMutation.mutateAsync({ problems: problemsToDelete });
      showToast(`${result.deleted_count}개 문제가 삭제되었습니다`, 'success');
      setSelectedProblems(new Set());
      setIsSelectMode(false);
    } catch (error) {
      showToast('삭제 중 오류가 발생했습니다', 'error');
    }
  };

  // ...
}
```

---

## 3. 해설 연결 표시 기능 설계

### 3.1 데이터 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│                    Phase 22 매칭 시스템                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  MatchingSession                                        │    │
│  │  - matchedPairs: [                                      │    │
│  │      { problem: {...}, solution: {...}, matchedAt }     │    │
│  │    ]                                                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              ↓                                  │
│         저장: {DATASET_ROOT}/matching/{sessionId}.json          │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                    문제 메타데이터 확장                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  {document_id}_p{pageIdx}_{groupId}.json                │    │
│  │  {                                                      │    │
│  │    "document_id": "...",                                │    │
│  │    "linked_solution": {        ← 새 필드               │    │
│  │      "documentId": "해설문서",                          │    │
│  │      "groupId": "L1",                                   │    │
│  │      "pageIndex": 45                                    │    │
│  │    }                                                    │    │
│  │  }                                                      │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                    프론트엔드 표시                               │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │ ✓ 해설연결 │  │            │  │ ✓ 해설연결 │                │
│  │  🖼 문제1  │  │  🖼 문제2  │  │  🖼 문제3  │                │
│  │  p.10 #1  │  │  p.10 #2  │  │  p.11 #1  │                │
│  └────────────┘  └────────────┘  └────────────┘                │
│    [연결됨]        [미연결]       [연결됨]                      │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 구현 방법

#### Option A: API 응답 시 매칭 정보 조회 (권장)

```python
# export.py - list_all_exported_problems 함수 수정

async def list_all_exported_problems(...):
    # ... 기존 코드 ...

    # 매칭 세션에서 연결 정보 로드
    linked_solutions = load_all_linked_solutions()

    for problem_data in all_problems:
        key = f"{problem_data['document_id']}:{problem_data['page_index']}:{problem_data['group_id']}"
        if key in linked_solutions:
            problem_data['linked_solution'] = linked_solutions[key]
        else:
            problem_data['linked_solution'] = None

    return {"problems": all_problems, ...}


def load_all_linked_solutions() -> dict:
    """모든 매칭 세션에서 연결 정보 수집"""
    linked = {}
    matching_dir = config.DATASET_ROOT / "matching"

    if not matching_dir.exists():
        return linked

    for session_file in matching_dir.glob("*.json"):
        try:
            session = load_json(session_file)
            for match in session.get("matchedPairs", []):
                problem = match.get("problem", {})
                solution = match.get("solution", {})

                key = f"{problem.get('documentId')}:{problem.get('pageIndex')}:{problem.get('groupId')}"
                linked[key] = {
                    "documentId": solution.get("documentId"),
                    "groupId": solution.get("groupId"),
                    "pageIndex": solution.get("pageIndex"),
                    "linkedAt": match.get("matchedAt")
                }
        except Exception:
            continue

    return linked
```

#### Option B: 메타데이터 파일에 영구 저장

문제 확정 시점에 linked_solution 정보를 JSON 메타데이터에 저장:

```python
# export.py - export_single_group 함수 수정

async def export_single_group(...):
    # ... 기존 코드 ...

    # 매칭 정보 확인
    linked_solution = find_linked_solution(document_id, page_index, group_id)

    # 메타데이터 저장
    problem_meta = {
        "document_id": document_id,
        "page_index": page_index,
        "group_id": group_id,
        # ... 기존 필드 ...
        "linked_solution": linked_solution  # 새 필드
    }

    save_json(meta_file, problem_meta)
```

### 3.3 Frontend 타입 확장

```typescript
// client.ts
export interface LinkedSolutionInfo {
  documentId: string;
  groupId: string;
  pageIndex: number;
  linkedAt?: string;
}

export interface ExportedProblem {
  // 기존 필드...
  document_id: string;
  page_index: number;
  group_id: string;
  image_path: string;

  // 새 필드
  linked_solution?: LinkedSolutionInfo | null;
}

// 편의 함수
export const hasSolution = (problem: ExportedProblem): boolean =>
  !!problem.linked_solution;
```

### 3.4 UI 디자인

#### 그리드 뷰

```typescript
function ProblemCard({ problem, ...props }: ProblemCardProps) {
  const hasSol = !!problem.linked_solution;

  return (
    <div className={`relative rounded-lg border ${hasSol ? 'border-green-200' : ''}`}>
      {/* 해설 연결 뱃지 */}
      {hasSol && (
        <div className="absolute top-2 left-2 z-10">
          <span className="inline-flex items-center gap-1 px-2 py-1
                          bg-green-100 text-green-700 text-xs rounded-full">
            <CheckCircle className="w-3 h-3" />
            해설 연결
          </span>
        </div>
      )}

      {/* 이미지 */}
      <div className="aspect-[4/3] bg-gray-100">
        <img src={imageUrl} />
      </div>

      {/* 정보 */}
      <div className="p-2">
        <p className="font-medium">{displayName}</p>
        {hasSol && (
          <p className="text-xs text-green-600 mt-1">
            → {problem.linked_solution!.documentId} p.{problem.linked_solution!.pageIndex + 1}
          </p>
        )}
      </div>
    </div>
  );
}
```

#### 리스트 뷰

```typescript
// 리스트 아이템에 아이콘 추가
<div className="flex items-center gap-4">
  {/* 썸네일 */}
  <div className="w-16 h-16">...</div>

  {/* 정보 */}
  <div className="flex-1">
    <p className="font-medium">{displayName}</p>
    <p className="text-sm text-gray-500">{bookName}</p>
  </div>

  {/* 연결 상태 */}
  <div className="flex items-center gap-2">
    {hasSol ? (
      <span className="flex items-center gap-1 text-green-600 text-sm">
        <LinkIcon className="w-4 h-4" />
        해설 연결됨
      </span>
    ) : (
      <span className="text-gray-400 text-sm">미연결</span>
    )}
  </div>

  {/* 삭제 버튼 */}
  <button>...</button>
</div>
```

#### 필터 옵션 추가

```typescript
// 필터 상태
const [linkFilter, setLinkFilter] = useState<'all' | 'linked' | 'unlinked'>('all');

// 필터링된 문제 목록
const filteredProblems = useMemo(() => {
  if (!data?.problems) return [];

  return data.problems.filter(p => {
    if (linkFilter === 'linked') return !!p.linked_solution;
    if (linkFilter === 'unlinked') return !p.linked_solution;
    return true;
  });
}, [data?.problems, linkFilter]);

// UI
<select value={linkFilter} onChange={e => setLinkFilter(e.target.value)}>
  <option value="all">전체</option>
  <option value="linked">해설 연결됨</option>
  <option value="unlinked">해설 미연결</option>
</select>
```

---

## 4. 구현 우선순위 권장

### Phase 24A: 일괄 삭제 (먼저 구현 권장)

**예상 소요 시간**: 2-3시간

**이유**:
- 독립적인 기능 (다른 시스템 의존성 없음)
- 즉각적인 UX 개선 효과
- 구현 복잡도 낮음

**수정 파일**:
1. `backend/app/routers/export.py` - 새 API 엔드포인트
2. `frontend/src/api/client.ts` - API 함수 추가
3. `frontend/src/hooks/useDocuments.ts` - 새 뮤테이션 훅
4. `frontend/src/components/problembank/CropProblemBank.tsx` - UI 수정

### Phase 24B: 해설 연결 표시 (후속 구현)

**예상 소요 시간**: 3-4시간

**이유**:
- Phase 22 매칭 시스템과 통합 필요
- 데이터 구조 확장 필요
- 사용자 가치는 높지만 복잡도도 높음

**수정 파일**:
1. `backend/app/routers/export.py` - 매칭 정보 조회 로직
2. `frontend/src/api/client.ts` - 타입 확장
3. `frontend/src/components/problembank/CropProblemBank.tsx` - UI 확장

---

## 5. 고려사항 및 위험요소

### 5.1 일괄 삭제

| 고려사항 | 대응 방안 |
|----------|-----------|
| 실수로 대량 삭제 | 2단계 확인 대화상자 (선택 수 표시) |
| 부분 실패 처리 | 결과에 실패 목록 포함, 성공한 것만 UI 갱신 |
| 성능 (대량 삭제) | 서버에서 순차 처리, 프론트는 로딩 상태 표시 |
| Undo 기능 | v1에서는 미구현, 향후 휴지통 기능 고려 |

### 5.2 해설 연결 표시

| 고려사항 | 대응 방안 |
|----------|-----------|
| 매칭 세션 많을 때 성능 | 인덱싱 또는 캐싱 도입 검토 |
| 연결 정보 동기화 | 매칭 시 메타데이터 파일도 업데이트 |
| 연결 해제 시 | linked_solution을 null로 업데이트 |
| 해설 문서 삭제 시 | 연결 정보 정리 로직 필요 (orphan 처리) |

---

## 6. 테스트 체크리스트

### 일괄 삭제

- [ ] 단일 문제 선택 후 삭제
- [ ] 여러 문제 선택 후 삭제 (같은 문서)
- [ ] 여러 문제 선택 후 삭제 (다른 문서)
- [ ] 전체 선택 → 삭제
- [ ] 선택 모드 토글 시 선택 초기화
- [ ] 삭제 후 목록 자동 갱신
- [ ] 존재하지 않는 문제 삭제 시도 (에러 처리)
- [ ] 빈 선택으로 삭제 버튼 클릭 (비활성화 확인)

### 해설 연결 표시

- [ ] 연결된 문제 - 뱃지 표시
- [ ] 미연결 문제 - 뱃지 없음
- [ ] 필터: "해설 연결됨"만 표시
- [ ] 필터: "해설 미연결"만 표시
- [ ] 연결 정보 클릭 시 해설로 이동 (향후)
- [ ] 매칭 후 실시간 업데이트

---

## 7. 결론

### 핵심 발견

1. **일괄 삭제**는 단순한 CRUD 확장으로 빠르게 구현 가능
2. **해설 연결 표시**는 Phase 22의 기존 인프라를 활용하여 구현 가능
3. 두 기능 모두 기존 아키텍처를 크게 변경하지 않고 추가 가능

### 권장 구현 순서

```
Phase 24A: 일괄 삭제 기능
          ↓
    (사용자 피드백 수집)
          ↓
Phase 24B: 해설 연결 표시
          ↓
Phase 24C: 해설 미리보기/이동 (향후)
```

---

*작성: 2025-12-02*
*Phase: 24 연구 리포트*
*상태: 연구 완료, 구현 대기*
