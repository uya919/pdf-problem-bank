# Phase 36: 문제-해설 연결 로직 연구 리포트

**작성일**: 2025-12-03
**심각도**: 🔴 핵심 기능 미동작
**유형**: 데이터 동기화 누락

---

## 1. 문제 요약

### 사용자 보고
```
문제 탭에서 해설 탭으로 넘어가면 문제 리스트가 보이지 않음
```

### 버그 재현 단계
1. 문서 선택 → 세션 시작
2. 문제 탭에서 블록 선택 → 그룹 생성 (예: "1번 문제")
3. 해설 탭(2번 키)으로 전환
4. **하단 미연결 바에 문제가 표시되지 않음** ❌

---

## 2. 현재 아키텍처 분석

### 2.1 데이터 흐름 다이어그램

```
┌─────────────────────────────────────────────────────────────────────┐
│                        현재 데이터 흐름                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [문제 탭]                                                           │
│      ↓                                                               │
│  블록 선택 → 그룹 생성 (handleCreateGroup)                          │
│      ↓                                                               │
│  saveImmediately() → groups.json 저장 ✅                            │
│      ↓                                                               │
│  api.exportGroup() → problems/ 폴더에 이미지 저장 ✅                │
│      ↓                                                               │
│  ❌ session.problems는 업데이트되지 않음!                           │
│                                                                      │
│  [해설 탭으로 전환]                                                  │
│      ↓                                                               │
│  setActiveTab('solution')                                            │
│      ↓                                                               │
│  ❌ syncProblems() 호출 없음!                                        │
│      ↓                                                               │
│  useUnlinkedProblems() → session.problems가 비어있음                │
│      ↓                                                               │
│  미연결 문제 바: 빈 상태 ❌                                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 관련 파일 및 함수

| 파일 | 함수/훅 | 역할 | 문제점 |
|------|---------|------|--------|
| `PageViewer.tsx` | `handleCreateGroup` | 그룹 생성 | session.problems 미업데이트 |
| `UnifiedWorkPage.tsx` | `setActiveTab` | 탭 전환 | syncProblems 미호출 |
| `workSessionStore.ts` | `syncProblems` | groups.json → session.problems | 수동 호출 필요 |
| `workSessionStore.ts` | `useUnlinkedProblems` | 미연결 문제 계산 | session.problems 의존 |

### 2.3 syncProblems() 호출 시점 분석

**현재 호출 시점**:
```typescript
// 1. 세션 로드 시 (Phase 34-E)
loadSession: async (sessionId) => {
  // ... 세션 로드
  await get().syncProblems();  // ✅ 호출됨
}
```

**누락된 호출 시점**:
```
❌ 그룹 생성 후
❌ 해설 탭 전환 시
❌ 그룹 삭제 후
```

---

## 3. 근본 원인

### 3.1 세션-그룹 데이터 분리 구조

```
┌─────────────────────────────────────────────────────────────────────┐
│  데이터 저장소                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [dataset_root/{document_id}/groups/]                               │
│  └── page_0.json                                                     │
│  └── page_1.json                                                     │
│  └── ...                                                             │
│                                                                      │
│  [dataset_root/sessions/]                                            │
│  └── {session_id}.json                                               │
│      ├── problems: []      ← syncProblems()로 채워짐                │
│      └── links: []         ← createLink()로 채워짐                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**문제**: 두 저장소가 분리되어 있어 **수동 동기화** 필요

### 3.2 동기화 누락 시나리오

```
시나리오 1: 새 세션에서 첫 작업
──────────────────────────────────
1. 세션 생성 → session.problems = []
2. 문제 그룹 생성 → groups/page_0.json 저장
3. session.problems는 여전히 []
4. 해설 탭 전환 → 문제 없음 표시

시나리오 2: 기존 세션 재개 후 추가 작업
──────────────────────────────────
1. 세션 로드 → syncProblems() → 기존 문제 로드
2. 새 문제 그룹 생성 → groups/page_X.json 저장
3. session.problems에는 새 문제 미반영
4. 해설 탭 → 기존 문제만 표시, 새 문제 누락
```

---

## 4. UX 원칙 분석

### 4.1 토스 UX 원칙 적용

| 원칙 | 현재 상태 | 개선 방향 |
|------|----------|----------|
| **자동화** | ❌ 수동 동기화 필요 | ✅ 그룹 생성 시 자동 동기화 |
| **즉각 반응** | ❌ 탭 전환 후 데이터 없음 | ✅ 탭 전환 전 동기화 완료 |
| **일관성** | ❌ 문제 탭 작업이 해설 탭에 미반영 | ✅ 모든 탭에서 최신 상태 |

### 4.2 사용자 기대 vs 현실

```
┌─────────────────────────────────────────────────────────────────────┐
│  사용자 기대                                                         │
├─────────────────────────────────────────────────────────────────────┤
│  1. 문제 탭: 1번, 2번, 3번 문제 그룹 생성                           │
│  2. 해설 탭 클릭                                                     │
│  3. 하단에 "미연결: 1번 2번 3번" 표시                               │
│  4. 1번 선택 → 해설 영역 그룹핑 → 자동 연결                        │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│  현재 현실                                                           │
├─────────────────────────────────────────────────────────────────────┤
│  1. 문제 탭: 1번, 2번, 3번 문제 그룹 생성 ✅                        │
│  2. 해설 탭 클릭                                                     │
│  3. 하단에 아무것도 표시되지 않음 ❌                                │
│  4. 연결 불가능 ❌                                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. 해결 방안

### 방안 1: 해설 탭 전환 시 동기화 (최소 수정) ⭐

**파일**: `UnifiedWorkPage.tsx`

```typescript
// 해설 탭 전환 시 동기화
const handleTabChange = useCallback(async (tab: 'problem' | 'solution') => {
  if (tab === 'solution') {
    // 해설 탭으로 전환 전 문제 동기화
    await syncProblems();
  }
  setActiveTab(tab);
}, [setActiveTab, syncProblems]);
```

**장점**: 최소한의 수정으로 문제 해결
**단점**: 탭 전환 시 약간의 지연 가능

### 방안 2: 그룹 생성 시 즉시 동기화 ⭐⭐

**파일**: `PageViewer.tsx`

```typescript
// handleCreateGroup에 추가
const handleCreateGroup = async () => {
  // ... 기존 그룹 생성 로직

  // Phase 36: 그룹 생성 후 세션 동기화
  try {
    await syncProblems();
    console.log('[Phase 36] Problems synced after group creation');
  } catch (error) {
    console.warn('[Phase 36] Sync failed:', error);
  }
};
```

**장점**: 실시간 동기화, 즉각적인 반영
**단점**: 매 그룹 생성마다 API 호출

### 방안 3: Optimistic UI + 백그라운드 동기화 ⭐⭐⭐ (권장)

**파일**: `workSessionStore.ts`

```typescript
// 그룹 생성 시 로컬 상태 즉시 업데이트
addProblemLocal: (problem: SessionProblem) => {
  set((state) => ({
    currentSession: state.currentSession ? {
      ...state.currentSession,
      problems: [...state.currentSession.problems, problem]
    } : null
  }));
},

// 백그라운드에서 서버 동기화
syncInBackground: async () => {
  // 디바운스된 서버 동기화
}
```

**장점**:
- 즉각적인 UI 반응 (Optimistic UI)
- 서버 동기화 최소화
- 토스 UX 철학에 부합

---

## 6. 권장 구현 계획

### Phase 36-A: 해설 탭 전환 시 동기화 (빠른 수정)

```typescript
// UnifiedWorkPage.tsx
const handleTabChange = useCallback(async (tab: 'problem' | 'solution') => {
  if (tab === 'solution' && activeTab === 'problem') {
    try {
      await syncProblems();
    } catch (e) {
      console.warn('Sync failed:', e);
    }
  }
  setActiveTab(tab);
}, [activeTab, setActiveTab, syncProblems]);
```

### Phase 36-B: 로딩 상태 추가 (UX 개선)

```typescript
const [isSyncing, setIsSyncing] = useState(false);

const handleTabChange = async (tab) => {
  if (tab === 'solution' && activeTab === 'problem') {
    setIsSyncing(true);
    await syncProblems();
    setIsSyncing(false);
  }
  setActiveTab(tab);
};

// 탭 버튼에 로딩 표시
<button disabled={isSyncing}>
  {isSyncing ? '동기화 중...' : '해설'}
</button>
```

### Phase 36-C: Optimistic UI (고급, 선택)

그룹 생성 즉시 로컬 상태 업데이트 → 백그라운드 서버 동기화

---

## 7. 체크리스트

```
[ ] Phase 36-A: 해설 탭 전환 시 syncProblems() 호출
[ ] Phase 36-B: 동기화 중 로딩 상태 표시
[ ] Phase 36-C: (선택) Optimistic UI 구현
[ ] 테스트: 문제 생성 → 해설 탭 → 미연결 문제 표시 확인
[ ] 테스트: 여러 문제 생성 후 해설 탭 전환
[ ] 테스트: 빠른 탭 전환 시 동작 확인
```

---

## 8. 영향 범위

| 파일 | 수정 내용 |
|------|----------|
| `frontend/src/pages/UnifiedWorkPage.tsx` | 탭 전환 핸들러 수정 |
| `frontend/src/stores/workSessionStore.ts` | (선택) 로컬 상태 업데이트 함수 추가 |

---

## 9. 예상 소요 시간

| Phase | 시간 |
|-------|------|
| Phase 36-A | 10분 |
| Phase 36-B | 10분 |
| Phase 36-C | 30분 (선택) |
| 테스트 | 10분 |
| **합계** | **30분** (필수) ~ 60분 (전체) |

---

## 10. 결론

### 근본 원인
- 그룹 생성 시 `session.problems`가 자동 업데이트되지 않음
- 탭 전환 시 `syncProblems()`가 호출되지 않음

### 권장 해결책
**Phase 36-A**: 해설 탭 전환 시 동기화 (최소 수정, 빠른 효과)

### UX 개선 방향
- 즉각적인 UI 반응 (Optimistic UI)
- 백그라운드 동기화로 사용자 대기 최소화
- 토스 스타일의 간결한 로딩 표시

---

*승인 시 "진행해줘"로 Phase 36-A 구현 시작*
