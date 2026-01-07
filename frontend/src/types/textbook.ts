/**
 * PDF 교재 관련 타입 정의
 * Stage 18: PDF 교재 뷰어
 */

// =====================================================
// 교재 타입
// =====================================================

/** 교재 정보 (기본) */
export interface Textbook {
  id: string;
  displayName: string;      // "베이직쎈"
  fileName: string;         // "베이직쎈_고1.pdf"
  fileUrl: string;          // Supabase Storage URL 또는 로컬 URL
  fileSize: number;         // bytes
  originalSize?: number;    // 압축 전 크기 (압축된 경우)
  pageCount?: number;       // 총 페이지 수 (옵션)
  grade?: string;           // 레거시: "고1", "중3" 등 → curriculum으로 이전
  curriculum?: string;      // 과정: "공통수학1", "수학Ⅰ" 등
  subject?: string;         // "수학", "영어" 등
  uploadedAt: string;
  uploadedBy: string;       // admin user id
}

/** 교재 + 사용 현황 (교재 관리 페이지용) */
export interface TextbookWithUsage extends Textbook {
  usageCount: number;        // 사용 중인 반 수
  usedByClasses: string[];   // 사용 중인 반 ID 목록
}

/** 반-교재 연결 정보 */
export interface ClassTextbook {
  id: string;
  classId: string;
  textbookId: string;
  textbook: Textbook;
  displayOrder: number;
}

/** 레거시: 반별 교재 (기존 호환성) */
export interface ClassBoundTextbook extends Textbook {
  classId: string;
}

/** 교재 업로드 입력 (레거시: 반별) */
export interface TextbookUploadInput {
  classId: string;
  displayName: string;
  file: File;
}

/** 교재 생성 입력 (새 교재 관리) */
export interface TextbookCreateInput {
  displayName: string;
  file: File;
  grade?: string;        // 레거시 호환
  curriculum?: string;   // 과정: "공통수학1", "수학Ⅰ" 등
  subject?: string;      // "수학", "영어" 등
}

// =====================================================
// PDF 뷰어 타입
// =====================================================

/** 페이지 범위 선택 결과 */
export interface PageRange {
  startPage: number;
  endPage: number;
}

/** PDF 뷰어 모드 */
export type PdfViewerMode = 'grid' | 'single';

/** PDF 로딩 상태 */
export interface PdfLoadState {
  isLoading: boolean;
  numPages: number;
  error: string | null;
}

// =====================================================
// Supabase 테이블 타입
// =====================================================

/** textbooks 테이블 Row 타입 (새 스키마) */
export interface TextbookRow {
  id: string;
  display_name: string;
  file_name: string;
  file_url: string;
  file_size: number;
  original_size: number | null;
  page_count: number | null;
  curriculum: string | null;
  subject: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

/** class_textbooks 테이블 Row 타입 */
export interface ClassTextbookRow {
  id: string;
  class_id: string;
  textbook_id: string;
  display_order: number;
  created_at: string;
}

/** TextbookRow를 Textbook으로 변환 */
export function toTextbook(row: TextbookRow): Textbook {
  return {
    id: row.id,
    displayName: row.display_name,
    fileName: row.file_name,
    fileUrl: row.file_url,
    fileSize: row.file_size,
    originalSize: row.original_size ?? undefined,
    pageCount: row.page_count ?? undefined,
    curriculum: row.curriculum ?? undefined,
    subject: row.subject ?? undefined,
    uploadedAt: row.created_at,
    uploadedBy: row.uploaded_by ?? 'unknown',
  };
}
