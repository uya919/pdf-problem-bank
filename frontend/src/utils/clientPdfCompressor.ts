/**
 * 클라이언트 PDF 압축 유틸리티
 * Stage 46-D: Railway 502 에러 해결
 *
 * 전략:
 * 1. PDF.js로 각 페이지를 Canvas에 렌더링
 * 2. Canvas를 JPEG로 변환 (품질 80)
 * 3. pdf-lib로 새 PDF 생성
 *
 * 결과: 85MB → ~30-40MB (Railway에서 처리 가능한 크기)
 */

import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

// PDF.js 워커 설정
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

/** 압축 옵션 */
export interface ClientCompressionOptions {
  /** 렌더링 스케일 (1.0 = 원본, 0.75 = 75%) */
  scale?: number;
  /** JPEG 품질 (0-1, 기본 0.8) */
  quality?: number;
  /** 진행률 콜백 */
  onProgress?: (progress: number, message: string) => void;
}

/** 압축 결과 */
export interface ClientCompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  pageCount: number;
}

/**
 * 클라이언트에서 PDF 압축 (Canvas + JPEG)
 *
 * @param file 원본 PDF 파일
 * @param options 압축 옵션
 * @returns 압축된 PDF
 */
export async function compressPdfClient(
  file: File,
  options: ClientCompressionOptions = {}
): Promise<ClientCompressionResult> {
  const { scale = 0.75, quality = 0.8, onProgress } = options;

  console.log('════════════════════════════════════════════════════');
  console.log('[CLIENT-COMPRESS] 시작');
  console.log(`[CLIENT-COMPRESS] 파일: ${file.name}`);
  console.log(`[CLIENT-COMPRESS] 크기: ${(file.size / 1024 / 1024).toFixed(1)}MB`);
  console.log(`[CLIENT-COMPRESS] 스케일: ${scale}, JPEG 품질: ${quality}`);
  console.log('════════════════════════════════════════════════════');

  onProgress?.(5, 'PDF 로딩 중...');

  // 1. PDF.js로 원본 PDF 로드
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageCount = pdfDoc.numPages;

  console.log(`[CLIENT-COMPRESS] 페이지 수: ${pageCount}`);
  onProgress?.(10, `${pageCount}페이지 처리 중...`);

  // 2. 새 PDF 문서 생성
  const newPdf = await PDFDocument.create();

  // 3. 각 페이지를 Canvas로 렌더링 후 JPEG로 변환
  for (let i = 1; i <= pageCount; i++) {
    const progress = 10 + Math.floor((i / pageCount) * 80);
    onProgress?.(progress, `페이지 ${i}/${pageCount} 처리 중...`);

    try {
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale });

      // Canvas 생성
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.warn(`[CLIENT-COMPRESS] Canvas 컨텍스트 생성 실패 (페이지 ${i})`);
        continue;
      }

      // 흰색 배경 (투명 방지)
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 페이지 렌더링
      await page.render({
        canvasContext: ctx,
        viewport,
        canvas, // canvas 속성 추가
      } as Parameters<typeof page.render>[0]).promise;

      // JPEG로 변환
      const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
      const jpegBytes = dataUrlToBytes(jpegDataUrl);

      // 새 PDF에 이미지로 추가
      const jpegImage = await newPdf.embedJpg(jpegBytes);
      const pdfPage = newPdf.addPage([viewport.width, viewport.height]);
      pdfPage.drawImage(jpegImage, {
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height,
      });

      // 메모리 해제
      canvas.width = 0;
      canvas.height = 0;
    } catch (err) {
      console.error(`[CLIENT-COMPRESS] 페이지 ${i} 처리 실패:`, err);
    }
  }

  onProgress?.(90, 'PDF 저장 중...');

  // 4. 새 PDF 저장
  const compressedBytes = await newPdf.save({
    useObjectStreams: true,
  });

  // 5. File 객체 생성
  const compressedBlob = new Blob([compressedBytes as BlobPart], { type: 'application/pdf' });
  const compressedFile = new File([compressedBlob], file.name, {
    type: 'application/pdf',
    lastModified: Date.now(),
  });

  const originalSize = file.size;
  const compressedSize = compressedFile.size;
  const compressionRatio = Math.round((1 - compressedSize / originalSize) * 100);

  console.log('════════════════════════════════════════════════════');
  console.log(`[CLIENT-COMPRESS] 완료!`);
  console.log(`[CLIENT-COMPRESS] ${(originalSize / 1024 / 1024).toFixed(1)}MB → ${(compressedSize / 1024 / 1024).toFixed(1)}MB`);
  console.log(`[CLIENT-COMPRESS] 압축률: ${compressionRatio}%`);
  console.log('════════════════════════════════════════════════════');

  onProgress?.(100, '완료!');

  return {
    file: compressedFile,
    originalSize,
    compressedSize,
    compressionRatio,
    pageCount,
  };
}

/**
 * Data URL을 바이트 배열로 변환
 */
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * 클라이언트 압축이 필요한지 확인
 *
 * Railway Worker가 안전하게 처리할 수 있는 크기: ~30-40MB
 * 따라서 40MB 이상이면 클라이언트 사전 압축 필요
 */
export function needsClientCompression(fileSize: number): boolean {
  const RAILWAY_SAFE_LIMIT = 40 * 1024 * 1024; // 40MB
  return fileSize > RAILWAY_SAFE_LIMIT;
}
