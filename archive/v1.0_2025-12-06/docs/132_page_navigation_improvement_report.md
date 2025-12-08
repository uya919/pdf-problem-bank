# 페이지 네비게이션 개선 분석 리포트

**작성일**: 2025-12-04
**요청**: 작업 재개 시 마지막 위치 복원 + 페이지 직접 이동
**분석 모드**: Opus Deep Analysis

---

## 1. 요약 (Executive Summary)

| 기능 | 현재 상태 | 구현 가능성 | 난이도 | 예상 소요 |
|------|----------|------------|--------|----------|
| **마지막 페이지 복원** | ❌ 미구현 | ✅ 가능 | 중간 | 1시간 |
| **페이지 직접 이동** | ❌ 미구현 | ✅ 가능 | 쉬움 | 30분 |

### 핵심 발견
1. **세션에 페이지 저장 안 됨**: `WorkSession` 모델에 마지막 페이지 필드가 없음
2. **UI가 읽기 전용**: `SimpleNavigation`의 "18/191"은 편집 불가능한 텍스트

---

## 2. 기능 1: 마지막 작업 위치 복원

### 2.1 현재 상태 분석

#### 문제점
```
사용자 → 세션 열기 → 50페이지에서 작업 → 브라우저 닫기
         ↓
다시 접속 → 세션 열기 → 1페이지부터 시작 😞
```

#### 원인
1. **백엔드 모델**: `WorkSession`에 페이지 저장 필드 없음
2. **프론트엔드**: `workSessionStore`의 페이지는 메모리에만 존재
3. **API**: 세션 업데이트 시 페이지 정보 전송/저장 안 함

### 2.2 현재 코드 분석

#### WorkSession 모델 (backend/app/models/work_session.py)
```python
class WorkSession(BaseModel):
    sessionId: str
    name: str
    problemDocumentId: str
    solutionDocumentId: Optional[str]
    step: Literal["labeling", "setup", "matching", "completed"]
    problems: List[ProblemReference]
    links: List[ProblemSolutionLink]
    # ❌ lastProblemPage: int  <- 없음
    # ❌ lastSolutionPage: int <- 없음
```

#### workSessionStore (frontend/src/stores/workSessionStore.ts)
```typescript
interface WorkSessionStore {
  // 페이지 상태 (메모리에만 존재)
  problemPage: number;   // 세션 재개 시 항상 0
  solutionPage: number;  // 세션 재개 시 항상 0
}
```

### 2.3 구현 방안

#### 방안 A: 백엔드 세션에 저장 (권장 ⭐)
```
페이지 변경 → 디바운스 500ms → API PATCH 호출 → 백엔드 저장
세션 로드 → API에서 lastPage 포함하여 반환 → 자동 복원
```

**장점**: 영속성 보장, 다른 기기에서도 복원
**단점**: API 호출 증가 (디바운스로 완화)

#### 방안 B: localStorage 사용
```
페이지 변경 → localStorage 저장
세션 로드 → localStorage에서 복원
```

**장점**: API 호출 불필요, 빠름
**단점**: 기기별 저장, 브라우저 데이터 삭제 시 유실

#### 권장: 방안 A + B 하이브리드
- localStorage: 즉시 저장 (빠른 복원)
- 백엔드: 디바운스 저장 (영속성)

### 2.4 필요한 변경

| 파일 | 변경 내용 |
|------|----------|
| `backend/app/models/work_session.py` | `lastProblemPage`, `lastSolutionPage` 필드 추가 |
| `backend/app/routers/work_sessions.py` | 업데이트 API에 페이지 저장 로직 |
| `frontend/src/api/client.ts` | `WorkSession` 타입 업데이트 |
| `frontend/src/stores/workSessionStore.ts` | 페이지 저장/복원 로직 |

### 2.5 우려점

| 우려점 | 영향도 | 대응 방안 |
|--------|-------|----------|
| API 호출 증가 | 중간 | 디바운스 500ms~1s 적용 |
| 동시 편집 충돌 | 낮음 | 마지막 저장 우선 (simple) |
| 기존 세션 마이그레이션 | 낮음 | 기본값 0으로 처리 |

---

## 3. 기능 2: 페이지 직접 이동

### 3.1 현재 상태 분석

#### 현재 UI (SimpleNavigation.tsx:54-58)
```tsx
<span className="text-sm font-medium text-grey-800">
  {currentPage + 1} / {totalPages}  // 읽기 전용 텍스트
</span>
```

#### 문제점
- 191페이지 문서에서 150페이지로 가려면 화살표 132번 클릭 필요
- 비효율적인 UX

### 3.2 구현 방안

#### UI 디자인
```
Before:  [<]  18 / 191  [>]
After:   [<]  [__18__] / 191  [>]
              ↑ 클릭하면 편집 모드
```

#### 인터랙션 플로우
```
1. 숫자 클릭 → 입력 모드 전환 (input으로 변경)
2. 숫자 입력 (예: 150)
3-a. Enter 키 → 유효성 검사 → 페이지 이동
3-b. Esc 키 → 취소, 원래 페이지로 복원
3-c. 바깥 클릭 → 취소
```

#### 유효성 검증
```typescript
const validatePage = (input: string): number | null => {
  const page = parseInt(input, 10);
  if (isNaN(page)) return null;           // 숫자가 아님
  if (page < 1) return null;              // 최소값
  if (page > totalPages) return null;     // 최대값
  return page - 1;  // 0-based 인덱스로 변환
};
```

### 3.3 구현 코드 예시

```tsx
// SimpleNavigation.tsx
const [isEditing, setIsEditing] = useState(false);
const [inputValue, setInputValue] = useState('');
const inputRef = useRef<HTMLInputElement>(null);

const handlePageClick = () => {
  setInputValue(String(currentPage + 1));
  setIsEditing(true);
};

const handleSubmit = () => {
  const newPage = validatePage(inputValue);
  if (newPage !== null) {
    onPageChange(newPage);
  } else {
    showToast('1~' + totalPages + ' 사이의 숫자를 입력하세요', 'warning');
  }
  setIsEditing(false);
};

// 렌더링
{isEditing ? (
  <input
    ref={inputRef}
    type="text"
    value={inputValue}
    onChange={(e) => setInputValue(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === 'Enter') handleSubmit();
      if (e.key === 'Escape') setIsEditing(false);
    }}
    onBlur={() => setIsEditing(false)}
    className="w-12 text-center border rounded"
    autoFocus
  />
) : (
  <button onClick={handlePageClick} className="hover:bg-grey-100 px-2 rounded">
    {currentPage + 1}
  </button>
)} / {totalPages}
```

### 3.4 필요한 변경

| 파일 | 변경 내용 |
|------|----------|
| `frontend/src/components/labeling/SimpleNavigation.tsx` | 페이지 입력 UI 추가 |

### 3.5 우려점

| 우려점 | 영향도 | 대응 방안 |
|--------|-------|----------|
| 잘못된 입력 (문자열) | 낮음 | 정규식 검증 + Toast 피드백 |
| 범위 초과 입력 | 낮음 | 범위 클램핑 또는 에러 메시지 |
| 모바일 UX | 낮음 | 숫자 키패드 표시 (`inputMode="numeric"`) |
| 빠른 연타 | 낮음 | 디바운스 불필요 (Enter로 확정) |

---

## 4. 기술적 세부사항

### 4.1 데이터 흐름 (기능 1)

```
┌─────────────────────────────────────────────────────────────┐
│                      페이지 변경                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ workSessionStore.setCurrentPage(page)                       │
│   ├─ this.problemPage = page (메모리)                       │
│   ├─ localStorage.setItem('lastPage_' + sessionId, page)    │
│   └─ debouncedSaveToBackend(page)  [500ms 후]              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ (디바운스 후)
┌─────────────────────────────────────────────────────────────┐
│ API: PATCH /api/sessions/{sessionId}                        │
│   body: { lastProblemPage: 50 }                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 데이터 흐름 (세션 복원)

```
┌─────────────────────────────────────────────────────────────┐
│                      세션 로드                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ API: GET /api/sessions/{sessionId}                          │
│   response: { ..., lastProblemPage: 50, lastSolutionPage: 30 }│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ workSessionStore.loadSession()                              │
│   ├─ this.currentSession = response                         │
│   ├─ this.problemPage = response.lastProblemPage || 0       │
│   └─ this.solutionPage = response.lastSolutionPage || 0     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ UnifiedWorkPage                                             │
│   initialPage={workSessionStore.problemPage}                │
│        ↓                                                    │
│ PageViewer → 자동으로 저장된 페이지로 이동                    │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 백엔드 스키마 변경

```python
# backend/app/models/work_session.py
class WorkSession(BaseModel):
    # 기존 필드...

    # Phase 46: 마지막 작업 페이지 저장
    lastProblemPage: int = 0
    lastSolutionPage: int = 0

class WorkSessionUpdate(BaseModel):
    # 기존 필드...

    # Phase 46: 페이지 업데이트
    lastProblemPage: Optional[int] = None
    lastSolutionPage: Optional[int] = None
```

---

## 5. 종합 리스크 분석

### 5.1 기술적 리스크

| 리스크 | 확률 | 영향 | 완화 전략 |
|--------|------|------|----------|
| API 과부하 | 낮음 | 중간 | 디바운스 500ms |
| 기존 세션 호환성 | 낮음 | 낮음 | 기본값 0 처리 |
| 타입 불일치 | 낮음 | 낮음 | Optional 필드로 선언 |

### 5.2 UX 리스크

| 리스크 | 확률 | 영향 | 완화 전략 |
|--------|------|------|----------|
| 사용자 혼란 (새 UI) | 낮음 | 낮음 | 직관적 디자인 |
| 잘못된 페이지 입력 | 중간 | 낮음 | Toast 피드백 |
| 입력 도중 클릭 실수 | 낮음 | 낮음 | Enter로 확정 |

---

## 6. 구현 계획 (Phase 46)

### Step 1: 백엔드 모델 확장 (15분)
- [ ] `WorkSession` 모델에 `lastProblemPage`, `lastSolutionPage` 추가
- [ ] `WorkSessionUpdate`에 페이지 필드 추가
- [ ] 기존 세션 파일 호환성 확인 (기본값 0)

### Step 2: 백엔드 API 수정 (15분)
- [ ] PATCH 엔드포인트에서 페이지 저장 처리
- [ ] GET 엔드포인트에서 페이지 반환 확인

### Step 3: 프론트엔드 타입 업데이트 (5분)
- [ ] `client.ts`의 `WorkSession` 타입 업데이트

### Step 4: workSessionStore 수정 (30분)
- [ ] 페이지 변경 시 디바운스 저장 로직
- [ ] 세션 로드 시 페이지 복원 로직
- [ ] localStorage 캐싱 (선택사항)

### Step 5: SimpleNavigation 수정 (30분)
- [ ] 페이지 번호 클릭 → 편집 모드
- [ ] 입력 유효성 검증
- [ ] Enter/Esc 키보드 핸들링
- [ ] 바깥 클릭 시 취소

### Step 6: 테스트 (15분)
- [ ] 페이지 직접 이동 테스트
- [ ] 세션 재개 시 복원 테스트
- [ ] 범위 초과 입력 테스트

---

## 7. 예상 결과

### Before
```
세션 재개 → 항상 1페이지
페이지 이동 → 화살표 클릭만 가능
```

### After
```
세션 재개 → 마지막 작업 페이지로 자동 이동
페이지 이동 → 숫자 클릭 → 직접 입력 → Enter
```

### UI 변화
```
Before:  [<]  18 / 191  [>]

After:   [<]  [18] / 191  [>]
              ↑
         클릭하면 편집 가능
         "50" 입력 후 Enter → 50페이지로 이동
```

---

## 8. 결론

### 구현 가능성: ✅ 높음

두 기능 모두 기존 아키텍처 내에서 자연스럽게 확장 가능합니다.

### 예상 총 소요 시간
- **기능 1 (마지막 페이지 복원)**: 1시간
- **기능 2 (페이지 직접 이동)**: 30분
- **테스트**: 15분
- **총계**: 약 1시간 45분

### 권장 우선순위
1. **기능 2 먼저** (페이지 직접 이동) - 독립적, 즉시 효과
2. **기능 1** (마지막 페이지 복원) - 백엔드 변경 필요

---

*리포트 작성: Claude Opus*
*분석 완료: 2025-12-04*
