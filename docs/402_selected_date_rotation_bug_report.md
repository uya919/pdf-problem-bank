# 캘린더 날짜 선택 시 순환수업 미표시 버그 분석

**문서 번호**: 402
**작성일**: 2025-12-20
**유형**: 버그 연구 리포트
**상태**: 분석 완료

---

## 1. 문제 요약

### 증상
- 캘린더에서 **17일 (수요일)** 클릭 시, 수업 일정에 **순환수업 (수학 수업)이 표시되지 않음**
- 순환수업은 **수요일**에 진행되며, 17일은 수요일임
- 캘린더에는 17일에 "순환" 마커가 정상 표시됨 (보라색 아이콘)

### 기대 동작
- 17일 클릭 → "오늘 수업 일정" 섹션에 순환수업 내용 (학년별 수학 수업 등) 표시

### 실제 동작
- 17일 클릭 → "오늘 수업 일정"은 여전히 **오늘(20일, 금요일)** 데이터만 표시

---

## 2. 근본 원인 분석

### 핵심 문제: `useTodayAllClasses()` 훅이 `selectedDate`를 무시함

#### 현재 코드 흐름

```
AdminDashboard.tsx
  ├── selectedDate 상태 관리 (캘린더에서 선택한 날짜)
  │     └── 예: "2025-12-17" (수요일)
  │
  ├── useTodayAllClasses() 호출
  │     └── ❌ selectedDate 파라미터 없음
  │
  └── scheduleGroups 계산 (todayClasses 기반)
        └── ❌ 항상 오늘 날짜의 수업만 표시
```

#### `useTodayAllClasses()` 내부 문제 (useAdminData.ts:1028-1098)

```typescript
export function useTodayAllClasses() {
  const today = new Date();                    // ❌ 항상 오늘 날짜 사용
  const todayDow = today.getDay();             // ❌ 오늘 요일만 계산

  // 정규 수업 조회
  const { data: regularClasses } = useTodayClasses();  // ❌ 오늘 요일 기준

  // 순환수업 필터링
  const todayRotationSchedules = rotationSchedules?.filter(
    (s) => s.day_of_week === todayDow && s.is_active  // ❌ 오늘 요일 기준
  ) || [];

  // 순환수업 활동 계산
  const todayActivity = getTodayRotation(...)  // ❌ 내부에서 new Date() 사용
}
```

#### `getTodayRotation()` 함수 (rotationUtils.ts:297-304)

```typescript
export function getTodayRotation(
  schedule: RotationSchedule,
  patterns: RotationPattern[],
  exceptions: RotationException[]
): RotationActivity | null {
  const today = new Date();  // ❌ 항상 오늘 날짜 하드코딩
  return getActivitiesForDate(today, schedule, patterns, exceptions);
}
```

### 문제점 정리

| 위치 | 함수/변수 | 문제 |
|------|-----------|------|
| `AdminDashboard.tsx:65` | `useTodayAllClasses()` | `selectedDate` 파라미터를 전달하지 않음 |
| `useAdminData.ts:1029` | `const today = new Date()` | 하드코딩된 오늘 날짜 |
| `useAdminData.ts:1030` | `todayDow = today.getDay()` | 오늘 요일만 사용 |
| `useAdminData.ts:1034` | `useTodayClasses()` | 내부에서 오늘 요일만 조회 |
| `rotationUtils.ts:302` | `const today = new Date()` | 하드코딩된 오늘 날짜 |

---

## 3. 영향 범위

### 영향받는 컴포넌트

1. **AdminDashboard.tsx**
   - "오늘 수업 일정" 섹션 (scheduleGroups)
   - "현재 진행 중" 섹션 (filteredCurrentClasses)
   - 과목별 수업 수 (subjectCounts)

2. **WeeklyCalendar.tsx**
   - ✅ 순환수업 마커는 정상 표시 (별도 로직 사용)

### 영향받지 않는 부분

- 캘린더의 순환수업 마커 (isRotationDay 계산)
- 주간 네비게이션

---

## 4. 해결 방안

### 방안 A: 날짜 파라미터 추가 (권장)

#### 수정 파일 목록

| 파일 | 수정 내용 |
|------|----------|
| `useAdminData.ts` | `useTodayAllClasses(selectedDate?: string)` 파라미터 추가 |
| `useAdminData.ts` | `useTodayClasses(date?: string)` 파라미터 추가 |
| `rotationUtils.ts` | `getRotationForDate(date, ...)` 함수 추가 |
| `AdminDashboard.tsx` | `useTodayAllClasses(selectedDate)` 호출 |

#### 구현 상세

**1. `useTodayClasses` 수정**

```typescript
// 변경 전
export function useTodayClasses() {
  const today = new Date();
  const dow = today.getDay();
  ...
}

// 변경 후
export function useTodayClasses(dateStr?: string) {
  const targetDate = dateStr
    ? parseStringToDate(dateStr)
    : new Date();
  const dow = targetDate.getDay();
  const dateKey = formatDateKey(targetDate);

  return useQuery({
    queryKey: ['admin', 'todayClasses', dateKey], // 캐시 키에 날짜 포함
    ...
  });
}
```

**2. `useTodayAllClasses` 수정**

```typescript
// 변경 전
export function useTodayAllClasses() {
  const today = new Date();
  const todayDow = today.getDay();
  ...
}

// 변경 후
export function useTodayAllClasses(dateStr?: string) {
  const targetDate = dateStr
    ? parseStringToDate(dateStr)
    : new Date();
  const targetDow = targetDate.getDay();
  const dateKey = formatDateKey(targetDate);

  // 정규 수업 조회 (날짜 전달)
  const { data: regularClasses } = useTodayClasses(dateStr);

  // 순환수업 필터 (선택된 요일 기준)
  const targetRotationSchedules = rotationSchedules?.filter(
    (s) => s.day_of_week === targetDow && s.is_active
  ) || [];

  // 순환수업 활동 계산 (선택된 날짜 기준)
  const targetActivity = getRotationForDate(
    targetDate,  // ← 오늘 대신 선택된 날짜
    detail.schedule,
    detail.patterns,
    detail.exceptions
  );
  ...
}
```

**3. `rotationUtils.ts`에 `getRotationForDate` 추가**

```typescript
// 새 함수 추가
export function getRotationForDate(
  date: Date,
  schedule: RotationSchedule,
  patterns: RotationPattern[],
  exceptions: RotationException[]
): RotationActivity | null {
  return getActivitiesForDate(date, schedule, patterns, exceptions);
}

// 기존 함수는 하위 호환성 유지
export function getTodayRotation(...) {
  return getRotationForDate(new Date(), ...);
}
```

**4. `AdminDashboard.tsx` 수정**

```typescript
// 변경 전
const { data: todayClasses, ... } = useTodayAllClasses();

// 변경 후
const { data: selectedClasses, ... } = useTodayAllClasses(selectedDate);
```

### 방안 B: 별도 훅 생성

```typescript
// 새 훅 생성
export function useClassesByDate(dateStr: string) {
  // 날짜별 정규 수업 + 순환수업 통합 조회
}
```

- **장점**: 기존 훅 변경 없음
- **단점**: 코드 중복, 유지보수 어려움

### 권장: 방안 A

- 기존 훅에 선택적 파라미터만 추가
- 하위 호환성 유지 (파라미터 없으면 오늘 날짜)
- 최소 변경으로 문제 해결

---

## 5. 구현 계획

### Phase 15: 날짜 선택 기반 수업 조회

| Phase | 작업 | 예상 난이도 |
|-------|------|------------|
| 15-1 | `rotationUtils.ts`: `getRotationForDate()` 함수 추가 | 낮음 |
| 15-2 | `useAdminData.ts`: `useTodayClasses(date?)` 파라미터 추가 | 중간 |
| 15-3 | `useAdminData.ts`: `useTodayAllClasses(date?)` 파라미터 추가 | 중간 |
| 15-4 | `AdminDashboard.tsx`: `selectedDate` 전달 | 낮음 |
| 15-5 | 테스트 및 검증 | 낮음 |

### 예상 영향도

| 항목 | 영향 |
|------|------|
| 기존 코드 호환성 | ✅ 유지 (선택적 파라미터) |
| 캐시 전략 | ⚠️ queryKey에 날짜 추가 필요 |
| 성능 | ✅ 날짜별 캐시로 효율적 |

---

## 6. 테스트 시나리오

### 정상 동작 확인

1. **오늘 날짜 클릭** → 오늘 수업 + 순환수업 표시
2. **다른 날짜 클릭 (순환수업 요일)** → 해당 날짜 수업 + 순환수업 표시
3. **다른 날짜 클릭 (순환수업 없는 요일)** → 해당 날짜 정규 수업만 표시
4. **휴일 등록된 순환수업 날짜 클릭** → 휴일 표시

### 엣지 케이스

1. 과거 날짜 선택 시 주차 계산 정확성
2. 미래 날짜 선택 시 휴일 반영
3. 주 경계 (일요일 → 월요일) 처리

---

## 7. 결론

**근본 원인**: `useTodayAllClasses()` 훅이 `selectedDate`를 받지 않고, 내부에서 `new Date()`로 오늘 날짜만 사용

**해결책**: 날짜 파라미터를 추가하여 선택된 날짜 기준으로 수업 조회

**예상 작업량**: 5개 Phase, 약 30분 소요

---

*연구 리포트 완료 - 개발은 사용자 요청 시 진행*
