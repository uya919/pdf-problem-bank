# 408. 캘린더 통합 공지사항 개발 계획

> **Stage 16**: PC 관리자 대시보드 - 캘린더 통합 공지사항

---

## 1. 개요

### 1.1 목표
- 캘린더 하단에 계층화된 공지사항 표시
- **중요 알림** (긴급/휴원) → **일반 공지** (시험/행사/운영/특강) 순서
- 권한별 공지 분리 (관리자용 / 강사용)

### 1.2 권한별 공지 분류

| 대상 | 공지 유형 | 예시 |
|------|----------|------|
| **관리자 전용** | 운영, 재무, 인사 | 수강료 정산, 강사 급여, 계약 갱신 |
| **강사 전용** | 수업 관련 | 교재 변경, 커리큘럼 업데이트, 보강 안내 |
| **공통 (전체)** | 휴원, 시험, 행사, 긴급 | 크리스마스 휴원, 레벨테스트, 학부모 상담 |

### 1.3 참조 문서
- [407_admin_pc_hero_notice_ux_research.md](407_admin_pc_hero_notice_ux_research.md)
- [목업 HTML](mockups/admin_hero_notice_section.html)

---

## 2. 데이터베이스 스키마

### 2.1 notices 테이블

```sql
-- Supabase Migration: create_notices_table
CREATE TABLE notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 기본 정보
  title TEXT NOT NULL,
  description TEXT,

  -- 날짜/시간
  date DATE NOT NULL,                    -- 공지 표시 날짜
  start_time TIME,                       -- 시간 지정 공지 (선택)
  end_time TIME,

  -- 유형 및 우선순위
  type TEXT NOT NULL CHECK (type IN (
    'urgent',    -- 긴급 (빨강)
    'holiday',   -- 휴원 (주황)
    'exam',      -- 시험 (파랑)
    'special',   -- 특강 (초록)
    'event',     -- 행사 (보라)
    'operation'  -- 운영 (노랑)
  )),
  priority INTEGER DEFAULT 0,            -- 높을수록 상단 표시

  -- 권한 (NEW)
  visibility TEXT NOT NULL DEFAULT 'all' CHECK (visibility IN (
    'all',       -- 전체 공개 (관리자 + 강사)
    'admin',     -- 관리자 전용
    'teacher'    -- 강사 전용
  )),

  -- 메타
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- 인덱스
CREATE INDEX idx_notices_date ON notices(date);
CREATE INDEX idx_notices_type ON notices(type);
CREATE INDEX idx_notices_visibility ON notices(visibility);
CREATE INDEX idx_notices_active_date ON notices(is_active, date);

-- RLS 정책
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;

-- 관리자: 모든 공지 조회/수정
CREATE POLICY "admin_full_access" ON notices
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 강사: 'all' 또는 'teacher' 공지만 조회
CREATE POLICY "teacher_read_access" ON notices
  FOR SELECT TO authenticated
  USING (
    visibility IN ('all', 'teacher')
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
  );
```

---

## 3. 타입 정의

### 3.1 types/admin.ts 수정

```typescript
// =====================================================
// 공지사항 타입 (Stage 16)
// =====================================================

/** 공지 유형 */
export type NoticeType =
  | 'urgent'    // 긴급
  | 'holiday'   // 휴원
  | 'exam'      // 시험
  | 'special'   // 특강
  | 'event'     // 행사
  | 'operation'; // 운영

/** 공지 대상 (권한) */
export type NoticeVisibility =
  | 'all'      // 전체
  | 'admin'    // 관리자 전용
  | 'teacher'; // 강사 전용

/** 공지 데이터 */
export interface Notice {
  id: string;
  title: string;
  description?: string;
  date: string;           // 'YYYY-MM-DD'
  startTime?: string;     // 'HH:MM'
  endTime?: string;
  type: NoticeType;
  priority: number;
  visibility: NoticeVisibility;
  createdBy?: string;
  createdAt: string;
  isActive: boolean;
}

/** 중요 공지 유형 (긴급, 휴원) */
export const IMPORTANT_NOTICE_TYPES: NoticeType[] = ['urgent', 'holiday'];

/** 공지 유형별 스타일 */
export const NOTICE_TYPE_STYLES: Record<NoticeType, {
  label: string;
  bgColor: string;
  borderColor: string;
  iconBgColor: string;
  textColor: string;
  badgeBgColor: string;
  badgeTextColor: string;
}> = {
  urgent: {
    label: '긴급',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-100',
    iconBgColor: 'bg-red-100',
    textColor: 'text-red-600',
    badgeBgColor: 'bg-red-500',
    badgeTextColor: 'text-white',
  },
  holiday: {
    label: '휴원',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-100',
    iconBgColor: 'bg-orange-100',
    textColor: 'text-orange-600',
    badgeBgColor: 'bg-orange-500',
    badgeTextColor: 'text-white',
  },
  exam: {
    label: '시험',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-100',
    iconBgColor: 'bg-blue-100',
    textColor: 'text-blue-600',
    badgeBgColor: 'bg-blue-100',
    badgeTextColor: 'text-blue-700',
  },
  special: {
    label: '특강',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-100',
    iconBgColor: 'bg-green-100',
    textColor: 'text-green-600',
    badgeBgColor: 'bg-green-100',
    badgeTextColor: 'text-green-700',
  },
  event: {
    label: '행사',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-100',
    iconBgColor: 'bg-purple-100',
    textColor: 'text-purple-600',
    badgeBgColor: 'bg-purple-100',
    badgeTextColor: 'text-purple-700',
  },
  operation: {
    label: '운영',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-100',
    iconBgColor: 'bg-yellow-100',
    textColor: 'text-yellow-600',
    badgeBgColor: 'bg-yellow-100',
    badgeTextColor: 'text-yellow-700',
  },
};

/** 날짜별 공지 맵 */
export type NoticesByDate = Record<string, Notice[]>;
```

---

## 4. Phase별 개발 계획

### Phase 1: DB 마이그레이션 + 타입 정의
**예상 파일**: 2개

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `supabase/migrations/xxx_create_notices_table.sql` | 테이블 생성 |
| 2 | `frontend/src/types/admin.ts` | 타입 추가/수정 |

**완료 조건**:
- [ ] Supabase에 notices 테이블 생성됨
- [ ] RLS 정책 적용됨
- [ ] 타입 정의 완료

---

### Phase 2: 훅 수정 (useAdminNotices)
**예상 파일**: 1개

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `frontend/src/hooks/useAdminNotices.ts` | Supabase 연동 + 권한 필터 |

**수정 내용**:
```typescript
// 현재: generateMockNotices() → 빈 배열
// 변경: Supabase notices 테이블 조회 + visibility 필터

export function useAdminNotices(options: UseAdminNoticesOptions = {}) {
  const { weekRange, enabled = true } = options;

  // 현재 사용자 role 조회
  const { data: profile } = useProfile();
  const userRole = profile?.role || 'teacher';

  return useQuery({
    queryKey: ['admin', 'notices', weekRange?.start, weekRange?.end, userRole],
    queryFn: async (): Promise<NoticesByDate> => {
      let query = supabase
        .from('notices')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      // 주간 범위 필터
      if (weekRange) {
        query = query
          .gte('date', weekRange.start)
          .lte('date', weekRange.end);
      }

      // 권한별 필터
      if (userRole === 'admin') {
        // 관리자: 모든 공지
        query = query.in('visibility', ['all', 'admin']);
      } else {
        // 강사: all, teacher만
        query = query.in('visibility', ['all', 'teacher']);
      }

      const { data, error } = await query;
      // ... 변환 로직
    },
  });
}

// 새 훅: 중요 알림 / 일반 공지 분리
export function useNoticesByImportance(date: string) {
  const { data: allNotices, ...rest } = useAdminNoticesByDate(date);

  const important = allNotices?.filter(n =>
    IMPORTANT_NOTICE_TYPES.includes(n.type)
  ) || [];

  const general = allNotices?.filter(n =>
    !IMPORTANT_NOTICE_TYPES.includes(n.type)
  ) || [];

  return { important, general, ...rest };
}
```

**완료 조건**:
- [ ] Supabase 연동 완료
- [ ] 권한별 필터링 동작
- [ ] 중요/일반 분리 훅 추가

---

### Phase 3: 공지 컴포넌트 생성
**예상 파일**: 4개

| 순서 | 파일 | 설명 |
|------|------|------|
| 1 | `components/admin/dashboard/NoticeCard.tsx` | 중요 알림 카드 (긴급/휴원) |
| 2 | `components/admin/dashboard/NoticeItem.tsx` | 일반 공지 아이템 (리스트용) |
| 3 | `components/admin/dashboard/ImportantNotices.tsx` | 중요 알림 섹션 |
| 4 | `components/admin/dashboard/GeneralNotices.tsx` | 일반 공지 섹션 |

**NoticeCard.tsx** (중요 알림용):
```typescript
interface NoticeCardProps {
  notice: Notice;
  onClick?: () => void;
}

export function NoticeCard({ notice, onClick }: NoticeCardProps) {
  const style = NOTICE_TYPE_STYLES[notice.type];

  return (
    <div
      className={`flex items-center gap-3 p-3 ${style.bgColor} border ${style.borderColor} rounded-xl cursor-pointer hover:opacity-90 transition-colors`}
      onClick={onClick}
    >
      <div className={`w-9 h-9 ${style.iconBgColor} rounded-lg flex items-center justify-center`}>
        <NoticeIcon type={notice.type} className={`w-4 h-4 ${style.textColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-medium text-grey-900 text-sm truncate">{notice.title}</span>
          <span className={`px-1.5 py-0.5 ${style.badgeBgColor} ${style.badgeTextColor} text-[10px] font-medium rounded`}>
            {style.label}
          </span>
        </div>
        <p className="text-xs text-grey-500 truncate">{notice.description}</p>
      </div>
    </div>
  );
}
```

**NoticeItem.tsx** (일반 공지용):
```typescript
interface NoticeItemProps {
  notice: Notice;
  onClick?: () => void;
}

export function NoticeItem({ notice, onClick }: NoticeItemProps) {
  const style = NOTICE_TYPE_STYLES[notice.type];

  return (
    <div
      className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer hover:bg-grey-100 transition-colors"
      onClick={onClick}
    >
      <div className={`w-7 h-7 ${style.iconBgColor} rounded-md flex items-center justify-center`}>
        <NoticeIcon type={notice.type} className={`w-3.5 h-3.5 ${style.textColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm text-grey-900">{notice.title}</span>
        {notice.startTime && (
          <span className="ml-2 text-xs text-grey-500">{notice.startTime}</span>
        )}
      </div>
      <span className={`px-1.5 py-0.5 ${style.badgeBgColor} ${style.badgeTextColor} text-[10px] font-medium rounded`}>
        {style.label}
      </span>
    </div>
  );
}
```

**완료 조건**:
- [ ] 4개 컴포넌트 생성
- [ ] 타입별 스타일 적용
- [ ] 호버/클릭 인터랙션

---

### Phase 4: WeeklyCalendar 통합
**예상 파일**: 2개

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `components/admin/dashboard/WeeklyCalendar.tsx` | 공지 섹션 추가 |
| 2 | `components/admin/dashboard/index.ts` | export 추가 |

**WeeklyCalendar.tsx 수정**:
```typescript
export function WeeklyCalendar({ selectedDate, onDateSelect }: WeeklyCalendarProps) {
  // 기존 코드...

  // 선택된 날짜의 공지 조회
  const { important, general, isLoading: noticesLoading } = useNoticesByImportance(selectedDate);

  return (
    <div className="bg-white rounded-3xl shadow-sm">
      {/* 기존: 캘린더 헤더 + 주간 그리드 */}

      {/* NEW: 중요 알림 섹션 */}
      {important.length > 0 && (
        <ImportantNotices notices={important} />
      )}

      {/* NEW: 일반 공지 섹션 */}
      <GeneralNotices
        notices={general}
        date={selectedDate}
        isEmpty={important.length === 0 && general.length === 0}
      />
    </div>
  );
}
```

**완료 조건**:
- [ ] 캘린더 하단에 공지 표시
- [ ] 중요 알림 → 일반 공지 순서
- [ ] 빈 상태 처리

---

### Phase 5: Mock 데이터 + 테스트
**예상 파일**: 1개

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `frontend/src/hooks/useAdminNotices.ts` | Mock 데이터 추가 (개발용) |

**Mock 데이터** (Supabase 테이블 없을 때):
```typescript
function generateMockNotices(): Notice[] {
  const today = formatDateKey(new Date());
  const tomorrow = formatDateKey(addDays(new Date(), 1));

  return [
    // 중요 알림
    {
      id: '1',
      title: '김영희 선생님 휴강',
      description: '14:00~16:00 고1 수학 심화반',
      date: today,
      type: 'urgent',
      priority: 100,
      visibility: 'all',
      createdAt: new Date().toISOString(),
      isActive: true,
    },
    {
      id: '2',
      title: '크리스마스 휴원',
      description: '12/25 전 수업 휴강',
      date: '2024-12-25',
      type: 'holiday',
      priority: 90,
      visibility: 'all',
      createdAt: new Date().toISOString(),
      isActive: true,
    },
    // 일반 공지
    {
      id: '3',
      title: '12월 레벨테스트',
      description: '중등부 전체',
      date: today,
      startTime: '10:00',
      type: 'exam',
      priority: 50,
      visibility: 'all',
      createdAt: new Date().toISOString(),
      isActive: true,
    },
    // 관리자 전용
    {
      id: '4',
      title: '1월 수강료 정산',
      description: '마감: 12/28',
      date: today,
      type: 'operation',
      priority: 30,
      visibility: 'admin',
      createdAt: new Date().toISOString(),
      isActive: true,
    },
  ];
}
```

**완료 조건**:
- [ ] Mock 데이터로 UI 테스트
- [ ] 권한별 필터링 확인
- [ ] 빌드 성공

---

### Phase 6: 캘린더 날짜 공지 뱃지
**예상 파일**: 1개

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `components/admin/dashboard/CalendarDayCell.tsx` | 공지 뱃지 추가 |

**CalendarDayCell.tsx 수정**:
```typescript
interface CalendarDayCellProps {
  day: WeekDay;
  isSelected: boolean;
  onClick: () => void;
  hasNotice?: boolean;        // NEW
  noticeType?: NoticeType;    // NEW: 가장 우선순위 높은 공지 유형
}

export function CalendarDayCell({
  day,
  isSelected,
  onClick,
  hasNotice,
  noticeType,
}: CalendarDayCellProps) {
  // 공지 뱃지 색상
  const badgeColor = noticeType
    ? NOTICE_TYPE_STYLES[noticeType].textColor.replace('text-', 'bg-')
    : 'bg-grey-400';

  return (
    <div className="..." onClick={onClick}>
      {/* 기존 날짜 표시 */}

      {/* NEW: 공지 뱃지 */}
      {hasNotice && (
        <div className={`absolute top-1 right-1 w-2 h-2 ${badgeColor} rounded-full`} />
      )}
    </div>
  );
}
```

**완료 조건**:
- [ ] 공지 있는 날짜에 뱃지 표시
- [ ] 공지 유형별 색상 적용
- [ ] 선택된 날짜는 흰색 뱃지

---

## 5. 파일 생성 순서 (의존성 기준)

```
1. supabase/migrations/xxx_create_notices_table.sql  (독립)
2. frontend/src/types/admin.ts                       (독립)
3. frontend/src/hooks/useAdminNotices.ts             (types/admin.ts 의존)
4. frontend/src/components/admin/dashboard/NoticeCard.tsx     (types 의존)
5. frontend/src/components/admin/dashboard/NoticeItem.tsx     (types 의존)
6. frontend/src/components/admin/dashboard/ImportantNotices.tsx (NoticeCard 의존)
7. frontend/src/components/admin/dashboard/GeneralNotices.tsx   (NoticeItem 의존)
8. frontend/src/components/admin/dashboard/CalendarDayCell.tsx  (수정)
9. frontend/src/components/admin/dashboard/WeeklyCalendar.tsx   (수정)
10. frontend/src/components/admin/dashboard/index.ts            (export 추가)
```

---

## 6. 테스트 체크리스트

### 기능 테스트
- [ ] 관리자 로그인 시 모든 공지 표시
- [ ] 강사 로그인 시 admin 전용 공지 숨김
- [ ] 날짜 선택 시 해당 날짜 공지 표시
- [ ] 중요 알림 → 일반 공지 순서 확인
- [ ] 공지 없는 날짜 빈 상태 표시

### UI 테스트
- [ ] 공지 유형별 색상 적용
- [ ] 호버/클릭 인터랙션
- [ ] 캘린더 날짜 뱃지 표시
- [ ] 반응형 레이아웃 (2열 → 1열)

### 빌드 테스트
- [ ] TypeScript 에러 없음
- [ ] npm run build 성공

---

## 7. 예상 에러 및 해결책

| 에러 | 원인 | 해결책 |
|------|------|--------|
| `notices 테이블 없음` | 마이그레이션 미적용 | Mock 데이터 fallback 유지 |
| `visibility 필터 안됨` | RLS 정책 누락 | 정책 추가 또는 service_role 사용 |
| `useProfile undefined` | 인증 전 접근 | enabled 조건 추가 |
| `타입 불일치` | Notice 타입 변경 | 기존 코드 마이그레이션 |

---

## 8. 향후 확장

### Phase 7 (선택)
- [ ] 공지 상세 모달
- [ ] 공지 CRUD (관리자용)
- [ ] 읽음/안읽음 상태
- [ ] 푸시 알림 연동

---

*작성일: 2024-12-21*
*참조: 407_admin_pc_hero_notice_ux_research.md*
