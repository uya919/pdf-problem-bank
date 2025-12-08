# PDF 라벨링 시스템 안정성 개선 개발 계획

**문서 번호**: 231
**작성일**: 2025-12-07
**목적**: Phase 59-61 상세 구현 계획

---

## Executive Summary

UI/UX 및 안정성 종합 리뷰 결과를 바탕으로 3단계 개선 계획을 수립합니다.

| Phase | 우선순위 | 목표 | 예상 시간 |
|-------|---------|------|----------|
| 59 | CRITICAL | Race Condition, 동기화, 타임아웃 | 2.5시간 |
| 60 | HIGH | 이미지 로드, 접근성, UX | 4시간 |
| 61 | MEDIUM | 컴포넌트 분리, 코드 정리 | 6시간 |

**총 예상 시간**: 12.5시간

---

## Phase 59: CRITICAL 이슈 해결

### 59-A: Race Condition 수정 (1시간)

**문제**: 페이지 전환 시 이전 페이지 저장과 새 페이지 로드가 경쟁

**위치**: `frontend/src/pages/PageViewer.tsx`

**현재 코드** (약 라인 280-320):
```typescript
const handlePageChange = async (newPage: number) => {
  await saveGroups();  // 이전 페이지 저장
  setCurrentPage(newPage);  // 새 페이지로 전환
  // ⚠️ saveGroups 완료 전에 setCurrentPage 실행될 수 있음
};
```

**수정 계획**:
```typescript
// 1. 페이지 전환 중 상태 추가
const [isPageChanging, setIsPageChanging] = useState(false);

// 2. 안전한 페이지 전환
const handlePageChange = useCallback(async (newPage: number) => {
  if (isPageChanging) return; // 중복 방지

  setIsPageChanging(true);
  try {
    // 현재 페이지 저장 완료 대기
    await saveGroups();

    // 저장 완료 후 페이지 전환
    setCurrentPage(newPage);
  } catch (error) {
    console.error('[Phase 59-A] Page change failed:', error);
    showToast('페이지 전환 중 오류가 발생했습니다', 'error');
  } finally {
    setIsPageChanging(false);
  }
}, [isPageChanging, saveGroups, showToast]);

// 3. UI에서 페이지 전환 중 표시
{isPageChanging && (
  <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-50">
    <Loader2 className="w-6 h-6 animate-spin text-toss-blue" />
  </div>
)}
```

**테스트 케이스**:
| 테스트 | 예상 결과 |
|--------|----------|
| 빠른 페이지 전환 (연타) | 중복 저장 방지, 마지막 페이지로 이동 |
| 저장 중 페이지 전환 | 저장 완료 후 전환 |
| 저장 실패 시 | 에러 토스트, 페이지 유지 |

---

### 59-B: 동기화 검증 API (1시간)

**문제**: groups.json과 WorkSession.problems 불일치 가능

**위치**: `backend/app/routers/work_sessions.py`

**새 엔드포인트**:
```python
@router.post("/{session_id}/validate-sync")
async def validate_sync(session_id: str):
    """
    groups.json과 session.problems 일치 여부 검증 및 수정

    Returns:
        {
            "status": "ok" | "fixed" | "error",
            "issues_found": int,
            "issues_fixed": int,
            "details": [...]
        }
    """
    session_file = WORK_SESSIONS_DIR / f"{session_id}.json"
    if not session_file.exists():
        raise HTTPException(status_code=404, detail="Session not found")

    session = load_json(session_file)
    issues = []
    fixed = 0

    # 1. session.problems에 있지만 groups.json에 없는 항목 찾기
    for problem in session.get("problems", []):
        doc_id = problem.get("documentId")
        page_idx = problem.get("pageIndex")
        group_id = problem.get("groupId")

        groups_file = DOCUMENTS_DIR / doc_id / "groups" / f"page_{page_idx:04d}_groups.json"
        if not groups_file.exists():
            issues.append({
                "type": "missing_groups_file",
                "problem": group_id,
                "page": page_idx
            })
            continue

        groups_data = load_json(groups_file)
        group_exists = any(g["id"] == group_id for g in groups_data.get("groups", []))

        if not group_exists:
            issues.append({
                "type": "orphan_problem",
                "problem": group_id,
                "page": page_idx,
                "action": "will_remove"
            })

    # 2. 자동 수정 (orphan problems 제거)
    if issues:
        orphan_ids = {i["problem"] for i in issues if i["type"] == "orphan_problem"}
        session["problems"] = [
            p for p in session["problems"]
            if p["groupId"] not in orphan_ids
        ]

        # orphan links도 제거
        session["links"] = [
            l for l in session.get("links", [])
            if l["problemGroupId"] not in orphan_ids
        ]

        save_json(session_file, session)
        fixed = len(orphan_ids)

    return {
        "status": "fixed" if fixed > 0 else "ok",
        "issues_found": len(issues),
        "issues_fixed": fixed,
        "details": issues
    }
```

**프론트엔드 연동**:
```typescript
// api/client.ts
validateSessionSync: async (sessionId: string) => {
  const response = await axios.post(
    `${API_BASE}/work-sessions/${sessionId}/validate-sync`
  );
  return response.data;
},

// workSessionStore.ts - loadSession 수정
loadSession: async (sessionId: string) => {
  set({ isLoading: true });
  try {
    // 1. 세션 로드
    const session = await api.getWorkSession(sessionId);

    // 2. 동기화 검증 (백그라운드)
    api.validateSessionSync(sessionId).then(result => {
      if (result.issues_fixed > 0) {
        console.log(`[Phase 59-B] Fixed ${result.issues_fixed} sync issues`);
        // 세션 다시 로드
        api.getWorkSession(sessionId).then(updated => {
          set({ currentSession: updated });
        });
      }
    });

    // 3. isParent 동기화
    await api.syncParentFlags(sessionId);
    const refreshedSession = await api.getWorkSession(sessionId);

    set({ currentSession: refreshedSession, error: null });
  } finally {
    set({ isLoading: false });
  }
},
```

---

### 59-C: API 타임아웃 추가 (30분)

**문제**: API 호출 시 무한 대기 가능

**위치**: `frontend/src/api/client.ts`

**수정 계획**:
```typescript
// 1. Axios 인스턴스에 기본 타임아웃 설정
const axiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 30000, // 30초
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. 요청별 타임아웃 설정 (필요시)
const TIMEOUTS = {
  DEFAULT: 30000,
  UPLOAD: 120000,    // PDF 업로드: 2분
  EXPORT: 60000,     // 이미지 내보내기: 1분
  QUICK: 10000,      // 간단한 조회: 10초
};

// 3. 타임아웃 에러 처리
axiosInstance.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ECONNABORTED') {
      console.error('[API Timeout]', error.config?.url);
      return Promise.reject(new Error('요청 시간이 초과되었습니다. 다시 시도해주세요.'));
    }
    return Promise.reject(error);
  }
);

// 4. 개별 API에 적용
uploadPdf: async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return axiosInstance.post('/pdf/upload', formData, {
    timeout: TIMEOUTS.UPLOAD,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
},

exportGroup: async (documentId: string, pageIndex: number, groupId: string) => {
  return axiosInstance.post(
    `/export/documents/${documentId}/pages/${pageIndex}/groups/${groupId}`,
    {},
    { timeout: TIMEOUTS.EXPORT }
  );
},
```

---

## Phase 60: HIGH 이슈 해결

### 60-A: 이미지 로드 취소 처리 (30분)

**위치**: `frontend/src/components/PageCanvas.tsx`

**현재 코드**:
```typescript
useEffect(() => {
  const img = new Image();
  img.onload = () => setLoadedImage(img);
  img.src = imageUrl;
}, [imageUrl]);
```

**수정 계획**:
```typescript
useEffect(() => {
  let cancelled = false;
  const img = new Image();

  img.onload = () => {
    if (!cancelled) {
      setLoadedImage(img);
      setImageError(null);
    }
  };

  img.onerror = () => {
    if (!cancelled) {
      setImageError('이미지 로드 실패');
      setLoadedImage(null);
    }
  };

  img.src = imageUrl;

  return () => {
    cancelled = true;
    img.src = ''; // 로드 중단
  };
}, [imageUrl]);
```

---

### 60-B: 접근성 개선 (2시간)

**대상 컴포넌트**:
1. `GroupPanel.tsx` - 버튼들
2. `PageCanvas.tsx` - 캔버스 인터랙션
3. `ProblemListPanel.tsx` - 목록 아이템
4. 모든 아이콘 버튼

**수정 예시**:
```typescript
// 현재
<button onClick={handleDelete}>
  <Trash2 size={16} />
</button>

// 수정
<button
  onClick={handleDelete}
  aria-label="그룹 삭제"
  title="그룹 삭제"
  className="focus:ring-2 focus:ring-toss-blue focus:outline-none"
>
  <Trash2 size={16} aria-hidden="true" />
</button>
```

**접근성 체크리스트**:
- [ ] 모든 아이콘 버튼에 aria-label 추가
- [ ] 모달에 focus trap 구현
- [ ] 키보드 네비게이션 개선
- [ ] 색상 대비 WCAG AA 준수 확인

---

### 60-C: Optimistic Update (1시간)

**위치**: `frontend/src/pages/PageViewer.tsx`

**현재 흐름**:
```
사용자 액션 → API 호출 → 응답 대기 → UI 업데이트
```

**개선 흐름**:
```
사용자 액션 → UI 즉시 업데이트 → API 호출 → 실패 시 롤백
```

**구현**:
```typescript
const handleCreateGroup = useCallback(async () => {
  // 1. 낙관적 업데이트를 위한 이전 상태 저장
  const previousGroups = [...localGroups];

  // 2. 새 그룹 생성
  const newGroup = createNewGroup(selectedBlockIds);

  // 3. UI 즉시 업데이트 (낙관적)
  const updatedGroups = [...localGroups, newGroup];
  setLocalGroups(updatedGroups);
  setSelectedBlockIds([]);
  showToast('그룹이 생성되었습니다', 'success');

  // 4. 백그라운드에서 저장
  try {
    await saveGroups(updatedGroups);
    await exportWithRetry(documentId, currentPage, newGroup.id);
  } catch (error) {
    // 5. 실패 시 롤백
    setLocalGroups(previousGroups);
    showToast('저장 실패, 다시 시도해주세요', 'error');
    console.error('[Optimistic Update] Rollback:', error);
  }
}, [localGroups, selectedBlockIds, saveGroups, exportWithRetry]);
```

---

### 60-D: 페이지 이탈 방지 (30분)

**위치**: `frontend/src/pages/PageViewer.tsx`

**구현**:
```typescript
// 1. 미저장 변경사항 추적
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

// 2. 그룹 변경 시 플래그 설정
useEffect(() => {
  if (!isInitialLoadRef.current) {
    setHasUnsavedChanges(true);
  }
}, [localGroups]);

// 3. 저장 완료 시 플래그 해제
const saveGroups = useCallback(async () => {
  // ... 저장 로직
  setHasUnsavedChanges(false);
}, []);

// 4. 페이지 이탈 방지
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '저장되지 않은 변경사항이 있습니다. 페이지를 떠나시겠습니까?';
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [hasUnsavedChanges]);

// 5. React Router 네비게이션 차단 (선택)
const blocker = useBlocker(
  ({ currentLocation, nextLocation }) =>
    hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname
);
```

---

## Phase 61: MEDIUM 이슈 해결

### 61-A: PageViewer 컴포넌트 분리 (3시간)

**현재**: `PageViewer.tsx` (1335줄)

**목표 구조**:
```
frontend/src/pages/
├── PageViewer.tsx              (메인 컨테이너, ~200줄)
├── PageViewerHeader.tsx        (상단 네비게이션, ~150줄)
├── PageViewerCanvas.tsx        (캔버스 영역, ~300줄)
├── PageViewerSidebar.tsx       (사이드바, ~200줄)
└── hooks/
    └── usePageViewerState.ts   (상태 관리 훅, ~400줄)
```

**분리 전략**:
1. 상태 관리 로직 → `usePageViewerState.ts`
2. 헤더 UI → `PageViewerHeader.tsx`
3. 캔버스 래퍼 → `PageViewerCanvas.tsx`
4. 사이드바 → `PageViewerSidebar.tsx`
5. 메인 레이아웃만 → `PageViewer.tsx`

---

### 61-B: Toast 메시지 표준화 (1시간)

**현재 문제**: 메시지 형식 불일치

**표준화 규칙**:
```typescript
// constants/messages.ts
export const TOAST_MESSAGES = {
  // 성공
  GROUP_CREATED: '그룹이 생성되었습니다',
  GROUP_DELETED: '그룹이 삭제되었습니다',
  GROUP_EXPORTED: '문제가 내보내기되었습니다',
  SAVE_SUCCESS: '저장되었습니다',

  // 경고
  NO_BLOCKS_SELECTED: '블록을 선택해주세요',
  ALREADY_IN_GROUP: '이미 그룹에 포함된 블록입니다',

  // 에러
  SAVE_FAILED: '저장에 실패했습니다. 다시 시도해주세요',
  EXPORT_FAILED: '내보내기에 실패했습니다',
  NETWORK_ERROR: '네트워크 오류가 발생했습니다',

  // 정보
  LINK_CREATED: (problemNumber: string) => `${problemNumber}번 연결되었습니다`,
  LINK_REMOVED: (problemNumber: string) => `${problemNumber}번 연결이 해제되었습니다`,
};
```

---

### 61-C: 상수 파일 추출 (1시간)

**현재 문제**: 매직 넘버가 여러 파일에 산재

**새 파일**: `frontend/src/constants/ui.ts`

```typescript
export const UI_CONSTANTS = {
  // 타이밍
  DEBOUNCE_DELAY: 300,
  AUTO_SAVE_DELAY: 1000,
  TOAST_DURATION: 3000,
  EXPORT_RETRY_DELAY: 150,

  // 크기
  BLOCK_PADDING: 2,
  GROUP_PADDING: 5,
  THUMBNAIL_WIDTH: 200,

  // 제한
  MAX_RETRIES: 3,
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB

  // 색상 (Toss 디자인 시스템)
  COLORS: {
    PRIMARY: '#3182f6',
    SUCCESS: '#00c471',
    WARNING: '#f59e0b',
    ERROR: '#f04452',
    GRAY: {
      50: '#f9fafb',
      100: '#f3f4f6',
      500: '#6b7280',
      900: '#111827',
    },
  },
};

export const KEYBOARD_SHORTCUTS = {
  CREATE_GROUP: 'g',
  CREATE_PARENT: 'm',
  CREATE_CHILD: 'l',
  CROSS_PAGE: 'p',
  UNGROUP: 'u',
  CONFIRM: 'f',
  DELETE: 'Delete',
  SAVE: 'ctrl+s',
};
```

---

### 61-D: ErrorBoundary 추가 (1시간)

**위치**: `frontend/src/components/ErrorBoundary.tsx`

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
    // TODO: 에러 리포팅 서비스로 전송
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex h-full items-center justify-center p-8">
          <div className="text-center max-w-md">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              오류가 발생했습니다
            </h2>
            <p className="text-gray-600 mb-4">
              예상치 못한 오류가 발생했습니다. 페이지를 새로고침하거나 다시 시도해주세요.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-toss-blue text-white rounded-lg hover:bg-toss-blue-dark flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                다시 시도
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                새로고침
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <pre className="mt-4 p-4 bg-gray-100 rounded text-left text-xs overflow-auto">
                {this.state.error?.message}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**App.tsx 적용**:
```typescript
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          {/* ... */}
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
```

---

## 진행 순서 권장

```
Week 1: Phase 59 (CRITICAL)
├── Day 1: 59-A Race Condition 수정
├── Day 2: 59-B 동기화 검증 API
└── Day 3: 59-C API 타임아웃 + 테스트

Week 2: Phase 60 (HIGH)
├── Day 1: 60-A 이미지 로드 취소
├── Day 2: 60-B 접근성 개선 (1/2)
├── Day 3: 60-B 접근성 개선 (2/2)
├── Day 4: 60-C Optimistic Update
└── Day 5: 60-D 페이지 이탈 방지 + 테스트

Week 3: Phase 61 (MEDIUM)
├── Day 1-2: 61-A PageViewer 분리
├── Day 3: 61-B Toast 표준화
├── Day 4: 61-C 상수 파일 추출
└── Day 5: 61-D ErrorBoundary + 최종 테스트
```

---

## 성공 지표

| 메트릭 | 현재 | 목표 | 측정 방법 |
|--------|------|------|----------|
| 안정성 점수 | 6.1/10 | 8.0/10 | 코드 리뷰 |
| 최대 파일 크기 | 1335줄 | 500줄 | wc -l |
| useState 수 | 17개 | 5개 | 코드 검색 |
| API 에러율 | 미측정 | <1% | 로그 분석 |
| 페이지 로드 시간 | 미측정 | <2초 | 브라우저 DevTools |

---

## 명령어

```
Phase 59 진행해줘      # CRITICAL 전체
Phase 59-A 진행해줘    # Race Condition만
Phase 60 진행해줘      # HIGH 전체
Phase 61 진행해줘      # MEDIUM 전체
```

---

*작성: Claude Code*
