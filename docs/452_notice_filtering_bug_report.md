# 박정빈 공지 필터링 버그 연구리포트

> Stage 35-B: 신규등원 공지가 정승원에게 표시되는 버그 분석

---

## 1. 문제 상황

### 1.1 현상
- **박정빈**은 **정규2반**에 배정된 학생
- **이한솔**이 정규2반 담당 선생님
- **정승원**은 정규2반 담당이 아님 (다른 반의 부담임)
- 그러나 정승원의 모바일/태블릿 뷰에서 박정빈 등원 공지가 표시됨

### 1.2 기대 동작
- 박정빈 등원 공지는 **정규2반 담당자(이한솔)**와 **관리자**에게만 표시
- 정승원에게는 **표시되지 않아야** 함

---

## 2. 원인 분석

### 2.1 데이터 흐름 분석

```
공지 생성 (confirmEnrollmentWithStudent)
    ↓
notices 테이블에 target_class_ids 저장
    ↓
useNoticesByDate / useWeekNoticesByDate 에서 조회
    ↓
myClassIds 기반 필터링
```

### 2.2 핵심 문제점

**문제 1: `myClassIds`가 `undefined`일 때 필터링 스킵**

```typescript
// useNoticesByDate (useBackofficeData.ts:597-606)
if (myClassIds && myClassIds.length > 0) {
  notices = notices.filter((notice) => {
    if (!notice.target_class_ids || notice.target_class_ids.length === 0) {
      return true;
    }
    return notice.target_class_ids.some((classId) => myClassIds.includes(classId));
  });
}
```

- `myClassIds`가 `undefined`이면 **필터링이 전혀 실행되지 않음**
- 모든 공지가 그대로 표시됨

**문제 2: `myClassIds` 생성 시점 문제 (BackofficeDemo.tsx)**

```typescript
// BackofficeDemo.tsx:305-308
const myClassIds = useMemo(() => {
  if (!isTeacherMode || !classesData) return undefined;
  return classesData.map((cls) => cls.id);
}, [isTeacherMode, classesData]);
```

- `classesData`가 로딩 중일 때 `undefined` 반환
- 로딩 완료 전에 `useNoticesByDate`가 호출되면 필터링 없이 모든 공지 표시

**문제 3: 태블릿 뷰 `useWeekNoticesByDate` 호출 순서**

```typescript
// BackofficeDemo.tsx 구조
const weekDates = useMemo(...)      // 315-323
const weekStartDate = weekDates[0]; // 325
const weekEndDate = weekDates[6];   // 326

// myClassIds 선언 전에 useWeekNoticesByDate 호출?
// → 실제로는 순서상 문제 없음 (myClassIds: 305, useWeekNoticesByDate: 332)
```

**문제 4: React Query 캐시 문제**

```typescript
// useNoticesByDate
queryKey: ['notices', 'byDate', date, myClassIds?.join(',')]

// myClassIds가 undefined → queryKey: ['notices', 'byDate', date, undefined]
// myClassIds가 ['abc'] → queryKey: ['notices', 'byDate', date, 'abc']
```

- 초기 로딩 시 `myClassIds`가 `undefined`인 상태로 쿼리 실행
- 캐시에 **필터링 안 된 데이터** 저장
- `myClassIds`가 채워진 후에도 **동일한 date**로 조회하면 캐시된 데이터 반환

---

## 3. 상세 원인

### 3.1 타이밍 이슈

```
1. 컴포넌트 마운트
2. useClasses 훅 호출 (classesData = undefined, 로딩 중)
3. myClassIds = undefined (classesData가 없으므로)
4. useNoticesByDate(date, undefined) 호출
   → 필터링 없이 모든 공지 반환
   → 캐시에 저장: ['notices', 'byDate', date, undefined]
5. classesData 로딩 완료
6. myClassIds = ['class1', 'class2', ...]
7. useNoticesByDate(date, myClassIds) 호출
   → 다른 queryKey이므로 새 쿼리 실행
   → 하지만 UI가 이미 렌더링되어 있음
```

### 3.2 쿼리 무효화 문제

`myClassIds`가 변경되어도:
- 새로운 queryKey로 쿼리 실행됨 (OK)
- 하지만 **이전 undefined 쿼리의 데이터가 먼저 표시**될 수 있음

---

## 4. 해결 방안

### 4.1 방안 A: `enabled` 옵션으로 쿼리 지연 (권장)

```typescript
// useNoticesByDate 호출 시 classesData 로딩 완료 후에만 실행
const { data: noticesData, isLoading: noticesLoading } = useNoticesByDate(
  selectedDateStr,
  myClassIds,
  { enabled: !classesLoading && !!myClassIds }  // 추가
);
```

**장점**:
- 필터링 없는 데이터가 캐시되지 않음
- 불필요한 쿼리 실행 방지

**단점**:
- 로딩 시간 약간 증가

### 4.2 방안 B: 훅 내부에서 `undefined` 체크 강화

```typescript
// useNoticesByDate 수정
export function useNoticesByDate(date: string, myClassIds?: string[]) {
  return useQuery({
    queryKey: ['notices', 'byDate', date, myClassIds?.join(',') || 'none'],
    queryFn: async (): Promise<Notice[]> => {
      // myClassIds가 undefined면 빈 배열 반환 (강사 모드 가정)
      // 또는 enabled 옵션으로 제어
      ...
    },
    // myClassIds가 준비될 때까지 대기
    enabled: isSupabaseConfigured && !!date && myClassIds !== undefined,
  });
}
```

### 4.3 방안 C: queryKey에 로딩 상태 포함

```typescript
// myClassIds 상태 명시
const myClassIdsStatus = classesLoading ? 'loading' : (myClassIds?.join(',') || 'none');

queryKey: ['notices', 'byDate', date, myClassIdsStatus]
```

---

## 5. 권장 해결책

### 5.1 `useNoticesByDate` 수정

```typescript
// useBackofficeData.ts
export function useNoticesByDate(
  date: string,
  myClassIds?: string[],
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['notices', 'byDate', date, myClassIds?.join(',') || 'all'],
    queryFn: async (): Promise<Notice[]> => {
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .eq('date', date)
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) throw error;

      let notices = data as Notice[];

      // Stage 35: target_class_ids 필터링
      // myClassIds가 빈 배열이어도 필터링 실행 (담당 반 없는 강사)
      if (myClassIds !== undefined) {
        notices = notices.filter((notice) => {
          // target_class_ids가 없으면 모든 사람이 볼 수 있음
          if (!notice.target_class_ids || notice.target_class_ids.length === 0) {
            return true;
          }
          // myClassIds가 빈 배열이면 target_class_ids 있는 공지는 안 보임
          if (myClassIds.length === 0) {
            return false;
          }
          // target_class_ids가 있으면 본인 담당 반이 포함되어 있어야 함
          return notice.target_class_ids.some((classId) => myClassIds.includes(classId));
        });
      }

      return notices;
    },
    enabled: isSupabaseConfigured && !!date && (options?.enabled ?? true),
  });
}
```

### 5.2 `BackofficeDemo.tsx` 수정

```typescript
// myClassIds 준비 상태 추적
const isMyClassIdsReady = !classesLoading && (isTeacherMode ? !!classesData : true);

// 공지사항 훅 호출 시 enabled 옵션 전달
const { data: noticesData, isLoading: noticesLoading } = useNoticesByDate(
  selectedDateStr,
  myClassIds,
  { enabled: isMyClassIdsReady }
);

// 태블릿용 공지 훅도 동일하게
const { data: realNoticesByDate } = useWeekNoticesByDate(
  teacherId,
  weekStartDate,
  weekEndDate,
  myClassIds,
  { enabled: isMyClassIdsReady }  // 추가 필요
);
```

### 5.3 `useWeekNoticesByDate` 수정

```typescript
export function useWeekNoticesByDate(
  teacherId: string | null,
  startDate: Date,
  endDate: Date,
  myClassIds?: string[],
  options?: { enabled?: boolean }
) {
  // ... 기존 코드 ...

  return useQuery({
    // ... 기존 코드 ...
    enabled: isSupabaseConfigured && !!teacherId && (options?.enabled ?? true),
  });
}
```

---

## 6. 영향 범위

### 6.1 수정 필요 파일

| 파일 | 수정 내용 |
|------|-----------|
| `hooks/useBackofficeData.ts` | `useNoticesByDate`, `useWeekNoticesByDate`에 `enabled` 옵션 추가 |
| `pages/BackofficeDemo.tsx` | `isMyClassIdsReady` 상태 추가, 훅 호출에 `enabled` 전달 |

### 6.2 테스트 체크리스트

- [ ] 정승원 로그인 → 박정빈 공지 표시 안됨
- [ ] 이한솔 로그인 → 박정빈 공지 표시됨
- [ ] 관리자 로그인 → 모든 공지 표시됨
- [ ] 페이지 새로고침 후에도 동일하게 동작
- [ ] 날짜 변경 시에도 필터링 유지

---

## 7. 결론

**근본 원인**: React Query의 캐시와 훅 실행 순서로 인해, `myClassIds`가 준비되기 전에 필터링 없는 데이터가 조회되고 캐시됨.

**해결책**: `enabled` 옵션을 사용하여 `myClassIds`가 준비된 후에만 공지 조회 쿼리 실행.

---

*작성일: 2025-12-29*
*Stage: 35-B 버그 수정*
