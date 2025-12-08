# Phase 37-D 동기화 API 버그 수정 계획

**작성일**: 2025-12-04
**관련 문서**: [94_phase37d_sync_api_error_report.md](94_phase37d_sync_api_error_report.md)

---

## 목표

`fullSync` API의 키 네이밍 불일치 및 누락된 `session` 객체 문제 해결

---

## 단계별 개발 계획

### Step 1: 백엔드 API 응답 수정
**파일**: `backend/app/routers/work_sessions.py`

- [ ] `full_sync` 엔드포인트에서 `session` 객체 반환 추가
- [ ] 응답 키를 snake_case로 통일 (프론트엔드 기대값과 일치)

**변경 내용**:
```python
# 기존 (line 543-551)
return {
    "success": result.success,
    "problemsAdded": result.problems_added,
    ...
}

# 변경 후
return {
    "success": result.success,
    "problems_added": result.problems_added,
    "problems_removed": result.problems_removed,
    "problems_updated": result.problems_updated,
    "links_synced": result.links_synced,
    "conflicts": result.conflicts,
    "error": result.error,
    "session": session.model_dump()  # 세션 객체 추가
}
```

---

### Step 2: 프론트엔드 API 클라이언트 타입 확인
**파일**: `frontend/src/api/client.ts`

- [ ] `fullSync` 반환 타입이 백엔드 응답과 일치하는지 확인
- [ ] 필요시 타입 정의 수정

**확인 사항**:
```typescript
fullSync: async (sessionId: string): Promise<{
    success: boolean;
    problems_added: number;    // ← snake_case 확인
    problems_removed: number;
    problems_updated: number;
    links_synced: number;
    session: WorkSession;      // ← session 필드 확인
}>
```

---

### Step 3: 스토어 로직 안정화
**파일**: `frontend/src/stores/workSessionStore.ts`

- [ ] `fullSync` 액션에서 `result.session` 사용 전 유효성 검사 추가
- [ ] 세션이 없는 경우 기존 세션 유지하도록 방어 로직 추가

**변경 내용**:
```typescript
// 기존 (line 339-340)
const result = await api.fullSync(currentSession.sessionId);
set({ currentSession: result.session, isLoading: false });

// 변경 후
const result = await api.fullSync(currentSession.sessionId);
// 세션이 반환되면 업데이트, 아니면 기존 유지
if (result.session) {
    set({ currentSession: result.session, isLoading: false });
} else {
    set({ isLoading: false });
}
```

---

### Step 4: SyncIndicator 토스트 메시지 수정
**파일**: `frontend/src/components/SyncIndicator.tsx`

- [ ] `undefined` 값 표시 방지를 위한 기본값 처리

**변경 내용**:
```typescript
// 기존 (line 92)
description: `${result.problems_added}개 추가, ${result.links_synced}개 연결됨`,

// 변경 후
description: `${result.problems_added ?? 0}개 추가, ${result.links_synced ?? 0}개 연결됨`,
```

---

### Step 5: 테스트 및 검증

- [ ] 백엔드 서버 재시작
- [ ] 세션 로드 후 문제 탭 정상 표시 확인
- [ ] 해설 탭 전환 시 해설 문서 정상 표시 확인
- [ ] 탭 전환 후 세션 상태 유지 확인
- [ ] SyncIndicator에서 정확한 카운트 표시 확인
- [ ] 동기화 완료 토스트에서 정확한 숫자 표시 확인

---

## 수정 파일 요약

| 순서 | 파일 | 작업 내용 |
|------|------|-----------|
| 1 | `backend/app/routers/work_sessions.py` | API 응답에 session 추가, snake_case 키 |
| 2 | `frontend/src/api/client.ts` | 타입 확인 (변경 없을 수 있음) |
| 3 | `frontend/src/stores/workSessionStore.ts` | session 유효성 검사 추가 |
| 4 | `frontend/src/components/SyncIndicator.tsx` | undefined 방어 처리 |

---

## 예상 소요 시간

- Step 1: 5분
- Step 2: 2분
- Step 3: 3분
- Step 4: 2분
- Step 5: 5분

**총 예상 시간**: ~15분

---

## 롤백 계획

문제 발생 시:
1. 백엔드 변경 사항 revert
2. 프론트엔드 변경 사항 revert
3. 서버 재시작

---

*작성자: Claude Code*
