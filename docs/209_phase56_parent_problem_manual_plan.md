# Phase 56: 모문제-하위문제 수동 연결 기능

**문서 번호**: 209
**상위 문서**: [plan.md](plan.md), [207_parent_problem_context_feasibility_report.md](207_parent_problem_context_feasibility_report.md)
**예상 시간**: 6시간
**위험도**: 낮음 (기존 기능에 영향 없음)

---

## 목표

```
Before: 19번, 20번, 21번 각각 크롭 → 문맥 없음
After:  19번 크롭 시 모문제 포함 → 자기완결적 이미지
```

---

## 단계별 구현 계획

### Phase 56-A: 데이터 구조 변경 (1시간)

#### 56-A-1: Group 스키마 수정

**파일**: `backend/app/routers/blocks.py`

```python
# 기존
class GroupData(BaseModel):
    group_id: str
    blocks: List[int]
    label: str
    ...

# 추가
class GroupData(BaseModel):
    group_id: str
    blocks: List[int]
    label: str
    parent_group_id: Optional[str] = None  # NEW: 모문제 연결
    is_parent: bool = False                 # NEW: 이 그룹이 모문제인지
    ...
```

#### 56-A-2: groups.json 구조 업데이트

```json
{
  "page": 15,
  "groups": [
    {
      "group_id": "g_parent_1",
      "blocks": [101, 102],
      "label": "19-21 공통",
      "is_parent": true,
      "parent_group_id": null
    },
    {
      "group_id": "g_19",
      "blocks": [103, 104],
      "label": "19",
      "is_parent": false,
      "parent_group_id": "g_parent_1"
    },
    {
      "group_id": "g_20",
      "blocks": [105],
      "label": "20",
      "is_parent": false,
      "parent_group_id": "g_parent_1"
    }
  ]
}
```

#### 테스트
- [ ] 기존 groups.json 로드 정상 (하위호환)
- [ ] 새 필드 포함된 저장 정상

---

### Phase 56-B: Backend API 수정 (1시간)

#### 56-B-1: 그룹 저장 API 수정

**파일**: `backend/app/routers/blocks.py`

```python
@router.post("/{document_id}/pages/{page_number}/groups")
async def save_groups(
    document_id: str,
    page_number: int,
    groups: List[GroupData]
):
    # 검증: 순환 참조 방지
    for group in groups:
        if group.parent_group_id:
            parent = find_group(groups, group.parent_group_id)
            if parent and parent.parent_group_id:
                raise HTTPException(400, "중첩 모문제는 지원하지 않습니다")

    # 기존 저장 로직...
```

#### 56-B-2: 그룹 조회 API

```python
@router.get("/{document_id}/pages/{page_number}/groups")
async def get_groups(...):
    # 기존 로직 + parent 정보 포함
    return {
        "groups": groups,
        "parent_groups": [g for g in groups if g.is_parent]  # 편의용
    }
```

#### 테스트
- [ ] parent_group_id 저장/조회 정상
- [ ] 순환 참조 시 에러 반환

---

### Phase 56-C: Frontend 타입 및 Store 수정 (1시간)

#### 56-C-1: 타입 정의

**파일**: `frontend/src/types/groups.ts` (또는 기존 타입 파일)

```typescript
export interface Group {
  group_id: string;
  blocks: number[];
  label: string;

  // NEW
  parent_group_id?: string;
  is_parent?: boolean;
}
```

#### 56-C-2: Store 수정

**파일**: `frontend/src/stores/workSessionStore.ts`

```typescript
// 액션 추가
setParentGroup: (groupId: string, parentGroupId: string | null) => void;
toggleIsParent: (groupId: string) => void;

// 셀렉터 추가
getParentGroups: () => Group[];  // is_parent가 true인 그룹들
getChildrenOf: (parentId: string) => Group[];  // 특정 모문제의 하위문제들
```

#### 테스트
- [ ] 타입 에러 없음
- [ ] Store 액션 정상 동작

---

### Phase 56-D: 라벨링 UI 수정 (2시간)

#### 56-D-1: GroupPanel에 모문제 체크박스 추가

**파일**: `frontend/src/components/GroupPanel.tsx`

```tsx
<div className="group-item">
  <span>{group.label}</span>

  {/* NEW: 모문제 체크박스 */}
  <label className="flex items-center gap-1 text-xs">
    <input
      type="checkbox"
      checked={group.is_parent}
      onChange={() => toggleIsParent(group.group_id)}
    />
    모문제
  </label>

  {/* NEW: 모문제 선택 드롭다운 (is_parent가 false일 때만) */}
  {!group.is_parent && (
    <select
      value={group.parent_group_id || ""}
      onChange={(e) => setParentGroup(group.group_id, e.target.value || null)}
      className="text-xs border rounded px-1"
    >
      <option value="">연결 없음</option>
      {parentGroups.map(pg => (
        <option key={pg.group_id} value={pg.group_id}>
          {pg.label}
        </option>
      ))}
    </select>
  )}
</div>
```

#### 56-D-2: 시각적 표시 (캔버스)

**파일**: `frontend/src/components/PageCanvas.tsx`

```tsx
// 모문제 그룹은 다른 색상으로 표시
const getGroupColor = (group: Group) => {
  if (group.is_parent) return '#FFB800';  // 노란색 (모문제)
  if (group.parent_group_id) return '#3182F6';  // 파란색 (하위문제)
  return '#10B981';  // 초록색 (일반)
};

// 연결선 표시 (선택적)
{group.parent_group_id && (
  <line
    from={parentGroup.center}
    to={group.center}
    stroke="#999"
    strokeDasharray="4"
  />
)}
```

#### 56-D-3: 단축키 추가

```typescript
// P키: 선택된 그룹을 모문제로 토글
useHotkeys('p', () => {
  if (selectedGroup) {
    toggleIsParent(selectedGroup.group_id);
  }
});

// L키: 모문제 연결 모달 열기
useHotkeys('l', () => {
  if (selectedGroup && !selectedGroup.is_parent) {
    openParentLinkModal();
  }
});
```

#### 테스트
- [ ] 모문제 체크박스 동작
- [ ] 드롭다운에 모문제 목록 표시
- [ ] 연결 저장 후 새로고침해도 유지
- [ ] 캔버스에 색상 구분 표시

---

### Phase 56-E: 내보내기 시 합성 이미지 (1시간)

#### 56-E-1: 합성 로직 추가

**파일**: `backend/app/routers/export.py`

```python
from PIL import Image

async def create_composite_image(
    page_image: Image.Image,
    child_group: GroupData,
    parent_group: GroupData,
    margin: int = 20
) -> Image.Image:
    """모문제 + 하위문제 합성 이미지 생성"""

    # 모문제 영역 크롭
    parent_bbox = calculate_bbox(parent_group.blocks)
    parent_crop = page_image.crop(parent_bbox)

    # 하위문제 영역 크롭
    child_bbox = calculate_bbox(child_group.blocks)
    child_crop = page_image.crop(child_bbox)

    # 합성 (세로 배치)
    total_height = parent_crop.height + margin + child_crop.height
    max_width = max(parent_crop.width, child_crop.width)

    composite = Image.new('RGB', (max_width, total_height), 'white')
    composite.paste(parent_crop, (0, 0))

    # 구분선 추가 (선택적)
    # draw.line(...)

    composite.paste(child_crop, (0, parent_crop.height + margin))

    return composite
```

#### 56-E-2: 내보내기 옵션 추가

**파일**: `frontend/src/components/ExportModal.tsx`

```tsx
<label className="flex items-center gap-2">
  <input
    type="checkbox"
    checked={includeParentContext}
    onChange={(e) => setIncludeParentContext(e.target.checked)}
  />
  <span>모문제 컨텍스트 포함</span>
</label>
```

#### 테스트
- [ ] 모문제 있는 그룹 내보내기 시 합성 이미지 생성
- [ ] 합성 이미지 품질 확인
- [ ] 모문제 없는 그룹은 기존대로 동작

---

## 실행 순서

```
56-A (데이터 구조) ← 먼저, 다른 모든 것의 기반
    ↓
56-B (Backend API)
    ↓
56-C (Frontend 타입/Store)
    ↓
56-D (UI) ← 가장 시간 많이 걸림
    ↓
56-E (내보내기 합성)
```

---

## UI 미리보기

### GroupPanel 변경 후

```
┌─────────────────────────────────────────────────────┐
│ 그룹 목록                                           │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ 🟡 19-21 공통                    [☑ 모문제]    │ │
│ │    blocks: 101, 102                             │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 🔵 19번                          [□ 모문제]    │ │
│ │    blocks: 103, 104                             │ │
│ │    연결: [19-21 공통 ▼]                         │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 🔵 20번                          [□ 모문제]    │ │
│ │    blocks: 105                                  │ │
│ │    연결: [19-21 공통 ▼]                         │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 🟢 22번                          [□ 모문제]    │ │
│ │    blocks: 106, 107                             │ │
│ │    연결: [없음 ▼]                               │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 색상 범례

| 색상 | 의미 |
|------|------|
| 🟡 노란색 | 모문제 (is_parent: true) |
| 🔵 파란색 | 하위문제 (parent_group_id 있음) |
| 🟢 초록색 | 일반 문제 (연결 없음) |

---

## 단축키

| 키 | 기능 |
|----|------|
| `P` | 선택된 그룹을 모문제로 토글 |
| `L` | 모문제 연결 변경 |

---

## 테스트 체크리스트

### 56-A 완료 확인
- [ ] 기존 groups.json 하위호환
- [ ] 새 필드 저장 정상

### 56-B 완료 확인
- [ ] API에서 parent_group_id 저장/조회
- [ ] 순환 참조 방지

### 56-C 완료 확인
- [ ] TypeScript 타입 에러 없음
- [ ] Store 액션 동작

### 56-D 완료 확인
- [ ] 모문제 체크박스 동작
- [ ] 드롭다운 선택 동작
- [ ] 캔버스 색상 구분
- [ ] 페이지 전환 후 유지

### 56-E 완료 확인
- [ ] 합성 이미지 생성
- [ ] 품질 양호

---

## 우선순위 조정 옵션

**최소 구현 (MVP)**: 56-A + 56-B + 56-C + 56-D (4시간)
- 연결 기능만, 내보내기 합성은 나중에

**전체 구현**: 56-A ~ 56-E (6시간)
- 내보내기 합성까지 완료

---

*승인 후 실행: "Phase 56-A 진행해줘" 또는 "Phase 56 전체 진행해줘"*
