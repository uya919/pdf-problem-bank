/**
 * Railway Worker PDF 압축 API 클라이언트
 * Stage 46: 서버사이드 PDF 압축
 *
 * - Railway Worker에서 PyMuPDF로 압축
 * - 2단계: 무손실 최적화 + JPEG 90 이미지 압축
 * - 예상 결과: 85MB -> 25-35MB (60-70% 감소)
 */

/** Railway Worker URL (환경변수 또는 기본값) */
const RAILWAY_WORKER_URL =
  import.meta.env.VITE_RAILWAY_WORKER_URL ||
  'https://pdf-production-1764.up.railway.app';

/** 압축 결과 */
export interface CompressionResult {
  /** 압축된 파일 */
  file: File;
  /** 원본 크기 (bytes) */
  originalSize: number;
  /** 압축된 크기 (bytes) */
  compressedSize: number;
  /** 압축률 (%) */
  compressionRatio: number;
  /** 처리된 이미지 수 */
  imagesProcessed: number;
  /** 페이지 수 */
  pageCount: number;
}

/** 압축 옵션 */
export interface CompressionOptions {
  /** JPEG 품질 (1-100, 기본 90) */
  quality?: number;
  /** 진행 콜백 */
  onProgress?: (progress: number, message: string) => void;
}

/**
 * Railway Worker에서 PDF 압축
 *
 * @param file 원본 PDF 파일
 * @param options 압축 옵션
 * @returns 압축 결과
 */
export async function compressPdfOnServer(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const { quality = 90, onProgress } = options;

  onProgress?.(10, 'Railway 서버로 전송 중...');

  // FormData 생성
  const formData = new FormData();
  formData.append('file', file);
  formData.append('quality', String(quality));

  // Railway Worker 호출
  const response = await fetch(`${RAILWAY_WORKER_URL}/compress-pdf`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Compression failed: ${response.status}`);
  }

  onProgress?.(70, '압축 완료, 다운로드 중...');

  // 헤더에서 통계 정보 추출
  const originalSize = parseInt(response.headers.get('X-Original-Size') || '0', 10);
  const compressedSize = parseInt(response.headers.get('X-Compressed-Size') || '0', 10);
  const compressionRatio = parseFloat(response.headers.get('X-Compression-Ratio') || '0');
  const imagesProcessed = parseInt(response.headers.get('X-Images-Processed') || '0', 10);
  const pageCount = parseInt(response.headers.get('X-Page-Count') || '0', 10);

  // Blob -> File 변환
  const blob = await response.blob();
  const compressedFile = new File([blob], file.name, {
    type: 'application/pdf',
    lastModified: Date.now(),
  });

  onProgress?.(100, '완료!');

  return {
    file: compressedFile,
    originalSize,
    compressedSize,
    compressionRatio,
    imagesProcessed,
    pageCount,
  };
}

/**
 * Railway Worker 헬스체크
 */
export async function checkRailwayHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${RAILWAY_WORKER_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * 파일 크기 포맷팅
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
