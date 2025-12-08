# 해설 삭제 시 자동 연결 해제 기능 분석 리포트

**문서 번호**: 225
**작성일**: 2025-12-07
**요청**: 우측 사이드바에서 해설 삭제 시 미연결 문제로 돌아오는 기능

---

## 1. 현재 동작 분석

### 1.1 연결 데이터 구조
```typescript
// session.links 배열
interface ProblemSolutionLink {
  problemGroupId: string;      // 문제 그룹 ID (키)
  solutionGroupId: string;     // 해설 그룹 ID
  solutionDocumentId: string;  // 해설 문서 ID
  solutionPageIndex: number;   // 해설 페이지
}
```

**핵심**: 연결은 `problemGroupId` 기준으로 관리됨

### 1.2 현재 삭제 흐름

#### 문제 탭에서 그룹 삭제 시
```
그룹 삭제 → removeProblem() 호출 → 세션에서 문제 제거
```

#### 해설 탭에서 그룹 삭제 시 (현재)
```
그룹 삭제 → (아무 처리 없음) → 고아 링크 발생 가능
```

### 1.3 코드 위치
```typescript
// UnifiedWorkPage.tsx:178-190
const handleGroupDeleted = useCallback(async (groupId: string, pageIndex: number) => {
  if (activeTab === 'problem') {
    await removeProblem(groupId);
    showToast('문제가 삭제되었습니다', 'info');
  }
  // 해설 탭에서 삭제 시: 연결만 끊어지면 되는데,
  // 이미 연결이 문제 기준이므로 추가 처리 불필요 ← 현재 주석
}, [activeTab, removeProblem, showToast]);
```

---

## 2. 요청 기능 분석

### 2.1 기능 정의
> "해설 그룹 삭제 시 해당 해설과 연결된 문제를 자동으로 미연결 상태로 되돌림"

### 2.2 동작 시나리오
```
1. 문제 A가 해설 X와 연결됨
2. 해설 탭에서 해설 X 그룹 삭제
3. 자동으로 문제 A의 연결 해제
4. 문제 A가 미연결 목록에 다시 표시
5. (선택) 문제 A 자동 선택
```

---

## 3. 구현 가능성: ✅ 가능

### 3.1 필요한 변경사항

| 위치 | 변경 내용 | 난이도 |
|------|----------|--------|
| UnifiedWorkPage.tsx | handleGroupDeleted에 해설 탭 처리 추가 | 쉬움 |
| workSessionStore.ts | removeLinkBySolutionGroupId 액션 추가 | 쉬움 |
| work_sessions.py | DELETE 엔드포인트 수정 (선택) | 보통 |

### 3.2 구현 코드 (프론트엔드)

#### Option A: 프론트엔드에서 처리
```typescript
// UnifiedWorkPage.tsx - handleGroupDeleted 수정
const handleGroupDeleted = useCallback(async (groupId: string, pageIndex: number) => {
  console.log('[Phase 39] Group deleted:', groupId, 'page:', pageIndex);

  if (activeTab === 'problem') {
    try {
      await removeProblem(groupId);
      showToast('문제가 삭제되었습니다', 'info');
    } catch (error) {
      console.error('[Phase 39] Failed to remove problem:', error);
    }
  } else if (activeTab === 'solution') {
    // Phase 56-R: 해설 삭제 시 연결 자동 해제
    try {
      const unlinkedProblem = await removeLinkBySolutionGroupId(groupId);
      if (unlinkedProblem) {
        showToast(`${unlinkedProblem.problemNumber}번 연결이 해제되었습니다`, 'info');
        // 선택: 해당 문제 자동 선택
        selectProblem(unlinkedProblem.problemGroupId);
      }
    } catch (error) {
      console.error('[Phase 56-R] Failed to unlink:', error);
    }
  }
}, [activeTab, removeProblem, removeLinkBySolutionGroupId, selectProblem, showToast]);
```

#### 새로운 스토어 액션
```typescript
// workSessionStore.ts
removeLinkBySolutionGroupId: async (solutionGroupId: string) => {
  const { currentSession } = get();
  if (!currentSession) return null;

  // 해설 그룹 ID로 연결 찾기
  const link = currentSession.links.find(l => l.solutionGroupId === solutionGroupId);
  if (!link) return null;

  // 연결 삭제
  await api.deleteSessionLink(currentSession.sessionId, link.problemGroupId);

  // 세션 갱신
  const updated = await api.getWorkSession(currentSession.sessionId);
  set({ currentSession: updated });

  // 연결 해제된 문제 정보 반환
  const problem = currentSession.problems.find(p => p.groupId === link.problemGroupId);
  return problem ? { problemGroupId: link.problemGroupId, problemNumber: problem.problemNumber } : null;
},
```

---

## 4. 우려되는 점

### 4.1 데이터 정합성 문제 ⚠️

| 문제 | 설명 | 심각도 |
|------|------|--------|
| **고아 링크** | 해설 그룹이 삭제되었지만 links에 참조 남음 | 중간 |
| **중복 연결** | 하나의 해설이 여러 문제와 연결될 경우 모두 해제해야 함 | 낮음 |
| **동기화 지연** | groups.json과 session.json 간 불일치 발생 가능 | 낮음 |

#### 고아 링크 시나리오
```
현재:
┌─────────────┐    ┌─────────────┐
│ Problem A   │───►│ Solution X  │  (링크 존재)
└─────────────┘    └─────────────┘
                          ↓
                   그룹 삭제 (groups.json에서)
                          ↓
┌─────────────┐    ┌─────────────┐
│ Problem A   │───►│ Solution X  │  (링크는 여전히 존재!)
└─────────────┘    └─────────────┘
                   (실제 그룹 없음)
```

### 4.2 UX 혼란 가능성 ⚠️

| 상황 | 우려 |
|------|------|
| 실수로 삭제 | 연결까지 날아가면 복구 어려움 |
| 삭제 확인 필요 | "연결된 문제가 있습니다. 삭제하시겠습니까?" |
| 자동 선택 | 갑자기 다른 문제로 이동하면 혼란 |

### 4.3 1:N 연결 가능성 검토

현재 데이터 모델상 **1개 문제 = 1개 해설** 구조지만,
**1개 해설 = N개 문제**인 경우:

```
문제 1번 → 해설 A
문제 2번 → 해설 A  (동일 해설)
문제 3번 → 해설 A

해설 A 삭제 시 → 1, 2, 3번 모두 연결 해제?
```

**확인 필요**: 현재 시스템에서 동일 해설을 여러 문제에 연결 가능한가?

### 4.4 성능 고려사항

```
해설 삭제 시 필요한 작업:
1. groups.json에서 그룹 삭제 (기존)
2. session.links 검색 (solutionGroupId로)
3. 일치하는 링크 삭제 (API 호출)
4. 세션 갱신

추가 API 호출 1-2회 발생
```

---

## 5. 권장 구현 방안

### 5.1 단계적 접근

#### Phase 56-R-1: 연결 자동 해제 (기본)
- 해설 삭제 시 해당 연결만 해제
- Toast로 알림

#### Phase 56-R-2: 삭제 확인 다이얼로그 (선택)
```
┌────────────────────────────────────┐
│  연결된 문제가 있습니다            │
│                                    │
│  이 해설은 "베이직쎈 11p 4번"과    │
│  연결되어 있습니다.                │
│                                    │
│  삭제하면 연결이 해제됩니다.       │
│                                    │
│         [취소]  [삭제]             │
└────────────────────────────────────┘
```

#### Phase 56-R-3: 자동 선택 (선택)
- 연결 해제된 문제 자동 선택
- 빠른 재연결 가능

### 5.2 추천 우선순위

| 우선순위 | 기능 | 이유 |
|---------|------|------|
| 1 | 연결 자동 해제 | 데이터 정합성 필수 |
| 2 | 삭제 확인 다이얼로그 | 실수 방지 |
| 3 | 자동 선택 | UX 개선 |

---

## 6. 예상 작업 시간

| 단계 | 내용 | 예상 시간 |
|------|------|----------|
| 56-R-1 | removeLinkBySolutionGroupId 액션 추가 | 15분 |
| 56-R-2 | handleGroupDeleted 수정 | 10분 |
| 56-R-3 | 삭제 확인 다이얼로그 (선택) | 20분 |
| 56-R-4 | 테스트 및 검증 | 10분 |

**총 예상**: 35분 (기본) ~ 55분 (다이얼로그 포함)

---

## 7. 결론

### 구현 가능성
✅ **가능** - 구조적으로 어렵지 않음

### 주요 우려점
1. **고아 링크 발생 가능** - 반드시 처리 필요
2. **실수 삭제 복구 어려움** - 확인 다이얼로그 권장
3. **1:N 연결 시 일괄 해제** - 현재 모델 확인 필요

### 권장 사항
```
기본 구현: 연결 자동 해제 + Toast 알림
선택 구현: 삭제 확인 다이얼로그
```

---

## 8. 다음 단계

**구현 요청**: `Phase 56-R 진행해줘`

**옵션 선택**:
- A: 기본 구현만 (연결 자동 해제)
- B: 기본 + 삭제 확인 다이얼로그
- C: 전체 구현 (자동 선택 포함)

---

*작성: Claude Code*
