# Dashboard 데이터 연결 현황 리포트

> 작성일: 2025-12-12
> 목적: hyeyum Supabase 연동 현황 및 미해결 이슈 분석

---

## 1. hyeyum Supabase 데이터 현황

| 테이블 | 레코드 수 | 상태 |
|--------|----------|------|
| classes (active) | 49개 | 데이터 있음 |
| students (active) | 244명 | 데이터 있음 |
| announcements | 26개 | 데이터 있음 |
| attendance | 544개 | 데이터 있음 |
| progress | 95개 | 데이터 있음 |
| homework | 84개 | 데이터 있음 |

---

## 2. Dashboard 데이터 연결 상태

### 연결 완료 (✅)

| UI 영역 | 훅 | 연결 상태 |
|---------|-----|----------|
| 헤더 통계 (학생/반 수) | `useDashboardStats()` | ✅ 연결됨 |
| 연결 상태 표시 | `isSupabaseConfigured` | ✅ 연결됨 |
| 수업 데이터 조회 | `useClasses()` | ✅ 연결됨 |
| 공지사항 | `useAnnouncements(5)` | ✅ 연결됨 |

### 미연결/이슈 (❌)

| UI 영역 | 현재 상태 | 이슈 |
|---------|----------|------|
| 히어로 카드 수업 표시 | ❌ 작동 안 함 | 날짜 선택 시 수업이 표시되지 않음 |
| DateSelector 파란 점 | ❌ Mock 데이터 | `classScheduleDates`가 mock 데이터 사용 |
| 출결 뱃지 | ❌ Mock 데이터 | `attendances` state가 mock 사용 |
| 진도 뱃지 | ❌ Mock 데이터 | `progresses` state가 mock 사용 |
| 숙제 뱃지 | ❌ Mock 데이터 | `homeworks` state가 mock 사용 |

---

## 3. 히어로 카드 미표시 이슈 분석

### 문제 현상
- 캘린더에서 **목요일(4) 또는 화요일(2)** 선택 시 수업이 표시되지 않음
- 서희주 선생님의 수업은 화/목에만 있음

### 원인 분석

**코드 흐름:**
```
DateSelector → onDateChange(date) → setSelectedDate(date)
                                          ↓
                              realClassSchedules useMemo
                                          ↓
                              selectedDate.getDay() 로 필터링
```

**의심되는 원인들:**

#### 1. 서희주 선생님 수업 조회 확인
```sql
SELECT id, name, day_of_week, start_time, end_time
FROM classes
WHERE teacher_id = '367e0fa9-fc63-4b39-9686-350b86740e73'
```
결과:
- 초6_심화반B: day_of_week=[2,4], 14:50-15:35
- 초5_심화반B: day_of_week=[2,4], 15:40-16:25
- 초4_심화반B: day_of_week=[2,4], 16:30-17:15

**→ 데이터는 정상** (화=2, 목=4)

#### 2. 요일 매핑 확인
```javascript
// JavaScript getDay()
// 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토

// DB day_of_week
// [2, 4] = 화요일, 목요일 ✅ 매칭됨
```

#### 3. 가능한 문제점

**A. student_count가 0으로 표시될 수 있음**
```typescript
studentCount: cls.student_count || 0,
```
- `useClasses` 훅에서 `enrollments(count)` 조인이 제대로 작동하는지 확인 필요

**B. useClasses 훅의 teacherId 필터가 작동 안 할 수 있음**
```typescript
// useBackofficeData.ts의 useClasses
if (options?.teacherId) {
  query = query.eq('teacher_id', options.teacherId);
}
```
- `teacherId` 파라미터가 제대로 전달되는지 확인 필요

**C. React Query 캐싱 이슈**
- 이전에 teacherId 없이 캐시된 데이터가 사용될 수 있음

---

## 4. 디버깅 방법

### 브라우저 콘솔에서 확인

```javascript
// 1. Supabase 연결 테스트
window.testSupabase()

// 2. React Query 캐시 확인 (DevTools)
// React Query DevTools에서 ['classes', {...}] 쿼리 확인
```

### 코드에 디버그 로그 추가

```typescript
// BackofficeDemo.tsx의 realClassSchedules useMemo에 추가
const realClassSchedules = useMemo(() => {
  console.log('classesData:', classesData);
  console.log('selectedDate:', selectedDate);
  console.log('selectedDow:', selectedDate.getDay());

  if (!classesData || classesData.length === 0) {
    console.log('No classesData');
    return null;
  }

  const filtered = classesData.filter((cls) => {
    console.log(`${cls.name}: day_of_week=${cls.day_of_week}, includes ${selectedDate.getDay()}?`, cls.day_of_week?.includes(selectedDate.getDay()));
    return cls.day_of_week?.includes(selectedDate.getDay());
  });

  console.log('Filtered classes:', filtered);
  // ...
}, [classesData, selectedDate]);
```

---

## 5. 해결 방안

### 즉시 해결 (디버그 로그 추가)

1. BackofficeDemo.tsx에 console.log 추가
2. 브라우저에서 목요일 선택 후 콘솔 확인
3. classesData가 빈 배열인지, day_of_week 필터가 실패하는지 확인

### 근본 해결

1. **useClasses 훅 점검**: teacherId 필터가 제대로 작동하는지
2. **day_of_week 타입 확인**: number[] vs number 불일치 가능성
3. **React Query 캐시 무효화**: 이전 캐시된 데이터 제거

---

## 6. 다음 단계

1. 디버그 로그 추가하여 실제 데이터 흐름 확인
2. useClasses 훅이 서희주 선생님 수업을 반환하는지 확인
3. day_of_week 필터링 로직 검증
4. 문제 해결 후 나머지 데이터 연결 진행:
   - DateSelector 파란 점 (수업 있는 날 표시)
   - TaskBadgeCard 실제 데이터 연결

---

*작성: Claude Code | Phase 2 디버깅*
