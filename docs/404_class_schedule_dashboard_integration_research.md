# 반운영 수업일정 대시보드 통합 연구리포트

**문서 번호**: 404
**작성일**: 2025-12-20
**요청**: 반운영에서 수업요일과 시간을 정하면 순환수업처럼 대시보드에 나오게 하는 기능

---

## 1. 요청 분석

### 1.1 현재 상황

사용자가 "반운영에서 수업요일과 시간을 정하면 순환수업처럼 대시보드에 나오게" 하고 싶다고 요청함.

**분석 결과**: 이 기능은 **이미 구현되어 있음**.

### 1.2 현재 구현 상태

| 항목 | 상태 | 설명 |
|------|------|------|
| 반 관리에서 요일/시간 설정 | ✅ 완료 | `ClassManagementPage.tsx` |
| 대시보드에 정규 수업 표시 | ✅ 완료 | `useTodayAllClasses()` 훅 |
| 순환수업 표시 | ✅ 완료 | Stage 14에서 구현 |
| 날짜 선택 기반 조회 | ✅ 완료 | Stage 15에서 구현 |

---

## 2. 기존 데이터 구조

### 2.1 classes 테이블 (반 정보)

```typescript
// database.ts에서
interface Class {
  id: string;
  name: string;
  subject_id: string;
  grade_id: string;
  teacher_id: string;
  day_of_week: number[];  // [1, 3, 5] = 월, 수, 금
  start_time: string;      // "14:00:00"
  end_time: string;        // "16:00:00"
  is_active: boolean;
  max_students: number;
}
```

### 2.2 rotation_schedules 테이블 (순환수업)

```typescript
interface RotationSchedule {
  id: string;
  name: string;
  day_of_week: number;     // 단일 요일 (3 = 수요일)
  start_time: string;
  end_time: string;
  cycle_weeks: number;     // 3주 순환
  start_date: string;
  is_active: boolean;
}
```

---

## 3. 현재 구현 흐름

### 3.1 대시보드 데이터 조회

```
AdminDashboard.tsx
    ↓
useTodayAllClasses(selectedDate)    // Stage 15 추가
    ↓
┌─────────────────────────────────────┐
│  useClassesByDate(dateStr)          │ ← 정규 수업 조회
│    - day_of_week 배열에 해당 요일 포함되는 반 조회
│    - classes 테이블에서 직접 조회
└─────────────────────────────────────┘
    +
┌─────────────────────────────────────┐
│  useRotationSchedules()             │ ← 순환수업 조회
│    - 해당 요일의 활성 순환수업 조회
│    - 주차별 활동 계산
└─────────────────────────────────────┘
    ↓
DashboardClass[] 통합 배열 반환
```

### 3.2 useClassesByDate 훅 (정규 수업 조회)

```typescript
// useAdminData.ts:221-305
export function useClassesByDate(dateStr: string) {
  const targetDate = new Date(year, month - 1, day);
  const dow = targetDate.getDay(); // 0=일, 1=월, ...

  const { data } = await supabase
    .from('classes')
    .select(`id, name, subject, start_time, end_time, level, teacher:teachers(id, name)`)
    .eq('is_active', true)
    .contains('day_of_week', [dow])  // ⭐ 해당 요일에 수업 있는 반 조회
    .order('start_time');
}
```

### 3.3 useTodayAllClasses 훅 (통합)

```typescript
// useAdminData.ts:1122-1202
export function useTodayAllClasses(dateStr?: string) {
  // 1. 정규 수업 조회
  const { data: regularClasses } = useClassesByDate(targetDateStr);

  // 2. 순환수업 조회
  const { data: rotationSchedules } = useRotationSchedules();

  // 3. 통합
  const allClasses = useMemo(() => {
    const result: DashboardClass[] = [];

    // 정규 수업 추가
    regularClasses?.forEach(cls => result.push({ ...cls, isRotation: false }));

    // 순환수업 추가
    rotationSchedules?.forEach(schedule => {
      result.push(createRotationDashboardClass(schedule, activity, currentTime, isToday));
    });

    return result.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [...]);
}
```

---

## 4. 시각적 구분 (현재 구현)

### 4.1 대시보드 수업 카드

| 수업 타입 | 배경색 | 마커 | 구현 위치 |
|----------|--------|------|----------|
| 정규 수업 | 흰색 | 없음 | `AdminDashboard.tsx` |
| 순환수업 | 보라색(`bg-purple-50`) | `RefreshCw` 아이콘 | `AdminDashboard.tsx` |
| 순환수업 휴일 | 빨간색(`bg-red-50`) | 취소선 | `AdminDashboard.tsx` |

### 4.2 캘린더 마커

```tsx
// CalendarDayCell.tsx:110-126
{isRotationDay && (
  <div className="flex justify-center mt-2">
    {isRotationHoliday ? (
      // 휴일: 빨간색 X 표시
      <div className="bg-red-50 text-red-500">
        <RefreshCw /> <span className="line-through">순환</span>
      </div>
    ) : (
      // 정상 순환수업: 보라색 표시
      <div className="bg-purple-50 text-purple-600">
        <RefreshCw /> 순환
      </div>
    )}
  </div>
)}
```

---

## 5. 사용자 요청 재해석

사용자가 요청한 기능이 이미 구현되어 있으므로, 가능한 추가 요청 해석:

### 5.1 가능한 해석 A: 정규 수업도 순환수업처럼 시각적 구분

현재:
- 순환수업: 보라색 배경 + 아이콘
- 정규 수업: 일반 배경

**개선안**: 정규 수업도 과목별 색상 또는 아이콘으로 구분

### 5.2 가능한 해석 B: 반 설정 시 수업 요일/시간 입력 UI 개선

현재 `CreateClassModal` / `EditClassModal`에서:
- 요일 선택: 다중 선택 가능
- 시간 입력: 시작/종료 시간 입력

**개선안**: 더 직관적인 시간표 형태 UI

### 5.3 가능한 해석 C: 캘린더에 정규 수업 마커 추가

현재:
- 순환수업 요일: 보라색 "순환" 마커 표시
- 정규 수업 요일: 마커 없음

**개선안**: 정규 수업 있는 요일에도 마커 표시

---

## 6. 검증 방법

기능이 정상 작동하는지 확인하려면:

1. **반 관리 페이지** (`/admin/classes`)에서:
   - 새 반 생성 또는 기존 반 수정
   - `수업 요일`: 월, 수, 금 선택
   - `시작 시간`: 14:00
   - `종료 시간`: 16:00

2. **관리자 대시보드** (`/admin`)에서:
   - 캘린더에서 월, 수, 금 중 하나 클릭
   - "오늘 수업 일정"에 해당 반이 표시되는지 확인

---

## 7. 결론

| 항목 | 상태 |
|------|------|
| 반운영에서 수업요일/시간 설정 | ✅ 이미 가능 |
| 대시보드에 정규 수업 표시 | ✅ 이미 구현됨 |
| 순환수업과 동일한 UI로 표시 | ✅ 동일한 `DashboardClass` 타입 사용 |

**추가 개발 필요 없음** - 기능이 이미 완전히 구현되어 있습니다.

만약 사용자가 원하는 것이 다른 것이라면 (예: UI 개선, 마커 추가 등), 구체적인 요구사항을 확인해야 합니다.

---

## 8. 추가 개선 가능 항목

| 개선안 | 난이도 | 설명 |
|--------|--------|------|
| 정규 수업 캘린더 마커 | 낮음 | 정규 수업 있는 날에 파란색 점 표시 |
| 과목별 색상 구분 | 낮음 | 수학(파랑), 영어(초록) 등 색상 배경 |
| 수업 없는 날 표시 | 낮음 | 회색 음영 처리 |
| 반별 수업 횟수 뱃지 | 중간 | 캘린더 셀에 "수학 2회" 표시 |

---

*연구리포트 작성 완료. 개발 진행은 사용자 요청 시 수행.*
