# Phase 66: 반응형 그리드 + 접기 기능 구현 보고서

**작성일**: 2025-12-09
**Phase**: 66

---

## 구현 요약

| 항목 | 내용 |
|------|------|
| **목표** | 모바일/태블릿/PC 반응형 그리드 + 1줄 접기 시스템 |
| **대상 페이지** | `/problems/book/:bookId` (교재 내 문제 목록) |
| **소요 시간** | ~30분 |

---

## 생성된 파일

### 1. useResponsiveColumns 훅
**파일**: `hooks/useResponsiveColumns.ts`

```typescript
// 화면 크기에 따른 열 수 반환
// 모바일 (~639px): 2열
// 태블릿 (640~767px): 3열
// PC (768px~): 4열
export function useResponsiveColumns(config?: ResponsiveColumnsConfig)
```

**특징**:
- Tailwind 브레이크포인트와 동기화 (sm: 640px, md: 768px)
- debounce 적용으로 성능 최적화
- 커스텀 열 수 설정 가능

### 2. CollapsibleGrid 컴포넌트
**파일**: `components/toss/CollapsibleGrid.tsx`

```typescript
interface CollapsibleGridProps {
  items: ReactNode[];      // 그리드 아이템
  defaultRows?: number;    // 기본 행 수 (default: 1)
  gapClass?: string;       // 간격 클래스
  defaultExpanded?: boolean;
}
```

**기능**:
- 기본 1줄만 표시
- "+N개 더 보기" 버튼으로 펼치기
- "접기" 버튼으로 다시 접기
- framer-motion 애니메이션

---

## 수정된 파일

### ProblemsInBook.tsx

```tsx
// Before
<div className="grid grid-cols-4 gap-3">
  {problems.map(...)}
</div>

// After
<CollapsibleGrid
  items={problems.map(p => <TossProblemCard ... />)}
  defaultRows={1}
/>
```

### components/toss/index.ts

```typescript
export { CollapsibleGrid } from './CollapsibleGrid';
```

---

## UI 동작

### 접힌 상태 (기본)

```
┌─────────────────────────────────────────┐
│ ─────── 8페이지 (6개) ────────          │
│                                         │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐            │  ← PC: 4열
│ │ 1  │ │ 2  │ │ 3  │ │ 4  │            │
│ └────┘ └────┘ └────┘ └────┘            │
│                                         │
│         [ +2개 더 보기 ]                 │
└─────────────────────────────────────────┘
```

### 펼친 상태

```
┌─────────────────────────────────────────┐
│ ─────── 8페이지 (6개) ────────          │
│                                         │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐            │
│ │ 1  │ │ 2  │ │ 3  │ │ 4  │            │
│ └────┘ └────┘ └────┘ └────┘            │
│ ┌────┐ ┌────┐                          │
│ │ 5  │ │ 6  │                          │
│ └────┘ └────┘                          │
│                                         │
│              [ 접기 ]                    │
└─────────────────────────────────────────┘
```

### 반응형 열 수

| 화면 | 브레이크포인트 | 열 수 |
|------|--------------|-------|
| 모바일 | ~639px | 2열 |
| 태블릿 | 640~767px | 3열 |
| PC | 768px~ | 4열 |

---

## 빌드 결과

```
✓ 2614 modules transformed
✓ built in 20.64s

dist/assets/index-Bjvl9a3S.js  1,588.25 kB │ gzip: 470.24 kB
dist/assets/index-B3btcU-p.css   103.51 kB │ gzip:  19.93 kB
```

---

## 테스트 방법

1. http://localhost:5173/problems/by-book 접속
2. 교재 선택
3. 각 페이지 섹션에서:
   - 기본 1줄만 표시되는지 확인
   - "+N개 더 보기" 클릭 시 전체 표시
   - "접기" 클릭 시 다시 1줄로
4. 브라우저 크기 조절하여 반응형 확인:
   - 좁게: 2열
   - 중간: 3열
   - 넓게: 4열

---

## 파일 구조

```
frontend/src/
├── hooks/
│   └── useResponsiveColumns.ts    (신규)
├── components/toss/
│   ├── CollapsibleGrid.tsx        (신규)
│   └── index.ts                   (수정)
└── pages/problemBank/
    └── ProblemsInBook.tsx         (수정)
```

---

*Phase 66 완료: 2025-12-09*
