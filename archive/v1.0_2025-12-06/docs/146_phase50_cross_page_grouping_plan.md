# Phase 50: 페이지간 그룹화 개발 계획 (안정성 중심)

**날짜**: 2025-12-05
**원칙**: 하위 호환성 100% 유지, 롤백 가능, 단계별 검증

---

## 설계 원칙

### 1. 하위 호환성 (Backward Compatibility)
```
✅ 기존 단일 페이지 그룹: 변경 없이 동작
✅ 기존 크로스 컬럼 그룹 (X): 변경 없이 동작
✅ 기존 groups.json 포맷: 그대로 유지
✅ 새 기능은 선택적 필드로 추가
```

### 2. 점진적 구현 (Incremental)
```
Phase 50-A: 데이터 모델만 확장 (UI 변경 없음)
Phase 50-B: 내보내기 로직 확장 (기존 동작 유지)
Phase 50-C: UI 추가 (새 버튼, 기존 워크플로우 유지)
Phase 50-D: 통합 테스트 및 안정화
```

### 3. 롤백 포인트
```
각 Phase 완료 후 체크포인트
문제 발생 시 해당 Phase만 롤백 가능
```

---

## Phase 50-A: 데이터 모델 확장 (안전)

### 목표
- 기존 코드 **변경 최소화**
- 새 필드는 **선택적 (optional)**
- 기존 그룹 동작 **100% 유지**

### Step A-1: TypeScript 타입 확장

**파일**: `frontend/src/api/client.ts`

```typescript
// 기존 GroupSegment (변경 없음)
export interface GroupSegment {
  column: "L" | "R";
  block_ids: number[];
  order: number;
}

// 신규: 크로스 페이지 세그먼트
export interface CrossPageSegment {
  page: number;           // 페이지 인덱스
  column: "L" | "R";
  block_ids: number[];
  order: number;
}

// ProblemGroup 확장 (선택적 필드 추가)
export interface ProblemGroup {
  id: string;
  column: "L" | "R" | "X" | "XP";  // XP 추가 (Cross-Page)
  block_ids: number[];
  segments?: GroupSegment[];

  // Phase 50: 크로스 페이지용 (선택적)
  crossPageSegments?: CrossPageSegment[];

  // 나머지 기존 필드...
}
```

**안전성 검증**:
- [ ] 기존 그룹 조회 정상 동작
- [ ] 기존 그룹 생성 정상 동작
- [ ] 기존 그룹 내보내기 정상 동작

### Step A-2: Python 타입 확장

**파일**: `backend/app/routers/blocks.py`

```python
# 신규 모델 (기존 코드에 영향 없음)
class CrossPageSegment(BaseModel):
    page: int
    column: Literal["L", "R"]
    block_ids: List[int]
    order: int

# 기존 GroupCreate 확장 (선택적 필드)
class GroupCreate(BaseModel):
    column: Literal["L", "R", "X", "XP"]
    block_ids: List[int]
    segments: Optional[List[GroupSegment]] = None

    # Phase 50: 선택적
    cross_page_segments: Optional[List[CrossPageSegment]] = None
```

**안전성 검증**:
- [ ] 기존 API 엔드포인트 정상 동작
- [ ] 새 필드 없이 그룹 생성 가능
- [ ] JSON 직렬화/역직렬화 정상

### Step A-3: 테스트

```
1. 기존 문서 열기 → 그룹 목록 정상 표시
2. 새 그룹 생성 → 기존 방식대로 동작
3. 그룹 내보내기 → 정상 동작
4. 크로스 컬럼 그룹 → 정상 동작
```

**롤백 조건**: 기존 기능 하나라도 실패 시

---

## Phase 50-B: 내보내기 로직 확장 (안전)

### 목표
- 크로스 페이지 그룹 **내보내기** 지원
- 기존 내보내기 로직 **분기 처리**
- 실패 시 에러 반환 (기존 동작에 영향 없음)

### Step B-1: 내보내기 함수 분기

**파일**: `backend/app/routers/export.py`

```python
async def export_single_group(group: dict, document_id: str, page_index: int, ...):
    """기존 함수 - 분기 추가"""

    # Phase 50: 크로스 페이지 그룹 분기
    if group.get("column") == "XP" and group.get("crossPageSegments"):
        return await export_cross_page_group(group, document_id)

    # 기존 로직 (변경 없음)
    if group.get("column") == "X" and group.get("segments"):
        # Phase 53 크로스 컬럼 로직
        ...

    # 단일 페이지 로직
    ...
```

### Step B-2: 크로스 페이지 내보내기 함수 (신규)

```python
async def export_cross_page_group(group: dict, document_id: str) -> Image:
    """
    Phase 50: 크로스 페이지 그룹 내보내기

    각 세그먼트의 페이지 이미지를 로드하고 세로로 병합
    """
    cropped_images = []

    for segment in sorted(group["crossPageSegments"], key=lambda s: s["order"]):
        page_index = segment["page"]

        # 1. 해당 페이지 이미지 로드
        page_image_path = get_page_image_path(document_id, page_index)
        if not page_image_path.exists():
            raise HTTPException(404, f"Page {page_index} image not found")

        page_image = Image.open(page_image_path)

        # 2. 해당 페이지 블록 데이터 로드
        blocks_path = get_blocks_path(document_id, page_index)
        if not blocks_path.exists():
            raise HTTPException(404, f"Page {page_index} blocks not found")

        with open(blocks_path, 'r', encoding='utf-8') as f:
            blocks_data = json.load(f)

        # 3. 세그먼트 블록들로 바운딩 박스 계산
        segment_blocks = [
            b for b in blocks_data["blocks"]
            if b["block_id"] in segment["block_ids"]
        ]

        if not segment_blocks:
            continue

        bbox = calculate_bounding_box(segment_blocks)

        # 4. 크롭
        cropped = page_image.crop((bbox[0], bbox[1], bbox[2], bbox[3]))
        cropped_images.append(cropped)

    if not cropped_images:
        raise HTTPException(400, "No valid segments to export")

    # 5. 세로 병합 (Phase 53 함수 재사용)
    return merge_images_vertically(cropped_images, padding=10)
```

### Step B-3: 테스트

```
1. 기존 단일 페이지 그룹 내보내기 → 정상
2. 기존 크로스 컬럼 그룹 내보내기 → 정상
3. (수동 테스트용) 크로스 페이지 JSON 직접 생성 → 내보내기 확인
```

**롤백 조건**: 기존 내보내기 기능 실패 시

---

## Phase 50-C: UI 구현 (단계적)

### 목표
- **새 버튼 추가** (기존 버튼 유지)
- **선택 상태 관리** 확장
- 기존 워크플로우 **영향 없음**

### Step C-1: 크로스 페이지 선택 상태 (Store)

**파일**: `frontend/src/pages/PageViewer.tsx` (또는 새 store)

```typescript
// 크로스 페이지 선택 상태
interface CrossPageSelectionState {
  isActive: boolean;
  sourcePageIndex: number;
  segments: CrossPageSegment[];
}

const [crossPageSelection, setCrossPageSelection] = useState<CrossPageSelectionState>({
  isActive: false,
  sourcePageIndex: -1,
  segments: []
});
```

### Step C-2: "다음 페이지로 이어서" 버튼

**파일**: `frontend/src/components/GroupPanel.tsx`

```tsx
{/* 기존 그룹 생성 버튼 */}
<Button
  onClick={onCreateGroup}
  disabled={selectedBlocks.length === 0}
  ...
>
  선택한 {selectedBlocks.length}개 블록으로 그룹 생성
</Button>

{/* Phase 50: 크로스 페이지 버튼 (선택된 블록이 있을 때만) */}
{selectedBlocks.length > 0 && !crossPageSelection.isActive && (
  <Button
    onClick={handleStartCrossPage}
    variant="outline"
    size="sm"
    className="w-full mt-2"
  >
    <ArrowRight className="w-4 h-4 mr-2" />
    다음 페이지로 이어서 선택 (P)
  </Button>
)}

{/* 크로스 페이지 모드 표시 */}
{crossPageSelection.isActive && (
  <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
    <div className="text-sm text-purple-700 font-medium">
      📄 크로스 페이지 선택 모드
    </div>
    <div className="text-xs text-purple-600 mt-1">
      {crossPageSelection.sourcePageIndex + 1}페이지에서
      {crossPageSelection.segments[0]?.block_ids.length || 0}개 블록 선택됨
    </div>
    <div className="flex gap-2 mt-2">
      <Button size="sm" onClick={handleCreateCrossPageGroup}>
        크로스 페이지 그룹 생성
      </Button>
      <Button size="sm" variant="ghost" onClick={handleCancelCrossPage}>
        취소
      </Button>
    </div>
  </div>
)}
```

### Step C-3: 페이지 전환 시 선택 유지

**파일**: `frontend/src/pages/PageViewer.tsx`

```typescript
// 페이지 전환 핸들러 수정
const handlePageChange = (newPage: number) => {
  // 크로스 페이지 모드가 아니면 기존대로 선택 초기화
  if (!crossPageSelection.isActive) {
    setSelectedBlocks([]);
  }
  // 크로스 페이지 모드면 선택 유지

  setCurrentPage(newPage);
};
```

### Step C-4: 단축키 추가

```typescript
// 키보드 핸들러
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // P: 다음 페이지로 이어서
    if (e.key === 'p' || e.key === 'P') {
      if (selectedBlocks.length > 0 && !crossPageSelection.isActive) {
        handleStartCrossPage();
      }
    }

    // Escape: 크로스 페이지 모드 취소
    if (e.key === 'Escape' && crossPageSelection.isActive) {
      handleCancelCrossPage();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [selectedBlocks, crossPageSelection.isActive]);
```

### Step C-5: 크로스 페이지 그룹 생성 로직

```typescript
const handleCreateCrossPageGroup = async () => {
  // 1. 첫 번째 세그먼트 (이전 페이지)
  const firstSegment = crossPageSelection.segments[0];

  // 2. 두 번째 세그먼트 (현재 페이지)
  const currentBlocks = blocks.filter(b => selectedBlocks.includes(b.block_id));
  const secondSegment: CrossPageSegment = {
    page: currentPage,
    column: detectColumn(currentBlocks),
    block_ids: selectedBlocks,
    order: 1
  };

  // 3. 그룹 생성 요청
  const newGroup: Partial<ProblemGroup> = {
    id: generateCrossPageGroupId(firstSegment.page),  // "p8_XP1"
    column: "XP",
    block_ids: [],  // 크로스 페이지는 segments로 관리
    crossPageSegments: [firstSegment, secondSegment]
  };

  // 4. API 호출 (시작 페이지에 저장)
  await api.createGroup(documentId, firstSegment.page, newGroup);

  // 5. 상태 초기화
  setCrossPageSelection({ isActive: false, sourcePageIndex: -1, segments: [] });
  setSelectedBlocks([]);
};
```

### Step C-6: 테스트

```
1. 기존 그룹 생성 → 정상 동작
2. "다음 페이지로 이어서" 클릭 → 모드 활성화
3. 페이지 이동 → 선택 유지 확인
4. 현재 페이지 블록 추가 선택 → 정상
5. 크로스 페이지 그룹 생성 → 내보내기까지 확인
6. 취소 (Esc) → 정상 초기화
```

**롤백 조건**: 기존 그룹 생성/편집/내보내기 실패 시

---

## Phase 50-D: 통합 및 안정화

### Step D-1: GroupPanel 크로스 페이지 그룹 표시

```tsx
{/* 크로스 페이지 그룹 표시 */}
{group.column === "XP" && (
  <Badge className="bg-purple-100 text-purple-700 text-xs">
    📄 {group.crossPageSegments?.map(s => s.page + 1).join('→')}p
  </Badge>
)}
```

### Step D-2: 9페이지에서 "소속 표시"

```tsx
// 다른 페이지 그룹에 속한 블록 표시
const isPartOfCrossPageGroup = useMemo(() => {
  // 현재 페이지가 아닌 크로스 페이지 그룹에 포함된 블록 체크
  return allCrossPageGroups.some(g =>
    g.crossPageSegments?.some(s =>
      s.page === currentPage && s.block_ids.includes(blockId)
    )
  );
}, [allCrossPageGroups, currentPage, blockId]);

{isPartOfCrossPageGroup && (
  <div className="absolute -top-1 -right-1 bg-purple-500 text-white text-[10px] px-1 rounded">
    XP
  </div>
)}
```

### Step D-3: 엣지 케이스 처리

```typescript
// 1. 크로스 페이지 그룹 삭제 시
const handleDeleteCrossPageGroup = async (groupId: string) => {
  // 시작 페이지에서만 삭제하면 됨 (그룹 저장 위치)
  await api.deleteGroup(documentId, sourcePageIndex, groupId);
};

// 2. 크로스 페이지 그룹 편집 시
// → 문제 정보만 편집 가능, 블록 변경은 삭제 후 재생성 권장

// 3. 3페이지 이상 걸침
// → Phase 50에서는 2페이지만 지원 (추후 확장)
```

### Step D-4: 최종 테스트 체크리스트

```
[ ] 기존 기능 회귀 테스트
  [ ] 단일 페이지 그룹 생성/편집/삭제/내보내기
  [ ] 크로스 컬럼 그룹 (X) 생성/내보내기
  [ ] 문제-해설 매칭 기능
  [ ] 페이지 전환 시 기존 동작

[ ] 새 기능 테스트
  [ ] 크로스 페이지 모드 활성화/취소
  [ ] 페이지 전환 시 선택 유지
  [ ] 크로스 페이지 그룹 생성
  [ ] 크로스 페이지 그룹 내보내기 (세로 병합)
  [ ] 크로스 페이지 그룹 삭제
  [ ] 9페이지에서 소속 표시

[ ] 엣지 케이스
  [ ] 빈 블록으로 크로스 페이지 시도 → 비활성화
  [ ] 같은 페이지로 돌아가기 → 단일 페이지로 처리
  [ ] 3페이지 이상 → 에러 메시지
```

---

## 수정 파일 목록

| Phase | 파일 | 변경 내용 |
|-------|------|----------|
| A | `frontend/src/api/client.ts` | 타입 확장 |
| A | `backend/app/routers/blocks.py` | 모델 확장 |
| B | `backend/app/routers/export.py` | 내보내기 분기 + 신규 함수 |
| C | `frontend/src/pages/PageViewer.tsx` | 선택 상태 관리 |
| C | `frontend/src/components/GroupPanel.tsx` | UI 버튼 추가 |
| D | `frontend/src/components/PageCanvas.tsx` | 소속 표시 |

---

## 예상 일정

| Phase | 내용 | 예상 시간 | 롤백 포인트 |
|-------|------|----------|------------|
| **50-A** | 데이터 모델 확장 | 1시간 | ✅ |
| **50-B** | 내보내기 로직 | 2시간 | ✅ |
| **50-C** | UI 구현 | 4시간 | ✅ |
| **50-D** | 통합 테스트 | 2시간 | ✅ |
| **총계** | | **9시간** | |

---

## 체크리스트

### Phase 50-A
- [ ] TypeScript 타입 확장 (CrossPageSegment, ProblemGroup)
- [ ] Python 모델 확장 (CrossPageSegment, GroupCreate)
- [ ] 기존 기능 정상 동작 확인

### Phase 50-B
- [ ] export_cross_page_group 함수 구현
- [ ] export_single_group에 분기 추가
- [ ] 기존 내보내기 정상 동작 확인

### Phase 50-C
- [ ] crossPageSelection 상태 추가
- [ ] "다음 페이지로 이어서" 버튼 추가
- [ ] 페이지 전환 시 선택 유지 로직
- [ ] 단축키 (P, Esc) 추가
- [ ] 크로스 페이지 그룹 생성 로직

### Phase 50-D
- [ ] GroupPanel 크로스 페이지 표시
- [ ] PageCanvas 소속 표시
- [ ] 전체 회귀 테스트
- [ ] 엣지 케이스 처리

---

*작성일: 2025-12-05*
