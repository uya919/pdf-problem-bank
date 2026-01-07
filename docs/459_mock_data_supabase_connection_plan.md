# Stage 37~40: Mock 데이터 Supabase 연결 종합 개발 계획

> 작성일: 2025-12-31
> 상태: 계획 수립 완료

---

## 1. 현황 분석

### 1.1 Mock 데이터 파일 분류

| 우선순위 | 페이지 | Mock 데이터 | 대상 사용자 | 상태 |
|---------|--------|------------|------------|------|
| **높음** | ClassesPage.tsx | MOCK_CLASSES, MOCK_SESSIONS | 강사 | Phase 4-A 부분 완료 |
| **높음** | StudentsPage.tsx | MOCK_STUDENTS, MOCK_STATS | 강사 | Phase 5-A 부분 완료 |
| **높음** | StudentDetailPage.tsx | 5개 Mock 객체 | 강사 | ⬜ **수정 필요** |
| 중간 | AttendancePage.tsx | MOCK_CLASSES, MOCK_ATTENDANCE_DATA | 관리자 | Mock Fallback 패턴 적용됨 |
| 중간 | GradeOverview.tsx | MOCK_GRADES, MOCK_CLASSES_BY_GRADE | 관리자 | Mock Fallback 패턴 적용됨 |
| 낮음 | exams.ts | MOCK_STUDENTS | 설정 | - |

### 1.2 강사 페이지 상세 분석

#### ClassesPage.tsx (97~246줄)
```typescript
// Mock 데이터 (이미 Supabase Fallback 패턴 적용됨)
MOCK_CLASSES: ClassInfo[]     // 반 정보 (3개 반)
MOCK_SESSIONS: ClassSession[] // 수업 세션 (5개)

// 현재 상태
✅ useClasses() - Supabase 연결됨
✅ useClassWithStudents() - Supabase 연결됨
✅ useClassSessions() - Supabase 연결됨
⚠️ classScheduleDates - MOCK_SESSIONS에서 직접 참조 (437줄)
```

#### StudentsPage.tsx (63~91줄)
```typescript
// Mock 데이터 (이미 Supabase Fallback 패턴 적용됨)
MOCK_STUDENTS: Student[]           // 학생 12명
MOCK_STATS: Record<string, Stats>  // 학생별 통계

// 현재 상태
✅ useStudents() - Supabase 연결됨
✅ useStudentStats() - Supabase 연결됨
→ 완전 연결됨 (Mock Fallback만 남음)
```

#### StudentDetailPage.tsx (23~97줄) - **수정 필요**
```typescript
// Mock 데이터 (Supabase 연결 안됨!)
MOCK_STUDENTS: Record<string, Student>    // 학생 12명
MOCK_STATS: Record<string, StudentStats>  // 통계
MOCK_SCORES: Record<string, ScoreRecord[]> // 성적 기록
MOCK_ACTIVITIES: Record<string, ActivityRecord[]> // 활동 내역
MOCK_NOTES: Record<string, StudentNote[]>  // 메모

// 현재 상태: 100% Mock 데이터 사용 (106~110줄)
const student = studentId ? MOCK_STUDENTS[studentId] : null;
const stats = studentId ? MOCK_STATS[studentId] : null;
const scores = studentId ? MOCK_SCORES[studentId] || [] : [];
const activities = studentId ? MOCK_ACTIVITIES[studentId] || [] : [];
const notes = studentId ? MOCK_NOTES[studentId] || [] : [];
```

---

## 2. 개발 계획

### Stage 37: StudentDetailPage Supabase 연결 (높음)

#### Phase 37-A: 학생 기본 정보 + 통계 연결

**수정 파일**: `frontend/src/pages/backoffice/StudentDetailPage.tsx`

**작업 내용**:
1. `useStudentDetail(studentId)` 훅 추가 또는 기존 훅 활용
2. `useStudentStats([studentId])` 훅 연결
3. Mock Fallback 패턴 적용

**신규 훅** (선택): `useStudentDetail` in `useStudents.ts`
```typescript
export function useStudentDetail(studentId: string | null) {
  return useQuery({
    queryKey: ['student', 'detail', studentId],
    queryFn: async () => {
      if (!studentId) return null;

      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          grade:grades(id, name),
          enrollments:class_enrollments(
            status,
            class:classes(id, name, subject, day_of_week, start_time)
          )
        `)
        .eq('id', studentId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: isSupabaseConfigured && !!studentId,
  });
}
```

#### Phase 37-B: 성적 기록 연결

**작업 내용**:
1. `useStudentScores(studentId)` 훅 추가
2. exam_scores 테이블에서 학생 성적 조회
3. 시계열 데이터로 변환 (ScoreRecord[])

**신규 훅**: `useStudentScores`
```typescript
export function useStudentScores(studentId: string | null) {
  return useQuery({
    queryKey: ['student', 'scores', studentId],
    queryFn: async () => {
      if (!studentId) return [];

      const { data, error } = await supabase
        .from('exam_scores')
        .select('exam_date, correct_answers, total_questions, manual_score')
        .eq('student_id', studentId)
        .order('exam_date', { ascending: true })
        .limit(10);

      if (error) throw error;

      // ScoreRecord[] 형태로 변환
      return (data || []).map(d => ({
        date: d.exam_date,
        score: d.manual_score ??
          (d.total_questions ? Math.round((d.correct_answers / d.total_questions) * 100) : 0),
      }));
    },
    enabled: isSupabaseConfigured && !!studentId,
  });
}
```

#### Phase 37-C: 활동 내역 연결

**작업 내용**:
1. `useStudentActivities(studentId)` 훅 추가
2. attendance, homework_submissions, exam_scores 테이블에서 최근 활동 조회
3. ActivityRecord[] 형태로 통합

**신규 훅**: `useStudentActivities`
```typescript
export function useStudentActivities(studentId: string | null, limit = 10) {
  return useQuery({
    queryKey: ['student', 'activities', studentId, limit],
    queryFn: async () => {
      if (!studentId) return [];

      const activities: ActivityRecord[] = [];

      // 1. 출결 기록
      const { data: attendance } = await supabase
        .from('attendance')
        .select('id, date, status, notes')
        .eq('student_id', studentId)
        .order('date', { ascending: false })
        .limit(limit);

      (attendance || []).forEach(a => {
        activities.push({
          id: a.id,
          date: a.date,
          type: a.status === 'absent' ? 'absence' : 'attendance',
          status: a.status,
          detail: a.notes,
        });
      });

      // 2. 숙제 제출 기록
      const { data: homework } = await supabase
        .from('homework_submissions')
        .select('id, submitted_at, status, homework:homework(title, description)')
        .eq('student_id', studentId)
        .order('submitted_at', { ascending: false })
        .limit(limit);

      (homework || []).forEach(h => {
        activities.push({
          id: h.id,
          date: h.submitted_at?.split('T')[0],
          type: 'homework',
          status: h.status,
          detail: h.homework?.title,
        });
      });

      // 3. 시험 기록
      const { data: exams } = await supabase
        .from('exam_scores')
        .select('id, exam_date, manual_score, correct_answers, total_questions')
        .eq('student_id', studentId)
        .order('exam_date', { ascending: false })
        .limit(limit);

      (exams || []).forEach(e => {
        const score = e.manual_score ??
          (e.total_questions ? Math.round((e.correct_answers / e.total_questions) * 100) : 0);
        activities.push({
          id: e.id,
          date: e.exam_date,
          type: 'test',
          score,
        });
      });

      // 날짜순 정렬
      return activities.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ).slice(0, limit);
    },
    enabled: isSupabaseConfigured && !!studentId,
  });
}
```

#### Phase 37-D: 메모 연결

**작업 내용**:
1. student_notes 테이블이 있는지 확인
2. 없으면 테이블 생성 마이그레이션 추가
3. `useStudentNotes(studentId)` 훅 추가
4. 메모 추가 mutation 추가

**테이블 스키마** (필요시):
```sql
CREATE TABLE student_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### Stage 38: ClassesPage 완전 연결 (중간)

**현재 상태**: 대부분 연결됨, 일부 Mock 참조 남음

#### Phase 38-A: classScheduleDates Mock 제거

**수정 파일**: `frontend/src/pages/backoffice/ClassesPage.tsx`

**작업 내용**:
1. 437줄의 MOCK_SESSIONS 참조 제거
2. supabaseSessions 데이터에서 날짜 추출
3. 또는 별도 훅으로 수업 일정 조회

```typescript
// Before (437줄)
const classScheduleDates = useMemo(() => {
  return MOCK_SESSIONS.filter((s) => s.classId === selectedClassId).map(
    (s) => new Date(s.date)
  );
}, [selectedClassId]);

// After
const classScheduleDates = useMemo(() => {
  if (supabaseSessions && supabaseSessions.length > 0) {
    return supabaseSessions.map(s => new Date(s.date));
  }
  return MOCK_SESSIONS.filter((s) => s.classId === selectedClassId).map(
    (s) => new Date(s.date)
  );
}, [selectedClassId, supabaseSessions]);
```

---

### Stage 39: 관리자 페이지 Supabase 강화 (낮음)

**현재 상태**: Mock Fallback 패턴 이미 적용됨

#### Phase 39-A: AttendancePage 검증
- 이미 Supabase 연결 + Mock Fallback 적용
- 테스트만 수행

#### Phase 39-B: GradeOverview 검증
- 이미 Supabase 연결 + Mock Fallback 적용
- 테스트만 수행

---

### Stage 40: 전체 테스트 및 Mock 데이터 정리

#### Phase 40-A: 기능 테스트

| 페이지 | 테스트 항목 |
|-------|-----------|
| StudentDetailPage | 학생 정보, 통계, 성적 차트, 활동 타임라인, 메모 |
| ClassesPage | 수업 일정 캘린더 |
| AttendancePage | 출결 입력/수정 |
| GradeOverview | 학년별 진도/숙제 현황 |

#### Phase 40-B: Mock 데이터 정리 (선택)

**옵션 1**: Mock 데이터 유지 (개발/데모용)
- 현재 상태 유지
- Supabase 미연결 시 자동 Fallback

**옵션 2**: Mock 데이터 분리
- `src/mocks/` 폴더로 이동
- 개발 환경에서만 import

---

## 3. 파일별 수정 내역

| Stage | 파일 | 수정 내용 |
|-------|------|----------|
| 37-A | `StudentDetailPage.tsx` | useStudentDetail, useStudentStats 연결 |
| 37-A | `useStudents.ts` | useStudentDetail 훅 추가 |
| 37-B | `StudentDetailPage.tsx` | useStudentScores 연결 |
| 37-B | `useStudents.ts` | useStudentScores 훅 추가 |
| 37-C | `StudentDetailPage.tsx` | useStudentActivities 연결 |
| 37-C | `useStudents.ts` | useStudentActivities 훅 추가 |
| 37-D | Supabase | student_notes 테이블 확인/생성 |
| 37-D | `useStudents.ts` | useStudentNotes 훅 추가 |
| 38-A | `ClassesPage.tsx` | classScheduleDates Mock 제거 |

---

## 4. 훅 파일 구조

```
frontend/src/hooks/backoffice/
├── index.ts              # 배럴 파일
├── types.ts              # 공통 타입
├── useStudents.ts        # 학생 관련 (확장)
│   ├── useStudents()           ✅ 기존
│   ├── useStudentStats()       ✅ 기존
│   ├── useStudentDetail()      🆕 신규
│   ├── useStudentScores()      🆕 신규
│   ├── useStudentActivities()  🆕 신규
│   └── useStudentNotes()       🆕 신규
├── useClasses.ts         # 반 관련 ✅ 기존
├── useAttendance.ts      # 출결 관련 ✅ 기존
├── useProgress.ts        # 진도 관련 ✅ 기존
├── useHomework.ts        # 숙제 관련 ✅ 기존
└── useExamScores.ts      # 성적 관련 ✅ 기존
```

---

## 5. 예상 에러 및 대응

| 에러 | 원인 | 해결 |
|-----|------|------|
| student_notes 테이블 없음 | Supabase 스키마 누락 | 마이그레이션 실행 |
| 활동 내역 중복 | 여러 테이블 조회 | 날짜 정렬 + 중복 제거 |
| 성적 점수 null | manual_score 없음 | correct/total로 계산 |
| 타입 불일치 | Supabase 응답 vs UI 타입 | 변환 함수 추가 |

---

## 6. 개발 순서

```
Stage 37: StudentDetailPage 연결 (최우선)
├── Phase 37-A: 기본 정보 + 통계
├── Phase 37-B: 성적 기록
├── Phase 37-C: 활동 내역
└── Phase 37-D: 메모

Stage 38: ClassesPage 완전 연결
└── Phase 38-A: classScheduleDates 수정

Stage 39: 관리자 페이지 검증
├── Phase 39-A: AttendancePage
└── Phase 39-B: GradeOverview

Stage 40: 테스트 및 정리
├── Phase 40-A: 기능 테스트
└── Phase 40-B: Mock 데이터 정리 (선택)
```

---

## 7. 참조

- `StudentDetailPage.tsx`: 23~97줄 (Mock 데이터), 101~127줄 (데이터 로딩)
- `ClassesPage.tsx`: 437~440줄 (classScheduleDates)
- `useStudents.ts`: 기존 훅 참고
- Stage 36: RecordsPage Supabase 연결 (완료)

---

*v1.0 - 2025-12-31*
