# PDF 뷰어 UX 개선 연구리포트

> 작성일: 2025-12-22
> 상태: 연구 완료

---

## 1. 현재 상황 분석

### 1.1 현재 구현
- **그리드**: 2열 고정
- **썸네일 크기**: 400px 고정
- **시작 페이지**: 항상 1페이지부터 표시
- **진도 저장**: `progress` 테이블에 `start_page`, `end_page` 저장

### 1.2 사용자 요구사항
1. **반응형 크기**: 캔버스 높이에 맞춰 페이지 크기 자동 조절
2. **동적 열 개수**: 화면에 3장이 들어가면 3열, 2장이면 2열
3. **마지막 진도 기억**: 다음 수업 시 마지막 진행 페이지(예: 18페이지)부터 표시
4. **진도 시각화**: 이전 수업 범위를 시각적으로 표시

---

## 2. 기술 분석

### 2.1 반응형 썸네일 크기 계산

```typescript
// 화면 높이 기반 최적 페이지 높이 계산
function calculateOptimalPageHeight(containerHeight: number): number {
  // 헤더(60px) + 하단 바(80px) + 여백(40px) 제외
  const availableHeight = containerHeight - 180;

  // PDF A4 비율: 1:1.414
  return availableHeight;
}

// 페이지 높이 기반 너비 계산
function calculatePageWidth(pageHeight: number): number {
  return pageHeight / 1.414; // A4 비율
}
```

### 2.2 동적 열 개수 계산

```typescript
function calculateColumns(containerWidth: number, pageWidth: number): number {
  const gap = 16; // gap-4 = 16px
  const padding = 32; // p-4 = 16px * 2
  const availableWidth = containerWidth - padding;

  // 최대 들어갈 수 있는 열 수 계산
  const maxColumns = Math.floor((availableWidth + gap) / (pageWidth + gap));

  // 1~4열 범위로 제한
  return Math.max(1, Math.min(4, maxColumns));
}
```

### 2.3 마지막 진도 페이지 조회

**현재 데이터 흐름**:
```
progress 테이블
├── class_id (반 ID)
├── date (수업 날짜)
├── textbook (교재명)
├── start_page (시작 페이지)
└── end_page (끝 페이지)  ← 이 값이 다음 시작점
```

**구현 전략**:
```typescript
// ProgressModal에서 이미 lastProgress를 조회함
const { data: lastProgress } = useLastProgressBefore(classId, todayDate);

// PDF 뷰어에 초기 페이지 전달
<PdfViewerModal
  initialPage={lastProgress?.end_page || 1}
  lastRange={lastProgress ? {
    start: lastProgress.start_page,
    end: lastProgress.end_page
  } : null}
/>
```

---

## 3. UI/UX 설계

### 3.1 레이아웃 구조

```
┌─────────────────────────────────────────────────────────────┐
│  [X] 베이직쎈 고1                    [그리드] [페이지]  총 280p │  ← 헤더 (60px)
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                     │
│  │ 지난수업 │  │ 지난수업 │  │ 지난수업 │                     │  ← 지난 수업 범위
│  │   15    │  │   16    │  │   17    │                     │     (반투명 오버레이)
│  │ ░░░░░░░ │  │ ░░░░░░░ │  │ ░░░░░░░ │                     │
│  └─────────┘  └─────────┘  └─────────┘                     │
│                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                     │
│  │ 마지막  │  │         │  │         │                     │  ← 현재 선택 가능
│  │   18    │  │   19    │  │   20    │                     │     (18페이지 강조)
│  │ ▓▓▓▓▓▓▓ │  │         │  │         │                     │
│  └─────────┘  └─────────┘  └─────────┘                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [p.19 ~ 21]                           [초기화] [선택 완료] │  ← 하단 바 (80px)
└─────────────────────────────────────────────────────────────┘
```

### 3.2 시각적 상태 정의

| 상태 | 스타일 | 설명 |
|------|--------|------|
| 지난 수업 범위 | 반투명 회색 오버레이 + "지난 수업" 라벨 | 15-17페이지 |
| 마지막 진행 페이지 | 노란색 테두리 + "마지막" 라벨 | 18페이지 |
| 현재 선택 범위 | 파란색 테두리 + 체크 아이콘 | 19-21페이지 |
| 기본 상태 | 회색 테두리 | 미선택 페이지 |

### 3.3 초기 스크롤 위치

```typescript
// 마지막 진행 페이지가 화면 상단에 오도록 스크롤
useEffect(() => {
  if (lastEndPage && containerRef.current) {
    const pageElement = containerRef.current.querySelector(
      `[data-page="${lastEndPage}"]`
    );
    pageElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}, [lastEndPage, isLoading]);
```

---

## 4. 데이터 흐름 설계

### 4.1 Props 확장

```typescript
interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  textbookName: string;
  onSelectRange: (range: PageRange) => void;

  // 새로 추가
  /** 마지막 진행 범위 (지난 수업) */
  lastProgress?: {
    startPage: number;
    endPage: number;
    date: string;  // 표시용
  };
  /** 초기 선택 범위 (수정 시) */
  initialRange?: PageRange;
}
```

### 4.2 ProgressRow에서 전달

```typescript
// ProgressModal.tsx의 ProgressRow 컴포넌트
function ProgressRow({ classId, textbook, ... }) {
  const { data: lastProgressData } = useLastProgressBefore(classId, todayDate);

  // 현재 교재와 일치하는 마지막 진도 찾기
  const lastTextbookProgress = useMemo(() => {
    if (!lastProgressData || lastProgressData.textbook !== textbook) {
      return null;
    }
    return {
      startPage: lastProgressData.start_page,
      endPage: lastProgressData.end_page,
      date: lastProgressData.date,
    };
  }, [lastProgressData, textbook]);

  return (
    <PdfViewerModal
      lastProgress={lastTextbookProgress}
      // ...
    />
  );
}
```

---

## 5. 구현 단계

### Phase 1: 반응형 레이아웃 (우선)
1. `PdfThumbnailGrid`에 컨테이너 크기 감지 추가
2. 페이지 높이를 컨테이너 높이에 맞춤
3. 동적 열 개수 계산

### Phase 2: 마지막 진도 표시
1. `lastProgress` prop 추가
2. 지난 수업 범위 오버레이 스타일 추가
3. 마지막 페이지 강조 스타일 추가

### Phase 3: 자동 스크롤
1. 마지막 진행 페이지로 초기 스크롤
2. 스무스 스크롤 애니메이션

### Phase 4: 페이지별 진도 연동 (옵션)
1. 교재별 마지막 진도 저장
2. 진도 모달에서 자동 연결

---

## 6. 예상 파일 변경

| 파일 | 변경 내용 |
|------|----------|
| `PdfThumbnailGrid.tsx` | 반응형 크기, 동적 열, 마지막 진도 표시 |
| `PdfViewerModal.tsx` | `lastProgress` prop 추가, 초기 스크롤 |
| `ProgressModal.tsx` | 마지막 진도 데이터 전달 |

---

## 7. 기술적 고려사항

### 7.1 성능
- **Lazy Loading**: 화면에 보이는 페이지만 렌더링 (react-pdf 기본 지원)
- **Virtualization**: 페이지 수가 많을 경우 react-window 도입 검토

### 7.2 반응형 계산 시점
- `ResizeObserver`로 컨테이너 크기 변경 감지
- `useMemo`로 불필요한 재계산 방지

### 7.3 PDF 로딩 타이밍
- PDF 로드 완료 후 스크롤 적용
- 로딩 중에는 스켈레톤 표시

---

## 8. 결론 및 권장사항

### 권장 구현 순서
1. **Phase 1 (반응형)**: 사용성 즉시 개선
2. **Phase 2 (마지막 진도)**: 핵심 UX 개선
3. **Phase 3 (스크롤)**: 편의성 향상

### 예상 효과
- 문제 확인 용이 (큰 썸네일)
- 진도 연속성 확보 (마지막 페이지 기억)
- 선택 시간 단축 (자동 스크롤)

---

*v1.0 - 2025-12-22*
