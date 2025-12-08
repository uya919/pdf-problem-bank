# Phase 56-F: 모문제 단축키 추가

**문서 번호**: 210
**상위 문서**: [209_phase56_parent_problem_manual_plan.md](209_phase56_parent_problem_manual_plan.md)
**예상 시간**: 30분
**위험도**: 낮음

---

## 목표

```
Before: 모문제 토글/연결 → 버튼 클릭만 가능
After:  M키로 모문제 토글, L키로 연결 모달 열기
```

---

## 현재 단축키 현황

| 키 | 기능 | Phase |
|----|------|-------|
| `←` `→` | 페이지 이동 | - |
| `G` / `Enter` | 그룹 생성 | 9-3, 21.6 |
| `Delete` / `Backspace` | 그룹 삭제 | - |
| `Escape` | 선택 해제 / 크로스페이지 취소 | 50-C |
| `P` | 크로스페이지 시작 | 50-C |

---

## 추가할 단축키

| 키 | 기능 | 조건 |
|----|------|------|
| `M` | 선택된 그룹을 모문제로 토글 | 그룹 선택 시 |
| `L` | 모문제 연결 드롭다운 포커스 | 그룹 선택 시 & 모문제가 아닐 때 |

---

## 단계별 구현

### 56-F-1: 그룹 선택 상태 추가 (10분)

**파일**: `frontend/src/pages/PageViewer.tsx`

현재는 **블록 선택**만 있고 **그룹 선택** 상태가 없음.
단축키가 작동하려면 "현재 선택된 그룹"을 알아야 함.

```typescript
// 추가할 상태
const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

// 블록 선택 시 해당 그룹도 자동 선택
useEffect(() => {
  if (selectedBlocks.length > 0) {
    const matchingGroup = localGroups.find(g =>
      g.block_ids.some(id => selectedBlocks.includes(id))
    );
    setSelectedGroupId(matchingGroup?.id || null);
  } else {
    setSelectedGroupId(null);
  }
}, [selectedBlocks, localGroups]);
```

### 56-F-2: M키 단축키 추가 (10분)

**파일**: `frontend/src/pages/PageViewer.tsx`

```typescript
// handleKeyDown 함수 내 switch문에 추가
case 'm':
case 'M':
  // Phase 56-F: M키로 모문제 토글
  if (selectedGroupId) {
    e.preventDefault();
    handleToggleIsParent(selectedGroupId);
  }
  break;
```

### 56-F-3: L키 단축키 추가 (10분)

**파일**: `frontend/src/pages/PageViewer.tsx`

```typescript
case 'l':
case 'L':
  // Phase 56-F: L키로 모문제 연결
  if (selectedGroupId) {
    const group = localGroups.find(g => g.id === selectedGroupId);
    if (group && !group.isParent) {
      e.preventDefault();
      // 드롭다운 포커스 또는 모달 열기
      openParentLinkDropdown(selectedGroupId);
    }
  }
  break;
```

**Option A**: 드롭다운에 직접 포커스
**Option B**: 간단한 모달로 선택

→ **Option A 권장** (기존 UI 활용)

---

## 테스트 체크리스트

- [ ] 그룹의 블록 선택 → M키 → 모문제 토글
- [ ] 모문제가 아닌 그룹 선택 → L키 → 드롭다운 포커스
- [ ] 모문제 그룹 선택 → L키 → 동작 안 함 (정상)
- [ ] 블록 미선택 → M/L키 → 동작 안 함 (정상)
- [ ] 기존 단축키(G, P, Escape 등) 정상 동작

---

## 실행 순서

```
56-F-1 (그룹 선택 상태) ← 기반
    ↓
56-F-2 (M키 단축키)
    ↓
56-F-3 (L키 단축키)
```

---

## 예상 결과

### 새로운 워크플로우

```
1. 모문제 만들기
   ┌────────────────────────────────────┐
   │ 그룹의 블록 클릭 → M 키 누름        │
   │ → 노란색으로 변경 (모문제)          │
   └────────────────────────────────────┘

2. 하위문제 연결하기
   ┌────────────────────────────────────┐
   │ 하위문제 그룹의 블록 클릭 → L 키    │
   │ → 드롭다운 열림 → 방향키로 선택     │
   │ → Enter로 확정                      │
   └────────────────────────────────────┘
```

---

## 최종 단축키 표

| 키 | 기능 |
|----|------|
| `←` `→` | 페이지 이동 |
| `G` / `Enter` | 그룹 생성 |
| `Delete` / `Backspace` | 그룹 삭제 |
| `Escape` | 선택 해제 |
| `P` | 크로스페이지 시작 |
| **`M`** | **모문제 토글** (NEW) |
| **`L`** | **모문제 연결** (NEW) |

---

*승인 후 실행: "Phase 56-F 진행해줘"*
