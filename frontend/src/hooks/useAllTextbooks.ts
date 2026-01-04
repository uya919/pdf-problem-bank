/**
 * useAllTextbooks - 전체 교재 관리 훅
 * Stage 18-E: 교재 관리 페이지
 *
 * - 모든 교재 조회 (사용 현황 포함)
 * - 교재 업로드
 * - 교재 수정
 * - 교재 삭제 (사용 중 확인)
 *
 * Supabase 연결 전까지 Mock 데이터 사용
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type {
  Textbook,
  TextbookWithUsage,
  TextbookCreateInput,
  TextbookRow,
} from '@/types/textbook';
import { toTextbook } from '@/types/textbook';

// Tree-shaking 방지용 import (실제로 사용하지 않아도 번들에 포함)
import { compressPdfOnServer, checkRailwayHealth } from '@/api/pdfCompression';

/**
 * Tree-shaking 방지: 전역 객체에 함수 등록
 * window 객체에 할당하면 Rollup이 dead code로 판단하지 않음
 */
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__pdfCompressionAllTextbooks = {
    compressPdfOnServer,
    checkRailwayHealth,
  };
}

// =====================================================
// Mock 데이터 (Supabase 연결 전)
// =====================================================

const MOCK_TEXTBOOKS: TextbookWithUsage[] = [
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
    usageCount: 3,
    usedByClasses: ['class-1', 'class-2', 'class-3'],
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
    usageCount: 2,
    usedByClasses: ['class-1', 'class-4'],
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
    usageCount: 1,
    usedByClasses: ['class-5'],
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
    usageCount: 0,
    usedByClasses: [],
  },
];

// =====================================================
// 과목/과정 옵션
// =====================================================

export const SUBJECT_OPTIONS = ['수학', '영어', '국어', '과학', '사회'] as const;

/** 과정 (커리큘럼) 옵션 */
export const CURRICULUM_OPTIONS = [
  // 중등
  '중1-1', '중1-2',
  '중2-1', '중2-2',
  '중3-1', '중3-2',
  // 고등 공통
  '공통수학1', '공통수학2',
  // 고등 선택
  '수학Ⅰ', '수학Ⅱ',
  '미적분', '확률과 통계', '기하',
  // 기타
  '기타',
] as const;

/** 자주 쓰는 교재 시리즈 (자동완성용) */
export const POPULAR_TEXTBOOK_SERIES = [
  '베이직쎈',
  '쎈',
  '라이트쎈',
  '개념쎈',
  'RPM',
  '개념원리',
  '블랙라벨',
  '마플',
  '수학의 정석',
  '수학의 바이블',
  '일품',
  '자이스토리',
] as const;

// 레거시 호환용 (기존 코드에서 사용)
export const GRADE_OPTIONS = CURRICULUM_OPTIONS;

// =====================================================
// 전체 교재 조회
// =====================================================

/**
 * 전체 교재 목록 조회 훅 (사용 현황 포함)
 */
export function useAllTextbooks() {
  return useQuery({
    queryKey: ['textbooks', 'all'],
    queryFn: async (): Promise<TextbookWithUsage[]> => {
      // Supabase 미연결 시 Mock 사용
      if (!isSupabaseConfigured) {
        console.log('[Mock] 전체 교재 목록 조회');
        return MOCK_TEXTBOOKS;
      }

      try {
        // 1. 교재 목록 조회
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: textbooks, error: textbookError } = await ((supabase as any)
          .from('textbooks')
          .select('*')
          .order('created_at', { ascending: false }) as Promise<{
            data: TextbookRow[] | null;
            error: { message: string } | null;
          }>);

        if (textbookError || !textbooks) {
          console.warn('교재 조회 실패:', textbookError?.message);
          return MOCK_TEXTBOOKS;
        }

        // 2. 반-교재 연결 조회 (사용 현황)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: classTextbooks } = await ((supabase as any)
          .from('class_textbooks')
          .select('textbook_id, class_id') as Promise<{
            data: { textbook_id: string; class_id: string }[] | null;
            error: { message: string } | null;
          }>);

        // 3. 사용 현황 집계
        const usageMap = new Map<string, string[]>();
        if (classTextbooks) {
          classTextbooks.forEach((ct) => {
            const existing = usageMap.get(ct.textbook_id) || [];
            usageMap.set(ct.textbook_id, [...existing, ct.class_id]);
          });
        }

        // 4. 결과 조합
        return textbooks.map((row) => {
          const usedByClasses = usageMap.get(row.id) || [];
          return {
            ...toTextbook(row),
            usageCount: usedByClasses.length,
            usedByClasses,
          };
        });
      } catch (err) {
        console.warn('교재 조회 예외:', err);
        return MOCK_TEXTBOOKS;
      }
    },
    staleTime: 5 * 60 * 1000, // 5분 캐시
  });
}

// =====================================================
// 교재 생성
// =====================================================

/**
 * 교재 생성 Mutation 훅
 * Stage 46-B: Railway Worker에서 PDF 압축 후 업로드
 */
export function useCreateTextbook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: TextbookCreateInput & {
        onProgress?: (progress: number, message: string) => void;
      }
    ): Promise<Textbook> => {
      const { onProgress } = input;

      // ========== 디버그 로그 Stage 46-C ==========
      console.log('═══════════════════════════════════════════════════════');
      console.log('[CREATE-TEXTBOOK] 🔍 mutationFn 시작');
      console.log('[CREATE-TEXTBOOK] isSupabaseConfigured:', isSupabaseConfigured);
      console.log('[CREATE-TEXTBOOK] 파일명:', input.file.name);
      console.log('[CREATE-TEXTBOOK] 파일크기:', (input.file.size / 1024 / 1024).toFixed(1), 'MB');
      console.log('[CREATE-TEXTBOOK] 50MB 초과?:', input.file.size > 50 * 1024 * 1024);
      console.log('═══════════════════════════════════════════════════════');
      // ============================================

      // Supabase 미연결 시 Mock 업로드
      if (!isSupabaseConfigured) {
        console.log('[Mock] 교재 업로드:', input.displayName);
        onProgress?.(50, '업로드 시뮬레이션...');
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const newTextbook: TextbookWithUsage = {
          id: `textbook-${Date.now()}`,
          displayName: input.displayName,
          fileName: input.file.name,
          fileUrl: URL.createObjectURL(input.file),
          fileSize: input.file.size,
          grade: input.grade,
          subject: input.subject,
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'mock-admin',
          usageCount: 0,
          usedByClasses: [],
        };

        MOCK_TEXTBOOKS.unshift(newTextbook);
        onProgress?.(100, '완료!');
        return newTextbook;
      }

      // ========================================
      // Stage 46-E: 로컬 앱에서 사전 압축된 파일 업로드
      // - 50MB 초과 파일은 로컬 PDF압축도구로 미리 압축 필요
      // - Railway 압축 제거 (502 타임아웃 문제)
      // ========================================
      const fileToUpload = input.file;
      const pageCount: number | undefined = undefined;

      const FILE_SIZE_LIMIT = 50 * 1024 * 1024; // 50MB (Supabase Storage 제한)

      if (input.file.size > FILE_SIZE_LIMIT) {
        console.error(`[UPLOAD] 파일 크기 ${(input.file.size / 1024 / 1024).toFixed(1)}MB > 50MB`);
        throw new Error(
          `파일이 50MB를 초과합니다 (${(input.file.size / 1024 / 1024).toFixed(1)}MB).\n\n` +
          `로컬 PDF압축도구(tools/PDF압축도구.pyw)로 먼저 압축 후 업로드해주세요.`
        );
      }

      console.log(`[UPLOAD] 파일 크기: ${(input.file.size / 1024 / 1024).toFixed(1)}MB (50MB 이하, 업로드 가능)`);
      onProgress?.(10, '업로드 준비 중...');

      // ========================================
      // Supabase Storage 업로드
      // ========================================
      console.log('[CREATE-TEXTBOOK] 📤 Supabase Storage 업로드 시작');
      console.log('[CREATE-TEXTBOOK] 업로드 파일 크기:', (fileToUpload.size / 1024 / 1024).toFixed(1), 'MB');
      onProgress?.(60, 'Supabase에 업로드 중...');

      const timestamp = Date.now();
      const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `textbooks/${timestamp}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('textbooks')
        .upload(filePath, fileToUpload, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Storage 업로드 실패:', uploadError);
        throw new Error(`파일 업로드 실패: ${uploadError.message}`);
      }

      onProgress?.(80, 'DB에 저장 중...');

      // Public URL 가져오기
      const { data: urlData } = supabase.storage
        .from('textbooks')
        .getPublicUrl(filePath);

      // DB에 메타데이터 저장
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: dbError } = await ((supabase as any)
        .from('textbooks')
        .insert({
          display_name: input.displayName,
          file_name: input.file.name,
          file_url: urlData.publicUrl,
          file_size: fileToUpload.size, // 압축된 크기
          page_count: pageCount,        // Railway에서 받은 페이지 수
          curriculum: input.curriculum || null,
          subject: input.subject || null,
        })
        .select()
        .single() as Promise<{
          data: TextbookRow | null;
          error: { message: string } | null;
        }>);

      if (dbError || !data) {
        console.error('DB 저장 실패:', dbError);
        await supabase.storage.from('textbooks').remove([filePath]);
        throw new Error(`메타데이터 저장 실패: ${dbError?.message || 'Unknown error'}`);
      }

      onProgress?.(100, '완료!');
      return toTextbook(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['textbooks', 'all'] });
    },
  });
}

// =====================================================
// 교재 수정
// =====================================================

export interface TextbookUpdateInput {
  id: string;
  displayName?: string;
  curriculum?: string;
  subject?: string;
}

/**
 * 교재 정보 수정 Mutation 훅
 */
export function useUpdateTextbook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TextbookUpdateInput): Promise<Textbook> => {
      // Supabase 미연결 시 Mock 수정
      if (!isSupabaseConfigured) {
        console.log('[Mock] 교재 수정:', input.id);
        await new Promise((resolve) => setTimeout(resolve, 500));

        const index = MOCK_TEXTBOOKS.findIndex((t) => t.id === input.id);
        if (index !== -1) {
          if (input.displayName) MOCK_TEXTBOOKS[index].displayName = input.displayName;
          if (input.curriculum) MOCK_TEXTBOOKS[index].curriculum = input.curriculum;
          if (input.subject) MOCK_TEXTBOOKS[index].subject = input.subject;
          return MOCK_TEXTBOOKS[index];
        }
        throw new Error('교재를 찾을 수 없습니다.');
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await ((supabase as any)
        .from('textbooks')
        .update({
          display_name: input.displayName,
          curriculum: input.curriculum,
          subject: input.subject,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .select()
        .single() as Promise<{
          data: TextbookRow | null;
          error: { message: string } | null;
        }>);

      if (error || !data) {
        throw new Error(`수정 실패: ${error?.message || 'Unknown error'}`);
      }

      return toTextbook(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['textbooks', 'all'] });
    },
  });
}

// =====================================================
// 교재 삭제
// =====================================================

/**
 * 교재 삭제 Mutation 훅
 */
export function useDeleteTextbook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (textbook: TextbookWithUsage): Promise<void> => {
      // 사용 중인 교재는 삭제 불가
      if (textbook.usageCount > 0) {
        throw new Error(
          `이 교재는 ${textbook.usageCount}개 반에서 사용 중입니다. 먼저 반에서 교재를 제거해주세요.`
        );
      }

      // Supabase 미연결 시 Mock 삭제
      if (!isSupabaseConfigured) {
        console.log('[Mock] 교재 삭제:', textbook.displayName);
        await new Promise((resolve) => setTimeout(resolve, 500));

        const index = MOCK_TEXTBOOKS.findIndex((t) => t.id === textbook.id);
        if (index !== -1) {
          MOCK_TEXTBOOKS.splice(index, 1);
        }
        return;
      }

      // 1. Storage에서 파일 삭제
      const urlParts = textbook.fileUrl.split('/textbooks/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        const { error: storageError } = await supabase.storage
          .from('textbooks')
          .remove([filePath]);

        if (storageError) {
          console.warn('Storage 삭제 실패 (무시):', storageError.message);
        }
      }

      // 2. DB에서 삭제
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: dbError } = await ((supabase as any)
        .from('textbooks')
        .delete()
        .eq('id', textbook.id) as Promise<{
          data: unknown;
          error: { message: string } | null;
        }>);

      if (dbError) {
        throw new Error(`삭제 실패: ${dbError.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['textbooks', 'all'] });
    },
  });
}

// =====================================================
// 유틸리티
// =====================================================

/**
 * 파일 크기 포맷팅
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * 전체 저장 공간 계산
 */
export function calculateTotalStorage(textbooks: Textbook[]): number {
  return textbooks.reduce((sum, t) => sum + t.fileSize, 0);
}
