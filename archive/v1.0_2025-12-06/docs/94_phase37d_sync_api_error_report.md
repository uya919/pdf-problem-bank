# Phase 37-D 동기화 API 에러 리포트

**작성일**: 2025-12-04
**심각도**: Critical
**상태**: 분석 완료, 수정 대기

---

## 1. 증상 (Symptoms)

### 사용자 보고
```
고1 베이직쎈 을 들어가면 문제는 잘뜨는데 해설을 찾을수 없다고 나와
```

### 상세 증상
1. 문제 문서는 정상적으로 표시됨
2. 해설 탭 클릭 시 "해설을 찾을 수 없습니다" 또는 빈 화면 표시
3. 실제 해설 문서(`고1_공통수학1_베이직쎈_해설`)는 존재하며 50+ 페이지 보유

### 콘솔 로그 증거
```javascript
[Phase 37-D] Full sync completed: {
    added: undefined,
    removed: undefined,
    updated: undefined,
    links: undefined
}
```

---

## 2. 근본 원인 (Root Cause)

### 핵심 버그: API 응답 키 불일치

**백엔드 API (`work_sessions.py:543-551`)**가 반환하는 키와 **프론트엔드 (`client.ts:933-940`)**가 기대하는 키가 불일치합니다.

#### 백엔드 응답 (camelCase)
```python
# backend/app/routers/work_sessions.py:543-551
return {
    "success": result.success,
    "problemsAdded": result.problems_added,      # ← camelCase
    "problemsRemoved": result.problems_removed,  # ← camelCase
    "problemsUpdated": result.problems_updated,  # ← camelCase
    "linksSynced": result.links_synced,          # ← camelCase
    "conflicts": result.conflicts,
    "error": result.error
    # ← "session" 필드 없음!
}
```

#### 프론트엔드 기대값 (snake_case)
```typescript
// frontend/src/api/client.ts:933-940
fullSync: async (sessionId: string): Promise<{
    success: boolean;
    problems_added: number;     // ← snake_case (MISMATCH!)
    problems_removed: number;   // ← snake_case (MISMATCH!)
    problems_updated: number;   // ← snake_case (MISMATCH!)
    links_synced: number;       // ← snake_case (MISMATCH!)
    session: WorkSession;       // ← 기대하지만 백엔드가 반환 안함!
}>
```

### 연쇄 반응 (Cascade Failure)

```
1. fullSync() API 호출
   ↓
2. 백엔드: { "problemsAdded": 7, "session": undefined, ... } 반환
   ↓
3. 프론트엔드: result.problems_added = undefined (키 불일치)
              result.session = undefined (필드 없음)
   ↓
4. workSessionStore.ts:340:
   set({ currentSession: result.session })
   → currentSession = undefined 로 설정됨!
   ↓
5. UnifiedWorkPage.tsx:97-99:
   const { data: solutionDoc } = useDocument(
       currentSession?.solutionDocumentId || ''  // ← 빈 문자열!
   );
   ↓
6. solutionDoc = undefined
   ↓
7. 해설 탭에서 문서를 찾을 수 없음
```

---

## 3. 영향 범위 (Impact Scope)

### 영향받는 기능
| 기능 | 영향도 | 설명 |
|------|--------|------|
| 해설 탭 전환 | **Critical** | 탭 전환 시 fullSync 호출 → 세션 상태 손실 |
| 문제-해설 연결 | **High** | 세션 상태 손실로 연결 불가 |
| 동기화 상태 표시 | **Medium** | SyncIndicator에서 undefined 값 표시 |
| 토스트 알림 | **Low** | undefined 값으로 인한 비정상 메시지 |

### 영향받는 파일
```
backend/app/routers/work_sessions.py     # API 응답 형식
frontend/src/api/client.ts               # API 타입 정의
frontend/src/stores/workSessionStore.ts  # 상태 업데이트 로직
frontend/src/pages/UnifiedWorkPage.tsx   # UI 렌더링
frontend/src/components/SyncIndicator.tsx # 동기화 표시
```

---

## 4. 데이터 검증

### 세션 파일 확인
```
경로: dataset_root/work_sessions/ws-1764766473947-b04ad950.json

{
  "sessionId": "ws-1764766473947-b04ad950",
  "problemDocumentId": "고1_공통수학1_베이직쎈_문제",
  "solutionDocumentId": "고1_공통수학1_베이직쎈_해설",  ← 정상!
  "problems": [... 7개 ...],
  "links": []
}
```

### 해설 문서 확인
```
경로: dataset_root/documents/고1_공통수학1_베이직쎈_해설/

✓ 존재함
✓ pages/ 폴더: 50+ 페이지 이미지 존재
✓ blocks/ 폴더: 블록 JSON 존재
```

**결론**: 데이터는 모두 정상. 문제는 순수하게 API 통신 형식 불일치.

---

## 5. 해결 방안 (Proposed Solutions)

### Option A: 프론트엔드 수정 (권장)
백엔드 응답 형식에 맞춰 프론트엔드 수정

```typescript
// frontend/src/api/client.ts
fullSync: async (sessionId: string): Promise<{
    success: boolean;
    problemsAdded: number;      // camelCase로 변경
    problemsRemoved: number;
    problemsUpdated: number;
    linksSynced: number;
    // session 필드 제거
}>
```

```typescript
// frontend/src/stores/workSessionStore.ts
fullSync: async () => {
    const result = await api.fullSync(currentSession.sessionId);
    // 세션을 별도로 다시 로드하거나
    // 세션 상태를 업데이트하지 않음 (현재 상태 유지)
    set({ isLoading: false });
    return {
        success: result.success,
        problems_added: result.problemsAdded,  // 매핑
        problems_removed: result.problemsRemoved,
        ...
    };
}
```

### Option B: 백엔드 수정
프론트엔드 기대값에 맞춰 백엔드 수정

```python
# backend/app/routers/work_sessions.py
return {
    "success": result.success,
    "problems_added": result.problems_added,   # snake_case로 변경
    "problems_removed": result.problems_removed,
    "problems_updated": result.problems_updated,
    "links_synced": result.links_synced,
    "conflicts": result.conflicts,
    "error": result.error,
    "session": session.model_dump()  # 세션 객체 추가
}
```

### Option C: 양쪽 일관성 정립 (장기적)
프로젝트 전체에서 일관된 네이밍 컨벤션 적용
- 백엔드 ↔ 프론트엔드 통신: camelCase (JavaScript 표준)
- 백엔드 내부: snake_case (Python 표준)

---

## 6. 권장 해결 순서

1. **즉시 수정** (Option A + B 조합):
   - 백엔드에서 `session` 객체 반환 추가
   - 프론트엔드에서 camelCase 키 사용으로 수정

2. **검증**:
   - fullSync 호출 후 currentSession이 유지되는지 확인
   - 해설 탭 전환 시 solutionDoc이 로드되는지 확인

3. **장기 개선** (Option C):
   - API 응답/요청 네이밍 컨벤션 문서화
   - 기존 API들 일관성 검토

---

## 7. 관련 코드 위치

| 파일 | 라인 | 설명 |
|------|------|------|
| `backend/app/routers/work_sessions.py` | 515-551 | full-sync API 엔드포인트 |
| `frontend/src/api/client.ts` | 932-943 | fullSync API 클라이언트 |
| `frontend/src/stores/workSessionStore.ts` | 331-358 | fullSync 스토어 액션 |
| `frontend/src/pages/UnifiedWorkPage.tsx` | 62-77 | 탭 전환 시 fullSync 호출 |
| `frontend/src/pages/UnifiedWorkPage.tsx` | 94-99 | 문서 정보 조회 |

---

## 8. 테스트 케이스

수정 후 확인해야 할 시나리오:

1. [ ] 세션 로드 후 문제 탭에서 문서 정상 표시
2. [ ] 해설 탭으로 전환 시 해설 문서 정상 표시
3. [ ] 탭 전환 후에도 세션 상태 유지
4. [ ] SyncIndicator에서 정확한 카운트 표시
5. [ ] 동기화 완료 토스트에서 정확한 숫자 표시
6. [ ] 여러 번 탭 전환해도 상태 안정적 유지

---

*분석 완료: 2025-12-04*
*작성자: Claude Code (Opus)*
