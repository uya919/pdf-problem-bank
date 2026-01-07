/**
 * useClassTextbooks - 반-교재 연결 관리 훅
 * Stage 18-F: 반-교재 연결 시스템
 *
 * - 반에 연결된 교재 목록 조회
 * - 교재 연결/해제
 * - 교재 순서 변경
 *
 * Supabase 연결 전까지 Mock 데이터 사용
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { ClassTextbook, Textbook } from '@/types/textbook';

// =====================================================
// Mock 데이터 (Supabase 연결 전)
// =====================================================

const MOCK_CLASS_TEXTBOOKS: Map<string, ClassTextbook[]> = new Map([
  [
    'class-1',
    [
      {
        id: 'ct-1',
        classId: 'class-1',
        textbookId: 'textbook-1',
        textbook: {
          id: 'textbook-1',
          displayName: '베이직쎈 고1 공통수학',
          fileName: '베이직쎈_고1_공통수학.pdf',
          fileUrl: '/sample.pdf',
          fileSize: 15000000,
          pageCount: 280,
          grade: '고1',
          subject: '수학',
          uploadedAt: '2025-01-15T09:00:00Z',
          uploadedBy: 'admin',
        },
        displayOrder: 1,
      },
      {
        id: 'ct-2',
        classId: 'class-1',
        textbookId: 'textbook-2',
        textbook: {
          id: 'textbook-2',
          displayName: '개념원리 RPM 고1',
          fileName: '개념원리_RPM_고1.pdf',
          fileUrl: '/sample.pdf',
          fileSize: 12000000,
          pageCount: 320,
          grade: '고1',
          subject: '수학',
          uploadedAt: '2025-01-10T10:30:00Z',
          uploadedBy: 'admin',
        },
        displayOrder: 2,
      },
    ],
  ],
  [
    'class-2',
    [
      {
        id: 'ct-3',
        classId: 'class-2',
        textbookId: 'textbook-1',
        textbook: {
          id: 'textbook-1',
          displayName: '베이직쎈 고1 공통수학',
          fileName: '베이직쎈_고1_공통수학.pdf',
          fileUrl: '/sample.pdf',
          fileSize: 15000000,
          pageCount: 280,
          grade: '고1',
          subject: '수학',
          uploadedAt: '2025-01-15T09:00:00Z',
          uploadedBy: 'admin',
        },
        displayOrder: 1,
      },
    ],
  ],
]);

// 전체 교재 목록 (교재 선택용)
const MOCK_ALL_TEXTBOOKS: Textbook[] = [
  {
    id: 'textbook-1',
    displayName: '베이직쎈 고1 공통수학',
    fileName: '베이직쎈_고1_공통수학.pdf',
    fileUrl: '/sample.pdf',
    fileSize: 15000000,
    pageCount: 280,
    grade: '고1',
    subject: '수학',
    uploadedAt: '2025-01-15T09:00:00Z',
    uploadedBy: 'admin',
  },
  {
    id: 'textbook-2',
    displayName: '개념원리 RPM 고1',
    fileName: '개념원리_RPM_고1.pdf',
    fileUrl: '/sample.pdf',
    fileSize: 12000000,
    pageCount: 320,
    grade: '고1',
    subject: '수학',
    uploadedAt: '2025-01-10T10:30:00Z',
    uploadedBy: 'admin',
  },
  {
    id: 'textbook-3',
    displayName: '쎈 중3 상',
    fileName: '쎈_중3_상.pdf',
    fileUrl: '/sample.pdf',
    fileSize: 8500000,
    pageCount: 240,
    grade: '중3',
    subject: '수학',
    uploadedAt: '2025-01-08T14:00:00Z',
    uploadedBy: 'admin',
  },
  {
    id: 'textbook-4',
    displayName: '블랙라벨 고2 수학1',
    fileName: '블랙라벨_고2_수학1.pdf',
    fileUrl: '/sample.pdf',
    fileSize: 22300000,
    pageCount: 360,
    grade: '고2',
    subject: '수학',
    uploadedAt: '2025-01-05T11:00:00Z',
    uploadedBy: 'admin',
  },
];

// =====================================================
// 반별 연결된 교재 조회
// =====================================================

/**
 * 반에 연결된 교재 목록 조회 훅
 */
export function useClassTextbooks(classId: string | null) {
  return useQuery({
    queryKey: ['class-textbooks', classId],
    queryFn: async (): Promise<ClassTextbook[]> => {
      if (!classId) return [];

      // Supabase 미연결 시 Mock 사용
      if (!isSupabaseConfigured) {
        console.log('[Mock] 반-교재 조회:', classId);
        return MOCK_CLASS_TEXTBOOKS.get(classId) || [];
      }

      try {
        // class_textbooks JOIN textbooks
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await ((supabase as any)
          .from('class_textbooks')
          .select(`
            id,
            class_id,
            textbook_id,
            display_order,
            textbooks (
              id,
              display_name,
              file_name,
              file_url,
              file_size,
              page_count,
              curriculum,
              subject,
              created_at,
              uploaded_by
            )
          `)
          .eq('class_id', classId)
          .order('display_order', { ascending: true }) as Promise<{
            data: Array<{
              id: string;
              class_id: string;
              textbook_id: string;
              display_order: number;
              textbooks: {
                id: string;
                display_name: string;
                file_name: string;
                file_url: string;
                file_size: number;
                page_count: number | null;
                curriculum: string | null;
                subject: string | null;
                created_at: string;
                uploaded_by: string | null;
              };
            }> | null;
            error: { message: string } | null;
          }>);

        if (error || !data) {
          console.warn('반-교재 조회 실패:', error?.message);
          return MOCK_CLASS_TEXTBOOKS.get(classId) || [];
        }

        return data.map((row) => ({
          id: row.id,
          classId: row.class_id,
          textbookId: row.textbook_id,
          textbook: {
            id: row.textbooks.id,
            displayName: row.textbooks.display_name,
            fileName: row.textbooks.file_name,
            fileUrl: row.textbooks.file_url,
            fileSize: row.textbooks.file_size,
            pageCount: row.textbooks.page_count ?? undefined,
            curriculum: row.textbooks.curriculum ?? undefined,
            subject: row.textbooks.subject ?? undefined,
            uploadedAt: row.textbooks.created_at,
            uploadedBy: row.textbooks.uploaded_by ?? 'unknown',
          },
          displayOrder: row.display_order,
        }));
      } catch (err) {
        console.warn('반-교재 조회 예외:', err);
        return MOCK_CLASS_TEXTBOOKS.get(classId) || [];
      }
    },
    enabled: !!classId,
    staleTime: 5 * 60 * 1000,
  });
}

// =====================================================
// 교재 연결 (반에 교재 추가)
// =====================================================

interface LinkTextbookInput {
  classId: string;
  textbookId: string;
}

/**
 * 반에 교재 연결 Mutation 훅
 */
export function useLinkTextbook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ classId, textbookId }: LinkTextbookInput): Promise<ClassTextbook> => {
      // Supabase 미연결 시 Mock
      if (!isSupabaseConfigured) {
        console.log('[Mock] 교재 연결:', classId, textbookId);
        await new Promise((r) => setTimeout(r, 500));

        const existing = MOCK_CLASS_TEXTBOOKS.get(classId) || [];

        // 이미 연결되어 있는지 확인
        if (existing.some((ct) => ct.textbookId === textbookId)) {
          throw new Error('이미 연결된 교재입니다.');
        }

        const textbook = MOCK_ALL_TEXTBOOKS.find((t) => t.id === textbookId);
        if (!textbook) {
          throw new Error('교재를 찾을 수 없습니다.');
        }

        const newClassTextbook: ClassTextbook = {
          id: `ct-${Date.now()}`,
          classId,
          textbookId,
          textbook,
          displayOrder: existing.length + 1,
        };

        MOCK_CLASS_TEXTBOOKS.set(classId, [...existing, newClassTextbook]);
        return newClassTextbook;
      }

      // 연결 순서 계산
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count } = await ((supabase as any)
        .from('class_textbooks')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', classId) as Promise<{
          count: number | null;
          error: { message: string } | null;
        }>);

      const displayOrder = (count || 0) + 1;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await ((supabase as any)
        .from('class_textbooks')
        .insert({
          class_id: classId,
          textbook_id: textbookId,
          display_order: displayOrder,
        })
        .select(`
          id,
          class_id,
          textbook_id,
          display_order,
          textbooks (*)
        `)
        .single() as Promise<{
          data: unknown;
          error: { message: string } | null;
        }>);

      if (error || !data) {
        throw new Error(`교재 연결 실패: ${error?.message || 'Unknown error'}`);
      }

      // 타입 변환은 생략 (실제 구현 시 추가)
      return data as ClassTextbook;
    },
    onSuccess: (_, { classId }) => {
      queryClient.invalidateQueries({ queryKey: ['class-textbooks', classId] });
      queryClient.invalidateQueries({ queryKey: ['textbooks', 'all'] }); // 사용 현황 갱신
    },
  });
}

// =====================================================
// 교재 연결 해제
// =====================================================

interface UnlinkTextbookInput {
  classId: string;
  classTextbookId: string;
}

/**
 * 반에서 교재 연결 해제 Mutation 훅
 */
export function useUnlinkTextbook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ classId, classTextbookId }: UnlinkTextbookInput): Promise<void> => {
      // Supabase 미연결 시 Mock
      if (!isSupabaseConfigured) {
        console.log('[Mock] 교재 연결 해제:', classId, classTextbookId);
        await new Promise((r) => setTimeout(r, 300));

        const existing = MOCK_CLASS_TEXTBOOKS.get(classId) || [];
        const updated = existing.filter((ct) => ct.id !== classTextbookId);

        // 순서 재정렬
        updated.forEach((ct, idx) => {
          ct.displayOrder = idx + 1;
        });

        MOCK_CLASS_TEXTBOOKS.set(classId, updated);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await ((supabase as any)
        .from('class_textbooks')
        .delete()
        .eq('id', classTextbookId) as Promise<{
          data: unknown;
          error: { message: string } | null;
        }>);

      if (error) {
        throw new Error(`교재 연결 해제 실패: ${error.message}`);
      }
    },
    onSuccess: (_, { classId }) => {
      queryClient.invalidateQueries({ queryKey: ['class-textbooks', classId] });
      queryClient.invalidateQueries({ queryKey: ['textbooks', 'all'] }); // 사용 현황 갱신
    },
  });
}

// =====================================================
// 연결 가능한 교재 목록 (아직 연결되지 않은 교재)
// =====================================================

/**
 * 반에 연결 가능한 교재 목록 조회 훅
 * (이미 연결된 교재 제외)
 */
export function useAvailableTextbooks(classId: string | null) {
  const { data: linkedTextbooks = [] } = useClassTextbooks(classId);

  return useQuery({
    queryKey: ['available-textbooks', classId],
    queryFn: async (): Promise<Textbook[]> => {
      if (!classId) return [];

      const linkedIds = new Set(linkedTextbooks.map((ct) => ct.textbookId));

      // Supabase 미연결 시 Mock
      if (!isSupabaseConfigured) {
        console.log('[Mock] 연결 가능 교재 조회');
        return MOCK_ALL_TEXTBOOKS.filter((t) => !linkedIds.has(t.id));
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await ((supabase as any)
          .from('textbooks')
          .select('*')
          .order('created_at', { ascending: false }) as Promise<{
            data: Array<{
              id: string;
              display_name: string;
              file_name: string;
              file_url: string;
              file_size: number;
              page_count: number | null;
              curriculum: string | null;
              subject: string | null;
              created_at: string;
              uploaded_by: string | null;
            }> | null;
            error: { message: string } | null;
          }>);

        if (error || !data) {
          console.warn('교재 조회 실패:', error?.message);
          return MOCK_ALL_TEXTBOOKS.filter((t) => !linkedIds.has(t.id));
        }

        return data
          .filter((t) => !linkedIds.has(t.id))
          .map((row) => ({
            id: row.id,
            displayName: row.display_name,
            fileName: row.file_name,
            fileUrl: row.file_url,
            fileSize: row.file_size,
            pageCount: row.page_count ?? undefined,
            curriculum: row.curriculum ?? undefined,
            subject: row.subject ?? undefined,
            uploadedAt: row.created_at,
            uploadedBy: row.uploaded_by ?? 'unknown',
          }));
      } catch (err) {
        console.warn('교재 조회 예외:', err);
        return MOCK_ALL_TEXTBOOKS.filter((t) => !linkedIds.has(t.id));
      }
    },
    enabled: !!classId,
    staleTime: 5 * 60 * 1000,
  });
}
