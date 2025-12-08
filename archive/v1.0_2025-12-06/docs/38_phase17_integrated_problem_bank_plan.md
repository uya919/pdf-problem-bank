# Phase 17: 통합 문제은행 상세 구현 계획

**작성일**: 2025-11-28
**Phase**: 17
**상태**: 계획 수립

---

## 1. 개요

### 1.1 목표
한글 파일(HWPX/HML)에서 파싱된 문제들을 통합 관리하는 문제은행 시스템 구현

### 1.2 범위
- 통합 DB 스키마 및 API 확장
- 통합 문제 목록 UI
- 다중 필터 및 검색 기능
- 문제 상세 보기 (정답/해설 포함)

### 1.3 선행 조건
- Phase 16 (한글 파일 지원) 완료 ✓
- `/api/hangul/parse`, `/api/hangul/save` 엔드포인트 작동 ✓

---

## 2. 현재 상태 분석

### 2.1 기존 시스템
| 구성요소 | 현재 상태 |
|---------|----------|
| ProblemBankPage | PDF 내보내기 문제만 표시, 문서 선택 필수 |
| hangul.py API | parse, save, problems(기본), problems/{id} |
| 데이터 저장 | `dataset_root/problem_bank/` JSON 파일 |

### 2.2 구현할 기능
| 기능 | 설명 |
|-----|------|
| 통합 목록 | 문서 선택 없이 전체 문제 조회 |
| 확장 필터 | 과목, 학년, 단원, 난이도, 출처, 정답/해설 유무 |
| 텍스트 검색 | 문제 번호, 내용, 태그 검색 |
| 통계 API | 필터 옵션 및 통계 데이터 제공 |
| 상세 보기 | 정답, 해설 포함 문제 상세 모달 |

---

## 3. 단계별 상세 구현 계획

### 3.1 단계 17-1: 백엔드 API 확장

**목표**: 통합 문제은행을 위한 API 엔드포인트 확장

#### 3.1.1 `/api/hangul/problems` 엔드포인트 확장

**파일**: `backend/app/routers/hangul.py`

**변경 전**:
```python
@router.get("/problems")
async def get_problems(
    subject: Optional[str] = None,
    grade: Optional[str] = None,
    chapter: Optional[str] = None,
    has_answer: Optional[bool] = None,
    limit: int = 50,
    offset: int = 0
)
```

**변경 후**:
```python
@router.get("/problems")
async def get_problems(
    subject: Optional[str] = None,      # 과목 필터
    grade: Optional[str] = None,        # 학년 필터
    chapter: Optional[str] = None,      # 단원 필터
    source: Optional[str] = None,       # 출처 필터 (NEW)
    difficulty: Optional[int] = None,   # 난이도 필터 (NEW, 1-5)
    has_answer: Optional[bool] = None,  # 정답 유무
    has_explanation: Optional[bool] = None,  # 해설 유무 (NEW)
    search: Optional[str] = None,       # 텍스트 검색 (NEW)
    limit: int = 50,
    offset: int = 0
)
```

**구현 내용**:
1. 인덱스 기반 필터링 (subject, grade, chapter, has_answer, has_explanation)
2. 상세 JSON 로드 후 필터링 (source, difficulty)
3. 텍스트 검색 (문제 번호, 내용, 태그)
4. 페이지네이션

#### 3.1.2 `/api/hangul/stats` 엔드포인트 추가

**목적**: 필터 UI에서 사용할 옵션 및 통계 제공

**응답 형식**:
```json
{
  "total_problems": 1247,
  "with_answer": 892,
  "with_explanation": 756,
  "subjects": ["수학", "영어", "과학"],
  "grades": ["고1", "고2", "고3"],
  "chapters": ["지수", "로그", "삼각함수"],
  "sources": ["라이트SSEN", "베이직쎈"],
  "difficulties": {
    "1": 50,
    "2": 150,
    "3": 500,
    "4": 400,
    "5": 147
  }
}
```

#### 3.1.3 작업 목록
- [ ] `get_problems` 함수에 source, difficulty, has_explanation, search 파라미터 추가
- [ ] 텍스트 검색 로직 구현 (문제 번호, 내용, 태그)
- [ ] `get_problem_bank_stats` 함수 추가
- [ ] 통계 수집 로직 구현

---

### 3.2 단계 17-2: 프론트엔드 API 클라이언트 확장

**목표**: 새 API를 호출하는 TypeScript 클라이언트 업데이트

**파일**: `frontend/src/api/hangul.ts`

#### 3.2.1 새 타입 정의

```typescript
/** 문제 검색 파라미터 */
export interface ProblemSearchParams {
  subject?: string;
  grade?: string;
  chapter?: string;
  source?: string;
  difficulty?: number;
  has_answer?: boolean;
  has_explanation?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

/** 문제은행 통계 */
export interface ProblemBankStats {
  total_problems: number;
  with_answer: number;
  with_explanation: number;
  subjects: string[];
  grades: string[];
  chapters: string[];
  sources: string[];
  difficulties: Record<number, number>;
}
```

#### 3.2.2 API 함수 업데이트

```typescript
export const hangulApi = {
  // 기존 함수들...

  /** 문제 목록 조회 (확장된 필터링) */
  getProblems: async (params?: ProblemSearchParams): Promise<ProblemsListResponse>,

  /** 문제은행 통계 조회 */
  getStats: async (): Promise<ProblemBankStats>,
};
```

#### 3.2.3 작업 목록
- [ ] `ProblemSearchParams` 인터페이스 추가
- [ ] `ProblemBankStats` 인터페이스 추가
- [ ] `getProblems` 함수 시그니처 업데이트
- [ ] `getStats` 함수 추가

---

### 3.3 단계 17-3: 통합 문제 목록 UI

**목표**: 전체 문제를 한눈에 보고 필터링할 수 있는 페이지 구현

**파일**: `frontend/src/pages/IntegratedProblemBankPage.tsx`

#### 3.3.1 페이지 구조

```
┌─────────────────────────────────────────────────────────────────────┐
│  📚 통합 문제은행                                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │  1,247   │ │   892    │ │   756    │ │   검색   │               │
│  │ 전체문제 │ │ 정답있음 │ │ 해설있음 │ │  결과    │               │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘               │
│                                                                     │
│  ┌─ 필터 ─────────────────────────────────────────────────────────┐│
│  │  🔍 [검색어 입력...                                         ]  ││
│  │                                                                 ││
│  │  과목 [전체▾]  학년 [전체▾]  단원 [전체▾]  난이도 [전체▾]      ││
│  │  정답 [전체▾]  해설 [전체▾]                                    ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                       │
│  │ 문제1  │ │ 문제2  │ │ 문제3  │ │ 문제4  │                       │
│  │ #1     │ │ #2     │ │ #3     │ │ #4     │                       │
│  │ ★★★☆☆ │ │ ★★☆☆☆ │ │ ★★★★☆ │ │ ★★★☆☆ │                       │
│  │ 정답✓  │ │ 정답✓  │ │ 정답✓  │ │ 정답⚠ │                       │
│  │ 해설✓  │ │ 해설✓  │ │ 해설⚠ │ │ 해설⚠ │                       │
│  └────────┘ └────────┘ └────────┘ └────────┘                       │
│                                                                     │
│  ◀ 1 2 3 4 5 ... 25 ▶                                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### 3.3.2 컴포넌트 구조

```
IntegratedProblemBankPage/
├── StatCard                 # 통계 카드 (전체, 정답있음, 해설있음, 검색결과)
├── FilterSection            # 접이식 필터 패널
│   ├── SearchInput          # 검색 입력
│   └── FilterGrid           # 필터 드롭다운 그리드
├── ProblemGrid              # 문제 카드 그리드
│   └── ProblemCard          # 개별 문제 카드
├── Pagination               # 페이지네이션
└── ProblemDetailModal       # 문제 상세 모달
```

#### 3.3.3 상태 관리

```typescript
// 필터 상태
const [filters, setFilters] = useState<ProblemSearchParams>({
  limit: 50,
  offset: 0,
});

// 선택된 문제 (상세 보기용)
const [selectedProblem, setSelectedProblem] = useState<ProblemDetail | null>(null);

// React Query 훅
const { data: stats } = useQuery(['problem-bank-stats'], hangulApi.getStats);
const { data: problems } = useQuery(['problems', filters], () => hangulApi.getProblems(filters));
```

#### 3.3.4 작업 목록
- [ ] `IntegratedProblemBankPage.tsx` 파일 생성
- [ ] `StatCard` 컴포넌트 구현
- [ ] `FilterSection` 컴포넌트 구현
- [ ] `ProblemCard` 컴포넌트 구현
- [ ] 페이지네이션 구현
- [ ] App.tsx에 라우트 추가 (`/bank`)
- [ ] Sidebar.tsx에 메뉴 추가 ("통합 문제은행")

---

### 3.4 단계 17-4: 필터/검색 기능

**목표**: 다양한 조건으로 문제를 필터링하고 검색

#### 3.4.1 필터 옵션

| 필터 | 타입 | 옵션 소스 |
|-----|------|----------|
| 과목 | 드롭다운 | `stats.subjects` |
| 학년 | 드롭다운 | `stats.grades` |
| 단원 | 드롭다운 | `stats.chapters` |
| 출처 | 드롭다운 | `stats.sources` |
| 난이도 | 드롭다운 | 1-5 (고정) |
| 정답 | 드롭다운 | 전체/있음/없음 |
| 해설 | 드롭다운 | 전체/있음/없음 |

#### 3.4.2 검색 기능

**검색 대상**:
1. 문제 번호 (`number`)
2. 문제 내용 (`content_text`)
3. 태그 (`metadata.tags`)

**검색 동작**:
- 디바운스 적용 (300ms)
- 대소문자 무시
- 부분 일치

#### 3.4.3 필터 UX

```typescript
// 필터 변경 시 자동 검색
const handleFilterChange = (key: keyof ProblemSearchParams, value: any) => {
  setFilters(prev => ({
    ...prev,
    [key]: value,
    offset: 0,  // 필터 변경 시 첫 페이지로
  }));
};

// 검색어 디바운스
const debouncedSearch = useMemo(
  () => debounce((value: string) => {
    handleFilterChange('search', value || undefined);
  }, 300),
  []
);
```

#### 3.4.4 작업 목록
- [ ] 통계 기반 필터 옵션 표시
- [ ] 필터 변경 시 자동 검색
- [ ] 검색어 디바운스 적용
- [ ] 필터 초기화 버튼
- [ ] 활성 필터 뱃지 표시

---

### 3.5 단계 17-5: 문제 상세 보기

**목표**: 문제 클릭 시 상세 정보 모달 표시

#### 3.5.1 모달 구조

```
┌─────────────────────────────────────────────────────────────────────┐
│  문제 #1                                                   [×]      │
│  [수학] [고2] [지수]                                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ── 문제 ───────────────────────────────────────────────────────── │
│  │ 다음 식의 값을 구하시오.                                       │ │
│  │ 2^3 × 2^5 = ?                                                  │ │
│  └─────────────────────────────────────────────────────────────────│
│                                                                     │
│  ── 수식 ───────────────────────────────────────────────────────── │
│  │ [2^3] [2^5] [2^8]                                              │ │
│  └─────────────────────────────────────────────────────────────────│
│                                                                     │
│  ── 정답 ───────────────────────────────────────────────────────── │
│  │ ✓ 256                                                          │ │
│  │ 유형: value                                                    │ │
│  └─────────────────────────────────────────────────────────────────│
│                                                                     │
│  ── 해설 ───────────────────────────────────────────────────────── │
│  │ 지수법칙에 의해 2^3 × 2^5 = 2^(3+5) = 2^8 = 256                │ │
│  └─────────────────────────────────────────────────────────────────│
│                                                                     │
│  ── 메타데이터 ─────────────────────────────────────────────────── │
│  │ 단원: 지수  │  출처: 라이트SSEN  │  난이도: ★★★☆☆  │  배점: 4점 │ │
│  └─────────────────────────────────────────────────────────────────│
│                                                                     │
│  ── 태그 ───────────────────────────────────────────────────────── │
│  │ [지수] [거듭제곱] [계산]                                       │ │
│  └─────────────────────────────────────────────────────────────────│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### 3.5.2 API 호출

```typescript
// 문제 상세 조회 (정답/해설 포함)
const { data: detailData } = useQuery(
  ['problem-detail', problem.id],
  () => hangulApi.getProblem(problem.id),
  { enabled: isModalOpen && !!problem?.id }
);
```

#### 3.5.3 작업 목록
- [ ] `ProblemDetailModal` 컴포넌트 구현
- [ ] 문제 내용 표시
- [ ] 수식 표시 (LaTeX 렌더링 - 선택)
- [ ] 정답 표시 (있는 경우)
- [ ] 해설 표시 (있는 경우)
- [ ] 메타데이터 표시
- [ ] 태그 표시
- [ ] ESC 키 닫기

---

## 4. 파일 변경 목록

### 4.1 백엔드

| 파일 | 작업 | 설명 |
|-----|------|------|
| `backend/app/routers/hangul.py` | 수정 | get_problems 확장, get_stats 추가 |

### 4.2 프론트엔드

| 파일 | 작업 | 설명 |
|-----|------|------|
| `frontend/src/api/hangul.ts` | 수정 | 타입 및 API 함수 추가 |
| `frontend/src/pages/IntegratedProblemBankPage.tsx` | 생성 | 통합 문제은행 페이지 |
| `frontend/src/App.tsx` | 수정 | 라우트 추가 |
| `frontend/src/components/layout/Sidebar.tsx` | 수정 | 메뉴 추가 |

---

## 5. 테스트 계획

### 5.1 백엔드 테스트

| 테스트 | 방법 |
|--------|------|
| API 엔드포인트 | Swagger UI (`/docs`) |
| 필터링 | curl 또는 Postman |
| 검색 | 다양한 검색어로 테스트 |

### 5.2 프론트엔드 테스트

| 테스트 | 방법 |
|--------|------|
| 페이지 렌더링 | 브라우저에서 `/bank` 접속 |
| 필터 동작 | 각 필터 변경 후 결과 확인 |
| 검색 동작 | 검색어 입력 후 결과 확인 |
| 모달 동작 | 문제 클릭 후 상세 확인 |
| 페이지네이션 | 다음/이전 페이지 이동 |

---

## 6. 예상 소요 시간

| 단계 | 예상 작업량 |
|-----|------------|
| 17-1: 백엔드 API 확장 | 중간 |
| 17-2: API 클라이언트 확장 | 소형 |
| 17-3: 통합 문제 목록 UI | 대형 |
| 17-4: 필터/검색 기능 | 중간 |
| 17-5: 문제 상세 보기 | 중간 |

---

## 7. 의존성

### 7.1 필요한 패키지
- 기존 패키지로 충분 (추가 설치 불필요)

### 7.2 선행 작업
- Phase 16 완료 ✓
- problem_bank 디렉토리 구조 ✓

---

## 8. 리스크 및 대응

| 리스크 | 대응 |
|--------|------|
| 대량 데이터 성능 | 페이지네이션으로 해결, 필요시 인덱싱 추가 |
| 검색 정확도 | 단순 문자열 매칭으로 시작, 필요시 전문 검색 추가 |
| UI 복잡성 | 기본 기능 우선, 점진적 개선 |

---

## 9. 다음 단계

Phase 17 완료 후:
- **Phase 18**: 시험지 제작기 (문제 선택 → 템플릿 → PDF 출력)
- **Phase 19**: 네비게이션 리팩토링 (전체 통합)

---

*작성: Claude Code*
*날짜: 2025-11-28*
