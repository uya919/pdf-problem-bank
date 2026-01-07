# 반응형 그리드 + 접기 기능 구현 연구

**작성일**: 2025-12-09
**대상 페이지**: `/problems/book/:bookId` (교재 내 문제 목록)

---

## 1. 요구사항 분석

### 1.1 현재 상태

```tsx
// ProblemsInBook.tsx
<div className="grid grid-cols-4 gap-3">
  {problems.map(problem => <TossProblemCard ... />)}
</div>
```

- **고정 4열** 레이아웃
- 모든 문제 한 번에 표시

### 1.2 요청 사항

| 기능 | 설명 |
|------|------|
| **반응형 그리드** | 모바일 2열, 태블릿 3열, PC 4열 |
| **1줄 접기** | 기본 1줄만 표시, "더 보기" 클릭 시 전체 표시 |

---

## 2. 구현 가능성 분석

### 2.1 반응형 그리드 (Tailwind CSS)

**난이도**: ⭐ 매우 쉬움 (5분)

```tsx
// Before
<div className="grid grid-cols-4 gap-3">

// After
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
```

**Tailwind 브레이크포인트**:

| 접두사 | 최소 너비 | 적용 디바이스 |
|--------|----------|--------------|
| (없음) | 0px | 모바일 |
| `sm:` | 640px | 작은 태블릿 |
| `md:` | 768px | 태블릿 |
| `lg:` | 1024px | 데스크톱 |

**결과**:
- 모바일 (~639px): 2열
- 태블릿 (640~767px): 3열
- PC (768px~): 4열

---

### 2.2 1줄 접기 시스템

**난이도**: ⭐⭐ 쉬움 (30분)

#### 방법 A: CSS 기반 (간단)

```tsx
const [isExpanded, setIsExpanded] = useState(false);

// 1줄만 표시 (overflow-hidden + max-height)
<div className={`
  grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3
  ${!isExpanded ? 'max-h-[280px] overflow-hidden' : ''}
`}>
  {problems.map(...)}
</div>

{!isExpanded && problems.length > 4 && (
  <button onClick={() => setIsExpanded(true)}>
    +{problems.length - 4}개 더 보기
  </button>
)}
```

**장점**: 간단, DOM 노드 유지 (검색 가능)
**단점**: 숨겨진 이미지도 로드됨

#### 방법 B: 슬라이스 기반 (성능 최적화)

```tsx
const [isExpanded, setIsExpanded] = useState(false);

// 화면 크기에 따른 열 수 계산
const getColumnsCount = () => {
  if (window.innerWidth >= 768) return 4;  // md
  if (window.innerWidth >= 640) return 3;  // sm
  return 2;  // default
};

const columnsCount = useResponsiveColumns(); // 커스텀 훅
const visibleProblems = isExpanded
  ? problems
  : problems.slice(0, columnsCount);

<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
  {visibleProblems.map(...)}
</div>
```

**장점**: 불필요한 이미지 로드 방지
**단점**: 열 수 계산 필요

#### 방법 C: CSS Grid + Animation (고급)

```tsx
<AnimatePresence>
  <motion.div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
    {visibleProblems.map((problem, i) => (
      <motion.div
        key={problem.id}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ delay: i * 0.02 }}
      >
        <TossProblemCard ... />
      </motion.div>
    ))}
  </motion.div>
</AnimatePresence>
```

**장점**: 부드러운 애니메이션
**단점**: 약간 복잡

---

## 3. 권장 구현 방안

### 3.1 반응형 열 수 훅

```tsx
// hooks/useResponsiveColumns.ts
import { useState, useEffect } from 'react';

export function useResponsiveColumns() {
  const [columns, setColumns] = useState(4);

  useEffect(() => {
    const updateColumns = () => {
      if (window.innerWidth >= 768) setColumns(4);
      else if (window.innerWidth >= 640) setColumns(3);
      else setColumns(2);
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  return columns;
}
```

### 3.2 접기 기능이 있는 그리드 컴포넌트

```tsx
// components/toss/CollapsibleGrid.tsx
interface CollapsibleGridProps {
  items: React.ReactNode[];
  defaultRows?: number;
  className?: string;
}

export function CollapsibleGrid({
  items,
  defaultRows = 1,
  className = '',
}: CollapsibleGridProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const columns = useResponsiveColumns();
  const visibleCount = isExpanded ? items.length : columns * defaultRows;
  const hiddenCount = items.length - visibleCount;

  return (
    <div>
      <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 ${className}`}>
        {items.slice(0, visibleCount)}
      </div>

      {hiddenCount > 0 && !isExpanded && (
        <motion.button
          onClick={() => setIsExpanded(true)}
          className="w-full mt-4 py-3 text-sm text-grey-500 hover:text-grey-700
                     hover:bg-grey-50 rounded-xl transition-colors flex items-center justify-center gap-2"
          whileTap={{ scale: 0.98 }}
        >
          <ChevronDown className="w-4 h-4" />
          {hiddenCount}개 더 보기
        </motion.button>
      )}

      {isExpanded && items.length > columns * defaultRows && (
        <motion.button
          onClick={() => setIsExpanded(false)}
          className="w-full mt-4 py-3 text-sm text-grey-400 hover:text-grey-600
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

### 3.3 ProblemsInBook에 적용

```tsx
// pages/problemBank/ProblemsInBook.tsx
{sortedPages.map((page) => (
  <section key={page}>
    <div className="flex items-center gap-3 mb-4">
      {/* 페이지 구분선 */}
    </div>

    <CollapsibleGrid
      items={groupedByPage[page].map((problem) => (
        <TossProblemCard
          key={problem.id}
          problem={problem}
          onTap={() => handleProblemClick(problem)}
        />
      ))}
      defaultRows={1}
    />
  </section>
))}
```

---

## 4. UI 예시

### 4.1 접힌 상태 (모바일, 2열)

```
┌─────────────────────────────────────────┐
│ ─────── 8페이지 (6개) ────────          │
│                                         │
│ ┌────────┐ ┌────────┐                   │
│ │ 문제1   │ │ 문제2   │                   │
│ └────────┘ └────────┘                   │
│                                         │
│         [ +4개 더 보기 ]                 │
│                                         │
│ ─────── 9페이지 (4개) ────────          │
│ ┌────────┐ ┌────────┐                   │
│ │ 문제5   │ │ 문제6   │                   │
│ └────────┘ └────────┘                   │
│                                         │
│         [ +2개 더 보기 ]                 │
└─────────────────────────────────────────┘
```

### 4.2 펼친 상태 (PC, 4열)

```
┌─────────────────────────────────────────────────────────────┐
│ ─────── 8페이지 (6개) ────────                              │
│                                                             │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                │
│ │ 문제1   │ │ 문제2   │ │ 문제3   │ │ 문제4   │                │
│ └────────┘ └────────┘ └────────┘ └────────┘                │
│ ┌────────┐ ┌────────┐                                       │
│ │ 문제5   │ │ 문제6   │                                       │
│ └────────┘ └────────┘                                       │
│                                                             │
│                       [ 접기 ]                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. 구현 난이도 및 시간 예상

| 기능 | 난이도 | 예상 시간 |
|------|--------|----------|
| 반응형 그리드 (Tailwind) | ⭐ | 5분 |
| useResponsiveColumns 훅 | ⭐⭐ | 15분 |
| CollapsibleGrid 컴포넌트 | ⭐⭐ | 30분 |
| ProblemsInBook 적용 | ⭐ | 15분 |
| 애니메이션 추가 | ⭐⭐ | 20분 |
| **총계** | | **~1.5시간** |

---

## 6. 추가 고려 사항

### 6.1 성능 최적화

```tsx
// 이미지 레이지 로딩 (이미 적용됨)
<img loading="lazy" ... />

// 가상화 (대량 데이터 시)
// react-window 또는 react-virtuoso 사용
```

### 6.2 접근성

```tsx
<button
  aria-expanded={isExpanded}
  aria-controls="problem-grid"
>
  {isExpanded ? '접기' : `${hiddenCount}개 더 보기`}
</button>
```

### 6.3 URL 상태 저장 (선택)

```tsx
// 펼침 상태를 URL에 저장
const [searchParams, setSearchParams] = useSearchParams();
const isExpanded = searchParams.get('expanded') === 'true';
```

---

## 7. 결론

### 구현 가능성: ✅ 100% 가능

**Tailwind CSS**와 **React 상태 관리**만으로 완전히 구현 가능합니다.

### 권장 진행 순서

1. **즉시 적용** (5분): 반응형 그리드 클래스만 변경
2. **1단계** (30분): 간단한 접기 기능 추가
3. **2단계** (1시간): CollapsibleGrid 컴포넌트 분리 + 애니메이션

### 명령어

```
Phase 66 진행해줘
→ 반응형 그리드 + 접기 기능 구현
```

---

*연구 완료: 2025-12-09*
