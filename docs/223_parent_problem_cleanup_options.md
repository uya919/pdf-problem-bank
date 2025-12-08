# 모문제 정리 방안 분석 리포트

**문서 번호**: 223
**작성일**: 2025-12-07
**관련**: Phase 56-M (모문제 미연결 목록 제외)

---

## 1. 현재 문제

### 1.1 증상
```
미연결 문제 목록에 "(모문제)번" 항목들이 여전히 표시됨
- Phase 56-M에서 필터링 로직 추가했으나
- 기존 세션 데이터에는 isParent 필드가 없음
```

### 1.2 원인
```
groups.json                    session.problems
┌─────────────────────┐        ┌─────────────────────┐
│ isParent: true ✅   │   →    │ isParent: ??? ❌    │
│ (새로 생성된 그룹)   │        │ (기존 데이터 동기화  │
└─────────────────────┘        │  안됨)              │
                               └─────────────────────┘
```

---

## 2. 해결 방안 비교

| 방안 | 설명 | 난이도 | 효과 | 사용성 |
|------|------|--------|------|--------|
| A | 세션 리셋 버튼 | 쉬움 | 100% | 데이터 손실 |
| B | 강제 재동기화 버튼 | 보통 | 100% | ⭐ 추천 |
| C | 개별 삭제 버튼 | 보통 | 수동 | 번거로움 |
| D | 일괄 정리 버튼 | 보통 | 100% | ⭐ 추천 |
| E | 자동 백그라운드 정리 | 어려움 | 100% | 최상 |

---

## 3. 방안 상세

### 방안 A: 세션 리셋 버튼

**설명**: 세션의 problems 배열을 비우고 처음부터 다시 동기화

```typescript
// 이미 구현됨: POST /api/work-sessions/{id}/reset
const handleResetSession = async () => {
  await api.resetSession(sessionId);
  // problems: [] 로 초기화
  // 다음 페이지 이동 시 재동기화
};
```

**장점**: 간단, 이미 API 있음
**단점**: links(해설 연결)도 삭제됨 → 데이터 손실

---

### 방안 B: 강제 재동기화 버튼 ⭐

**설명**: 기존 데이터 유지하면서 isParent만 업데이트

```typescript
// 새 API 필요: POST /api/work-sessions/{id}/refresh-parent-flags
const handleRefreshParentFlags = async () => {
  // 1. 모든 groups.json에서 isParent 읽기
  // 2. session.problems의 isParent 업데이트
  // 3. links는 유지
};
```

**UI 위치**: 사이드바 상단 "미연결 문제" 옆에 새로고침 아이콘

```
┌─────────────────────────┐
│ 미연결 문제    114  🔄  │  ← 클릭 시 재동기화
├─────────────────────────┤
```

**장점**: 데이터 손실 없음, 명확한 사용자 액션
**단점**: 새 API 개발 필요

---

### 방안 C: 개별 삭제 버튼

**설명**: 각 항목 옆에 X 버튼으로 개별 제거

```
┌─────────────────────────┐
│ ○ (모문제)번        ✕  │  ← X 클릭 시 목록에서 제거
│ ○ (모문제)번        ✕  │
│ ○ 베이직쎈·11p·1번     │
└─────────────────────────┘
```

**구현**:
```typescript
// session.problems에서 해당 항목 제거
const handleRemoveFromList = (groupId: string) => {
  removeProblem(sessionId, groupId);
};
```

**장점**: 세밀한 제어 가능
**단점**: 114개 항목 수동 클릭 필요 → 비현실적

---

### 방안 D: 일괄 정리 버튼 ⭐

**설명**: "(모문제)번" 패턴 항목을 한번에 제거

```typescript
// 새 API: POST /api/work-sessions/{id}/cleanup-parents
const handleCleanupParents = async () => {
  // 1. problems에서 displayName이 "(모문제)번"인 항목 찾기
  // 2. 해당 항목들 일괄 제거
  // 3. 또는 groups.json에서 isParent 확인 후 제거
};
```

**UI**: 컨텍스트 메뉴 또는 설정

```
┌─────────────────────────────┐
│ 미연결 문제    114          │
│ ┌─────────────────────────┐ │
│ │ 🧹 모문제 정리하기      │ │  ← 클릭 시 일괄 제거
│ └─────────────────────────┘ │
├─────────────────────────────┤
```

**장점**: 한 번의 클릭으로 해결
**단점**: displayName 패턴 의존 (부정확할 수 있음)

---

### 방안 E: 자동 백그라운드 정리

**설명**: 세션 로드 시 자동으로 isParent 동기화

```typescript
// workSessionStore.ts - loadSession 수정
const loadSession = async (sessionId: string) => {
  const session = await api.getSession(sessionId);

  // Phase 56-M: 자동으로 isParent 동기화
  await api.syncParentFlags(sessionId);

  return session;
};
```

**장점**: 사용자 개입 불필요, 최상의 UX
**단점**: 구현 복잡, 성능 영향 가능

---

## 4. 추천 구현 순서

### 즉시 적용 (5분)
**방안 D 간소화**: Frontend에서 필터링 강화

```typescript
// workSessionStore.ts
getUnlinkedProblems: () => {
  return currentSession.problems.filter((p) =>
    !linkedIds.has(p.groupId) &&
    !p.isParent &&
    !p.displayName?.includes('(모문제)')  // 추가 필터
  );
},
```

### 단기 적용 (30분)
**방안 B**: 재동기화 버튼 추가

1. Backend API: `POST /work-sessions/{id}/sync-parent-flags`
2. Frontend 버튼: 사이드바에 🔄 아이콘

### 중기 적용 (1시간)
**방안 E**: 자동 동기화

세션 로드 시 백그라운드에서 isParent 동기화

---

## 5. 즉시 적용 코드 (방안 D 간소화)

```typescript
// workSessionStore.ts 수정
getUnlinkedProblems: () => {
  const { currentSession } = get();
  if (!currentSession) return [];
  const linkedIds = new Set(currentSession.links.map((l) => l.problemGroupId));
  return currentSession.problems.filter((p) =>
    !linkedIds.has(p.groupId) &&
    !p.isParent &&
    // Phase 56-M Fix: displayName 패턴으로 추가 필터링
    !p.displayName?.includes('(모문제)') &&
    !p.problemNumber?.includes('모문제')
  );
},
```

---

## 6. 권장 사항

### 즉시
1. **displayName 패턴 필터링** 추가 (5분)
   - "(모문제)" 포함 항목 제외

### 단기
2. **재동기화 버튼** 추가 (30분)
   - 사이드바에 🔄 아이콘
   - 클릭 시 isParent 필드 갱신

### 장기
3. **자동 동기화** 구현 (1시간)
   - 세션 로드 시 백그라운드 동기화

---

## 7. 결론

| 시간 | 방안 | 효과 |
|------|------|------|
| 즉시 (5분) | displayName 패턴 필터링 | 화면에서 숨김 |
| 단기 (30분) | 재동기화 버튼 | 데이터 정리 |
| 장기 (1시간) | 자동 동기화 | 완벽한 UX |

---

*즉시 적용: "displayName 필터링 추가해줘"*
*단기 적용: "재동기화 버튼 추가해줘"*
