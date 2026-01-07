# 280. 월간뷰 기간 선택(시작~끝) 연구 리포트

> 작성일: 2025-12-11
> 관련: ClassesPage v3, MonthlyCalendarModal

---

## 1. 요구사항

### 현재 상태
- 월간 버튼 클릭 시 `MonthlyCalendarModal` 열림
- **단일 날짜 선택** 방식 (1일 선택 → 즉시 닫힘)
- 선택된 월의 전체 세션 데이터 표시

### 변경 요청
- **시작일 ~ 종료일** 범위 선택 방식으로 변경
- 사용자가 원하는 기간의 데이터만 필터링하여 표시

---

## 2. UX 패턴 분석

### 2.1 Date Range Picker 주요 패턴

| 패턴 | 설명 | 장점 | 단점 |
|------|------|------|------|
| **A. 순차 선택** | 첫 클릭=시작, 두번째=종료 | 직관적, 터치 친화적 | 실수 시 재시작 필요 |
| **B. 탭 전환** | "시작일/종료일" 탭 | 명확한 구분 | 추가 클릭 필요 |
| **C. 2개 캘린더** | 좌=시작, 우=종료 | PC에서 효율적 | 모바일 공간 부족 |
| **D. 프리셋 + 커스텀** | 빠른 선택 + 직접 지정 | 편의성 높음 | 구현 복잡 |

### 2.2 추천: 패턴 A + D 조합

학원 수업 관리 특성상:
- **프리셋**: "이번 주", "지난 주", "이번 달", "지난 달"
- **커스텀**: 순차 클릭으로 시작~종료 직접 선택

---

## 3. UI 설계

### 3.1 바텀시트 레이아웃

```
┌─────────────────────────────────────┐
│         ─── (드래그 핸들)           │
├─────────────────────────────────────┤
│  기간 선택                    [닫기] │
├─────────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐    │
│ │이번주│ │지난주│ │이번달│ │지난달│    │  ← 프리셋 버튼
│ └─────┘ └─────┘ └─────┘ └─────┘    │
├─────────────────────────────────────┤
│   시작: 12/2 (월)  →  종료: 12/11 (수)  │  ← 선택된 범위 표시
├─────────────────────────────────────┤
│     ◀   2024년 12월   ▶              │
├─────────────────────────────────────┤
│  월  화  수  목  금  토  일           │
│                                     │
│       1                             │
│  [2] [3] [4] [5] [6]  7   8         │  ← 범위 하이라이트
│  [9][10][11] 12  13  14  15         │
│  16  17  18  19  20  21  22         │
│  23  24  25  26  27  28  29         │
│  30  31                             │
├─────────────────────────────────────┤
│           [ 적용하기 ]               │  ← 확인 버튼
└─────────────────────────────────────┘
```

### 3.2 상태 표시

| 상태 | 스타일 |
|------|--------|
| 시작일 | 파란 원 (좌측 반원) |
| 종료일 | 파란 원 (우측 반원) |
| 범위 내 | 연한 파란 배경 |
| 수업 있음 | 파란 점 |
| 오늘 | 테두리 강조 |

### 3.3 프리셋 정의

```typescript
const PRESETS = [
  { label: '이번 주', getValue: () => getCurrentWeekRange() },
  { label: '지난 주', getValue: () => getLastWeekRange() },
  { label: '이번 달', getValue: () => getCurrentMonthRange() },
  { label: '지난 달', getValue: () => getLastMonthRange() },
];
```

---

## 4. 인터랙션 플로우

### 4.1 순차 선택 플로우

```
[모달 열림]
    ↓
[사용자가 날짜 클릭]
    ↓
┌─────────────────────────────────┐
│ startDate 없음?                 │
│   → startDate = 클릭한 날짜     │
│   → "시작일 선택됨" 표시        │
│                                 │
│ startDate 있고 endDate 없음?    │
│   → 클릭 날짜 < startDate?      │
│      → startDate 재설정         │
│   → 클릭 날짜 >= startDate?     │
│      → endDate = 클릭한 날짜    │
│      → 범위 하이라이트 표시     │
│                                 │
│ 둘 다 있음?                     │
│   → 초기화 후 startDate 재설정  │
└─────────────────────────────────┘
    ↓
[적용 버튼 클릭]
    ↓
[onRangeSelect(startDate, endDate)]
    ↓
[모달 닫힘]
```

### 4.2 프리셋 선택 플로우

```
[프리셋 버튼 클릭]
    ↓
[startDate, endDate 자동 설정]
    ↓
[캘린더에 범위 하이라이트]
    ↓
[적용 버튼 클릭 또는 자동 적용]
```

---

## 5. 컴포넌트 설계

### 5.1 새 Props 인터페이스

```typescript
interface DateRangeCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;

  // 기존 단일 선택 대신 범위 선택
  startDate: Date | null;
  endDate: Date | null;
  onRangeSelect: (start: Date, end: Date) => void;

  // 수업 있는 날짜들 (점 표시용)
  classScheduleDates?: Date[];

  // 프리셋 사용 여부
  showPresets?: boolean;
}
```

### 5.2 내부 상태

```typescript
const [selectionMode, setSelectionMode] = useState<'start' | 'end'>('start');
const [tempStart, setTempStart] = useState<Date | null>(startDate);
const [tempEnd, setTempEnd] = useState<Date | null>(endDate);
const [viewDate, setViewDate] = useState(startDate || new Date());
```

### 5.3 날짜 클릭 핸들러

```typescript
const handleDateClick = (date: Date) => {
  if (!tempStart || (tempStart && tempEnd)) {
    // 새로 시작
    setTempStart(date);
    setTempEnd(null);
    setSelectionMode('end');
  } else {
    // 종료일 선택
    if (date < tempStart) {
      // 시작일보다 이전 → 시작일 재설정
      setTempStart(date);
    } else {
      setTempEnd(date);
    }
  }
};
```

---

## 6. ClassesPage 연동

### 6.1 상태 변경

```typescript
// 기존
const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('2회');

// 변경
const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('2회');
const [customDateRange, setCustomDateRange] = useState<{
  start: Date | null;
  end: Date | null;
}>({ start: null, end: null });
```

### 6.2 세션 필터링 로직

```typescript
const filteredSessions = useMemo(() => {
  const sessions = MOCK_SESSIONS.filter((s) => s.classId === selectedClassId);

  if (selectedPeriod === '월간' && customDateRange.start && customDateRange.end) {
    // 커스텀 범위로 필터링
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

---

## 7. 구현 방안

### 방안 A: 기존 모달 확장

| 항목 | 내용 |
|------|------|
| 파일 | `MonthlyCalendarModal.tsx` 수정 |
| 장점 | 기존 코드 재사용 |
| 단점 | 복잡도 증가 |
| 작업량 | 중간 |

### 방안 B: 새 컴포넌트 생성 (추천)

| 항목 | 내용 |
|------|------|
| 파일 | `DateRangeCalendarModal.tsx` 신규 |
| 장점 | 관심사 분리, 테스트 용이 |
| 단점 | 코드 중복 일부 |
| 작업량 | 중간 |

### 방안 C: 라이브러리 도입

| 항목 | 내용 |
|------|------|
| 라이브러리 | react-day-picker, react-dates |
| 장점 | 검증된 UX, 빠른 구현 |
| 단점 | 번들 크기 증가, 커스텀 제한 |
| 작업량 | 적음 |

---

## 8. 추천 구현 계획

### Phase 1: DateRangeCalendarModal 생성
- 새 컴포넌트 파일 생성
- 범위 선택 로직 구현
- 프리셋 버튼 구현

### Phase 2: ClassesPage 연동
- customDateRange 상태 추가
- 월간 버튼 클릭 시 새 모달 열기
- 필터링 로직 업데이트

### Phase 3: 스타일 및 UX 개선
- 범위 하이라이트 애니메이션
- 터치 피드백
- 접근성 개선

---

## 9. 예상 작업량

| 작업 | 예상 |
|------|------|
| DateRangeCalendarModal 구현 | 메인 작업 |
| ClassesPage 연동 | 통합 작업 |
| 테스트 및 디버깅 | 검증 |

---

## 10. 결론

**추천: 방안 B (새 컴포넌트 생성)**

1. `DateRangeCalendarModal.tsx` 신규 생성
2. 순차 선택 + 프리셋 조합 UX
3. 기존 `MonthlyCalendarModal`은 다른 곳에서 재사용 가능

사용자에게 직관적인 기간 선택 경험을 제공하면서,
코드 유지보수성도 확보하는 방안입니다.

---

*다음 단계: 목업 HTML 작성 또는 바로 구현 진행*
