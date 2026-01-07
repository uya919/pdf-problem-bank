/**
 * PDF 압축 유틸리티
 * Stage 18-G: PDF 압축 기능
 *
 * pdf-lib를 사용한 클라이언트 사이드 PDF 압축
 *
 * 압축 전략:
 * 1. 이미지 품질 저하 (JPEG 품질 감소)
 * 2. 메타데이터 제거
 * 3. 중복 객체 제거
 * 4. 스트림 최적화
 *
 * 참고: pdf-lib는 이미지 압축을 직접 지원하지 않음
 * 따라서 PDF 구조 최적화 위주로 압축 수행
 */

import { PDFDocument } from 'pdf-lib';

/** 압축 결과 */
export interface CompressionResult {
  /** 압축된 파일 */
  file: File;
  /** 원본 크기 (bytes) */
  originalSize: number;
  /** 압축된 크기 (bytes) */
  compressedSize: number;
  /** 압축률 (0-100%) */
  compressionRatio: number;
  /** 페이지 수 */
  pageCount: number;
}

/** 압축 진행 상태 */
export interface CompressionProgress {
  /** 현재 단계 */
  stage: 'loading' | 'processing' | 'saving' | 'complete';
  /** 진행률 (0-100) */
  progress: number;
  /** 메시지 */
  message: string;
}

/** 압축 옵션 */
export interface CompressionOptions {
  /** 진행 상태 콜백 */
  onProgress?: (progress: CompressionProgress) => void;
  /** 자동 압축 임계값 (bytes) - 이 크기 이상이면 자동 압축 */
  threshold?: number;
}

/** 기본 자동 압축 임계값: 50MB */
export const DEFAULT_COMPRESSION_THRESHOLD = 50 * 1024 * 1024;

/**
 * PDF 파일 압축
 *
 * @param file 원본 PDF 파일
 * @param options 압축 옵션
 * @returns 압축 결과
 */
export async function compressPdf(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const { onProgress } = options;
  const originalSize = file.size;

  // 1. 파일 로딩
  onProgress?.({
    stage: 'loading',
    progress: 10,
    message: 'PDF 파일 읽는 중...',
  });

  const arrayBuffer = await file.arrayBuffer();

  // 2. PDF 문서 로드
  onProgress?.({
    stage: 'processing',
    progress: 30,
    message: 'PDF 분석 중...',
  });

  const pdfDoc = await PDFDocument.load(arrayBuffer, {
    ignoreEncryption: true,
  });

  const pageCount = pdfDoc.getPageCount();

  // 3. 메타데이터 최적화 (제거)
  onProgress?.({
    stage: 'processing',
    progress: 50,
    message: '메타데이터 최적화 중...',
  });

  // 메타데이터 제거로 파일 크기 감소
  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setKeywords([]);
  pdfDoc.setProducer('');
  pdfDoc.setCreator('');

  // 4. PDF 저장 (압축 옵션 적용)
  onProgress?.({
    stage: 'saving',
    progress: 70,
    message: 'PDF 저장 중...',
  });

  // pdf-lib의 save 옵션
  // - useObjectStreams: 객체 스트림 사용으로 압축률 향상
  // - addDefaultPage: false - 불필요한 페이지 추가 방지
  const compressedBytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });

  // 5. 결과 File 생성
  onProgress?.({
    stage: 'complete',
    progress: 100,
    message: '압축 완료!',
  });

  // Uint8Array를 ArrayBuffer slice로 변환하여 Blob 생성 (타입 호환성)
  const buffer = compressedBytes.buffer.slice(
    compressedBytes.byteOffset,
    compressedBytes.byteOffset + compressedBytes.byteLength
  ) as ArrayBuffer;
  const compressedBlob = new Blob([buffer], { type: 'application/pdf' });
  const compressedFile = new File([compressedBlob], file.name, {
    type: 'application/pdf',
    lastModified: Date.now(),
  });

  const compressedSize = compressedFile.size;
  const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

  return {
    file: compressedFile,
    originalSize,
    compressedSize,
    compressionRatio: Math.max(0, compressionRatio), // 음수 방지
    pageCount,
  };
}

/**
 * 자동 압축 필요 여부 확인
 *
 * @param fileSize 파일 크기 (bytes)
 * @param threshold 임계값 (bytes)
 * @returns 압축 필요 여부
 */
export function needsCompression(
  fileSize: number,
  threshold: number = DEFAULT_COMPRESSION_THRESHOLD
): boolean {
  return fileSize >= threshold;
}

/**
 * 파일 크기 포맷팅
 *
 * @param bytes 바이트 수
 * @returns 포맷된 문자열
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * 압축률 포맷팅
 *
 * @param ratio 압축률 (0-100)
 * @returns 포맷된 문자열
 */
export function formatCompressionRatio(ratio: number): string {
  if (ratio <= 0) {
    return '압축 없음';
  }
  return `${ratio.toFixed(1)}% 감소`;
}
