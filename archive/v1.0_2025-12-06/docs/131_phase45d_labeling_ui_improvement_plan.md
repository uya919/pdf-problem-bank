# Phase 45-D: 라벨링 UI 개선 계획

**작성일**: 2025-12-04
**선행 분석**: [130_labeling_features_analysis_report.md](130_labeling_features_analysis_report.md)
**예상 소요**: 1시간

---

## 목표

1. **그룹 번호 표시 가시성 개선**: 그룹 배지가 항상 보이도록 위치 조정
2. **저장된 페이지만 사이드바 표시**: 방문한 페이지 → 저장된 페이지로 변경

---

## Step 1: 그룹 번호 표시 확인 및 수정 (15분)

### 1-1. 현재 상태 확인
- [ ] 라벨링 화면에서 그룹 생성 후 번호 배지 확인
- [ ] 페이지 상단 그룹에서 배지가 잘리는지 확인

### 1-2. 라벨 위치 수정 (필요 시)

**파일**: `frontend/src/components/PageCanvas.tsx`
**위치**: Line 487-490

```typescript
// 현재 (그룹 외부 위쪽)
<Label
  x={bbox.x + bbox.width - 60}
  y={bbox.y - 30}  // ← 문제: 화면 밖으로 나갈 수 있음
>

// 변경안 (그룹 내부 우상단)
<Label
  x={bbox.x + bbox.width - 70}
  y={bbox.y + 8}  // ← 그룹 내부로 이동
>
```

### 1-3. problemNumber 기본값 설정 확인
- [ ] 그룹 생성 시 `problemInfo.problemNumber`가 설정되는지 확인
- [ ] 미설정 시 "1번", "2번" 등 자동 번호 부여 로직 추가

---

## Step 2: 사이드바 - 저장된 페이지만 표시 (30분)

### 2-1. 데이터 소스 결정

**방안 C 채택**: 세션 데이터(`session.problems`)에서 추출

```typescript
// workSessionStore에서 문제가 있는 페이지 추출
const session = useWorkSessionStore(state => state.session);
const savedPages = useMemo(() => {
  if (!session?.problems) return [];
  const pages = [...new Set(session.problems.map(p => p.pageIndex))];
  return pages.filter(p => p !== currentPage).sort((a, b) => a - b);
}, [session?.problems, currentPage]);
```

### 2-2. PageViewer.tsx 수정

**파일**: `frontend/src/pages/PageViewer.tsx`

#### 변경 1: import 추가
```typescript
import { useWorkSessionStore } from '../stores/workSessionStore';
```

#### 변경 2: savedPages 계산 로직 추가
```typescript
// 기존 visitedPages 대신 savedPages 사용
const session = useWorkSessionStore(state => state.session);
const savedPages = useMemo(() => {
  if (!session?.problems) return [];
  const pages = [...new Set(session.problems.map(p => p.pageIndex))];
  return pages.filter(p => p !== currentPage).sort((a, b) => a - b);
}, [session?.problems, currentPage]);
```

#### 변경 3: UI 렌더링 수정 (Line 696-716)
```typescript
{/* 저장된 페이지 (문제가 있는 페이지만) */}
{savedPages.length > 0 && (
  <div className="space-y-1.5">
    <div className="text-xs text-grey-500 px-2">저장된 페이지</div>
    {savedPages.map(pageIdx => {
      // 해당 페이지의 문제 수 계산
      const problemCount = session?.problems.filter(
        p => p.pageIndex === pageIdx
      ).length || 0;

      return (
        <button
          key={pageIdx}
          onClick={() => setCurrentPage(pageIdx)}
          className="w-full flex items-center justify-between px-3 py-2 bg-white border border-grey-200 rounded-lg hover:border-grey-300 hover:bg-grey-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-grey-400" />
            <span className="text-sm font-medium text-grey-700">
              페이지 {pageIdx + 1}
            </span>
          </div>
          <span className="text-xs text-grey-500">
            {problemCount}문제
          </span>
        </button>
      );
    })}
  </div>
)}
```

### 2-3. 빈 상태 처리

```typescript
{savedPages.length === 0 && (
  <div className="text-xs text-grey-400 px-2 py-4 text-center">
    저장된 문제가 없습니다
  </div>
)}
```

---

## Step 3: 세션 없을 때 Fallback (10분)

세션 모드가 아닐 때를 위한 fallback 처리:

```typescript
// 세션이 없으면 기존 visitedPages 사용
const displayPages = session ? savedPages : visitedPages;
const sectionTitle = session ? "저장된 페이지" : "방문한 페이지";
```

---

## Step 4: 테스트 (15분)

### 4-1. 그룹 번호 테스트
- [ ] 새 그룹 생성 시 번호 배지 표시 확인
- [ ] 페이지 상단 그룹에서 배지 가시성 확인
- [ ] 해설 그룹 연결 시 "N번" 형식 표시 확인

### 4-2. 사이드바 테스트
- [ ] 그룹 저장 후 사이드바에 페이지 추가됨 확인
- [ ] 문제 삭제 후 페이지가 0개면 사이드바에서 제거됨 확인
- [ ] 페이지 클릭 시 해당 페이지로 이동 확인
- [ ] 문제 수 정확히 표시됨 확인

### 4-3. 엣지 케이스
- [ ] 세션 없이 접근 시 fallback 동작 확인
- [ ] 대용량 문서 (100+ 페이지) 성능 확인

---

## 파일 변경 목록

| 파일 | 변경 내용 |
|------|----------|
| `frontend/src/components/PageCanvas.tsx` | 라벨 y 위치 조정 |
| `frontend/src/pages/PageViewer.tsx` | savedPages 로직 + UI 변경 |

---

## 체크리스트

- [ ] Step 1: 그룹 번호 가시성 확인/수정
- [ ] Step 2: 사이드바 savedPages 로직 구현
- [ ] Step 3: 세션 없을 때 fallback 처리
- [ ] Step 4: 테스트 완료
- [ ] 빌드 성공 확인

---

## 예상 결과

### Before
```
┌─────────────────────────────┐
│ 방문한 페이지               │
│ ┌─────────────────────────┐ │
│ │ 페이지 1      ○          │ │  ← 그룹 없음
│ │ 페이지 3      ○          │ │  ← 그룹 있음
│ │ 페이지 5      ○          │ │  ← 그룹 없음
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

### After
```
┌─────────────────────────────┐
│ 저장된 페이지               │
│ ┌─────────────────────────┐ │
│ │ 페이지 3      5문제      │ │  ← 그룹 있는 것만!
│ │ 페이지 7      3문제      │ │
│ │ 페이지 12     8문제      │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

---

**승인 후 "진행해줘"로 구현을 시작합니다.**
