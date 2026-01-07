# 혜윰 백오피스 대시보드 연구 리포트

**작성일**: 2025-12-10
**목적**: PDF 프로젝트의 UI/UX 철학과 모듈화 원칙을 적용한 혜윰 백오피스 개선 방안

---

## 1. 현재 상태 분석

### 1.1 hyeyum (v1) 분석

| 항목 | 현황 | 비고 |
|------|------|------|
| **기술 스택** | Next.js 15 + Emotion + Radix UI | 토스 디자인 시스템 |
| **상태관리** | React Query + Context API | 서버 상태 분리 |
| **코드 규모** | ~80+ 파일 | 일부 1,000줄 초과 |
| **특징** | 기능 완성도 높음 | 복잡도 증가 |

**문제점**:
- `timetable-studio-v2/page.tsx` (1,400줄) - 거대 컴포넌트
- `ProgressModal.tsx` (1,365줄) - 단일 파일에 과다 로직
- 역할별 대시보드 분리 미흡 (원장/강사 혼재)

### 1.2 hyeyum-v2 분석

| 항목 | 현황 | 비고 |
|------|------|------|
| **기술 스택** | Next.js 15 + Tailwind CSS | 제로베이스 리팩토링 |
| **상태관리** | Zustand + React Query | 클라이언트/서버 분리 |
| **코드 규모** | ~40+ 파일 | 300줄 이하 유지 |
| **특징** | 역할별 명확한 분리 | `/admin`, `/teacher` |

**장점**:
- 원장 대시보드 (`/admin/page.tsx`) - 317줄, 적정 규모
- 강사 대시보드 (`/teacher/page.tsx`) - 193줄, 간결
- 모듈화된 훅 (`useClasses`, `useProgress` 등)

---

## 2. PDF 프로젝트와 비교

### 2.1 PDF 프로젝트의 강점

```
pdf/
├── backend/
│   ├── app/
│   │   ├── routers/      # API 라우터 (기능별 분리)
│   │   ├── services/     # 비즈니스 로직 (sync_manager 등)
│   │   └── utils/        # 유틸리티 (파일당 단일 책임)
│   │
├── frontend/
│   ├── api/              # API 클라이언트 (단일 진입점)
│   ├── hooks/            # React Query 훅 (CRUD 패턴)
│   ├── pages/            # 페이지 컴포넌트
│   └── stores/           # Zustand 스토어
```

| 원칙 | PDF 프로젝트 | 혜윰 v1 | 혜윰 v2 |
|------|-------------|---------|---------|
| **파일 크기** | 300줄 권장 | 1,400줄 파일 존재 | 300줄 이하 유지 ✅ |
| **단일 책임** | 명확한 분리 | 혼재 | 개선됨 ✅ |
| **SSOT** | groups.json / session.links | Supabase 직접 | Supabase 직접 |
| **캐시 무효화** | 명시적 invalidate | 자동 | 명시적 ✅ |

### 2.2 적용 가능한 패턴

**1. Todo 추적 시스템 (PDF의 TodoWrite)**
```typescript
// PDF의 TodoWrite처럼 작업 상태 추적
// 학원에서는: 오늘 해야 할 일 추적
export function useTodayTasks() {
  return useQuery({
    queryKey: ['todayTasks', format(new Date(), 'yyyy-MM-dd')],
    queryFn: fetchTodayTasks,
  })
}
```

**2. 연쇄 삭제 (PDF의 Phase 68)**
```typescript
// 학생 삭제 시 연관 데이터도 정리
// - 수강 정보 삭제
// - 출결 기록 보관 처리
// - 진도/숙제 아카이브
export function useCascadeDeleteStudent() {
  return useMutation({
    mutationFn: cascadeDeleteStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      queryClient.invalidateQueries({ queryKey: ['enrollments'] })
    }
  })
}
```

---

## 3. 대시보드 설계안

### 3.1 원장 대시보드 (Admin)

```
┌────────────────────────────────────────────────┐
│  🏫 원장 대시보드                    설정 ⚙️   │
├────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────┐  │
│  │   < 12월    2025     >                   │  │
│  │   일  월  화  수  목  금  토             │  │
│  │        1   2   3   4   5   6            │  │
│  │    7   8   9  [10] 11  12  13           │  │
│  │   14  15  16  17  18  19  20            │  │
│  └──────────────────────────────────────────┘  │
├────────────────────────────────────────────────┤
│  📊 오늘의 현황                                │
│  ┌─────────┬─────────┬─────────┬─────────┐   │
│  │ 전체수업 │ 진도완료 │ 미출석  │ 상담예정 │   │
│  │   12    │   8/12  │   3명   │   2건   │   │
│  └─────────┴─────────┴─────────┴─────────┘   │
├────────────────────────────────────────────────┤
│  🚨 주의 필요 (2건)                      더보기 │
│  ┌──────────────────────────────────────────┐  │
│  │ ⚠️ 중3A반 진도 미입력 (14:00)            │  │
│  │ ⚠️ 김철수 3일 연속 결석                  │  │
│  └──────────────────────────────────────────┘  │
├────────────────────────────────────────────────┤
│  📅 시간표                              전체 > │
│  ┌──────────────────────────────────────────┐  │
│  │ 14:00 ────────────────────────────────── │  │
│  │ │ 중3A 수학 ✅    │ 중2B 영어 ⏳     │  │
│  │ │ 진도: p.42~48   │ 진도 미입력      │  │
│  │ └────────────────────────────────────── │  │
│  │ 15:00 ────────────────────────────────── │  │
│  │ │ 고1 국어 📝     │                    │  │
│  │ │ 출결: 8/10      │                    │  │
│  └──────────────────────────────────────────┘  │
├────────────────────────────────────────────────┤
│  [수업] [학생] [출결] [통계] [더보기]          │
└────────────────────────────────────────────────┘
```

**핵심 위젯**:
1. **캘린더**: 주간/월간 토글, 날짜별 일정 표시
2. **오늘의 현황**: 전체 수업 수, 진도 완료율, 미출석, 상담
3. **주의 필요**: 진도 미입력, 연속 결석, 숙제 미제출 등
4. **시간표 타임라인**: 시간대별 수업 목록 + 상태

### 3.2 강사 대시보드 (Teacher)

```
┌────────────────────────────────────────────────┐
│  📚 내 수업                          프로필 👤 │
├────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────┐  │
│  │   < 12월 10일 (화) >                     │  │
│  │   [일] [월] [화] [수] [목] [금] [토]     │  │
│  └──────────────────────────────────────────┘  │
├────────────────────────────────────────────────┤
│  오늘 수업 3개                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  📕 중3A 수학  14:00~15:30              │  │
│  │  ┌────────┬────────┬────────┐           │  │
│  │  │ 진도   │ 숙제   │ 출결   │           │  │
│  │  │  ✅    │  ⏳    │  ✅    │           │  │
│  │  └────────┴────────┴────────┘           │  │
│  │  지난 진도: 이차방정식 기본 (p.38~41)    │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │  📗 중2B 영어  16:00~17:30              │  │
│  │  ┌────────┬────────┬────────┐           │  │
│  │  │ 진도   │ 숙제   │ 출결   │           │  │
│  │  │  ⏳    │  ⏳    │  ⏳    │           │  │
│  │  └────────┴────────┴────────┘           │  │
│  │  지난 진도: Unit 5 Reading (p.72~75)    │  │
│  └──────────────────────────────────────────┘  │
├────────────────────────────────────────────────┤
│  [오늘수업] [학생] [진도] [숙제] [더보기]      │
└────────────────────────────────────────────────┘
```

**핵심 기능**:
1. **빠른 진도 입력**: 3-tap으로 진도 기록 완료
2. **숙제 배부**: 학생 자동 선택 + 마감일 설정
3. **출결 체크**: 스와이프 기반 빠른 체크
4. **지난 수업 참조**: 연속성 있는 수업 진행

---

## 4. 모듈화 설계

### 4.1 폴더 구조 (추천)

```
hyeyum-v2/
├── src/
│   ├── app/
│   │   ├── (auth)/              # 인증 (로그인, 비밀번호)
│   │   ├── admin/               # 원장 전용
│   │   │   ├── page.tsx         # 대시보드 (300줄 이하)
│   │   │   ├── students/
│   │   │   ├── classes/
│   │   │   └── settings/
│   │   ├── teacher/             # 강사 전용
│   │   │   ├── page.tsx         # 대시보드
│   │   │   ├── my-classes/
│   │   │   └── students/
│   │   └── shared/              # 공통 페이지 (프로필 등)
│   │
│   ├── components/
│   │   ├── ui/                  # 기본 UI (Button, Input, Card)
│   │   ├── layout/              # 레이아웃 (Header, Nav, PageContainer)
│   │   ├── dashboard/           # 대시보드 위젯
│   │   │   ├── StatCard.tsx
│   │   │   ├── AlertList.tsx
│   │   │   ├── TimelineSection.tsx
│   │   │   └── index.ts
│   │   ├── calendar/            # 캘린더 컴포넌트
│   │   └── modals/              # 공통 모달
│   │
│   ├── hooks/
│   │   ├── queries/             # React Query 훅
│   │   │   ├── useClasses.ts
│   │   │   ├── useStudents.ts
│   │   │   ├── useProgress.ts
│   │   │   └── useAttendance.ts
│   │   ├── mutations/           # 뮤테이션 훅
│   │   │   ├── useSaveProgress.ts
│   │   │   └── useSaveAttendance.ts
│   │   └── index.ts             # Re-export
│   │
│   ├── stores/                  # Zustand 스토어
│   │   ├── authStore.ts
│   │   └── uiStore.ts
│   │
│   ├── lib/
│   │   ├── supabase/            # Supabase 클라이언트
│   │   └── utils/               # 유틸리티 (날짜, 포맷 등)
│   │
│   └── types/                   # TypeScript 타입
```

### 4.2 훅 패턴 (PDF 스타일)

```typescript
// hooks/queries/useClasses.ts
export function useClasses(filters?: ClassFilters) {
  return useQuery({
    queryKey: ['classes', filters],
    queryFn: () => fetchClasses(filters),
    staleTime: 5 * 60 * 1000,  // 5분
  })
}

export function useClassesByTeacher(teacherId: string, date: Date) {
  const dayOfWeek = date.getDay()
  return useQuery({
    queryKey: ['classes', 'teacher', teacherId, dayOfWeek],
    queryFn: () => fetchClassesByTeacher(teacherId, dayOfWeek),
    enabled: !!teacherId,
  })
}
```

```typescript
// hooks/mutations/useSaveProgress.ts
export function useSaveProgress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: saveProgress,
    onSuccess: (_, variables) => {
      // PDF 스타일: 명시적 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: ['progress', variables.classId]
      })
      queryClient.invalidateQueries({
        queryKey: ['classes', 'teacher']
      })
      // 대시보드 통계도 갱신
      queryClient.invalidateQueries({
        queryKey: ['dashboard', 'stats']
      })
    },
  })
}
```

### 4.3 컴포넌트 분리 기준

| 규모 | 행동 | 예시 |
|------|------|------|
| **50줄 이하** | 유지 | `StatCard.tsx` |
| **50~150줄** | 모니터링 | `ClassCard.tsx` |
| **150~300줄** | 분리 고려 | `TimelineSection.tsx` → 내부 컴포넌트 분리 |
| **300줄 초과** | 반드시 분리 | 페이지 → 섹션 컴포넌트로 분리 |

---

## 5. 구현 우선순위

### Phase 1: 기반 (1주)
- [ ] 폴더 구조 정리 (`/admin`, `/teacher` 분리)
- [ ] 공통 훅 정리 (`hooks/queries/`, `hooks/mutations/`)
- [ ] UI 컴포넌트 표준화 (`components/ui/`)

### Phase 2: 원장 대시보드 (1주)
- [ ] 오늘의 현황 위젯
- [ ] 주의 필요 알림 위젯
- [ ] 시간표 타임라인 위젯

### Phase 3: 강사 대시보드 (1주)
- [ ] 담당 수업 카드
- [ ] 빠른 진도/숙제/출결 모달
- [ ] 지난 수업 참조 기능

### Phase 4: 고도화 (지속)
- [ ] PWA 지원 (오프라인 캐시)
- [ ] 푸시 알림 (숙제 마감, 상담 리마인더)
- [ ] 통계 대시보드 (주간/월간 리포트)

---

## 6. 결론

### PDF 프로젝트에서 배운 점

1. **명확한 파일 분리**: 300줄 이하 원칙
2. **단일 책임 원칙**: 훅은 CRUD 단위, 컴포넌트는 UI 단위
3. **명시적 캐시 관리**: `invalidateQueries`로 일관성 유지
4. **연쇄 작업 처리**: 삭제/수정 시 관련 데이터 정리

### 혜윰 백오피스 개선 방향

1. **역할별 분리**: `/admin`, `/teacher` 명확히 분리
2. **위젯 기반 대시보드**: 재사용 가능한 위젯 컴포넌트
3. **빠른 액션**: 3-tap 이내 핵심 작업 완료
4. **상태 시각화**: 진도/숙제/출결 상태를 한눈에

---

*리포트 완료: 2025-12-10*
