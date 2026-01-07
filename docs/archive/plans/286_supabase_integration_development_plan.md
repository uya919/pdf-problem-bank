# Supabase 연동 단계별 개발 계획

> 작성일: 2025-12-12
> 목표: Backoffice 더미 데이터 → Supabase 실제 데이터 연동
> 예상 시간: 8-10시간

---

## 현재 상태

### 준비된 것
- [x] Supabase 스키마 설계 완료 (`docs/supabase-schema.md`)
- [x] Supabase 클라이언트 설정 (`lib/supabase.ts`)
- [x] 5개 페이지 UI 완료 (더미 데이터 사용)

### 필요한 것
- [ ] Supabase 프로젝트 생성 & 테이블 생성
- [ ] 환경 변수 설정 (`.env.local`)
- [ ] TypeScript 타입 생성
- [ ] React Query 훅 구현
- [ ] 각 페이지 데이터 연동

---

## Phase 1: 인프라 설정 (30분)

### 1-A: Supabase 프로젝트 생성
```
1. supabase.com 접속 → 새 프로젝트 생성
2. 프로젝트 이름: hyeyum-backoffice
3. 리전: Northeast Asia (Seoul)
4. 비밀번호 설정
```

### 1-B: 환경 변수 설정
```bash
# frontend/.env.local
VITE_SUPABASE_URL=https://[PROJECT_ID].supabase.co
VITE_SUPABASE_ANON_KEY=[ANON_KEY]
```

### 1-C: 테이블 생성 (SQL Editor)
```sql
-- 순서대로 실행 (FK 의존성 고려)
-- 1. profiles (auth.users 연결)
-- 2. students
-- 3. classes
-- 4. class_enrollments
-- 5. attendance
-- 6. progress
-- 7. homework → homework_submissions
-- 8. exam_scores
```

**작업 파일**:
- `supabase/migrations/001_initial_schema.sql` (생성)

---

## Phase 2: 타입 & 기본 훅 (1시간)

### 2-A: TypeScript 타입 생성
```typescript
// types/supabase.ts
export interface Student {
  id: string;
  name: string;
  phone: string | null;
  parent_phone: string | null;
  grade: string;
  school: string | null;
  status: 'active' | 'inactive' | 'graduated';
  notes: string | null;
  created_at: string;
}

export interface Class {
  id: string;
  name: string;
  subject: string | null;
  teacher_id: string | null;
  schedule: ScheduleItem[];
  created_at: string;
}

// ... 기타 테이블
```

### 2-B: 기본 CRUD 훅
```typescript
// hooks/useSupabase.ts
export function useStudents() {
  return useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data;
    }
  });
}
```

**작업 파일**:
- `frontend/src/types/supabase.ts` (생성)
- `frontend/src/hooks/useSupabaseQuery.ts` (생성)

---

## Phase 3: 대시보드 연동 (1.5시간)

### 3-A: 대시보드 데이터 요구사항
| 데이터 | 테이블 | 쿼리 |
|--------|--------|------|
| 오늘 수업 | classes | schedule JSONB 필터 |
| 출결 요약 | attendance | 오늘 날짜 집계 |
| 할 일 | todos | user_id, 미완료 |
| 공지사항 | announcements | 최근 3개 |

### 3-B: 훅 구현
```typescript
// hooks/useDashboard.ts
export function useTodayClasses() { ... }
export function useTodayAttendance() { ... }
export function useMyTodos() { ... }
export function useAnnouncements() { ... }
```

### 3-C: BackofficeDemo.tsx 수정
- 더미 데이터 → React Query 훅으로 교체
- 로딩/에러 상태 처리 추가

**작업 파일**:
- `frontend/src/hooks/useDashboard.ts` (생성)
- `frontend/src/pages/BackofficeDemo.tsx` (수정)

---

## Phase 4: 수업 페이지 연동 (1.5시간)

### 4-A: 데이터 요구사항
| 데이터 | 테이블 | 쿼리 |
|--------|--------|------|
| 반 목록 | classes | teacher_id 필터 |
| 반별 학생 수 | class_enrollments | COUNT 집계 |
| 스케줄 | classes.schedule | JSONB |

### 4-B: 훅 구현
```typescript
// hooks/useClasses.ts
export function useClasses() { ... }
export function useClassDetail(id: string) { ... }
export function useClassStudents(classId: string) { ... }
```

### 4-C: ClassesPage.tsx 수정
- 더미 데이터 교체
- 기간 필터링 (주간/월간) 구현
- 반 클릭 시 상세 모달

**작업 파일**:
- `frontend/src/hooks/useClasses.ts` (생성)
- `frontend/src/pages/backoffice/ClassesPage.tsx` (수정)

---

## Phase 5: 학생 페이지 연동 (1.5시간)

### 5-A: 데이터 요구사항
| 데이터 | 테이블 | 쿼리 |
|--------|--------|------|
| 학생 목록 | students | status='active' |
| 소속 반 | class_enrollments + classes | JOIN |
| 출결 현황 | attendance | student_id 필터, 최근 30일 |

### 5-B: 훅 구현
```typescript
// hooks/useStudents.ts
export function useStudents() { ... }
export function useStudentDetail(id: string) { ... }
export function useStudentAttendance(studentId: string) { ... }
export function useStudentClasses(studentId: string) { ... }
```

### 5-C: StudentsPage.tsx & StudentDetailPage.tsx 수정
- 검색, 정렬, 반 필터 연동
- 학생 상세 페이지 실제 데이터

**작업 파일**:
- `frontend/src/hooks/useStudents.ts` (생성)
- `frontend/src/pages/backoffice/StudentsPage.tsx` (수정)
- `frontend/src/pages/backoffice/StudentDetailPage.tsx` (수정)

---

## Phase 6: 기록 페이지 연동 (2시간)

### 6-A: 출결 탭
```typescript
// hooks/useAttendance.ts
export function useAttendanceByDate(date: Date, classId?: string) { ... }
export function useAttendanceStats(startDate: Date, endDate: Date) { ... }
export function upsertAttendance() { ... }  // 출결 입력
```

### 6-B: 진도 탭
```typescript
// hooks/useProgress.ts
export function useProgressByClass(classId: string) { ... }
export function useProgressHistory(limit: number) { ... }
export function createProgress() { ... }  // 진도 기록
```

### 6-C: 숙제 탭
```typescript
// hooks/useHomework.ts
export function useHomeworkByClass(classId: string) { ... }
export function useUnsubmittedStudents() { ... }
export function updateSubmissionStatus() { ... }
```

### 6-D: 성적 탭
```typescript
// hooks/useExamScores.ts
export function useExamScores(classId: string) { ... }
export function useScoreDistribution(examId: string) { ... }
export function createExamScore() { ... }
```

**작업 파일**:
- `frontend/src/hooks/useAttendance.ts` (생성)
- `frontend/src/hooks/useProgress.ts` (생성)
- `frontend/src/hooks/useHomework.ts` (생성)
- `frontend/src/hooks/useExamScores.ts` (생성)
- `frontend/src/pages/backoffice/RecordsPage.tsx` (수정)

---

## Phase 7: 더보기 페이지 연동 (1시간)

### 7-A: 프로필 데이터
```typescript
// hooks/useProfile.ts
export function useMyProfile() { ... }
export function useProfileStats() { ... }  // 담당학생, 수업반, 출석률
```

### 7-B: 공지사항 & 할일
- 공지사항 목록
- 읽지 않은 공지 배지

**작업 파일**:
- `frontend/src/hooks/useProfile.ts` (생성)
- `frontend/src/pages/backoffice/MorePage.tsx` (수정)

---

## Phase 8: 인증 연동 (선택, 1시간)

### 8-A: 로그인/로그아웃
```typescript
// hooks/useAuth.ts
export function useAuth() {
  const login = (email: string, password: string) => { ... };
  const logout = () => { ... };
  const user = useSession();
  return { user, login, logout };
}
```

### 8-B: 라우트 보호
- 미인증 시 로그인 페이지로 리다이렉트
- 로그인 페이지 UI 구현

**작업 파일**:
- `frontend/src/hooks/useAuth.ts` (수정)
- `frontend/src/pages/backoffice/LoginPage.tsx` (생성)

---

## 개발 순서 다이어그램

```
Phase 1 (인프라)
    │
    ▼
Phase 2 (타입 & 훅)
    │
    ├─────────┬─────────┬─────────┐
    ▼         ▼         ▼         ▼
Phase 3   Phase 4   Phase 5   Phase 6
(대시보드) (수업)    (학생)    (기록)
    │         │         │         │
    └─────────┴─────────┴─────────┘
                  │
                  ▼
            Phase 7 (더보기)
                  │
                  ▼
            Phase 8 (인증, 선택)
```

---

## 품질 체크리스트

### 각 Phase 공통
- [ ] TypeScript 타입 정의
- [ ] React Query 훅 구현
- [ ] 로딩 상태 UI (스켈레톤)
- [ ] 에러 상태 UI
- [ ] 빌드 테스트 통과

### 데이터 무결성
- [ ] RLS 정책 테스트
- [ ] 빈 데이터 처리
- [ ] 날짜/시간 타임존 처리

---

## 시드 데이터 (테스트용)

```sql
-- 테스트용 학생 데이터
INSERT INTO students (name, grade, status) VALUES
  ('박성빈', '중3', 'active'),
  ('이사랑', '중3', 'active'),
  ('김민수', '중2', 'active');

-- 테스트용 반 데이터
INSERT INTO classes (name, subject, schedule) VALUES
  ('중3A반', '수학', '[{"day":"MON","startTime":"17:00","endTime":"19:00"}]'),
  ('중2A반', '수학', '[{"day":"TUE","startTime":"18:00","endTime":"20:00"}]');
```

---

## 명령어

```
Phase 1 진행해줘     # 인프라 설정
Phase 2 진행해줘     # 타입 & 기본 훅
Phase 3 진행해줘     # 대시보드 연동
Phase 4 진행해줘     # 수업 페이지 연동
Phase 5 진행해줘     # 학생 페이지 연동
Phase 6 진행해줘     # 기록 페이지 연동
Phase 7 진행해줘     # 더보기 페이지 연동
Phase 8 진행해줘     # 인증 연동
전체 진행해줘        # 순차 진행
```

---

## 예상 결과물

### 파일 구조
```
frontend/src/
├── hooks/
│   ├── useAuth.ts
│   ├── useDashboard.ts
│   ├── useClasses.ts
│   ├── useStudents.ts
│   ├── useAttendance.ts
│   ├── useProgress.ts
│   ├── useHomework.ts
│   ├── useExamScores.ts
│   └── useProfile.ts
├── types/
│   └── supabase.ts
└── lib/
    └── supabase.ts (기존)
```

### 총 예상 시간
| Phase | 내용 | 시간 |
|-------|------|------|
| 1 | 인프라 설정 | 30분 |
| 2 | 타입 & 기본 훅 | 1시간 |
| 3 | 대시보드 | 1.5시간 |
| 4 | 수업 페이지 | 1.5시간 |
| 5 | 학생 페이지 | 1.5시간 |
| 6 | 기록 페이지 | 2시간 |
| 7 | 더보기 페이지 | 1시간 |
| 8 | 인증 (선택) | 1시간 |
| **합계** | | **8-10시간** |

---

*작성: Claude Code | 2025-12-12*
