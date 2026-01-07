# 요일별 수업시간 분리 개발 계획

> 작성일: 2025-12-28
> 참조: [449_class_schedule_by_day_research.md](./449_class_schedule_by_day_research.md)
> 방식: Option C (배열 컬럼 확장)

---

## Phase 1: 스키마 변경 및 마이그레이션

### 1-1. 새 컬럼 추가

**파일**: `supabase/migrations/20251228_add_schedule_arrays.sql`

```sql
-- 1. 새 컬럼 추가
ALTER TABLE classes ADD COLUMN IF NOT EXISTS start_times time[];
ALTER TABLE classes ADD COLUMN IF NOT EXISTS end_times time[];

-- 2. 기존 데이터 마이그레이션 (요일 수만큼 동일 시간 복사)
UPDATE classes SET
  start_times = array_fill(start_time, ARRAY[COALESCE(array_length(day_of_week, 1), 0)]),
  end_times = array_fill(end_time, ARRAY[COALESCE(array_length(day_of_week, 1), 0)])
WHERE day_of_week IS NOT NULL
  AND array_length(day_of_week, 1) > 0
  AND start_time IS NOT NULL;

-- 3. 요일이 없는 경우 빈 배열
UPDATE classes SET
  start_times = ARRAY[]::time[],
  end_times = ARRAY[]::time[]
WHERE start_times IS NULL;
```

### 1-2. 검증

```sql
-- 마이그레이션 검증 쿼리
SELECT
  name,
  day_of_week,
  array_length(day_of_week, 1) as dow_count,
  start_times,
  array_length(start_times, 1) as times_count,
  CASE
    WHEN array_length(day_of_week, 1) = array_length(start_times, 1) THEN 'OK'
    ELSE 'MISMATCH'
  END as status
FROM classes
WHERE is_active = true
ORDER BY name;
```

---

## Phase 2: API 타입 및 함수 수정

### 2-1. 타입 정의 수정

**파일**: `frontend/src/api/classes.ts`

```typescript
// ClassData 인터페이스 수정
export interface ClassData {
  // ... 기존 필드 유지
  day_of_week: number[] | null;
  start_time: string | null;      // 기존 (하위 호환)
  end_time: string | null;        // 기존 (하위 호환)
  start_times: string[] | null;   // 신규: 요일별 시작 시간
  end_times: string[] | null;     // 신규: 요일별 종료 시간
  // ...
}

// CreateClassInput 수정
export interface CreateClassInput {
  // ... 기존 필드
  start_times?: string[] | null;
  end_times?: string[] | null;
}

// UpdateClassInput 수정
export interface UpdateClassInput {
  // ... 기존 필드
  start_times?: string[] | null;
  end_times?: string[] | null;
}
```

### 2-2. 헬퍼 함수 추가

**파일**: `frontend/src/utils/scheduleUtils.ts` (신규)

```typescript
/**
 * 요일별 수업 시간 유틸리티
 */

/** 특정 요일의 시간 가져오기 */
export function getTimeForDay(
  dayOfWeek: number,
  days: number[] | null,
  times: string[] | null,
  fallback: string | null
): string | null {
  if (!days || !times) return fallback;
  const index = days.indexOf(dayOfWeek);
  if (index === -1 || index >= times.length) return fallback;
  return times[index] || fallback;
}

/** 요일별 스케줄 배열 생성 */
export function createScheduleArrays(
  days: number[],
  sameTime: boolean,
  singleStart: string,
  singleEnd: string,
  dayTimes: Record<number, { start: string; end: string }>
): { startTimes: string[]; endTimes: string[] } {
  if (sameTime) {
    // 모든 요일 동일 시간
    return {
      startTimes: days.map(() => singleStart),
      endTimes: days.map(() => singleEnd),
    };
  }

  // 요일별 개별 시간
  return {
    startTimes: days.map(d => dayTimes[d]?.start || singleStart),
    endTimes: days.map(d => dayTimes[d]?.end || singleEnd),
  };
}

/** 요일명 상수 */
export const DAY_NAMES_FULL: Record<number, string> = {
  0: '일요일',
  1: '월요일',
  2: '화요일',
  3: '수요일',
  4: '목요일',
  5: '금요일',
  6: '토요일',
};
```

---

## Phase 3: EditClassModal UI 수정

### 3-1. 상태 추가

**파일**: `frontend/src/components/admin/classes/EditClassModal.tsx`

```typescript
// 기존 상태
const [dayOfWeek, setDayOfWeek] = useState<number[]>([]);
const [startTime, setStartTime] = useState('14:00');
const [endTime, setEndTime] = useState('16:00');

// 신규 상태 추가
const [useSameTime, setUseSameTime] = useState(true);  // 모든 요일 동일 시간
const [dayTimes, setDayTimes] = useState<Record<number, { start: string; end: string }>>({});
```

### 3-2. 초기값 로드 수정

```typescript
useEffect(() => {
  if (isOpen && classData) {
    // ... 기존 코드

    // 요일별 시간 로드
    const days = classData.day_of_week || [];
    const startTimes = classData.start_times || [];
    const endTimes = classData.end_times || [];

    // 모든 시간이 동일한지 체크
    const allSameStart = startTimes.every(t => t === startTimes[0]);
    const allSameEnd = endTimes.every(t => t === endTimes[0]);
    setUseSameTime(allSameStart && allSameEnd);

    // dayTimes 구성
    const times: Record<number, { start: string; end: string }> = {};
    days.forEach((day, idx) => {
      times[day] = {
        start: startTimes[idx]?.slice(0, 5) || '14:00',
        end: endTimes[idx]?.slice(0, 5) || '16:00',
      };
    });
    setDayTimes(times);
  }
}, [isOpen, classData]);
```

### 3-3. UI 컴포넌트

```tsx
{/* 수업 요일 */}
<div>
  <label className="block text-sm font-medium text-grey-700 mb-1.5">
    수업 요일
  </label>
  <div className="flex gap-2">
    {Object.entries(DAY_NAMES).map(([day, dayName]) => (
      <button
        key={day}
        type="button"
        onClick={() => toggleDay(parseInt(day))}
        className={`w-10 h-10 rounded-lg font-medium transition-colors ${
          dayOfWeek.includes(parseInt(day))
            ? 'bg-blue-500 text-white'
            : 'bg-grey-100 text-grey-600 hover:bg-grey-200'
        }`}
      >
        {dayName}
      </button>
    ))}
  </div>
</div>

{/* 수업 시간 - 조건부 렌더링 */}
{dayOfWeek.length > 0 && (
  <div className="space-y-3">
    {/* 동일 시간 토글 (요일 2개 이상일 때만 표시) */}
    {dayOfWeek.length > 1 && (
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={useSameTime}
          onChange={(e) => setUseSameTime(e.target.checked)}
          className="w-4 h-4 rounded border-grey-300 text-blue-500 focus:ring-blue-500"
        />
        <span className="text-sm text-grey-700">모든 요일 동일 시간</span>
      </label>
    )}

    {useSameTime ? (
      /* 단일 시간 입력 */
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-grey-700 mb-1.5">
            시작 시간
          </label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full px-4 py-3 border border-grey-200 rounded-xl"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-grey-700 mb-1.5">
            종료 시간
          </label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full px-4 py-3 border border-grey-200 rounded-xl"
          />
        </div>
      </div>
    ) : (
      /* 요일별 개별 시간 입력 */
      <div className="space-y-2">
        <label className="block text-sm font-medium text-grey-700">
          요일별 수업 시간
        </label>
        {dayOfWeek.sort((a, b) => a - b).map(day => (
          <div key={day} className="flex items-center gap-3 p-3 bg-grey-50 rounded-xl">
            <span className="w-16 text-sm font-medium text-grey-700">
              {DAY_NAMES_FULL[day]}
            </span>
            <input
              type="time"
              value={dayTimes[day]?.start || '14:00'}
              onChange={(e) => setDayTimes(prev => ({
                ...prev,
                [day]: { ...prev[day], start: e.target.value }
              }))}
              className="flex-1 px-3 py-2 border border-grey-200 rounded-lg text-sm"
            />
            <span className="text-grey-400">~</span>
            <input
              type="time"
              value={dayTimes[day]?.end || '16:00'}
              onChange={(e) => setDayTimes(prev => ({
                ...prev,
                [day]: { ...prev[day], end: e.target.value }
              }))}
              className="flex-1 px-3 py-2 border border-grey-200 rounded-lg text-sm"
            />
          </div>
        ))}
      </div>
    )}
  </div>
)}
```

### 3-4. 저장 로직 수정

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!isValid) return;

  // 요일별 시간 배열 생성
  const { startTimes, endTimes } = createScheduleArrays(
    dayOfWeek,
    useSameTime,
    startTime,
    endTime,
    dayTimes
  );

  try {
    await updateMutation.mutateAsync({
      id: classData.id,
      input: {
        // ... 기존 필드
        day_of_week: dayOfWeek.length > 0 ? dayOfWeek : null,
        start_time: startTime || null,      // 하위 호환 (첫 번째 시간)
        end_time: endTime || null,          // 하위 호환 (첫 번째 시간)
        start_times: startTimes,            // 신규
        end_times: endTimes,                // 신규
      },
    });
    onClose();
  } catch (error) {
    console.error('반 수정 실패:', error);
  }
};
```

---

## Phase 4: CreateClassModal 동일 적용

**파일**: `frontend/src/components/admin/classes/CreateClassModal.tsx`

Phase 3과 동일한 UI 패턴 적용:
- `useSameTime`, `dayTimes` 상태 추가
- 요일별 시간 입력 UI
- 저장 시 `start_times`, `end_times` 배열 생성

---

## Phase 5: 대시보드 수업 시간 표시 수정

### 5-1. useClassScheduleDetails 훅 수정

**파일**: `frontend/src/hooks/useAdminData.ts`

```typescript
// useClassScheduleDetails 내부, 수업 데이터 변환 시
const startTime = (() => {
  if (!cls.start_times || !cls.day_of_week) {
    return cls.start_time?.slice(0, 5) || '00:00';
  }
  const dayIndex = cls.day_of_week.indexOf(dow);
  if (dayIndex >= 0 && cls.start_times[dayIndex]) {
    return cls.start_times[dayIndex].slice(0, 5);
  }
  return cls.start_time?.slice(0, 5) || '00:00';
})();

const endTime = (() => {
  if (!cls.end_times || !cls.day_of_week) {
    return cls.end_time?.slice(0, 5) || '00:00';
  }
  const dayIndex = cls.day_of_week.indexOf(dow);
  if (dayIndex >= 0 && cls.end_times[dayIndex]) {
    return cls.end_times[dayIndex].slice(0, 5);
  }
  return cls.end_time?.slice(0, 5) || '00:00';
})();
```

### 5-2. 쿼리 select 수정

```typescript
const { data: classesData, error: classesError } = await supabase
  .from('classes')
  .select(`
    id,
    name,
    subject,
    start_time,
    end_time,
    start_times,    // 신규
    end_times,      // 신규
    day_of_week,    // 신규 (요일 인덱스 매핑용)
    level,
    teacher:profiles!classes_teacher_id_fkey(id, name)
  `)
  .eq('is_active', true)
  .contains('day_of_week', [dow])
  .order('start_time');
```

---

## Phase 6: 테스트 및 검증

### 6-1. 테스트 시나리오

| 시나리오 | 예상 결과 |
|----------|-----------|
| 새 반 생성 (동일 시간) | `start_times` = ['18:30', '18:30'] |
| 새 반 생성 (개별 시간) | `start_times` = ['18:30', '19:00'] |
| 기존 반 수정 (동일→개별) | UI에서 개별 시간 입력 가능 |
| 대시보드 월요일 조회 | 월요일 시간 표시 |
| 대시보드 목요일 조회 | 목요일 시간 표시 |

### 6-2. 빌드 검증

```bash
cd frontend && npm run build
```

---

## 실행 순서 요약

| Phase | 작업 | 예상 시간 |
|-------|------|-----------|
| 1 | 스키마 변경 + 마이그레이션 | 15분 |
| 2 | API 타입 + 헬퍼 함수 | 20분 |
| 3 | EditClassModal UI 수정 | 40분 |
| 4 | CreateClassModal 동일 적용 | 20분 |
| 5 | 대시보드 시간 표시 수정 | 20분 |
| 6 | 테스트 및 검증 | 15분 |
| **합계** | | **~2시간** |

---

## 롤백 계획

문제 발생 시:
1. `start_times`, `end_times` 컬럼 무시 (기존 `start_time`, `end_time` 사용)
2. UI에서 `useSameTime = true` 강제
3. 필요 시 새 컬럼 DROP

```sql
-- 롤백 (필요 시)
ALTER TABLE classes DROP COLUMN IF EXISTS start_times;
ALTER TABLE classes DROP COLUMN IF EXISTS end_times;
```

---

*Phase 1부터 순차적으로 진행합니다. 승인 후 개발을 시작합니다.*
