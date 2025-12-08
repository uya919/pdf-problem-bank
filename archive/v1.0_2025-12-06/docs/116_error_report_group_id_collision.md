# 에러 리포트: 그룹 ID 충돌 (409 Conflict)

> 2025-12-04 | 문제 등록 시 그룹 ID 중복 에러

---

## 1. 에러 요약

| 항목 | 내용 |
|------|------|
| **증상** | 1번, 2번 문제 등록 성공 → 3번 문제 등록 실패 |
| **에러 코드** | **409 Conflict** |
| **에러 메시지** | `"그룹 'L3'는 이미 등록되어 있습니다"` |
| **원인** | 그룹 ID가 페이지별로 순차 생성되어 다른 페이지의 ID와 충돌 |
| **심각도** | 높음 (데이터 무결성 문제) |

---

## 2. 로그 분석

### 2.1 성공 케이스 (L1, L2)

```
✅ [Phase 39] Group created: L1 tab: problem page: 17
✅ [Phase 32] Problem added: 문제 L1

✅ [Phase 39] Group created: L2 tab: problem page: 17
✅ [Phase 32] Problem added: 문제 L2
```

### 2.2 실패 케이스 (L3)

```
❌ [Phase 39] Group created: L3 tab: problem page: 17
❌ [Phase 32] Failed to add problem: {
     status: 409,
     detail: "그룹 'L3'는 이미 등록되어 있습니다",
     groupId: 'L3',
     sessionId: 'ws-1764766473947-b04ad950'
   }
```

---

## 3. 원인 분석

### 3.1 그룹 ID 생성 방식

**현재 로직** (`PageViewer.tsx:390-398`):

```typescript
// 그룹 ID 생성 - 현재 페이지의 그룹만 고려
const existingGroups = localGroups.filter((g) => g.column === column);
const maxNumber = existingGroups.reduce((max, g) => {
  const match = g.id.match(/\d+$/);
  if (match) {
    return Math.max(max, parseInt(match[0], 10));
  }
  return max;
}, 0);
const newGroupId = `${column}${maxNumber + 1}`;  // 예: "L1", "L2", "L3"
```

**문제점**:
- 그룹 ID가 **현재 페이지의 그룹만** 고려하여 순차 생성
- 다른 페이지에 이미 `L3`가 존재하면 충돌 발생

### 3.2 시나리오 재현

```
┌─────────────────────────────────────────────────────────────┐
│ 초기 상태: 세션에 7개 문제 등록                              │
│ - 페이지 9: L1, L2, L3, L4, L5, L6, L7 (모두 등록됨)        │
│ - 페이지 17: 그룹 없음                                      │
└─────────────────────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 사용자 액션: 페이지 17에서 새 그룹 생성                      │
│ 1. L1 생성 → 페이지 17에 L1 없음 → ID "L1" 생성             │
│    → 세션 등록 성공 ✅ (새로운 L1)                          │
│                                                             │
│ 2. L2 생성 → 페이지 17에 L1만 있음 → ID "L2" 생성           │
│    → 세션 등록 성공 ✅ (새로운 L2)                          │
│                                                             │
│ 3. L3 생성 → 페이지 17에 L1, L2 있음 → ID "L3" 생성         │
│    → 세션 등록 실패 ❌ (페이지 9의 L3와 충돌!)              │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 데이터 불일치

```
세션 (session.json):
┌──────────────────────────────────────┐
│ problems: [                          │
│   { groupId: "L1", pageIndex: 9 },   │  ← 페이지 9의 L1
│   { groupId: "L2", pageIndex: 9 },   │  ← 페이지 9의 L2
│   { groupId: "L3", pageIndex: 9 },   │  ← 페이지 9의 L3 (충돌 원인!)
│   { groupId: "L4", pageIndex: 9 },   │
│   ...                                │
│ ]                                    │
└──────────────────────────────────────┘

페이지 17 (groups.json):
┌──────────────────────────────────────┐
│ groups: [                            │
│   { id: "L1", ... },                 │  ← 새로 생성 (세션 등록 성공)
│   { id: "L2", ... },                 │  ← 새로 생성 (세션 등록 성공)
│   { id: "L3", ... },                 │  ← 새로 생성 (세션 등록 실패!)
│ ]                                    │
└──────────────────────────────────────┘
```

---

## 4. 근본 원인

### 4.1 설계 결함

| 항목 | 현재 상태 | 문제점 |
|------|----------|--------|
| **그룹 ID 스코프** | 페이지별 로컬 | 세션은 전역 스코프 필요 |
| **ID 생성 방식** | 순차 (L1, L2, L3...) | 다른 페이지와 충돌 가능 |
| **중복 체크** | 현재 페이지만 | 세션 전체 체크 필요 |

### 4.2 영향 범위

- 한 세션에서 여러 페이지에 그룹을 생성할 때 발생
- 같은 컬럼(L, R)에서 ID가 겹치면 충돌
- **L 컬럼 그룹이 많을수록 충돌 확률 증가**

---

## 5. 해결 방안

### 5.1 방안 A: 전역 고유 ID 생성 (권장)

**UUID 또는 타임스탬프 기반 ID**:

```typescript
// PageViewer.tsx handleCreateGroup 수정
const newGroupId = `${column}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
// 결과: "L_1733304789123_a3f2x"
```

**장점**:
- 충돌 가능성 0%
- 페이지/세션 무관하게 고유

**단점**:
- ID가 길어짐
- 기존 데이터와 호환성 고려 필요

### 5.2 방안 B: 페이지 인덱스 포함 ID

```typescript
const newGroupId = `${column}${pageIndex}_${maxNumber + 1}`;
// 결과: "L17_1", "L17_2", "L17_3" (페이지 17의 그룹들)
```

**장점**:
- 페이지별로 고유 보장
- ID에서 페이지 추적 가능

**단점**:
- 기존 데이터 마이그레이션 필요

### 5.3 방안 C: 세션 전체 ID 체크 후 생성

```typescript
// 프론트엔드에서 세션의 모든 groupId 확인 후 생성
const allGroupIds = new Set(currentSession.problems.map(p => p.groupId));
let newNumber = maxNumber + 1;
while (allGroupIds.has(`${column}${newNumber}`)) {
  newNumber++;
}
const newGroupId = `${column}${newNumber}`;
```

**장점**:
- 기존 ID 형식 유지
- 충돌 방지

**단점**:
- 세션 데이터 의존
- 세션이 없으면 작동 안 함

### 5.4 방안 D: 백엔드에서 중복 허용 (Upsert)

```python
# work_sessions.py add_problem 수정
existing = next((p for p in session.problems if p.groupId == request.groupId), None)
if existing:
    # 409 대신 기존 데이터 업데이트
    existing.pageIndex = request.pageIndex
    existing.problemNumber = request.problemNumber
    existing.displayName = request.displayName
    _save_session(session)
    return session
```

**장점**:
- 프론트엔드 수정 불필요
- 즉시 적용 가능

**단점**:
- 의도치 않은 데이터 덮어쓰기 가능

---

## 6. 권장 해결 순서

### 즉시 조치 (5분)

**방안 D 적용** - 백엔드에서 중복 시 업데이트:

```python
# 중복 체크 → 업데이트로 변경
existing = next((p for p in session.problems if p.groupId == request.groupId), None)
if existing:
    # 기존: raise HTTPException(status_code=409, ...)
    # 변경: 업데이트 후 반환
    existing.pageIndex = request.pageIndex
    existing.problemNumber = request.problemNumber
    existing.displayName = request.displayName or f"문제 {request.problemNumber}"
    _save_session(session)
    print(f"[Phase 32] 문제 업데이트: {session_id} - {request.problemNumber}")
    return session
```

### 장기 조치 (Phase 43)

**방안 A 적용** - 전역 고유 ID 생성:

1. `PageViewer.tsx`의 ID 생성 로직 수정
2. 기존 데이터 마이그레이션 스크립트 작성
3. 테스트 및 배포

---

## 7. 테스트 시나리오

### 7.1 충돌 재현

1. 페이지 9에서 L1~L7 그룹 생성 및 등록
2. 페이지 17로 이동
3. 새 그룹 3개 생성 시도
4. 3번째 그룹(L3)에서 409 에러 발생

### 7.2 수정 후 검증

1. 동일 시나리오 실행
2. 3번째 그룹도 성공적으로 등록
3. 세션에 올바른 pageIndex로 저장 확인

---

## 8. 결론

| 항목 | 내용 |
|------|------|
| **에러 원인** | 페이지별 순차 ID가 다른 페이지의 기존 ID와 충돌 |
| **에러 코드** | 409 Conflict |
| **즉시 해결** | 백엔드 upsert 로직으로 변경 |
| **장기 해결** | 전역 고유 ID 생성 방식으로 변경 |
| **수정 파일** | `backend/app/routers/work_sessions.py` |

---

## 9. 추가 발견 (HTML 중첩 경고)

로그에서 다른 문제도 발견됨:

```
In HTML, <button> cannot be a descendant of <button>.
This will cause a hydration error.
```

**위치**: `ProblemListPanel.tsx:295`
**원인**: `<button>` 안에 또 다른 `<button>` 중첩
**해결**: 외부 버튼을 `<div role="button">` 또는 내부 버튼을 `<span onClick>` 으로 변경

---

*작성: Claude Code | 2025-12-04*
