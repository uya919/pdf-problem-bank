# Phase 56-H: 모문제 연속 번호 체계 구현 가능성 분석 v2

**문서 번호**: 214
**작성일**: 2025-12-06
**상위 문서**: [213_phase56h_continuous_numbering_feasibility.md](213_phase56h_continuous_numbering_feasibility.md)

---

## 1. 요구사항 정리

### 1.1 시나리오 A: G키 없이 연속 모문제

```
M키 → 모문제A 생성
L키 → 하위문제 1
L키 → 하위문제 2
L키 → 하위문제 3
M키 → 모문제A 자동 완료 ("1~3의 모문제") + 모문제B 시작
L키 → 하위문제 4  ← 연속!
L키 → 하위문제 5
G키 → 모문제B 완료 ("4~5의 모문제") + 일반 6
```

### 1.2 시나리오 B: G키로 일반 문제 후 새 모문제

```
M키 → 모문제A 생성
L키 → 하위문제 1
L키 → 하위문제 2
L키 → 하위문제 3
G키 → 모문제A 완료 ("1~3의 모문제") + 일반 문제 4
M키 → 모문제B 시작
L키 → 하위문제 5  ← 연속!
L키 → 하위문제 6
G키 → 모문제B 완료 ("5~6의 모문제") + 일반 7
```

### 1.3 공통 요구사항

| 요구사항 | 설명 |
|----------|------|
| **번호 연속성** | 모든 문제(하위/일반)가 페이지 전체에서 연속 |
| **메타데이터 동일** | 하위문제도 일반문제와 같은 형식으로 저장 |
| **모문제 이름 자동** | 하위문제 번호 범위로 자동 생성 |

---

## 2. 현재 코드 동작 분석

### 2.1 M키 로직 (Phase 56-G 구현됨)

```typescript
case 'm':
case 'M':
  if (selectedBlocks.length > 0) {
    // 이미 모드 중이면 이전 모문제 완료
    if (parentProblemMode.isActive) {
      await finalizeParentProblem();  // ← 시나리오 A 지원
    }
    // 새 모문제 생성 + 모드 진입
    // ...
  }
```
✅ **시나리오 A 이미 지원**: M키 연속 입력 시 자동 완료

### 2.2 G키 로직 (Phase 56-G 구현됨)

```typescript
case 'g':
case 'G':
  if (selectedBlocks.length > 0) {
    if (parentProblemMode.isActive) {
      await finalizeParentProblem();  // ← 모드 종료
    }
    handleCreateGroup();  // 일반 그룹 생성
  }
```
✅ **시나리오 B 이미 지원**: G키로 모드 종료 + 일반 그룹 생성

### 2.3 L키 로직 (수정 필요)

**현재**:
```typescript
case 'l':
case 'L':
  if (selectedBlocks.length > 0 && parentProblemMode.isActive) {
    // 문제: 독립적 번호 (1, 2, 3...)
    const nextNumber = String(parentProblemMode.childNumbers.length + 1);
    // ...
  }
```

**필요**:
```typescript
case 'l':
case 'L':
  if (selectedBlocks.length > 0 && parentProblemMode.isActive) {
    // 수정: 페이지 연속 번호
    const nextNumber = getNextProblemNumberWithContext(
      localGroups,
      previousPageLastNumber
    );
    // + 메타데이터 추가
  }
```

---

## 3. 구현 가능성 분석

### 3.1 변경 필요 항목

| 항목 | 현재 상태 | 필요 작업 | 난이도 |
|------|----------|----------|--------|
| **M키 연속 모문제** | ✅ 이미 구현 | 없음 | - |
| **G키 모드 종료** | ✅ 이미 구현 | 없음 | - |
| **L키 연속 번호** | ❌ 독립 번호 | 수정 필요 | 낮음 |
| **L키 메타데이터** | ❌ 누락 | 추가 필요 | 낮음 |

### 3.2 구현 난이도: **낮음** (30~45분)

**이유**:
- 시나리오 A, B의 흐름 제어는 이미 완료
- L키 로직만 수정하면 두 시나리오 모두 자동 지원
- `getNextProblemNumberWithContext()` 함수 존재

---

## 4. 상세 구현 설계

### 4.1 L키 수정 코드

```typescript
case 'l':
case 'L':
  // Phase 56-H: L키로 하위문제 생성 + 연속 번호 + 메타데이터
  if (selectedBlocks.length > 0 && parentProblemMode.isActive) {
    e.preventDefault();

    // 1. 페이지 연속 번호 계산 (기존 함수 사용)
    const nextNumber = getNextProblemNumberWithContext(
      localGroups,
      previousPageLastNumber
    );

    // 2. 블록 정보 가져오기 (기존 코드 유지)
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

    // 4. 저장 (기존 코드 유지)
    const updatedGroupsL = [...localGroups, newChildGroup];
    setLocalGroups(updatedGroupsL);
    await saveImmediately(updatedGroupsL, currentPage);

    // 5. 상태 업데이트 (연속 번호 저장)
    setParentProblemMode(prev => ({
      ...prev,
      childNumbers: [...prev.childNumbers, nextNumber],
    }));

    // 6. 블록 선택 해제
    setSelectedBlocks([]);

    showToast(`하위문제 ${nextNumber}번 추가됨`, 'success');
  }
  break;
```

---

## 5. 시나리오별 동작 검증

### 5.1 시나리오 A: M → L → L → L → M → L

| 단계 | 동작 | localGroups 상태 | childNumbers |
|------|------|------------------|--------------|
| M | 모문제A 생성 | [모A] | [] |
| L | 하위1 생성 | [모A, 1] | ["1"] |
| L | 하위2 생성 | [모A, 1, 2] | ["1","2"] |
| L | 하위3 생성 | [모A, 1, 2, 3] | ["1","2","3"] |
| M | 모A 완료 + 모B 시작 | [모A("1~3"), 1, 2, 3, 모B] | [] (리셋) |
| L | 하위4 생성 | [모A, 1, 2, 3, 모B, 4] | ["4"] |

✅ `getNextProblemNumberWithContext([모A, 1, 2, 3, 모B])` → "4" (마지막 번호 3 + 1)

### 5.2 시나리오 B: M → L → L → L → G → M → L

| 단계 | 동작 | localGroups 상태 | childNumbers |
|------|------|------------------|--------------|
| M | 모문제A 생성 | [모A] | [] |
| L | 하위1 생성 | [모A, 1] | ["1"] |
| L | 하위2 생성 | [모A, 1, 2] | ["1","2"] |
| L | 하위3 생성 | [모A, 1, 2, 3] | ["1","2","3"] |
| G | 모A 완료 + 일반4 | [모A("1~3"), 1, 2, 3, 4] | (모드 종료) |
| M | 모B 시작 | [모A, 1, 2, 3, 4, 모B] | [] |
| L | 하위5 생성 | [모A, 1, 2, 3, 4, 모B, 5] | ["5"] |

✅ `getNextProblemNumberWithContext([모A, 1, 2, 3, 4, 모B])` → "5" (마지막 번호 4 + 1)

---

## 6. 우려되는 점

### 6.1 위험도: **매우 낮음**

| 우려사항 | 심각도 | 분석 | 해결책 |
|----------|--------|------|--------|
| **모문제 자체의 번호** | 없음 | 모문제는 번호 없이 이름만 가짐 | 해당 없음 |
| **번호 계산 정확성** | 없음 | `getNextProblemNumberWithContext`가 모문제 건너뛰고 실제 문제 번호만 계산 | 기존 검증된 로직 |
| **기존 데이터 호환** | 없음 | problemInfo 필드 추가만, 기존 필드 유지 | 변경 없음 |
| **성능** | 없음 | 함수 호출 1회 추가 | 무시 가능 |

### 6.2 Edge Case 분석

#### Case 1: 빈 모문제 (하위문제 없이 바로 M 또는 G)
```
M → M (하위문제 없이 새 모문제)
```
- 결과: 모문제A는 "(빈 모문제)"로 명명
- 다음 번호는 현재 페이지/이전 페이지 기준으로 계산
✅ 정상 동작

#### Case 2: 페이지 중간에서 시작
```
이전 페이지 마지막 번호: "10"
M → L → L
```
- 결과: 하위문제 11, 12 생성
✅ 정상 동작

#### Case 3: 복합 번호 패턴
```
이전 번호: "3-2"
M → L → L
```
- 결과: `incrementProblemNumber("3-2")` → "3-3", "3-4"
✅ 정상 동작 (기존 함수가 복합 패턴 지원)

---

## 7. 구현 계획

### Phase 56-H: 모문제 연속 번호 체계

| 단계 | 내용 | 시간 |
|------|------|------|
| 56-H-1 | L키 번호 계산 수정 (`getNextProblemNumberWithContext` 사용) | 15분 |
| 56-H-2 | L키 메타데이터 추가 (bookName, course, page) | 10분 |
| 56-H-3 | 시나리오 A, B 테스트 | 15분 |

**총 예상 시간**: 40분

---

## 8. 결론

| 항목 | 평가 |
|------|------|
| **구현 가능성** | ✅ 매우 높음 |
| **난이도** | 매우 낮음 (40분) |
| **위험도** | 매우 낮음 |
| **시나리오 A 지원** | ✅ 자동 지원 |
| **시나리오 B 지원** | ✅ 자동 지원 |

### 핵심 포인트

1. **M키, G키 로직은 이미 완료** - 흐름 제어 OK
2. **L키만 수정** - 번호 계산 방식 변경
3. **하나의 수정으로 두 시나리오 모두 해결**

---

## 9. 최종 동작 요약

```
┌─────────────────────────────────────────────────────────────┐
│ 시나리오 A: M → L(1) → L(2) → L(3) → M → L(4) → L(5) → G   │
│            ├─── 모문제A ───┤    ├─── 모문제B ───┤   일반6  │
│            모A: "1~3의 모문제"   모B: "4~5의 모문제"         │
├─────────────────────────────────────────────────────────────┤
│ 시나리오 B: M → L(1) → L(2) → L(3) → G → M → L(5) → L(6)   │
│            ├─── 모문제A ───┤ 일반4 ├─── 모문제B ───┤       │
│            모A: "1~3의 모문제"      모B: "5~6의 모문제"      │
└─────────────────────────────────────────────────────────────┘
```

---

*승인 후 실행: "Phase 56-H 진행해줘"*
