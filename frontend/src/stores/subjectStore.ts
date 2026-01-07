/**
 * Phase 1: 전역 과목 필터 Store
 *
 * 수학/영어/국어/전체 과목 필터링
 * - localStorage persist로 새로고침 후에도 유지
 * - 모든 Admin 페이지에서 공유
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Subject = 'math' | 'english' | 'korean' | 'all';

export const SUBJECT_LABELS: Record<Subject, string> = {
  math: '수학',
  english: '영어',
  korean: '국어',
  all: '전체',
};

export const SUBJECT_COLORS: Record<Subject, string> = {
  math: 'text-blue-600 bg-blue-50',
  english: 'text-green-600 bg-green-50',
  korean: 'text-purple-600 bg-purple-50',
  all: 'text-grey-600 bg-grey-50',
};

interface SubjectState {
  subject: Subject;
  setSubject: (subject: Subject) => void;
}

export const useSubjectStore = create<SubjectState>()(
  persist(
    (set) => ({
      subject: 'math', // 기본값: 수학
      setSubject: (subject) => set({ subject }),
    }),
    {
      name: 'hyeyum-subject', // localStorage key
    }
  )
);

/**
 * 과목별 데이터 필터링 헬퍼
 */
export function filterBySubject<T extends { subject?: string }>(
  items: T[],
  subject: Subject
): T[] {
  if (subject === 'all') return items;
  return items.filter((item) => item.subject === subject);
}
