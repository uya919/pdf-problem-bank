# Phase 67: PC 버전 UI 밀도 개선 - 단계별 개발 계획

**작성일**: 2025-12-09
**목표**: PC 화면에서 더 많은 문제를 한눈에 볼 수 있도록 UI 밀도 개선

---

## 목표 UI (목업 기준)

| 항목 | 현재 | 개선 후 |
|------|------|---------|
| 컨테이너 너비 | 672px (max-w-2xl) | 1152px (max-w-6xl) |
| 열 수 | 4열 고정 | lg:6열, xl:8열 |
| 카드 비율 | 4:5 (세로 긴) | 1:1 (정사각형) |
| 카드 패딩 | p-3 | p-2 |
| 해설 뱃지 | 없음 | 보라색 📖 뱃지 |
| 더보기 위치 | 아래 (한 줄 차지) | 오른쪽 (그리드 아이템) |

---

## 1단계: 컨테이너 너비 확장

**예상 시간**: 5분
**파일**: `pages/problemBank/ProblemsInBook.tsx`

### 변경 내용

```tsx
// 108번 라인
// Before
<div className="max-w-2xl mx-auto px-4 py-6">

// After
<div className="max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 lg:px-8 py-6">
```

### 브레이크포인트

| 화면 | 너비 | 최대 너비 |
|------|------|----------|
| 모바일/태블릿 | ~1023px | 672px (max-w-2xl) |
| 노트북 | 1024~1279px | 1024px (max-w-5xl) |
| 데스크톱 | 1280px~ | 1152px (max-w-6xl) |

---

## 2단계: useResponsiveColumns 훅 업데이트

**예상 시간**: 10분
**파일**: `hooks/useResponsiveColumns.ts`

### 변경 내용

```tsx
// Before
const getColumns = () => {
  if (window.innerWidth >= 768) return desktop;   // md: 4열
  if (window.innerWidth >= 640) return tablet;    // sm: 3열
  return mobile;                                   // 2열
};

// After
const getColumns = () => {
  if (window.innerWidth >= 1280) return 8;   // xl: 8열
  if (window.innerWidth >= 1024) return 6;   // lg: 6열
  if (window.innerWidth >= 768) return 4;    // md: 4열
  if (window.innerWidth >= 640) return 3;    // sm: 3열
  return 2;                                   // default: 2열
};
```

### 설정 가능하도록 인터페이스 확장

```tsx
interface ResponsiveColumnsConfig {
  mobile?: number;      // default: 2
  tablet?: number;      // default: 3
  desktop?: number;     // default: 4
  largeDesktop?: number; // default: 6 (신규)
  xlDesktop?: number;    // default: 8 (신규)
}
```

---

## 3단계: CollapsibleGrid 열 수 증가

**예상 시간**: 10분
**파일**: `components/toss/CollapsibleGrid.tsx`

### 변경 내용

```tsx
// 46번 라인 근처
// Before
<div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 ${gapClass}`}>

// After
<div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 ${gapClass}`}>
```

---

## 4단계: TossProblemCard 컴팩트 버전 + 해설 뱃지

**예상 시간**: 25분
**파일**: `components/toss/TossProblemCard.tsx`

### 4-A: Props 인터페이스 확장

```tsx
interface TossProblemCardProps {
  problem: {
    id: string;
    thumbnail: string;
    displayName?: string;
    problemNumber?: string;
    page?: number;
  };
  onTap?: () => void;
  selected?: boolean;
  hasLinkedSolution?: boolean;  // 신규: 해설 연결 여부
  compact?: boolean;            // 신규: 컴팩트 모드 (PC용)
}
```

### 4-B: 해설 연결 뱃지 추가

```tsx
import { BookOpen } from 'lucide-react';

// 카드 내부, 썸네일 위에 절대 위치로
{hasLinkedSolution && (
  <div className="absolute top-1.5 right-1.5 z-10 w-5 h-5
                  bg-purple-500 rounded-full shadow-sm
                  flex items-center justify-center">
    <BookOpen className="w-3 h-3 text-white" />
  </div>
)}
```

### 4-C: 컴팩트 모드 스타일

```tsx
// 카드 컨테이너
<div className={cn(
  "relative bg-white rounded-xl overflow-hidden border border-grey-100",
  compact ? "aspect-square" : "aspect-[4/5]"
)}>

// 썸네일 영역
<div className={cn(
  "w-full bg-grey-50",
  compact ? "aspect-square" : "aspect-[4/3]"
)}>

// 정보 영역
<div className={cn(
  "border-t border-grey-100",
  compact ? "p-2" : "p-3"
)}>
  <span className={cn(
    "font-semibold text-grey-800",
    compact ? "text-xs" : "text-sm"
  )}>
    {problem.displayName || problem.problemNumber}
  </span>
  <span className={cn(
    "text-grey-400",
    compact ? "text-[10px]" : "text-xs"
  )}>
    {problem.page}p
  </span>
</div>
```

---

## 5단계: CollapsibleGrid 더보기 버튼 인라인화

**예상 시간**: 20분
**파일**: `components/toss/CollapsibleGrid.tsx`

### 변경 내용

```tsx
export function CollapsibleGrid({
  items,
  defaultRows = 1,
  gapClass = 'gap-3',
  className = '',
  defaultExpanded = false,
  compact = false,  // 신규 prop
}: CollapsibleGridProps) {
  // ...

  return (
    <div className={className}>
      <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 ${gapClass}`}>
        {/* 보이는 아이템들 */}
        {visibleItems.map((item, index) => (
          <motion.div key={index} ...>
            {item}
          </motion.div>
        ))}

        {/* 더보기 버튼 - 그리드 아이템으로 */}
        {hasMore && !isExpanded && (
          <motion.button
            onClick={() => setIsExpanded(true)}
            className={cn(
              "bg-grey-50 border-2 border-dashed border-grey-200 rounded-xl",
              "flex flex-col items-center justify-center",
              "hover:bg-grey-100 hover:border-grey-300 transition-colors",
              "text-grey-500 hover:text-grey-700",
              compact ? "aspect-square" : "aspect-[4/5]"
            )}
            whileTap={{ scale: 0.98 }}
          >
            <span className="text-xl font-bold">+{hiddenCount}</span>
            <span className="text-xs mt-1">더 보기</span>
          </motion.button>
        )}
      </div>

      {/* 접기 버튼 - 펼친 상태에서만 (아래에 표시) */}
      {isExpanded && items.length > columns * defaultRows && (
        <motion.button
          onClick={() => setIsExpanded(false)}
          className="w-full mt-4 py-2 text-sm text-grey-400 hover:text-grey-600
                     rounded-xl transition-colors flex items-center justify-center gap-2"
          whileTap={{ scale: 0.98 }}
        >
          <ChevronUp className="w-4 h-4" />
          접기
        </motion.button>
      )}
    </div>
  );
}
```

---

## 6단계: useProblemsByBook 해설 연결 정보 병합

**예상 시간**: 20분
**파일**: `hooks/useProblemBankStats.ts`

### 변경 내용

```tsx
import { useLinkedSolutions } from './useDocuments';

export function useProblemsByBook(bookId: string) {
  const { data: problemsData, isLoading: problemsLoading } = useAllExportedProblems({
    documentId: bookId,
  });
  const { data: linkedData, isLoading: linkedLoading } = useLinkedSolutions();  // 추가

  const data = useMemo(() => {
    if (!problemsData?.problems) return undefined;

    const problems = problemsData.problems.filter((p) => p.document_id === bookId);

    // 해설 연결 정보 맵 생성
    const linkedKeys = new Set<string>();
    if (linkedData?.links) {
      Object.keys(linkedData.links).forEach(key => linkedKeys.add(key));
    }

    // ... 기존 코드 ...

    return {
      bookName: bookId,
      problems: problems.map((p) => {
        const linkKey = `${p.document_id}|${p.page_index}|${p.group_id}`;
        return {
          id: `${p.document_id}-${p.page_index}-${p.group_id}`,
          thumbnail: `/api/export/documents/${p.document_id}/problems/image?image_path=${encodeURIComponent(p.image_path)}`,
          displayName: p.problem_info?.problemNumber || p.group_id,
          problemNumber: p.problem_info?.problemNumber,
          page: p.problem_info?.page || p.page_index + 1,
          documentId: p.document_id,
          pageIndex: p.page_index,
          groupId: p.group_id,
          hasLinkedSolution: linkedKeys.has(linkKey),  // 신규
        };
      }),
      pageRange,
      hasMore: problemsData.has_more,
    };
  }, [problemsData, bookId, linkedData]);

  return {
    data,
    isLoading: problemsLoading || linkedLoading,  // 수정
  };
}
```

---

## 7단계: ProblemsInBook에서 compact + hasLinkedSolution 전달

**예상 시간**: 10분
**파일**: `pages/problemBank/ProblemsInBook.tsx`

### 변경 내용

```tsx
<CollapsibleGrid
  items={groupedByPage[page].map((problem) => (
    <TossProblemCard
      key={problem.id}
      problem={{
        id: problem.id,
        thumbnail: problem.thumbnail,
        displayName: problem.displayName,
        problemNumber: problem.problemNumber,
        page: problem.page,
      }}
      onTap={() => handleProblemClick(problem)}
      hasLinkedSolution={problem.hasLinkedSolution}  // 신규
      compact  // 신규 (PC용 컴팩트 모드)
    />
  ))}
  defaultRows={1}
  compact  // 신규
/>
```

---

## 8단계: 빌드 테스트

**예상 시간**: 5분

```bash
cd frontend
npm run build
```

---

## 전체 요약

| 단계 | 작업 | 파일 | 예상 시간 |
|------|------|------|----------|
| 1 | 컨테이너 너비 확장 | ProblemsInBook.tsx | 5분 |
| 2 | useResponsiveColumns 업데이트 | useResponsiveColumns.ts | 10분 |
| 3 | CollapsibleGrid 열 수 증가 | CollapsibleGrid.tsx | 10분 |
| 4 | TossProblemCard 컴팩트 + 뱃지 | TossProblemCard.tsx | 25분 |
| 5 | 더보기 버튼 인라인화 | CollapsibleGrid.tsx | 20분 |
| 6 | 해설 연결 정보 병합 | useProblemBankStats.ts | 20분 |
| 7 | Props 연결 | ProblemsInBook.tsx | 10분 |
| 8 | 빌드 테스트 | - | 5분 |
| **총** | | | **~1시간 45분** |

---

## 수정 파일 목록

```
frontend/src/
├── pages/problemBank/
│   └── ProblemsInBook.tsx         (1, 7단계)
├── components/toss/
│   ├── CollapsibleGrid.tsx        (3, 5단계)
│   └── TossProblemCard.tsx        (4단계)
└── hooks/
    ├── useResponsiveColumns.ts    (2단계)
    └── useProblemBankStats.ts     (6단계)
```

---

## 테스트 체크리스트

- [ ] PC (1280px+): 8열, 컴팩트 카드, 해설 뱃지 표시
- [ ] 노트북 (1024px~): 6열
- [ ] 태블릿 (768px~): 4열 (기존과 동일)
- [ ] 모바일: 2열 (기존과 동일)
- [ ] 더보기 버튼이 그리드 마지막에 표시
- [ ] 접기 버튼 동작 확인
- [ ] 해설 연결된 문제에 보라색 뱃지

---

**진행 명령어**: `"Phase 67 진행해줘"`

*계획 완료: 2025-12-09*
