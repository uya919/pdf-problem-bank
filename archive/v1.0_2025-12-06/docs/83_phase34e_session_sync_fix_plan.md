# Phase 34-E: 세션 동기화 및 삭제 기능 개선 계획

**작성일**: 2025-12-03
**근거 문서**: [82_phase34d_session_sync_deep_analysis.md](82_phase34d_session_sync_deep_analysis.md)

---

## 1. 목표

### 해결할 문제
1. **그룹핑 작업이 저장되지 않음** - 새로고침 시 작업 사라짐
2. **세션 삭제 접근성** - 메인 페이지에서 삭제 버튼 접근 확인

### 기대 결과
- 그룹 생성 → 새로고침 → 그룹 유지 ✅
- 메인 페이지에서 세션 삭제 가능 ✅

---

## 2. 단계별 개발 계획

### Step 1: workSessionStore.ts 분석 및 수정

**파일**: `frontend/src/stores/workSessionStore.ts`

**작업 내용**:
1. `loadSession()` 메서드 찾기
2. 세션 로드 직후 `syncProblems()` 호출 추가

**변경 예시**:
```typescript
loadSession: async (sessionId: string) => {
    set({ isLoading: true, error: null });

    try {
        const response = await api.getWorkSession(sessionId);
        set({ currentSession: response.session, isLoading: false });

        // ✅ 추가: 세션 로드 후 자동 동기화
        // problemDocumentId가 있으면 groups.json에서 문제 동기화
        if (response.session?.problemDocumentId) {
            await get().syncProblems();
        }
    } catch (error) {
        set({ error: (error as Error).message, isLoading: false });
    }
}
```

**예상 시간**: 10분

---

### Step 2: syncProblems 메서드 확인

**파일**: `frontend/src/stores/workSessionStore.ts`

**확인 사항**:
1. `syncProblems()` 메서드가 존재하는지 확인
2. API 호출 방식 확인: `api.syncProblemsFromGroups(sessionId)`
3. 호출 후 세션 상태 업데이트 여부

**예상 시간**: 5분

---

### Step 3: UnifiedWorkPage 진입 시 동기화 확인

**파일**: `frontend/src/pages/UnifiedWorkPage.tsx`

**확인 사항**:
1. 페이지 마운트 시 `loadSession()` 호출 여부
2. Step 1 수정으로 자동 동기화되는지 확인

**추가 작업 (필요시)**:
```typescript
useEffect(() => {
    if (sessionId) {
        loadSession(sessionId);  // 이미 syncProblems 포함
    }
}, [sessionId]);
```

**예상 시간**: 5분

---

### Step 4: 페이지 이탈 시 동기화 (선택)

**파일**: `frontend/src/pages/UnifiedWorkPage.tsx` 또는 `WorkSessionLabelingPage.tsx`

**작업 내용**:
페이지를 나갈 때 마지막으로 동기화하여 데이터 손실 방지

```typescript
useEffect(() => {
    // 페이지 이탈 시 동기화
    const handleBeforeUnload = () => {
        // 동기 호출은 불가하므로 navigator.sendBeacon 사용 고려
    };

    // cleanup 함수
    return () => {
        // 페이지 언마운트 시 동기화 시도
        syncProblems().catch(console.error);
    };
}, []);
```

**예상 시간**: 10분

---

### Step 5: ActiveSessionsSection 삭제 버튼 확인

**파일**: `frontend/src/components/main/ActiveSessionsSection.tsx`

**확인 사항**:
1. 세션 카드에 삭제 버튼 존재 여부
2. 없으면 휴지통 아이콘 버튼 추가

**추가 UI (필요시)**:
```tsx
<button
    onClick={(e) => {
        e.stopPropagation();
        if (confirm('이 세션을 삭제하시겠습니까?')) {
            deleteSession(session.sessionId);
        }
    }}
    className="p-1.5 text-grey-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
    title="세션 삭제"
>
    <Trash2 className="w-4 h-4" />
</button>
```

**예상 시간**: 10분

---

### Step 6: TypeScript 컴파일 확인

**명령어**:
```bash
cd frontend
npx tsc --noEmit
```

**예상 결과**: 에러 없음

**예상 시간**: 2분

---

### Step 7: 브라우저 테스트

**테스트 시나리오**:

#### 7.1 그룹핑 저장 테스트
1. 메인 페이지에서 "새 작업 시작" 클릭
2. 문제 문서 선택 → 작업 시작
3. 그룹 2-3개 생성
4. **F5 새로고침**
5. ✅ 그룹이 유지되는지 확인

#### 7.2 세션 이탈 후 복귀 테스트
1. 그룹 생성 후
2. 메인 페이지로 이동 (사이드바 클릭)
3. 다시 해당 세션으로 진입
4. ✅ 그룹이 유지되는지 확인

#### 7.3 세션 삭제 테스트
1. 메인 페이지에서 활성 세션 확인
2. 삭제 버튼 클릭
3. ✅ 세션이 목록에서 제거되는지 확인

**예상 시간**: 10분

---

## 3. 체크리스트

```
[ ] Step 1: loadSession()에 syncProblems() 추가
[ ] Step 2: syncProblems 메서드 동작 확인
[ ] Step 3: UnifiedWorkPage 진입 시 동기화 확인
[ ] Step 4: 페이지 이탈 시 동기화 추가 (선택)
[ ] Step 5: ActiveSessionsSection 삭제 버튼 확인/추가
[ ] Step 6: TypeScript 컴파일 확인
[ ] Step 7: 브라우저 테스트
```

---

## 4. 예상 총 소요 시간

| 단계 | 시간 |
|------|------|
| Step 1 | 10분 |
| Step 2 | 5분 |
| Step 3 | 5분 |
| Step 4 | 10분 (선택) |
| Step 5 | 10분 |
| Step 6 | 2분 |
| Step 7 | 10분 |
| **합계** | **42분** (Step 4 제외: 32분) |

---

## 5. 수정 파일 요약

| 파일 | 수정 내용 |
|------|----------|
| `frontend/src/stores/workSessionStore.ts` | loadSession()에 syncProblems() 추가 |
| `frontend/src/pages/UnifiedWorkPage.tsx` | 진입 시 동기화 확인 (필요시 수정) |
| `frontend/src/components/main/ActiveSessionsSection.tsx` | 삭제 버튼 확인/추가 |

---

## 6. 롤백 계획

수정 후 문제 발생 시:

### 옵션 A: syncProblems 조건부 호출
```typescript
// 문제 발생 시 동기화를 선택적으로 수행
if (response.session?.problems?.length === 0) {
    await get().syncProblems();  // 비어있을 때만
}
```

### 옵션 B: 수동 동기화 버튼 추가
UI에 "동기화" 버튼을 추가하여 사용자가 직접 호출

---

## 7. 의존성

### 필수 조건
- 백엔드 `sync-problems` API 정상 작동 (이미 구현됨)
- `workSessionStore`에 `syncProblems` 메서드 존재

### 확인 필요
```bash
# API 테스트
curl -X POST http://localhost:8000/api/work-sessions/{sessionId}/sync-problems
```

---

*승인 시 "진행해줘"로 실행*
