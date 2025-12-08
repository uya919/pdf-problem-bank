# Phase 48: 페이지 네비게이션 개선 계획

**작성일**: 2025-12-04
**선행 분석**: [132_page_navigation_improvement_report.md](132_page_navigation_improvement_report.md)
**예상 소요**: 1.5시간

---

## 목표

1. **마지막 작업 위치 복원**: 세션 재개 시 이전 작업 페이지로 자동 이동
2. **페이지 직접 이동**: "18/191" 클릭하여 원하는 페이지 번호 입력

---

## Step 1: 백엔드 모델 확장 (15분)

### 1-1. WorkSession 모델에 페이지 필드 추가

**파일**: `backend/app/models/work_session.py`

```python
class WorkSession(BaseModel):
    # 기존 필드...

    # Phase 48: 마지막 작업 페이지 저장
    lastProblemPage: int = 0
    lastSolutionPage: int = 0
```

### 1-2. WorkSessionUpdate에 페이지 필드 추가

```python
class WorkSessionUpdate(BaseModel):
    # 기존 필드...

    # Phase 48: 페이지 업데이트
    lastProblemPage: Optional[int] = None
    lastSolutionPage: Optional[int] = None
```

---

## Step 2: 백엔드 API 수정 (10분)

### 2-1. 세션 업데이트 API 수정

**파일**: `backend/app/routers/work_sessions.py`

PATCH 엔드포인트에서 페이지 필드 저장 처리:

```python
@router.patch("/{session_id}")
async def update_session(session_id: str, update: WorkSessionUpdate):
    session = _load_session(session_id)

    # Phase 48: 페이지 업데이트
    if update.lastProblemPage is not None:
        session.lastProblemPage = update.lastProblemPage
    if update.lastSolutionPage is not None:
        session.lastSolutionPage = update.lastSolutionPage

    _save_session(session)
    return session
```

---

## Step 3: 프론트엔드 타입 업데이트 (5분)

### 3-1. WorkSession 타입에 페이지 필드 추가

**파일**: `frontend/src/api/client.ts`

```typescript
export interface WorkSession {
  // 기존 필드...

  // Phase 48: 마지막 작업 페이지
  lastProblemPage?: number;
  lastSolutionPage?: number;
}
```

---

## Step 4: workSessionStore 페이지 저장/복원 (25분)

### 4-1. 페이지 변경 시 자동 저장

**파일**: `frontend/src/stores/workSessionStore.ts`

```typescript
// Phase 48: 페이지 저장 (디바운스 적용)
const debouncedSavePage = debounce(async (sessionId: string, page: number, tab: 'problem' | 'solution') => {
  try {
    await api.patch(`/api/sessions/${sessionId}`, {
      [tab === 'problem' ? 'lastProblemPage' : 'lastSolutionPage']: page
    });
  } catch (error) {
    console.error('페이지 저장 실패:', error);
  }
}, 1000);  // 1초 디바운스

// setCurrentPage 수정
setCurrentPage: (page: number) => {
  const { activeTab, currentSession } = get();

  if (activeTab === 'problem') {
    set({ problemPage: page });
  } else {
    set({ solutionPage: page });
  }

  // Phase 48: 백엔드에 저장
  if (currentSession) {
    debouncedSavePage(currentSession.sessionId, page, activeTab);
  }
}
```

### 4-2. 세션 로드 시 페이지 복원

```typescript
loadSession: async (sessionId: string) => {
  const response = await api.get(`/api/sessions/${sessionId}`);
  const session = response.data;

  set({
    currentSession: session,
    // Phase 48: 저장된 페이지로 복원
    problemPage: session.lastProblemPage || 0,
    solutionPage: session.lastSolutionPage || 0,
  });
}
```

---

## Step 5: SimpleNavigation 페이지 직접 입력 (30분)

### 5-1. 상태 추가

**파일**: `frontend/src/components/labeling/SimpleNavigation.tsx`

```typescript
const [isEditing, setIsEditing] = useState(false);
const [inputValue, setInputValue] = useState('');
const inputRef = useRef<HTMLInputElement>(null);
```

### 5-2. 페이지 번호 클릭 핸들러

```typescript
const handlePageClick = () => {
  setInputValue(String(currentPage + 1));
  setIsEditing(true);
  // 다음 틱에 포커스
  setTimeout(() => inputRef.current?.select(), 0);
};
```

### 5-3. 입력 유효성 검증 및 이동

```typescript
const handleSubmit = () => {
  const page = parseInt(inputValue, 10);

  if (isNaN(page) || page < 1 || page > totalPages) {
    // 유효하지 않은 입력
    showToast?.(`1~${totalPages} 사이의 숫자를 입력하세요`, 'warning');
    setIsEditing(false);
    return;
  }

  onPageChange(page - 1);  // 0-based 인덱스
  setIsEditing(false);
};

const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter') {
    handleSubmit();
  } else if (e.key === 'Escape') {
    setIsEditing(false);
  }
};
```

### 5-4. UI 렌더링

```tsx
{/* 페이지 번호 표시/입력 */}
<div className="flex items-center gap-1">
  {isEditing ? (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value.replace(/\D/g, ''))}
      onKeyDown={handleKeyDown}
      onBlur={() => setIsEditing(false)}
      className="w-12 text-center text-sm font-medium border border-blue-500 rounded px-1 py-0.5 focus:outline-none"
      autoFocus
    />
  ) : (
    <button
      onClick={handlePageClick}
      className="text-sm font-medium text-grey-800 hover:text-blue-600 hover:bg-blue-50 px-2 py-0.5 rounded transition-colors"
      title="클릭하여 페이지 번호 입력"
    >
      {currentPage + 1}
    </button>
  )}
  <span className="text-sm text-grey-500">/ {totalPages}</span>
</div>
```

---

## Step 6: 테스트 (15분)

### 6-1. 페이지 직접 이동 테스트
- [ ] 페이지 번호 클릭 → 입력 모드 전환
- [ ] 숫자 입력 → Enter → 해당 페이지로 이동
- [ ] Esc 키 → 취소
- [ ] 범위 초과 입력 (0, 999) → 에러 메시지

### 6-2. 마지막 페이지 복원 테스트
- [ ] 50페이지에서 작업 → 브라우저 새로고침
- [ ] 세션 재진입 → 50페이지로 자동 이동
- [ ] 문제/해설 탭별 페이지 독립 저장 확인

### 6-3. 엣지 케이스
- [ ] 새 세션 (저장된 페이지 없음) → 0페이지 시작
- [ ] 빠른 페이지 이동 → 디바운스 정상 동작

---

## 파일 변경 목록

| 파일 | 변경 내용 | 난이도 |
|------|----------|--------|
| `backend/app/models/work_session.py` | 페이지 필드 추가 | 쉬움 |
| `backend/app/routers/work_sessions.py` | 업데이트 API 수정 | 쉬움 |
| `frontend/src/api/client.ts` | 타입 업데이트 | 쉬움 |
| `frontend/src/stores/workSessionStore.ts` | 저장/복원 로직 | 중간 |
| `frontend/src/components/labeling/SimpleNavigation.tsx` | 페이지 입력 UI | 중간 |

---

## 체크리스트

- [ ] Step 1: 백엔드 모델 확장
- [ ] Step 2: 백엔드 API 수정
- [ ] Step 3: 프론트엔드 타입 업데이트
- [ ] Step 4: workSessionStore 페이지 저장/복원
- [ ] Step 5: SimpleNavigation 페이지 직접 입력
- [ ] Step 6: 테스트 완료
- [ ] 빌드 성공 확인

---

## 예상 결과

### 기능 1: 페이지 직접 이동
```
Before:  [<]  18 / 191  [>]   (읽기 전용)

After:   [<]  [18] / 191  [>]
              ↑
         클릭 → "150" 입력 → Enter → 150페이지로 이동!
```

### 기능 2: 마지막 페이지 복원
```
Before:  세션 재개 → 항상 1페이지

After:   세션 재개 → 마지막 작업 페이지 (예: 50페이지)
```

---

**승인 후 "진행해줘"로 구현을 시작합니다.**
