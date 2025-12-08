# Phase 25: 매칭 영구 저장 기능

## 현재 상태 분석

### 문제점
- 매칭 시스템이 **BroadcastChannel**만 사용 (브라우저 창 간 실시간 동기화)
- 서버에 매칭 결과를 **저장하지 않음**
- 창을 닫으면 **매칭 정보 소실**

### 기존 구현
| 구성 요소 | 상태 | 비고 |
|----------|------|------|
| 백엔드 API | O | `POST /api/matching/sessions/{id}/matches` 구현됨 |
| 세션 저장 | O | `dataset_root/matching/session-*.json` |
| 프론트엔드 API 호출 | X | `useAutoMatching`에서 서버 호출 없음 |
| 초기 로드 | X | 기존 매칭 데이터 불러오기 없음 |

---

## 개발 계획

### Phase 25-A: 매칭 생성 시 서버 저장
**목표**: 문제-해설 매칭 시 자동으로 서버에 저장

1. `useAutoMatching.ts` 수정
   - `onSolutionLabeled`에서 매칭 생성 후 `api.addMatch()` 호출
   - 실패 시 토스트로 에러 표시

2. 변경 파일:
   - `frontend/src/hooks/useAutoMatching.ts`

```typescript
// 매칭 생성 후 서버 저장
const onSolutionLabeled = useCallback(async (group: ProblemGroup) => {
  // ... 기존 로직 ...

  // 서버에 저장
  try {
    await api.addMatch(sessionId, {
      problem: oldestPending,
      solution: { groupId: group.id, documentId, pageIndex: currentPage }
    });
  } catch (error) {
    console.error('매칭 저장 실패:', error);
    showToast?.('매칭 저장에 실패했습니다', 'error');
  }
}, [...]);
```

---

### Phase 25-B: 세션 시작 시 기존 매칭 로드
**목표**: 페이지 새로고침/재접속 시 기존 매칭 복원

1. `useAutoMatching.ts`에 초기 로드 로직 추가
   - `useEffect`로 세션 시작 시 `api.getMatchingState()` 호출
   - 기존 `pendingProblems`, `matchedPairs` 복원

2. 변경 파일:
   - `frontend/src/hooks/useAutoMatching.ts`

```typescript
// 세션 시작 시 기존 상태 로드
useEffect(() => {
  if (!sessionId) return;

  const loadState = async () => {
    try {
      const state = await api.getMatchingState(sessionId);
      if (state.exists) {
        setPendingProblems(state.pendingProblems);
        setMatchedPairs(state.matchedPairs);
      }
    } catch (error) {
      console.error('세션 상태 로드 실패:', error);
    }
  };

  loadState();
}, [sessionId]);
```

---

### Phase 25-C: 매칭 취소 시 서버 반영
**목표**: 매칭 취소도 서버에 반영

1. `cancelMatch` 함수에서 `api.removeMatch()` 호출
2. 변경 파일:
   - `frontend/src/hooks/useAutoMatching.ts`

```typescript
const cancelMatch = useCallback(async (matchId: string) => {
  // ... 기존 로컬 상태 업데이트 ...

  // 서버에서 삭제
  try {
    await api.removeMatch(sessionId, matchId);
  } catch (error) {
    console.error('매칭 취소 실패:', error);
    showToast?.('매칭 취소에 실패했습니다', 'error');
  }
}, [...]);
```

---

### Phase 25-D: 대기 문제 서버 동기화
**목표**: 대기 중인 문제도 서버에 저장 (창 닫아도 유지)

1. `onProblemLabeled`에서 `api.addPending()` 호출
2. 변경 파일:
   - `frontend/src/hooks/useAutoMatching.ts`

```typescript
const onProblemLabeled = useCallback(async (group: ProblemGroup) => {
  // ... 기존 로직 ...

  // 서버에 저장
  try {
    await api.addPending(sessionId, pending);
  } catch (error) {
    console.error('대기 문제 저장 실패:', error);
  }
}, [...]);
```

---

## 구현 순서

| 단계 | 내용 | 예상 작업량 |
|-----|------|-----------|
| 25-A | 매칭 생성 시 서버 저장 | 소 |
| 25-B | 세션 시작 시 기존 매칭 로드 | 소 |
| 25-C | 매칭 취소 시 서버 반영 | 소 |
| 25-D | 대기 문제 서버 동기화 | 소 |

---

## 기대 효과

1. **영구 저장**: 창을 닫아도 매칭 정보 유지
2. **문제은행 연동**: Phase 24-C의 해설 뱃지가 실제로 표시됨
3. **세션 재개**: 중단된 매칭 작업 이어서 가능
4. **다중 기기**: 서버 기반이므로 다른 기기에서도 접근 가능

---

## 테스트 시나리오

1. 문제 창에서 문제 라벨링 → 서버에 pending 저장 확인
2. 해설 창에서 해설 라벨링 → 서버에 match 저장 확인
3. 브라우저 새로고침 → 기존 매칭 복원 확인
4. 문제은행에서 해설 뱃지 표시 확인
5. 매칭 취소 → 서버에서 삭제 확인

---

*작성일: 2025-12-02*
