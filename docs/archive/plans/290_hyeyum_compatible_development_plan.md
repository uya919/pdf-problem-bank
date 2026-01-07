# hyeyum 호환 Backoffice 단계적 개발 계획

> 작성일: 2025-12-12
> 목표: hyeyum과 100% 호환되는 스키마로 Backoffice 개발

---

## 개발 전략

```
┌─────────────────────────────────────────────────────────┐
│  Phase 1: 새 Supabase 프로젝트 + hyeyum 호환 스키마     │
│                         ↓                               │
│  Phase 2: TypeScript 타입 + React Query 훅              │
│                         ↓                               │
│  Phase 3-6: 페이지별 실제 데이터 연동                   │
│                         ↓                               │
│  Phase 7: 테스트 + 검증                                 │
│                         ↓                               │
│  Phase 8: (미래) hyeyum 데이터 마이그레이션             │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 1: 인프라 + hyeyum 호환 스키마 (2시간)

### 1.1 새 Supabase 프로젝트 생성

**사용자 액션**:
1. https://supabase.com 접속
2. 새 프로젝트 생성: `backoffice-dev`
3. 리전: Northeast Asia (Seoul)
4. URL과 anon key 복사

### 1.2 hyeyum 호환 스키마 생성

**파일**: `supabase/migrations/001_hyeyum_compatible_schema.sql`

```sql
-- hyeyum과 100% 호환되는 스키마
-- ENUM 타입, 컬럼명, 데이터 타입 모두 동일하게 설계
```

### 1.3 시드 데이터 (더미)

**파일**: `supabase/migrations/002_seed_data.sql`

```sql
-- hyeyum 실제 데이터와 유사한 더미 데이터
-- 학생 20명, 반 5개, 출결 100건 등
```

### 1.4 환경 변수 설정

```bash
# frontend/.env.local
VITE_SUPABASE_URL=https://[새프로젝트].supabase.co
VITE_SUPABASE_ANON_KEY=[새프로젝트_anon_key]
```

**산출물**:
- [ ] 새 Supabase 프로젝트
- [ ] hyeyum 호환 스키마 SQL
- [ ] 시드 데이터 SQL
- [ ] .env.local 설정

---

## Phase 2: TypeScript 타입 + 기본 훅 (1.5시간)

### 2.1 Database 타입 생성

**파일**: `frontend/src/types/database.ts`

```typescript
// Supabase CLI로 자동 생성 또는 수동 작성
// hyeyum 스키마와 동일한 타입
export type Database = {
  public: {
    Tables: {
      students: { ... },
      classes: { ... },
      attendance: { ... },
      // ...
    }
  }
}
```

### 2.2 Supabase 클라이언트 타입 적용

**파일**: `frontend/src/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export const supabase = createClient<Database>(url, key);
```

### 2.3 기본 React Query 훅

**파일**: `frontend/src/hooks/useSupabase.ts`

```typescript
// 공통 CRUD 훅
export function useStudents() { ... }
export function useClasses() { ... }
export function useAttendance() { ... }
```

**산출물**:
- [ ] database.ts (타입 정의)
- [ ] supabase.ts (타입 적용)
- [ ] useSupabase.ts (기본 훅)

---

## Phase 3: Dashboard 페이지 연동 (1시간)

### 3.1 실제 데이터 조회

```typescript
// 오늘의 출석 현황
const { data: todayAttendance } = useQuery({
  queryKey: ['attendance', 'today'],
  queryFn: () => supabase
    .from('attendance')
    .select('*, students(*), classes(*)')
    .eq('date', today)
});

// 이번 주 숙제
const { data: weekHomework } = useQuery({
  queryKey: ['homework', 'week'],
  queryFn: () => supabase
    .from('homework')
    .select('*, classes(*)')
    .gte('due_date', weekStart)
    .lte('due_date', weekEnd)
});
```

### 3.2 대시보드 위젯 연결

- 출석 현황 카드
- 숙제 현황 카드
- 공지사항 목록
- TODO 목록

**산출물**:
- [ ] useDashboard.ts
- [ ] Dashboard 실제 데이터 연동

---

## Phase 4: Classes 페이지 연동 (1.5시간)

### 4.1 반 목록 조회

```typescript
const { data: classes } = useQuery({
  queryKey: ['classes'],
  queryFn: () => supabase
    .from('classes')
    .select(`
      *,
      teacher:profiles(*),
      enrollments:class_enrollments(count)
    `)
    .eq('status', 'active')
});
```

### 4.2 학생 목록 (반별)

```typescript
const { data: students } = useQuery({
  queryKey: ['class-students', classId],
  queryFn: () => supabase
    .from('class_enrollments')
    .select('*, student:students(*)')
    .eq('class_id', classId)
    .eq('status', 'active')
});
```

### 4.3 CRUD 기능

- 반 생성/수정
- 학생 등록/제외
- 반 상세 정보

**산출물**:
- [ ] useClasses.ts
- [ ] useClassStudents.ts
- [ ] ClassesPage 실제 데이터 연동

---

## Phase 5: Students 페이지 연동 (1시간)

### 5.1 학생 전체 목록

```typescript
const { data: students } = useQuery({
  queryKey: ['students', filters],
  queryFn: () => {
    let query = supabase
      .from('students')
      .select(`
        *,
        enrollments:class_enrollments(
          class:classes(name)
        )
      `)
      .eq('status', 'active');

    if (filters.grade) query = query.eq('grade', filters.grade);
    if (filters.search) query = query.ilike('name', `%${filters.search}%`);

    return query;
  }
});
```

### 5.2 학생 상세/수정

```typescript
const updateStudent = useMutation({
  mutationFn: (data) => supabase
    .from('students')
    .update(data)
    .eq('id', studentId)
});
```

**산출물**:
- [ ] useStudents.ts
- [ ] StudentsPage 실제 데이터 연동

---

## Phase 6: Records 페이지 연동 (2시간)

### 6.1 출결 탭

```typescript
const { data: attendance } = useQuery({
  queryKey: ['attendance', classId, dateRange],
  queryFn: () => supabase
    .from('attendance')
    .select('*, student:students(name)')
    .eq('class_id', classId)
    .gte('date', dateRange.start)
    .lte('date', dateRange.end)
});

const saveAttendance = useMutation({
  mutationFn: (records) => supabase
    .from('attendance')
    .upsert(records, { onConflict: 'class_id,student_id,date' })
});
```

### 6.2 진도 탭

```typescript
const { data: progress } = useQuery({
  queryKey: ['progress', classId],
  queryFn: () => supabase
    .from('progress')
    .select('*')
    .eq('class_id', classId)
    .order('date', { ascending: false })
});
```

### 6.3 숙제 탭

```typescript
const { data: homework } = useQuery({
  queryKey: ['homework', classId],
  queryFn: () => supabase
    .from('homework')
    .select(`
      *,
      submissions:homework_submissions(
        student:students(name),
        status
      )
    `)
    .eq('class_id', classId)
});
```

### 6.4 성적 탭

```typescript
const { data: scores } = useQuery({
  queryKey: ['exam_scores', classId],
  queryFn: () => supabase
    .from('exam_scores')
    .select('*, student:students(name)')
    .eq('class_id', classId)
    .order('exam_date', { ascending: false })
});
```

**산출물**:
- [ ] useAttendance.ts
- [ ] useProgress.ts
- [ ] useHomework.ts
- [ ] useExamScores.ts
- [ ] RecordsPage 4개 탭 실제 데이터 연동

---

## Phase 7: 테스트 + 검증 (1시간)

### 7.1 기능 테스트

- [ ] 반 생성/수정/삭제
- [ ] 학생 등록/수정
- [ ] 출결 입력/수정
- [ ] 진도 기록
- [ ] 숙제 생성/제출 체크
- [ ] 성적 입력

### 7.2 호환성 검증

```typescript
// hyeyum 데이터 구조와 동일한지 확인
// MCP로 hyeyum 데이터 조회 → Backoffice와 비교
```

### 7.3 성능 테스트

- 학생 200명 로딩 속도
- 출결 500건 조회 속도

**산출물**:
- [ ] 테스트 체크리스트 완료
- [ ] 성능 리포트

---

## Phase 8: (미래) 마이그레이션 (예상 3시간)

### 8.1 마이그레이션 스크립트 작성

```typescript
// migration/export-hyeyum.ts
async function exportHyeyumData() {
  const data = await supabaseHyeyum.from('students').select('*');
  // ...
}

// migration/import-backoffice.ts
async function importToBackoffice(data) {
  await supabaseBackoffice.from('students').upsert(data);
  // ...
}
```

### 8.2 검증

- 데이터 건수 일치 확인
- 샘플 데이터 비교
- FK 무결성 검증

---

## 일정 요약

| Phase | 내용 | 예상 시간 |
|-------|------|----------|
| **1** | 인프라 + hyeyum 호환 스키마 | 2시간 |
| **2** | TypeScript 타입 + 기본 훅 | 1.5시간 |
| **3** | Dashboard 연동 | 1시간 |
| **4** | Classes 연동 | 1.5시간 |
| **5** | Students 연동 | 1시간 |
| **6** | Records 연동 (4탭) | 2시간 |
| **7** | 테스트 + 검증 | 1시간 |
| **합계** | | **10시간** |
| (미래) **8** | 마이그레이션 | 3시간 |

---

## 파일 구조 (예정)

```
frontend/src/
├── types/
│   └── database.ts          # Supabase 타입 (hyeyum 호환)
│
├── lib/
│   └── supabase.ts          # 타입 적용된 클라이언트
│
├── hooks/
│   ├── useAuth.ts           # 인증 (기존)
│   ├── useStudents.ts       # 학생 CRUD
│   ├── useClasses.ts        # 반 CRUD
│   ├── useAttendance.ts     # 출결 CRUD
│   ├── useProgress.ts       # 진도 CRUD
│   ├── useHomework.ts       # 숙제 CRUD
│   ├── useExamScores.ts     # 성적 CRUD
│   ├── useTodos.ts          # TODO CRUD
│   └── useDashboard.ts      # 대시보드 집계
│
└── pages/backoffice/
    ├── DashboardPage.tsx    # 실제 데이터 연동
    ├── ClassesPage.tsx      # 실제 데이터 연동
    ├── StudentsPage.tsx     # 실제 데이터 연동
    └── RecordsPage.tsx      # 실제 데이터 연동
```

---

## 다음 단계

```bash
# Phase 1 시작
"새 Supabase 프로젝트 생성했어" → Phase 1 진행
"Phase 1 진행해줘" → hyeyum 호환 스키마 생성
```

---

*작성: Claude Code | 2025-12-12*
