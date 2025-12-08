# Phase 9 추가 UX 개선 - 상세 구현 계획

## 개요

Phase 9 Quick Wins 완료 후, 사용자 피드백을 반영한 추가 UX 개선사항 2가지에 대한 안정성 중심의 단계별 구현 계획입니다.

**작성일**: 2025-01-26
**기반**: Phase 9 Quick Wins 완료 상태
**목표**: 안정적이고 점진적인 개선

---

## 의존성 분석

### 기능 독립성

두 기능은 **서로 독립적**입니다:

| 기능 | 수정 파일 | 수정 범위 |
|------|----------|----------|
| Enter 키 편집 확정 | `GroupPanel.tsx` | 키보드 이벤트 핸들러 추가 |
| 페이지 통합 문항번호 | `problemNumberUtils.ts` | 번호 계산 로직 수정 |

### Phase 9와의 관계

| Phase 9 기능 | 기능 1 영향 | 기능 2 영향 |
|-------------|-----------|-----------|
| 9-1: 자동 편집 모드 | 없음 | 없음 |
| 9-2: 문항번호 증가 | **로직 교체** | 없음 |
| 9-3: G 키 단축키 | 없음 | 없음 |
| 9-4: Ctrl+S 저장 | 없음 | 없음 |

**중요**: 기능 1은 Phase 9-2의 로직을 개선하는 것이므로, 기존 Phase 9-2 코드를 대체합니다.

### 권장 구현 순서

**1순위: 기능 2 (Enter 키 편집 확정)**
- 이유: 변경 범위가 작고, 독립적
- 예상 시간: 1.5시간

**2순위: 기능 1 (페이지 통합 문항번호)**
- 이유: 로직 변경, 더 많은 테스트 필요
- 예상 시간: 3시간

---

## 기능 2: Enter 키로 편집 확정

### 📋 구현 목표 및 범위

**목표**:
- 문항 정보 편집 중 Enter 키를 누르면 즉시 저장 및 편집 모드 종료
- Escape 키로 편집 취소 지원
- 기존 체크(✓), X 버튼 기능 유지

**범위**:
- `GroupPanel.tsx`의 편집 모드 영역에만 적용
- 입력 필드별 개별 이벤트가 아닌, div 레벨 이벤트로 통합 처리

**비범위**:
- 다른 컴포넌트의 키보드 이벤트는 수정하지 않음
- PageViewer의 전역 키보드 이벤트와 충돌하지 않음 (이미 입력 필드 예외 처리 있음)

---

### 🔧 상세 구현 단계

#### Step 1: 키보드 이벤트 핸들러 함수 추가

**파일**: `c:\MYCLAUDE_PROJECT\pdf\frontend\src\components\GroupPanel.tsx`
**위치**: `startEditing` 함수 다음 (84행 이후)

**코드**:
```typescript
// 편집 모드 키보드 핸들러 (Phase 9 추가)
const handleEditFormKeyDown = (e: React.KeyboardEvent, groupId: string) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    e.stopPropagation();
    saveEdit(groupId);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    cancelEdit();
  }
};
```

**설명**:
- `preventDefault()`: 폼 제출 등 기본 동작 방지
- `stopPropagation()`: 부모로 이벤트 전파 방지 (PageViewer의 전역 핸들러로 가지 않도록)

#### Step 2: 편집 모드 div에 onKeyDown 적용

**파일**: `c:\MYCLAUDE_PROJECT\pdf\frontend\src\components\GroupPanel.tsx`
**위치**: 편집 모드 div (98행 근처)

**변경 전**:
```tsx
<div className="space-y-3">
  <div className="flex items-center justify-between">
    <span className="text-sm font-semibold text-green-700">문항 정보 편집</span>
    {/* ... */}
  </div>
  {/* 입력 필드들 */}
</div>
```

**변경 후**:
```tsx
<div
  className="space-y-3"
  onKeyDown={(e) => handleEditFormKeyDown(e, group.id)}
>
  <div className="flex items-center justify-between">
    <span className="text-sm font-semibold text-green-700">문항 정보 편집</span>
    {/* ... */}
  </div>
  {/* 입력 필드들 */}
</div>
```

#### Step 3: 사용자 힌트 추가 (선택 사항)

**위치**: 편집 모드 헤더 (100행 근처)

**추가 코드**:
```tsx
<div className="flex items-center justify-between">
  <div>
    <span className="text-sm font-semibold text-green-700">문항 정보 편집</span>
    <span className="text-xs text-gray-500 ml-2">Enter: 저장 | Esc: 취소</span>
  </div>
  <div className="flex items-center gap-1">
    {/* 기존 버튼들 */}
  </div>
</div>
```

#### Step 4: 테스트

테스트 체크리스트 참조 (아래 섹션)

---

### 🛡️ 안전 장치

#### 1. 이벤트 전파 차단
- `stopPropagation()`: PageViewer의 전역 키보드 핸들러로 전파되지 않도록 방지
- 현재 PageViewer는 입력 필드에서 키보드 이벤트를 무시하지만, 이중 안전장치

#### 2. 기존 버튼 기능 보존
- Enter/Escape 핸들러는 **추가**일 뿐, 기존 체크/X 버튼 제거하지 않음
- 사용자가 원하는 방법 선택 가능

#### 3. 엣지 케이스 처리

**케이스 1: 필수 필드 미입력 상태에서 Enter**
- 현재 `saveEdit` 함수에 검증 로직 있음:
  ```typescript
  if (onUpdateGroupInfo && editForm.bookName && editForm.problemNumber) {
    // 저장
  }
  ```
- Enter를 눌러도 조건 미충족 시 아무 일도 일어나지 않음 (안전)

**케이스 2: textarea에서 Enter (향후 확장 대비)**
- 현재는 input만 사용하므로 문제 없음
- 향후 textarea 추가 시 `e.target instanceof HTMLTextAreaElement` 체크 필요

---

### ✅ 테스트 체크리스트

#### 정상 시나리오
- [ ] 그룹 생성 → 자동 편집 모드 진입 → 문항번호 입력 → **Enter** → 저장 완료 및 편집 종료
- [ ] 편집 모드 → 책이름 수정 → **Enter** → 저장 완료
- [ ] 편집 모드 → 과정 수정 → **Escape** → 변경 취소 및 편집 종료

#### 엣지 케이스
- [ ] 필수 필드(책이름, 문항번호) 비어있을 때 Enter → 아무 일도 일어나지 않음
- [ ] 편집 모드에서 Tab 키로 필드 이동 → 정상 동작
- [ ] 페이지 필드에서 Enter → 저장 (숫자 입력 필드도 동일 동작)

#### 기존 기능 회귀 테스트
- [ ] 체크(✓) 버튼 클릭 → 저장 정상 동작
- [ ] X 버튼 클릭 → 취소 정상 동작
- [ ] 편집 모드 외부 클릭 → 아무 일도 일어나지 않음 (정상)

#### 다른 기능과의 통합 테스트
- [ ] Ctrl+S (전역 저장) → 편집 중이어도 정상 동작
- [ ] G 키 (그룹 생성) → 편집 모드에서는 무시됨 (input 필드 예외 처리)

---

### 🔄 롤백 계획

**문제 발생 시 조치**:

1. **Step 1 롤백**: `handleEditFormKeyDown` 함수 제거 (5초)
2. **Step 2 롤백**: `onKeyDown` 속성 제거 (5초)
3. **Step 3 롤백**: 힌트 텍스트 제거 (5초)

**예상 롤백 시간**: 총 **5분 이내**

**데이터 영향**: 없음 (UI 동작만 변경)

---

### ⏱️ 예상 시간

| 작업 | 예상 시간 |
|------|----------|
| 구현 (Step 1-3) | 30분 |
| 테스트 (정상+엣지) | 45분 |
| 통합 테스트 | 15분 |
| **총계** | **1.5시간** |

---

## 기능 1: 페이지 전체 통합 문항번호

### 📋 구현 목표 및 범위

**목표**:
- 문항번호를 컬럼(L/R) 구분 없이 페이지 전체에서 연속적으로 부여
- 예: L1→"7", L2→"8", L3→"9", R1→"10", R2→"11"

**현재 동작**:
```
L1 → "1" (L 컬럼의 첫 번째)
L2 → "2"
R1 → "1" (R 컬럼의 첫 번째, 다시 1부터 시작)
```

**변경 후 동작**:
```
L1 → "7"
L2 → "8"
L3 → "9"
R1 → "10" (L3의 "9" 다음)
R2 → "11"
```

**범위**:
- `problemNumberUtils.ts`의 문항번호 계산 로직만 수정
- 블록의 `column` 속성은 여전히 유지 (UI에서 좌우 구분 필요)
- 그룹 생성 순서에 따라 번호 부여 (생성 순서 기반)

**비범위**:
- UI 표시 순서 변경하지 않음 (그룹은 생성 순서대로 표시)
- 데이터 구조 변경 없음

---

### 🔧 상세 구현 단계

#### Step 1: 새로운 함수 구현 (하위 호환성 유지)

**파일**: `c:\MYCLAUDE_PROJECT\pdf\frontend\src\utils\problemNumberUtils.ts`
**위치**: 기존 함수 위에 추가 (85행 이전)

**추가 코드**:
```typescript
/**
 * Get the last used problem number from all groups on the page
 * (Column-independent: problem numbers are sequential across the entire page)
 *
 * Phase 9 추가: 페이지 전체 기준 마지막 문항번호 조회
 */
export function getLastProblemNumberOnPage(
  groups: Array<{ column: string; problemInfo?: { problemNumber?: string } }>
): string | null {
  // 페이지 전체 그룹에서 문항번호가 있는 그룹 필터링 (컬럼 무관)
  const groupsWithProblemNumber = groups
    .filter(g => g.problemInfo?.problemNumber)
    .map(g => g.problemInfo!.problemNumber!);

  if (groupsWithProblemNumber.length === 0) {
    return null;
  }

  // Return the last one (most recently created)
  return groupsWithProblemNumber[groupsWithProblemNumber.length - 1];
}
```

#### Step 2: getNextProblemNumber 함수 수정

**파일**: `c:\MYCLAUDE_PROJECT\pdf\frontend\src\utils\problemNumberUtils.ts`
**위치**: 103-116행

**변경 전**:
```typescript
export function getNextProblemNumber(
  groups: Array<{ column: string; problemInfo?: { problemNumber?: string } }>,
  column: string
): string {
  const lastNumber = getLastProblemNumber(groups, column);

  if (!lastNumber) {
    return '1'; // First problem in this column
  }

  return incrementProblemNumber(lastNumber);
}
```

**변경 후**:
```typescript
/**
 * Get the suggested next problem number for a new group
 *
 * Phase 9 추가: 페이지 전체 기준 (컬럼 무관)
 */
export function getNextProblemNumber(
  groups: Array<{ column: string; problemInfo?: { problemNumber?: string } }>,
  _column?: string  // 하위 호환성을 위해 파라미터 유지, 사용하지 않음
): string {
  // Phase 9 추가: 페이지 전체에서 마지막 문항번호 조회 (컬럼 무관)
  const lastNumber = getLastProblemNumberOnPage(groups);

  if (!lastNumber) {
    return '1'; // First problem on this page
  }

  return incrementProblemNumber(lastNumber);
}
```

**변경 사항**:
- `getLastProblemNumber(groups, column)` → `getLastProblemNumberOnPage(groups)`
- `column` 파라미터를 optional로 변경 (`_column?`)
- 주석 업데이트

#### Step 3: 기존 함수 deprecation (선택 사항)

**파일**: `c:\MYCLAUDE_PROJECT\pdf\frontend\src\utils\problemNumberUtils.ts`
**위치**: 85행

**추가 주석**:
```typescript
/**
 * Get the last used problem number from existing groups in the same column
 *
 * @deprecated Phase 9에서 페이지 전체 기준으로 변경됨. getLastProblemNumberOnPage() 사용 권장.
 */
export function getLastProblemNumber(
  groups: Array<{ column: string; problemInfo?: { problemNumber?: string } }>,
  column: string
): string | null {
  // ... 기존 코드 유지 (롤백 대비)
}
```

#### Step 4: GroupPanel 호출 코드 확인 (수정 불필요)

**파일**: `c:\MYCLAUDE_PROJECT\pdf\frontend\src\components\GroupPanel.tsx`
**위치**: 70행

**현재 코드**:
```typescript
const suggestedProblemNumber = group.problemInfo?.problemNumber
  || getNextProblemNumber(groups, group.column);
```

**확인 사항**:
- 함수 시그니처가 호환되므로 수정 불필요
- `column` 파라미터가 전달되지만 내부에서 무시됨

---

### 🛡️ 안전 장치

#### 1. 하위 호환성 유지
- `getNextProblemNumber`의 파라미터는 그대로 유지 (optional로만 변경)
- 호출 코드 수정 불필요

#### 2. 기존 함수 보존
- `getLastProblemNumber` 함수 제거하지 않음
- 향후 컬럼별 조회가 필요할 수 있으므로 deprecation만 표시

#### 3. 데이터 무결성
- 이미 저장된 문항번호는 변경되지 않음
- 새로 생성하는 그룹만 새 로직 적용

#### 4. 사용자 입력 우선
- 자동 증가는 "제안"일 뿐, 사용자가 수동으로 입력 가능
- 사용자가 "3-1"을 입력하면 그대로 저장됨

---

### ✅ 테스트 체크리스트

#### 정상 시나리오

**시나리오 1: 순차 생성**
- [ ] 빈 페이지에서 L1 생성 → 문항번호 "1" 제안
- [ ] L1에 "1" 저장 → L2 생성 → 문항번호 "2" 제안
- [ ] L2에 "2" 저장 → R1 생성 → 문항번호 **"3"** 제안 (컬럼 무관)
- [ ] R1에 "3" 저장 → R2 생성 → 문항번호 "4" 제안

**시나리오 2: R 먼저 생성**
- [ ] 빈 페이지에서 R1 생성 → 문항번호 "1" 제안
- [ ] R1에 "1" 저장 → L1 생성 → 문항번호 "2" 제안 (정상: 생성 순서 기반)

**시나리오 3: 중간에 사용자 수동 입력**
- [ ] L1→"7", L2→"8" → R1 생성 → "9" 제안 (정상)
- [ ] R1에 **"100"** 수동 입력 → R2 생성 → "101" 제안 (사용자 입력 기반)

#### 복합 패턴 유지 (incrementProblemNumber 테스트)

- [ ] L1→"3-1" → L2 생성 → **"3-2"** 제안 (복합 번호)
- [ ] L1→"3~5" → L2 생성 → **"6~8"** 제안 (범위)
- [ ] L1→"3-(가)" → L2 생성 → **"3-(나)"** 제안 (한글)

#### 엣지 케이스

**케이스 1: 그룹 삭제 후 재생성**
- [ ] L1→"7", L2→"8", R1→"9"
- [ ] L2 삭제
- [ ] L2 재생성 → "9" 제안 (마지막 문항 "9" 기준, 정상)

**케이스 2: 페이지에 그룹 하나도 없을 때**
- [ ] 빈 페이지에서 첫 그룹 생성 → "1" 제안

**케이스 3: 모든 그룹에 문항번호 없을 때**
- [ ] 그룹 3개 있지만 모두 문항번호 미입력
- [ ] 새 그룹 생성 → "1" 제안

#### 기존 기능 회귀 테스트

- [ ] 이미 저장된 그룹의 문항번호는 변경되지 않음
- [ ] Phase 9-1 (자동 편집 모드) 정상 동작
- [ ] Phase 9-3 (G 키 단축키) 정상 동작
- [ ] Phase 9-4 (Ctrl+S 저장) 정상 동작

---

### 🔄 롤백 계획

**문제 발생 시 조치**:

#### Option A: 빠른 롤백 (5분)

`getNextProblemNumber` 함수만 원래대로 되돌림:

```typescript
export function getNextProblemNumber(
  groups: Array<{ column: string; problemInfo?: { problemNumber?: string } }>,
  column: string
): string {
  const lastNumber = getLastProblemNumber(groups, column);  // 원래대로
  if (!lastNumber) {
    return '1';
  }
  return incrementProblemNumber(lastNumber);
}
```

#### Option B: 완전 롤백 (10분)

Step 1에서 추가한 `getLastProblemNumberOnPage` 함수 제거 및 주석 원복

**예상 롤백 시간**: 5-10분

**데이터 영향**:
- **없음** (이미 저장된 문항번호는 변경되지 않음)
- 새로 생성하는 그룹만 다시 컬럼별 독립 로직 적용

---

### ⏱️ 예상 시간

| 작업 | 예상 시간 |
|------|----------|
| 구현 (Step 1-4) | 45분 |
| 단위 테스트 | 1시간 |
| 복합 패턴 테스트 | 30분 |
| 회귀 테스트 | 45분 |
| **총계** | **3시간** |

---

## 종합 타임라인

### 권장 작업 순서

```
Day 1 오전 (2시간):
  ├─ 기능 2 구현 (30분)
  ├─ 기능 2 테스트 (1시간)
  └─ 기능 2 완료 확인 (30분)

Day 1 오후 (4.5시간):
  ├─ 기능 1 구현 (45분)
  ├─ 기능 1 테스트 (2시간)
  └─ 통합 테스트 (1시간)
  └─ 문서 업데이트 (45분)
```

### 총 예상 시간

| 항목 | 시간 |
|------|------|
| 기능 2: Enter 키 편집 확정 | 1.5시간 |
| 기능 1: 페이지 통합 문항번호 | 3시간 |
| 통합 테스트 | 1시간 |
| 문서 업데이트 | 0.5시간 |
| **총계** | **~1일 (6시간)** |

---

## 위험 관리

### 잠재적 위험

| 위험 | 영향도 | 발생 확률 | 대응 방안 |
|------|--------|----------|----------|
| 기능 2: 다른 키보드 이벤트와 충돌 | 중 | 낮음 | stopPropagation 추가 |
| 기능 1: 사용자가 기대와 다른 번호 | 중 | 중간 | 명확한 설명 제공, 수동 입력 가능 |
| Phase 9 기존 기능 회귀 | 높음 | 낮음 | 철저한 회귀 테스트 |

### 완화 전략

1. **점진적 구현**: 기능 2 완료 후 기능 1 시작
2. **철저한 테스트**: 각 단계별 체크리스트 준수
3. **빠른 롤백**: 5-10분 이내 롤백 가능하도록 준비

---

## 성공 기준

### 기능 2 (Enter 키)
- [ ] Enter로 저장, Escape로 취소 정상 동작
- [ ] 기존 버튼 기능 유지
- [ ] Phase 9 기능 정상 동작

### 기능 1 (통합 문항번호)
- [ ] 컬럼 무관 순차 번호 부여
- [ ] 복합 패턴 유지
- [ ] 사용자 수동 입력 우선
- [ ] Phase 9 기능 정상 동작

### 전체
- [ ] 회귀 테스트 100% 통과
- [ ] 롤백 계획 검증 완료
- [ ] 문서 업데이트 완료

---

## 참고 문서

- `14_ux_improvement_implementation_plan.md`: Phase 9 Quick Wins 구현 계획
- `13_labeling_ux_research_report.md`: UX 리서치 리포트
- Phase 9 Quick Wins 완료 상태: 모든 기능 구현 완료
