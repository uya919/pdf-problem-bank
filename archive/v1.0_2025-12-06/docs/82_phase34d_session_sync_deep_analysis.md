# Phase 34-D: 작업 세션 동기화 문제 심층 분석 리포트

**작성일**: 2025-12-03
**보고 유형**: 아키텍처 결함 분석
**심각도**: 🔴 높음

---

## 1. 문제 요약

### 사용자 보고
1. **진행중인 작업 삭제 기능 필요**
2. **그룹핑 작업이 저장되지 않음** - 나갔다 들어오면 작업이 사라짐

### 진단 결과
| 항목 | 상태 | 원인 | 심각도 |
|------|------|------|--------|
| **세션 삭제 기능** | ✅ 완성 | - | 없음 |
| **그룹핑 저장 (파일)** | ✅ 완성 | - | 없음 |
| **그룹↔세션 동기화** | ❌ 미흡 | Phase 32 설계 미흡 | 🔴 높음 |
| **페이지 새로고침 후 복구** | ❌ 불가 | 세션 로드 시 동기화 부재 | 🔴 높음 |

---

## 2. 현재 아키텍처 분석

### 2.1 세션 관리 구조 (정상)

```
┌─────────────────────────────────────────────────────────────┐
│ 백엔드: work_sessions.py                                    │
├─────────────────────────────────────────────────────────────┤
│ - DELETE /api/work-sessions/{session_id}  ✅ 구현됨        │
│ - 저장 위치: dataset_root/work_sessions/ws-{id}.json       │
│ - CRUD 완전 구현                                            │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│ 프론트엔드: workSessionStore.ts                             │
├─────────────────────────────────────────────────────────────┤
│ - deleteSession() 메서드  ✅ 구현됨                        │
│ - API 호출: api.deleteWorkSession(sessionId)               │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│ UI: WorkSessionDashboard.tsx                                │
├─────────────────────────────────────────────────────────────┤
│ - 휴지통 아이콘 + "삭제" 버튼  ✅ 구현됨                   │
│ - 2단계 확인 시스템                                         │
└─────────────────────────────────────────────────────────────┘
```

**결론**: 세션 삭제 기능은 완전히 구현되어 있음. UI에서 접근 경로만 확인 필요.

### 2.2 그룹핑 저장 구조 (정상)

```
┌─────────────────────────────────────────────────────────────┐
│ 백엔드: blocks.py                                           │
├─────────────────────────────────────────────────────────────┤
│ POST /api/blocks/documents/{document_id}/groups/{page}      │
│ 저장 위치: documents/{doc_id}/groups/page_XXXX_groups.json  │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│ 프론트엔드: PageViewer.tsx                                  │
├─────────────────────────────────────────────────────────────┤
│ saveGroups() → useSavePageGroups → api.savePageGroups()    │
│ 그룹 생성/수정 시 자동 저장                                  │
└─────────────────────────────────────────────────────────────┘
```

**결론**: 그룹핑 데이터는 `groups.json` 파일에 정상 저장됨.

---

## 3. 핵심 문제: 데이터 동기화 결함

### 3.1 문제의 본질

```
┌──────────────────┐      ┌──────────────────┐
│   groups.json    │      │   session.json   │
│ (실제 그룹 데이터)│  ❌  │ (problems: [])   │
│      ✅ 저장됨   │ ───→ │    비어있음!     │
└──────────────────┘      └──────────────────┘
         ↑                         ↓
         │                    세션 리로드
    저장은 됨              │
         │                         ↓
         │                 UI는 session.problems 표시
         │                         ↓
         └────────────────── 그룹이 보이지 않음!
```

### 3.2 Phase 32-E 설계 결함

**WorkSessionLabelingPage.tsx의 현재 흐름:**

```typescript
// "다음" 버튼 클릭 시에만 동기화
const handleNextStep = async () => {
    // groups.json에서 문제 동기화 ← 이때만 호출!
    await syncProblems();

    // 세션 단계 업데이트
    await updateSession({ step: 'setup' });
    navigate(`/work/${sessionId}/setup`);
};
```

**문제점:**
1. `syncProblems()`가 **"다음" 버튼 클릭 시에만** 호출됨
2. 그룹핑 작업 중에는 세션의 `problems` 배열이 **항상 비어있음**
3. 페이지 이탈/새로고침 시 → 세션 리로드 → **그룹 작업이 반영되지 않음**

### 3.3 데이터 흐름 비교

**정상 시나리오 (다음 버튼 클릭):**
```
1. 그룹 생성 → groups.json 저장 ✅
2. "다음" 클릭 → syncProblems() 호출
3. groups.json → session.problems 동기화 ✅
4. 세션에 문제 목록 반영 ✅
```

**문제 시나리오 (페이지 새로고침):**
```
1. 그룹 생성 → groups.json 저장 ✅
2. 페이지 새로고침 (다음 클릭 없이)
3. 세션 리로드 → session.problems = [] ❌
4. UI는 빈 목록 표시 ❌
5. 그룹핑 작업이 사라진 것처럼 보임 ❌
```

### 3.4 실제 데이터 확인

```
dataset_root/work_sessions/ws-xxx.json:
{
  "sessionId": "ws-xxx",
  "problems": [],      ← 비어있음!
  "links": [],
  "status": "active"
}

dataset_root/documents/고1_공통수학1_베이직쎈_문제/groups/:
  page_0000_groups.json  ← 데이터 존재!
  page_0001_groups.json  ← 데이터 존재!
  ...
```

**결론**: 그룹 데이터는 파일에 저장되지만, 세션 객체와 동기화되지 않음.

---

## 4. 해결 방안

### 방안 1: 세션 로드 시 자동 동기화 (권장) ⭐

**구현 위치**: `workSessionStore.ts` - `loadSession()` 메서드

```typescript
loadSession: async (sessionId: string) => {
    set({ isLoading: true, error: null });

    try {
        const response = await api.getWorkSession(sessionId);
        set({ currentSession: response.session, isLoading: false });

        // ✅ 새로 추가: 세션 로드 후 자동 동기화
        if (response.session.problemDocumentId) {
            await get().syncProblems();  // groups.json → session.problems
        }
    } catch (error) {
        set({ error: error.message, isLoading: false });
    }
}
```

**장점:**
- 페이지 새로고침/재방문 시 자동 복구
- 기존 `syncProblems()` 재사용
- 최소 코드 변경

**단점:**
- 추가 API 호출 1회

### 방안 2: 그룹 저장 시 즉시 세션 동기화

**구현 위치**: `PageViewer.tsx` 또는 그룹 저장 로직

```typescript
const handleGroupSaved = async (groups: ProblemGroup[]) => {
    // 1. groups.json 저장 (현재 동작)
    await saveGroups(groups, currentPage);

    // 2. 세션에도 즉시 반영
    if (currentSession) {
        await syncProblems();  // 매 저장마다 동기화
    }
};
```

**장점:**
- 실시간 동기화
- 데이터 일관성 보장

**단점:**
- 저장 시마다 추가 API 호출
- 성능 영향 가능

### 방안 3: 하이브리드 (권장 조합) ⭐⭐

**세션 로드 시 + 페이지 이탈 시 동기화:**

```typescript
// 1. 세션 로드 시
loadSession: async (sessionId) => {
    const response = await api.getWorkSession(sessionId);
    set({ currentSession: response.session });
    await get().syncProblems();  // 자동 동기화
}

// 2. 페이지 이탈 시 (beforeunload 또는 useEffect cleanup)
useEffect(() => {
    return () => {
        // 페이지 나갈 때 동기화
        syncProblems();
    };
}, []);
```

---

## 5. 구현 계획

### Step 1: workSessionStore.ts 수정
- `loadSession()` 메서드에 `syncProblems()` 호출 추가
- 예상 시간: 5분

### Step 2: 페이지 이탈 시 동기화 추가
- `WorkSessionLabelingPage.tsx`에 cleanup 함수 추가
- `beforeunload` 이벤트 리스너 추가
- 예상 시간: 10분

### Step 3: 테스트
- 그룹 생성 후 새로고침 → 그룹 유지 확인
- 그룹 생성 후 다른 페이지 이동 → 복귀 시 그룹 유지 확인
- 예상 시간: 5분

### Step 4: 삭제 UI 접근성 확인
- 메인 페이지에서 세션 삭제 버튼 접근 가능 여부 확인
- 필요시 UI 추가
- 예상 시간: 10분

---

## 6. 체크리스트

```
[ ] Step 1: loadSession()에 syncProblems() 추가
[ ] Step 2: 페이지 이탈 시 동기화 추가
[ ] Step 3: 새로고침 후 그룹 유지 테스트
[ ] Step 4: 세션 삭제 UI 접근성 확인
[ ] Step 5: 브라우저 테스트
```

---

## 7. 예상 결과

### Before (현재)
```
그룹 생성 → 새로고침 → 그룹 사라짐 ❌
```

### After (수정 후)
```
그룹 생성 → 새로고침 → 세션 로드 → syncProblems() → 그룹 복원 ✅
```

---

## 8. 관련 파일

| 파일 | 역할 | 수정 필요 |
|------|------|----------|
| `frontend/src/stores/workSessionStore.ts` | 세션 상태 관리 | ✅ |
| `frontend/src/pages/WorkSessionLabelingPage.tsx` | 라벨링 페이지 | ✅ |
| `backend/app/routers/work_sessions.py` | 세션 API | ❌ (이미 완성) |
| `frontend/src/components/main/ActiveSessionsSection.tsx` | 세션 목록 UI | 확인 필요 |

---

*승인 시 "진행해줘"로 실행*
