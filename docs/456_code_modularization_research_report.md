# 코드 모듈화 연구 리포트

> 300줄 기준 파일 분리 전략 및 의존성 분석

**작성일**: 2025-12-30
**목적**: 연구 및 분석 (개발 진행 없음)

---

## 1. 현황 요약

### 1.1 전체 통계

| 영역 | 파일 수 | 총 라인 | 300줄+ 파일 |
|------|---------|---------|-------------|
| **hooks/** | 56개 | ~15,000줄 | 1개 (useBackofficeData.ts) |
| **pages/** | 69개 | 29,564줄 | 21개 |
| **components/** | 295개 | 101,708줄 | 47개 |
| **합계** | 420개 | ~146,000줄 | 69개 |

### 1.2 가장 큰 파일 TOP 10

| 순위 | 파일 | 라인 | 위치 |
|------|------|------|------|
| 1 | **useBackofficeData.ts** | 2,287 | hooks/ |
| 2 | OperationsPage.tsx | 1,584 | pages/admin/ |
| 3 | IntegratedProblemBankPage.tsx | 1,493 | pages/ |
| 4 | PageViewer.tsx | 1,445 | pages/ |
| 5 | BackofficeDemo.tsx | 1,285 | pages/ |
| 6 | RecordsPage.tsx | 1,103 | pages/backoffice/ |
| 7 | AdminStudentsPage.tsx | 1,077 | pages/admin/ |
| 8 | ExamEditorPage.tsx | 847 | pages/ |
| 9 | GroupPanel.tsx | 834 | components/ |
| 10 | GradeOverview.tsx | 792 | pages/admin/ |

---

## 2. useBackofficeData.ts 상세 분석

### 2.1 Export 함수 목록 (36개)

#### Query Hooks (31개)
| 함수명 | 라인 수 | 용도 |
|--------|---------|------|
| useStudents | 42 | 학생 목록 조회 |
| useStudent | 24 | 학생 상세 조회 |
| useClasses | 44 | 반 목록 조회 |
| useClassWithStudents | 47 | 반 + 학생 조회 |
| useAttendance | 31 | 출결 조회 (반별) |
| useTodayAttendance | 21 | 오늘 출결 |
| useProgress | 18 | 진도 조회 |
| useHomework | 24 | 숙제 조회 |
| useWeekHomework | 26 | 이번 주 숙제 |
| useHomeworkByDate | 33 | 날짜별 숙제 |
| useExamScores | 21 | 성적 조회 |
| useDashboardStats | 39 | 대시보드 통계 |
| useAnnouncements | 16 | 공지사항 |
| useNoticesByDate | 41 | 날짜별 공지 |
| useTodos | 18 | TODO 목록 |
| useClassScheduleDates | 40 | 수업 일정 |
| useTodayProgress | 45 | 오늘 진도 현황 |
| useTodayHomework | 64 | 오늘 숙제 현황 |
| useTodayAttendanceForTeacher | 63 | 선생님별 오늘 출결 |
| **useWeekClassesByDate** | **120** | 주간 반별 수업 (가장 복잡) |
| useWeekNoticesByDate | 76 | 주간 공지 |
| useWeekAttendanceIssuesByDate | 85 | 주간 출결 이슈 |
| useTextbooks | 59 | 교재 목록 |
| useLastProgress | 41 | 마지막 진도 |
| useLastProgressBefore | 44 | 특정 날짜 이전 진도 |
| **useClassSessions** | **182** | 반 세션 데이터 (최대) |
| **useAttendanceByDate** | **135** | 날짜별 출결 |
| **useStudentStats** | **117** | 학생 통계 |
| useProgressByDate | 40 | 날짜별 진도 |
| useAttendanceForTeacherByDate | 85 | 선생님별 날짜 출결 |
| useProgressForTeacherByDate | 72 | 선생님별 날짜 진도 |
| useHomeworkForTeacherByDate | 60 | 선생님별 날짜 숙제 |

#### Mutation Hooks (5개)
| 함수명 | 라인 수 | 용도 |
|--------|---------|------|
| useSaveAttendance | 26 | 출결 저장 |
| useSaveHomeworkSubmissions | 24 | 숙제 제출 저장 |
| useSaveExamScores | 30 | 성적 저장 |
| useSaveProgress | 32 | 진도 저장 |

### 2.2 의존성 분석

#### 외부 의존성
```typescript
// TanStack Query - 모든 훅이 사용
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Supabase 클라이언트
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// 타입 정의 (17개)
import type { Student, Class, Attendance, Progress, ... } from '@/types/database';
```

#### 내부 정의 타입 (Export)
```typescript
export interface ClassSession { ... }         // 반 세션
export interface StudentStatsData { ... }     // 학생 통계
export interface ClassAttendanceData { ... }  // 반별 출결
```

#### 훅 간 상호 의존성
- **직접 호출: 없음** (모든 훅이 독립적)
- **간접 의존성**: Mutation → invalidateQueries → Query 재실행

### 2.3 사용처 분석

| 파일 | Import 함수 |
|------|-------------|
| RecordsPage.tsx | useClasses, useAttendanceByDate, useProgress, useHomework, useExamScores |
| ClassesPage.tsx | useClasses, useClassWithStudents, useClassSessions |
| StudentsPage.tsx | useStudents, useStudentStats |
| BackofficeDemo.tsx | 20+ 함수 (대부분 사용) |
| ProgressModal.tsx | useLastProgress |

---

## 3. 분리 전략 제안

### 3.1 배럴 패턴 기반 분리

**기존 Import 유지하면서 내부 분리:**

```
hooks/
├── backoffice/
│   ├── index.ts              # 배럴 (re-export all)
│   ├── useStudents.ts        # 학생 관련 (66줄)
│   ├── useClasses.ts         # 반 관련 (100줄)
│   ├── useAttendance.ts      # 출결 관련 (350줄)
│   ├── useProgress.ts        # 진도 관련 (180줄)
│   ├── useHomework.ts        # 숙제 관련 (120줄)
│   ├── useExamScores.ts      # 성적 관련 (80줄)
│   ├── useDashboard.ts       # 대시보드 (200줄)
│   ├── useWeekData.ts        # 주간 데이터 (280줄)
│   └── types.ts              # 공통 타입
└── useBackofficeData.ts      # 호환성용 re-export
```

**배럴 파일 (index.ts):**
```typescript
// 기존 import 경로 유지
export * from './useStudents';
export * from './useClasses';
export * from './useAttendance';
// ... 모든 훅 re-export
```

**호환성 유지 (useBackofficeData.ts):**
```typescript
// 기존 파일은 단순 re-export로 유지
export * from './backoffice';
```

### 3.2 분리 그룹 상세

#### Group 1: 학생 (useStudents.ts) ~66줄
```typescript
export function useStudents(options?) { ... }
export function useStudent(studentId) { ... }
```

#### Group 2: 반 (useClasses.ts) ~100줄
```typescript
export function useClasses(options?) { ... }
export function useClassWithStudents(classId) { ... }
```

#### Group 3: 출결 (useAttendance.ts) ~350줄
```typescript
export function useAttendance(options) { ... }
export function useTodayAttendance() { ... }
export function useSaveAttendance() { ... }
export function useAttendanceByDate(teacherId, date) { ... }
export function useTodayAttendanceForTeacher(teacherId) { ... }
export function useAttendanceForTeacherByDate(teacherId, date) { ... }
export type { ClassAttendanceData }
```

#### Group 4: 진도 (useProgress.ts) ~180줄
```typescript
export function useProgress(classId) { ... }
export function useSaveProgress() { ... }
export function useTodayProgress(teacherId) { ... }
export function useLastProgress(classId) { ... }
export function useLastProgressBefore(classId, beforeDate) { ... }
export function useProgressByDate(classId, date) { ... }
export function useProgressForTeacherByDate(teacherId, date) { ... }
```

#### Group 5: 숙제 (useHomework.ts) ~120줄
```typescript
export function useHomework(classId) { ... }
export function useWeekHomework() { ... }
export function useSaveHomeworkSubmissions() { ... }
export function useHomeworkByDate(classId, date) { ... }
export function useTodayHomework(teacherId) { ... }
export function useHomeworkForTeacherByDate(teacherId, date) { ... }
```

#### Group 6: 성적 (useExamScores.ts) ~80줄
```typescript
export function useExamScores(classId) { ... }
export function useSaveExamScores() { ... }
```

#### Group 7: 대시보드/통계 (useDashboard.ts) ~200줄
```typescript
export function useDashboardStats() { ... }
export function useClassScheduleDates(teacherId, startDate, endDate) { ... }
export function useStudentStats(studentIds) { ... }
export function useClassSessions(classId, options?) { ... }
export type { ClassSession, StudentStatsData }
```

#### Group 8: 주간 데이터 (useWeekData.ts) ~280줄
```typescript
export function useWeekClassesByDate(teacherId, weekDates) { ... }
export function useWeekNoticesByDate(teacherId, startDate, endDate, myClassIds?) { ... }
export function useWeekAttendanceIssuesByDate(teacherId, startDate, endDate) { ... }
```

#### Group 9: 기타 (useMisc.ts) ~100줄
```typescript
export function useAnnouncements(limit?) { ... }
export function useNoticesByDate(date, myClassIds?, options?) { ... }
export function useTodos(userId) { ... }
export function useTextbooks(classId?) { ... }
```

### 3.3 공통 모듈 (types.ts)

```typescript
// 외부 의존성
export { supabase, isSupabaseConfigured } from '@/lib/supabase';

// 공통 타입
export type {
  Student, Class, Attendance, Progress, Homework,
  ExamScore, AttendanceStatus, ...
} from '@/types/database';

// 내부 공통 타입
export interface ProgressClassInfo { ... }
export interface TabletClassSchedule { ... }
export interface TabletNotice { ... }
export interface TabletAttendanceIssue { ... }

// 공통 상수
export const STUDENT_COLORS = [...];
export const DAY_NAMES_KO = {...};

// 공통 유틸
export function formatDateLabel(dateStr: string): string { ... }
```

---

## 4. 위험 요소 및 대응책

### 4.1 주요 위험

| 위험 | 심각도 | 대응책 |
|------|--------|--------|
| **Import 경로 변경** | 중 | 배럴 패턴으로 기존 경로 유지 |
| **순환 참조** | 중 | types.ts로 공통 의존성 분리 |
| **빌드 에러** | 고 | 단계별 분리 + 매 단계 빌드 검증 |
| **런타임 에러** | 고 | 분리 후 전체 페이지 수동 테스트 |
| **타입 누락** | 저 | TypeScript strict mode 유지 |

### 4.2 순환 참조 방지 전략

```
의존성 방향 (단방향만 허용):

types.ts (최하위)
    ↑
useStudents.ts, useClasses.ts, ... (중간)
    ↑
index.ts (배럴, 최상위)
    ↑
useBackofficeData.ts (호환성)
```

### 4.3 점진적 분리 순서

```
Phase 1: 준비
├── types.ts 생성 (공통 타입/상수 추출)
├── index.ts 생성 (빈 배럴)
└── 빌드 테스트

Phase 2: 간단한 훅 먼저
├── useStudents.ts (가장 단순)
├── useExamScores.ts
└── 빌드 테스트

Phase 3: 중간 복잡도
├── useClasses.ts
├── useHomework.ts
├── useProgress.ts
└── 빌드 테스트

Phase 4: 복잡한 훅
├── useAttendance.ts
├── useDashboard.ts
├── useWeekData.ts
└── 빌드 테스트

Phase 5: 정리
├── useMisc.ts (나머지)
├── useBackofficeData.ts → re-export만
└── 전체 테스트
```

---

## 5. Pages/Components 분리 우선순위

### 5.1 Pages (21개 대형 파일)

| 우선순위 | 파일 | 라인 | 분리 난이도 | 권장 |
|----------|------|------|-------------|------|
| 1 | BackofficeDemo.tsx | 1,285 | 중 | 탭별 분리 |
| 2 | RecordsPage.tsx | 1,103 | 중 | 탭 컴포넌트 분리 |
| 3 | OperationsPage.tsx | 1,584 | 고 | 기능별 분리 |
| 4 | IntegratedProblemBankPage.tsx | 1,493 | 고 | 모달/필터 분리 |
| 5 | PageViewer.tsx | 1,445 | 고 | 캔버스/패널 분리 |

### 5.2 Components (47개 대형 파일)

| 우선순위 | 파일 | 라인 | 분리 제안 |
|----------|------|------|----------|
| 1 | GroupPanel.tsx | 834 | GroupCard, ConfirmSection 분리 |
| 2 | PageCanvas.tsx | 681 | useCanvasLogic 훅 추출 |
| 3 | EditClassModal.tsx | 640 | 탭별 컴포넌트 이미 분리됨 ✓ |
| 4 | CropProblemBank.tsx | 593 | FilterSection, ProblemGrid 분리 |
| 5 | ProgressModal.tsx | 521 | 이미 잘 구조화됨 ✓ |

---

## 6. 결론 및 권장사항

### 6.1 즉시 실행 가능

1. **useBackofficeData.ts 분리** (최우선)
   - 가장 큰 파일 (2,287줄)
   - 배럴 패턴으로 기존 코드 수정 최소화
   - 예상 작업 시간: 2-3시간

2. **RecordsPage.tsx 탭 분리**
   - AttendanceTab, ProgressTab, HomeworkTab, GradeTab
   - 각 탭 200-300줄로 분리 가능

### 6.2 추후 고려

- Pages 분리는 기능 추가 시 점진적으로
- Components는 버그 수정 시 리팩토링 기회로 활용

### 6.3 분리하지 말아야 할 파일

| 파일 | 이유 |
|------|------|
| PageViewer.tsx | Konva 의존성이 높아 분리 시 성능 저하 우려 |
| PageCanvas.tsx | 동일 |
| 300줄 미만 파일들 | 분리 효과 미미 |

---

## 7. 참고: 분리 후 예상 구조

```
hooks/
├── backoffice/
│   ├── index.ts          # 배럴 (~30줄)
│   ├── types.ts          # 공통 타입 (~100줄)
│   ├── useStudents.ts    # 학생 (~70줄)
│   ├── useClasses.ts     # 반 (~100줄)
│   ├── useAttendance.ts  # 출결 (~350줄) ← 여전히 큼
│   ├── useProgress.ts    # 진도 (~180줄)
│   ├── useHomework.ts    # 숙제 (~120줄)
│   ├── useExamScores.ts  # 성적 (~80줄)
│   ├── useDashboard.ts   # 대시보드 (~200줄)
│   ├── useWeekData.ts    # 주간 (~280줄)
│   └── useMisc.ts        # 기타 (~100줄)
└── useBackofficeData.ts  # 호환용 re-export (~10줄)
```

**총 라인 변화**: 2,287줄 → 11개 파일, 평균 ~140줄

---

*이 리포트는 분석 목적으로만 작성되었습니다. 실제 개발은 별도 요청 시 진행됩니다.*
