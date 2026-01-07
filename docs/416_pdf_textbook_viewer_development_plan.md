# 416. PDF 교재 뷰어 단계별 개발 계획

> Stage 18: 진도 기록 시 PDF 교재 페이지 확인 기능

---

## 사용자 결정 사항

| 항목 | 결정 |
|------|------|
| PDF 업로드 권한 | 관리자만 |
| 교재 수 제한 | 유동적 (2권 이상 가능) |
| 뷰어 스타일 | 썸네일 그리드 + 단일 페이지 슬라이더 (둘 다) |
| 페이지 선택 방식 | 시작/끝 각각 선택 |
| 뷰어 위치 | 전체 화면 모달 |

---

## Phase 18-A: 기반 작업

### Phase 18-A-1: react-pdf 설치 및 설정

**파일**: `frontend/package.json`

```bash
npm install react-pdf
```

**파일**: `frontend/src/lib/pdfWorker.ts` (신규)

```typescript
import { pdfjs } from 'react-pdf';

// PDF.js 워커 설정
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
```

### Phase 18-A-2: 타입 정의

**파일**: `frontend/src/types/textbook.ts` (신규)

```typescript
/**
 * PDF 교재 관련 타입 정의
 * Stage 18: PDF 교재 뷰어
 */

/** 교재 정보 */
export interface Textbook {
  id: string;
  classId: string;
  displayName: string;      // "베이직쎈"
  fileName: string;         // "베이직쎈_고1.pdf"
  fileUrl: string;          // Supabase Storage URL
  fileSize: number;         // bytes
  pageCount?: number;       // 총 페이지 수
  uploadedAt: string;
  uploadedBy: string;       // admin user id
}

/** 교재 업로드 입력 */
export interface TextbookUploadInput {
  classId: string;
  displayName: string;
  file: File;
}

/** 페이지 범위 선택 결과 */
export interface PageRange {
  startPage: number;
  endPage: number;
}

/** PDF 뷰어 모드 */
export type PdfViewerMode = 'grid' | 'single';
```

### Phase 18-A-3: Supabase Storage 훅

**파일**: `frontend/src/hooks/useTextbooks.ts` (신규)

```typescript
/**
 * useTextbooks - 교재 관리 훅
 * Stage 18: PDF 교재 뷰어
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Textbook, TextbookUploadInput } from '@/types/textbook';

// Mock 데이터 (Supabase 연결 전)
const MOCK_TEXTBOOKS: Textbook[] = [
  {
    id: 'mock-1',
    classId: 'class-1',
    displayName: '베이직쎈',
    fileName: '베이직쎈_고1.pdf',
    fileUrl: '/mock/textbook1.pdf',
    fileSize: 15000000,
    pageCount: 280,
    uploadedAt: new Date().toISOString(),
    uploadedBy: 'admin-1',
  },
];

/** 반별 교재 목록 조회 */
export function useTextbooksByClass(classId: string | null) {
  return useQuery({
    queryKey: ['textbooks', classId],
    queryFn: async (): Promise<Textbook[]> => {
      if (!classId) return [];

      if (!isSupabaseConfigured) {
        return MOCK_TEXTBOOKS.filter(t => t.classId === classId);
      }

      const { data, error } = await supabase
        .from('textbooks')
        .select('*')
        .eq('class_id', classId)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('교재 조회 실패:', error.message);
        return MOCK_TEXTBOOKS.filter(t => t.classId === classId);
      }

      return (data || []).map(row => ({
        id: row.id,
        classId: row.class_id,
        displayName: row.display_name,
        fileName: row.file_name,
        fileUrl: row.file_url,
        fileSize: row.file_size,
        pageCount: row.page_count,
        uploadedAt: row.created_at,
        uploadedBy: row.uploaded_by,
      }));
    },
    enabled: !!classId,
  });
}

/** 교재 업로드 */
export function useUploadTextbook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TextbookUploadInput): Promise<Textbook> => {
      if (!isSupabaseConfigured) {
        // Mock: 가짜 업로드
        await new Promise(resolve => setTimeout(resolve, 1000));
        const newTextbook: Textbook = {
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
        return newTextbook;
      }

      // 1. Storage에 파일 업로드
      const filePath = `textbooks/${input.classId}/${Date.now()}_${input.file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('textbooks')
        .upload(filePath, input.file);

      if (uploadError) throw uploadError;

      // 2. Public URL 가져오기
      const { data: urlData } = supabase.storage
        .from('textbooks')
        .getPublicUrl(filePath);

      // 3. DB에 메타데이터 저장
      const { data, error: dbError } = await supabase
        .from('textbooks')
        .insert({
          class_id: input.classId,
          display_name: input.displayName,
          file_name: input.file.name,
          file_url: urlData.publicUrl,
          file_size: input.file.size,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      return {
        id: data.id,
        classId: data.class_id,
        displayName: data.display_name,
        fileName: data.file_name,
        fileUrl: data.file_url,
        fileSize: data.file_size,
        pageCount: data.page_count,
        uploadedAt: data.created_at,
        uploadedBy: data.uploaded_by,
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['textbooks', variables.classId] });
    },
  });
}

/** 교재 삭제 */
export function useDeleteTextbook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (textbook: Textbook): Promise<void> => {
      if (!isSupabaseConfigured) {
        const index = MOCK_TEXTBOOKS.findIndex(t => t.id === textbook.id);
        if (index !== -1) MOCK_TEXTBOOKS.splice(index, 1);
        return;
      }

      // Storage에서 파일 삭제
      const filePath = textbook.fileUrl.split('/textbooks/')[1];
      if (filePath) {
        await supabase.storage.from('textbooks').remove([filePath]);
      }

      // DB에서 삭제
      const { error } = await supabase
        .from('textbooks')
        .delete()
        .eq('id', textbook.id);

      if (error) throw error;
    },
    onSuccess: (_, textbook) => {
      queryClient.invalidateQueries({ queryKey: ['textbooks', textbook.classId] });
    },
  });
}
```

---

## Phase 18-B: PDF 뷰어 컴포넌트

### Phase 18-B-1: PDF 썸네일 그리드

**파일**: `frontend/src/components/pdf/PdfThumbnailGrid.tsx` (신규)

```typescript
/**
 * PdfThumbnailGrid - PDF 페이지 썸네일 그리드
 * Stage 18: PDF 교재 뷰어
 */

import { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// 워커 설정
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfThumbnailGridProps {
  fileUrl: string;
  selectedStart: number | null;
  selectedEnd: number | null;
  onPageClick: (pageNumber: number) => void;
  onTotalPages: (total: number) => void;
}

export function PdfThumbnailGrid({
  fileUrl,
  selectedStart,
  selectedEnd,
  onPageClick,
  onTotalPages,
}: PdfThumbnailGridProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    onTotalPages(numPages);
  }, [onTotalPages]);

  const isInRange = (page: number) => {
    if (selectedStart === null) return false;
    if (selectedEnd === null) return page === selectedStart;
    return page >= selectedStart && page <= selectedEnd;
  };

  return (
    <div className="relative">
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <Document
        file={fileUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        loading={null}
        className="grid grid-cols-4 gap-3 p-4"
      >
        {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNumber) => (
          <button
            key={pageNumber}
            onClick={() => onPageClick(pageNumber)}
            className={`
              relative rounded-lg overflow-hidden border-2 transition-all
              hover:shadow-lg hover:scale-105
              ${isInRange(pageNumber)
                ? 'border-blue-500 ring-2 ring-blue-200'
                : 'border-gray-200 hover:border-gray-300'
              }
            `}
          >
            <Page
              pageNumber={pageNumber}
              width={120}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
            <div className={`
              absolute bottom-0 left-0 right-0 py-1 text-center text-xs font-medium
              ${isInRange(pageNumber)
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600'
              }
            `}>
              {pageNumber}
            </div>
          </button>
        ))}
      </Document>
    </div>
  );
}
```

### Phase 18-B-2: PDF 단일 페이지 뷰어

**파일**: `frontend/src/components/pdf/PdfSinglePageView.tsx` (신규)

```typescript
/**
 * PdfSinglePageView - PDF 단일 페이지 뷰어
 * Stage 18: PDF 교재 뷰어
 */

import { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfSinglePageViewProps {
  fileUrl: string;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onTotalPages: (total: number) => void;
}

export function PdfSinglePageView({
  fileUrl,
  currentPage,
  totalPages,
  onPageChange,
  onTotalPages,
}: PdfSinglePageViewProps) {
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(true);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setIsLoading(false);
    onTotalPages(numPages);
  }, [onTotalPages]);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  const handlePrev = () => onPageChange(Math.max(currentPage - 1, 1));
  const handleNext = () => onPageChange(Math.min(currentPage + 1, totalPages));

  return (
    <div className="flex flex-col h-full">
      {/* 컨트롤 바 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
        {/* 페이지 네비게이션 */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={currentPage <= 1}
            className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-30"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1">
            <input
              type="number"
              value={currentPage}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (page >= 1 && page <= totalPages) {
                  onPageChange(page);
                }
              }}
              className="w-14 px-2 py-1 text-center border rounded"
              min={1}
              max={totalPages}
            />
            <span className="text-gray-500">/ {totalPages}</span>
          </div>

          <button
            onClick={handleNext}
            disabled={currentPage >= totalPages}
            className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 줌 컨트롤 */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
            className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-30"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-600 w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            disabled={scale >= 2.5}
            className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-30"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* PDF 페이지 */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-4 bg-gray-100">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={null}
        >
          <Page
            pageNumber={currentPage}
            scale={scale}
            className="shadow-lg"
          />
        </Document>
      </div>
    </div>
  );
}
```

### Phase 18-B-3: PDF 뷰어 모달

**파일**: `frontend/src/components/pdf/PdfViewerModal.tsx` (신규)

```typescript
/**
 * PdfViewerModal - PDF 뷰어 전체 화면 모달
 * Stage 18: PDF 교재 뷰어
 *
 * 기능:
 * - 썸네일 그리드 / 단일 페이지 전환
 * - 페이지 범위 선택 (시작/끝)
 * - 선택 완료 시 콜백
 */

import { useState, useCallback } from 'react';
import { X, Grid, FileText, Check } from 'lucide-react';
import { PdfThumbnailGrid } from './PdfThumbnailGrid';
import { PdfSinglePageView } from './PdfSinglePageView';
import type { PageRange, PdfViewerMode } from '@/types/textbook';

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  textbookName: string;
  onSelectRange: (range: PageRange) => void;
  /** 초기 선택 범위 (수정 시) */
  initialRange?: PageRange;
}

export function PdfViewerModal({
  isOpen,
  onClose,
  fileUrl,
  textbookName,
  onSelectRange,
  initialRange,
}: PdfViewerModalProps) {
  const [mode, setMode] = useState<PdfViewerMode>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // 선택 상태
  const [startPage, setStartPage] = useState<number | null>(initialRange?.startPage ?? null);
  const [endPage, setEndPage] = useState<number | null>(initialRange?.endPage ?? null);
  const [selectingEnd, setSelectingEnd] = useState(false);

  // 페이지 클릭 핸들러
  const handlePageClick = useCallback((pageNumber: number) => {
    if (!selectingEnd) {
      // 시작 페이지 선택
      setStartPage(pageNumber);
      setEndPage(null);
      setSelectingEnd(true);
    } else {
      // 끝 페이지 선택
      if (startPage !== null) {
        // 시작보다 작으면 swap
        if (pageNumber < startPage) {
          setEndPage(startPage);
          setStartPage(pageNumber);
        } else {
          setEndPage(pageNumber);
        }
      }
      setSelectingEnd(false);
    }
  }, [selectingEnd, startPage]);

  // 선택 완료
  const handleConfirm = useCallback(() => {
    if (startPage !== null) {
      onSelectRange({
        startPage,
        endPage: endPage ?? startPage,
      });
      onClose();
    }
  }, [startPage, endPage, onSelectRange, onClose]);

  // 선택 초기화
  const handleReset = () => {
    setStartPage(null);
    setEndPage(null);
    setSelectingEnd(false);
  };

  // 썸네일에서 단일 페이지로 전환
  const handleViewPage = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    setMode('single');
  };

  if (!isOpen) return null;

  const hasSelection = startPage !== null;
  const rangeText = hasSelection
    ? endPage !== null
      ? `p.${startPage} ~ ${endPage}`
      : `p.${startPage}`
    : '페이지를 선택하세요';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
      {/* 헤더 */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-white border-b">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-semibold text-gray-900">{textbookName}</h2>
            <p className="text-sm text-gray-500">
              {selectingEnd ? '끝 페이지를 선택하세요' : '시작 페이지를 선택하세요'}
            </p>
          </div>
        </div>

        {/* 뷰 모드 전환 */}
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                mode === 'grid' ? 'bg-white shadow' : 'hover:bg-gray-200'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMode('single')}
              className={`p-2 rounded-md transition-colors ${
                mode === 'single' ? 'bg-white shadow' : 'hover:bg-gray-200'
              }`}
            >
              <FileText className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="flex-1 overflow-hidden bg-gray-100">
        {mode === 'grid' ? (
          <div className="h-full overflow-auto">
            <PdfThumbnailGrid
              fileUrl={fileUrl}
              selectedStart={startPage}
              selectedEnd={endPage}
              onPageClick={handlePageClick}
              onTotalPages={setTotalPages}
            />
          </div>
        ) : (
          <PdfSinglePageView
            fileUrl={fileUrl}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onTotalPages={setTotalPages}
          />
        )}
      </div>

      {/* 하단 선택 바 */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-white border-t">
        <div className="flex items-center gap-3">
          <span className={`text-lg font-semibold ${hasSelection ? 'text-blue-600' : 'text-gray-400'}`}>
            {rangeText}
          </span>
          {hasSelection && (
            <button
              onClick={handleReset}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              초기화
            </button>
          )}
        </div>

        <button
          onClick={handleConfirm}
          disabled={!hasSelection}
          className={`
            flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-colors
            ${hasSelection
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          <Check className="w-5 h-5" />
          선택 완료
        </button>
      </div>
    </div>
  );
}
```

### Phase 18-B-4: 컴포넌트 인덱스

**파일**: `frontend/src/components/pdf/index.ts` (신규)

```typescript
export { PdfThumbnailGrid } from './PdfThumbnailGrid';
export { PdfSinglePageView } from './PdfSinglePageView';
export { PdfViewerModal } from './PdfViewerModal';
```

---

## Phase 18-C: ProgressModal 통합

### Phase 18-C-1: TextbookSelector 컴포넌트

**파일**: `frontend/src/components/backoffice/modals/TextbookSelector.tsx` (신규)

```typescript
/**
 * TextbookSelector - 교재 선택 + PDF 열기 버튼
 * Stage 18: PDF 교재 뷰어
 */

import { useState } from 'react';
import { Book, FileText } from 'lucide-react';
import { PdfViewerModal } from '@/components/pdf';
import { useTextbooksByClass } from '@/hooks/useTextbooks';
import type { PageRange, Textbook } from '@/types/textbook';

interface TextbookSelectorProps {
  classId: string;
  value: string;
  onChange: (textbookName: string) => void;
  onPageRangeSelect: (range: PageRange) => void;
  placeholder?: string;
}

export function TextbookSelector({
  classId,
  value,
  onChange,
  onPageRangeSelect,
  placeholder = '교재 선택...',
}: TextbookSelectorProps) {
  const { data: textbooks = [] } = useTextbooksByClass(classId);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [selectedTextbook, setSelectedTextbook] = useState<Textbook | null>(null);

  // 현재 선택된 교재 찾기
  const currentTextbook = textbooks.find(t => t.displayName === value);

  const handleOpenPdf = (textbook: Textbook) => {
    setSelectedTextbook(textbook);
    setShowPdfViewer(true);
  };

  const handleSelectRange = (range: PageRange) => {
    onPageRangeSelect(range);
    setShowPdfViewer(false);
  };

  return (
    <>
      <div className="flex gap-2">
        {/* 교재 드롭다운 */}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="">{placeholder}</option>
          {textbooks.map((textbook) => (
            <option key={textbook.id} value={textbook.displayName}>
              {textbook.displayName}
            </option>
          ))}
        </select>

        {/* PDF 열기 버튼 */}
        {currentTextbook && (
          <button
            type="button"
            onClick={() => handleOpenPdf(currentTextbook)}
            className="flex items-center gap-1.5 px-3 h-10 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">PDF</span>
          </button>
        )}
      </div>

      {/* PDF 뷰어 모달 */}
      {selectedTextbook && (
        <PdfViewerModal
          isOpen={showPdfViewer}
          onClose={() => setShowPdfViewer(false)}
          fileUrl={selectedTextbook.fileUrl}
          textbookName={selectedTextbook.displayName}
          onSelectRange={handleSelectRange}
        />
      )}
    </>
  );
}
```

### Phase 18-C-2: ProgressModal 수정

**파일**: `frontend/src/components/backoffice/modals/ProgressModal.tsx` (수정)

```typescript
// 기존 ProgressRow를 수정하여 PDF 버튼 추가

interface ProgressRowProps {
  classId?: string;  // 🆕 추가
  textbook: string;
  startPage: string;
  endPage: string;
  onTextbookChange: (v: string) => void;
  onStartPageChange: (v: string) => void;
  onEndPageChange: (v: string) => void;
  textbooks?: string[];
}

function ProgressRow({
  classId,
  textbook,
  startPage,
  endPage,
  onTextbookChange,
  onStartPageChange,
  onEndPageChange,
  textbooks = [],
}: ProgressRowProps) {
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const { data: classTextbooks = [] } = useTextbooksByClass(classId || null);

  // 현재 선택된 교재의 PDF 정보
  const currentPdf = classTextbooks.find(t => t.displayName === textbook);

  const handlePageRangeSelect = (range: PageRange) => {
    onStartPageChange(range.startPage.toString());
    onEndPageChange(range.endPage.toString());
    setShowPdfViewer(false);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* 교재 검색 자동완성 */}
      <div className="flex gap-2">
        <TextbookAutocomplete
          value={textbook}
          onChange={onTextbookChange}
          textbooks={textbooks}
          placeholder="교재 검색..."
          className="flex-1"
        />

        {/* 🆕 PDF 열기 버튼 */}
        {currentPdf && (
          <button
            type="button"
            onClick={() => setShowPdfViewer(true)}
            className="flex items-center gap-1 px-3 h-10 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex-shrink-0"
          >
            <FileText className="w-4 h-4" />
            <span className="text-xs font-medium">PDF</span>
          </button>
        )}
      </div>

      {/* 페이지 입력 행 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 flex-shrink-0">p.</span>
        <input
          type="text"
          value={startPage}
          onChange={(e) => onStartPageChange(e.target.value)}
          placeholder="시작"
          className="w-[60px] h-10 text-center border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:border-blue-500"
        />
        <span className="text-sm text-gray-400">~</span>
        <input
          type="text"
          value={endPage}
          onChange={(e) => onEndPageChange(e.target.value)}
          placeholder="끝"
          className="w-[60px] h-10 text-center border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* PDF 뷰어 모달 */}
      {currentPdf && (
        <PdfViewerModal
          isOpen={showPdfViewer}
          onClose={() => setShowPdfViewer(false)}
          fileUrl={currentPdf.fileUrl}
          textbookName={currentPdf.displayName}
          onSelectRange={handlePageRangeSelect}
        />
      )}
    </div>
  );
}
```

---

## Phase 18-D: 관리자 교재 업로드 UI

### Phase 18-D-1: TextbookUploader 컴포넌트

**파일**: `frontend/src/components/admin/TextbookUploader.tsx` (신규)

```typescript
/**
 * TextbookUploader - 교재 PDF 업로드 (관리자용)
 * Stage 18: PDF 교재 뷰어
 */

import { useState, useRef } from 'react';
import { Upload, X, FileText, Trash2 } from 'lucide-react';
import { useTextbooksByClass, useUploadTextbook, useDeleteTextbook } from '@/hooks/useTextbooks';
import type { Textbook } from '@/types/textbook';

interface TextbookUploaderProps {
  classId: string;
  className: string;
}

export function TextbookUploader({ classId, className }: TextbookUploaderProps) {
  const { data: textbooks = [], isLoading } = useTextbooksByClass(classId);
  const uploadMutation = useUploadTextbook();
  const deleteMutation = useDeleteTextbook();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = displayName || file.name.replace('.pdf', '');

    try {
      await uploadMutation.mutateAsync({
        classId,
        displayName: name,
        file,
      });
      setDisplayName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('업로드 실패:', error);
    }
  };

  const handleDelete = async (textbook: Textbook) => {
    if (!confirm(`"${textbook.displayName}" 교재를 삭제하시겠습니까?`)) return;

    try {
      await deleteMutation.mutateAsync(textbook);
    } catch (error) {
      console.error('삭제 실패:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-white rounded-xl border p-4">
      <h3 className="font-semibold text-gray-900 mb-3">{className} 교재</h3>

      {/* 교재 목록 */}
      <div className="space-y-2 mb-4">
        {isLoading ? (
          <div className="text-sm text-gray-500">로딩 중...</div>
        ) : textbooks.length === 0 ? (
          <div className="text-sm text-gray-400 py-4 text-center">
            등록된 교재가 없습니다
          </div>
        ) : (
          textbooks.map((textbook) => (
            <div
              key={textbook.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-500" />
                <div>
                  <div className="font-medium text-gray-900">{textbook.displayName}</div>
                  <div className="text-xs text-gray-500">
                    {formatFileSize(textbook.fileSize)}
                    {textbook.pageCount && ` · ${textbook.pageCount}페이지`}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDelete(textbook)}
                disabled={deleteMutation.isPending}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* 업로드 폼 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="교재명 (예: 베이직쎈)"
          className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-blue-500"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {uploadMutation.isPending ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          <span className="text-sm font-medium">PDF 추가</span>
        </button>
      </div>
    </div>
  );
}
```

---

## Phase 18-E: Supabase 설정 (선택)

### Phase 18-E-1: 테이블 마이그레이션

```sql
-- textbooks 테이블 생성
CREATE TABLE textbooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  page_count INTEGER,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE textbooks ENABLE ROW LEVEL SECURITY;

-- 조회: 모든 인증된 사용자
CREATE POLICY "textbooks_select" ON textbooks
  FOR SELECT TO authenticated USING (true);

-- 삽입/수정/삭제: 관리자만
CREATE POLICY "textbooks_admin_all" ON textbooks
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 인덱스
CREATE INDEX idx_textbooks_class_id ON textbooks(class_id);
```

### Phase 18-E-2: Storage 버킷 설정

```sql
-- Storage 버킷 생성 (Supabase Dashboard에서)
-- 버킷 이름: textbooks
-- Public: false (RLS로 제어)

-- Storage 정책
CREATE POLICY "textbooks_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'textbooks');

CREATE POLICY "textbooks_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'textbooks'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "textbooks_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'textbooks'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

---

## 체크리스트

### Phase 18-A: 기반 작업
- [ ] react-pdf 설치
- [ ] pdfWorker 설정
- [ ] textbook.ts 타입 정의
- [ ] useTextbooks.ts 훅

### Phase 18-B: PDF 뷰어 컴포넌트
- [ ] PdfThumbnailGrid
- [ ] PdfSinglePageView
- [ ] PdfViewerModal
- [ ] 빌드 테스트

### Phase 18-C: ProgressModal 통합
- [ ] TextbookSelector 컴포넌트
- [ ] ProgressRow에 PDF 버튼 추가
- [ ] 페이지 범위 자동 입력

### Phase 18-D: 관리자 업로드 UI
- [ ] TextbookUploader 컴포넌트
- [ ] 반 관리 화면에 통합

### Phase 18-E: Supabase 설정 (선택)
- [ ] textbooks 테이블
- [ ] Storage 버킷
- [ ] RLS 정책

---

*v1.0 - 2025-12-21*
