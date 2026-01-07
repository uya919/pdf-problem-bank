# 순환수업-대시보드 통합 개발 계획

> 작성일: 2025-12-20
> 목표: 순환수업(rotation)을 관리자 대시보드의 "오늘 수업 일정"에 통합 표시

---

## 1. 현황 분석

### 1.1 현재 상태

| 항목 | 상태 | 설명 |
|------|------|------|
| 정규 수업 (classes) | ✅ 자동 표시 | `useTodayClasses` → `day_of_week` 기반 조회 |
| 순환수업 (rotation) | ❌ 미연결 | 별도 관리 페이지에서만 조회 가능 |

### 1.2 관련 파일

**데이터 조회**
- `frontend/src/hooks/useAdminData.ts` - 대시보드용 훅 (`useTodayClasses`)
- `frontend/src/hooks/useRotation.ts` - 순환수업 훅 (`useRotationActivities`)
- `frontend/src/utils/rotationUtils.ts` - 주차 계산 유틸리티

**UI 컴포넌트**
- `frontend/src/pages/admin/AdminDashboard.tsx` - 관리자 대시보드
- `frontend/src/components/admin/dashboard/WeeklyCalendar.tsx` - 주간 캘린더

**데이터 구조**
- `frontend/src/types/rotation.ts` - 순환수업 타입
- `supabase/migrations/20251219_rotation_tables.sql` - DB 스키마

### 1.3 데이터 흐름

```
[정규 수업]
classes 테이블 → day_of_week 필터 → useTodayClasses → 대시보드 표시

[순환수업] (현재)
rotation_schedules → useRotationActivities → RotationManagement 페이지만 표시
                                              ↓
                                        대시보드 미연결 ❌
```

---

## 2. 개발 목표

### 2.1 최종 결과물

```
[대시보드 - 오늘 수업 일정]

시간        | 수업
------------|------------------------------------------
15:00~16:30 | 중1A · 김선생  | 중2B · 박선생  | ...
17:00~18:30 | 🔄 중1 영어수업 | 🔄 중2 수학수업 | 🔄 고1 수학Test
            | (순환)        | (순환)         | (순환)
19:00~20:30 | 고2A · 이선생  | 고3B · 최선생  | ...
```

### 2.2 핵심 요구사항

1. **순환수업 자동 표시**: 오늘이 순환수업 요일이면 자동으로 표시
2. **시간대 통합**: 정규 수업과 같은 시간대에 함께 표시
3. **휴일 처리**: 휴일로 등록된 날짜는 표시 안 함
4. **시각적 구분**: 정규 수업과 순환수업 구분 가능하도록 표시

---

## 3. 단계별 개발 계획

### Phase 1: 타입 정의 (예상: 30분)

**목표**: 대시보드에서 사용할 통합 수업 타입 정의

**파일**: `frontend/src/types/admin.ts`

```typescript
// 추가할 타입
export interface DashboardClass {
  id: string;
  name: string;
  subject: string;
  startTime: string;  // 'HH:MM'
  endTime: string;
  teacher?: { id: string; name: string } | null;
  studentCount?: number;
  status: 'upcoming' | 'current' | 'completed';

  // 순환수업 전용 필드
  isRotation: boolean;
  rotationWeek?: number;       // 1, 2, 3
  rotationGrades?: string[];   // ['중1', '중2', '고1']
  rotationActivities?: {
    gradeName: string;
    activityType: string;      // 'english_class' | 'math_class' | 'math_test'
    activityName: string;      // '영어 수업', '수학 Test'
  }[];
}
```

**테스트 체크리스트**:
- [ ] TypeScript 빌드 에러 없음
- [ ] 기존 TodayClass 타입과 충돌 없음

---

### Phase 2: 훅 확장 (예상: 1시간)

**목표**: `useAdminData.ts`에 순환수업 통합 조회 함수 추가

**파일**: `frontend/src/hooks/useAdminData.ts`

**추가할 함수**:

```typescript
/**
 * 오늘의 모든 수업 조회 (정규 + 순환수업 통합)
 */
export function useTodayAllClasses() {
  // 1. 정규 수업 조회 (기존 useTodayClasses)
  const { data: regularClasses, isLoading: regularLoading } = useTodayClasses();

  // 2. 활성화된 순환수업 조회
  const { data: rotationSchedules } = useRotationSchedules();

  // 3. 오늘 요일에 해당하는 순환수업 필터링
  const todayDow = new Date().getDay();
  const todayRotations = rotationSchedules?.filter(
    s => s.day_of_week === todayDow && s.is_active
  ) || [];

  // 4. 각 순환수업의 상세 정보 조회 (patterns 포함)
  // ... useQueries 사용

  // 5. 통합 및 정렬
  return useMemo(() => {
    const combined: DashboardClass[] = [
      // 정규 수업 변환
      ...(regularClasses || []).map(cls => ({
        ...cls,
        isRotation: false,
      })),
      // 순환수업 변환
      ...todayRotationDetails.map(rotation => ({
        id: rotation.schedule.id,
        name: `${rotation.schedule.name}`,
        subject: '', // 순환수업은 학년별로 다른 과목
        startTime: rotation.schedule.start_time.slice(0, 5),
        endTime: rotation.schedule.end_time.slice(0, 5),
        status: calculateStatus(rotation.schedule),
        isRotation: true,
        rotationWeek: rotation.today?.weekNumber,
        rotationActivities: rotation.today?.activities,
      })),
    ];

    // 시간순 정렬
    return combined.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [regularClasses, todayRotationDetails]);
}
```

**의존성**:
- `useRotationSchedules` from `useRotation.ts`
- `getTodayRotation` from `rotationUtils.ts`

**테스트 체크리스트**:
- [ ] 정규 수업만 있을 때 정상 동작
- [ ] 순환수업만 있을 때 정상 동작
- [ ] 둘 다 있을 때 시간순 정렬 확인
- [ ] 오늘이 순환수업 요일 아닐 때 빈 배열 반환
- [ ] 휴일 등록된 날짜에 순환수업 미표시

---

### Phase 3: UI 컴포넌트 수정 (예상: 1시간)

**목표**: `AdminDashboard.tsx`에서 순환수업 표시

**파일**: `frontend/src/pages/admin/AdminDashboard.tsx`

**수정 사항**:

1. **import 변경**:
```typescript
// Before
import { useTodayClasses, useCurrentClasses } from '../../hooks/useAdminData';

// After
import { useTodayAllClasses, useCurrentClasses } from '../../hooks/useAdminData';
```

2. **데이터 조회 변경**:
```typescript
// Before
const { data: todayClasses, isLoading: classesLoading } = useTodayClasses();

// After
const { data: todayClasses, isLoading: classesLoading } = useTodayAllClasses();
```

3. **ScheduleRow 컴포넌트 수정**:
```typescript
function ScheduleRow({ classes, current }) {
  return (
    <div className={...}>
      {classes.map((cls) => (
        <div key={cls.id} className={...}>
          {cls.isRotation ? (
            // 순환수업 표시
            <div className="flex items-center gap-1.5">
              <span className="text-xs bg-purple-100 text-purple-600 px-1 rounded">
                🔄 {cls.rotationWeek}주차
              </span>
              {cls.rotationActivities?.map(act => (
                <span key={act.gradeName} className="text-sm">
                  {act.gradeName} {act.activityName}
                </span>
              ))}
            </div>
          ) : (
            // 정규 수업 표시 (기존)
            <span>{cls.name} · {cls.teacher?.name}</span>
          )}
        </div>
      ))}
    </div>
  );
}
```

**테스트 체크리스트**:
- [ ] 정규 수업 표시 기존과 동일
- [ ] 순환수업 시각적 구분 명확
- [ ] 휴일 표시 확인 (회색 처리)
- [ ] 반응형 레이아웃 깨지지 않음

---

### Phase 4: 캘린더 통합 (예상: 1시간)

**목표**: 주간 캘린더에 순환수업 날짜 표시

**파일**: `frontend/src/components/admin/dashboard/CalendarDayCell.tsx`

**수정 사항**:

1. **순환수업 날짜에 마커 추가**:
```typescript
// 해당 날짜가 순환수업 날인지 확인
const isRotationDay = rotationSchedules.some(
  s => s.day_of_week === day.dayOfWeek && s.is_active
);

// 휴일인지 확인
const isHoliday = rotationExceptions.some(
  e => e.exception_date === day.dateKey
);

return (
  <div className={...}>
    {/* 날짜 */}
    <span>{day.date.getDate()}</span>

    {/* 순환수업 마커 */}
    {isRotationDay && !isHoliday && (
      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
    )}

    {/* 휴일 마커 */}
    {isHoliday && (
      <span className="text-xs text-red-500">휴일</span>
    )}
  </div>
);
```

**테스트 체크리스트**:
- [ ] 순환수업 요일에 마커 표시
- [ ] 휴일에 휴일 표시
- [ ] 클릭 시 해당 날짜의 순환수업 정보 표시

---

### Phase 5: 휴일 표시 최적화 (예상: 30분)

**목표**: 휴일 날짜 처리 로직 완성

**파일**:
- `frontend/src/hooks/useAdminData.ts`
- `frontend/src/utils/rotationUtils.ts`

**수정 사항**:

```typescript
// useTodayAllClasses 내부
const isHoliday = (scheduleId: string, date: Date) => {
  const exceptions = getExceptionsForSchedule(scheduleId);
  const dateStr = formatDateToString(date);
  return exceptions.some(e => e.exception_date === dateStr);
};

// 휴일인 경우 해당 순환수업 제외
const todayRotations = rotationSchedules?.filter(s => {
  if (s.day_of_week !== todayDow) return false;
  if (!s.is_active) return false;
  if (isHoliday(s.id, new Date())) return false;  // 휴일 제외
  return true;
});
```

**테스트 체크리스트**:
- [ ] 휴일 등록된 날짜에 순환수업 미표시
- [ ] carry_over 휴일 정상 처리
- [ ] skip 휴일 정상 처리

---

## 4. 파일 생성/수정 순서

```
1. frontend/src/types/admin.ts          (타입 추가)
   ↓
2. frontend/src/hooks/useAdminData.ts   (훅 추가)
   ↓
3. frontend/src/pages/admin/AdminDashboard.tsx (UI 수정)
   ↓
4. frontend/src/components/admin/dashboard/CalendarDayCell.tsx (캘린더 마커)
   ↓
5. 테스트 및 검증
```

---

## 5. 예상 에러 및 해결 방안

| 예상 에러 | 원인 | 해결 방법 |
|-----------|------|-----------|
| 순환수업 데이터 없음 | DB에 데이터 없음 | RotationManagement에서 먼저 생성 |
| 시간 형식 불일치 | `HH:MM:SS` vs `HH:MM` | `.slice(0, 5)`로 통일 |
| TypeScript 타입 에러 | 옵셔널 필드 처리 | 옵셔널 체이닝 사용 |
| 무한 루프 | useEffect 의존성 | useMemo/useCallback 활용 |
| 성능 저하 | 다중 쿼리 | React Query 캐싱 활용 |

---

## 6. 테스트 시나리오

### 6.1 정상 케이스

1. **수요일 (순환수업 있음)**
   - 정규 수업 3개 + 순환수업 1개 표시
   - 시간순 정렬 확인

2. **월요일 (순환수업 없음)**
   - 정규 수업만 표시
   - 기존 동작과 동일

3. **휴일 등록된 수요일**
   - 정규 수업만 표시
   - 순환수업 미표시

### 6.2 엣지 케이스

1. **순환수업만 있는 시간대**
   - 순환수업만 표시되어야 함

2. **모든 수업이 순환수업인 경우**
   - 모든 시간대에 순환수업 표시

3. **과목 필터 적용 시**
   - 순환수업은 학년별 과목이 다르므로 필터 로직 검토 필요

---

## 7. 참조 문서

- [순환수업 시스템 테이블](../supabase/migrations/20251219_rotation_tables.sql)
- [순환수업 타입 정의](../frontend/src/types/rotation.ts)
- [순환수업 관리 페이지](../frontend/src/pages/admin/RotationManagement.tsx)

---

*v1.0 - 2025-12-20*
