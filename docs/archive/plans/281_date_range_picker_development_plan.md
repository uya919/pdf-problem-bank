# 281. 월간뷰 기간 선택 기능 개발 계획

> 작성일: 2025-12-11
> 참조: 280번 연구 리포트

---

## 1. 개발 목표

| 항목 | 현재 | 목표 |
|------|------|------|
| 월간 선택 | 단일 날짜 → 즉시 닫힘 | 시작~종료 범위 선택 |
| 데이터 필터링 | 전체 세션 표시 | 선택 범위 내 세션만 |
| 편의 기능 | 없음 | 프리셋 버튼 (이번 주, 지난 주 등) |

---

## 2. 파일 구조

### 신규 파일 (2개)
```
frontend/src/components/backoffice/modals/
├── DateRangeCalendarModal.tsx   # 기간 선택 모달
└── index.ts                      # export 업데이트

frontend/src/utils/
└── dateUtils.ts                  # 날짜 유틸리티 함수
```

### 수정 파일 (2개)
```
frontend/src/components/backoffice/classes/ClassHeaderCard.tsx
frontend/src/pages/backoffice/ClassesPage.tsx
```

---

## 3. 단계별 구현

### Phase 1: 날짜 유틸리티 함수

**파일**: `frontend/src/utils/dateUtils.ts`

```typescript
/**
 * 날짜 유틸리티 함수
 */

// 두 날짜가 같은 날인지 비교
export function isSameDay(d1: Date, d2: Date): boolean;

// 날짜가 범위 내에 있는지 확인
export function isInRange(date: Date, start: Date, end: Date): boolean;

// 이번 주 범위 (월~일)
export function getCurrentWeekRange(): { start: Date; end: Date };

// 지난 주 범위
export function getLastWeekRange(): { start: Date; end: Date };

// 이번 달 범위
export function getCurrentMonthRange(): { start: Date; end: Date };

// 지난 달 범위
export function getLastMonthRange(): { start: Date; end: Date };

// 날짜 포맷 (12/11 (수))
export function formatDateWithDay(date: Date): string;
```

---

### Phase 2: DateRangeCalendarModal 기본 구조

**파일**: `frontend/src/components/backoffice/modals/DateRangeCalendarModal.tsx`

#### 2.1 Props 인터페이스

```typescript
interface DateRangeCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;

  // 초기 범위 (있으면 표시)
  initialStart?: Date | null;
  initialEnd?: Date | null;

  // 범위 선택 완료 콜백
  onRangeSelect: (start: Date, end: Date) => void;

  // 수업 있는 날짜들 (점 표시용)
  classScheduleDates?: Date[];
}
```

#### 2.2 내부 상태

```typescript
// 선택 단계: 'start' | 'end' | 'complete'
const [selectionStep, setSelectionStep] = useState<'start' | 'end' | 'complete'>('start');

// 임시 선택값 (적용 전)
const [tempStart, setTempStart] = useState<Date | null>(initialStart ?? null);
const [tempEnd, setTempEnd] = useState<Date | null>(initialEnd ?? null);

// 캘린더 보기 월
const [viewDate, setViewDate] = useState(initialStart ?? new Date());
```

#### 2.3 컴포넌트 레이아웃

```
┌─────────────────────────────────────────┐
│              (드래그 핸들)               │
├─────────────────────────────────────────┤
│  기간 선택                        [닫기] │
├─────────────────────────────────────────┤
│  [Phase 3에서 추가: 프리셋 버튼]        │
├─────────────────────────────────────────┤
│  시작: --/-- (--)  →  종료: --/-- (--)  │  ← 선택 상태 표시
│  "시작일을 선택하세요" (안내 메시지)     │
├─────────────────────────────────────────┤
│       ◀     2024년 12월     ▶           │
├─────────────────────────────────────────┤
│   월   화   수   목   금   토   일       │
├─────────────────────────────────────────┤
│  (캘린더 그리드 - 기존 로직 재사용)      │
├─────────────────────────────────────────┤
│  [초기화]              [적용하기]       │
└─────────────────────────────────────────┘
```

---

### Phase 3: 날짜 클릭 로직 구현

#### 3.1 순차 선택 알고리즘

```typescript
const handleDateClick = (date: Date) => {
  // Case 1: 아무것도 선택 안됨 → 시작일 설정
  if (!tempStart) {
    setTempStart(date);
    setTempEnd(null);
    setSelectionStep('end');
    return;
  }

  // Case 2: 시작일만 있음 → 종료일 설정
  if (tempStart && !tempEnd) {
    if (date < tempStart) {
      // 시작일보다 이전 날짜 클릭 → 시작일 재설정
      setTempStart(date);
    } else if (isSameDay(date, tempStart)) {
      // 같은 날 클릭 → 당일만 선택 (시작=종료)
      setTempEnd(date);
      setSelectionStep('complete');
    } else {
      // 이후 날짜 클릭 → 종료일 설정
      setTempEnd(date);
      setSelectionStep('complete');
    }
    return;
  }

  // Case 3: 둘 다 있음 → 초기화 후 새로 시작
  setTempStart(date);
  setTempEnd(null);
  setSelectionStep('end');
};
```

#### 3.2 범위 하이라이트 스타일

```typescript
const getDateStyle = (date: Date) => {
  const isStart = tempStart && isSameDay(date, tempStart);
  const isEnd = tempEnd && isSameDay(date, tempEnd);
  const isInSelectedRange = tempStart && tempEnd && isInRange(date, tempStart, tempEnd);

  if (isStart && isEnd) {
    // 단일 날짜 선택 (동그라미)
    return 'bg-[#3182F6] text-white rounded-full';
  }
  if (isStart) {
    // 시작일 (왼쪽 반원)
    return 'bg-[#3182F6] text-white rounded-l-full';
  }
  if (isEnd) {
    // 종료일 (오른쪽 반원)
    return 'bg-[#3182F6] text-white rounded-r-full';
  }
  if (isInSelectedRange) {
    // 범위 내 (사각형 배경)
    return 'bg-[#E8F4FF] text-[#3182F6]';
  }

  return ''; // 기본
};
```

---

### Phase 4: 프리셋 버튼 추가

#### 4.1 프리셋 정의

```typescript
interface Preset {
  label: string;
  getRange: () => { start: Date; end: Date };
}

const PRESETS: Preset[] = [
  { label: '이번 주', getRange: getCurrentWeekRange },
  { label: '지난 주', getRange: getLastWeekRange },
  { label: '이번 달', getRange: getCurrentMonthRange },
  { label: '지난 달', getRange: getLastMonthRange },
];
```

#### 4.2 프리셋 클릭 핸들러

```typescript
const handlePresetClick = (preset: Preset) => {
  const { start, end } = preset.getRange();
  setTempStart(start);
  setTempEnd(end);
  setSelectionStep('complete');

  // 해당 월로 캘린더 이동
  setViewDate(start);
};
```

#### 4.3 프리셋 UI

```tsx
<div className="flex gap-2 px-5 py-3 overflow-x-auto">
  {PRESETS.map((preset) => (
    <button
      key={preset.label}
      onClick={() => handlePresetClick(preset)}
      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium
        ${isPresetActive(preset)
          ? 'bg-[#3182F6] text-white'
          : 'bg-[#F2F4F6] text-[#6B7684]'
        }`}
    >
      {preset.label}
    </button>
  ))}
</div>
```

---

### Phase 5: ClassesPage 연동

#### 5.1 상태 추가

```typescript
// ClassesPage.tsx

// 기존
const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('2회');
const [showMonthlyCalendar, setShowMonthlyCalendar] = useState(false);

// 추가
const [customDateRange, setCustomDateRange] = useState<{
  start: Date | null;
  end: Date | null;
}>({ start: null, end: null });
```

#### 5.2 세션 필터링 로직 업데이트

```typescript
const filteredSessions = useMemo(() => {
  const sessions = MOCK_SESSIONS.filter((s) => s.classId === selectedClassId);

  // 월간 + 커스텀 범위가 설정된 경우
  if (selectedPeriod === '월간' && customDateRange.start && customDateRange.end) {
    return sessions.filter((s) => {
      const sessionDate = new Date(s.date);
      return sessionDate >= customDateRange.start! &&
             sessionDate <= customDateRange.end!;
    });
  }

  // 기존 회차 기반 필터링
  const count = selectedPeriod === '2회' ? 2 :
                selectedPeriod === '3회' ? 3 :
                selectedPeriod === '5회' ? 5 : sessions.length;
  return sessions.slice(0, count);
}, [selectedClassId, selectedPeriod, customDateRange]);
```

#### 5.3 모달 교체

```tsx
// MonthlyCalendarModal 대신 DateRangeCalendarModal 사용
<DateRangeCalendarModal
  isOpen={showMonthlyCalendar}
  onClose={() => setShowMonthlyCalendar(false)}
  initialStart={customDateRange.start}
  initialEnd={customDateRange.end}
  onRangeSelect={(start, end) => {
    setCustomDateRange({ start, end });
    setSelectedPeriod('월간');
    setShowMonthlyCalendar(false);
  }}
  classScheduleDates={classScheduleDates}
/>
```

#### 5.4 dateRange 표시 업데이트

```typescript
const dateRange = useMemo(() => {
  if (selectedPeriod === '월간' && customDateRange.start && customDateRange.end) {
    return `${formatDateShort(customDateRange.start)}~${formatDateShort(customDateRange.end)}`;
  }

  if (filteredSessions.length === 0) return '';
  const first = filteredSessions[filteredSessions.length - 1];
  const last = filteredSessions[0];
  return `${formatDate(first.dateLabel)}~${formatDate(last.dateLabel)}`;
}, [filteredSessions, selectedPeriod, customDateRange]);
```

---

### Phase 6: Export 및 정리

#### 6.1 modals/index.ts 업데이트

```typescript
// 기존
export { MonthlyCalendarModal } from './MonthlyCalendarModal';
export { ContactBottomSheet } from './ContactBottomSheet';
export { TestDetailBottomSheet } from './TestDetailBottomSheet';

// 추가
export { DateRangeCalendarModal } from './DateRangeCalendarModal';
```

#### 6.2 utils/index.ts (필요시)

```typescript
export * from './dateUtils';
```

---

## 4. 구현 순서 체크리스트

| # | 작업 | 파일 | 상태 |
|---|------|------|------|
| 1 | dateUtils.ts 생성 | utils/dateUtils.ts | ⬜ |
| 2 | DateRangeCalendarModal 기본 구조 | modals/DateRangeCalendarModal.tsx | ⬜ |
| 3 | 캘린더 그리드 구현 | (위와 동일) | ⬜ |
| 4 | 날짜 클릭 로직 | (위와 동일) | ⬜ |
| 5 | 범위 하이라이트 스타일 | (위와 동일) | ⬜ |
| 6 | 프리셋 버튼 추가 | (위와 동일) | ⬜ |
| 7 | 적용/초기화 버튼 | (위와 동일) | ⬜ |
| 8 | ClassesPage 상태 추가 | ClassesPage.tsx | ⬜ |
| 9 | 필터링 로직 업데이트 | (위와 동일) | ⬜ |
| 10 | 모달 교체 및 연결 | (위와 동일) | ⬜ |
| 11 | Export 정리 | index.ts | ⬜ |
| 12 | 빌드 테스트 | - | ⬜ |

---

## 5. 주의사항

### 5.1 날짜 비교 시 주의

```typescript
// ❌ 잘못된 비교 (시간 포함)
if (date1 === date2) { ... }

// ✅ 올바른 비교 (날짜만)
if (isSameDay(date1, date2)) { ... }
```

### 5.2 월 경계 처리

```typescript
// 12월 → 1월 넘어갈 때
const nextMonth = new Date(year, month + 1, 1);
// month가 12면 자동으로 다음 해 1월로 처리됨
```

### 5.3 시작일 > 종료일 방지

```typescript
// 종료일이 시작일보다 이전이면 swap
if (end < start) {
  [start, end] = [end, start];
}
```

### 5.4 주간 시작일 설정

```typescript
// 한국: 월요일 시작
const getWeekStart = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 월요일로
  return new Date(d.setDate(diff));
};
```

---

## 6. 예상 결과

### 완료 후 동작

1. **"월간" 버튼 클릭** → DateRangeCalendarModal 열림
2. **프리셋 선택** → 자동으로 시작~종료 범위 설정
3. **직접 선택** → 첫 클릭=시작일, 둘째 클릭=종료일
4. **적용하기 클릭** → 모달 닫히고 해당 범위 세션만 표시
5. **헤더에 날짜 범위** → "12/2~12/11" 형식으로 표시

---

*구현 시작 명령: "진행해줘"*
