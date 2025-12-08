# Phase 56-H: 모문제 연속 번호 체계 개발 계획

**문서 번호**: 215
**상위 문서**: [214_phase56h_continuous_numbering_v2.md](214_phase56h_continuous_numbering_v2.md)
**예상 시간**: 40분
**위험도**: 매우 낮음

---

## 목표

```
Before: M→L(1)→L(2)→L(3)→M→L(1)→L(2)  ← 번호 리셋
After:  M→L(1)→L(2)→L(3)→M→L(4)→L(5)  ← 연속!
```

---

## 단계별 구현 계획

### 56-H-1: L키 번호 계산 수정 (15분)

**파일**: `frontend/src/pages/PageViewer.tsx`

**변경 전** (현재 코드):
```typescript
case 'l':
case 'L':
  if (selectedBlocks.length > 0 && parentProblemMode.isActive) {
    e.preventDefault();

    // 문제: 모문제 내 독립 번호
    const nextNumber = String(parentProblemMode.childNumbers.length + 1);
```

**변경 후**:
```typescript
case 'l':
case 'L':
  if (selectedBlocks.length > 0 && parentProblemMode.isActive) {
    e.preventDefault();

    // Phase 56-H: 페이지 연속 번호 계산
    const nextNumber = getNextProblemNumberWithContext(
      localGroups,
      previousPageLastNumber
    );
```

**테스트**:
- [ ] M→L→L→L 시 1,2,3 연속 생성
- [ ] M→L→L→M→L 시 1,2,4 연속 (3은 모문제A 완료 시점)

---

### 56-H-2: L키 메타데이터 추가 (10분)

**파일**: `frontend/src/pages/PageViewer.tsx`

**변경 전**:
```typescript
problemInfo: {
  problemNumber: nextNumber,
},
```

**변경 후**:
```typescript
problemInfo: {
  problemNumber: nextNumber,
  // Phase 56-H: 일반 문제와 동일한 메타데이터
  bookName: documentSettings?.defaultBookName || bookName,
  course: documentSettings?.defaultCourse || course,
  page: bookPage,
},
```

**필요한 변수 확인**:
- `documentSettings` - 이미 PageViewer에서 사용 중 ✅
- `bookName`, `course` - `extractBookNameAndCourse(documentId)`에서 추출 ✅
- `bookPage` - 이미 사용 중 ✅

**테스트**:
- [ ] 하위문제 생성 후 GroupPanel에서 메타데이터 표시 확인
- [ ] 저장 후 groups.json에 메타데이터 포함 확인

---

### 56-H-3: import 추가 (5분)

**파일**: `frontend/src/pages/PageViewer.tsx`

기존 import 확인 후 필요시 추가:
```typescript
import { getNextProblemNumberWithContext } from '../utils/problemNumberUtils';
```

**확인 사항**:
- [ ] `getNextProblemNumberWithContext` 함수 존재 여부
- [ ] `previousPageLastNumber` 변수 접근 가능 여부

---

### 56-H-4: 테스트 및 검증 (10분)

**시나리오 A 테스트**: G키 없이 연속 모문제
```
1. 블록 선택 → M키 (모문제A 생성)
2. 블록 선택 → L키 (하위 1)
3. 블록 선택 → L키 (하위 2)
4. 블록 선택 → L키 (하위 3)
5. 블록 선택 → M키 (모문제A 완료 → 모문제B 시작)
6. 블록 선택 → L키 (하위 4 확인!)
7. 블록 선택 → L키 (하위 5)
8. 블록 선택 → G키 (모문제B 완료 + 일반 6)
```

**예상 결과**:
- 모문제A: "1~3의 모문제"
- 모문제B: "4~5의 모문제"
- 일반: 6

---

**시나리오 B 테스트**: G키로 일반 문제 후 새 모문제
```
1. 블록 선택 → M키 (모문제A 생성)
2. 블록 선택 → L키 (하위 1)
3. 블록 선택 → L키 (하위 2)
4. 블록 선택 → L키 (하위 3)
5. 블록 선택 → G키 (모문제A 완료 + 일반 4)
6. 블록 선택 → M키 (모문제B 시작)
7. 블록 선택 → L키 (하위 5 확인!)
8. 블록 선택 → L키 (하위 6)
```

**예상 결과**:
- 모문제A: "1~3의 모문제"
- 일반: 4
- 모문제B: "5~6의 모문제"

---

## 전체 변경 코드

**변경 파일**: `frontend/src/pages/PageViewer.tsx` (1개)

**변경 위치**: L키 case문 (약 10줄 수정)

```typescript
case 'l':
case 'L':
  // Phase 56-H: L키로 하위문제 생성 + 연속 번호 + 메타데이터
  if (selectedBlocks.length > 0 && parentProblemMode.isActive) {
    e.preventDefault();

    // 1. 페이지 연속 번호 계산 (수정)
    const nextNumber = getNextProblemNumberWithContext(
      localGroups,
      previousPageLastNumber
    );

    // 2. 블록 정보 (기존 유지)
    const currentBlocksL = blocksData?.blocks || [];
    const selectedBlocksInfoL = currentBlocksL.filter((b) => selectedBlocks.includes(b.block_id));
    const columnsL = [...new Set(selectedBlocksInfoL.map((b) => b.column))];
    const columnL = columnsL.length === 1 ? columnsL[0] : 'X';

    // 3. 하위문제 그룹 생성 (메타데이터 추가)
    const newChildGroupId = `g_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newChildGroup: ProblemGroup = {
      id: newChildGroupId,
      block_ids: [...selectedBlocks],
      column: columnL as 'L' | 'R' | 'X',
      isParent: false,
      parentGroupId: parentProblemMode.parentGroupId || undefined,
      problemInfo: {
        problemNumber: nextNumber,
        // Phase 56-H: 메타데이터 추가
        bookName: documentSettings?.defaultBookName || bookName,
        course: documentSettings?.defaultCourse || course,
        page: bookPage,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 4. 저장 (기존 유지)
    const updatedGroupsL = [...localGroups, newChildGroup];
    setLocalGroups(updatedGroupsL);
    await saveImmediately(updatedGroupsL, currentPage);

    // 5. 상태 업데이트 (기존 유지)
    setParentProblemMode(prev => ({
      ...prev,
      childNumbers: [...prev.childNumbers, nextNumber],
    }));

    // 6. 블록 선택 해제 (기존 유지)
    setSelectedBlocks([]);

    showToast(`하위문제 ${nextNumber}번 추가됨`, 'success');
  } else if (selectedBlocks.length > 0 && !parentProblemMode.isActive) {
    showToast('먼저 M키로 모문제를 생성하세요', 'warning');
  }
  break;
```

---

## 실행 순서

```
56-H-1 (번호 계산 수정) ← 핵심 변경
    ↓
56-H-2 (메타데이터 추가) ← 저장 형식 통일
    ↓
56-H-3 (import 확인)
    ↓
56-H-4 (테스트)
```

---

## 체크리스트

- [ ] 56-H-1: L키 번호 계산을 `getNextProblemNumberWithContext()` 사용으로 변경
- [ ] 56-H-2: L키 그룹에 bookName, course, page 추가
- [ ] 56-H-3: import 문 확인/추가
- [ ] 56-H-4: 시나리오 A 테스트 (M→L→M→L)
- [ ] 56-H-4: 시나리오 B 테스트 (M→L→G→M→L)
- [ ] 빌드 에러 없음 확인

---

*승인 후 실행: "Phase 56-H 진행해줘"*
