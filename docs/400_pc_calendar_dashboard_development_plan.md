# PC 관리자 대시보드 캘린더 UI 개발 계획

> v5 Toss UX 목업 기반 단계별 구현 계획

---

## 1. 개요

### 목표
- PC 관리자 대시보드에 주간 캘린더 추가
- 캘린더에 **공지사항** 표시 (PC: 텍스트, 모바일: 점)
- 날짜 선택 시 해당 일자 데이터로 대시보드 갱신
- Toss UX 철학 적용 (시각적 단순화, Progressive Disclosure, 속도감)

### 참조 문서
- [v5 목업](mockups/admin_pc_calendar_dashboard_v5_toss.html)
- [타당성 리포트](399_pc_admin_calendar_dashboard_feasibility_report.md)

---

## 2. 아키텍처

### 파일 구조
```
frontend/src/
├── components/admin/dashboard/
│   ├── WeeklyCalendar.tsx       [신규] 주간 캘린더 컴포넌트
│   ├── CalendarDayCell.tsx      [신규] 날짜 셀 컴포넌트
│   └── index.ts                 [수정] export 추가
│
├── hooks/
│   ├── useAdminData.ts          [수정] 날짜 파라미터 추가
│   └── useAdminNotices.ts       [신규] 공지사항 데이터 훅
│
├── pages/admin/
│   └── AdminDashboard.tsx       [수정] 캘린더 통합
│
└── types/
    └── admin.ts                 [신규] 공지사항 타입 정의
```

### 데이터 흐름
```
[WeeklyCalendar] ─┬─ 날짜 선택 → selectedDate state 변경
                  │
                  └─ 공지 표시 ← useAdminNotices(weekRange)

[AdminDashboard] ── selectedDate → useAdminKPI(date)
                                 → useTodayClasses(date)
```

---

## 3. 타입 정의

### 공지사항 타입 (`types/admin.ts`)
```typescript
/** 공지사항 유형 */
export type NoticeType = 'warning' | 'info' | 'holiday' | 'event';

/** 공지사항 */
export interface Notice {
  id: string;
  date: string;           // YYYY-MM-DD
  type: NoticeType;
  title: string;
  description?: string;
  priority: number;       // 높을수록 먼저 표시
  createdAt: string;
}

/** 날짜별 공지 맵 */
export type NoticesByDate = Record<string, Notice[]>;

/** 주간 범위 */
export interface WeekRange {
  start: string;  // YYYY-MM-DD (월요일)
  end: string;    // YYYY-MM-DD (일요일)
  weekNumber: number;
  month: number;
  year: number;
}
```

### 캘린더 Props (`components/admin/dashboard/WeeklyCalendar.tsx`)
```typescript
interface WeeklyCalendarProps {
  selectedDate: string;           // YYYY-MM-DD
  onDateSelect: (date: string) => void;
  notices?: NoticesByDate;
  loading?: boolean;
}

interface CalendarDayCellProps {
  date: Date;
  isToday: boolean;
  isSelected: boolean;
  notices: Notice[];
  onClick: () => void;
}
```

---

## 4. Phase별 개발 계획

### Phase 1: 타입 및 유틸리티 (예상: 30분)
**목표**: 기반 타입 정의 및 날짜 유틸리티 함수 구현

**파일 생성 순서**:
1. `frontend/src/types/admin.ts` - 공지사항 타입 정의
2. `frontend/src/utils/weekUtils.ts` - 주간 계산 유틸리티

**구현 항목**:
- [ ] Notice, NoticeType, WeekRange 타입 정의
- [ ] getWeekRange(date: Date): WeekRange 함수
- [ ] getWeekDays(weekRange: WeekRange): Date[] 함수
- [ ] formatDateKey(date: Date): string 함수

**테스트**:
- `npm run build` 성공 확인
- 타입 에러 없음 확인

---

### Phase 2: 공지사항 훅 (예상: 45분)
**목표**: 공지사항 데이터 조회 훅 구현

**파일 생성/수정**:
1. `frontend/src/hooks/useAdminNotices.ts` - 신규 생성

**구현 항목**:
- [ ] useAdminNotices(weekRange: WeekRange) 훅
- [ ] Mock 데이터 fallback 구현
- [ ] Supabase notices 테이블 쿼리 (테이블 없으면 Mock만 사용)

**Mock 데이터 예시**:
```typescript
const MOCK_NOTICES: Notice[] = [
  { id: '1', date: '2024-12-19', type: 'warning', title: '결석 2명', priority: 10 },
  { id: '2', date: '2024-12-19', type: 'info', title: '상담 14:00', priority: 5 },
  { id: '3', date: '2024-12-20', type: 'holiday', title: '휴원', priority: 20 },
  { id: '4', date: '2024-12-17', type: 'info', title: '교재 변경 안내', priority: 3 },
];
```

**테스트**:
- `npm run build` 성공
- 브라우저 콘솔에서 데이터 확인

---

### Phase 3: 캘린더 UI 컴포넌트 (예상: 1시간)
**목표**: WeeklyCalendar, CalendarDayCell 컴포넌트 구현

**파일 생성 순서**:
1. `frontend/src/components/admin/dashboard/CalendarDayCell.tsx`
2. `frontend/src/components/admin/dashboard/WeeklyCalendar.tsx`
3. `frontend/src/components/admin/dashboard/index.ts` - export 추가

**CalendarDayCell 구현**:
```tsx
// 핵심 스타일 (v5 목업 기반)
const baseStyles = `
  p-3 border-r border-grey-100 cursor-pointer transition-colors min-h-[88px]
`;

// 상태별 스타일
const todayStyles = 'bg-blue-50';
const defaultStyles = 'hover:bg-grey-50';
const weekendStyles = 'hover:bg-red-50/50';

// 공지 타입별 색상
const noticeColors = {
  warning: 'text-orange-600',
  info: 'text-grey-500',
  holiday: 'text-red-500',
  event: 'text-blue-500',
};
```

**WeeklyCalendar 구현**:
- 헤더: 주 이동 버튼 + "12월 3주" 표시 + "오늘" 버튼
- 그리드: 7열 grid (월~일)
- 각 셀에 CalendarDayCell 렌더링

**테스트**:
- Storybook 또는 별도 테스트 페이지에서 UI 확인
- hover/클릭 인터랙션 확인

---

### Phase 4: 대시보드 통합 (예상: 1시간)
**목표**: AdminDashboard에 캘린더 통합 및 날짜 연동

**파일 수정**:
1. `frontend/src/pages/admin/AdminDashboard.tsx`
2. `frontend/src/hooks/useAdminData.ts` (날짜 파라미터 추가)

**AdminDashboard 변경사항**:
```tsx
// 상태 추가
const [selectedDate, setSelectedDate] = useState<string>(
  new Date().toISOString().split('T')[0]
);

// 훅 수정 (날짜 파라미터)
const { data: kpiData } = useAdminKPI(selectedDate);
const { data: todayClasses } = useTodayClasses(selectedDate);

// 캘린더 추가 (KPI 위에 배치)
<WeeklyCalendar
  selectedDate={selectedDate}
  onDateSelect={setSelectedDate}
  notices={notices}
/>
```

**useAdminData 변경사항**:
```typescript
// 기존
export function useTodayClasses() { ... }
export function useAdminKPI() { ... }

// 변경 (날짜 파라미터 추가, 기본값 오늘)
export function useTodayClasses(date?: string) {
  const targetDate = date || new Date().toISOString().split('T')[0];
  // 기존 로직에서 today → targetDate 사용
}

export function useAdminKPI(date?: string) {
  const targetDate = date || new Date().toISOString().split('T')[0];
  // 기존 로직에서 today → targetDate 사용
}
```

**테스트**:
- 캘린더 날짜 클릭 시 대시보드 데이터 갱신 확인
- "오늘" 버튼 클릭 시 오늘 날짜로 복귀 확인
- 주 이동 시 캘린더 갱신 확인

---

### Phase 5: KPI 간소화 (예상: 30분)
**목표**: Toss UX 철학에 맞게 KPI 카드 간소화

**파일 수정**:
1. `frontend/src/pages/admin/AdminDashboard.tsx` - MetricCard 수정

**변경사항**:
```tsx
// 기존 MetricCard
<MetricCard
  label="오늘 수업"
  value={12}
  unit="개"      // 제거
  badge="확인 필요"
/>

// 변경 후 (v5 스타일)
<MetricCard
  label="오늘 수업"
  value={12}
  highlight={false}  // 강조 여부
/>

// 스타일 변경
// - 단위(개, 건, %) 제거
// - 숫자만 크게 표시
// - 주의 필요시 border 색상만 변경
```

**테스트**:
- UI가 v5 목업과 일치하는지 확인
- 반응형 (모바일 뷰) 확인

---

### Phase 6: 모바일 캘린더 점 표시 (예상: 30분)
**목표**: 모바일 버전에서 공지를 점으로 표시

**파일 수정**:
1. `frontend/src/components/backoffice/dashboard/DateSelector.tsx`

**변경사항**:
- 날짜 셀에 공지 여부에 따른 점 표시 추가
- 점 색상: warning=주황, info=파랑, holiday=빨강

```tsx
// 점 표시 (날짜 아래)
<div className="flex gap-0.5 mt-0.5">
  {notices.slice(0, 2).map((notice, idx) => (
    <div
      key={idx}
      className={`w-1 h-1 rounded-full ${getNoticeColor(notice.type)}`}
    />
  ))}
</div>
```

**테스트**:
- 모바일 뷰에서 점 표시 확인
- PC/모바일 간 일관성 확인

---

## 5. 환경변수

현재 프로젝트에서 사용 중인 환경변수 (추가 불필요):
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

---

## 6. 예상 에러 케이스

| 에러 | 원인 | 해결책 |
|------|------|--------|
| `Cannot find module '@/types/admin'` | 경로 alias 문제 | tsconfig.json paths 확인, 상대경로 사용 |
| `Property 'notices' does not exist` | 타입 미정의 | Phase 1 타입 정의 확인 |
| `Supabase notices 테이블 없음` | 테이블 미생성 | Mock 데이터 fallback 사용 |
| `selectedDate undefined` | 초기값 없음 | 기본값 `new Date().toISOString().split('T')[0]` |
| `date 파라미터 전달 안됨` | 훅 시그니처 변경 | useTodayClasses 호출부 모두 확인 |

---

## 7. 테스트 체크리스트

### Phase 1 완료 후
- [ ] `npm run build` 성공
- [ ] TypeScript 에러 없음

### Phase 2 완료 후
- [ ] useAdminNotices 훅 정상 동작
- [ ] Mock 데이터 반환 확인

### Phase 3 완료 후
- [ ] 캘린더 UI 렌더링 확인
- [ ] 날짜 hover 효과 확인
- [ ] 공지 텍스트 표시 확인
- [ ] 주 이동 버튼 동작 확인

### Phase 4 완료 후
- [ ] 날짜 클릭 → 대시보드 데이터 갱신
- [ ] "오늘" 버튼 → 오늘 날짜로 복귀
- [ ] 기존 기능 정상 동작 (KPI, 수업 목록 등)

### Phase 5 완료 후
- [ ] KPI 카드 v5 스타일 적용
- [ ] 단위 텍스트 제거됨

### Phase 6 완료 후
- [ ] 모바일 캘린더 점 표시
- [ ] PC/모바일 일관성

---

## 8. 롤백 계획

각 Phase는 독립적으로 롤백 가능:
- Phase 1-2: 파일 삭제
- Phase 3: 컴포넌트 폴더 삭제
- Phase 4: AdminDashboard.tsx git checkout
- Phase 5-6: 개별 파일 git checkout

---

## 9. 다음 단계 (Phase 7+)

구현 완료 후 추가 개선 사항:
1. **공지사항 CRUD**: Supabase notices 테이블 + 관리 UI
2. **공지 상세 모달**: 클릭 시 전체 내용 표시
3. **월간 뷰**: 주간 → 월간 전환 기능
4. **캘린더 동기화**: 모바일/PC 날짜 상태 공유

---

*작성일: 2024-12-19*
*참조: v5 Toss UX 목업*
