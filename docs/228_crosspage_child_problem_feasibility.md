# 모문제 하위문제 크로스 페이지 연결 구현 가능성 리포트

**문서 번호**: 228
**작성일**: 2025-12-07
**요청**: 모문제의 하위문제를 다음 페이지까지 연결하는 기능

---

## 1. 요청 기능 정의

### 1.1 시나리오
```
[페이지 N]                      [페이지 N+1]
┌─────────────────┐            ┌─────────────────┐
│ 1~3의 모문제     │            │                 │
│ (isParent=true)  │            │                 │
├─────────────────┤            │                 │
│ 1번 문제        │            │                 │
├─────────────────┤            │                 │
│ 2번 문제 (시작) │───XP연결───│ 2번 문제 (계속) │
│   R열 하단      │            │   L열 상단      │
└─────────────────┘            └─────────────────┘
```

**목표**: 하위문제(2번)가 페이지를 넘어가는 경우, 크로스 페이지로 연결하면서 모문제 컨텍스트도 포함

### 1.2 최종 내보내기 결과
```
┌─────────────────────────────┐
│   [모문제 이미지]           │  ← parentGroupId로 합성
├─────────────────────────────┤
│   [2번 문제 - 페이지 N]     │  ← crossPageSegments[0]
├─────────────────────────────┤
│   [2번 문제 - 페이지 N+1]   │  ← crossPageSegments[1]
└─────────────────────────────┘
```

---

## 2. 현재 구현 상태 분석

### 2.1 관련 기능

| 기능 | 구현 상태 | 필드 |
|------|----------|------|
| 모문제-하위문제 | ✅ 완료 | `parentGroupId`, `isParent` |
| 크로스 페이지 | ✅ 완료 | `column: "XP"`, `crossPageSegments` |
| 두 기능 조합 | ⚠️ **부분 지원** | 아래 참조 |

### 2.2 백엔드 Export 로직 (export.py)

```python
# 현재 처리 순서 (lines 91-206):

# 1단계: 크로스 페이지 처리
if group.get("column") == "XP" and group.get("crossPageSegments"):
    # 여러 페이지 세그먼트를 세로로 합성
    cropped = merge_images_vertically(cropped_images, padding=10)

# 2단계: 모문제 컨텍스트 합성 (XP 처리 후에 실행!)
parent_group_id = group.get("parentGroupId")
if parent_group_id:
    # 모문제 이미지 + 하위문제 이미지 세로 합성
    cropped = merge_images_vertically([parent_cropped, cropped], padding=15)
```

**결론**: 백엔드는 이미 두 기능 조합을 지원! 순서대로 처리됨.

### 2.3 프론트엔드 생성 흐름

**현재 크로스 페이지 생성 (P 키)**:
```typescript
// PageViewer.tsx lines 947-974
const newGroup: ProblemGroup = {
  id: groupId,
  column: "XP",
  block_ids: allBlockIds,
  crossPageSegments: [...],
  problemInfo: {...},
  // ❌ parentGroupId 설정 없음!
};
```

**문제점**: 크로스 페이지 그룹 생성 시 `parentGroupId`를 설정하는 UI가 없음

---

## 3. 구현 가능성: ✅ 가능 (중간 난이도)

### 3.1 필요한 변경사항

| 위치 | 변경 내용 | 난이도 |
|------|----------|--------|
| PageViewer.tsx | XP 그룹에 parentGroupId 설정 옵션 추가 | 중간 |
| GroupPanel.tsx | XP 그룹용 모문제 선택 드롭다운 | 쉬움 |
| export.py | 변경 불필요 (이미 지원) | - |

### 3.2 구현 방안

#### Option A: 생성 시 즉시 연결 (권장)

크로스 페이지 그룹 생성 시 모문제 선택 다이얼로그 표시:

```typescript
// PageViewer.tsx - handleCrossPageModeConfirm 수정

// 1. 모문제 후보 찾기 (현재 페이지 + 소스 페이지)
const parentCandidates = groups.filter(g => g.isParent);

// 2. 선택 다이얼로그 표시 (선택적)
const selectedParentId = await showParentSelectionDialog(parentCandidates);

// 3. 그룹 생성
const newGroup: ProblemGroup = {
  id: groupId,
  column: "XP",
  crossPageSegments: [...],
  parentGroupId: selectedParentId,  // ✅ 추가
  problemInfo: {...},
};
```

#### Option B: 생성 후 연결 (더 간단)

XP 그룹 생성 후 GroupPanel에서 모문제 연결:

```typescript
// GroupPanel.tsx - 기존 "모문제 연결" 드롭다운을 XP 그룹에도 표시
{(group.column !== 'XP' || !group.parentGroupId) && (
  <ParentGroupSelector
    groups={parentGroups}
    currentGroupId={group.id}
    onSelect={(parentId) => onSetParentGroup(group.id, parentId)}
  />
)}
```

---

## 4. 우려되는 점

### 4.1 데이터 일관성 ⚠️

| 문제 | 설명 | 심각도 |
|------|------|--------|
| **모문제 페이지 위치** | 모문제가 다른 페이지에 있을 수 있음 | 중간 |
| **그룹 저장 위치** | XP 그룹은 소스 페이지에 저장, 모문제는 어디에? | 낮음 |
| **삭제 시 정합성** | 모문제 삭제 시 XP 하위문제 처리 | 중간 |

#### 시나리오: 모문제가 다른 페이지에 있는 경우

```
페이지 N-1: 모문제 (isParent=true)
페이지 N:   하위문제 시작 (XP 그룹 소스)
페이지 N+1: 하위문제 계속 (XP 그룹 타겟)
```

**현재 Export 로직**:
```python
# 모문제를 같은 페이지 groups에서만 찾음!
for g in groups_data.get("groups", []):
    if g["id"] == parent_group_id:
        parent_group = g
        break
```

**문제**: 모문제가 다른 페이지에 있으면 찾지 못함!

### 4.2 Export 로직 수정 필요 ⚠️

```python
# 현재 (같은 페이지만 검색)
parent_group = None
for g in groups_data.get("groups", []):
    if g["id"] == parent_group_id:
        parent_group = g
        break

# 수정 필요 (모든 페이지 검색)
parent_group = None
parent_page = None

# 1. 현재 페이지에서 검색
for g in groups_data.get("groups", []):
    if g["id"] == parent_group_id:
        parent_group = g
        parent_page = page_index
        break

# 2. 없으면 다른 페이지 검색
if not parent_group:
    for other_page in range(total_pages):
        if other_page == page_index:
            continue
        other_groups_file = doc_dir / "groups" / f"page_{other_page:04d}_groups.json"
        if other_groups_file.exists():
            other_groups = load_json(other_groups_file)
            for g in other_groups.get("groups", []):
                if g["id"] == parent_group_id:
                    parent_group = g
                    parent_page = other_page
                    break
```

### 4.3 UX 복잡성 ⚠️

| 문제 | 설명 |
|------|------|
| **모문제 선택 범위** | 현재 페이지 모문제만? 전체 문서? |
| **시각적 피드백** | XP 그룹이 모문제 연결되었음을 어떻게 표시? |
| **워크플로우 순서** | 모문제 먼저? XP 그룹 먼저? |

### 4.4 성능 고려사항

```
XP + 모문제 Export 시:
1. 모문제 찾기 위해 여러 페이지 groups.json 검색 (새로 추가)
2. 모문제 페이지 이미지 로드
3. XP 세그먼트들 각 페이지 이미지 로드
4. 3개 이상 이미지 합성

→ 최대 3-4개 페이지 이미지 로드 + 합성
→ 현재보다 처리 시간 증가
```

---

## 5. 권장 구현 방안

### 5.1 Phase 58: 단계적 접근

| 단계 | 내용 | 예상 시간 |
|------|------|----------|
| **58-A** | Export 로직: 다른 페이지 모문제 검색 | 30분 |
| **58-B** | GroupPanel: XP 그룹 모문제 선택 UI | 30분 |
| **58-C** | 미리보기: XP+모문제 합성 확인 | 20분 |
| **58-D** | 테스트 및 검증 | 30분 |

**총 예상 시간**: 2시간

### 5.2 단순화된 접근 (권장)

**제약 조건**:
1. 모문제는 XP 그룹의 **소스 페이지**에 있어야 함
2. 다른 페이지 모문제 연결은 지원하지 않음

**이유**:
- 대부분의 실제 사용 케이스 커버
- 구현 복잡도 대폭 감소
- 데이터 일관성 유지 용이

---

## 6. 실제 사용 케이스 분석

### 6.1 일반적인 시나리오

```
[9페이지]                    [10페이지]
┌──────────────────┐        ┌──────────────────┐
│ 1~5의 모문제      │        │                  │
├──────────────────┤        │                  │
│ 1번              │        │                  │
├──────────────────┤        │                  │
│ 2번              │        │                  │
├──────────────────┤        │                  │
│ 3번              │        │                  │
├──────────────────┤        │                  │
│ 4번              │        │                  │
├──────────────────┤        ├──────────────────┤
│ 5번 (시작)       │───XP───│ 5번 (계속)       │
│ (공간 부족)      │        │                  │
└──────────────────┘        └──────────────────┘
```

이 시나리오에서:
- 모문제(1~5)는 9페이지에 있음
- 5번 문제가 9페이지에서 시작하여 10페이지로 이어짐
- **모문제와 XP 소스가 같은 페이지** → 단순화된 접근으로 충분

### 6.2 드문 시나리오 (지원 X 권장)

```
[8페이지]                    [9페이지]          [10페이지]
┌──────────────────┐        ┌──────────────────┐ ┌──────────────────┐
│ 1~5의 모문제      │        │                  │ │                  │
└──────────────────┘        │                  │ │                  │
                            │ 5번 (시작)       │─│ 5번 (계속)       │
                            └──────────────────┘ └──────────────────┘
```

이 시나리오:
- 모문제가 8페이지, 하위문제가 9-10페이지에 걸침
- 복잡도가 높고 실제 발생 빈도 낮음
- **지원하지 않음** (필요 시 Phase 58-E로 확장)

---

## 7. 결론

### 구현 가능성
✅ **가능** - 백엔드는 이미 지원, 프론트엔드 UI 추가 필요

### 권장 사항

| 항목 | 권장 |
|------|------|
| 접근 방식 | **단순화된 접근** (같은 페이지 모문제만) |
| 구현 순서 | 58-A → 58-B → 58-C → 58-D |
| 예상 시간 | 2시간 |

### 주요 우려점 요약

1. **다른 페이지 모문제**: 단순화된 접근으로 회피 (같은 페이지만)
2. **Export 성능**: 이미지 로드 증가 (수용 가능)
3. **UX 복잡성**: 기존 UI 패턴 활용으로 최소화

---

## 8. 다음 단계

**구현 요청**: `Phase 58 진행해줘`

**옵션 선택**:
- A: 단순화된 접근 (같은 페이지 모문제만, 2시간)
- B: 전체 구현 (다른 페이지 모문제도 지원, 4시간)

---

*작성: Claude Code*
