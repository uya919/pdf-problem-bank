# Stage 15: 날짜 선택 기반 수업 조회 개발 계획

**문서 번호**: 403
**작성일**: 2025-12-20
**관련 문서**: [402_selected_date_rotation_bug_report.md](402_selected_date_rotation_bug_report.md)
**목적**: 캘린더 날짜 클릭 시 해당 날짜의 정규 수업 + 순환수업 표시

---

## 1. 개요

### 현재 문제
- 캘린더에서 17일(수요일) 클릭 → 순환수업 미표시
- 원인: `useTodayAllClasses()` 훅이 항상 `new Date()`(오늘) 사용

### 목표
- 캘린더 날짜 선택 시 해당 날짜의 수업 표시
- 정규 수업 + 순환수업 모두 선택된 날짜 기준으로 조회

---

## 2. 파일 수정 순서 및 의존성

```
1. rotationUtils.ts          (신규 함수 추가)
   └── getRotationForDate()

2. useAdminData.ts           (훅 수정)
   ├── useClassesByDate()    (신규)
   └── useTodayAllClasses()  (수정)
       └── 의존: rotationUtils.getRotationForDate

3. AdminDashboard.tsx        (호출부 수정)
   └── useTodayAllClasses(selectedDate)
       └── 의존: useAdminData 수정 완료
```

---

## 3. Phase별 상세 계획

### Phase 15-1: rotationUtils.ts - 날짜 기반 함수 추가

**파일**: `frontend/src/utils/rotationUtils.ts`

**작업 내용**:
1. `getRotationForDate()` 함수 추가 (기존 `getTodayRotation` 리팩토링)

**코드 변경**:

```typescript
// 기존 함수 (297-304번 라인)
export function getTodayRotation(
  schedule: RotationSchedule,
  patterns: RotationPattern[],
  exceptions: RotationException[]
): RotationActivity | null {
  const today = new Date();
  return getActivitiesForDate(today, schedule, patterns, exceptions);
}

// 변경 후
/**
 * 특정 날짜의 순환수업 조회
 * @param date - 조회할 날짜
 */
export function getRotationForDate(
  date: Date,
  schedule: RotationSchedule,
  patterns: RotationPattern[],
  exceptions: RotationException[]
): RotationActivity | null {
  return getActivitiesForDate(date, schedule, patterns, exceptions);
}

/**
 * 오늘의 순환수업 조회 (하위 호환성)
 */
export function getTodayRotation(
  schedule: RotationSchedule,
  patterns: RotationPattern[],
  exceptions: RotationException[]
): RotationActivity | null {
  return getRotationForDate(new Date(), schedule, patterns, exceptions);
}
```

**테스트 항목**:
- [ ] 기존 `getTodayRotation` 호출부 정상 동작 확인
- [ ] `getRotationForDate` 특정 날짜 전달 시 정상 동작

---

### Phase 15-2: useAdminData.ts - useClassesByDate 신규 훅 추가

**파일**: `frontend/src/hooks/useAdminData.ts`

**작업 내용**:
1. `useClassesByDate(dateStr)` 신규 훅 추가
2. 특정 날짜의 정규 수업 조회 로직

**코드 추가 위치**: `useTodayClasses()` 함수 아래 (214번 라인 근처)

**코드**:

```typescript
/**
 * 특정 날짜의 수업 조회
 * @param dateStr - 'YYYY-MM-DD' 형식의 날짜 문자열
 */
export function useClassesByDate(dateStr: string) {
  // 날짜 파싱
  const [year, month, day] = dateStr.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);
  const dow = targetDate.getDay(); // 0=일, 1=월, ...

  // 현재 시간 (상태 계산용)
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // 오늘인지 확인
  const isToday = dateStr === formatDateKey(now);

  return useQuery({
    queryKey: ['admin', 'classesByDate', dateStr],
    queryFn: async (): Promise<TodayClass[]> => {
      // 1. 해당 요일에 해당하는 수업 조회
      const { data, error } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          subject,
          start_time,
          end_time,
          level,
          teacher:teachers(id, name)
        `)
        .eq('is_active', true)
        .contains('day_of_week', [dow])
        .order('start_time');

      if (error) throw error;
      if (!data) return [];

      const classes = data as unknown as ClassRow[];

      // 2. 각 반의 학생 수 조회
      const classIds = classes.map((c) => c.id);
      const { data: enrollmentData } = await supabase
        .from('enrollments')
        .select('class_id')
        .in('class_id', classIds)
        .eq('is_active', true);

      const enrollments = (enrollmentData || []) as unknown as { class_id: string }[];
      const studentCountMap = new Map<string, number>();
      enrollments.forEach((e) => {
        studentCountMap.set(e.class_id, (studentCountMap.get(e.class_id) || 0) + 1);
      });

      // 3. 결과 매핑
      return classes.map((cls) => {
        const startTime = cls.start_time?.slice(0, 5) || '00:00';
        const endTime = cls.end_time?.slice(0, 5) || '00:00';

        // 수업 상태 결정 (오늘인 경우만 current 가능)
        let status: 'upcoming' | 'current' | 'completed' = 'upcoming';
        if (isToday) {
          if (endTime < currentTime) {
            status = 'completed';
          } else if (startTime <= currentTime && endTime >= currentTime) {
            status = 'current';
          }
        }

        const teacher = Array.isArray(cls.teacher) ? cls.teacher[0] : cls.teacher;

        return {
          id: cls.id,
          name: cls.name,
          subject: cls.subject || '수학',
          startTime,
          endTime,
          room: null,
          teacher: teacher ? { id: teacher.id, name: teacher.name } : null,
          studentCount: studentCountMap.get(cls.id) || 0,
          status,
        };
      });
    },
    enabled: isSupabaseConfigured && !!dateStr,
    staleTime: 60 * 1000,
  });
}
```

**필요한 import 추가**:
```typescript
import { formatDateKey } from '../utils/weekUtils';
```

**테스트 항목**:
- [ ] `useClassesByDate('2025-12-17')` 호출 시 수요일 수업 반환
- [ ] `useClassesByDate('2025-12-20')` 호출 시 금요일 수업 반환
- [ ] 날짜별 캐시 분리 확인 (queryKey에 dateStr 포함)

---

### Phase 15-3: useAdminData.ts - useTodayAllClasses 수정

**파일**: `frontend/src/hooks/useAdminData.ts`

**작업 내용**:
1. `useTodayAllClasses(dateStr?)` 선택적 파라미터 추가
2. 날짜 기반 정규 수업 조회로 변경
3. 날짜 기반 순환수업 활동 조회로 변경

**코드 변경** (1028-1098번 라인):

```typescript
/**
 * 특정 날짜의 모든 수업 조회 (정규 + 순환수업 통합)
 *
 * @param dateStr - 'YYYY-MM-DD' 형식 (생략시 오늘)
 */
export function useTodayAllClasses(dateStr?: string) {
  // 날짜 계산
  const today = new Date();
  const todayStr = formatDateKey(today);
  const targetDateStr = dateStr || todayStr;

  // 날짜 파싱
  const [year, month, day] = targetDateStr.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);
  const targetDow = targetDate.getDay();

  // 현재 시간 (상태 계산용)
  const currentTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
  const isToday = targetDateStr === todayStr;

  // 1. 정규 수업 조회 (날짜 기반)
  const { data: regularClasses, isLoading: regularLoading } = useClassesByDate(targetDateStr);

  // 2. 활성화된 순환수업 목록 조회
  const { data: rotationSchedules, isLoading: rotationLoading } = useRotationSchedules();

  // 3. 선택된 요일에 해당하는 활성 순환수업 필터
  const targetRotationSchedules = rotationSchedules?.filter(
    (s) => s.day_of_week === targetDow && s.is_active
  ) || [];

  // 4. 각 순환수업의 상세 정보 조회
  const firstScheduleId = targetRotationSchedules.length > 0 ? targetRotationSchedules[0].id : null;
  const { data: rotationDetail } = useRotationScheduleDetail(firstScheduleId);

  // 5. 통합 결과 계산
  const allClasses: DashboardClass[] = useMemo(() => {
    const result: DashboardClass[] = [];

    // 5-1. 정규 수업 변환
    if (regularClasses) {
      regularClasses.forEach((cls) => {
        result.push({
          id: cls.id,
          name: cls.name,
          subject: cls.subject,
          startTime: cls.startTime,
          endTime: cls.endTime,
          teacher: cls.teacher,
          studentCount: cls.studentCount,
          status: cls.status,
          isRotation: false,
        });
      });
    }

    // 5-2. 순환수업 변환 (선택된 날짜 기준)
    targetRotationSchedules.forEach((schedule) => {
      const detail = schedule.id === firstScheduleId ? rotationDetail : null;

      if (!detail) {
        result.push(createRotationDashboardClass(schedule, null, currentTime, isToday));
      } else {
        // 선택된 날짜의 순환수업 활동 계산
        const targetActivity = getRotationForDate(
          targetDate,  // ← 오늘 대신 선택된 날짜
          detail.schedule,
          detail.patterns,
          detail.exceptions
        );

        result.push(createRotationDashboardClass(schedule, targetActivity, currentTime, isToday));
      }
    });

    // 5-3. 시간순 정렬
    return result.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [regularClasses, targetRotationSchedules, rotationDetail, firstScheduleId, currentTime, isToday, targetDate]);

  return {
    data: allClasses,
    isLoading: regularLoading || rotationLoading,
    regularCount: regularClasses?.length || 0,
    rotationCount: targetRotationSchedules.length,
  };
}
```

**`createRotationDashboardClass` 수정**:

```typescript
function createRotationDashboardClass(
  schedule: { id: string; name: string; start_time: string; end_time: string },
  todayActivity: { weekNumber: number; isHoliday: boolean; holidayReason?: string; activities: { gradeId: string; gradeName: string; activityType: string; activityName: string }[] } | null,
  currentTime: string,
  isToday: boolean = true  // ← 새 파라미터 추가
): DashboardClass {
  const startTime = schedule.start_time?.slice(0, 5) || '00:00';
  const endTime = schedule.end_time?.slice(0, 5) || '00:00';

  // 수업 상태 계산 (오늘인 경우만 current 가능)
  let status: 'upcoming' | 'current' | 'completed' = 'upcoming';
  if (isToday) {
    if (endTime < currentTime) {
      status = 'completed';
    } else if (startTime <= currentTime && endTime >= currentTime) {
      status = 'current';
    }
  }

  // ... 나머지 동일
}
```

**필요한 import 수정**:
```typescript
// 기존
import { getTodayRotation } from '../utils/rotationUtils';

// 변경
import { getRotationForDate } from '../utils/rotationUtils';
```

**테스트 항목**:
- [ ] `useTodayAllClasses()` - 파라미터 없으면 오늘 날짜 사용 (하위 호환)
- [ ] `useTodayAllClasses('2025-12-17')` - 17일 수요일 수업 + 순환수업 반환
- [ ] 순환수업 주차 계산이 선택된 날짜 기준인지 확인

---

### Phase 15-4: AdminDashboard.tsx - selectedDate 전달

**파일**: `frontend/src/pages/admin/AdminDashboard.tsx`

**작업 내용**:
1. `useTodayAllClasses(selectedDate)` 호출 시 날짜 전달
2. 섹션 제목 동적 변경 (오늘/선택된 날짜)

**코드 변경** (65번 라인):

```typescript
// 변경 전
const { data: todayClasses, isLoading: classesLoading, rotationCount } = useTodayAllClasses();

// 변경 후
const { data: selectedClasses, isLoading: classesLoading, rotationCount } = useTodayAllClasses(selectedDate);
```

**변수명 변경** (전체 파일):
- `todayClasses` → `selectedClasses` (의미 명확화)

**영향받는 코드**:
- `subjectCounts` useMemo (69-78번 라인)
- `scheduleGroups` useMemo (88-109번 라인)

**테스트 항목**:
- [ ] 오늘 날짜 선택 시 기존과 동일하게 동작
- [ ] 17일(수요일) 클릭 시 순환수업 표시
- [ ] 다른 요일 클릭 시 해당 요일 정규 수업만 표시

---

### Phase 15-5: 테스트 및 검증

**테스트 시나리오**:

| # | 시나리오 | 예상 결과 |
|---|----------|----------|
| 1 | 오늘(금요일) 클릭 | 금요일 정규 수업 표시 |
| 2 | 17일(수요일) 클릭 | 수요일 정규 수업 + 순환수업(수학) 표시 |
| 3 | 18일(목요일) 클릭 | 목요일 정규 수업만 표시 |
| 4 | 휴일 등록된 순환수업 날짜 클릭 | 순환수업에 "휴일" 표시 |
| 5 | 과거 날짜 클릭 | 해당 날짜 수업 표시 (status는 upcoming) |
| 6 | 다른 주로 이동 후 날짜 클릭 | 해당 날짜 수업 정상 표시 |

**빌드 검증**:
- [ ] `npm run build` 성공
- [ ] TypeScript 에러 없음
- [ ] 콘솔 에러 없음

---

## 4. 타입 정의 요약

### 변경 없음
- `DashboardClass` - 기존 유지
- `RotationActivityInfo` - 기존 유지
- `TodayClass` - 기존 유지

### 함수 시그니처 변경

| 함수 | 변경 전 | 변경 후 |
|------|---------|---------|
| `getRotationForDate` | (신규) | `(date: Date, schedule, patterns, exceptions) => RotationActivity \| null` |
| `getTodayRotation` | `(...) => ...` | 내부에서 `getRotationForDate(new Date(), ...)` 호출 |
| `useClassesByDate` | (신규) | `(dateStr: string) => UseQueryResult<TodayClass[]>` |
| `useTodayAllClasses` | `() => {...}` | `(dateStr?: string) => {...}` |

---

## 5. 예상 에러 및 대응

| 에러 | 원인 | 해결책 |
|------|------|--------|
| `formatDateKey is not defined` | import 누락 | `weekUtils`에서 import |
| `getRotationForDate is not defined` | import 미변경 | `getTodayRotation` → `getRotationForDate` 교체 |
| 캐시 미갱신 | queryKey 동일 | `dateStr`을 queryKey에 포함 |
| 타입 에러 (status) | 미래 날짜 상태 | `isToday` 조건 추가 |

---

## 6. 실행 순서

```
Phase 15-1: rotationUtils.ts 수정
    ↓
Phase 15-2: useAdminData.ts - useClassesByDate 추가
    ↓
Phase 15-3: useAdminData.ts - useTodayAllClasses 수정
    ↓
Phase 15-4: AdminDashboard.tsx 수정
    ↓
Phase 15-5: 빌드 및 테스트
```

---

## 7. plan.md 업데이트 내용

```markdown
## 현재 작업: Stage 15 - 날짜 선택 기반 수업 조회

> [상세 개발 계획](403_selected_date_rotation_development_plan.md) | [버그 분석](402_selected_date_rotation_bug_report.md)

### 구현 내용
- 캘린더 날짜 클릭 시 해당 날짜의 수업 표시
- 정규 수업 + 순환수업 모두 선택된 날짜 기준 조회
- 순환수업 주차 계산도 선택된 날짜 기준

| Phase | 작업 | 상태 |
|-------|------|------|
| 15-1 | rotationUtils: getRotationForDate 추가 | ⬜ |
| 15-2 | useAdminData: useClassesByDate 추가 | ⬜ |
| 15-3 | useAdminData: useTodayAllClasses 수정 | ⬜ |
| 15-4 | AdminDashboard: selectedDate 전달 | ⬜ |
| 15-5 | 테스트 및 검증 | ⬜ |
```

---

*개발 계획 완료 - 개발은 사용자 요청 시 진행*
