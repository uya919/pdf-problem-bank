/**
 * useTextbooks - 반별 교재 관리 훅
 * Stage 18: PDF 교재 뷰어
 * Stage 19: class_textbooks 테이블 연동으로 수정
 *
 * - 반별 교재 목록 조회 (class_textbooks JOIN textbooks)
 * - 교재 업로드 (관리자만) - 레거시, useAllTextbooks 사용 권장
 * - 교재 삭제 (관리자만) - 레거시, useAllTextbooks 사용 권장
 *
 * Supabase 연결 전까지 Mock 데이터 사용
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { compressPdfOnServer } from '@/api/pdfCompression';
import type { ClassBoundTextbook, TextbookUploadInput } from '@/types/textbook';

/** Stage 18 스키마: class_textbooks JOIN textbooks 결과 타입 */
interface ClassTextbookJoinRow {
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
}

/** 레거시 DB Row 타입 (업로드/삭제용) */
interface LegacyTextbookRow {
  id: string;
  class_id: string;
  display_name: string;
  file_name: string;
  file_url: string;
  file_size: number;
  page_count: number | null;
  created_at: string;
  uploaded_by: string | null;
}

// =====================================================
// Mock 데이터 (Supabase 연결 전)
// =====================================================

const MOCK_TEXTBOOKS: ClassBoundTextbook[] = [
  {
    id: 'mock-textbook-1',
    classId: 'class-1',
    displayName: '베이직쎈 고1',
    fileName: '베이직쎈_고1_공통수학.pdf',
    fileUrl: '/sample.pdf', // 테스트용 로컬 파일
    fileSize: 15000000, // 15MB
    pageCount: 280,
    uploadedAt: new Date().toISOString(),
    uploadedBy: 'admin-1',
  },
  {
    id: 'mock-textbook-2',
    classId: 'class-1',
    displayName: '개념원리 RPM',
    fileName: '개념원리_RPM_고1.pdf',
    fileUrl: '/sample.pdf',
    fileSize: 12000000, // 12MB
    pageCount: 320,
    uploadedAt: new Date().toISOString(),
    uploadedBy: 'admin-1',
  },
];

// =====================================================
// 반별 교재 목록 조회
// =====================================================

/**
 * 반별 교재 목록 조회 훅
 * Stage 19: class_textbooks 테이블 JOIN으로 수정
 *
 * @param classId 반 ID (null이면 빈 배열 반환)
 */
export function useTextbooksByClass(classId: string | null) {
  return useQuery({
    queryKey: ['textbooks-by-class', classId],
    queryFn: async (): Promise<ClassBoundTextbook[]> => {
      if (!classId) return [];

      // Supabase 미연결 시 Mock 사용
      if (!isSupabaseConfigured) {
        console.log('[Mock] 교재 목록 조회:', classId);
        return MOCK_TEXTBOOKS.filter((t) => t.classId === classId);
      }

      try {
        // Stage 19: class_textbooks JOIN textbooks
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
            data: ClassTextbookJoinRow[] | null;
            error: { message: string } | null;
          }>);

        if (error) {
          console.warn('교재 조회 실패:', error.message);
          return MOCK_TEXTBOOKS.filter((t) => t.classId === classId);
        }

        if (!data || data.length === 0) {
          return [];
        }

        return data.map((row) => ({
          id: row.textbooks.id,
          classId: row.class_id,
          displayName: row.textbooks.display_name,
          fileName: row.textbooks.file_name,
          fileUrl: row.textbooks.file_url,
          fileSize: row.textbooks.file_size,
          pageCount: row.textbooks.page_count ?? undefined,
          uploadedAt: row.textbooks.created_at,
          uploadedBy: row.textbooks.uploaded_by ?? 'unknown',
        }));
      } catch (err) {
        console.warn('교재 조회 예외:', err);
        return MOCK_TEXTBOOKS.filter((t) => t.classId === classId);
      }
    },
    enabled: !!classId,
    staleTime: 5 * 60 * 1000, // 5분 캐시
  });
}

// =====================================================
// 교재 업로드
// =====================================================

/**
 * 교재 업로드 Mutation 훅
 * Stage 46: Railway Worker에서 PDF 압축 후 업로드
 */
export function useUploadTextbook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: TextbookUploadInput & {
        onProgress?: (progress: number, message: string) => void;
      }
    ): Promise<ClassBoundTextbook> => {
      const { onProgress } = input;

      // Supabase 미연결 시 Mock 업로드
      if (!isSupabaseConfigured) {
        console.log('[Mock] 교재 업로드:', input.displayName);
        onProgress?.(50, '업로드 시뮬레이션...');
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const newTextbook: ClassBoundTextbook = {
          id: `mock-${Date.now()}`,
          classId: input.classId,
          displayName: input.displayName,
          fileName: input.file.name,
          fileUrl: URL.createObjectURL(input.file),
          fileSize: input.file.size,
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'mock-admin',
        };

        MOCK_TEXTBOOKS.push(newTextbook);
        onProgress?.(100, '완료!');
        return newTextbook;
      }

      // ========================================
      // Stage 46: Railway Worker에서 PDF 압축
      // ========================================
      onProgress?.(5, 'PDF 압축 준비 중...');

      let fileToUpload = input.file;
      let pageCount: number | undefined;

      try {
        // Railway Worker에서 압축 (JPEG 90)
        const result = await compressPdfOnServer(input.file, {
          quality: 90,
          onProgress: (p, msg) => onProgress?.(5 + p * 0.5, msg), // 5-55%
        });

        fileToUpload = result.file;
        pageCount = result.pageCount;

        console.log(
          `✅ PDF 압축 완료: ${(result.originalSize / 1024 / 1024).toFixed(1)}MB → ${(result.compressedSize / 1024 / 1024).toFixed(1)}MB (${result.compressionRatio}% 감소)`
        );
      } catch (error) {
        console.warn('⚠️ PDF 압축 실패, 원본 업로드:', error);
        // 압축 실패 시 원본 그대로 업로드 (fallback)
        onProgress?.(55, '압축 스킵, 원본 업로드 중...');
      }

      // ========================================
      // Supabase Storage 업로드
      // ========================================
      onProgress?.(60, 'Supabase에 업로드 중...');

      const timestamp = Date.now();
      const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `textbooks/${input.classId}/${timestamp}_${safeName}`;

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
          class_id: input.classId,
          display_name: input.displayName,
          file_name: input.file.name,
          file_url: urlData.publicUrl,
          file_size: fileToUpload.size, // 압축된 크기
          page_count: pageCount,
        })
        .select()
        .single() as Promise<{
          data: LegacyTextbookRow | null;
          error: { message: string } | null;
        }>);

      if (dbError || !data) {
        console.error('DB 저장 실패:', dbError);
        await supabase.storage.from('textbooks').remove([filePath]);
        throw new Error(`메타데이터 저장 실패: ${dbError?.message || 'Unknown error'}`);
      }

      onProgress?.(100, '완료!');

      return {
        id: data.id,
        classId: data.class_id,
        displayName: data.display_name,
        fileName: data.file_name,
        fileUrl: data.file_url,
        fileSize: data.file_size,
        pageCount: data.page_count ?? undefined,
        uploadedAt: data.created_at,
        uploadedBy: data.uploaded_by ?? 'unknown',
      };
    },
    onSuccess: (_, variables) => {
      // 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['textbooks', variables.classId] });
      queryClient.invalidateQueries({ queryKey: ['textbooks-by-class', variables.classId] });
    },
  });
}

// =====================================================
// 교재 삭제
// =====================================================

/**
 * 교재 삭제 Mutation 훅 (레거시)
 */
export function useDeleteTextbook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (textbook: ClassBoundTextbook): Promise<void> => {
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
      // fileUrl에서 경로 추출: .../textbooks/class_id/timestamp_filename.pdf
      const urlParts = textbook.fileUrl.split('/textbooks/');
      if (urlParts.length > 1) {
        const filePath = `textbooks/${urlParts[1]}`;
        const { error: storageError } = await supabase.storage
          .from('textbooks')
          .remove([filePath]);

        if (storageError) {
          console.warn('Storage 삭제 실패 (무시):', storageError.message);
        }
      }

      // 2. DB에서 삭제
      // Note: textbooks 테이블이 Supabase에 없으면 타입이 never로 추론됨
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
    onSuccess: (_, textbook) => {
      // 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['textbooks', textbook.classId] });
    },
  });
}

// =====================================================
// 유틸리티
// =====================================================

/**
 * 파일 크기 포맷팅
 *
 * @param bytes 바이트 수
 * @returns 포맷된 문자열 (예: "15.2 MB")
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
