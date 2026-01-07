/**
 * 반 관리 훅
 * TanStack Query를 사용한 반 CRUD
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getClasses,
  getClass,
  createClass,
  updateClass,
  deleteClass,
  deactivateClass,
  activateClass,
  getTeachers,
  getGrades,
  getSubjects,
  getClassStudentCounts,
  getStudentsByClass,
  ClassFilters,
  CreateClassInput,
  UpdateClassInput,
} from '../api/classes';

// Query keys
const classesKeys = {
  all: ['classes'] as const,
  lists: () => [...classesKeys.all, 'list'] as const,
  list: (filters?: ClassFilters) => [...classesKeys.lists(), filters] as const,
  details: () => [...classesKeys.all, 'detail'] as const,
  detail: (id: string) => [...classesKeys.details(), id] as const,
  studentCounts: () => [...classesKeys.all, 'studentCounts'] as const,
  students: (classId: string) => [...classesKeys.all, 'students', classId] as const,
};

const teachersKeys = {
  all: ['teachers'] as const,
  list: () => [...teachersKeys.all, 'list'] as const,
};

const gradesKeys = {
  all: ['grades'] as const,
  list: () => [...gradesKeys.all, 'list'] as const,
};

const subjectsKeys = {
  all: ['subjects'] as const,
  list: () => [...subjectsKeys.all, 'list'] as const,
};

/**
 * 반 목록 조회
 */
export function useClasses(filters?: ClassFilters) {
  return useQuery({
    queryKey: classesKeys.list(filters),
    queryFn: () => getClasses(filters),
  });
}

/**
 * 반별 학생 수 조회
 */
export function useClassStudentCounts() {
  return useQuery({
    queryKey: classesKeys.studentCounts(),
    queryFn: getClassStudentCounts,
  });
}

/**
 * 반에 등록된 학생 목록 조회
 * @param classId - 반 ID (null이면 비활성화)
 */
export function useClassStudents(classId: string | null) {
  return useQuery({
    queryKey: classesKeys.students(classId || ''),
    queryFn: () => getStudentsByClass(classId!),
    enabled: !!classId,
    staleTime: 30 * 1000, // 30초 캐시
  });
}

/**
 * 반 상세 조회
 */
export function useClass(id: string) {
  return useQuery({
    queryKey: classesKeys.detail(id),
    queryFn: () => getClass(id),
    enabled: !!id,
  });
}

/**
 * 반 생성
 */
export function useCreateClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateClassInput) => createClass(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classesKeys.lists() });
    },
  });
}

/**
 * 반 수정
 */
export function useUpdateClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateClassInput }) =>
      updateClass(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: classesKeys.lists() });
      queryClient.setQueryData(classesKeys.detail(data.id), data);
    },
  });
}

/**
 * 반 삭제
 */
export function useDeleteClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteClass(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classesKeys.lists() });
    },
  });
}

/**
 * 반 비활성화
 */
export function useDeactivateClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deactivateClass(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: classesKeys.lists() });
      queryClient.setQueryData(classesKeys.detail(data.id), data);
    },
  });
}

/**
 * 반 활성화
 */
export function useActivateClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => activateClass(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: classesKeys.lists() });
      queryClient.setQueryData(classesKeys.detail(data.id), data);
    },
  });
}

/**
 * 강사 목록 조회
 */
export function useTeachers() {
  return useQuery({
    queryKey: teachersKeys.list(),
    queryFn: getTeachers,
  });
}

/**
 * 학년 목록 조회
 */
export function useGrades() {
  return useQuery({
    queryKey: gradesKeys.list(),
    queryFn: getGrades,
  });
}

/**
 * 과목 목록 조회
 */
export function useSubjects() {
  return useQuery({
    queryKey: subjectsKeys.list(),
    queryFn: getSubjects,
  });
}

// 헬퍼 함수들
// JavaScript Date.getDay() 표준: 0=일요일, 1=월요일, ...
export const DAY_NAMES: Record<number, string> = {
  0: '일',
  1: '월',
  2: '화',
  3: '수',
  4: '목',
  5: '금',
  6: '토',
};

export const SUBJECT_COLORS: Record<string, { bg: string; text: string }> = {
  math: { bg: 'bg-blue-100', text: 'text-blue-700' },
  korean: { bg: 'bg-amber-100', text: 'text-amber-700' },
  english: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  science: { bg: 'bg-violet-100', text: 'text-violet-700' },
  수학: { bg: 'bg-blue-100', text: 'text-blue-700' },
  국어: { bg: 'bg-amber-100', text: 'text-amber-700' },
  영어: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  과학: { bg: 'bg-violet-100', text: 'text-violet-700' },
};

export function formatSchedule(dayOfWeek: number[] | null, startTime: string | null, endTime: string | null): string {
  if (!dayOfWeek?.length || !startTime) return '-';

  const days = dayOfWeek.map(d => DAY_NAMES[d] || '').join(',');
  const start = startTime?.slice(0, 5) || '';
  const end = endTime?.slice(0, 5) || '';

  return `${days} ${start}${end ? '~' + end : ''}`;
}

/**
 * 요일별 수업 시간 포맷팅 (Stage 34)
 * - 모든 시간 동일: "월,수,목 18:30~20:30"
 * - 시간 다름: "월,수 18:30~20:30 / 목 19:00~21:00"
 */
export function formatScheduleWithTimes(
  dayOfWeek: number[] | null,
  startTimes: string[] | null,
  endTimes: string[] | null,
  startTime: string | null,
  endTime: string | null
): string {
  if (!dayOfWeek?.length) return '-';

  // 배열이 없으면 기존 방식
  if (!startTimes || !endTimes || startTimes.length === 0) {
    return formatSchedule(dayOfWeek, startTime, endTime);
  }

  // 시간별 요일 그룹화
  const timeGroups = new Map<string, number[]>();

  dayOfWeek.forEach((day, idx) => {
    const start = startTimes[idx]?.slice(0, 5) || startTime?.slice(0, 5) || '00:00';
    const end = endTimes[idx]?.slice(0, 5) || endTime?.slice(0, 5) || '00:00';
    const key = `${start}~${end}`;

    if (!timeGroups.has(key)) {
      timeGroups.set(key, []);
    }
    timeGroups.get(key)!.push(day);
  });

  // 그룹이 1개면 기존 형식
  if (timeGroups.size === 1) {
    const [timeRange, days] = [...timeGroups.entries()][0];
    const dayStr = days.map(d => DAY_NAMES[d]).join(',');
    return `${dayStr} ${timeRange}`;
  }

  // 그룹이 여러 개면 "요일 시간 / 요일 시간" 형식
  return [...timeGroups.entries()]
    .sort((a, b) => Math.min(...a[1]) - Math.min(...b[1])) // 요일 순 정렬
    .map(([timeRange, days]) => {
      const dayStr = days.map(d => DAY_NAMES[d]).join(',');
      return `${dayStr} ${timeRange}`;
    })
    .join(' / ');
}

export function getSubjectColor(subject: string): { bg: string; text: string } {
  return SUBJECT_COLORS[subject] || { bg: 'bg-grey-100', text: 'text-grey-700' };
}

/**
 * 반 이름에서 학년 추출
 * ex) "고1_국어" → "고1"
 *     "중2_수학A" → "중2"
 *     "초3_영어" → "초3"
 */
export function extractGradeFromName(name: string): string | null {
  // 패턴: 초/중/고 + 숫자
  const match = name.match(/^(초|중|고)\d/);
  if (match) {
    return match[0];
  }
  return null;
}
