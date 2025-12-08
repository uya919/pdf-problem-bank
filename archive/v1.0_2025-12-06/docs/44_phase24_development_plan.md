# Phase 24 개발 계획: 문제은행 UX 개선

---

## 목표

크롭 문제은행의 사용성을 대폭 개선하는 3가지 기능 구현:

1. **문제 이름 표시 개선** - "베이직쎈_공통수학2_p18_1번" 형식
2. **일괄 삭제 기능** - 여러 문제를 한 번에 선택하여 삭제
3. **해설 연결 표시** - 해설이 연결된 문제와 미연결 문제 구별

---

## 현재 상태 분석

### 1. 문제 이름 표시 문제

**groups 폴더** (라벨링 시 저장):
```json
{
  "problemInfo": {
    "bookName": "베이직쎈",
    "course": "2-2",
    "page": 12,
    "problemNumber": "1",
    "displayName": "베이직쎈 - 2-2, 12p, 1"
  }
}
```

**problems 폴더** (확정 시 저장):
```json
{
  "document_id": "베이직쎈 중등 2-1",
  "page_index": 11,
  "group_id": "L1",
  "metadata": {}  // ← problemInfo가 복사되지 않음!
}
```

**핵심 문제**: 확정 시 `problemInfo`가 `metadata`로 복사되지 않음

### 2. 삭제 기능

- 현재: 한 번에 하나씩만 삭제 가능
- 목표: 여러 개 선택 후 일괄 삭제

### 3. 해설 연결

- Phase 22에 매칭 시스템 이미 구현됨
- 문제은행에서 연결 여부 시각적 표시 필요

---

## 단계별 개발 계획

### Phase 24-A: 문제 이름 표시 개선 (2시간)

#### Step 1: 확정 시 problemInfo 복사

**파일**: `backend/app/routers/export.py`

`export_single_group` 함수에서 groups 데이터의 `problemInfo`를 problems 메타데이터에 복사:

```python
# export_single_group 함수 수정
async def export_single_group(document_id: str, page_index: int, group_id: str):
    # groups 파일에서 해당 그룹 정보 로드
    groups_file = config.get_document_dir(document_id) / "groups" / f"page_{page_index:04d}_groups.json"
    groups_data = load_json(groups_file)

    target_group = None
    for group in groups_data.get("groups", []):
        if group["id"] == group_id:
            target_group = group
            break

    # problemInfo 추출
    problem_info = target_group.get("problemInfo", {}) if target_group else {}

    # 메타데이터 저장 시 포함
    problem_meta = {
        "document_id": document_id,
        "page_index": page_index,
        "group_id": group_id,
        # ... 기존 필드 ...
        "problem_info": problem_info,  # 새로 추가!
    }
```

#### Step 2: displayName 형식 변경

**원하는 형식**: `베이직쎈_공통수학2_p18_1번`

**파일**: `frontend/src/components/problembank/CropProblemBank.tsx`

```typescript
// 표시 이름 생성 함수
const formatProblemName = (problem: ExportedProblem): string => {
  const info = problem.problem_info;

  if (info?.bookName && info?.course && info?.page && info?.problemNumber) {
    // 완전한 정보가 있을 때: "베이직쎈_공통수학2_p18_1번"
    return `${info.bookName}_${info.course}_p${info.page}_${info.problemNumber}번`;
  }

  // 정보 없을 때: 파일명 기반 폴백
  // "베이직쎈 중등 2-1_p0011_L1" → "베이직쎈 중등 2-1_p12_L1"
  const bookName = problem.document_id.replace(/_\d{6}_\d{6}.*$/, ''); // 날짜 제거
  return `${bookName}_p${problem.page_index + 1}_${problem.group_id}`;
};
```

#### Step 3: UI 적용

```typescript
function ProblemCard({ problem, ... }: ProblemCardProps) {
  const displayName = formatProblemName(problem);

  return (
    <div>
      <p className="font-medium">{displayName}</p>
      {/* ... */}
    </div>
  );
}
```

---

### Phase 24-B: 일괄 삭제 기능 (2-3시간)

#### Step 1: Backend API

**파일**: `backend/app/routers/export.py`

```python
from pydantic import BaseModel
from typing import List

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

@router.post("/problems/bulk-delete", response_model=BulkDeleteResponse)
async def bulk_delete_problems(request: BulkDeleteRequest):
    """여러 문제 일괄 삭제"""
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

#### Step 2: Frontend API 클라이언트

**파일**: `frontend/src/api/client.ts`

```typescript
// 타입 정의
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
  if (!response.ok) throw new Error('Bulk delete failed');
  return response.json();
},
```

#### Step 3: Hook

**파일**: `frontend/src/hooks/useDocuments.ts`

```typescript
export function useBulkDeleteProblems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.bulkDeleteProblems,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['problems'] });
      queryClient.invalidateQueries({ queryKey: ['allExportedProblems'] });
    },
  });
}
```

#### Step 4: UI 컴포넌트

**파일**: `frontend/src/components/problembank/CropProblemBank.tsx`

```typescript
export function CropProblemBank() {
  // 기존 상태...

  // 새 상태: 선택 모드
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedProblems, setSelectedProblems] = useState<Set<string>>(new Set());

  const bulkDeleteMutation = useBulkDeleteProblems();

  // 문제 고유 키
  const getProblemKey = (p: ExportedProblem) =>
    `${p.document_id}::${p.page_index}::${p.group_id}`;

  // 선택 토글
  const toggleSelect = (problem: ExportedProblem) => {
    const key = getProblemKey(problem);
    const newSelected = new Set(selectedProblems);
    newSelected.has(key) ? newSelected.delete(key) : newSelected.add(key);
    setSelectedProblems(newSelected);
  };

  // 전체 선택/해제
  const selectAll = () => setSelectedProblems(new Set(data?.problems.map(getProblemKey) || []));
  const deselectAll = () => setSelectedProblems(new Set());

  // 일괄 삭제
  const handleBulkDelete = async () => {
    if (selectedProblems.size === 0) return;
    if (!confirm(`${selectedProblems.size}개의 문제를 삭제하시겠습니까?`)) return;

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

  // UI에 선택 모드 토글, 체크박스, 삭제 버튼 추가
}
```

#### Step 5: UI 디자인

```
┌─────────────────────────────────────────────────────────────────┐
│  [검색...]  [문서별 ▼]  [그리드/목록]  [☐ 선택 모드]            │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ✓ 3개 선택됨    [전체 선택] [선택 해제] [🗑 선택 삭제]   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐                │
│  │☑      │  │☐      │  │☑      │  │☑      │                │
│  │  🖼    │  │  🖼    │  │  🖼    │  │  🖼    │                │
│  │베이직쎈 │  │베이직쎈 │  │베이직쎈 │  │베이직쎈 │                │
│  │_2-2_   │  │_2-2_   │  │_2-2_   │  │_2-2_   │                │
│  │p12_1번 │  │p12_2번 │  │p12_3번 │  │p12_4번 │                │
│  └────────┘  └────────┘  └────────┘  └────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

---

### Phase 24-C: 해설 연결 표시 (3-4시간)

#### Step 1: 매칭 정보 조회 로직

**파일**: `backend/app/routers/export.py`

```python
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

#### Step 2: API 응답에 포함

```python
@router.get("/all-problems")
async def list_all_exported_problems(...):
    # ... 기존 코드 ...

    # 매칭 정보 로드
    linked_solutions = load_all_linked_solutions()

    for problem_data in all_problems:
        key = f"{problem_data['document_id']}:{problem_data['page_index']}:{problem_data['group_id']}"
        problem_data['linked_solution'] = linked_solutions.get(key)

    return {"problems": all_problems, ...}
```

#### Step 3: Frontend 타입 확장

**파일**: `frontend/src/api/client.ts`

```typescript
export interface LinkedSolutionInfo {
  documentId: string;
  groupId: string;
  pageIndex: number;
  linkedAt?: number;
}

export interface ExportedProblem {
  // 기존 필드...
  linked_solution?: LinkedSolutionInfo | null;
}
```

#### Step 4: UI 표시

```typescript
function ProblemCard({ problem, ... }: ProblemCardProps) {
  const hasSolution = !!problem.linked_solution;

  return (
    <div className={`relative ${hasSolution ? 'border-green-200' : ''}`}>
      {/* 해설 연결 뱃지 */}
      {hasSolution && (
        <div className="absolute top-2 left-2 z-10">
          <span className="inline-flex items-center gap-1 px-2 py-0.5
                          bg-green-100 text-green-700 text-xs rounded-full">
            <LinkIcon className="w-3 h-3" />
            해설
          </span>
        </div>
      )}

      {/* 이미지 */}
      <div className="aspect-[4/3] bg-gray-100">
        <img src={imageUrl} />
      </div>

      {/* 정보 */}
      <div className="p-2">
        <p className="font-medium text-sm">{displayName}</p>
        {hasSolution && (
          <p className="text-xs text-green-600">
            → {problem.linked_solution!.documentId.slice(0, 10)}...
          </p>
        )}
      </div>
    </div>
  );
}
```

#### Step 5: 필터 옵션

```typescript
// 필터 상태 추가
const [linkFilter, setLinkFilter] = useState<'all' | 'linked' | 'unlinked'>('all');

// 필터링
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
  <option value="linked">해설 있음</option>
  <option value="unlinked">해설 없음</option>
</select>
```

---

## 최종 UI 디자인

```
┌─────────────────────────────────────────────────────────────────────────┐
│  크롭 문제은행                                              총 15개 문제 │
├─────────────────────────────────────────────────────────────────────────┤
│  [🔍 검색...]  [문서별 ▼]  [해설: 전체 ▼]  [▣/☰]  [☐ 선택 모드]       │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  ✓ 3개 선택됨          [전체 선택]  [선택 해제]  [🗑 선택 삭제]    │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ── 베이직쎈 중등 2-1 (7개) ──────────────────────────────────────────  │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │☑  🔗 해설   │  │☐            │  │☑  🔗 해설   │                  │
│  │             │  │             │  │             │                  │
│  │    🖼 이미지   │  │    🖼 이미지   │  │    🖼 이미지   │                  │
│  │             │  │             │  │             │                  │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤                  │
│  │베이직쎈_2-2  │  │베이직쎈_2-2  │  │베이직쎈_2-2  │                  │
│  │_p12_1번     │  │_p12_2번     │  │_p12_3번     │                  │
│  │→ 해설 p.45  │  │             │  │→ 해설 p.46  │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 구현 순서 및 예상 시간

| 단계 | 기능 | 예상 시간 | 의존성 |
|------|------|-----------|--------|
| **24-A** | 문제 이름 표시 개선 | 2시간 | 없음 |
| **24-B** | 일괄 삭제 기능 | 2-3시간 | 없음 |
| **24-C** | 해설 연결 표시 | 3-4시간 | Phase 22 |

**총 예상 시간**: 7-9시간

---

## 수정 파일 목록

### Phase 24-A
1. `backend/app/routers/export.py` - export_single_group 수정
2. `frontend/src/components/problembank/CropProblemBank.tsx` - displayName 포맷

### Phase 24-B
1. `backend/app/routers/export.py` - bulk-delete 엔드포인트 추가
2. `frontend/src/api/client.ts` - API 함수 추가
3. `frontend/src/hooks/useDocuments.ts` - useBulkDeleteProblems 훅
4. `frontend/src/components/problembank/CropProblemBank.tsx` - 선택 모드 UI

### Phase 24-C
1. `backend/app/routers/export.py` - 매칭 정보 조회 추가
2. `frontend/src/api/client.ts` - 타입 확장
3. `frontend/src/components/problembank/CropProblemBank.tsx` - 연결 표시 UI

---

## 테스트 체크리스트

### Phase 24-A
- [ ] 새로 확정한 문제에 problemInfo 저장됨
- [ ] "베이직쎈_2-2_p12_1번" 형식으로 표시
- [ ] problemInfo 없는 기존 문제도 폴백 표시

### Phase 24-B
- [ ] 선택 모드 토글 작동
- [ ] 체크박스로 개별 선택/해제
- [ ] 전체 선택/해제 작동
- [ ] 선택된 문제 카운트 표시
- [ ] 일괄 삭제 API 호출 성공
- [ ] 삭제 후 목록 자동 갱신

### Phase 24-C
- [ ] 해설 연결된 문제에 뱃지 표시
- [ ] 해설 정보 (문서명, 페이지) 표시
- [ ] "해설 있음/없음" 필터 작동
- [ ] 새 매칭 후 실시간 업데이트

---

*작성: 2025-12-02*
*Phase: 24 개발 계획*
*상태: 승인 대기*
