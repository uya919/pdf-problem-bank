# Phase 36: 문제-해설 연결 로직 수정 계획

**작성일**: 2025-12-03
**근거 문서**: [89_phase36_problem_solution_link_research.md](89_phase36_problem_solution_link_research.md)

---

## 1. 목표

### 해결할 문제
```
문제 탭에서 그룹 생성 → 해설 탭 전환 → 미연결 문제 바가 비어있음 ❌
```

### 기대 결과
```
문제 탭에서 그룹 생성 → 해설 탭 전환 → 미연결 문제 바에 문제 표시 ✅
```

---

## 2. 단계별 개발 계획

### Step 1: UnifiedWorkPage.tsx 현재 코드 확인

**파일**: `frontend/src/pages/UnifiedWorkPage.tsx`

**확인 사항**:
1. `setActiveTab` 사용 위치 확인
2. `syncProblems` 함수 가져오기 확인
3. 탭 버튼 클릭 핸들러 확인

**예상 시간**: 3분

---

### Step 2: 탭 전환 핸들러 함수 생성

**파일**: `frontend/src/pages/UnifiedWorkPage.tsx`

**추가 코드**:
```typescript
// Phase 36: 동기화 중 상태
const [isSyncing, setIsSyncing] = useState(false);

// Phase 36: 탭 전환 핸들러 (해설 탭 전환 시 동기화)
const handleTabChange = useCallback(async (tab: 'problem' | 'solution') => {
  // 문제 탭 → 해설 탭 전환 시 동기화
  if (tab === 'solution' && activeTab === 'problem') {
    setIsSyncing(true);
    try {
      await syncProblems();
      console.log('[Phase 36] Problems synced before switching to solution tab');
    } catch (error) {
      console.warn('[Phase 36] Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  }
  setActiveTab(tab);
}, [activeTab, setActiveTab, syncProblems]);
```

**예상 시간**: 5분

---

### Step 3: 탭 버튼 onClick 수정

**파일**: `frontend/src/pages/UnifiedWorkPage.tsx`

**변경 전**:
```typescript
<button
  onClick={() => setActiveTab('problem')}
  ...
>
  문제 ({currentSession.problems.length})
</button>

<button
  onClick={() => setActiveTab('solution')}
  ...
>
  해설
</button>
```

**변경 후**:
```typescript
<button
  onClick={() => handleTabChange('problem')}
  disabled={isSyncing}
  ...
>
  문제 ({currentSession.problems.length})
</button>

<button
  onClick={() => handleTabChange('solution')}
  disabled={isSyncing}
  ...
>
  {isSyncing ? '동기화 중...' : '해설'}
</button>
```

**예상 시간**: 5분

---

### Step 4: 키보드 단축키 핸들러 수정

**파일**: `frontend/src/pages/UnifiedWorkPage.tsx`

**변경 전**:
```typescript
case '1':
  setActiveTab('problem');
  break;
case '2':
  setActiveTab('solution');
  break;
case 'Tab':
  if (!e.shiftKey) {
    e.preventDefault();
    setActiveTab(activeTab === 'problem' ? 'solution' : 'problem');
  }
  break;
```

**변경 후**:
```typescript
case '1':
  handleTabChange('problem');
  break;
case '2':
  handleTabChange('solution');
  break;
case 'Tab':
  if (!e.shiftKey) {
    e.preventDefault();
    handleTabChange(activeTab === 'problem' ? 'solution' : 'problem');
  }
  break;
```

**예상 시간**: 3분

---

### Step 5: useState import 확인

**파일**: `frontend/src/pages/UnifiedWorkPage.tsx`

**확인**:
```typescript
import { useEffect, useCallback, useState } from 'react';
```

`useState`가 없으면 추가

**예상 시간**: 1분

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

#### 7.1 기본 시나리오
1. 세션 시작 → 문제 탭
2. 블록 선택 → G 키 → 그룹 생성 (1번 문제)
3. 블록 선택 → G 키 → 그룹 생성 (2번 문제)
4. 해설 탭(2번 키) 클릭
5. ✅ 하단 미연결 바에 "1번" "2번" 표시되어야 함

#### 7.2 동기화 로딩 표시
1. 문제 탭에서 그룹 생성
2. 해설 탭 클릭
3. ✅ "동기화 중..." 텍스트가 잠시 표시되어야 함

#### 7.3 키보드 단축키
1. 문제 탭에서 그룹 생성
2. `2` 키 또는 `Tab` 키로 해설 탭 전환
3. ✅ 미연결 문제가 표시되어야 함

#### 7.4 빠른 연속 전환
1. 문제 탭에서 그룹 생성
2. 해설 탭 → 문제 탭 → 해설 탭 (빠르게)
3. ✅ 오류 없이 정상 동작해야 함

**예상 시간**: 10분

---

## 3. 체크리스트

```
[ ] Step 1: UnifiedWorkPage.tsx 현재 코드 확인
[ ] Step 2: handleTabChange 함수 및 isSyncing 상태 추가
[ ] Step 3: 탭 버튼 onClick 수정
[ ] Step 4: 키보드 단축키 핸들러 수정
[ ] Step 5: useState import 확인
[ ] Step 6: TypeScript 컴파일 확인
[ ] Step 7: 브라우저 테스트
    [ ] 7.1 기본 시나리오
    [ ] 7.2 동기화 로딩 표시
    [ ] 7.3 키보드 단축키
    [ ] 7.4 빠른 연속 전환
```

---

## 4. 예상 총 소요 시간

| 단계 | 시간 |
|------|------|
| Step 1 | 3분 |
| Step 2 | 5분 |
| Step 3 | 5분 |
| Step 4 | 3분 |
| Step 5 | 1분 |
| Step 6 | 2분 |
| Step 7 | 10분 |
| **합계** | **29분** |

---

## 5. 수정 파일 요약

| 파일 | 수정 내용 |
|------|----------|
| `frontend/src/pages/UnifiedWorkPage.tsx` | handleTabChange 함수 추가, 탭 버튼/키보드 핸들러 수정 |

---

## 6. 롤백 계획

수정 후 문제 발생 시:

### 옵션 A: 동기화 비활성화
```typescript
const handleTabChange = useCallback((tab: 'problem' | 'solution') => {
  // syncProblems 호출 주석 처리
  setActiveTab(tab);
}, [setActiveTab]);
```

### 옵션 B: 원래 코드로 복원
`setActiveTab`을 직접 사용하는 방식으로 복원

---

## 7. 향후 개선 (선택)

### Phase 36-B: Optimistic UI
그룹 생성 시 즉시 로컬 상태에 문제 추가 → 백그라운드 서버 동기화

```typescript
// workSessionStore.ts
addProblemOptimistic: (problem) => {
  set((state) => ({
    currentSession: {
      ...state.currentSession,
      problems: [...state.currentSession.problems, problem]
    }
  }));
};
```

### Phase 36-C: 그룹 생성 시 자동 동기화
PageViewer에서 그룹 생성 후 syncProblems 호출

---

*승인 시 "진행해줘"로 실행*
