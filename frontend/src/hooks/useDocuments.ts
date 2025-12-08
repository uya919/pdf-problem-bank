/**
 * 문서 관련 React Query Hooks (Phase 2)
 * Phase 34-B: 메타데이터 지원
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { UploadMetadata } from '../api/client';

// 문서 목록 조회
export function useDocuments() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: api.getDocuments,
    refetchInterval: 5000, // 5초마다 자동 갱신 (백그라운드 작업 진행 확인)
  });
}

// 특정 문서 조회
export function useDocument(documentId: string) {
  return useQuery({
    queryKey: ['document', documentId],
    queryFn: () => api.getDocument(documentId),
    enabled: !!documentId,
  });
}

// PDF 업로드 (Phase 35: customDocumentId 지원, Phase 34-B: 메타데이터 지원)
export function useUploadPDF() {
  const queryClient = useQueryClient();

  return useMutation({
    // 하위 호환성: File 직접 전달 또는 { file, ...metadata } 객체 전달 모두 지원
    mutationFn: (params: File | { file: File; documentId?: string; grade?: string; course?: string; series?: string; docType?: string }) => {
      if (params instanceof File) {
        // 기존 방식: 파일만 전달
        return api.uploadPDF(params);
      }
      // Phase 34-B: 메타데이터 포함
      const metadata: UploadMetadata = {
        documentId: params.documentId,
        grade: params.grade,
        course: params.course,
        series: params.series,
        docType: params.docType,
      };
      return api.uploadPDF(params.file, metadata);
    },
    onSuccess: () => {
      // 문서 목록 갱신
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

// 문서 삭제
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.deleteDocument,
    onSuccess: () => {
      // 문서 목록 갱신
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

// 페이지 블록 조회
export function usePageBlocks(documentId: string, pageIndex: number) {
  return useQuery({
    queryKey: ['blocks', documentId, pageIndex],
    queryFn: () => api.getPageBlocks(documentId, pageIndex),
    enabled: !!documentId && pageIndex >= 0,
  });
}

// 페이지 그룹 조회
export function usePageGroups(documentId: string, pageIndex: number) {
  return useQuery({
    queryKey: ['groups', documentId, pageIndex],
    queryFn: () => api.getPageGroups(documentId, pageIndex),
    enabled: !!documentId && pageIndex >= 0,
  });
}

// 페이지 그룹 저장
export function useSavePageGroups() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      documentId,
      pageIndex,
      groups,
    }: {
      documentId: string;
      pageIndex: number;
      groups: any;
    }) => api.savePageGroups(documentId, pageIndex, groups),
    onSuccess: (_, variables) => {
      // 해당 페이지의 그룹 데이터 갱신
      queryClient.invalidateQueries({
        queryKey: ['groups', variables.documentId, variables.pageIndex],
      });
    },
  });
}

// 작업 상태 조회
export function useTaskStatus(taskId: string | undefined) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: () => api.getTaskStatus(taskId!),
    enabled: !!taskId,
    refetchInterval: 2000, // 2초마다 갱신
  });
}

// 대시보드 통계 조회 (Phase 6-2)
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: api.getDashboardStats,
    refetchInterval: 10000, // 10초마다 자동 갱신
  });
}

// 문서 통계 조회 (Phase 6-2)
export function useDocumentStats(documentId: string) {
  return useQuery({
    queryKey: ['document', documentId, 'stats'],
    queryFn: () => api.getDocumentStats(documentId),
    enabled: !!documentId,
  });
}

// 내보낸 문제 목록 조회 (Phase 6-5)
export function useExportedProblems(documentId?: string) {
  return useQuery({
    queryKey: ['problems', documentId],
    queryFn: () => api.getExportedProblems(documentId!),
    enabled: !!documentId,
    refetchInterval: 5000, // 5초마다 자동 갱신
  });
}

// 문제 삭제 (Phase 6-5)
export function useDeleteProblem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      documentId,
      pageIndex,
      groupId,
    }: {
      documentId: string;
      pageIndex: number;
      groupId: string;
    }) => api.deleteProblem(documentId, pageIndex, groupId),
    onSuccess: (_, variables) => {
      // 문제 목록 갱신
      queryClient.invalidateQueries({
        queryKey: ['problems', variables.documentId],
      });
      // 전체 문제 목록도 갱신
      queryClient.invalidateQueries({
        queryKey: ['allExportedProblems'],
      });
    },
  });
}

// Phase 24-B: 일괄 삭제
export function useBulkDeleteProblems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.bulkDeleteProblems,
    onSuccess: () => {
      // 전체 문제 목록 갱신
      queryClient.invalidateQueries({
        queryKey: ['allExportedProblems'],
      });
      // 개별 문서별 문제 목록도 갱신
      queryClient.invalidateQueries({
        queryKey: ['problems'],
      });
    },
  });
}

// Phase 24-C: 해설 연결 정보 조회
export function useLinkedSolutions() {
  return useQuery({
    queryKey: ['linkedSolutions'],
    queryFn: api.getLinkedSolutions,
    staleTime: 30000, // 30초간 캐시
  });
}

// Phase 23-C: 모든 문서의 내보내기된 문제 조회
export function useAllExportedProblems(options?: {
  search?: string;
  documentId?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['allExportedProblems', options],
    queryFn: () => api.getAllExportedProblems(options),
    refetchInterval: 10000, // 10초마다 자동 갱신
  });
}

// Phase 33-C: 개별 그룹 내보내기 (자동 등록용)
export function useExportGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      documentId,
      pageIndex,
      groupId,
    }: {
      documentId: string;
      pageIndex: number;
      groupId: string;
    }) => api.exportGroup(documentId, pageIndex, groupId),
    onSuccess: (_, variables) => {
      // 해당 페이지의 그룹 데이터 갱신 (status가 confirmed로 변경됨)
      queryClient.invalidateQueries({
        queryKey: ['groups', variables.documentId, variables.pageIndex],
      });
      // 전체 문제 목록 갱신
      queryClient.invalidateQueries({
        queryKey: ['allExportedProblems'],
      });
      // 개별 문서 문제 목록 갱신
      queryClient.invalidateQueries({
        queryKey: ['problems', variables.documentId],
      });
    },
  });
}

// ===== Phase 8: 문서 설정 훅 =====

// 문서 설정 조회
export function useDocumentSettings(documentId: string) {
  return useQuery({
    queryKey: ['documentSettings', documentId],
    queryFn: () => api.getDocumentSettings(documentId),
    enabled: !!documentId,
    staleTime: 5 * 60 * 1000, // 5분간 캐시
  });
}

// 문서 설정 저장
export function useSaveDocumentSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      documentId,
      settings,
    }: {
      documentId: string;
      settings: Parameters<typeof api.saveDocumentSettings>[1];
    }) => api.saveDocumentSettings(documentId, settings),
    onSuccess: (_, variables) => {
      // 해당 문서의 설정 캐시 갱신
      queryClient.invalidateQueries({
        queryKey: ['documentSettings', variables.documentId],
      });
    },
  });
}

// 책 페이지 계산 헬퍼 훅
export function useBookPage(documentId: string, pdfPageIndex: number) {
  const { data: settings } = useDocumentSettings(documentId);

  const bookPage = settings?.pageOffset
    ? settings.pageOffset.startPage + pdfPageIndex * (settings.pageOffset.increment || 1)
    : pdfPageIndex + 1;

  return {
    bookPage,
    startPage: settings?.pageOffset?.startPage ?? 1,
    increment: settings?.pageOffset?.increment ?? 1,
    isLoaded: !!settings,
  };
}
