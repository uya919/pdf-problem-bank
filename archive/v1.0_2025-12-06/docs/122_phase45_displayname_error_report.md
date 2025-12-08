# Phase 45 displayName 미적용 에러 분석 리포트

**작성일**: 2025-12-04
**심각도**: Medium
**상태**: 분석 완료, 수정 필요

---

## 1. 증상

좌측 사이드바에서 문제 목록이 여전히 **"문제 L1번", "문제 L2번"** 형식으로 표시됨.

### 기대 동작
```
┌─────────────────────────────┐
│ ○ 베이직쎈 · 10p · 3번     │
│ ○ 베이직쎈 · 10p · 4번     │
└─────────────────────────────┘
```

### 실제 동작
```
┌──────────────────┐
│ ○ 문제 L1번     │
│ ○ 문제 L2번     │
└──────────────────┘
```

---

## 2. 근본 원인 분석

### 2.1 데이터 흐름 추적

```
문제 생성 → displayName 설정 → DB 저장 → API 응답 → 프론트엔드 파싱 → UI 표시
     ↑
   문제 발생 지점
```

### 2.2 핵심 원인: `addProblemToSession`에서 displayName 미제공

**파일**: `backend/app/routers/work_sessions.py`, Line 262

```python
# 현재 코드
displayName=request.displayName or f"문제 {request.problemNumber}"
```

**문제점**:
- 프론트엔드에서 `addProblem()` 호출 시 `displayName`을 전달하지 않음
- 백엔드가 **"문제 L1"** 형식으로 기본값 생성
- 이 형식은 파서가 인식할 수 없음

### 2.3 파서 동작 분석

**파일**: `frontend/src/utils/problemDisplayUtils.ts`, Line 31

```typescript
export function parseProblemDisplayName(displayName: string | undefined): ParsedProblemInfo | null {
  if (!displayName) return null;

  const parts = displayName.split('_');

  // 최소 3개 파트 필요: 책이름_p페이지_번호
  if (parts.length < 3) return null;  // ← "문제 L1"은 1개 파트 → null 반환!

  // ...
}
```

**입력**: `"문제 L1"` (displayName)
**split('_') 결과**: `["문제 L1"]` (1개 파트)
**조건 검사**: `parts.length < 3` → `1 < 3` → `true`
**반환**: `null`

### 2.4 Fallback 동작

**파일**: `frontend/src/components/matching/ProblemListPanel.tsx`, Line 251-260

```typescript
{parsed ? (
  // Phase 45: "베이직쎈 · 10p · 3번" 형식
  <span>{parsed.bookName} · {parsed.page}p · {parsed.problemNumber}번</span>
) : (
  // Fallback: 기존 형식
  <span>{problem.problemNumber}번</span>  // ← "L1번" 표시
)}
```

`parsed`가 `null`이므로 fallback으로 `problem.problemNumber`인 **"L1"** 표시

---

## 3. 문제 발생 지점 상세

### 3.1 프론트엔드: 문제 추가 시 displayName 미전달

**경로 1**: `workSessionStore.ts` → `addProblem()`

```typescript
// frontend/src/stores/workSessionStore.ts
addProblem: async (problem) => {
  // displayName이 전달되지만, 호출측에서 제대로 설정하지 않음
  const response = await api.addProblemToSession(sessionId, problem);
}
```

**경로 2**: `MatchingCanvas.tsx` → 그룹 생성 시

```typescript
// frontend/src/components/unified/MatchingCanvas.tsx (Line 180-189)
const fullDisplayName = baseDisplayName !== '정보 없음'
  ? `${baseDisplayName}_${problemNumber}번`  // 올바른 형식!
  : `${problemNumber}번`;

// 하지만 이 displayName이 addProblem에 전달되는지 확인 필요
```

### 3.2 백엔드: 기본값 형식 불일치

**파일**: `backend/app/routers/work_sessions.py`

| 위치 | 생성 형식 | 문제점 |
|------|----------|--------|
| Line 262 | `"문제 {problemNumber}"` | 파싱 불가 |
| Line 463 | `"{bookName}_{course}_p{page}_{number}번"` | 파싱 가능하지만 "번" 중복 |

---

## 4. 영향 범위

| 컴포넌트 | 영향 |
|----------|------|
| `ProblemListPanel` | 좌측 사이드바 문제 목록 형식 잘못됨 |
| `UnlinkedProblemItem` | "문제 L1번" 형식으로 표시 |
| `LinkedProblemItem` | 매칭된 문제도 동일 증상 |
| UX | 사용자가 문제 식별 어려움 |

---

## 5. 해결 방안

### 5.1 방안 A: 백엔드 기본값 수정 (권장)

**파일**: `backend/app/routers/work_sessions.py`, Line 262

```python
# Before
displayName=request.displayName or f"문제 {request.problemNumber}"

# After - 문서에서 정보 추출하여 displayName 생성
if not request.displayName:
    # 세션에서 문서 정보 가져오기
    session = session_store.get(session_id)
    if session and session.get("problemDocumentId"):
        doc = document_store.get(session["problemDocumentId"])
        if doc:
            book_name = doc.get("name", "").split("_")[0]  # 예: "베이직쎈"
            page = request.pageIndex + 1  # 0-based to 1-based
            displayName = f"{book_name}_p{page}_{request.problemNumber}"
        else:
            displayName = f"{request.problemNumber}번"
    else:
        displayName = f"{request.problemNumber}번"
else:
    displayName = request.displayName
```

### 5.2 방안 B: 프론트엔드에서 displayName 항상 전달

**파일**: `frontend/src/stores/workSessionStore.ts`

문제 추가 시 displayName을 반드시 구성하여 전달:

```typescript
addProblem: async (problem) => {
  const { currentSession } = get();

  // displayName이 없으면 자동 생성
  if (!problem.displayName && currentSession) {
    const bookName = currentSession.problemDocumentName?.split('_')[0] || '문제';
    const page = (problem.pageIndex || 0) + 1;
    problem.displayName = `${bookName}_p${page}_${problem.problemNumber}`;
  }

  // ... API 호출
}
```

### 5.3 방안 C: 파서 유연성 강화

**파일**: `frontend/src/utils/problemDisplayUtils.ts`

"문제 X" 형식도 파싱하도록 개선:

```typescript
export function parseProblemDisplayName(displayName: string | undefined): ParsedProblemInfo | null {
  if (!displayName) return null;

  // 패턴 1: "문제 L1" 형식 처리
  const legacyMatch = displayName.match(/^문제\s+(.+)$/);
  if (legacyMatch) {
    return {
      bookName: '문제',
      page: '?',
      problemNumber: legacyMatch[1],
    };
  }

  // 패턴 2: 기존 "책이름_과정_p페이지_번호번" 형식
  const parts = displayName.split('_');
  // ... 기존 로직
}
```

---

## 6. 권장 구현 순서

1. **방안 B 먼저 적용** (프론트엔드에서 displayName 항상 전달)
   - 가장 안전하고 즉시 효과 있음
   - 기존 데이터에는 영향 없음

2. **방안 A 추가 적용** (백엔드 기본값 개선)
   - 방어적 코딩
   - 프론트엔드가 displayName을 빼먹어도 올바른 형식 생성

3. **방안 C 선택적 적용** (파서 유연성)
   - 레거시 데이터 호환성
   - "문제 L1" 형식도 최소한의 정보 표시

---

## 7. 검증 계획

### 7.1 수정 후 테스트 시나리오

1. **새 세션 생성** → 문제 추가 → 좌측 사이드바에서 "베이직쎈 · 10p · 3번" 형식 확인
2. **기존 세션 로드** → displayName이 없는 문제 → fallback 동작 확인
3. **sync_problems_from_groups** → displayName 형식 확인

### 7.2 로그 추가 (디버깅용)

```typescript
// ProblemListPanel.tsx
const UnlinkedProblemItem = memo(function UnlinkedProblemItem({ problem, ... }) {
  console.log('[Phase 45] problem:', {
    groupId: problem.groupId,
    displayName: problem.displayName,  // ← 이 값 확인!
    problemNumber: problem.problemNumber,
  });

  const parsed = useMemo(
    () => parseProblemDisplayName(problem.displayName),
    [problem.displayName]
  );

  console.log('[Phase 45] parsed:', parsed);  // ← null이면 파싱 실패
  // ...
});
```

---

## 8. 결론

### 8.1 근본 원인
프론트엔드에서 `addProblem()` 호출 시 `displayName`을 전달하지 않아 백엔드가 **"문제 L1"** 형식으로 기본값 생성. 이 형식은 파서(`parseProblemDisplayName`)가 인식하지 못해 `null` 반환, fallback UI 표시.

### 8.2 수정 우선순위
1. 프론트엔드: 문제 추가 시 displayName 반드시 포함 (**방안 B**)
2. 백엔드: 기본값 형식 개선 (**방안 A**)
3. 파서: 레거시 형식 호환 (**방안 C**, 선택적)

### 8.3 예상 작업량
- 방안 B: 1시간
- 방안 A: 30분
- 방안 C: 20분

---

*작성자: Claude Code (Opus)*
*Phase: 45-Fix*
