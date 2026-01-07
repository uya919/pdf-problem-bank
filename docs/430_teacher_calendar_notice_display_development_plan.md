# 430 강사 캘린더 중요공지 표시 개선 - 단계별 개발 계획

> Stage 28 (수정): 강사 캘린더 중요공지 반응형 표시
> 작성일: 2025-12-25
> 목적: 강사용 캘린더에 중요공지를 반응형으로 표시

---

## 1. 요구사항 정리

### 1.1 현재 상태

| 컴포넌트 | 현재 표시 방식 |
|----------|---------------|
| DateSelector (모바일) | 공지 점 최대 2개 |
| MonthlyCalendarModal (모바일) | 공지 점 최대 3개 |
| WeekCalendarGrid (태블릿) | 공지 점 최대 3개 + 클릭 시 툴팁 |

### 1.2 목표 상태

| 플랫폼 | 표시 방식 |
|--------|----------|
| **모바일** | 중요공지 점(dot) 표시 (현재와 유사) |
| **태블릿/PC** | 공지 제목 한 줄 표시, 최대 2개 + 나머지 `+N` |

### 1.3 중요공지 기준

```typescript
// types/admin.ts (이미 정의됨)
IMPORTANT_NOTICE_TYPES = ['urgent', 'holiday', 'absence']
```

- `urgent`: 긴급 (빨강)
- `holiday`: 휴원 (주황)
- `absence`: 결석 (빨강)

---

## 2. 파일 변경 목록

| Phase | 파일 | 변경 유형 |
|-------|------|----------|
| 28-A | `frontend/src/components/backoffice/tablet/WeekCalendarGrid.tsx` | 수정 |
| 28-B | `frontend/src/components/backoffice/modals/MonthlyCalendarModal.tsx` | 수정 |
| 28-C | `frontend/src/components/backoffice/dashboard/DateSelector.tsx` | 수정 (선택) |

---

## 3. UI 설계

### 3.1 태블릿/PC - 날짜 셀 내 공지 표시

```
┌─────────────────┐
│      월         │  ← 요일
│      25         │  ← 날짜
│ ─────────────── │
│ 🔴 12/25 휴강   │  ← 공지 1 (한 줄, 말줄임)
│ 🟠 김민수 결석   │  ← 공지 2
│     +2          │  ← 나머지 개수 (3개 이상일 때)
└─────────────────┘
```

**스타일:**
- 공지 텍스트: `text-[11px]`, 한 줄 (`truncate`)
- 유형별 점 색상: urgent=빨강, holiday=주황, absence=빨강
- `+N` 표시: `text-[10px] text-gray-400`

### 3.2 모바일 - 점 표시 (현재 유지)

```
┌─────┐
│ 25  │
│ ●●  │  ← 중요공지 점 (최대 2개)
└─────┘
```

---

## 4. Phase 28-A: WeekCalendarGrid 개선 (태블릿)

### 4.1 목표
태블릿 주간 캘린더에서 공지 제목을 한 줄로 표시

### 4.2 수정 내용

**frontend/src/components/backoffice/tablet/WeekCalendarGrid.tsx**

#### 4.2.1 중요공지 필터링 함수 추가

```typescript
import { IMPORTANT_NOTICE_TYPES, NOTICE_TYPE_STYLES } from '../../../types/admin';
import type { Notice as AdminNotice } from '../../../types/admin';

/** 중요공지만 필터링 */
function filterImportantNotices(notices: Notice[]): Notice[] {
  return notices.filter((n) => {
    if ('type' in n && typeof n.type === 'string') {
      return IMPORTANT_NOTICE_TYPES.includes(n.type as any);
    }
    return false;
  });
}

/** 공지 유형별 점 색상 */
function getNoticeDotColor(notice: Notice): string {
  if ('type' in notice) {
    const type = notice.type as string;
    if (type === 'urgent' || type === 'absence') return 'bg-red-500';
    if (type === 'holiday') return 'bg-orange-500';
  }
  return 'bg-blue-500';
}
```

#### 4.2.2 날짜 셀 렌더링 수정 (Line ~200)

기존:
```tsx
{/* 공지 점 */}
<div className="flex justify-center gap-[3px] min-h-[8px]">
  {hasNotices &&
    notices.slice(0, 3).map((_, i) => (
      <span key={i} className="w-[6px] h-[6px] rounded-full bg-[#3182F6]" />
    ))}
</div>
```

변경:
```tsx
{/* 중요공지 텍스트 표시 (태블릿/PC) */}
{hasNotices && (
  <div className="mt-1 space-y-0.5 w-full px-1">
    {notices.slice(0, 2).map((notice, i) => (
      <div key={i} className="flex items-center gap-1">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getNoticeDotColor(notice)}`} />
        <span className="text-[10px] text-gray-600 truncate">
          {notice.title}
        </span>
      </div>
    ))}
    {notices.length > 2 && (
      <div className="text-[10px] text-gray-400 text-center">
        +{notices.length - 2}
      </div>
    )}
  </div>
)}
```

#### 4.2.3 셀 높이 조정

```tsx
// 기존
className={`w-full min-h-[72px] p-2 ...`}

// 변경 (높이 증가)
className={`w-full min-h-[100px] p-2 ...`}
```

### 4.3 테스트 체크리스트
- [ ] `npm run build` 성공
- [ ] 태블릿에서 공지 제목 한 줄 표시 확인
- [ ] 3개 이상 공지 시 `+N` 표시 확인
- [ ] 유형별 점 색상 확인 (urgent=빨강, holiday=주황)
- [ ] 긴 제목 말줄임(...) 확인

---

## 5. Phase 28-B: MonthlyCalendarModal 개선 (모바일 월간)

### 5.1 목표
월간 캘린더에서도 반응형 적용 (모바일=점, 태블릿/PC=텍스트)

### 5.2 수정 내용

**frontend/src/components/backoffice/modals/MonthlyCalendarModal.tsx**

#### 5.2.1 반응형 훅 추가

```typescript
import { useIsTablet } from '../../../hooks/useIsMobile';

// 컴포넌트 내부
const isTablet = useIsTablet();
```

#### 5.2.2 날짜 셀 조건부 렌더링

```tsx
{isCurrentMonth && (
  <div className="flex flex-col items-center gap-0.5 mt-0.5 min-h-[16px]">
    {hasNotices ? (
      isTablet ? (
        // 태블릿: 텍스트 표시
        <>
          {notices.slice(0, 1).map((notice, i) => (
            <span key={i} className="text-[9px] text-gray-500 truncate max-w-full px-0.5">
              {notice.title.slice(0, 6)}...
            </span>
          ))}
          {notices.length > 1 && (
            <span className="text-[8px] text-gray-400">+{notices.length - 1}</span>
          )}
        </>
      ) : (
        // 모바일: 점 표시
        <div className="flex gap-0.5">
          {notices.slice(0, 2).map((_, i) => (
            <div
              key={i}
              className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-orange-400'}`}
            />
          ))}
        </div>
      )
    ) : hasClassOnDay ? (
      <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-[#3182F6]'}`} />
    ) : null}
  </div>
)}
```

### 5.3 테스트 체크리스트
- [ ] 모바일에서 점 표시 유지
- [ ] 태블릿에서 공지 제목 일부 표시
- [ ] `+N` 표시 확인

---

## 6. Phase 28-C: DateSelector 개선 (모바일 주간)

### 6.1 목표
모바일 주간 드롭다운에서 중요공지만 점 표시 (선택적)

### 6.2 수정 내용 (선택)

현재 DateSelector는 이미 공지 점을 표시하고 있음. 중요공지만 필터링하려면:

```typescript
// 중요공지만 필터링
const importantNotices = getNoticesForDate(date).filter((n) => {
  if ('type' in n && typeof n.type === 'string') {
    return ['urgent', 'holiday', 'absence'].includes(n.type);
  }
  return false;
});
```

### 6.3 테스트 체크리스트
- [ ] 중요공지만 점 표시 확인
- [ ] 일반 공지(시험, 특강 등)는 점 미표시 확인

---

## 7. 데이터 흐름

```
Supabase notices 테이블
        ↓
useAdminNotices({ userRole: 'teacher' })
        ↓
BackofficeDemo.tsx
    ├── noticesByDate → DateSelector
    ├── noticesByDate → MonthlyCalendarModal
    └── noticesByDate → TabletDashboard → WeekCalendarGrid
```

**참고**: `useAdminNotices`는 이미 `visibility IN ('all', 'teacher')` 필터링 적용됨

---

## 8. 타입 호환성

### 8.1 Notice 타입 (이미 정의됨)

```typescript
// types/admin.ts
interface Notice {
  id: string;
  title: string;
  description?: string;
  date: string;
  type: NoticeType;  // 'urgent' | 'holiday' | 'absence' | ...
  priority: number;
  // ...
}
```

### 8.2 SimpleNotice 타입 (호환용)

```typescript
// 기존 컴포넌트에서 사용
interface SimpleNotice {
  id: string;
  title: string;
  description?: string;
  time?: string;
}
```

**해결**: `'type' in notice` 체크로 AdminNotice인지 확인

---

## 9. 예상 에러 및 해결

| 에러 | 원인 | 해결 |
|------|------|------|
| `NOTICE_TYPE_STYLES` not found | import 누락 | `import { NOTICE_TYPE_STYLES } from '@/types/admin'` |
| `useIsTablet` not found | 훅 경로 오류 | `import { useIsTablet } from '@/hooks/useIsMobile'` |
| 셀 높이 부족 | 텍스트 추가로 공간 부족 | `min-h-[100px]` 이상으로 조정 |

---

## 10. 개발 순서 요약

```
Phase 28-A: WeekCalendarGrid 개선 (30분)
    └─ 공지 텍스트 표시 (최대 2개 + +N)
    └─ 유형별 점 색상
    └─ 셀 높이 조정

Phase 28-B: MonthlyCalendarModal 반응형 (20분)
    └─ useIsTablet 훅 추가
    └─ 조건부 렌더링 (모바일=점, 태블릿=텍스트)

Phase 28-C: DateSelector 중요공지 필터 (10분, 선택)
    └─ 중요공지만 점 표시
```

**총 예상 소요 시간: 1시간**

---

## 11. 기존 428/429 문서와의 관계

| 문서 | 내용 | 상태 |
|------|------|------|
| 428 | 대시보드 상단 배너 + TaskBadgeCard | 보류 (다른 기능) |
| 429 | 428 개발 계획 | 보류 |
| **430** | **캘린더 셀 내 공지 표시 개선** | **현재 작업** |

430 완료 후 필요시 428/429 작업 진행 가능

---

*v1.0 - 2025-12-25*
