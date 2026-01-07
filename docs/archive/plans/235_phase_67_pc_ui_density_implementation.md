# Phase 67: PC 버전 UI 밀도 개선 구현 보고서

**작성일**: 2025-12-09
**Phase**: 67
**빌드**: 성공 (31.26s)

---

## 구현 요약

| 항목 | 내용 |
|------|------|
| **목표** | PC 화면에서 더 많은 문제를 한눈에 볼 수 있도록 UI 밀도 개선 |
| **대상 페이지** | `/problems/book/:bookId` (교재 내 문제 목록) |
| **결과** | 8열 그리드 + 컴팩트 카드 + 해설 뱃지 + 인라인 더보기 버튼 |

---

## 변경 내용

### 1. 반응형 열 수 확장

| 화면 | 브레이크포인트 | 열 수 |
|------|--------------|------|
| 모바일 | ~639px | 2열 |
| 태블릿 | 640~767px | 3열 |
| PC md | 768~1023px | 4열 |
| PC lg | 1024~1279px | **6열** (신규) |
| PC xl | 1280px~ | **8열** (신규) |

### 2. 컨테이너 너비 확장

```tsx
// Before
<div className="max-w-2xl mx-auto px-4 py-6">

// After
<div className="max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 lg:px-8 py-6">
```

| 화면 | 최대 너비 |
|------|----------|
| 모바일/태블릿 | 672px (max-w-2xl) |
| 노트북 (lg) | 1024px (max-w-5xl) |
| 데스크톱 (xl) | 1152px (max-w-6xl) |

### 3. 카드 컴팩트 모드

```tsx
// TossProblemCard compact 모드
- 썸네일: aspect-[4/3] → aspect-square
- 패딩: p-3 → p-2
- 텍스트: text-sm → text-xs
- 페이지: text-xs → text-[10px]
```

### 4. 해설 연결 뱃지

```tsx
// 보라색 뱃지 (BookOpen 아이콘)
{problem.hasLinkedSolution && (
  <span className="bg-purple-500 rounded-full shadow-sm flex items-center justify-center w-5 h-5">
    <BookOpen className="w-3 h-3 text-white" />
  </span>
)}
```

### 5. 더보기 버튼 인라인화

```
// Before
┌─────────────────────────────────────────┐
│ [카드] [카드] [카드] [카드]               │
│                                          │
│           [+8개 더 보기]                  │  ← 아래 한 줄 차지
└─────────────────────────────────────────┘

// After
┌─────────────────────────────────────────┐
│ [카드] [카드] [카드] [카드] [+8]          │  ← 그리드 아이템으로
└─────────────────────────────────────────┘
```

---

## 수정된 파일

| 파일 | 변경 내용 |
|------|----------|
| [hooks/useResponsiveColumns.ts](frontend/src/hooks/useResponsiveColumns.ts) | lg:6열, xl:8열 추가 |
| [components/toss/CollapsibleGrid.tsx](frontend/src/components/toss/CollapsibleGrid.tsx) | 인라인 더보기 버튼 + compact prop |
| [components/toss/TossProblemCard.tsx](frontend/src/components/toss/TossProblemCard.tsx) | compact 모드 + 보라색 해설 뱃지 |
| [hooks/useProblemBankStats.ts](frontend/src/hooks/useProblemBankStats.ts) | hasLinkedSolution 데이터 병합 |
| [pages/problemBank/ProblemsInBook.tsx](frontend/src/pages/problemBank/ProblemsInBook.tsx) | 컨테이너 확장 + props 연결 |

---

## UI 비교

### Before (Phase 66)

```
┌─────────────────────────────────────────┐
│              max-w-2xl (672px)           │
│                                          │
│ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ │  ← 4열
│ │ 4:3   │ │ 4:3   │ │ 4:3   │ │ 4:3   │ │
│ │ 썸네일│ │ 썸네일│ │ 썸네일│ │ 썸네일│ │
│ │ 1번   │ │ 2번   │ │ 3번   │ │ 4번   │ │
│ └───────┘ └───────┘ └───────┘ └───────┘ │
│                                          │
│           [+8개 더 보기]                  │
└─────────────────────────────────────────┘
```

### After (Phase 67)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           max-w-6xl (1152px) on PC xl                    │
│                                                                          │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐         │  ← 8열
│ │ 🟣  │ │     │ │ 🟣  │ │     │ │ 🟣  │ │     │ │     │ │ +4  │         │
│ │ 1:1 │ │ 1:1 │ │ 1:1 │ │ 1:1 │ │ 1:1 │ │ 1:1 │ │ 1:1 │ │더보기│         │
│ │ 1번 │ │ 2번 │ │ 3번 │ │ 4번 │ │ 5번 │ │ 6번 │ │ 7번 │ │     │         │
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘         │
│                                                                          │
│ 🟣 = 해설 연결 뱃지 (보라색)                                               │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 빌드 결과

```
✓ 2614 modules transformed
✓ built in 31.26s

dist/assets/index-CmqdHI7q.js  1,589.23 kB │ gzip: 470.56 kB
dist/assets/index-icxc9-WB.css   103.61 kB │ gzip:  19.96 kB
```

---

## 테스트 체크리스트

- [x] PC xl (1280px+): 8열 그리드
- [x] PC lg (1024px~): 6열 그리드
- [x] 태블릿 (768px~): 4열 (기존과 동일)
- [x] 모바일: 2열 (기존과 동일)
- [x] 더보기 버튼이 그리드 마지막에 인라인 표시
- [x] 접기 버튼 동작 확인
- [x] 해설 연결된 문제에 보라색 뱃지
- [x] 컴팩트 모드 정사각형 카드

---

## 접속 URL

- http://localhost:5173/problems/by-book → 교재 선택 → 문제 목록

---

*Phase 67 완료: 2025-12-09*
