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
  'https://makeedu-worker-production.up.railway.app';

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

  console.log(`[COMPRESS] 시작: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
  onProgress?.(10, 'Railway 서버로 전송 중...');

  // FormData 생성
  const formData = new FormData();
  formData.append('file', file);
  formData.append('quality', String(quality));

  // Railway Worker 호출 (3분 타임아웃 - 85MB PDF 압축 시간 고려)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180000); // 3분

  let response: Response;

  try {
    response = await fetch(`${RAILWAY_WORKER_URL}/compress-pdf`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[COMPRESS] 타임아웃 (3분 초과)');
      throw new Error('PDF 압축 타임아웃 - 파일이 너무 큽니다');
    }
    console.error('[COMPRESS] 네트워크 에러:', error);
    throw error;
  }

  console.log(`[COMPRESS] 응답: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[COMPRESS] 에러 응답: ${errorText}`);
    throw new Error(errorText || `Compression failed: ${response.status}`);
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

  console.log(`[COMPRESS] 성공: ${(compressedSize / 1024 / 1024).toFixed(1)}MB (${compressionRatio}% 감소)`);
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
  return `${(bytes / (1024 / 1024)).toFixed(1)} MB`;
}
