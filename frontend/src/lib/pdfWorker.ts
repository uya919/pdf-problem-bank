/**
 * PDF.js Worker 설정
 * Stage 18: PDF 교재 뷰어
 *
 * react-pdf를 사용하기 위해 PDF.js 워커를 설정합니다.
 * 이 파일을 앱 시작 시 import하면 됩니다.
 */

import { pdfjs } from 'react-pdf';

// PDF.js 워커 설정 (CDN 사용)
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export { pdfjs };
