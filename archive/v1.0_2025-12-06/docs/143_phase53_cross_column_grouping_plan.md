# Phase 53: 좌우단 걸친 문제 그룹핑 - 안정성 중심 개발 계획

**작성일**: 2025-12-04
**수정일**: 2025-12-04 (읽기 순서 규칙 반영)
**분석 문서**: [142_feasibility_cross_column_grouping.md](142_feasibility_cross_column_grouping.md)
**핵심 원칙**: **기존 기능 100% 보존, 점진적 확장**

---

## 읽기 순서 규칙 (중요!)

```
┌─────────────────────────────────────────────────────────────┐
│  한국어 책 읽기 순서: 왼쪽 → 오른쪽                           │
│                                                             │
│  따라서 크로스 컬럼 합성 순서:                                │
│  ┌─────────┐                                                │
│  │   L     │  ← 항상 위 (먼저)                               │
│  └─────────┘                                                │
│  ┌─────────┐                                                │
│  │   R     │  ← 항상 아래 (나중)                             │
│  └─────────┘                                                │
│                                                             │
│  Y좌표와 무관하게 L이 항상 먼저!                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 안정성 전략

### 핵심 원칙

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 기존 코드 수정 최소화                                      │
│    - 기존 L/R 그룹 로직은 그대로 유지                          │
│    - 새로운 X(크로스) 타입만 추가                              │
├─────────────────────────────────────────────────────────────┤
│ 2. 분기 처리 (if column === "X")                             │
│    - 새 로직은 명확한 조건 분기로 격리                         │
│    - 기존 로직에 영향 없음                                    │
├─────────────────────────────────────────────────────────────┤
│ 3. 단계별 검증                                               │
│    - 각 Phase 완료 후 기존 기능 테스트                         │
│    - 문제 발생 시 즉시 롤백 가능                               │
├─────────────────────────────────────────────────────────────┤
│ 4. Feature Flag                                             │
│    - 초기에는 Shift 키 없이 동작 안함                          │
│    - 명시적 사용자 액션 필요                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 단계별 계획

### Phase 53-A: Shift+클릭 선택 기능 (안전)

**목표**: 기존 선택 로직에 Shift 키 지원 추가

**변경 파일**:
- `frontend/src/pages/PageViewer.tsx`
- `frontend/src/components/PageCanvas.tsx`

**변경 내용**:
```typescript
// PageViewer.tsx - handleBlockSelect 수정
const handleBlockSelect = (blockId: number, isMultiSelect: boolean, isShiftSelect?: boolean) => {
  setSelectedBlocks((prev) => {
    if (isMultiSelect || isShiftSelect) {
      // Ctrl+클릭 또는 Shift+클릭: 토글/추가
      if (prev.includes(blockId)) {
        return prev.filter((id) => id !== blockId);
      } else {
        return [...prev, blockId];
      }
    } else {
      // 일반 클릭: 단일 선택
      return [blockId];
    }
  });
};
```

**테스트 체크리스트**:
- [ ] 기존 단일 클릭 선택 정상
- [ ] 기존 Ctrl+클릭 토글 정상
- [ ] Shift+클릭 추가 선택 동작
- [ ] 드래그 선택 정상
- [ ] 그룹 생성(G/Enter) 정상

**위험도**: 낮음 (기존 로직 유지, 조건 추가만)

---

### Phase 53-B: 크로스 컬럼 감지 (안전)

**목표**: 선택된 블록이 L+R 혼합인지 감지

**변경 파일**:
- `frontend/src/pages/PageViewer.tsx`

**변경 내용**:
```typescript
// handleCreateGroup 수정
const handleCreateGroup = async () => {
  if (selectedBlocks.length === 0) return;

  // Phase 53-B: 선택된 블록들의 컬럼 분석
  const selectedBlocksData = blocksData?.blocks.filter(
    (b) => selectedBlocks.includes(b.block_id)
  ) || [];

  const columns = new Set(selectedBlocksData.map(b => b.column));
  const isCrossColumn = columns.size > 1;  // L과 R 모두 포함

  // 컬럼 결정
  let column: "L" | "R" | "X";
  if (isCrossColumn) {
    column = "X";
  } else {
    column = selectedBlocksData[0]?.column || "L";
  }

  // 기존 로직 유지...
  const existingGroups = localGroups.filter((g) => g.column === column);
  // ...
};
```

**테스트 체크리스트**:
- [ ] L 블록만 선택 → column: "L" (기존 동작)
- [ ] R 블록만 선택 → column: "R" (기존 동작)
- [ ] L+R 블록 선택 → column: "X" (신규)
- [ ] 그룹 ID 형식: "p10_X1" (신규)

**위험도**: 낮음 (조건 분기로 기존 로직 격리)

---

### Phase 53-C: 그룹 데이터 모델 확장 (안전)

**목표**: 크로스 컬럼 그룹에 순서 정보 추가

**변경 파일**:
- `frontend/src/api/client.ts` (타입)
- `frontend/src/pages/PageViewer.tsx` (그룹 생성)

**변경 내용**:
```typescript
// api/client.ts - ProblemGroup 타입 확장
export interface ProblemGroup {
  id: string;
  column: "L" | "R" | "X";  // X 추가
  block_ids: number[];
  status?: string;
  // Phase 53-C: 크로스 컬럼용 추가 필드
  segments?: {
    column: "L" | "R";
    block_ids: number[];
    order: number;  // 0, 1, 2... (세로 순서)
  }[];
  // ...
}
```

```typescript
// PageViewer.tsx - 크로스 컬럼 그룹 생성 시
if (isCrossColumn) {
  // 블록을 컬럼별로 분리
  const lBlocks = selectedBlocksData.filter(b => b.column === "L");
  const rBlocks = selectedBlocksData.filter(b => b.column === "R");

  // 한국어 책 읽기 순서: L(왼쪽) → R(오른쪽) 고정
  // Y좌표와 무관하게 항상 L이 먼저!
  const segments = [
    { column: "L" as const, block_ids: lBlocks.map(b => b.block_id), order: 0 },
    { column: "R" as const, block_ids: rBlocks.map(b => b.block_id), order: 1 },
  ].filter(seg => seg.block_ids.length > 0);  // 빈 세그먼트 제거

  newGroup = {
    ...newGroup,
    column: "X",
    segments,
  };
}
```

**테스트 체크리스트**:
- [ ] 기존 L/R 그룹에 segments 필드 없음 (호환성)
- [ ] X 그룹에 segments 필드 존재
- [ ] segments 순서: 항상 L(order:0) → R(order:1)
- [ ] JSON 저장/로드 정상

**위험도**: 낮음 (새 필드 추가, 기존 필드 변경 없음)

---

### Phase 53-D: Backend 이미지 합성 (격리)

**목표**: 크로스 컬럼 그룹 export 시 세로 합성

**변경 파일**:
- `backend/app/routers/export.py`
- `backend/app/utils/image_utils.py` (신규 함수)

**변경 내용**:
```python
# image_utils.py - 새 함수 추가
def merge_images_vertically(images: list, padding: int = 10) -> Image:
    """
    여러 이미지를 세로로 합성

    Args:
        images: PIL Image 리스트
        padding: 이미지 사이 간격 (픽셀)

    Returns:
        합성된 이미지
    """
    if not images:
        return None
    if len(images) == 1:
        return images[0]

    # 최대 너비와 총 높이 계산
    max_width = max(img.width for img in images)
    total_height = sum(img.height for img in images) + padding * (len(images) - 1)

    # 흰색 배경 생성
    result = Image.new("RGB", (max_width, total_height), "white")

    # 각 이미지 붙이기 (중앙 정렬)
    y_offset = 0
    for img in images:
        x_offset = (max_width - img.width) // 2  # 중앙 정렬
        result.paste(img, (x_offset, y_offset))
        y_offset += img.height + padding

    return result
```

```python
# export.py - export_single_group 수정
async def export_single_group(...):
    # ... 기존 코드 ...

    # Phase 53-D: 크로스 컬럼 그룹 처리
    if target_group.get("column") == "X" and target_group.get("segments"):
        cropped = await export_cross_column_group(
            target_group, blocks_data["blocks"], page_image
        )
    else:
        # 기존 로직 (L/R 그룹)
        bbox = calculate_bounding_box(group_blocks)
        x1, y1, x2, y2 = add_padding(bbox, 5, page_image.width, page_image.height)
        cropped = page_image.crop((x1, y1, x2, y2))

    # ... 나머지 동일 ...


async def export_cross_column_group(group, all_blocks, page_image):
    """
    크로스 컬럼 그룹을 세로 합성하여 내보내기

    한국어 책 읽기 순서: L(왼쪽) → R(오른쪽)
    segments는 항상 order 순서로 정렬되어 있음 (L=0, R=1)
    """
    from app.utils.image_utils import merge_images_vertically

    segments = group.get("segments", [])
    if not segments:
        # segments 없으면 기존 방식으로 fallback
        group_blocks = [b for b in all_blocks if b["block_id"] in group["block_ids"]]
        bbox = calculate_bounding_box(group_blocks)
        x1, y1, x2, y2 = add_padding(bbox, 5, page_image.width, page_image.height)
        return page_image.crop((x1, y1, x2, y2))

    # segments order 순서대로 크롭 (L=0 먼저, R=1 나중)
    cropped_images = []
    for segment in sorted(segments, key=lambda s: s.get("order", 0)):
        segment_blocks = [b for b in all_blocks if b["block_id"] in segment["block_ids"]]
        if not segment_blocks:
            continue
        bbox = calculate_bounding_box(segment_blocks)
        x1, y1, x2, y2 = add_padding(bbox, 5, page_image.width, page_image.height)
        cropped = page_image.crop((x1, y1, x2, y2))
        cropped_images.append(cropped)

    # 세로 합성: L 위, R 아래
    return merge_images_vertically(cropped_images, padding=10)
```

**테스트 체크리스트**:
- [ ] 기존 L/R 그룹 export 정상 (regression 없음)
- [ ] X 그룹 export 시 세로 합성 이미지 생성
- [ ] 합성 순서: L(위) → R(아래) 고정
- [ ] 이미지 품질 정상 (경계 부자연스럽지 않음)

**위험도**: 낮음 (조건 분기로 완전 격리)

---

### Phase 53-E: UI 시각화 (안전)

**목표**: 크로스 컬럼 그룹 시각적 구분

**변경 파일**:
- `frontend/src/components/PageCanvas.tsx`
- `frontend/src/components/GroupPanel.tsx`

**변경 내용**:
```typescript
// PageCanvas.tsx - getGroupStyleAndLabel 수정
function getGroupStyleAndLabel(group: ProblemGroup) {
  // Phase 53-E: 크로스 컬럼 그룹
  if (group.column === "X") {
    return {
      stroke: "#F59E0B",  // 주황색 (Amber-500)
      fill: "rgba(245, 158, 11, 0.1)",
      tag: "X",
      label: group.problemInfo?.problemNumber || group.id,
    };
  }

  // 기존 로직...
}
```

```typescript
// GroupPanel.tsx - 크로스 컬럼 표시
{group.column === "X" && (
  <span className="text-xs bg-amber-100 text-amber-700 px-1 rounded">
    좌우 합성
  </span>
)}
```

**테스트 체크리스트**:
- [ ] L 그룹: 파란색 테두리 (기존)
- [ ] R 그룹: 보라색 테두리 (기존)
- [ ] X 그룹: 주황색 테두리 (신규)
- [ ] GroupPanel에 "좌우 합성" 라벨 표시

**위험도**: 낮음 (시각적 변경만, 로직 변경 없음)

---

## 롤백 계획

### 각 Phase별 롤백

| Phase | 롤백 방법 | 영향 범위 |
|-------|----------|----------|
| 53-A | handleBlockSelect에서 isShiftSelect 조건 제거 | 없음 |
| 53-B | isCrossColumn 조건 제거, column = firstBlock.column만 사용 | 없음 |
| 53-C | segments 필드 무시 (기존 로직으로 처리) | 없음 |
| 53-D | column === "X" 조건 제거, 기존 bbox 로직만 사용 | 없음 |
| 53-E | column === "X" 스타일 조건 제거 | 없음 |

### 전체 롤백
```
모든 Phase가 조건 분기로 격리되어 있어
column !== "X" 조건을 추가하면 전체 기능 비활성화 가능
```

---

## 테스트 전략

### 1. 회귀 테스트 (각 Phase 후)

```
[ ] 새로고침 후 기존 그룹 정상 로드
[ ] L 블록만 선택 → L 그룹 생성 정상
[ ] R 블록만 선택 → R 그룹 생성 정상
[ ] 페이지 전환 → 그룹 저장/로드 정상
[ ] 그룹 삭제 정상
[ ] Export 정상
```

### 2. 신규 기능 테스트

```
[ ] Shift+클릭 → 블록 추가 선택
[ ] L+R 블록 선택 → X 그룹 생성
[ ] X 그룹 저장/로드 정상
[ ] X 그룹 export → 세로 합성 이미지 (L 위, R 아래)
[ ] X 그룹 시각화 (주황색)
```

---

## 구현 순서 및 예상 시간

| Phase | 작업 | 시간 | 의존성 |
|-------|------|------|--------|
| 53-A | Shift+클릭 선택 | 20분 | 없음 |
| 53-B | 크로스 컬럼 감지 | 20분 | 53-A |
| 53-C | 데이터 모델 확장 | 30분 | 53-B |
| 53-D | Backend 이미지 합성 | 45분 | 53-C |
| 53-E | UI 시각화 | 20분 | 53-C |
| - | 통합 테스트 | 15분 | 전체 |
| **총계** | | **~2.5시간** | |

---

## 완료 기준

### 필수
- [ ] 기존 L/R 그룹 기능 100% 정상 동작
- [ ] Shift+클릭으로 L+R 블록 선택 가능
- [ ] X 그룹 생성 및 저장 정상
- [ ] X 그룹 export 시 세로 합성 (L 위 → R 아래)

### 선택 (향후)
- [ ] 합성 미리보기
- [ ] 가로 합성 옵션

---

**"진행해줘"로 Phase 53-A부터 시작합니다.**
