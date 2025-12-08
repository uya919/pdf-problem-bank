# Phase 56-H: 모문제 연속 번호 체계 구현 가능성 분석

**문서 번호**: 213
**작성일**: 2025-12-06
**상위 문서**: [212_phase56g_workflow_v2_plan.md](212_phase56g_workflow_v2_plan.md)

---

## 1. 현재 문제점

### 1.1 문제 1: 하위문제 번호가 독립적

**현재 동작**:
```
M키 → 모문제 생성 (번호 없음, 이름: "(모문제)")
L키 → 하위문제 1 생성 (childNumbers.length + 1 = 1)
L키 → 하위문제 2 생성 (childNumbers.length + 1 = 2)
L키 → 하위문제 3 생성 (childNumbers.length + 1 = 3)
G키 → 모문제 완료 ("1~3의 모문제") + 일반 문제 1 생성 ← 문제!
```

**원하는 동작**:
```
M키 → 모문제 생성
L키 → 하위문제 1 생성 (페이지 첫 문제)
L키 → 하위문제 2 생성 (페이지 연속)
L키 → 하위문제 3 생성 (페이지 연속)
G키 → 모문제 완료 ("1~3의 모문제") + 일반 문제 4 생성 ← 연속!
M키 → 새 모문제 생성
L키 → 하위문제 5 생성 ← 연속!
```

### 1.2 문제 2: 하위문제에 메타데이터 누락

**현재 저장 형식** (L키 생성 시):
```typescript
problemInfo: {
  problemNumber: "1",  // 번호만 저장
  // bookName: 없음
  // course: 없음
  // page: 없음
}
```

**원하는 저장 형식**:
```typescript
problemInfo: {
  problemNumber: "1",
  bookName: "베이직쎈",
  course: "공통수학1",
  page: 15,
}
```

---

## 2. 현재 코드 분석

### 2.1 일반 그룹 생성 (G키)

```typescript
// PageViewer.tsx - handleCreateGroup
// GroupPanel에서 suggestedNextNumber를 계산하여 사용
const suggestedNextNumber = getNextProblemNumberWithContext(
  localGroups,
  previousPageLastNumber
);
```

이 함수는:
1. 현재 페이지 그룹들 중 마지막 problemNumber 확인
2. 없으면 이전 페이지의 마지막 번호 사용
3. `incrementProblemNumber()`로 +1

### 2.2 하위문제 생성 (L키) - 현재

```typescript
// PageViewer.tsx - case 'l':
const nextNumber = String(parentProblemMode.childNumbers.length + 1);
// → 모문제 내에서 1, 2, 3으로 독립적 번호 부여
```

**문제**: `getNextProblemNumberWithContext()` 미사용

---

## 3. 구현 가능성 분석

### 3.1 필요한 변경사항

| 항목 | 현재 | 변경 후 | 난이도 |
|------|------|---------|--------|
| **L키 번호 계산** | `childNumbers.length + 1` | `getNextProblemNumberWithContext()` 사용 | **낮음** |
| **L키 메타데이터** | problemNumber만 | bookName, course, page 추가 | **낮음** |
| **모문제 이름** | 하위문제 번호로 계산 | 그대로 유지 (로직 자동 적용) | 없음 |

### 3.2 구현 난이도: **낮음** (1시간 이내)

**이유**:
- `getNextProblemNumberWithContext()` 함수가 이미 존재
- 메타데이터는 PageViewer에서 이미 접근 가능
- 기존 로직 재사용

---

## 4. 상세 구현 설계

### 4.1 L키 로직 수정

**변경 전**:
```typescript
case 'l':
case 'L':
  if (selectedBlocks.length > 0 && parentProblemMode.isActive) {
    // 문제: 독립적 번호 계산
    const nextNumber = String(parentProblemMode.childNumbers.length + 1);

    const newChildGroup: ProblemGroup = {
      // ...
      problemInfo: {
        problemNumber: nextNumber,  // 1, 2, 3...
      },
    };
  }
```

**변경 후**:
```typescript
case 'l':
case 'L':
  if (selectedBlocks.length > 0 && parentProblemMode.isActive) {
    // 수정: 페이지 연속 번호 계산
    const nextNumber = getNextProblemNumberWithContext(
      localGroups,
      previousPageLastNumber
    );

    const newChildGroup: ProblemGroup = {
      // ...
      problemInfo: {
        problemNumber: nextNumber,  // 1, 2, 3... (연속)
        bookName: documentSettings?.defaultBookName || bookName,
        course: documentSettings?.defaultCourse || course,
        page: bookPage,
      },
    };
  }
```

### 4.2 childNumbers 관리 수정

**변경 전**:
```typescript
setParentProblemMode(prev => ({
  ...prev,
  childNumbers: [...prev.childNumbers, nextNumber],  // ["1", "2", "3"]
}));
```

**변경 후**:
```typescript
// 그대로 유지 - nextNumber가 이제 연속 번호이므로 자동으로 맞음
setParentProblemMode(prev => ({
  ...prev,
  childNumbers: [...prev.childNumbers, nextNumber],  // ["1", "2", "3"] or ["5", "6", "7"]
}));
```

### 4.3 모문제 이름 생성 (자동 적용)

```typescript
// finalizeParentProblem() - 변경 불필요
const childNums = parentProblemMode.childNumbers;
// ["5", "6", "7"] → "5~7의 모문제" (자동으로 연속 번호 반영)
```

---

## 5. 우려되는 점

### 5.1 위험도: **매우 낮음**

| 우려사항 | 심각도 | 해결책 |
|----------|--------|--------|
| **기존 데이터 호환성** | 없음 | problemInfo 필드 추가만, 기존 필드 유지 |
| **번호 중복 가능성** | 없음 | `getNextProblemNumberWithContext`가 중복 방지 |
| **모문제 이름 오류** | 없음 | childNumbers에 실제 번호 저장되어 자동 정확 |

### 5.2 상세 시나리오

#### 시나리오 1: 첫 페이지에서 모문제 시작
```
페이지 10 (이전 페이지 없음):
M → 모문제 생성
L → 하위 1 (getNextProblemNumberWithContext → "1")
L → 하위 2 (getNextProblemNumberWithContext → "2")
G → 모문제 완료 ("1~2의 모문제") + 일반 3
```
✅ 정상 동작

#### 시나리오 2: 중간 페이지에서 시작
```
페이지 15 (이전 페이지 마지막 번호: "10"):
M → 모문제 생성
L → 하위 11 (이전 10 + 1)
L → 하위 12
G → 모문제 완료 ("11~12의 모문제") + 일반 13
```
✅ 정상 동작

#### 시나리오 3: 한 페이지에서 두 번째 모문제
```
페이지 15:
M → 모문제 A
L → 하위 1, 2, 3
G → 완료 ("1~3의 모문제") + 일반 4
M → 모문제 B ← 새 모문제
L → 하위 5 ← 연속!
L → 하위 6
G → 완료 ("5~6의 모문제") + 일반 7
```
✅ 정상 동작

---

## 6. 장점

| 장점 | 설명 |
|------|------|
| **일관성** | 모든 문제가 동일한 형식으로 저장 |
| **연속성** | 페이지 전체에서 연속 번호 |
| **자동화** | 모문제 이름도 자동으로 올바른 범위 표시 |
| **최소 변경** | 기존 함수 재사용, 변경 최소화 |

---

## 7. 구현 계획

### Phase 56-H: 모문제 연속 번호 체계

| 단계 | 내용 | 시간 |
|------|------|------|
| 56-H-1 | L키 번호 계산을 `getNextProblemNumberWithContext()` 사용으로 변경 | 15분 |
| 56-H-2 | L키 그룹에 메타데이터(bookName, course, page) 추가 | 15분 |
| 56-H-3 | 테스트 및 검증 | 15분 |

**총 예상 시간**: 45분

---

## 8. 결론

| 항목 | 평가 |
|------|------|
| **구현 가능성** | ✅ 매우 높음 |
| **난이도** | 매우 낮음 (45분) |
| **위험도** | 매우 낮음 |
| **기존 코드 영향** | 최소 (L키 로직만 수정) |

### 권장사항

**즉시 구현을 권장합니다.**

- 이미 필요한 함수가 존재 (`getNextProblemNumberWithContext`)
- 변경 범위가 L키 케이스 하나에 국한
- 사용자 기대와 일치하는 자연스러운 동작

---

## 9. 최종 비교

### Before (현재)
```
M → L → L → L → G → M → L → L
    1    2    3    1     1    2   ← 번호 리셋!
모문제: "1~3의 모문제"
새 모문제: "1~2의 모문제"  ← 동일 범위!
```

### After (수정 후)
```
M → L → L → L → G → M → L → L
    1    2    3    4     5    6   ← 연속!
모문제: "1~3의 모문제"
새 모문제: "5~6의 모문제"  ← 정확한 범위!
```

---

*승인 후 실행: "Phase 56-H 진행해줘"*
