# 428 강사 대시보드 중요공지 표시 - 단계별 개발 계획

> Stage 28: 강사 대시보드 중요공지 표시
> 작성일: 2025-12-25
> 참조: [428_teacher_important_notices_feasibility_report.md](./428_teacher_important_notices_feasibility_report.md)

---

## 1. 구현 개요

### 1.1 목표
관리자가 notices 테이블에 등록한 중요공지(긴급/휴원/결석)를 강사 대시보드에 표시

### 1.2 선택된 옵션
**Option C (하이브리드)**: 긴급 배너 + TaskBadgeCard 드롭다운 개선

### 1.3 구현 범위
1. `urgent` 타입 공지 → 히어로 상단 배너
2. `holiday`, `absence` 타입 공지 → TaskBadgeCard 드롭다운 (상단 정렬)
3. 기존 `useAdminNotices` 훅 재사용 (`userRole='teacher'`)

---

## 2. 파일 변경 목록

| 작업 | 파일 경로 | 변경 유형 |
|------|----------|----------|
| Phase 28-A | `frontend/src/pages/BackofficeDemo.tsx` | 수정 |
| Phase 28-B | `frontend/src/components/backoffice/dashboard/UrgentNoticeBanner.tsx` | 신규 |
| Phase 28-B | `frontend/src/components/backoffice/dashboard/index.ts` | 수정 |
| Phase 28-C | `frontend/src/components/backoffice/dashboard/TaskBadgeCard.tsx` | 수정 |
| Phase 28-D | `frontend/src/components/backoffice/tablet/TabletDashboard.tsx` | 수정 |

---

## 3. 타입 정의

### 3.1 기존 타입 (재사용)

```typescript
// frontend/src/types/admin.ts (이미 존재)
export type NoticeType = 'urgent' | 'holiday' | 'absence' | 'exam' | 'special' | 'event' | 'operation';
export const IMPORTANT_NOTICE_TYPES: NoticeType[] = ['urgent', 'holiday', 'absence'];

// frontend/src/hooks/useAdminNotices.ts (이미 존재)
export function useAdminNotices(options: {
  weekRange?: WeekRange;
  enabled?: boolean;
  userRole?: 'admin' | 'teacher';  // ← 이 파라미터 사용
}): Promise<NoticesByDate>
```

### 3.2 UrgentNoticeBanner Props

```typescript
// frontend/src/components/backoffice/dashboard/UrgentNoticeBanner.tsx
interface UrgentNoticeBannerProps {
  notices: Notice[];  // type='urgent'만 필터링된 공지
  onDismiss?: (id: string) => void;
  onClick?: (notice: Notice) => void;
}
```

### 3.3 NoticeItem 확장 (TaskBadgeCard)

```typescript
// frontend/src/components/backoffice/dashboard/TaskBadgeCard.tsx
interface NoticeItem {
  id: string;
  title: string;
  subtitle?: string;
  read: boolean;
  type?: NoticeType;      // 이미 존재 ✓
  priority?: number;       // 추가 필요
  isImportant?: boolean;   // 추가 필요
}
```

---

## 4. Phase 28-A: 데이터 훅 연동

### 4.1 목표
BackofficeDemo에 `useAdminNotices` 훅 추가하여 관리자 공지 조회

### 4.2 수정 파일

**frontend/src/pages/BackofficeDemo.tsx**

#### 4.2.1 Import 추가 (Line ~13)

```typescript
// 기존 import
import {
  useClasses,
  useTodayAttendance,
  // ... 기존 훅들
} from '../hooks/useBackofficeData';

// 추가
import { useAdminNotices } from '../hooks/useAdminNotices';
import type { Notice } from '../types/admin';
import { IMPORTANT_NOTICE_TYPES } from '../types/admin';
```

#### 4.2.2 훅 호출 추가 (Line ~310)

```typescript
// 순환수업 데이터 조회 아래에 추가
const { data: rotationSchedules } = useRotationSchedules();

// ★ Phase 28-A: 관리자 중요공지 조회
// 선택된 날짜 기준으로 조회 (주간 범위)
const weekRange = useMemo(() => {
  const start = new Date(selectedDate);
  start.setDate(start.getDate() - start.getDay()); // 일요일
  const end = new Date(start);
  end.setDate(end.getDate() + 6); // 토요일

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
    weekNumber: 0,
    month: start.getMonth() + 1,
    year: start.getFullYear(),
  };
}, [selectedDate]);

const { data: adminNoticesByDate } = useAdminNotices({
  weekRange,
  userRole: 'teacher',  // 강사 권한으로 조회
});
```

#### 4.2.3 공지 필터링 로직 추가 (Line ~330)

```typescript
// 선택된 날짜의 중요공지 분리
const { urgentNotices, importantNotices } = useMemo(() => {
  const dateNotices = adminNoticesByDate?.[selectedDateStr] || [];

  return {
    // 긴급 공지 (배너용)
    urgentNotices: dateNotices.filter((n) => n.type === 'urgent'),
    // 중요 공지 (휴원, 결석 - TaskBadgeCard용)
    importantNotices: dateNotices.filter((n) =>
      n.type === 'holiday' || n.type === 'absence'
    ),
  };
}, [adminNoticesByDate, selectedDateStr]);
```

### 4.3 테스트 체크리스트
- [ ] `npm run build` 성공
- [ ] 콘솔에 `[useAdminNotices]` 관련 에러 없음
- [ ] `urgentNotices`, `importantNotices` 변수 정상 생성

---

## 5. Phase 28-B: 긴급 알림 배너 컴포넌트

### 5.1 목표
`urgent` 타입 공지를 히어로 캐러셀 상단에 배너로 표시

### 5.2 신규 파일

**frontend/src/components/backoffice/dashboard/UrgentNoticeBanner.tsx**

```typescript
/**
 * UrgentNoticeBanner - 긴급 알림 배너
 *
 * Stage 28: 강사 대시보드 중요공지 표시
 * - 관리자가 등록한 urgent 타입 공지를 배너로 표시
 * - 로컬 dismiss 상태 관리 (하루 동안 숨김)
 */
import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { Notice } from '../../../types/admin';

interface UrgentNoticeBannerProps {
  /** urgent 타입 공지 목록 */
  notices: Notice[];
  /** 공지 클릭 시 콜백 */
  onClick?: (notice: Notice) => void;
}

/**
 * 오늘 dismiss된 공지 ID 목록 (localStorage)
 */
function getDismissedIds(): Set<string> {
  const today = new Date().toISOString().split('T')[0];
  const stored = localStorage.getItem('urgentNoticeDismissed');
  if (!stored) return new Set();

  try {
    const parsed = JSON.parse(stored);
    if (parsed.date !== today) {
      // 날짜가 다르면 초기화
      localStorage.removeItem('urgentNoticeDismissed');
      return new Set();
    }
    return new Set(parsed.ids || []);
  } catch {
    return new Set();
  }
}

function setDismissedId(id: string) {
  const today = new Date().toISOString().split('T')[0];
  const dismissed = getDismissedIds();
  dismissed.add(id);
  localStorage.setItem('urgentNoticeDismissed', JSON.stringify({
    date: today,
    ids: Array.from(dismissed),
  }));
}

export function UrgentNoticeBanner({ notices, onClick }: UrgentNoticeBannerProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // 초기 로드 시 localStorage에서 dismiss 상태 복원
  useEffect(() => {
    setDismissedIds(getDismissedIds());
  }, []);

  // dismiss되지 않은 공지만 필터링
  const visibleNotices = notices.filter((n) => !dismissedIds.has(n.id));

  if (visibleNotices.length === 0) {
    return null;
  }

  const handleDismiss = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDismissedId(id);
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  return (
    <div className="space-y-2 mb-4">
      {visibleNotices.map((notice) => (
        <div
          key={notice.id}
          onClick={() => onClick?.(notice)}
          className="relative bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 rounded-2xl p-4 cursor-pointer hover:shadow-sm transition-shadow"
        >
          {/* 닫기 버튼 */}
          <button
            onClick={(e) => handleDismiss(e, notice.id)}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-red-100 transition-colors"
            aria-label="닫기"
          >
            <X className="w-4 h-4 text-red-400" />
          </button>

          {/* 내용 */}
          <div className="flex items-start gap-3 pr-6">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  긴급
                </span>
                <span className="text-[13px] font-semibold text-gray-900 truncate">
                  {notice.title}
                </span>
              </div>
              {notice.description && (
                <p className="text-[12px] text-gray-600 mt-1 line-clamp-2">
                  {notice.description}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default UrgentNoticeBanner;
```

### 5.3 index.ts 수정

**frontend/src/components/backoffice/dashboard/index.ts**

```typescript
// 기존 export
export { HeroCarousel } from './HeroCarousel';
export { DateSelector } from './DateSelector';
export { TaskBadgeCard } from './TaskBadgeCard';
export { NoClassHeroCard } from './NoClassHeroCard';

// 추가
export { UrgentNoticeBanner } from './UrgentNoticeBanner';
```

### 5.4 BackofficeDemo에 배너 렌더링

**frontend/src/pages/BackofficeDemo.tsx** (Line ~962)

```typescript
{/* 2. 긴급 알림 배너 (urgent 공지) - Phase 28-B */}
{urgentNotices.length > 0 && (
  <UrgentNoticeBanner
    notices={urgentNotices}
    onClick={(notice) => console.log('긴급 공지 클릭:', notice.id)}
  />
)}

{/* 3. 히어로 카드 (기존 HeroCarousel) */}
{classesLoading ? (
  // ... 기존 코드
```

### 5.5 테스트 체크리스트
- [ ] `npm run build` 성공
- [ ] 브라우저에서 긴급 공지 배너 표시 확인
- [ ] X 버튼 클릭 시 배너 숨김 확인
- [ ] 새로고침 후에도 오늘 숨긴 배너 유지 확인
- [ ] 다음 날 다시 표시 확인 (날짜 변경 테스트)

---

## 6. Phase 28-C: TaskBadgeCard 개선

### 6.1 목표
`holiday`, `absence` 타입 공지를 드롭다운 상단에 정렬 + priority 기반 정렬

### 6.2 수정 파일

**frontend/src/components/backoffice/dashboard/TaskBadgeCard.tsx**

#### 6.2.1 NoticeItem 타입 확장 (Line ~22)

```typescript
interface NoticeItem {
  id: string;
  title: string;
  subtitle?: string;
  read: boolean;
  /** 공지 유형 (옵션) - 중요 공지 강조용 */
  type?: NoticeType;
  /** 정렬 우선순위 (높을수록 상단) */
  priority?: number;       // 추가
  /** 중요 공지 여부 */
  isImportant?: boolean;   // 추가
}
```

#### 6.2.2 정렬 로직 개선 (NoticeDropdown, Line ~280)

```typescript
function NoticeDropdown({
  items,
  onRead,
}: {
  items: NoticeItem[];
  onRead?: (id: string) => void;
}) {
  const config = BADGE_CONFIG.notice;

  // 정렬 우선순위:
  // 1. 중요 공지 (urgent > holiday > absence) 먼저
  // 2. 같은 중요도 내에서 priority 내림차순
  // 3. 나머지는 그대로
  const sortedItems = [...items].sort((a, b) => {
    const aType = a.type || '';
    const bType = b.type || '';

    // 중요 공지 타입 우선순위
    const typeOrder: Record<string, number> = {
      urgent: 0,
      holiday: 1,
      absence: 2,
    };

    const aOrder = typeOrder[aType] ?? 100;
    const bOrder = typeOrder[bType] ?? 100;

    // 1차: 타입 순서
    if (aOrder !== bOrder) return aOrder - bOrder;

    // 2차: priority 내림차순
    const aPriority = a.priority ?? 0;
    const bPriority = b.priority ?? 0;
    return bPriority - aPriority;
  });

  // ... 이하 기존 렌더링 코드
}
```

### 6.3 BackofficeDemo 공지 데이터 병합

**frontend/src/pages/BackofficeDemo.tsx** (realNotices useMemo 수정)

```typescript
// 공지사항 변환 - notices 테이블 + 관리자 중요공지 병합
const realNotices = useMemo(() => {
  // 1. 기존 공지 (notices 테이블 - 선택된 날짜 기준)
  const baseNotices = noticesData?.map((notice) => ({
    id: notice.id,
    title: notice.title || '',
    subtitle: notice.type === 'urgent' ? '긴급' :
              notice.type === 'absence' ? '결석' :
              notice.type === 'holiday' ? '휴원' :
              notice.type === 'exam' ? '시험' :
              notice.type || '',
    read: false,
    type: notice.type as NoticeType | undefined,
    priority: notice.priority || 0,
    isImportant: notice.is_important || false,
  })) || [];

  // 2. 관리자 중요공지 병합 (holiday, absence만)
  // urgent는 배너로 이미 표시하므로 제외
  const adminImportant = importantNotices.map((notice) => ({
    id: `admin-${notice.id}`,  // 중복 방지
    title: notice.title,
    subtitle: notice.type === 'holiday' ? '휴원' :
              notice.type === 'absence' ? '결석' : '',
    read: false,
    type: notice.type,
    priority: notice.priority,
    isImportant: notice.isImportant,
  }));

  // 3. 병합 (중복 제거는 id로)
  const merged = [...adminImportant, ...baseNotices];

  if (merged.length === 0) return null;
  return merged;
}, [noticesData, importantNotices]);
```

### 6.4 테스트 체크리스트
- [ ] `npm run build` 성공
- [ ] TaskBadgeCard 드롭다운에서 휴원/결석 공지 상단 표시 확인
- [ ] priority 높은 공지가 먼저 표시되는지 확인
- [ ] 빨간/주황 점 색상 정상 적용 확인

---

## 7. Phase 28-D: 태블릿 대시보드 적용

### 7.1 목표
TabletDashboard에도 긴급 알림 배너 적용

### 7.2 수정 파일

**frontend/src/components/backoffice/tablet/TabletDashboard.tsx**

#### 7.2.1 Props 확장

```typescript
interface TabletDashboardProps {
  // 기존 props...

  /** 긴급 공지 목록 (Phase 28-D) */
  urgentNotices?: Notice[];
}
```

#### 7.2.2 배너 렌더링 추가

```typescript
// WeekCalendarGrid 상단에 배너 추가
<div className="flex-1 overflow-auto p-4">
  {/* 긴급 알림 배너 - Phase 28-D */}
  {urgentNotices && urgentNotices.length > 0 && (
    <UrgentNoticeBanner
      notices={urgentNotices}
      onClick={(notice) => console.log('긴급 공지 클릭:', notice.id)}
    />
  )}

  {/* 기존 WeekCalendarGrid */}
  <WeekCalendarGrid ... />
</div>
```

### 7.3 BackofficeDemo에서 props 전달

```typescript
<TabletDashboard
  // 기존 props...
  urgentNotices={urgentNotices}  // Phase 28-D 추가
/>
```

### 7.4 테스트 체크리스트
- [ ] `npm run build` 성공
- [ ] 태블릿 뷰에서 긴급 배너 표시 확인
- [ ] 모바일/태블릿 전환 시 배너 정상 작동 확인

---

## 8. Phase 28-E: 통합 테스트

### 8.1 테스트 시나리오

| # | 시나리오 | 예상 결과 |
|---|----------|----------|
| 1 | 긴급 공지 없는 경우 | 배너 미표시, TaskBadgeCard만 표시 |
| 2 | 긴급 공지 1개 | 배너 1개 표시 |
| 3 | 긴급 공지 3개 | 배너 3개 스택 표시 |
| 4 | 휴원/결석 공지 | TaskBadgeCard 드롭다운 상단 표시 |
| 5 | 배너 X 클릭 | 해당 배너 숨김 (localStorage 저장) |
| 6 | 새로고침 | 오늘 숨긴 배너 유지 |
| 7 | 날짜 변경 | 다른 날짜의 공지 표시 |
| 8 | 태블릿 전환 | 배너 정상 표시 |

### 8.2 빌드 & 배포 체크리스트
- [ ] `npm run build` 성공
- [ ] TypeScript 에러 없음
- [ ] ESLint 경고 없음
- [ ] 실제 Supabase 데이터로 테스트
- [ ] 반응형 레이아웃 확인

---

## 9. 예상 에러 및 해결

### 9.1 타입 에러

| 에러 | 원인 | 해결 |
|------|------|------|
| `Notice` 타입 not found | import 누락 | `import type { Notice } from '@/types/admin'` 추가 |
| `priority` undefined | NoticeItem에 priority 없음 | 타입 확장 후 optional chaining 사용 |
| `weekRange` 타입 불일치 | WeekRange import 누락 | `import type { WeekRange } from '@/types/admin'` 추가 |

### 9.2 런타임 에러

| 에러 | 원인 | 해결 |
|------|------|------|
| localStorage 접근 실패 | SSR 환경 | `typeof window !== 'undefined'` 체크 추가 |
| 공지 중복 표시 | admin + notices 병합 이슈 | id prefix로 구분 (`admin-{id}`) |

---

## 10. 개발 순서 요약

```
Phase 28-A: 데이터 훅 연동 (20분)
    └─ BackofficeDemo에 useAdminNotices 추가
    └─ urgentNotices, importantNotices 분리

Phase 28-B: 긴급 알림 배너 (40분)
    └─ UrgentNoticeBanner.tsx 생성
    └─ localStorage dismiss 로직
    └─ BackofficeDemo에 배너 렌더링

Phase 28-C: TaskBadgeCard 개선 (30분)
    └─ NoticeItem 타입 확장
    └─ 정렬 로직 개선 (type + priority)
    └─ realNotices 병합 로직

Phase 28-D: 태블릿 적용 (20분)
    └─ TabletDashboard props 확장
    └─ 배너 렌더링 추가

Phase 28-E: 통합 테스트 (20분)
    └─ 시나리오별 테스트
    └─ 빌드 확인
```

**총 예상 소요 시간: 2시간 30분**

---

*v1.0 - 2025-12-25*
