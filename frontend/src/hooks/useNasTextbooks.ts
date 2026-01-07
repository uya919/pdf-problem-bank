/**
 * NAS 교재 관리 훅 (Stage 47)
 *
 * 기능:
 * - NAS 폴더 탐색
 * - PDF 파일 목록 조회
 * - 연결 상태 확인
 */

import { useQuery } from '@tanstack/react-query';
import {
  testNasConnection,
  listNasFolders,
  listNasPdfFiles,
  NasFile,
  NasFolderResponse,
  NasPdfListResponse,
  NasTestResponse,
} from '@/api/nas';

// ==================== Query Keys ====================

const NAS_KEYS = {
  all: ['nas'] as const,
  test: () => [...NAS_KEYS.all, 'test'] as const,
  folders: (path?: string) => [...NAS_KEYS.all, 'folders', path] as const,
  files: (path?: string, recursive?: boolean) =>
    [...NAS_KEYS.all, 'files', path, recursive] as const,
};

// ==================== Hooks ====================

/**
 * NAS 연결 테스트
 */
export function useNasConnectionTest() {
  return useQuery<NasTestResponse, Error>({
    queryKey: NAS_KEYS.test(),
    queryFn: testNasConnection,
    staleTime: 60 * 1000, // 1분
    retry: 1,
  });
}

/**
 * NAS 폴더 목록 조회
 *
 * @param path 폴더 경로 (기본: 교재 루트)
 * @param enabled 쿼리 활성화 여부
 */
export function useNasFolders(path?: string, enabled = true) {
  return useQuery<NasFolderResponse, Error>({
    queryKey: NAS_KEYS.folders(path),
    queryFn: () => listNasFolders(path),
    enabled,
    staleTime: 5 * 60 * 1000, // 5분
  });
}

/**
 * NAS PDF 파일 목록 조회
 *
 * @param path 폴더 경로
 * @param recursive 하위 폴더 포함
 * @param enabled 쿼리 활성화 여부
 */
export function useNasPdfFiles(
  path?: string,
  recursive = false,
  enabled = true
) {
  return useQuery<NasPdfListResponse, Error>({
    queryKey: NAS_KEYS.files(path, recursive),
    queryFn: () => listNasPdfFiles(path, recursive),
    enabled,
    staleTime: 5 * 60 * 1000, // 5분
  });
}

/**
 * NAS 폴더 트리 탐색 (재귀적으로 하위 폴더 로드)
 */
export interface NasFolderNode {
  name: string;
  path: string;
  children?: NasFolderNode[];
  pdfCount?: number;
}

/**
 * 파일 목록에서 폴더만 추출
 */
export function extractFolders(files: NasFile[]): NasFile[] {
  return files.filter((f) => f.isDir);
}

/**
 * 파일 목록에서 PDF만 추출
 */
export function extractPdfs(files: NasFile[]): NasFile[] {
  return files.filter((f) => !f.isDir && f.name.toLowerCase().endsWith('.pdf'));
}
