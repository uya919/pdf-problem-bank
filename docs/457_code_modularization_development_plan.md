# useBackofficeData.ts 모듈화 개발 계획

> 2,287줄 → 11개 파일 분리 (평균 ~140줄)

**작성일**: 2025-12-30
**참조**: [456_code_modularization_research_report.md](456_code_modularization_research_report.md)

---

## 목표

| 항목 | Before | After |
|------|--------|-------|
| 파일 수 | 1개 | 11개 |
| 최대 라인 | 2,287줄 | ~350줄 |
| 평균 라인 | - | ~140줄 |
| Import 경로 | 유지 | 유지 (배럴 패턴) |

---

## Phase 1: 준비 작업

### Phase 1-A: 폴더 및 배럴 생성

**파일 생성:**
```
frontend/src/hooks/backoffice/
├── index.ts          # 배럴 파일
└── types.ts          # 공통 타입/유틸
```

**index.ts 내용:**
```typescript
/**
 * Backoffice 훅 배럴 파일
 *
 * 기존 import 경로 호환:
 * import { useClasses } from '@/hooks/useBackofficeData';
 * import { useClasses } from '@/hooks/backoffice';  // 신규
 */

// Phase 1: 기존 파일에서 re-export (점진적 마이그레이션)
export * from '../useBackofficeData';
```

**types.ts 내용:**
```typescript
/**
 * Backoffice 훅 공통 타입
 */
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type {
  Student, Class, ClassEnrollment, Attendance, Progress,
  Homework, HomeworkSubmission, ExamScore, Todo, Announcement,
  Profile, StudentWithEnrollments, ClassWithDetails,
  AttendanceWithStudent, HomeworkWithSubmissions,
  ExamScoreWithStudent, AttendanceStatus,
} from '@/types/database';

// Re-export for convenience
export { supabase, isSupabaseConfigured };
export type {
  Student, Class, ClassEnrollment, Attendance, Progress,
  Homework, HomeworkSubmission, ExamScore, Todo, Announcement,
  Profile, StudentWithEnrollments, ClassWithDetails,
  AttendanceWithStudent, HomeworkWithSubmissions,
  ExamScoreWithStudent, AttendanceStatus,
};

// 내부 공통 타입
export interface ProgressClassInfo {
  id: string;
  name: string;
  start_time: string | null;
  end_time: string | null;
}

export interface TabletClassSchedule {
  id: string;
  name: string;
  subject: string;
  studentCount: number;
  startTime: string;
  endTime: string;
  status: 'completed' | 'current' | 'upcoming';
}

export interface TabletNotice {
  id: string;
  title: string;
  description: string;
  time?: string;
  target_class_ids?: string[] | null;
}

export interface TabletAttendanceIssue {
  id: string;
  className: string;
  studentName: string;
  issue: string;
}

// 공통 상수
export const STUDENT_COLORS = [
  '#3182F6', '#00C896', '#FF9800', '#9C27B0',
  '#607D8B', '#795548', '#00BCD4', '#E91E63',
  '#4CAF50', '#FF5722', '#673AB7', '#009688',
];

export const DAY_NAMES_KO: Record<number, string> = {
  0: '일', 1: '월', 2: '화', 3: '수', 4: '목', 5: '금', 6: '토'
};

// 공통 유틸
export function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dow = DAY_NAMES_KO[d.getDay()] || '';
  return `${month}/${day} (${dow})`;
}
```

**검증:**
- [ ] `npm run build` 성공
- [ ] 기존 페이지 정상 동작

---

## Phase 2: 간단한 훅 분리

### Phase 2-A: useStudents.ts (~70줄)

**파일 생성:** `frontend/src/hooks/backoffice/useStudents.ts`

**포함 함수:**
- `useStudents(options?)` - 학생 목록 조회
- `useStudent(studentId)` - 학생 상세 조회

**의존성:**
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from './types';
import type { StudentWithEnrollments } from './types';
```

**index.ts 수정:**
```typescript
// 분리된 훅
export * from './useStudents';

// 나머지는 기존 파일에서
export {
  useClasses, useClassWithStudents, useAttendance, ...
} from '../useBackofficeData';
```

**검증:**
- [ ] `npm run build` 성공
- [ ] StudentsPage.tsx 정상 동작

---

### Phase 2-B: useExamScores.ts (~80줄)

**파일 생성:** `frontend/src/hooks/backoffice/useExamScores.ts`

**포함 함수:**
- `useExamScores(classId)` - 성적 조회
- `useSaveExamScores()` - 성적 저장

**검증:**
- [ ] `npm run build` 성공
- [ ] RecordsPage.tsx 성적 탭 정상 동작

---

## Phase 3: 중간 복잡도 훅 분리

### Phase 3-A: useClasses.ts (~100줄)

**파일 생성:** `frontend/src/hooks/backoffice/useClasses.ts`

**포함 함수:**
- `useClasses(options?)` - 반 목록 조회
- `useClassWithStudents(classId)` - 반 + 학생 조회

**검증:**
- [ ] `npm run build` 성공
- [ ] ClassesPage.tsx 정상 동작
- [ ] RecordsPage.tsx 반 선택 정상 동작

---

### Phase 3-B: useHomework.ts (~150줄)

**파일 생성:** `frontend/src/hooks/backoffice/useHomework.ts`

**포함 함수:**
- `useHomework(classId)` - 숙제 조회
- `useWeekHomework()` - 이번 주 숙제
- `useSaveHomeworkSubmissions()` - 숙제 제출 저장
- `useHomeworkByDate(classId, date)` - 날짜별 숙제
- `useTodayHomework(teacherId)` - 오늘 숙제 현황
- `useHomeworkForTeacherByDate(teacherId, date)` - 선생님별 날짜 숙제

**검증:**
- [ ] `npm run build` 성공
- [ ] RecordsPage.tsx 숙제 탭 정상 동작
- [ ] BackofficeDemo.tsx 숙제 카드 정상 동작

---

### Phase 3-C: useProgress.ts (~200줄)

**파일 생성:** `frontend/src/hooks/backoffice/useProgress.ts`

**포함 함수:**
- `useProgress(classId)` - 진도 조회
- `useSaveProgress()` - 진도 저장
- `useTodayProgress(teacherId)` - 오늘 진도 현황
- `useLastProgress(classId)` - 마지막 진도
- `useLastProgressBefore(classId, beforeDate)` - 특정 날짜 이전 진도
- `useProgressByDate(classId, date)` - 날짜별 진도
- `useProgressForTeacherByDate(teacherId, date)` - 선생님별 날짜 진도
- `useTextbooks(classId?)` - 교재 목록

**검증:**
- [ ] `npm run build` 성공
- [ ] RecordsPage.tsx 진도 탭 정상 동작
- [ ] ProgressModal.tsx 정상 동작
- [ ] BackofficeDemo.tsx 진도 카드 정상 동작

---

## Phase 4: 복잡한 훅 분리

### Phase 4-A: useAttendance.ts (~400줄)

**파일 생성:** `frontend/src/hooks/backoffice/useAttendance.ts`

**포함 함수:**
- `useAttendance(options)` - 출결 조회 (반별)
- `useTodayAttendance()` - 오늘 출결
- `useSaveAttendance()` - 출결 저장
- `useAttendanceByDate(teacherId, date)` - 날짜별 출결 (135줄)
- `useTodayAttendanceForTeacher(teacherId)` - 선생님별 오늘 출결
- `useAttendanceForTeacherByDate(teacherId, date)` - 선생님별 날짜 출결

**Export 타입:**
- `ClassAttendanceData`

**검증:**
- [ ] `npm run build` 성공
- [ ] RecordsPage.tsx 출결 탭 정상 동작
- [ ] BackofficeDemo.tsx 출결 카드 정상 동작
- [ ] 이민혁 로그인 시 학생 표시 확인

---

### Phase 4-B: useDashboard.ts (~250줄)

**파일 생성:** `frontend/src/hooks/backoffice/useDashboard.ts`

**포함 함수:**
- `useDashboardStats()` - 대시보드 통계
- `useClassScheduleDates(teacherId, startDate, endDate)` - 수업 일정
- `useStudentStats(studentIds)` - 학생 통계 (117줄)
- `useClassSessions(classId, options?)` - 반 세션 데이터 (182줄)

**Export 타입:**
- `ClassSession`
- `StudentStatsData`

**검증:**
- [ ] `npm run build` 성공
- [ ] BackofficeDemo.tsx 대시보드 정상 동작
- [ ] ClassesPage.tsx 세션 목록 정상 동작

---

### Phase 4-C: useWeekData.ts (~300줄)

**파일 생성:** `frontend/src/hooks/backoffice/useWeekData.ts`

**포함 함수:**
- `useWeekClassesByDate(teacherId, weekDates)` - 주간 반별 수업 (120줄)
- `useWeekNoticesByDate(teacherId, startDate, endDate, myClassIds?)` - 주간 공지 (76줄)
- `useWeekAttendanceIssuesByDate(teacherId, startDate, endDate)` - 주간 출결 이슈 (85줄)

**검증:**
- [ ] `npm run build` 성공
- [ ] BackofficeDemo.tsx 태블릿 뷰 정상 동작
- [ ] 주간 캘린더 정상 동작

---

## Phase 5: 정리

### Phase 5-A: useMisc.ts (~100줄)

**파일 생성:** `frontend/src/hooks/backoffice/useMisc.ts`

**포함 함수:**
- `useAnnouncements(limit?)` - 공지사항 (레거시)
- `useNoticesByDate(date, myClassIds?, options?)` - 날짜별 공지
- `useTodos(userId)` - TODO 목록

**검증:**
- [ ] `npm run build` 성공
- [ ] 공지 관련 기능 정상 동작

---

### Phase 5-B: 기존 파일 정리

**useBackofficeData.ts 최종 내용 (~30줄):**
```typescript
/**
 * Backoffice 데이터 훅
 *
 * @deprecated 개별 훅 파일에서 직접 import 권장
 * import { useClasses } from '@/hooks/backoffice';
 *
 * 이 파일은 하위 호환성을 위해 유지됩니다.
 */

// 모든 훅 re-export
export * from './backoffice';
```

**index.ts 최종 내용:**
```typescript
/**
 * Backoffice 훅 배럴 파일
 */

// 타입
export * from './types';

// 훅들
export * from './useStudents';
export * from './useClasses';
export * from './useAttendance';
export * from './useProgress';
export * from './useHomework';
export * from './useExamScores';
export * from './useDashboard';
export * from './useWeekData';
export * from './useMisc';
```

**검증:**
- [ ] `npm run build` 성공
- [ ] 전체 페이지 수동 테스트
  - [ ] /backoffice (강사 대시보드)
  - [ ] /backoffice/classes (반 목록)
  - [ ] /backoffice/students (학생 목록)
  - [ ] /backoffice/records (기록)
- [ ] 기존 import 경로 동작 확인

---

## 최종 파일 구조

```
frontend/src/hooks/
├── backoffice/
│   ├── index.ts           # 배럴 (~30줄)
│   ├── types.ts           # 공통 타입 (~100줄)
│   ├── useStudents.ts     # 학생 (~70줄)
│   ├── useClasses.ts      # 반 (~100줄)
│   ├── useAttendance.ts   # 출결 (~400줄) ⚠️
│   ├── useProgress.ts     # 진도 (~200줄)
│   ├── useHomework.ts     # 숙제 (~150줄)
│   ├── useExamScores.ts   # 성적 (~80줄)
│   ├── useDashboard.ts    # 대시보드 (~250줄)
│   ├── useWeekData.ts     # 주간 (~300줄)
│   └── useMisc.ts         # 기타 (~100줄)
└── useBackofficeData.ts   # 호환용 (~30줄)
```

**총 라인:** ~1,810줄 (11개 파일)
**감소량:** 477줄 (중복 제거 + 정리)

---

## 체크리스트 요약

### Phase 1 (준비)
- [ ] Phase 1-A: 폴더 및 배럴 생성

### Phase 2 (간단한 훅)
- [ ] Phase 2-A: useStudents.ts
- [ ] Phase 2-B: useExamScores.ts

### Phase 3 (중간 복잡도)
- [ ] Phase 3-A: useClasses.ts
- [ ] Phase 3-B: useHomework.ts
- [ ] Phase 3-C: useProgress.ts

### Phase 4 (복잡한 훅)
- [ ] Phase 4-A: useAttendance.ts
- [ ] Phase 4-B: useDashboard.ts
- [ ] Phase 4-C: useWeekData.ts

### Phase 5 (정리)
- [ ] Phase 5-A: useMisc.ts
- [ ] Phase 5-B: 기존 파일 정리

---

## 롤백 전략

문제 발생 시:
1. 분리된 파일 삭제
2. `index.ts`를 원래대로 복원:
   ```typescript
   export * from '../useBackofficeData';
   ```
3. 빌드 확인

---

## 예상 에러 및 해결책

| 에러 | 원인 | 해결책 |
|------|------|--------|
| `Cannot find module './types'` | 경로 오류 | 상대 경로 확인 |
| `Circular dependency` | 순환 참조 | types.ts로 공통 의존성 이동 |
| `Type 'X' is not exported` | Export 누락 | index.ts에 export 추가 |
| `useQuery is not defined` | Import 누락 | TanStack Query import 확인 |
| 런타임 에러 | 훅 순서/조건 | enabled 조건 확인 |

---

*이 계획은 Phase별로 진행하며, 각 Phase 완료 후 빌드 검증을 수행합니다.*
