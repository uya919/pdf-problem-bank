# 시험 관리 시스템 상세 개발 계획

**문서 번호**: 420
**작성일**: 2025-12-22
**Stage**: 19 (신규)
**연구 리포트**: [419_exam_management_system_ux_research.md](419_exam_management_system_ux_research.md)
**HTML 목업**: [mockups/exam_management_system.html](mockups/exam_management_system.html)

---

## 1. 개요

### 1.1 목표
학년별 반배정 시험 관리 시스템 구현
- 시험 생성 (기본정보 + 문항수)
- O/X 기반 빠른 채점
- 결과 분석 (점수 분포, 오답률)
- 반배정 (드래그&드롭)

### 1.2 핵심 제약
- **PC 전용** (관리자 운영페이지)
- **O/X 입력만** (텍스트 답안 입력은 추후)
- **균등 배점** (개별 배점은 추후)
- **Mock 데이터 우선** (Supabase 연동은 19-G Phase)

---

## 2. 파일 생성 순서 (의존성 기반)

```
1. types/exam.ts              ← 타입 정의 (의존성 없음)
2. api/exams.ts               ← Mock API (types/exam.ts 의존)
3. hooks/useExams.ts          ← React Query 훅 (api/exams.ts 의존)
4. components/admin/exam/     ← UI 컴포넌트 (hooks/useExams.ts 의존)
5. pages/admin/ExamManagement.tsx ← 메인 페이지
6. App.tsx 라우팅 추가
7. AdminSidebar.tsx 메뉴 추가
```

---

## 3. Phase별 상세 계획

### Phase 19-A: 타입 및 기반 설정 (30분)

#### 3.1.1 파일: `frontend/src/types/exam.ts`

```typescript
/**
 * 시험 관리 시스템 타입 정의
 * @module types/exam
 */

// ===== 기본 Enum =====
export type Subject = 'math' | 'english' | 'korean';
export type ExamType = 'level_test' | 'weekly' | 'monthly' | 'mock' | 'other';
export type ExamStatus = 'draft' | 'scoring' | 'completed';
export type CriteriaType = 'score_cut' | 'percentage' | 'count';
export type AnswerStatus = 'correct' | 'wrong' | 'none';

// ===== 시험 기본 정보 =====
export interface Exam {
  id: string;
  name: string;
  exam_date: string;           // 'YYYY-MM-DD'
  subject: Subject;
  grade: string;               // '중1', '중2', '고1' 등
  exam_type: ExamType;
  total_questions: number;     // 문항 수
  total_score: number;         // 총점 (균등배점: 문항수 * 5)
  status: ExamStatus;
  created_at: string;
  // 집계 필드 (목록용)
  attended_count?: number;     // 응시 인원
  total_students?: number;     // 전체 인원
  average_score?: number;      // 평균 점수
  input_progress?: number;     // 입력 진행률 (0-100)
}

// ===== 학생 답안 (O/X만) =====
export interface StudentAnswer {
  student_id: string;
  student_name: string;
  answers: AnswerStatus[];     // 문항별 정오 (index = 문항번호-1)
  total_score: number;         // 총점
  wrong_questions: number[];   // 오답 문항 번호 목록
}

// ===== 시험 결과 (순위 포함) =====
export interface ExamResult {
  student_id: string;
  student_name: string;
  total_score: number;
  rank: number;
  wrong_questions: number[];
  assigned_class?: string;     // 'A', 'B', 'C', 'D'
}

// ===== 반배정 기준 =====
export interface ClassCriteria {
  class_count: 3 | 4;
  criteria_type: CriteriaType;
  classes: ClassCriteriaItem[];
}

export interface ClassCriteriaItem {
  class_name: string;          // 'A', 'B', 'C', 'D'
  class_label: string;         // '심화', '정규', '기초', '보충'
  min_score?: number;          // score_cut용
  max_score?: number;
  top_percent?: number;        // percentage용
  bottom_percent?: number;
  count?: number;              // count용
}

// ===== 시험 상세 (관계 포함) =====
export interface ExamDetail {
  exam: Exam;
  answers: StudentAnswer[];
  results: ExamResult[];
  criteria?: ClassCriteria;
}

// ===== 생성 입력 =====
export interface CreateExamInput {
  name: string;
  exam_date: string;
  subject: Subject;
  grade: string;
  exam_type: ExamType;
  total_questions: number;
}

// ===== 필터 =====
export interface ExamFilters {
  subject?: Subject;
  grade?: string;
  month?: string;              // 'YYYY-MM'
  search?: string;
}

// ===== 상수 =====
export const SUBJECT_LABELS: Record<Subject, string> = {
  math: '수학',
  english: '영어',
  korean: '국어',
};

export const SUBJECT_COLORS: Record<Subject, { bg: string; text: string; dot: string }> = {
  math: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  english: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  korean: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
};

export const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  level_test: '레벨테스트',
  weekly: '주간 테스트',
  monthly: '월말 평가',
  mock: '모의고사',
  other: '기타',
};

export const EXAM_STATUS_LABELS: Record<ExamStatus, { label: string; color: string }> = {
  draft: { label: '준비 중', color: 'bg-grey-100 text-grey-600' },
  scoring: { label: '입력 중', color: 'bg-yellow-100 text-yellow-700' },
  completed: { label: '채점 완료', color: 'bg-green-100 text-green-700' },
};

export const GRADE_OPTIONS = [
  '초4', '초5', '초6',
  '중1', '중2', '중3',
  '고1', '고2', '고3',
];
```

#### 3.1.2 파일: `frontend/src/api/exams.ts`

```typescript
/**
 * 시험 관리 Mock API
 * @module api/exams
 */

import type {
  Exam,
  ExamDetail,
  ExamFilters,
  CreateExamInput,
  StudentAnswer,
  ExamResult,
  ClassCriteria,
  AnswerStatus,
} from '../types/exam';

// ===== Mock 데이터 =====
const MOCK_STUDENTS = [
  { id: 's1', name: '김민수' },
  { id: 's2', name: '이영희' },
  { id: 's3', name: '박철수' },
  { id: 's4', name: '최지원' },
  { id: 's5', name: '정수진' },
  { id: 's6', name: '강동원' },
  { id: 's7', name: '한소희' },
  { id: 's8', name: '송지효' },
  { id: 's9', name: '전소민' },
  { id: 's10', name: '유재석' },
];

let mockExams: Exam[] = [
  {
    id: 'exam-1',
    name: '중1 12월 레벨테스트',
    exam_date: '2025-12-20',
    subject: 'math',
    grade: '중1',
    exam_type: 'level_test',
    total_questions: 20,
    total_score: 100,
    status: 'completed',
    created_at: '2025-12-15T09:00:00Z',
    attended_count: 45,
    total_students: 48,
    average_score: 72,
    input_progress: 100,
  },
  {
    id: 'exam-2',
    name: '중2 주간 테스트 #48',
    exam_date: '2025-12-18',
    subject: 'english',
    grade: '중2',
    exam_type: 'weekly',
    total_questions: 10,
    total_score: 100,
    status: 'scoring',
    created_at: '2025-12-17T09:00:00Z',
    attended_count: 32,
    total_students: 35,
    average_score: undefined,
    input_progress: 87,
  },
  {
    id: 'exam-3',
    name: '고1 월말평가',
    exam_date: '2025-12-15',
    subject: 'korean',
    grade: '고1',
    exam_type: 'monthly',
    total_questions: 25,
    total_score: 100,
    status: 'completed',
    created_at: '2025-12-10T09:00:00Z',
    attended_count: 28,
    total_students: 28,
    average_score: 68,
    input_progress: 100,
  },
];

// 학생별 답안 생성 (Mock)
function generateMockAnswers(examId: string, totalQuestions: number): StudentAnswer[] {
  return MOCK_STUDENTS.map((student, idx) => {
    const answers: AnswerStatus[] = [];
    const wrongQuestions: number[] = [];

    for (let q = 1; q <= totalQuestions; q++) {
      // 랜덤하게 정오 결정 (점수 분포용)
      const isCorrect = Math.random() > 0.2 - idx * 0.02;
      if (isCorrect) {
        answers.push('correct');
      } else {
        answers.push('wrong');
        wrongQuestions.push(q);
      }
    }

    const correctCount = answers.filter(a => a === 'correct').length;
    const scorePerQuestion = 100 / totalQuestions;

    return {
      student_id: student.id,
      student_name: student.name,
      answers,
      total_score: Math.round(correctCount * scorePerQuestion),
      wrong_questions: wrongQuestions,
    };
  });
}

// ===== API 함수 =====

/**
 * 시험 목록 조회
 */
export async function getExams(filters?: ExamFilters): Promise<Exam[]> {
  await new Promise(resolve => setTimeout(resolve, 300)); // 네트워크 시뮬레이션

  let result = [...mockExams];

  if (filters?.subject) {
    result = result.filter(e => e.subject === filters.subject);
  }
  if (filters?.grade) {
    result = result.filter(e => e.grade === filters.grade);
  }
  if (filters?.month) {
    result = result.filter(e => e.exam_date.startsWith(filters.month));
  }
  if (filters?.search) {
    const query = filters.search.toLowerCase();
    result = result.filter(e => e.name.toLowerCase().includes(query));
  }

  return result.sort((a, b) =>
    new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime()
  );
}

/**
 * 시험 상세 조회
 */
export async function getExamDetail(examId: string): Promise<ExamDetail> {
  await new Promise(resolve => setTimeout(resolve, 200));

  const exam = mockExams.find(e => e.id === examId);
  if (!exam) throw new Error('시험을 찾을 수 없습니다');

  const answers = generateMockAnswers(examId, exam.total_questions);

  // 순위 계산
  const sortedAnswers = [...answers].sort((a, b) => b.total_score - a.total_score);
  const results: ExamResult[] = sortedAnswers.map((a, idx) => ({
    student_id: a.student_id,
    student_name: a.student_name,
    total_score: a.total_score,
    rank: idx + 1,
    wrong_questions: a.wrong_questions,
  }));

  return { exam, answers, results };
}

/**
 * 시험 생성
 */
export async function createExam(input: CreateExamInput): Promise<Exam> {
  await new Promise(resolve => setTimeout(resolve, 300));

  const newExam: Exam = {
    id: `exam-${Date.now()}`,
    ...input,
    total_score: input.total_questions * 5, // 균등 배점 (문항당 5점 가정 → 100점 만점)
    status: 'draft',
    created_at: new Date().toISOString(),
    attended_count: 0,
    total_students: 0,
    input_progress: 0,
  };

  mockExams.unshift(newExam);
  return newExam;
}

/**
 * 답안 저장 (O/X)
 */
export async function saveAnswers(
  examId: string,
  studentId: string,
  answers: AnswerStatus[]
): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 200));
  // Mock에서는 실제 저장 생략
  console.log('답안 저장:', { examId, studentId, answers });
}

/**
 * 반배정 적용
 */
export async function applyClassAssignment(
  examId: string,
  assignments: { studentId: string; className: string }[]
): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 300));
  console.log('반배정 적용:', { examId, assignments });
}

/**
 * 시험 삭제
 */
export async function deleteExam(examId: string): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 200));
  mockExams = mockExams.filter(e => e.id !== examId);
}

export const examApi = {
  getExams,
  getExamDetail,
  createExam,
  saveAnswers,
  applyClassAssignment,
  deleteExam,
};
```

#### 3.1.3 파일: `frontend/src/hooks/useExams.ts`

```typescript
/**
 * 시험 관리 React Query 훅
 * @module hooks/useExams
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { examApi } from '../api/exams';
import type { ExamFilters, CreateExamInput, AnswerStatus } from '../types/exam';

// ===== Query Keys =====
export const examKeys = {
  all: ['exams'] as const,
  list: (filters?: ExamFilters) => [...examKeys.all, 'list', filters] as const,
  detail: (id: string) => [...examKeys.all, 'detail', id] as const,
};

// ===== 조회 훅 =====

/**
 * 시험 목록 조회
 */
export function useExams(filters?: ExamFilters) {
  return useQuery({
    queryKey: examKeys.list(filters),
    queryFn: () => examApi.getExams(filters),
    staleTime: 30 * 1000, // 30초 캐시
  });
}

/**
 * 시험 상세 조회
 */
export function useExamDetail(examId: string | null) {
  return useQuery({
    queryKey: examKeys.detail(examId || ''),
    queryFn: () => examApi.getExamDetail(examId!),
    enabled: !!examId,
    staleTime: 10 * 1000, // 10초 캐시
  });
}

// ===== 변경 훅 =====

/**
 * 시험 생성
 */
export function useCreateExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateExamInput) => examApi.createExam(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.all });
    },
  });
}

/**
 * 답안 저장
 */
export function useSaveAnswers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      examId,
      studentId,
      answers,
    }: {
      examId: string;
      studentId: string;
      answers: AnswerStatus[];
    }) => examApi.saveAnswers(examId, studentId, answers),
    onSuccess: (_, { examId }) => {
      queryClient.invalidateQueries({ queryKey: examKeys.detail(examId) });
    },
  });
}

/**
 * 반배정 적용
 */
export function useApplyClassAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      examId,
      assignments,
    }: {
      examId: string;
      assignments: { studentId: string; className: string }[];
    }) => examApi.applyClassAssignment(examId, assignments),
    onSuccess: (_, { examId }) => {
      queryClient.invalidateQueries({ queryKey: examKeys.detail(examId) });
    },
  });
}

/**
 * 시험 삭제
 */
export function useDeleteExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (examId: string) => examApi.deleteExam(examId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.all });
    },
  });
}
```

#### 3.1.4 완료 기준
- [x] `npm run build` 성공
- [x] 타입 에러 없음
- [x] Mock 데이터 정상 반환

---

### Phase 19-B: 시험 목록 UI (40분)

#### 3.2.1 컴포넌트 구조

```
frontend/src/components/admin/exam/
├── index.ts              # re-export
├── ExamList.tsx          # 시험 목록 (카드 컨테이너)
├── ExamCard.tsx          # 개별 시험 카드
└── ExamFilters.tsx       # 필터 (과목 탭 + 월 + 검색)
```

#### 3.2.2 파일: `ExamCard.tsx`

```typescript
/**
 * 시험 카드 컴포넌트
 * - 시험 기본 정보 표시
 * - 상태 뱃지 (입력중/완료)
 * - 클릭 시 상세로 이동
 */
interface ExamCardProps {
  exam: Exam;
  onClick: () => void;
}
```

**핵심 UI 요소:**
- 아이콘 + 시험명 + 날짜
- 과목 도트 + 문항수 + 응시인원 + 평균점수
- 상태 뱃지 (completed: 녹색, scoring: 노랑 펄스)
- 진행률 바 (scoring 상태만)
- 반배정 뱃지 (A반 12명, B반 15명...)

#### 3.2.3 파일: `ExamFilters.tsx`

```typescript
/**
 * 시험 필터 컴포넌트
 * - 과목 탭 (전체/국어/영어/수학)
 * - 월 선택 드롭다운
 * - 검색 입력
 */
interface ExamFiltersProps {
  filters: ExamFilters;
  onChange: (filters: ExamFilters) => void;
}
```

#### 3.2.4 완료 기준
- [ ] 시험 목록 렌더링
- [ ] 과목 필터 동작
- [ ] 월 선택 동작
- [ ] 검색 동작
- [ ] 카드 클릭 이벤트

---

### Phase 19-C: 시험 생성 모달 (40분)

#### 3.3.1 파일: `CreateExamModal.tsx`

```typescript
/**
 * 시험 생성 모달
 * - 간단한 단일 화면 폼
 * - Stepper UI는 복잡하므로 단일 폼으로 단순화
 */
interface CreateExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (exam: Exam) => void;
}
```

**입력 필드:**
1. 시험명 (text, required)
2. 시험일자 (date, required)
3. 과목 (select: 국어/영어/수학)
4. 학년 (select: 초4~고3)
5. 시험유형 (radio: 레벨테스트/주간/월말/모의고사/기타)
6. 문항수 (number, 5~30)

**저장 로직:**
- 총점 자동계산: 100점 (문항수와 무관, 균등배점)
- status: 'draft'

#### 3.3.2 완료 기준
- [ ] 모달 열기/닫기
- [ ] 폼 유효성 검사
- [ ] 생성 후 목록 갱신

---

### Phase 19-D: 성적 입력 UI - 핵심 (60분)

#### 3.4.1 파일: `ScoreInputView.tsx`

```typescript
/**
 * 성적 입력 화면 (메인)
 * - 좌측: 학생 목록 (입력 상태 표시)
 * - 우측: 선택된 학생의 O/X 그리드
 */
interface ScoreInputViewProps {
  examId: string;
  onBack: () => void;
}
```

#### 3.4.2 파일: `StudentAnswerGrid.tsx`

```typescript
/**
 * O/X 버튼 그리드
 * - 10열 그리드 (문항 1~10, 11~20...)
 * - 클릭: 미입력 → O → X → O (순환)
 * - 키보드: O/X 키로 순차 입력
 */
interface StudentAnswerGridProps {
  totalQuestions: number;
  answers: AnswerStatus[];
  onChange: (answers: AnswerStatus[]) => void;
}
```

**핵심 인터랙션:**
- 버튼 클릭 토글: none → correct → wrong → correct
- 전체 O / 전체 X / 초기화 버튼
- 키보드 O/X 입력 (미입력 첫 문항에 자동 적용)
- 요약: 정답 N개, 오답 M개, 오답문항 목록

#### 3.4.3 파일: `StudentSelector.tsx`

```typescript
/**
 * 학생 선택 그리드
 * - 이름 + 점수 표시
 * - 입력 상태: ✓ 완료 / ● 입력중 / ○ 미입력
 */
interface StudentSelectorProps {
  students: StudentAnswer[];
  selectedId: string | null;
  onSelect: (studentId: string) => void;
}
```

#### 3.4.4 완료 기준
- [ ] 학생 목록 표시
- [ ] 학생 선택 시 O/X 그리드 표시
- [ ] O/X 토글 동작
- [ ] 전체 O/X 버튼
- [ ] 점수 자동 계산
- [ ] 이전/다음 학생 이동

---

### Phase 19-E: 결과 분석 UI (40분)

#### 3.5.1 파일: `ExamAnalysisView.tsx`

```typescript
/**
 * 결과 분석 화면
 * - 통계 카드: 응시인원, 평균, 최고, 최저
 * - 점수 분포 막대그래프
 * - 오답률 TOP 5 테이블
 * - 전체 순위 테이블
 */
interface ExamAnalysisViewProps {
  examId: string;
  onAssign: () => void;  // 반배정 화면으로
  onBack: () => void;
}
```

#### 3.5.2 컴포넌트 분리

```typescript
// StatCard: 응시인원/평균/최고/최저
// ScoreDistribution: 점수대별 막대 그래프
// WrongAnswerTop5: 오답률 TOP 5 테이블
// RankingTable: 순위/이름/점수/오답문항/추천반
```

#### 3.5.3 계산 로직

```typescript
// 점수 분포 계산
function calculateDistribution(results: ExamResult[]) {
  const ranges = [
    { label: '90점 이상', min: 90, max: 100 },
    { label: '80~89점', min: 80, max: 89 },
    { label: '70~79점', min: 70, max: 79 },
    { label: '60~69점', min: 60, max: 69 },
    { label: '60점 미만', min: 0, max: 59 },
  ];

  return ranges.map(range => ({
    ...range,
    count: results.filter(r =>
      r.total_score >= range.min && r.total_score <= range.max
    ).length,
  }));
}

// 문항별 오답률 계산
function calculateWrongRates(answers: StudentAnswer[], totalQuestions: number) {
  const wrongCounts = new Array(totalQuestions).fill(0);

  answers.forEach(a => {
    a.answers.forEach((status, idx) => {
      if (status === 'wrong') wrongCounts[idx]++;
    });
  });

  return wrongCounts.map((count, idx) => ({
    question: idx + 1,
    wrongRate: Math.round((count / answers.length) * 100),
  })).sort((a, b) => b.wrongRate - a.wrongRate);
}
```

#### 3.5.4 완료 기준
- [ ] 통계 카드 4개 표시
- [ ] 점수 분포 막대 그래프
- [ ] 오답률 TOP 5
- [ ] 순위 테이블 (스크롤)
- [ ] "반배정 하기" 버튼

---

### Phase 19-F: 반배정 UI (50분)

#### 3.6.1 파일: `ClassAssignmentView.tsx`

```typescript
/**
 * 반배정 화면
 * - 상단: 배정 기준 설정 (3가지 방식)
 * - 하단: 반별 미리보기 (드래그&드롭)
 */
interface ClassAssignmentViewProps {
  examId: string;
  onApply: () => void;
  onBack: () => void;
}
```

#### 3.6.2 파일: `CriteriaSelector.tsx`

```typescript
/**
 * 반배정 기준 선택
 * - 반 개수: 3개 / 4개
 * - 방식: 점수컷 / 비율 / 인원수
 */
interface CriteriaSelectorProps {
  value: ClassCriteria;
  onChange: (criteria: ClassCriteria) => void;
  onCalculate: () => void;
}
```

**기준 방식:**
1. **점수컷**: A반 90점↑, B반 75~89, C반 60~74, D반 60↓
2. **비율**: A반 상위25%, B반 25~50%, C반 50~75%, D반 하위25%
3. **인원수**: A반 10명, B반 12명, C반 13명, D반 10명

#### 3.6.3 파일: `ClassPreviewCards.tsx`

```typescript
/**
 * 반별 미리보기 카드
 * - 드래그 가능한 학생 카드
 * - 드롭존 (다른 반으로 이동)
 */
interface ClassPreviewCardsProps {
  classes: {
    name: string;
    label: string;
    students: ExamResult[];
    averageScore: number;
  }[];
  onMoveStudent: (studentId: string, fromClass: string, toClass: string) => void;
}
```

#### 3.6.4 드래그&드롭 구현

```typescript
// HTML5 Drag and Drop API 사용
const handleDragStart = (e: DragEvent, studentId: string) => {
  e.dataTransfer?.setData('studentId', studentId);
};

const handleDrop = (e: DragEvent, targetClass: string) => {
  const studentId = e.dataTransfer?.getData('studentId');
  if (studentId) {
    onMoveStudent(studentId, currentClass, targetClass);
  }
};
```

#### 3.6.5 완료 기준
- [ ] 반 개수 선택 (3/4)
- [ ] 배정 방식 선택
- [ ] 자동 계산 결과 표시
- [ ] 드래그&드롭 학생 이동
- [ ] "배정 적용하기" 버튼

---

### Phase 19-G: 메인 페이지 + 라우팅 (30분)

#### 3.7.1 파일: `pages/admin/ExamManagement.tsx`

```typescript
/**
 * 시험 관리 메인 페이지
 * - 뷰 상태: list | create | input | analysis | assign
 * - 선택된 시험 ID 관리
 */
export default function ExamManagement() {
  const [view, setView] = useState<'list' | 'input' | 'analysis' | 'assign'>('list');
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);

  // 뷰 전환 핸들러
  const handleExamClick = (exam: Exam) => {
    setSelectedExamId(exam.id);
    setView(exam.status === 'completed' ? 'analysis' : 'input');
  };

  return (
    <div className="min-h-screen bg-grey-50">
      <AdminTopNav />
      <main className="pt-20 pb-12 max-w-7xl mx-auto px-6">
        {view === 'list' && (
          <ExamListView
            onCreateClick={() => setCreateModalOpen(true)}
            onExamClick={handleExamClick}
          />
        )}
        {view === 'input' && selectedExamId && (
          <ScoreInputView
            examId={selectedExamId}
            onBack={() => setView('list')}
          />
        )}
        {view === 'analysis' && selectedExamId && (
          <ExamAnalysisView
            examId={selectedExamId}
            onAssign={() => setView('assign')}
            onBack={() => setView('list')}
          />
        )}
        {view === 'assign' && selectedExamId && (
          <ClassAssignmentView
            examId={selectedExamId}
            onApply={() => setView('list')}
            onBack={() => setView('analysis')}
          />
        )}
      </main>

      <CreateExamModal
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={(exam) => {
          setCreateModalOpen(false);
          setSelectedExamId(exam.id);
          setView('input');
        }}
      />
    </div>
  );
}
```

#### 3.7.2 라우팅 추가 (`App.tsx`)

```typescript
// 상단 import 추가
import ExamManagement from './pages/admin/ExamManagement';

// Routes 내부 추가
<Route path="admin/exams" element={
  <ProtectedRoute roles={['admin', 'owner']}>
    <ExamManagement />
  </ProtectedRoute>
} />
<Route path="admin/exams/input" element={
  <ProtectedRoute roles={['admin', 'owner']}>
    <ExamManagement />
  </ProtectedRoute>
} />
<Route path="admin/exams/analysis" element={
  <ProtectedRoute roles={['admin', 'owner']}>
    <ExamManagement />
  </ProtectedRoute>
} />
```

#### 3.7.3 사이드바 메뉴 추가 (`AdminSidebar.tsx`)

```typescript
// MENU_ITEMS 배열의 exams 항목 수정
{
  id: 'exams',
  label: '시험/성적',
  icon: <ClipboardList className="w-5 h-5" />,
  children: [
    { label: '시험 관리', path: '/admin/exams' },
    { label: '성적 입력', path: '/admin/exams/input' },
    { label: '성적 분석', path: '/admin/exams/analysis' },
  ],
},
```

#### 3.7.4 OperationsPage 메뉴 추가

```typescript
// MENU_SECTIONS의 '운영 도구' 섹션에 추가
{ id: 'exams', icon: <ClipboardList className="w-5 h-5" />, label: '시험 관리' },

// handleMenuClick에 추가
if (menuId === 'exams') {
  navigate('/admin/exams');
  return;
}
```

#### 3.7.5 완료 기준
- [ ] `/admin/exams` 접근 가능
- [ ] 사이드바에서 "시험 관리" 클릭 시 이동
- [ ] 운영페이지에서 "시험 관리" 클릭 시 이동
- [ ] 뷰 전환 정상 동작
- [ ] 빌드 성공

---

### Phase 19-H: Supabase 연동 (추후)

> 이 Phase는 Mock 데이터로 UI가 완성된 후 진행

#### 3.8.1 DB 마이그레이션

```sql
-- 시험 기본 정보
CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  exam_date DATE NOT NULL,
  subject TEXT NOT NULL CHECK (subject IN ('math', 'english', 'korean')),
  grade TEXT NOT NULL,
  exam_type TEXT NOT NULL,
  total_questions INTEGER NOT NULL,
  total_score INTEGER NOT NULL DEFAULT 100,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scoring', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 학생별 답안 (O/X)
CREATE TABLE exam_student_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id),
  answers JSONB NOT NULL,  -- ['correct', 'wrong', 'none', ...]
  total_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_id, student_id)
);

-- 반배정 결과
CREATE TABLE exam_class_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id),
  assigned_class TEXT NOT NULL,  -- 'A', 'B', 'C', 'D'
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_id, student_id)
);

-- RLS 정책
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_class_assignments ENABLE ROW LEVEL SECURITY;

-- admin/owner만 접근 가능
CREATE POLICY "Admin can manage exams" ON exams
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner')
    )
  );
```

#### 3.8.2 API 수정

```typescript
// api/exams.ts 수정
import { supabase } from '../lib/supabase';

export async function getExams(filters?: ExamFilters): Promise<Exam[]> {
  let query = supabase
    .from('exams')
    .select('*')
    .order('exam_date', { ascending: false });

  if (filters?.subject) query = query.eq('subject', filters.subject);
  if (filters?.grade) query = query.eq('grade', filters.grade);
  if (filters?.month) query = query.gte('exam_date', `${filters.month}-01`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}
```

---

## 4. 예상 에러 및 해결책

| 에러 | 원인 | 해결책 |
|------|------|--------|
| `Type 'Subject' is not assignable to 'string'` | 타입 불일치 | `as Subject` 캐스팅 또는 타입 가드 |
| `Cannot find module '../types/exam'` | 파일 미생성 | Phase 19-A 먼저 완료 |
| `Object is possibly 'undefined'` | Optional 필드 | `?.` 옵셔널 체이닝 또는 기본값 |
| 드래그 시 깜빡임 | CSS transition 충돌 | `dragging` 상태로 스타일 분리 |
| 키보드 O/X 미동작 | 이벤트 리스너 누락 | `useEffect`로 document 이벤트 등록 |

---

## 5. 테스트 체크리스트

### 5.1 Phase별 빌드 테스트
```bash
cd frontend
npm run build
```

### 5.2 기능 테스트

#### 시험 목록
- [ ] 시험 카드 표시
- [ ] 필터 동작 (과목/월/검색)
- [ ] 상태별 뱃지 표시

#### 시험 생성
- [ ] 모달 열기/닫기
- [ ] 필수 필드 검증
- [ ] 생성 후 목록 갱신

#### 성적 입력
- [ ] 학생 선택
- [ ] O/X 버튼 토글
- [ ] 전체 O/X 버튼
- [ ] 키보드 입력
- [ ] 점수 자동 계산
- [ ] 이전/다음 학생 이동

#### 결과 분석
- [ ] 통계 카드 표시
- [ ] 점수 분포 그래프
- [ ] 오답률 TOP 5
- [ ] 순위 테이블

#### 반배정
- [ ] 기준 선택
- [ ] 자동 계산
- [ ] 드래그&드롭 이동
- [ ] 배정 적용

---

## 6. 소요 시간 예측

| Phase | 작업 | 예상 시간 |
|-------|------|----------|
| 19-A | 타입 + API + 훅 | 30분 |
| 19-B | 시험 목록 UI | 40분 |
| 19-C | 시험 생성 모달 | 40분 |
| 19-D | 성적 입력 UI (핵심) | 60분 |
| 19-E | 결과 분석 UI | 40분 |
| 19-F | 반배정 UI | 50분 |
| 19-G | 메인 페이지 + 라우팅 | 30분 |
| **총합** | | **4시간 50분** |

---

## 7. 다음 단계

1. **Phase 19-A 진행**: "Phase 19-A 진행해줘"
2. **전체 진행**: "Stage 19 진행해줘"
3. **특정 Phase만**: "Phase 19-D 진행해줘" (성적 입력 UI만)

---

*단계별 상세 개발 계획 작성 완료. 개발은 별도 요청 시 진행.*
