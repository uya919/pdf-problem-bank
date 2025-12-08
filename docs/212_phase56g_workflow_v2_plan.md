# Phase 56-G: 모문제 워크플로우 v2 개발 계획

**문서 번호**: 212
**상위 문서**: [211_parent_problem_workflow_v2_feasibility.md](211_parent_problem_workflow_v2_feasibility.md)
**예상 시간**: 5시간
**위험도**: 낮음

---

## 목표

```
Before: 블록→G→클릭→M→블록→G→클릭→L (8+ 단계)
After:  블록→M→블록→L→블록→L→블록→G (연속 키 입력)
```

---

## 워크플로우 상세

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: 블록 선택 → M키                                     │
│ ─────────────────────────────────────────────────────────── │
│ • 모문제 그룹 생성 (이름: 임시 "(모문제)")                   │
│ • 모문제 등록 모드 진입                                     │
│ • 토스트: "모문제 모드: L키로 하위문제 추가"                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2~N: 블록 선택 → L키 (반복)                            │
│ ─────────────────────────────────────────────────────────── │
│ • 하위문제 그룹 생성 (번호 자동: 1, 2, 3...)                │
│ • 모문제에 자동 연결                                        │
│ • 토스트: "하위문제 1번 추가됨"                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Step N+1: 블록 선택 → G키                                   │
│ ─────────────────────────────────────────────────────────── │
│ • 모문제 모드 종료                                          │
│ • 모문제 이름 자동 생성: "1~3의 모문제"                      │
│ • 현재 블록 → 새 일반 문제 생성 (4번)                       │
│ • 평소 워크플로우로 복귀                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 단계별 구현 계획

### 56-G-1: 모문제 모드 상태 추가 (30분)

**파일**: `frontend/src/pages/PageViewer.tsx`

```typescript
// 기존 상태들 근처에 추가
interface ParentProblemModeState {
  isActive: boolean;            // 모문제 등록 모드 활성화
  parentGroupId: string | null; // 현재 모문제 그룹 ID
  childNumbers: string[];       // 등록된 하위문제 번호들 ["1", "2", "3"]
}

const [parentProblemMode, setParentProblemMode] = useState<ParentProblemModeState>({
  isActive: false,
  parentGroupId: null,
  childNumbers: [],
});
```

**테스트**:
- [ ] 상태 초기화 정상
- [ ] TypeScript 에러 없음

---

### 56-G-2: M키 로직 변경 (1시간)

**파일**: `frontend/src/pages/PageViewer.tsx`

**기존 코드** (삭제):
```typescript
case 'm':
case 'M':
  // Phase 56-F: M키로 모문제 토글
  if (selectedGroupId) {
    e.preventDefault();
    handleToggleIsParent(selectedGroupId);
  }
  break;
```

**새 코드**:
```typescript
case 'm':
case 'M':
  // Phase 56-G: M키로 모문제 생성 + 모드 진입
  if (selectedBlocks.length > 0) {
    e.preventDefault();

    // 이미 모드 중이면 이전 모문제 완료
    if (parentProblemMode.isActive) {
      finalizeParentProblem();
    }

    // 1. 모문제 그룹 생성
    const newGroupId = `g_${Date.now()}`;
    const newGroup: ProblemGroup = {
      id: newGroupId,
      block_ids: [...selectedBlocks],
      displayName: '(모문제)',  // 임시 이름
      isParent: true,
      parentGroupId: undefined,
      // ... 기타 필드
    };

    setLocalGroups(prev => [...prev, newGroup]);

    // 2. 모문제 모드 진입
    setParentProblemMode({
      isActive: true,
      parentGroupId: newGroupId,
      childNumbers: [],
    });

    // 3. 블록 선택 해제
    setSelectedBlocks([]);

    showToast('모문제 모드: L키로 하위문제 추가, G키로 완료', 'info');
  }
  break;
```

**테스트**:
- [ ] 블록 선택 후 M키 → 노란색 모문제 그룹 생성
- [ ] 모드 진입 확인 (토스트 메시지)
- [ ] 블록 선택 해제 확인

---

### 56-G-3: L키 로직 변경 (1시간)

**파일**: `frontend/src/pages/PageViewer.tsx`

**새 코드**:
```typescript
case 'l':
case 'L':
  // Phase 56-G: L키로 하위문제 생성 + 자동 연결
  if (selectedBlocks.length > 0 && parentProblemMode.isActive) {
    e.preventDefault();

    // 1. 다음 문제번호 계산
    const nextNumber = getNextProblemNumber(localGroups, previousPageLastNumber);

    // 2. 하위문제 그룹 생성
    const newGroupId = `g_${Date.now()}`;
    const newGroup: ProblemGroup = {
      id: newGroupId,
      block_ids: [...selectedBlocks],
      displayName: nextNumber,
      isParent: false,
      parentGroupId: parentProblemMode.parentGroupId,  // 자동 연결
      // ... 기타 필드
    };

    setLocalGroups(prev => [...prev, newGroup]);

    // 3. 상태 업데이트
    setParentProblemMode(prev => ({
      ...prev,
      childNumbers: [...prev.childNumbers, nextNumber],
    }));

    // 4. 블록 선택 해제
    setSelectedBlocks([]);

    showToast(`하위문제 ${nextNumber}번 추가됨`, 'success');
  } else if (selectedBlocks.length > 0 && !parentProblemMode.isActive) {
    // 모드가 아닐 때 L키 → 안내 메시지
    showToast('먼저 M키로 모문제를 생성하세요', 'warning');
  }
  break;
```

**테스트**:
- [ ] 모드 중 블록 선택 → L키 → 파란색 하위문제 생성
- [ ] 문제번호 자동 증가 (1, 2, 3...)
- [ ] 모문제에 자동 연결 확인
- [ ] 모드 아닐 때 L키 → 경고 메시지

---

### 56-G-4: G키 로직 변경 (1시간)

**파일**: `frontend/src/pages/PageViewer.tsx`

**기존 코드 수정**:
```typescript
case 'g':
case 'G':
case 'Enter':
  if (selectedBlocks.length > 0) {
    e.preventDefault();

    // Phase 56-G: 모문제 모드 종료 처리
    if (parentProblemMode.isActive) {
      finalizeParentProblem();
    }

    // 크로스 페이지 모드 처리 (기존)
    if (crossPageSelection.isActive) {
      handleCreateCrossPageGroup();
    } else {
      // 일반 그룹 생성 (기존 로직 그대로)
      handleCreateGroup();
    }
  }
  break;
```

**finalizeParentProblem 함수 추가**:
```typescript
// Phase 56-G: 모문제 완료 처리
const finalizeParentProblem = () => {
  if (!parentProblemMode.isActive || !parentProblemMode.parentGroupId) return;

  const childNums = parentProblemMode.childNumbers;

  // 모문제 이름 자동 생성
  let parentName: string;
  if (childNums.length === 0) {
    parentName = '(빈 모문제)';  // 하위문제 없음
  } else if (childNums.length === 1) {
    parentName = `${childNums[0]}의 모문제`;
  } else {
    parentName = `${childNums[0]}~${childNums[childNums.length - 1]}의 모문제`;
  }

  // 모문제 그룹 업데이트
  setLocalGroups(prev => prev.map(g =>
    g.id === parentProblemMode.parentGroupId
      ? { ...g, displayName: parentName }
      : g
  ));

  // 모드 해제
  setParentProblemMode({
    isActive: false,
    parentGroupId: null,
    childNumbers: [],
  });

  showToast(`모문제 "${parentName}" 등록 완료`, 'success');
};
```

**테스트**:
- [ ] 모드 중 G키 → 모문제 이름 자동 생성 ("1~3의 모문제")
- [ ] 현재 블록 → 새 일반 문제 생성 (4번)
- [ ] 모드 해제 확인
- [ ] 하위문제 없이 G키 → "(빈 모문제)" 처리

---

### 56-G-5: ESC/페이지이동 처리 (30분)

**파일**: `frontend/src/pages/PageViewer.tsx`

**ESC 키 수정**:
```typescript
case 'Escape':
  if (crossPageSelection.isActive) {
    handleCancelCrossPage();
  } else if (parentProblemMode.isActive) {
    // Phase 56-G: 모문제 모드 취소 (생성된 그룹 유지)
    finalizeParentProblem();
    showToast('모문제 모드 종료', 'info');
  } else {
    setSelectedBlocks([]);
  }
  break;
```

**페이지 이동 시 자동 완료** (ArrowLeft/Right 케이스에 추가):
```typescript
case 'ArrowLeft':
case 'ArrowRight':
  // 모문제 모드 자동 완료
  if (parentProblemMode.isActive) {
    finalizeParentProblem();
  }
  // 기존 페이지 이동 로직...
  break;
```

**테스트**:
- [ ] ESC → 모드 종료 + 그룹 유지
- [ ] 페이지 이동 → 자동 완료

---

### 56-G-6: 시각적 모드 표시 (30분)

**파일**: `frontend/src/components/GroupPanel.tsx`

```tsx
// GroupPanel 상단에 모드 표시 배너
{parentProblemMode?.isActive && (
  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
    <div className="flex items-center gap-2 text-amber-800">
      <FileText className="w-5 h-5" />
      <span className="font-medium">모문제 등록 모드</span>
    </div>
    <div className="text-sm text-amber-600 mt-1">
      L키: 하위문제 추가 | G키: 완료 | ESC: 취소
    </div>
    {parentProblemMode.childNumbers.length > 0 && (
      <div className="text-sm text-amber-700 mt-2">
        등록된 하위문제: {parentProblemMode.childNumbers.join(', ')}
      </div>
    )}
  </div>
)}
```

**Props 추가**:
```typescript
// GroupPanel props에 추가
interface GroupPanelProps {
  // ... 기존
  parentProblemMode?: ParentProblemModeState;
}
```

**테스트**:
- [ ] 모드 진입 시 배너 표시
- [ ] 하위문제 번호 목록 표시
- [ ] 모드 종료 시 배너 숨김

---

### 56-G-7: 테스트 및 버그 수정 (30분)

**전체 워크플로우 테스트**:
- [ ] M → L → L → L → G 전체 흐름
- [ ] 모문제 이름 "1~3의 모문제" 정상
- [ ] 4번 문제 일반 생성 정상
- [ ] 저장 후 새로고침해도 유지
- [ ] 크로스페이지 모드와 충돌 없음

---

## 실행 순서

```
56-G-1 (상태 추가) ← 기반
    ↓
56-G-2 (M키) ← 모문제 생성
    ↓
56-G-3 (L키) ← 하위문제 생성
    ↓
56-G-4 (G키) ← 모드 종료 + 일반 그룹
    ↓
56-G-5 (ESC/이동) ← 예외 처리
    ↓
56-G-6 (시각적 표시) ← UI
    ↓
56-G-7 (테스트) ← 검증
```

---

## 최종 단축키 표

| 키 | 일반 모드 | 모문제 모드 |
|----|----------|------------|
| `M` | 모문제 생성 + 모드 진입 | 이전 완료 + 새 모문제 시작 |
| `L` | 경고 메시지 | 하위문제 생성 + 자동 연결 |
| `G` | 일반 그룹 생성 | 모드 종료 + 일반 그룹 생성 |
| `ESC` | 선택 해제 | 모드 종료 (그룹 유지) |
| `←` `→` | 페이지 이동 | 자동 완료 + 페이지 이동 |

---

## 예상 결과

### 작업 예시

```
페이지 15:
┌─────────────────────────────────────────────────────┐
│ 🟡 1~3의 모문제    (blocks: 101, 102)              │
│ 🔵 1               (blocks: 103) → 모문제 연결     │
│ 🔵 2               (blocks: 104) → 모문제 연결     │
│ 🔵 3               (blocks: 105) → 모문제 연결     │
│ 🟢 4               (blocks: 106) → 일반 문제       │
│ 🟢 5               (blocks: 107) → 일반 문제       │
└─────────────────────────────────────────────────────┘
```

---

## 체크리스트

- [ ] 56-G-1: 상태 추가 완료
- [ ] 56-G-2: M키 로직 완료
- [ ] 56-G-3: L키 로직 완료
- [ ] 56-G-4: G키 로직 완료
- [ ] 56-G-5: ESC/이동 처리 완료
- [ ] 56-G-6: 시각적 표시 완료
- [ ] 56-G-7: 전체 테스트 완료

---

*승인 후 실행: "Phase 56-G 진행해줘"*
