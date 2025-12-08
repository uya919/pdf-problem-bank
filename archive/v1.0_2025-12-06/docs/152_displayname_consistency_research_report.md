# Phase 51: displayName 일관성 연구 리포트

## 목표
모든 문제의 `displayName`을 일관된 형식으로 통일:
```
{bookName}_{course}_p{page}_{problemNumber}번
예: 베이직쎈_공통수학_p10_3번
```

---

## 1. 현재 문제점

### 스크린샷 분석
```
5번: "베이직쎈_공통수학..."  ← sync-problems 경로 (정상)
6번: "고1_p23_6"              ← addProblem 경로 (문제)
```

### 원인
`displayName`이 두 가지 다른 경로에서 생성되며, 각각 다른 로직 사용:

| 경로 | 위치 | 형식 | 문제점 |
|------|------|------|--------|
| **sync-problems** | Backend | `{bookName}_{course}_p{page}_{number}번` | 정상 (목표 형식) |
| **addProblem** | Frontend | `{bookName}_p{page}_{number}` | course 누락, "번" 누락 |

---

## 2. 코드 분석

### 2.1 정상 경로: Backend sync-problems (work_sessions.py:534-550)

```python
# Phase 34-A: displayName 생성 (시리즈_과정_p페이지_문항번호번)
parts = []
if problem_info.get("bookName"):
    parts.append(problem_info["bookName"])
if problem_info.get("course"):
    parts.append(problem_info["course"])
if problem_info.get("page"):
    parts.append(f"p{problem_info['page']}")
parts.append(f"{problem_number}번")
display_name = "_".join(parts) if len(parts) > 1 else f"{problem_number}번"
```

**결과**: `베이직쎈_공통수학_p10_3번` (정상)

### 2.2 문제 경로: Frontend addProblem (workSessionStore.ts:360-368)

```typescript
// Phase 45-Fix: displayName 자동 생성
const problemData = { ...data };
if (!problemData.displayName) {
  // 문서명에서 책 이름 추출: "고1 공통수학1 - 베이직쎈" → "베이직쎈"
  const docName = currentSession.problemDocumentName || '';
  const bookName = extractBookName(docName);
  const page = (problemData.pageIndex ?? 0) + 1;
  problemData.displayName = `${bookName}_p${page}_${problemData.problemNumber}`;
}
```

**결과**: `베이직쎈_p8_5` (course 누락, "번" 누락)

### 2.3 extractBookName 함수 (workSessionStore.ts:52-68)

```typescript
function extractBookName(documentName: string): string {
  if (!documentName) return '문제';

  // 패턴 1: "... - 책이름" (대시로 구분)
  const dashParts = documentName.split('-');
  if (dashParts.length > 1) {
    return dashParts[dashParts.length - 1].trim();
  }

  // 패턴 2: "책이름_..." (언더스코어로 구분)
  const underscoreParts = documentName.split('_');
  if (underscoreParts.length > 0) {
    return underscoreParts[0].trim();
  }

  return documentName;
}
```

**문제점**:
- `problemDocumentName`이 잘못 파싱될 수 있음
- `course` 정보를 전혀 사용하지 않음

---

## 3. 데이터 흐름 분석

### 3.1 그룹 생성 → 문제 등록 흐름

```
PageViewer.handleCreateGroup()
    ↓
onGroupCreated(newGroup, currentPage)
    ↓
UnifiedWorkPage.handleGroupCreated()
    ↓
addProblem({ groupId, pageIndex, problemNumber })
    ↓                    ↓
    ↓           displayName 누락!
    ↓
workSessionStore.addProblem()
    ↓
displayName 자동 생성 (문제 있는 로직)
    ↓
api.addProblemToSession()
    ↓
Backend: 전달받은 displayName 그대로 저장
```

### 3.2 핵심 문제
`UnifiedWorkPage.handleGroupCreated()`에서 `problemInfo`를 전달하지 않음:

```typescript
// 현재 코드 (UnifiedWorkPage.tsx:109-120)
const handleGroupCreated = useCallback(async (group: ProblemGroup, pageIndex: number) => {
  if (activeTab === 'problem') {
    const problemNumber = group.problemInfo?.problemNumber || group.id;
    try {
      await addProblem({
        groupId: group.id,
        pageIndex,
        problemNumber,
        // displayName 생략 → workSessionStore에서 자동 생성 (문제!)
      });
```

---

## 4. 해결 방안

### 방안 A: Frontend에서 problemInfo 기반 displayName 생성 (권장)

**수정 위치**: `UnifiedWorkPage.handleGroupCreated()`

**장점**:
- 그룹 생성 시점에 이미 `group.problemInfo`에 모든 정보 있음
- 백엔드 로직과 동일한 형식 보장
- 단일 수정 포인트

**수정 내용**:
```typescript
const handleGroupCreated = useCallback(async (group: ProblemGroup, pageIndex: number) => {
  if (activeTab === 'problem') {
    const problemInfo = group.problemInfo || {};
    const problemNumber = problemInfo.problemNumber || group.id;

    // Phase 51: Backend와 동일한 형식으로 displayName 생성
    const parts: string[] = [];
    if (problemInfo.bookName) parts.push(problemInfo.bookName);
    if (problemInfo.course) parts.push(problemInfo.course);
    parts.push(`p${problemInfo.page || pageIndex + 1}`);
    parts.push(`${problemNumber}번`);
    const displayName = parts.join('_');

    try {
      await addProblem({
        groupId: group.id,
        pageIndex,
        problemNumber,
        displayName,  // 명시적 전달
      });
```

### 방안 B: workSessionStore.addProblem() 로직 개선

**수정 위치**: `workSessionStore.ts:360-368`

**단점**:
- `currentSession`에 course 정보가 없음
- group의 problemInfo에 접근 불가

### 방안 C: Backend에서 항상 재생성

**수정 위치**: `work_sessions.py add-problem 엔드포인트`

**단점**:
- Backend에서 groups.json을 다시 읽어야 함
- 불필요한 I/O 증가

---

## 5. 권장 구현 계획

### Phase 51-A: handleGroupCreated 수정

| 단계 | 파일 | 작업 |
|------|------|------|
| 1 | `UnifiedWorkPage.tsx` | `handleGroupCreated`에서 displayName 명시적 생성 |
| 2 | 테스트 | 새 그룹 생성 시 displayName 형식 확인 |

### Phase 51-B: 기존 데이터 마이그레이션 (선택)

| 단계 | 작업 |
|------|------|
| 1 | `/refresh-display-names` API 호출 |
| 2 | 기존 문제들의 displayName 업데이트 |

---

## 6. 체크리스트

- [ ] Phase 51-A: UnifiedWorkPage.handleGroupCreated 수정
- [ ] 테스트: 새 그룹 생성 → displayName 확인
- [ ] Phase 51-B: 기존 데이터 refresh-display-names 호출
- [ ] 테스트: 연결된 문제 표시 형식 확인

---

## 7. 예상 결과

### Before (현재)
```
5번: "베이직쎈_공통수학..."  (sync-problems)
6번: "고1_p23_6"              (addProblem)
```

### After (수정 후)
```
5번: "베이직쎈_공통수학_p10_5번"
6번: "베이직쎈_공통수학_p23_6번"
```

---

*작성일: 2025-12-05*
