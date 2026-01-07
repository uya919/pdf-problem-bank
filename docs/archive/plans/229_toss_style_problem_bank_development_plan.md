# 토스 스타일 문제은행 UI 개발 계획

**작성일**: 2025-12-09
**기반 문서**:
- [227_large_problem_bank_ui_research.md](227_large_problem_bank_ui_research.md) - 대용량 UI 연구
- [228_toss_style_problem_bank_design_report.md](228_toss_style_problem_bank_design_report.md) - 토스 스타일 설계

---

## 개발 개요

### 현재 상태

| 항목 | 상태 |
|------|------|
| 기본 문제은행 | ✅ `CropProblemBank.tsx` (Phase 24 완료) |
| 검색/필터 | ✅ 기본 텍스트 검색 |
| 그룹화 | ✅ 문서별/전체 |
| 다중 선택/삭제 | ✅ Phase 24-B 완료 |
| 해설 연결 표시 | ✅ Phase 57 완료 |

### 개발 목표

```
Before: 1000개 문제 → 한 화면에 나열 → 스크롤 지옥
After:  1000개 문제 → 검색/교재별/페이지별 → 필요한 것만 표시
```

---

## 단계적 개발 계획

### Phase 64: 페이지네이션 (2시간)

**목표**: 한 번에 표시하는 문제 수 제한

#### 64-A: API 수정 (30분)

```python
# export.py - 페이지네이션 파라미터 추가
@router.get("/problems/all")
async def get_all_problems(
    offset: int = 0,
    limit: int = 50,
    document_id: Optional[str] = None,
    search: Optional[str] = None
):
    # ... 기존 로직

    total = len(all_problems)
    paginated = all_problems[offset:offset + limit]

    return {
        "problems": paginated,
        "total": total,
        "offset": offset,
        "limit": limit,
        "hasMore": offset + limit < total
    }
```

#### 64-B: 프론트엔드 페이지네이션 컴포넌트 (45분)

```typescript
// components/ui/Pagination.tsx
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-1.5 text-sm text-grey-600 hover:bg-grey-100 rounded-lg disabled:opacity-40"
      >
        이전
      </button>

      <span className="text-sm text-grey-500">
        {currentPage} / {totalPages}
      </span>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-1.5 text-sm text-grey-600 hover:bg-grey-100 rounded-lg disabled:opacity-40"
      >
        다음
      </button>
    </div>
  );
}
```

#### 64-C: CropProblemBank 수정 (45분)

```typescript
// CropProblemBank.tsx
const [page, setPage] = useState(1);
const ITEMS_PER_PAGE = 50;

const { data, isLoading } = useAllExportedProblems({
  search: debouncedSearch,
  offset: (page - 1) * ITEMS_PER_PAGE,
  limit: ITEMS_PER_PAGE,
});

const totalPages = Math.ceil((data?.total || 0) / ITEMS_PER_PAGE);

// UI
<Pagination
  currentPage={page}
  totalPages={totalPages}
  onPageChange={setPage}
/>
```

**산출물**:
- [ ] `export.py` - offset/limit 파라미터
- [ ] `Pagination.tsx` - 페이지네이션 컴포넌트
- [ ] `CropProblemBank.tsx` - 페이지네이션 적용

---

### Phase 65: 토스 스타일 메인 화면 (3시간)

**목표**: "1 Thing per 1 Page" 원칙 적용

#### 65-A: 문제은행 메인 화면 재설계 (1시간)

```
┌─────────────────────────────────────────┐
│ 📚 문제은행                              │
│                                         │
│  1,234개의 문제를 보관하고 있어요        │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🔍 베이직쎈 10페이지 3번         │   │
│  └─────────────────────────────────┘   │
│                                         │
│  빠른 접근                               │
│  ┌───────────┐ ┌───────────┐          │
│  │ 📖 교재별  │ │ 📅 최근    │          │
│  │ 5개 교재   │ │ 오늘 12개  │          │
│  └───────────┘ └───────────┘          │
│                                         │
│  최근 작업한 문제                        │
│  [카드 4개 가로 스크롤]                  │
│                                         │
└─────────────────────────────────────────┘
```

```typescript
// pages/ProblemBankMain.tsx (신규)
export function ProblemBankMain() {
  const navigate = useNavigate();
  const { data: stats } = useProblemBankStats();
  const { data: recent } = useRecentProblems(4);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* 헤더 */}
      <h1 className="text-2xl font-bold text-grey-900 mb-2">문제은행</h1>
      <p className="text-grey-500 mb-8">
        {stats?.total.toLocaleString()}개의 문제를 보관하고 있어요
      </p>

      {/* 검색 */}
      <TossSearchBar
        placeholder="베이직쎈 10페이지 3번"
        onSearch={(q) => navigate(`/problems/search?q=${q}`)}
      />

      {/* 빠른 접근 */}
      <div className="grid grid-cols-2 gap-3 mt-8">
        <QuickAccessCard
          icon="📖"
          title="교재별"
          subtitle={`${stats?.documentCount}개 교재`}
          onClick={() => navigate('/problems/by-book')}
        />
        <QuickAccessCard
          icon="📅"
          title="최근 추가"
          subtitle={`오늘 ${stats?.todayCount}개`}
          onClick={() => navigate('/problems/recent')}
        />
      </div>

      {/* 최근 작업 */}
      <section className="mt-8">
        <h2 className="text-sm font-medium text-grey-500 mb-3">최근 작업한 문제</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {recent?.map(problem => (
            <MiniProblemCard key={problem.id} problem={problem} />
          ))}
        </div>
      </section>
    </div>
  );
}
```

#### 65-B: 교재별 목록 화면 (1시간)

```typescript
// pages/ProblemsByBook.tsx (신규)
export function ProblemsByBook() {
  const { data: documents } = useDocumentsWithStats();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <BackButton />

      <h1 className="text-xl font-bold text-grey-900 mt-4 mb-6">교재별 문제</h1>

      <div className="space-y-3">
        {documents?.map(doc => (
          <DocumentCard key={doc.id} document={doc} />
        ))}
      </div>
    </div>
  );
}

function DocumentCard({ document }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/problems/book/${document.id}`)}
      className="w-full bg-white rounded-2xl p-4 text-left hover:bg-grey-50 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-grey-900">{document.name}</p>
          <p className="text-sm text-grey-500 mt-1">
            {document.problemCount}개 문제 · {document.linkedPercent}% 해설 연결
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-grey-400" />
      </div>
    </button>
  );
}
```

#### 65-C: 문제 목록 화면 (페이지별 그룹화) (1시간)

```typescript
// pages/ProblemsInBook.tsx (신규)
export function ProblemsInBook() {
  const { bookId } = useParams();
  const { data } = useProblemsByBook(bookId);

  // 페이지별 그룹화
  const groupedByPage = useMemo(() => {
    if (!data) return {};
    return data.problems.reduce((acc, p) => {
      const page = p.page || '기타';
      if (!acc[page]) acc[page] = [];
      acc[page].push(p);
      return acc;
    }, {});
  }, [data]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <BackButton />

      <h1 className="text-xl font-bold text-grey-900 mt-4">{data?.bookName}</h1>
      <p className="text-grey-500 mb-6">
        {data?.problems.length}개 문제 · {data?.pageRange}
      </p>

      {/* 페이지별 섹션 */}
      {Object.entries(groupedByPage).map(([page, problems]) => (
        <section key={page} className="mb-6">
          <h2 className="text-sm font-medium text-grey-400 mb-3">
            ─── {page}페이지 ({problems.length}개) ───
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {problems.map(p => (
              <TossProblemCard key={p.id} problem={p} />
            ))}
          </div>
        </section>
      ))}

      {/* 더보기 */}
      {data?.hasMore && (
        <button className="w-full py-3 text-sm text-grey-500 hover:bg-grey-50 rounded-xl">
          20개 더 보기
        </button>
      )}
    </div>
  );
}
```

**산출물**:
- [ ] `ProblemBankMain.tsx` - 메인 화면
- [ ] `ProblemsByBook.tsx` - 교재별 목록
- [ ] `ProblemsInBook.tsx` - 교재 내 문제 목록
- [ ] 라우터 설정 업데이트

---

### Phase 66: 토스 스타일 컴포넌트 (2시간)

**목표**: 토스 UI 컴포넌트 구현

#### 66-A: 검색 바 (30분)

```typescript
// components/toss/TossSearchBar.tsx
export function TossSearchBar({ placeholder, onSearch, hint }) {
  const [value, setValue] = useState('');

  return (
    <div>
      <div className="flex items-center bg-grey-100 rounded-2xl px-4 py-3">
        <Search className="w-5 h-5 text-grey-400 mr-3" />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch(value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-grey-900 placeholder-grey-400 outline-none"
        />
        {value && (
          <button onClick={() => setValue('')} className="p-1">
            <X className="w-4 h-4 text-grey-400" />
          </button>
        )}
      </div>
      {hint && (
        <p className="text-xs text-grey-400 mt-2 px-1">{hint}</p>
      )}
    </div>
  );
}
```

#### 66-B: 빠른 접근 카드 (20분)

```typescript
// components/toss/QuickAccessCard.tsx
export function QuickAccessCard({ icon, title, subtitle, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      className="flex-1 bg-grey-50 rounded-2xl p-4 text-left"
      whileTap={{ scale: 0.98 }}
    >
      <div className="text-2xl mb-2">{icon}</div>
      <p className="text-sm font-semibold text-grey-900">{title}</p>
      <p className="text-xs text-grey-500 mt-0.5">{subtitle}</p>
    </motion.button>
  );
}
```

#### 66-C: 문제 카드 (토스 스타일) (40분)

```typescript
// components/toss/TossProblemCard.tsx
export function TossProblemCard({ problem, onTap }) {
  return (
    <motion.button
      onClick={onTap}
      className="bg-white rounded-2xl p-3 shadow-sm text-left w-full"
      whileTap={{ scale: 0.98 }}
    >
      {/* 썸네일 */}
      <div className="aspect-[4/3] bg-grey-100 rounded-xl overflow-hidden mb-2">
        <img
          src={problem.thumbnail}
          alt={problem.displayName}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* 정보 */}
      <p className="text-sm font-semibold text-grey-900 truncate">
        {problem.problemNumber}번
      </p>
      <p className="text-xs text-grey-500 truncate">
        {problem.page}p
      </p>

      {/* 상태 표시 */}
      {problem.hasLinkedSolution && (
        <span className="text-xs text-toss-blue">해설 연결됨</span>
      )}
    </motion.button>
  );
}
```

#### 66-D: 뒤로가기 버튼 (10분)

```typescript
// components/toss/BackButton.tsx
export function BackButton() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(-1)}
      className="flex items-center gap-1 text-grey-600 hover:text-grey-900"
    >
      <ChevronLeft className="w-5 h-5" />
      <span className="text-sm">뒤로</span>
    </button>
  );
}
```

#### 66-E: 바텀 시트 (20분)

```typescript
// components/toss/BottomSheet.tsx
export function BottomSheet({ isOpen, onClose, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 오버레이 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40"
          />

          {/* 시트 */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 max-h-[80vh] overflow-y-auto"
          >
            {/* 핸들 */}
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 bg-grey-300 rounded-full" />
            </div>

            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

**산출물**:
- [ ] `components/toss/TossSearchBar.tsx`
- [ ] `components/toss/QuickAccessCard.tsx`
- [ ] `components/toss/TossProblemCard.tsx`
- [ ] `components/toss/BackButton.tsx`
- [ ] `components/toss/BottomSheet.tsx`
- [ ] `components/toss/index.ts` - export 통합

---

### Phase 67: 스마트 검색 (2시간)

**목표**: 자연어 검색 지원 ("베이직쎈 10p 3번")

#### 67-A: 검색 파서 (45분)

```typescript
// utils/searchParser.ts
interface ParsedSearch {
  bookName?: string;
  page?: number;
  problemNumber?: string;
  raw: string;
}

export function parseSearchQuery(query: string): ParsedSearch {
  const result: ParsedSearch = { raw: query };

  // 페이지 추출: "10p", "10페이지", "p10"
  const pageMatch = query.match(/(\d+)\s*[pP페이지]/);
  if (pageMatch) {
    result.page = parseInt(pageMatch[1]);
    query = query.replace(pageMatch[0], '').trim();
  }

  // 문제번호 추출: "3번", "#3", "3"
  const numMatch = query.match(/[#]?(\d+)\s*번?$/);
  if (numMatch) {
    result.problemNumber = numMatch[1];
    query = query.replace(numMatch[0], '').trim();
  }

  // 나머지는 교재명
  if (query.length > 0) {
    result.bookName = query;
  }

  return result;
}

// 사용 예시
// parseSearchQuery("베이직쎈 10p 3번")
// → { bookName: "베이직쎈", page: 10, problemNumber: "3", raw: "..." }
```

#### 67-B: 검색 API 수정 (30분)

```python
# export.py
@router.get("/problems/search")
async def search_problems(
    q: str,
    book_name: Optional[str] = None,
    page: Optional[int] = None,
    problem_number: Optional[str] = None
):
    """스마트 검색 API"""

    # 파싱된 조건으로 필터링
    results = []
    for problem in all_problems:
        if book_name and book_name.lower() not in problem.book_name.lower():
            continue
        if page and problem.page != page:
            continue
        if problem_number and problem.problem_number != problem_number:
            continue
        # 일반 텍스트 검색 (q)
        if q and q.lower() not in problem.display_name.lower():
            continue
        results.append(problem)

    return {"results": results, "count": len(results)}
```

#### 67-C: 검색 결과 화면 (45분)

```typescript
// pages/SearchResults.tsx
export function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const parsed = useMemo(() => parseSearchQuery(query), [query]);
  const { data, isLoading } = useSearchProblems(parsed);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <BackButton />

      {/* 검색 바 (수정 가능) */}
      <TossSearchBar
        defaultValue={query}
        onSearch={(q) => navigate(`/problems/search?q=${q}`)}
      />

      {/* 파싱 결과 표시 */}
      {parsed.bookName || parsed.page || parsed.problemNumber ? (
        <div className="flex gap-2 mt-4">
          {parsed.bookName && (
            <span className="px-2 py-1 bg-toss-blue/10 text-toss-blue rounded-full text-xs">
              📖 {parsed.bookName}
            </span>
          )}
          {parsed.page && (
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
              📄 {parsed.page}p
            </span>
          )}
          {parsed.problemNumber && (
            <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs">
              # {parsed.problemNumber}번
            </span>
          )}
        </div>
      ) : null}

      {/* 결과 */}
      <div className="mt-6">
        {isLoading ? (
          <p className="text-grey-500 text-center py-8">검색 중...</p>
        ) : data?.count === 0 ? (
          <EmptyState
            title="찾는 문제가 없어요"
            description="다른 검색어를 입력해 보세요"
          />
        ) : (
          <>
            <p className="text-sm text-grey-500 mb-4">
              {data?.count}개의 문제를 찾았어요
            </p>
            <div className="grid grid-cols-4 gap-3">
              {data?.results.map(p => (
                <TossProblemCard key={p.id} problem={p} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

**산출물**:
- [ ] `utils/searchParser.ts` - 검색 쿼리 파서
- [ ] `export.py` - 스마트 검색 API
- [ ] `pages/SearchResults.tsx` - 검색 결과 화면

---

### Phase 68: UX 라이팅 개선 (1시간)

**목표**: 토스 스타일 친근한 문구

#### 68-A: 문구 상수화 (30분)

```typescript
// constants/messages.ts
export const MESSAGES = {
  // 상태
  loading: '문제를 불러오고 있어요...',
  empty: '아직 등록된 문제가 없어요',
  emptySearch: '찾는 문제가 없어요',

  // 성공
  exportSuccess: (count: number) => `${count}개의 문제를 내보냈어요 ✓`,
  deleteSuccess: '문제를 삭제했어요',
  confirmSuccess: '문제은행에 등록했어요',

  // 에러
  loadError: '문제를 불러오지 못했어요',
  exportError: '내보내기에 실패했어요. 다시 시도해 주세요',

  // 안내
  searchHint: '교재명, 페이지, 문제번호로 검색해 보세요',
  filterHint: '조건에 맞는 문제가 없어요. 필터를 조정해 보세요',

  // 확인
  deleteConfirm: (name: string) => `${name}을(를) 삭제할까요?`,
};
```

#### 68-B: 기존 문구 교체 (30분)

```typescript
// 적용 예시

// Before
showToast('Export failed', 'error');

// After
showToast(MESSAGES.exportError, 'error');

// Before
<p className="text-gray-500">No results found</p>

// After
<EmptyState
  title={MESSAGES.emptySearch}
  description="다른 검색어를 입력해 보세요"
/>
```

**산출물**:
- [ ] `constants/messages.ts` - 문구 상수
- [ ] 기존 컴포넌트 문구 교체

---

### Phase 69: 점진적 로딩 (2시간)

**목표**: 가상 스크롤 또는 "더 보기" 버튼

#### 69-A: react-window 설치 (10분)

```bash
npm install react-window
npm install -D @types/react-window
```

#### 69-B: 가상화 그리드 컴포넌트 (50분)

```typescript
// components/VirtualProblemGrid.tsx
import { FixedSizeGrid } from 'react-window';

interface VirtualProblemGridProps {
  problems: Problem[];
  onProblemClick: (problem: Problem) => void;
}

export function VirtualProblemGrid({ problems, onProblemClick }: VirtualProblemGridProps) {
  const COLUMN_COUNT = 4;
  const COLUMN_WIDTH = 200;
  const ROW_HEIGHT = 220;

  const rowCount = Math.ceil(problems.length / COLUMN_COUNT);

  const Cell = ({ columnIndex, rowIndex, style }) => {
    const index = rowIndex * COLUMN_COUNT + columnIndex;
    const problem = problems[index];

    if (!problem) return null;

    return (
      <div style={style} className="p-2">
        <TossProblemCard
          problem={problem}
          onTap={() => onProblemClick(problem)}
        />
      </div>
    );
  };

  return (
    <FixedSizeGrid
      columnCount={COLUMN_COUNT}
      columnWidth={COLUMN_WIDTH}
      height={600}
      rowCount={rowCount}
      rowHeight={ROW_HEIGHT}
      width={COLUMN_WIDTH * COLUMN_COUNT + 40}
    >
      {Cell}
    </FixedSizeGrid>
  );
}
```

#### 69-C: "더 보기" 대안 구현 (1시간)

```typescript
// hooks/useInfiniteProblems.ts
export function useInfiniteProblems(bookId: string) {
  return useInfiniteQuery({
    queryKey: ['problems', bookId],
    queryFn: ({ pageParam = 0 }) =>
      api.getProblems({ bookId, offset: pageParam, limit: 20 }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.offset + lastPage.limit : undefined,
  });
}

// 사용
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteProblems(bookId);

const allProblems = data?.pages.flatMap(p => p.problems) || [];

<button
  onClick={() => fetchNextPage()}
  disabled={!hasNextPage || isFetchingNextPage}
  className="w-full py-3 text-sm text-grey-500"
>
  {isFetchingNextPage ? '불러오는 중...' : hasNextPage ? '20개 더 보기' : '모두 불러왔어요'}
</button>
```

**산출물**:
- [ ] `react-window` 패키지 설치
- [ ] `VirtualProblemGrid.tsx` - 가상화 그리드
- [ ] `useInfiniteProblems.ts` - 무한 스크롤 훅

---

## 개발 일정 요약

| Phase | 내용 | 예상 시간 | 우선순위 |
|-------|------|----------|---------|
| **64** | 페이지네이션 | 2시간 | 🔴 높음 |
| **65** | 토스 스타일 메인 화면 | 3시간 | 🔴 높음 |
| **66** | 토스 스타일 컴포넌트 | 2시간 | 🟡 중간 |
| **67** | 스마트 검색 | 2시간 | 🟡 중간 |
| **68** | UX 라이팅 개선 | 1시간 | 🟢 낮음 |
| **69** | 점진적 로딩 | 2시간 | 🟢 낮음 |

**총 예상 시간**: 12시간

---

## 권장 진행 순서

```
1단계 (필수): Phase 64 + 65
       → 기본 구조 완성 (5시간)

2단계 (권장): Phase 66 + 67
       → UX 개선 (4시간)

3단계 (선택): Phase 68 + 69
       → 추가 최적화 (3시간)
```

---

## 기존 코드와의 관계

| 기존 파일 | 변경 방식 |
|----------|----------|
| `CropProblemBank.tsx` | 페이지네이션 추가 → 점진적 교체 |
| `ProblemBankHub.tsx` | 라우팅 변경 |
| `useAllExportedProblems.ts` | offset/limit 파라미터 추가 |
| `export.py` | 페이지네이션 + 검색 API 추가 |

### 마이그레이션 전략

```
Phase 64: 기존 화면에 페이지네이션만 추가 (안전)
Phase 65: 새 화면 생성 → 라우터에서 분기 (병행 운영)
Phase 66+: 점진적으로 새 컴포넌트로 교체
```

---

## 명령어 가이드

| 명령어 | 설명 |
|--------|------|
| `Phase 64 진행해줘` | 페이지네이션 구현 |
| `Phase 65 진행해줘` | 토스 스타일 메인 화면 |
| `Phase 66 진행해줘` | 토스 컴포넌트 구현 |
| `Phase 64-65 진행해줘` | 1단계 전체 |

---

*개발 계획 작성: 2025-12-09*
