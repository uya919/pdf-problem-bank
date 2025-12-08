# Phase 35: 스마트 세션 재개 기능 개발 계획

**작성일**: 2025-12-03
**근거**: 사용자 제안 - "최근사용에 한번 시작했던것은 재개로 바꾸기"

---

## 1. 기능 개요

### 현재 동작
```
문서 선택 → "새 작업 시작" → 항상 새 세션 생성
```

### 목표 동작
```
문서 선택 → 활성 세션 확인 →
  ├─ 있음: "재개" → 기존 세션으로 이동
  └─ 없음: "새 작업 시작" → 새 세션 생성
```

---

## 2. 현재 인프라 분석

### 이미 준비된 것 ✅

| 영역 | 상태 | 위치 |
|------|------|------|
| 백엔드 API | ✅ 완성 | `GET /api/work-sessions/by-document/{document_id}` |
| 스토어 메서드 | ✅ 완성 | `findSessionByDocument()` - 활성 세션만 반환 |
| API 클라이언트 | ✅ 완성 | `api.findSessionsByDocument()` |

### 수정 필요 ❌

| 파일 | 변경 내용 |
|------|----------|
| `HeroSection.tsx` | `handleStartSession` 로직 수정 |
| `QuickStartCard.tsx` | 버튼 텍스트 동적화 (선택) |

---

## 3. 단계별 개발 계획

### Step 1: HeroSection.tsx 분석

**파일**: `frontend/src/components/main/HeroSection.tsx`

**확인 사항**:
1. `handleStartSession` 함수 위치 및 로직
2. `findSessionByDocument` 사용 가능 여부
3. `navigate` 함수 접근 방식

**예상 시간**: 5분

---

### Step 2: handleStartSession 로직 수정

**파일**: `frontend/src/components/main/HeroSection.tsx`

**변경 전**:
```typescript
const handleStartSession = async (combo: DocumentCombo) => {
  // 유효성 검증...

  // 새 세션 생성
  const session = await createSession({
    problemDocumentId: combo.problemDocId,
    solutionDocumentId: combo.solutionDocId,
    ...
  });

  navigate(`/work/${session.sessionId}`);
};
```

**변경 후**:
```typescript
const handleStartSession = async (combo: DocumentCombo) => {
  // 유효성 검증...

  // Phase 35: 기존 활성 세션 확인
  const existingSession = await findSessionByDocument(combo.problemDocId);

  if (existingSession) {
    // 기존 세션 재개
    console.log('[Phase 35] Resuming existing session:', existingSession.sessionId);
    navigate(`/work/${existingSession.sessionId}`);

    // 최근 사용 업데이트
    addRecentUsed({
      problemDocId: combo.problemDocId,
      problemDocName: combo.problemDocName,
      solutionDocId: combo.solutionDocId,
      solutionDocName: combo.solutionDocName,
    });
    return;
  }

  // 새 세션 생성 (기존 로직)
  console.log('[Phase 35] Creating new session');
  const session = await createSession({
    problemDocumentId: combo.problemDocId,
    solutionDocumentId: combo.solutionDocId,
    ...
  });

  navigate(`/work/${session.sessionId}`);
};
```

**예상 시간**: 10분

---

### Step 3: 로딩 상태 추가 (선택)

**파일**: `frontend/src/components/main/HeroSection.tsx`

**작업 내용**:
세션 확인 중 버튼 비활성화 및 로딩 표시

```typescript
const [isCheckingSession, setIsCheckingSession] = useState(false);

const handleStartSession = async (combo: DocumentCombo) => {
  setIsCheckingSession(true);
  try {
    const existingSession = await findSessionByDocument(combo.problemDocId);
    // ... 이하 동일
  } finally {
    setIsCheckingSession(false);
  }
};

// 버튼에 적용
<Button disabled={isCheckingSession || sessionLoading}>
  {isCheckingSession ? '확인 중...' : '작업 시작'}
</Button>
```

**예상 시간**: 5분

---

### Step 4: 토스트 메시지 차별화 (선택)

**파일**: `frontend/src/components/main/HeroSection.tsx`

**작업 내용**:
재개 vs 새 시작 시 다른 메시지 표시

```typescript
if (existingSession) {
  showToast('이전 작업을 이어서 진행합니다', 'info');
  navigate(`/work/${existingSession.sessionId}`);
} else {
  showToast('새 작업을 시작합니다', 'success');
  // 새 세션 생성...
}
```

**예상 시간**: 3분

---

### Step 5: TypeScript 컴파일 확인

**명령어**:
```bash
cd frontend
npx tsc --noEmit
```

**예상 결과**: 에러 없음

**예상 시간**: 2분

---

### Step 6: 브라우저 테스트

**테스트 시나리오**:

#### 6.1 새 문서 → 새 세션
1. 한 번도 사용하지 않은 문서 선택
2. "작업 시작" 클릭
3. ✅ 새 세션 생성되고 작업 페이지로 이동

#### 6.2 기존 문서 → 재개
1. 이미 세션이 있는 문서 선택
2. "작업 시작" 클릭
3. ✅ 기존 세션으로 이동 (새 세션 생성 안됨)

#### 6.3 완료된 세션 → 새 세션
1. 세션이 완료(completed) 상태인 문서 선택
2. "작업 시작" 클릭
3. ✅ 새 세션 생성 (완료된 세션은 재개 대상 아님)

#### 6.4 빠른 더블클릭
1. 문서 선택 후 빠르게 2번 클릭
2. ✅ 한 번만 처리됨 (로딩 상태로 방지)

**예상 시간**: 10분

---

## 4. 체크리스트

```
[ ] Step 1: HeroSection.tsx 분석
[ ] Step 2: handleStartSession 로직 수정
[ ] Step 3: 로딩 상태 추가 (선택)
[ ] Step 4: 토스트 메시지 차별화 (선택)
[ ] Step 5: TypeScript 컴파일 확인
[ ] Step 6: 브라우저 테스트
    [ ] 6.1 새 문서 → 새 세션
    [ ] 6.2 기존 문서 → 재개
    [ ] 6.3 완료된 세션 → 새 세션
    [ ] 6.4 빠른 더블클릭
```

---

## 5. 예상 총 소요 시간

| 단계 | 시간 |
|------|------|
| Step 1 | 5분 |
| Step 2 | 10분 |
| Step 3 | 5분 (선택) |
| Step 4 | 3분 (선택) |
| Step 5 | 2분 |
| Step 6 | 10분 |
| **합계** | **27분** (선택 포함: 35분) |

---

## 6. 수정 파일 요약

| 파일 | 수정 내용 | 필수 여부 |
|------|----------|----------|
| `frontend/src/components/main/HeroSection.tsx` | 세션 확인 로직 추가 | ✅ 필수 |

---

## 7. 엣지 케이스 처리

### 7.1 해설 문서가 다른 경우

**시나리오**:
```
기존 세션: 문제A + 해설A
새로 선택: 문제A + 해설B
```

**처리 방안**:
- 현재 `findSessionByDocument`는 `problemDocumentId`만 확인
- 해설 문서가 달라도 같은 문제 문서면 기존 세션 재개
- **이유**: 문제 라벨링 작업은 문제 문서 기준이므로 합리적

### 7.2 여러 활성 세션이 있는 경우

**시나리오**:
```
문서A → 세션1 (어제 생성)
문서A → 세션2 (오늘 생성)
```

**처리 방안**:
- `findSessionByDocument`는 **가장 최근 세션** 반환 (updatedAt 정렬)
- 사용자는 "마지막에 했던 작업" 재개 → 자연스러운 UX

### 7.3 세션 확인 실패 시

**시나리오**:
- 네트워크 오류로 세션 확인 실패

**처리 방안**:
```typescript
try {
  const existingSession = await findSessionByDocument(combo.problemDocId);
  // ...
} catch (error) {
  console.warn('[Phase 35] Session check failed, creating new:', error);
  // 새 세션 생성으로 폴백
}
```

---

## 8. 향후 확장 가능성

### Phase 35-B: QuickStartCard 버튼 동적화 (선택)

**현재**:
```
QuickStartCard: 항상 "작업 시작" 버튼
```

**확장**:
```
QuickStartCard:
  - 세션 없음: "작업 시작"
  - 세션 있음: "재개" (다른 색상/아이콘)
```

**구현 방법**:
1. `useEffect`로 문서별 세션 존재 여부 미리 확인
2. 버튼 텍스트/스타일 조건부 렌더링
3. **주의**: 여러 카드가 있으면 API 호출 다수 발생 → 배치 API 필요

### Phase 35-C: 세션 선택 모달 (고급)

**시나리오**:
여러 활성 세션이 있을 때 사용자가 선택

**UI**:
```
┌─────────────────────────────────────┐
│  기존 작업이 있습니다               │
├─────────────────────────────────────┤
│  ○ 세션1: 3일 전, 15/30 완료       │
│  ○ 세션2: 오늘, 5/30 완료          │
│  ○ 새로 시작                        │
├─────────────────────────────────────┤
│            [선택]  [취소]           │
└─────────────────────────────────────┘
```

---

## 9. 롤백 계획

수정 후 문제 발생 시:

### 옵션 A: 세션 확인 비활성화
```typescript
const handleStartSession = async (combo: DocumentCombo) => {
  // Phase 35 비활성화: 항상 새 세션 생성
  const ENABLE_SMART_RESUME = false;  // 플래그로 제어

  if (ENABLE_SMART_RESUME) {
    const existingSession = await findSessionByDocument(combo.problemDocId);
    if (existingSession) {
      navigate(`/work/${existingSession.sessionId}`);
      return;
    }
  }

  // 새 세션 생성
  const session = await createSession({...});
  navigate(`/work/${session.sessionId}`);
};
```

### 옵션 B: 변경 사항 되돌리기
Git으로 HeroSection.tsx 복원

---

## 10. 의존성 확인

### 필수 조건
- ✅ `findSessionByDocument` 메서드 존재 (workSessionStore.ts)
- ✅ 백엔드 API 작동 (work_sessions.py)
- ✅ `navigate` 함수 사용 가능 (react-router-dom)

### 확인 필요
```typescript
// workSessionStore.ts에서 findSessionByDocument 확인
findSessionByDocument: async (documentId) => {
  const response = await api.findSessionsByDocument(documentId);
  const activeSession = response.items.find((s) => s.status === 'active');
  return activeSession || null;
}
```

---

*승인 시 "진행해줘"로 실행*
