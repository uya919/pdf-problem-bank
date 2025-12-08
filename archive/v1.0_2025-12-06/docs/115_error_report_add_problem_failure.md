# 에러 리포트: 문제 등록 실패 (addProblem AxiosError)

> 2025-12-04 | 문제 그룹 생성 후 세션 등록 실패

---

## 1. 에러 요약

| 항목 | 내용 |
|------|------|
| **증상** | 문제 그룹 생성 시 "AxiosError" 발생 |
| **영향** | 그룹은 로컬(groups.json)에 저장되지만, 세션(session.json)에 등록 안 됨 |
| **빈도** | 매번 발생 |
| **심각도** | 높음 (작업 세션 기능 불완전) |

---

## 2. 에러 로그 분석

### 2.1 정상 동작 부분

```
✅ [SaveGroups] ✅ Successfully saved to page 17
✅ [Phase 39] Group L1 created and auto-registered
✅ [Phase 26] Data loaded from server, auto-save enabled
✅ [Phase 39] Group updated: L1 Object page: 17
✅ [UpdateGroupInfo] Saving group L1 to page 17
✅ [SaveGroups] ✅ Successfully saved to page 17
```

### 2.2 실패 부분

```
❌ [Phase 32] Failed to add problem: AxiosError
❌ [Phase 39] Failed to add problem: AxiosError
```

---

## 3. 데이터 흐름 분석

```
┌─────────────────────────────────────────────────────────────┐
│ 1. PageViewer: 그룹 생성 (G키)                              │
│    → newGroup 생성                                         │
│    → localGroups에 추가                                    │
│    → onGroupCreated 콜백 호출 ✅                            │
└──────────────────┬──────────────────────────────────────────┘
                   │
           ┌───────┴───────┐
           │               │
           ▼               ▼
┌─────────────────┐  ┌──────────────────────────────────────┐
│ saveImmediately │  │ UnifiedWorkPage.handleGroupCreated    │
│ → groups.json   │  │ → addProblem() 호출                   │
│ ✅ 성공         │  │ ❌ 실패                               │
└─────────────────┘  └──────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ workSessionStore.addProblem()                               │
│ → api.addProblemToSession(sessionId, data)                  │
│ → POST /api/work-sessions/{sessionId}/problems              │
│ ❌ AxiosError                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. 가능한 원인 분석

### 4.1 원인 A: 중복 그룹 ID (409 Conflict) ⭐ 가능성 높음

**상황**:
- 같은 그룹 ID가 이미 세션에 등록되어 있음
- 동일 그룹 생성 시도 시 서버가 409 반환

**백엔드 코드** (`work_sessions.py:240-243`):
```python
# 중복 체크
existing = next((p for p in session.problems if p.groupId == request.groupId), None)
if existing:
    raise HTTPException(status_code=409, detail=f"그룹 '{request.groupId}'는 이미 등록되어 있습니다")
```

**검증 방법**:
- 세션 파일 확인: `dataset_root/work_sessions/{session_id}.json`
- `problems` 배열에 해당 groupId가 있는지 확인

### 4.2 원인 B: 세션 ID 불일치 또는 세션 없음 (404)

**상황**:
- 프론트엔드가 가지고 있는 세션 ID와 실제 파일이 불일치
- 세션 파일이 삭제됨

**검증 방법**:
- 브라우저 DevTools → Network 탭에서 요청 URL 확인
- `session_id` 값이 올바른지 확인

### 4.3 원인 C: 요청 본문 형식 오류 (422 Validation Error)

**상황**:
- `pageIndex`, `problemNumber` 등 필수 필드 누락
- 타입 불일치 (string vs number)

**프론트엔드 요청 본문** (`UnifiedWorkPage.tsx:88-94`):
```typescript
await addProblem({
  groupId: group.id,
  pageIndex,
  problemNumber,
  displayName: problemNumber,
});
```

### 4.4 원인 D: 세션 파일 손상 또는 잠김

**상황**:
- `session.json` 파일이 손상됨
- 다른 프로세스가 파일을 잠금

---

## 5. 상세 원인 추적

### 5.1 AxiosError 상세 정보 부족

현재 에러 핸들링이 상세 정보를 출력하지 않음:

**현재 코드** (`workSessionStore.ts:299-301`):
```typescript
} catch (error) {
  console.error('[Phase 32] Failed to add problem:', error);  // 상세 정보 없음
  throw error;
}
```

**개선 필요**:
```typescript
} catch (error) {
  if (axios.isAxiosError(error)) {
    console.error('[Phase 32] Failed to add problem:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
    });
  }
  throw error;
}
```

### 5.2 백엔드 로그 확인 필요

백엔드 터미널에서 다음 로그 확인:
```
[Phase 32] 문제 추가: {session_id} - {problemNumber}  ← 성공 시
[API 오류] 문제 추가 실패: {error}                    ← 실패 시
```

---

## 6. 즉시 디버깅 단계

### 6.1 브라우저 Network 탭 확인

1. F12 → Network 탭
2. 문제 그룹 생성 (G키)
3. `/api/work-sessions/*/problems` 요청 찾기
4. **Response** 탭에서 에러 메시지 확인

### 6.2 예상되는 에러 응답

| 상태 코드 | 의미 | 원인 |
|-----------|------|------|
| 404 | Not Found | 세션이 존재하지 않음 |
| 409 | Conflict | 그룹 ID 중복 |
| 422 | Validation Error | 요청 본문 형식 오류 |
| 500 | Server Error | 백엔드 내부 오류 |

### 6.3 세션 파일 직접 확인

```powershell
# 현재 세션 파일 내용 확인
type c:\MYCLAUDE_PROJECT\pdf\dataset_root\work_sessions\{session_id}.json
```

---

## 7. 해결 방안

### 7.1 즉시 조치: 에러 로깅 개선

**파일**: `frontend/src/stores/workSessionStore.ts`

```typescript
// 라인 299-301 수정
} catch (error) {
  if (error instanceof Error && 'response' in error) {
    const axiosError = error as any;
    console.error('[Phase 32] Failed to add problem:', {
      status: axiosError.response?.status,
      message: axiosError.response?.data?.detail || axiosError.message,
      groupId: data.groupId,
    });
  } else {
    console.error('[Phase 32] Failed to add problem:', error);
  }
  throw error;
}
```

### 7.2 중복 문제 해결 (409 Conflict인 경우)

**방안 A**: 프론트엔드에서 중복 체크 추가
```typescript
// UnifiedWorkPage.tsx handleGroupCreated
const existingProblem = currentSession?.problems.find(p => p.groupId === group.id);
if (existingProblem) {
  console.log('[Phase 39] Problem already exists, skipping addProblem');
  return;
}
```

**방안 B**: 백엔드에서 upsert 로직으로 변경
```python
# work_sessions.py add_problem
existing = next((p for p in session.problems if p.groupId == request.groupId), None)
if existing:
    # 기존 문제 업데이트 대신 무시
    return session  # 409 대신 기존 세션 반환
```

### 7.3 새 세션 생성 (세션이 유효하지 않은 경우)

1. 홈으로 이동
2. 새 작업 세션 시작
3. 문서 선택 후 진행

---

## 8. 권장 디버깅 순서

```
1️⃣ 브라우저 Network 탭에서 응답 상태 코드 확인
   → 404, 409, 422, 500 중 무엇인지?

2️⃣ 백엔드 터미널에서 에러 로그 확인
   → 어떤 예외가 발생했는지?

3️⃣ 세션 파일 존재 여부 확인
   → session_id에 해당하는 파일이 있는지?

4️⃣ 세션 파일 내용 확인
   → problems 배열에 중복 groupId가 있는지?
```

---

## 9. 결론

| 항목 | 내용 |
|------|------|
| **가장 유력한 원인** | 409 Conflict (그룹 ID 중복) 또는 404 (세션 없음) |
| **필요한 정보** | HTTP 응답 상태 코드 |
| **즉시 조치** | 브라우저 Network 탭에서 응답 확인 |
| **장기 조치** | 에러 로깅 개선 + 중복 방지 로직 추가 |

---

*작성: Claude Code | 2025-12-04*
