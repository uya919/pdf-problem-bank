# PDF 뷰어 UX 개선 개발 계획

> 작성일: 2025-12-22
> 참조: [408_pdf_viewer_ux_improvement_research.md](./408_pdf_viewer_ux_improvement_research.md)
> 상태: 개발 대기

---

## 개발 범위

1. **반응형 레이아웃**: 화면 크기에 맞춰 동적 열/크기 조절
2. **마지막 진도 표시**: 이전 수업 범위 시각화 + 자동 스크롤
3. **진도 데이터 연동**: 교재별 마지막 진도 전달

---

## Phase 1: 반응형 레이아웃

### 1-A: 컨테이너 크기 감지

**파일**: `frontend/src/components/pdf/PdfThumbnailGrid.tsx`

**변경 내용**:
```typescript
// 추가할 import
import { useRef, useState, useEffect, useCallback } from 'react';

// Props 확장
interface PdfThumbnailGridProps {
  fileUrl: string;
  selectedStart: number | null;
  selectedEnd: number | null;
  onPageClick: (pageNumber: number) => void;
  onTotalPages: (total: number) => void;
  onPageDoubleClick?: (pageNumber: number) => void;
  // 새로 추가
  /** 지난 수업 범위 */
  lastProgress?: { startPage: number; endPage: number };
}

// 컨테이너 ref 및 크기 상태 추가
const containerRef = useRef<HTMLDivElement>(null);
const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

// ResizeObserver로 크기 감지
useEffect(() => {
  const container = containerRef.current;
  if (!container) return;

  const observer = new ResizeObserver((entries) => {
    const { width, height } = entries[0].contentRect;
    setContainerSize({ width, height });
  });

  observer.observe(container);
  return () => observer.disconnect();
}, []);
```

### 1-B: 동적 크기 계산

**파일**: `frontend/src/components/pdf/PdfThumbnailGrid.tsx`

**계산 로직**:
```typescript
// 최적 페이지 크기 및 열 수 계산
const { pageWidth, columns } = useMemo(() => {
  if (containerSize.width === 0 || containerSize.height === 0) {
    return { pageWidth: 400, columns: 2 }; // 기본값
  }

  const gap = 16; // gap-4
  const padding = 32; // p-4 * 2

  // 1. 높이 기반 페이지 크기 계산 (한 페이지가 화면에 꽉 차도록)
  const availableHeight = containerSize.height - padding;
  const pageHeight = availableHeight - 40; // 라벨 영역
  const heightBasedWidth = pageHeight / 1.414; // A4 비율

  // 2. 너비 기반 최대 열 수 계산
  const availableWidth = containerSize.width - padding;
  const maxColumns = Math.floor((availableWidth + gap) / (heightBasedWidth + gap));

  // 3. 1~4열 범위로 제한, 너비에 맞춰 재계산
  const finalColumns = Math.max(1, Math.min(4, maxColumns));
  const finalWidth = (availableWidth - gap * (finalColumns - 1)) / finalColumns;

  return {
    pageWidth: Math.min(finalWidth, heightBasedWidth),
    columns: finalColumns,
  };
}, [containerSize]);
```

### 1-C: 그리드 스타일 적용

**파일**: `frontend/src/components/pdf/PdfThumbnailGrid.tsx`

**변경 내용**:
```typescript
// 기존
className={isLoading ? '' : 'grid grid-cols-2 gap-4 p-4'}

// 변경
className={isLoading ? '' : `grid gap-4 p-4`}
style={{
  gridTemplateColumns: `repeat(${columns}, 1fr)`,
}}

// Page 컴포넌트 width 동적 적용
<Page
  pageNumber={pageNumber}
  width={pageWidth}
  // ...
/>
```

**체크리스트**:
- [ ] containerRef 추가
- [ ] ResizeObserver 설정
- [ ] 동적 크기 계산 로직
- [ ] 그리드 스타일 동적 적용
- [ ] 빌드 테스트

---

## Phase 2: 마지막 진도 표시

### 2-A: Props 확장

**파일**: `frontend/src/components/pdf/PdfViewerModal.tsx`

**변경 내용**:
```typescript
interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  textbookName: string;
  onSelectRange: (range: PageRange) => void;
  initialRange?: PageRange;
  // 새로 추가
  /** 지난 수업 진도 (시각화용) */
  lastProgress?: {
    startPage: number;
    endPage: number;
    date: string;
  };
}
```

### 2-B: PdfThumbnailGrid에 전달

**파일**: `frontend/src/components/pdf/PdfViewerModal.tsx`

**변경 내용**:
```typescript
<PdfThumbnailGrid
  fileUrl={fileUrl}
  selectedStart={startPage}
  selectedEnd={endPage}
  onPageClick={handlePageClick}
  onTotalPages={setTotalPages}
  onPageDoubleClick={handlePageDoubleClick}
  // 새로 추가
  lastProgress={lastProgress ? {
    startPage: lastProgress.startPage,
    endPage: lastProgress.endPage,
  } : undefined}
/>
```

### 2-C: 지난 수업 범위 스타일

**파일**: `frontend/src/components/pdf/PdfThumbnailGrid.tsx`

**추가할 함수**:
```typescript
// 지난 수업 범위 확인
const isInLastProgress = (page: number) => {
  if (!lastProgress) return false;
  return page >= lastProgress.startPage && page <= lastProgress.endPage;
};

// 마지막 진행 페이지 확인
const isLastProgressEnd = (page: number) => {
  return lastProgress?.endPage === page;
};
```

**스타일 적용**:
```typescript
<button
  className={`
    relative rounded-lg overflow-hidden border-2 transition-all
    hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]
    focus:outline-none focus:ring-2 focus:ring-blue-400
    ${isSelected
      ? 'border-blue-500 ring-2 ring-blue-200 shadow-md'
      : isLastProgressEnd
      ? 'border-amber-400 ring-2 ring-amber-100'
      : isInLastProgress
      ? 'border-gray-300 opacity-60'
      : 'border-gray-200 hover:border-gray-300'
    }
  `}
>
  {/* 지난 수업 오버레이 */}
  {isInLastProgress && !isSelected && (
    <div className="absolute inset-0 bg-gray-500/20 z-10 flex items-center justify-center">
      <span className="bg-gray-800/70 text-white text-xs px-2 py-1 rounded">
        지난 수업
      </span>
    </div>
  )}

  {/* 마지막 페이지 라벨 */}
  {isLastProgressEnd && !isSelected && (
    <div className="absolute top-1 left-1 z-20">
      <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
        마지막
      </span>
    </div>
  )}

  {/* ... 기존 코드 ... */}
</button>
```

**체크리스트**:
- [ ] PdfViewerModal props 확장
- [ ] PdfThumbnailGrid lastProgress prop 추가
- [ ] isInLastProgress, isLastProgressEnd 함수
- [ ] 지난 수업 오버레이 스타일
- [ ] 마지막 페이지 강조 스타일
- [ ] 빌드 테스트

---

## Phase 3: 자동 스크롤

### 3-A: 스크롤 로직

**파일**: `frontend/src/components/pdf/PdfThumbnailGrid.tsx`

**변경 내용**:
```typescript
// 마지막 진행 페이지로 스크롤
useEffect(() => {
  if (!lastProgress || isLoading || numPages === 0) return;

  // 약간의 딜레이 후 스크롤 (렌더링 완료 대기)
  const timer = setTimeout(() => {
    const targetPage = lastProgress.endPage;
    const pageElement = containerRef.current?.querySelector(
      `[data-page="${targetPage}"]`
    );

    if (pageElement) {
      pageElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, 300);

  return () => clearTimeout(timer);
}, [lastProgress, isLoading, numPages]);
```

### 3-B: data-page 속성 추가

**파일**: `frontend/src/components/pdf/PdfThumbnailGrid.tsx`

**변경 내용**:
```typescript
<button
  key={pageNumber}
  data-page={pageNumber}  // 추가
  onClick={() => onPageClick(pageNumber)}
  // ...
>
```

**체크리스트**:
- [ ] data-page 속성 추가
- [ ] 스크롤 useEffect 추가
- [ ] 스크롤 동작 테스트
- [ ] 빌드 테스트

---

## Phase 4: 진도 데이터 연동

### 4-A: ProgressRow에서 마지막 진도 조회

**파일**: `frontend/src/components/backoffice/modals/ProgressModal.tsx`

**변경 내용**:
```typescript
function ProgressRow({
  classId,
  textbook,
  // ... 기존 props
}: ProgressRowProps) {
  // 기존: const { data: pdfTextbooks = [] } = useTextbooksByClass(classId || null);

  // 추가: 해당 교재의 마지막 진도 조회
  const { data: allProgress } = useClassProgress(classId || null);

  // 현재 교재와 일치하는 마지막 진도 찾기
  const lastTextbookProgress = useMemo(() => {
    if (!allProgress || !textbook) return null;

    // 교재명이 일치하는 진도 중 가장 최근 것
    const matching = allProgress
      .filter(p => p.textbook === textbook)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (matching.length === 0) return null;

    return {
      startPage: matching[0].start_page,
      endPage: matching[0].end_page,
      date: matching[0].date,
    };
  }, [allProgress, textbook]);

  // PdfViewerModal에 전달
  return (
    <>
      {/* ... */}
      {currentPdf && (
        <PdfViewerModal
          isOpen={showPdfViewer}
          onClose={() => setShowPdfViewer(false)}
          fileUrl={currentPdf.fileUrl}
          textbookName={currentPdf.displayName}
          onSelectRange={handlePageRangeSelect}
          initialRange={/* 기존 */}
          lastProgress={lastTextbookProgress}  // 추가
        />
      )}
    </>
  );
}
```

### 4-B: useClassProgress 훅 확인/수정

**파일**: `frontend/src/hooks/useBackofficeData.ts`

**확인할 훅**:
```typescript
// 이미 존재하는지 확인, 없으면 추가
export function useClassProgress(classId: string | null) {
  return useQuery({
    queryKey: ['progress', 'class', classId],
    queryFn: async () => {
      if (!classId) return [];

      const { data, error } = await supabase
        .from('progress')
        .select('*')
        .eq('class_id', classId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!classId,
  });
}
```

**체크리스트**:
- [ ] useClassProgress 훅 확인/추가
- [ ] ProgressRow에서 마지막 진도 조회
- [ ] PdfViewerModal에 lastProgress 전달
- [ ] 전체 흐름 테스트
- [ ] 빌드 테스트

---

## 파일별 변경 요약

| 파일 | Phase | 변경 내용 |
|------|-------|----------|
| `PdfThumbnailGrid.tsx` | 1, 2, 3 | 반응형 + 마지막 진도 표시 + 스크롤 |
| `PdfViewerModal.tsx` | 2 | lastProgress prop 추가 |
| `ProgressModal.tsx` | 4 | 마지막 진도 조회 및 전달 |
| `useBackofficeData.ts` | 4 | useClassProgress 훅 (필요시) |

---

## 타입 정의

### 새로 추가할 타입

**파일**: `frontend/src/types/textbook.ts` (기존)

```typescript
// 이미 있는지 확인, 없으면 추가
export interface LastProgressInfo {
  startPage: number;
  endPage: number;
  date: string;
}
```

---

## 테스트 체크리스트

### Phase 1 완료 후
- [ ] 화면 크기 변경 시 그리드 열 수 변경 확인
- [ ] 페이지 크기가 화면 높이에 맞게 조절되는지 확인
- [ ] 1열~4열 범위 내 동작 확인

### Phase 2 완료 후
- [ ] 지난 수업 범위가 반투명으로 표시되는지 확인
- [ ] 마지막 페이지에 "마지막" 라벨 표시 확인
- [ ] 선택 시 지난 수업 스타일보다 우선 적용되는지 확인

### Phase 3 완료 후
- [ ] PDF 로드 후 마지막 페이지로 자동 스크롤 확인
- [ ] 스크롤 애니메이션 부드러움 확인

### Phase 4 완료 후
- [ ] 진도 저장 후 다음 수업에서 마지막 진도 표시 확인
- [ ] 교재별로 다른 마지막 진도가 표시되는지 확인

---

## 예상 에러 및 해결책

| 에러 | 원인 | 해결책 |
|------|------|--------|
| ResizeObserver loop | 크기 변경 무한 루프 | debounce 적용 |
| 스크롤 안됨 | 렌더링 완료 전 스크롤 | setTimeout 딜레이 |
| lastProgress undefined | 데이터 없음 | optional chaining |
| 타입 에러 | props 불일치 | 타입 정의 확인 |

---

*v1.0 - 2025-12-22*
