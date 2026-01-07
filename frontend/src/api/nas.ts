/**
 * NAS 교재 API 클라이언트 (Stage 47)
 *
 * 기능:
 * - NAS 폴더 탐색
 * - PDF 파일 목록 조회
 * - PDF 파일 URL 생성
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7000';

// ==================== Types ====================

export interface NasFile {
  name: string;
  path: string;
  size: number;
  isDir: boolean;
  modified: string;
}

export interface NasFolderResponse {
  path: string;
  files: NasFile[];
}

export interface NasPdfListResponse {
  path: string;
  recursive: boolean;
  count: number;
  files: NasFile[];
}

export interface NasTestResponse {
  success: boolean;
  message: string;
  baseUrl: string;
  textbookPath: string;
}

// ==================== API Functions ====================

/**
 * NAS 연결 테스트
 */
export async function testNasConnection(): Promise<NasTestResponse> {
  const res = await fetch(`${API_URL}/api/nas/test`);
  if (!res.ok) {
    throw new Error(`NAS 연결 테스트 실패: ${res.status}`);
  }
  return res.json();
}

/**
 * 폴더 내 파일/폴더 목록 조회
 *
 * @param path 폴더 경로 (기본: 교재 루트)
 */
export async function listNasFolders(path?: string): Promise<NasFolderResponse> {
  const params = new URLSearchParams();
  if (path) {
    params.set('path', path);
  }

  const res = await fetch(`${API_URL}/api/nas/folders?${params}`);
  if (!res.ok) {
    throw new Error(`폴더 조회 실패: ${res.status}`);
  }
  return res.json();
}

/**
 * PDF 파일 목록 조회
 *
 * @param path 폴더 경로 (기본: 교재 루트)
 * @param recursive 하위 폴더 포함 여부
 */
export async function listNasPdfFiles(
  path?: string,
  recursive = false
): Promise<NasPdfListResponse> {
  const params = new URLSearchParams();
  if (path) {
    params.set('path', path);
  }
  params.set('recursive', String(recursive));

  const res = await fetch(`${API_URL}/api/nas/files?${params}`);
  if (!res.ok) {
    throw new Error(`PDF 목록 조회 실패: ${res.status}`);
  }
  return res.json();
}

/**
 * NAS PDF 파일 URL 생성
 *
 * @param nasPath NAS 파일 경로
 * @returns Backend proxy URL
 */
export function getNasPdfUrl(nasPath: string): string {
  // 경로를 URL 인코딩
  const encodedPath = encodeURIComponent(nasPath);
  return `${API_URL}/api/nas/pdf/${encodedPath}`;
}

/**
 * 파일 크기 포맷팅
 *
 * @param bytes 바이트
 * @returns 포맷된 문자열 (예: "85.3 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * NAS 경로에서 학년 추출
 *
 * @param path NAS 경로 (예: /학원/0.수학자료/수학교재/1.중등/중1/)
 * @returns 학년 문자열 또는 null
 */
export function extractGradeFromPath(path: string): string | null {
  // 패턴: 0.초등, 1.중등, 2.고등
  const match = path.match(/(\d+)\.(초등|중등|고등)/);
  if (match) {
    return match[2]; // 초등, 중등, 고등
  }

  // 패턴: 중1, 중2, 고1, 고2 등
  const gradeMatch = path.match(/(중|고)(\d)/);
  if (gradeMatch) {
    return `${gradeMatch[1]}${gradeMatch[2]}`;
  }

  return null;
}
