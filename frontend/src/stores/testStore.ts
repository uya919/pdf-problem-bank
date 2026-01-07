/**
 * 시험 Store - Zustand
 *
 * 대시보드 ProgressModal에서 시험 기록 저장
 * 수업 페이지(ClassesPage)에서 시험 기록 조회
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TestRecord, TestType, StudentScore } from '../types/test';

interface TestStore {
  // State
  records: TestRecord[];

  // Actions
  addRecord: (record: Omit<TestRecord, 'id' | 'createdAt'>) => TestRecord;
  updateRecord: (id: string, updates: Partial<TestRecord>) => void;
  deleteRecord: (id: string) => void;

  // Queries
  getRecordsByClass: (classId: string) => TestRecord[];
  getRecordsByType: (classId: string, type: TestType) => TestRecord[];
  getLatestRecord: (classId: string, type: TestType) => TestRecord | null;
  getRecordsByDate: (classId: string, date: string) => TestRecord[];
}

export const useTestStore = create<TestStore>()(
  persist(
    (set, get) => ({
      records: [],

      addRecord: (recordData) => {
        const newRecord: TestRecord = {
          ...recordData,
          id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          records: [...state.records, newRecord],
        }));

        return newRecord;
      },

      updateRecord: (id, updates) => {
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        }));
      },

      deleteRecord: (id) => {
        set((state) => ({
          records: state.records.filter((r) => r.id !== id),
        }));
      },

      getRecordsByClass: (classId) => {
        return get().records.filter((r) => r.classId === classId);
      },

      getRecordsByType: (classId, type) => {
        return get()
          .records.filter((r) => r.classId === classId && r.testType === type)
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      },

      getLatestRecord: (classId, type) => {
        const records = get().getRecordsByType(classId, type);
        return records.length > 0 ? records[0] : null;
      },

      getRecordsByDate: (classId, date) => {
        return get().records.filter(
          (r) => r.classId === classId && r.date === date
        );
      },
    }),
    {
      name: 'hyeyum-test-store',
    }
  )
);

/**
 * Mock 데이터 생성 헬퍼 (개발용)
 */
export function createMockTestRecord(
  classId: string,
  className: string,
  testType: TestType,
  students: Array<{ id: string; name: string }>
): Omit<TestRecord, 'id' | 'createdAt'> {
  const scores: StudentScore[] = students.map((s) => ({
    studentId: s.id,
    studentName: s.name,
    score: Math.floor(Math.random() * 40) + 60, // 60-100점
  }));

  return {
    classId,
    className,
    testType,
    date: new Date().toISOString().split('T')[0],
    range: '이차방정식 p.40-50',
    totalScore: 100,
    scores,
  };
}
