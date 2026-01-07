# Phase 2: Dashboard Supabase 연동 완료 보고서

> 작성일: 2025-12-12
> 목표: Dashboard 페이지에 hyeyum Supabase 실제 데이터 연동

---

## 완료 사항

### 1. 데이터 훅 연결

**파일**: `frontend/src/pages/BackofficeDemo.tsx`

```typescript
// Supabase 실제 데이터 훅 (hyeyum 연동)
const { data: classesData, isLoading: classesLoading } = useClasses({ status: 'active' });
const { data: todayAttendanceData } = useTodayAttendance();
const { data: announcementsData } = useAnnouncements(5);
const { data: dashboardStats } = useDashboardStats();
```

### 2. 실제 데이터 → UI 변환

**수업 스케줄 변환**:
```typescript
const realClassSchedules = useMemo(() => {
  // 오늘 요일 필터링
  // 수업 상태 (completed/current/upcoming) 결정
  // UI 형식으로 변환
}, [classesData]);
```

**공지사항 변환**:
```typescript
const realNotices = useMemo(() => {
  return announcementsData.map((ann) => ({
    id: ann.id,
    title: ann.content.slice(0, 50),
    subtitle: ann.category,
    read: false,
  }));
}, [announcementsData]);
```

### 3. UI 개선

**연결 상태 표시**:
- `🟢 hyeyum 연결됨` - Supabase 설정 완료
- `🔴 Mock 데이터` - 설정 미완료

**대시보드 통계**:
- 헤더에 "학생 N명 · 반 N개" 표시

**로딩 상태**:
- 수업 데이터 로딩 시 스켈레톤 UI 표시

### 4. Fallback 로직

```typescript
// 실제 데이터가 있으면 사용, 없으면 mock 데이터
<HeroCarousel
  classes={realClassSchedules || mockClassSchedules}
  // ...
/>
```

---

## 타입 수정

### 문제 1: Database 타입과 Mutation 불일치

**해결**: `any` 타입 캐스팅으로 우회
```typescript
// useBackofficeData.ts
const { data, error } = await (supabase as any)
  .from('attendance')
  .upsert(records, { ... });
```

### 문제 2: Progress 스키마 불일치

**기존**: `start_page`, `end_page` (number)
**hyeyum**: `pages` (string, 예: "p.42-45")

**해결**: `useBackoffice.ts` 수정
```typescript
const saveProgress = async (data: {
  // ...
  pages: string;  // hyeyum 스키마
  // ...
}) => { ... };
```

---

## 테스트 방법

1. 개발 서버 시작:
   ```bash
   # 백엔드
   cd backend && python -m uvicorn app.main:app --reload --port 8000

   # 프론트엔드
   cd frontend && npm run dev -- --port 3000
   ```

2. 브라우저 접속: http://localhost:3000/backoffice

3. 확인 항목:
   - 헤더에 "🟢 hyeyum 연결됨" 표시
   - 학생/반 수 통계 표시
   - 오늘 요일 수업만 히어로 카드에 표시
   - 공지사항 실제 데이터 표시

---

## 구현 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `BackofficeDemo.tsx` | 훅 연결, UI 연결 상태, 실제 데이터 사용 |
| `useBackofficeData.ts` | 타입 수정 (attendance, dashboardStats) |
| `useBackoffice.ts` | Progress 스키마 hyeyum 호환 |

---

## 다음 단계 (Phase 3-6)

1. **Classes 페이지**: 반 목록 + 학생 CRUD
2. **Students 페이지**: 학생 목록 + 상세 정보
3. **Records 페이지**: 출결/진도/숙제/성적 4탭

---

*작성: Claude Code | Phase 2 완료*
