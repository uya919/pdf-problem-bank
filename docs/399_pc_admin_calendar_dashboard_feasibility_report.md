# PC 관리자 대시보드 캘린더 기반 UI 구현 가능성 리포트

> 작성일: 2025-12-19
> 작성자: Claude Code
> 상태: 연구 완료

---

## 1. 요청 사항

**현재 상태:**
- 모바일 관리자 대시보드 (`AdminMobileHome.tsx`): 상단에 `DateSelector` 캘린더 컴포넌트 있음
- PC 관리자 대시보드 (`AdminDashboard.tsx`): 캘린더 없음, "오늘" 기준 고정 데이터 표시

**요청:**
PC 버전도 모바일처럼 캘린더 기반으로 특정 날짜의 대시보드를 볼 수 있게 해달라

---

## 2. 현재 구현 분석

### 2.1 모바일 대시보드 (AdminMobileHome.tsx)

```typescript
// 날짜 상태 관리
const [selectedDate, setSelectedDate] = useState(new Date());

// DateSelector 컴포넌트 사용
<DateSelector
  selectedDate={selectedDate}
  onDateChange={setSelectedDate}
  onOpenMonthly={() => {}}
  classScheduleDates={[]}
/>
```

**특징:**
- `DateSelector` 컴포넌트로 날짜 선택
- `selectedDate` 상태로 선택된 날짜 관리
- 하지만 **실제 데이터는 오늘 기준**으로만 조회 (날짜 파라미터 미사용)

### 2.2 PC 대시보드 (AdminDashboard.tsx)

```typescript
// 날짜 상태 없음
// 오늘 기준 하드코딩
const { data: todayClasses } = useTodayClasses();
const { data: kpiData } = useAdminKPI();
```

**특징:**
- 날짜 선택 UI 없음
- `useTodayClasses()` 훅이 오늘 요일 기준으로 조회
- 과목별 필터 (수학/영어/국어) 기능은 있음

### 2.3 DateSelector 컴포넌트

| 기능 | 설명 |
|------|------|
| 날짜 바 | 클릭하면 주간 드롭다운 열림 |
| 주간 선택 | 월~일 요일별 날짜 표시 |
| 주차 이동 | 이전/다음 주 버튼 |
| 월간 버튼 | 월간 캘린더 모달 열기 (현재 미구현) |
| 수업 점 표시 | `classScheduleDates` prop으로 수업 있는 날짜 표시 |

**PC에서 재사용 가능**: DateSelector는 플랫폼 독립적이며 PC에서도 사용 가능

---

## 3. 데이터 훅 분석

### 3.1 현재 훅들 (날짜 파라미터 지원 여부)

| 훅 | 파일 | 날짜 파라미터 | 수정 필요 |
|------|------|:------:|:------:|
| `useTodayClasses()` | useAdminData.ts | X (오늘 고정) | O |
| `useAdminKPI()` | useAdminData.ts | X (오늘 고정) | O |
| `useCurrentClasses()` | useAdminData.ts | X (useTodayClasses 의존) | O |

### 3.2 useTodayClasses 코드 분석

```typescript
export function useTodayClasses() {
  const today = new Date();  // 오늘 날짜 하드코딩
  const dow = today.getDay();  // 오늘 요일
  const currentTime = `${...}:${...}`;  // 현재 시간

  return useQuery({
    queryKey: ['admin', 'todayClasses', dow],
    queryFn: async (): Promise<TodayClass[]> => {
      // 오늘 요일에 해당하는 수업 조회
      const { data, error } = await supabase
        .from('classes')
        .select(...)
        .contains('day_of_week', [dow])  // 요일 기반 필터
        ...
    },
  });
}
```

**문제점:**
- `today`가 함수 내부에서 `new Date()`로 고정됨
- 파라미터로 날짜를 받지 않음
- 다른 날짜의 수업을 조회할 방법 없음

### 3.3 useAdminKPI 코드 분석

```typescript
export function useAdminKPI() {
  const today = new Date().toISOString().split('T')[0];  // 오늘 날짜
  const dow = new Date().getDay();  // 오늘 요일

  return useQuery({
    queryKey: ['admin', 'kpi', today],
    queryFn: async (): Promise<AdminKPI> => {
      // 오늘 수업 수
      // 오늘 출결 기록
      // 오늘 진도 기록
      // 이번 주 숙제
      ...
    },
  });
}
```

**문제점:**
- 동일하게 오늘 날짜 하드코딩
- 특정 날짜의 KPI 조회 불가

---

## 4. 구현 방안

### 4.1 필요한 수정 사항

```
1. DateSelector 컴포넌트 → PC 대시보드에 추가
2. useTodayClasses → useClassesByDate(date: Date) 로 확장
3. useAdminKPI → useAdminKPIByDate(date: Date) 로 확장
4. AdminDashboard에 selectedDate 상태 추가
```

### 4.2 훅 수정 설계

**Option A: 새 훅 생성 (기존 훅 유지)**

```typescript
// useClassesByDate - 날짜별 수업 조회
export function useClassesByDate(targetDate: Date) {
  const dow = targetDate.getDay();
  const dateStr = targetDate.toISOString().split('T')[0];

  return useQuery({
    queryKey: ['admin', 'classesByDate', dateStr],
    queryFn: async (): Promise<TodayClass[]> => {
      // targetDate 기준으로 조회
      ...
    },
  });
}

// useAdminKPIByDate - 날짜별 KPI 조회
export function useAdminKPIByDate(targetDate: Date) {
  const dateStr = targetDate.toISOString().split('T')[0];

  return useQuery({
    queryKey: ['admin', 'kpiByDate', dateStr],
    queryFn: async (): Promise<AdminKPI> => {
      // targetDate 기준으로 조회
      ...
    },
  });
}
```

**Option B: 기존 훅에 파라미터 추가 (Backward Compatible)**

```typescript
// 기존: useTodayClasses()
// 변경: useTodayClasses(targetDate?: Date)
export function useTodayClasses(targetDate?: Date) {
  const date = targetDate || new Date();  // 기본값 오늘
  const dow = date.getDay();
  ...
}
```

**권장: Option B** - 기존 코드 호환성 유지하면서 기능 확장

### 4.3 UI 레이아웃 수정

**현재 PC 대시보드 레이아웃:**
```
┌─────────────────────────────────────────────┐
│ AdminTopNav                                 │
├─────────────────────────────────────────────┤
│ [KPI 카드들]                                │
│ [과목 필터 바]                              │
│ [현재 진행 중 수업]                         │
│ [오늘 할 일 바]                             │
│ [오늘 수업 일정]                            │
└─────────────────────────────────────────────┘
```

**변경 후 레이아웃:**
```
┌─────────────────────────────────────────────┐
│ AdminTopNav                                 │
├─────────────────────────────────────────────┤
│ [DateSelector - 날짜 선택]                  │  ← 추가
│ [KPI 카드들]                                │
│ [과목 필터 바]                              │
│ [선택된 날짜의 진행 중 수업]                │  ← 변경
│ [오늘 할 일 바]                             │
│ [선택된 날짜의 수업 일정]                   │  ← 변경
└─────────────────────────────────────────────┘
```

### 4.4 DateSelector PC 스타일링

DateSelector는 모바일용으로 디자인되어 있어 PC에서 스타일 조정 필요:

```typescript
// PC용 DateSelector 래퍼 또는 variant prop 추가
<DateSelector
  selectedDate={selectedDate}
  onDateChange={setSelectedDate}
  onOpenMonthly={handleOpenMonthly}
  classScheduleDates={scheduleDates}
  variant="desktop"  // PC용 스타일 적용
/>
```

**PC용 스타일 조정 사항:**
- 드롭다운 너비: 모바일 100% → PC 적정 너비 (400px)
- 요일 셀 크기: 터치 최적화 → 마우스 최적화
- 주간 보기 확장: 여유 공간 활용

---

## 5. 개발 복잡도 평가

| 항목 | 난이도 | 예상 작업량 |
|------|:------:|:------:|
| DateSelector PC 추가 | 낮음 | 컴포넌트 import + state 추가 |
| useTodayClasses 수정 | 중간 | 파라미터 추가 + queryKey 변경 |
| useAdminKPI 수정 | 중간 | 파라미터 추가 + queryKey 변경 |
| AdminDashboard 연동 | 중간 | 상태 관리 + props 전달 |
| DateSelector PC 스타일 | 낮음 | CSS 조정 또는 variant prop |
| 월간 캘린더 모달 | 선택 | 현재 미구현 상태 |

**총 예상 복잡도: 중간 (Medium)**

---

## 6. 구현 가능성 결론

### 6.1 결론: 구현 가능

| 항목 | 상태 |
|------|:------:|
| UI 컴포넌트 재사용 | O |
| 데이터 훅 확장 | O (파라미터 추가) |
| Supabase 쿼리 | O (day_of_week 기반) |
| 기존 코드 호환성 | O (기본값 유지) |

### 6.2 제약 사항

1. **수업 데이터 구조**
   - `classes.day_of_week`: 요일 배열 (예: [1, 3, 5] = 월,수,금)
   - 특정 날짜에 수업이 있는지는 요일 기준으로 판단
   - 휴강/보강 데이터는 별도 테이블 필요 (현재 없음)

2. **출결/진도 데이터**
   - `attendance.date`, `progress.date`: 날짜 필드 있음
   - 특정 날짜의 출결/진도 조회 가능

3. **"현재 진행 중" 표시**
   - 오늘이 아닌 날짜 선택 시 "진행 중" 상태는 무의미
   - 과거/미래 날짜는 "예정" 또는 "완료"로 표시 필요

---

## 7. 권장 개발 계획

### Phase 1: 기본 캘린더 추가
1. AdminDashboard에 `selectedDate` 상태 추가
2. DateSelector 컴포넌트 import 및 렌더링
3. 날짜 변경 시 UI만 업데이트 (데이터는 아직 연동 안 함)

### Phase 2: 데이터 훅 확장
1. `useTodayClasses(targetDate?: Date)` 파라미터 추가
2. `useAdminKPI(targetDate?: Date)` 파라미터 추가
3. queryKey에 날짜 포함하여 캐싱 분리

### Phase 3: 대시보드 연동
1. AdminDashboard에서 selectedDate를 훅에 전달
2. 날짜별 데이터 표시
3. "진행 중" 상태 로직 조정 (오늘만 유효)

### Phase 4: PC 스타일 최적화 (선택)
1. DateSelector에 `variant="desktop"` prop 추가
2. PC 화면에 맞는 스타일 조정
3. 월간 캘린더 모달 구현

---

## 8. 참고 파일

| 파일 | 설명 |
|------|------|
| [AdminMobileHome.tsx](../frontend/src/pages/admin/AdminMobileHome.tsx) | 모바일 대시보드 (DateSelector 사용) |
| [AdminDashboard.tsx](../frontend/src/pages/admin/AdminDashboard.tsx) | PC 대시보드 (수정 대상) |
| [DateSelector.tsx](../frontend/src/components/backoffice/dashboard/DateSelector.tsx) | 날짜 선택 컴포넌트 |
| [useAdminData.ts](../frontend/src/hooks/useAdminData.ts) | 관리자 데이터 훅 |

---

*v1.0 - 2025-12-19*
