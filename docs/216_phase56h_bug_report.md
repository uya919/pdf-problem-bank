# Phase 56-H 버그 리포트: 하위문제 번호가 "(모문제)"로 표시됨

**문서 번호**: 216
**작성일**: 2025-12-06
**심각도**: 높음 (기능 동작 안 함)

---

## 1. 증상

### 화면에서 보이는 문제
```
M키 → 모문제 생성 ✅
L키 → "(모문제)"로 표시됨 ❌ (5번이어야 함)
L키 → "(모문제)"로 표시됨 ❌ (6번이어야 함)
```

**토스트 메시지**: `하위문제 (모문제)번 추가됨`

---

## 2. 원인 분석

### 데이터 흐름 추적

```
1. M키로 모문제 생성
   └─ problemInfo.problemNumber = "(모문제)"

2. L키로 하위문제 생성
   └─ getNextProblemNumberWithContext(localGroups, previousPageLastNumber) 호출
      └─ getLastProblemNumberOnPage(localGroups) 호출
         └─ 모든 그룹의 problemNumber 확인
         └─ 마지막 그룹: 모문제 → problemNumber = "(모문제)"
         └─ return "(모문제)"  ← 문제 발생!

   └─ incrementProblemNumber("(모문제)") 호출
      └─ 패턴 1: /^(\d+)-(\d+)$/ → 매칭 안 됨
      └─ 패턴 2: /^(\d+)~(\d+)$/ → 매칭 안 됨
      └─ 패턴 3: /^(\d+)-\(([가-힣])\)$/ → 매칭 안 됨
      └─ 패턴 4: /^(\d+)$/ → 매칭 안 됨
      └─ return "(모문제)"  ← 그대로 반환!
```

### 근본 원인

| 위치 | 문제 |
|------|------|
| `getLastProblemNumberOnPage()` | 모문제(isParent: true)를 포함하여 계산 |
| `incrementProblemNumber()` | "(모문제)"를 숫자로 변환 못함 → 그대로 반환 |

---

## 3. 문제 코드

### problemNumberUtils.ts - getLastProblemNumberOnPage

```typescript
// 현재 코드 (문제)
export function getLastProblemNumberOnPage(
  groups: Array<{ column: string; problemInfo?: { problemNumber?: string } }>
): string | null {
  const groupsWithProblemNumber = groups
    .filter(g => g.problemInfo?.problemNumber)  // ← 모문제도 포함됨!
    .map(g => g.problemInfo!.problemNumber!);

  // ...
  return groupsWithProblemNumber[groupsWithProblemNumber.length - 1];
  // ← "(모문제)" 반환!
}
```

### problemNumberUtils.ts - incrementProblemNumber

```typescript
// 현재 코드
export function incrementProblemNumber(problemNumber: string): string {
  // ... 패턴 매칭들 ...

  // 알 수 없는 패턴: 그대로 반환
  return trimmed;  // ← "(모문제)" 그대로 반환!
}
```

---

## 4. 해결 방안

### 방안 A: getLastProblemNumberOnPage에서 모문제 제외 (권장)

```typescript
export function getLastProblemNumberOnPage(
  groups: Array<{
    column: string;
    problemInfo?: { problemNumber?: string };
    isParent?: boolean;  // 추가
  }>
): string | null {
  const groupsWithProblemNumber = groups
    .filter(g =>
      g.problemInfo?.problemNumber &&
      !g.isParent  // 모문제 제외
    )
    .map(g => g.problemInfo!.problemNumber!);

  // ...
}
```

**장점**: 명확한 의도, 모문제를 완전히 제외
**단점**: 타입 확장 필요

---

### 방안 B: 숫자 패턴만 유효한 번호로 인정

```typescript
export function getLastProblemNumberOnPage(
  groups: Array<{ column: string; problemInfo?: { problemNumber?: string } }>
): string | null {
  const groupsWithProblemNumber = groups
    .filter(g => {
      const num = g.problemInfo?.problemNumber;
      // 숫자로 시작하는 번호만 유효
      return num && /^\d/.test(num);
    })
    .map(g => g.problemInfo!.problemNumber!);

  // ...
}
```

**장점**: 타입 변경 없음
**단점**: "(모문제)" 외 다른 비숫자 패턴도 제외됨

---

### 방안 C: incrementProblemNumber에서 숫자 추출 시도

```typescript
export function incrementProblemNumber(problemNumber: string): string {
  // ... 기존 패턴들 ...

  // 패턴 5: 숫자 추출 시도 (예: "문제4" → "5")
  const extractMatch = trimmed.match(/(\d+)/);
  if (extractMatch) {
    const num = parseInt(extractMatch[1], 10);
    return String(num + 1);
  }

  // 숫자 없음: 1부터 시작
  return '1';
}
```

**장점**: 더 유연한 패턴 처리
**단점**: 의도치 않은 동작 가능성

---

## 5. 권장 해결책: 방안 A + B 조합

### 수정 1: getLastProblemNumberOnPage 타입 확장

```typescript
export function getLastProblemNumberOnPage(
  groups: Array<{
    column: string;
    problemInfo?: { problemNumber?: string };
    isParent?: boolean;
  }>
): string | null {
  const groupsWithProblemNumber = groups
    .filter(g => {
      const num = g.problemInfo?.problemNumber;
      // 1. 모문제 제외
      if (g.isParent) return false;
      // 2. 숫자로 시작하는 번호만 유효
      return num && /^\d/.test(num);
    })
    .map(g => g.problemInfo!.problemNumber!);

  if (groupsWithProblemNumber.length === 0) {
    return null;
  }

  return groupsWithProblemNumber[groupsWithProblemNumber.length - 1];
}
```

### 수정 2: getNextProblemNumberWithContext도 동일하게 수정

함수 시그니처에 `isParent` 추가.

---

## 6. 영향 범위

| 파일 | 변경 |
|------|------|
| `problemNumberUtils.ts` | `getLastProblemNumberOnPage` 수정 |
| `problemNumberUtils.ts` | `getNextProblemNumberWithContext` 수정 |
| 기타 파일 | 변경 없음 (함수 호출부는 이미 `ProblemGroup` 타입 사용) |

---

## 7. 예상 결과

### 수정 후 동작

```
M키 → 모문제 생성 (problemNumber: "(모문제)")
     ↓
     localGroups = [모문제]
     getLastProblemNumberOnPage → null (모문제 제외)
     이전 페이지 마지막: "4"
     incrementProblemNumber("4") → "5"
     ↓
L키 → 하위문제 5 생성 ✅
     ↓
     localGroups = [모문제, 5]
     getLastProblemNumberOnPage → "5" (모문제 제외, 5만 유효)
     incrementProblemNumber("5") → "6"
     ↓
L키 → 하위문제 6 생성 ✅
```

---

## 8. 구현 계획

| 단계 | 내용 | 시간 |
|------|------|------|
| 56-H-fix-1 | `getLastProblemNumberOnPage` 수정 | 10분 |
| 56-H-fix-2 | `getNextProblemNumberWithContext` 타입 확장 | 5분 |
| 56-H-fix-3 | 테스트 | 5분 |

**총 예상 시간**: 20분

---

*승인 후 실행: "버그 수정해줘"*
