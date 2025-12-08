# Phase 45-Fix: displayName 형식 수정 개발 계획

**작성일**: 2025-12-04
**관련 문서**: [122_phase45_displayname_error_report.md](122_phase45_displayname_error_report.md)

---

## 목표

좌측 사이드바 문제 목록이 **"베이직쎈 · 10p · 3번"** 형식으로 표시되도록 수정

```
Before: "문제 L1번"
After:  "베이직쎈 · 10p · 3번"
```

---

## 구현 단계

### Step 1: 데이터 흐름 확인 (디버깅)
- [ ] ProblemListPanel에 console.log 추가하여 실제 displayName 값 확인
- [ ] 어디서 displayName이 누락되는지 정확히 파악

### Step 2: 프론트엔드 - displayName 생성 로직 추가
**파일**: `frontend/src/stores/workSessionStore.ts`

- [ ] `addProblem()` 함수에서 displayName 자동 생성 로직 추가
- [ ] 세션의 문서 정보(bookName)와 pageIndex를 조합하여 displayName 구성
- [ ] 형식: `"{bookName}_p{page}_{problemNumber}"`

```typescript
// 예시 구현
addProblem: async (problem) => {
  const { currentSession } = get();

  // displayName 자동 생성
  if (!problem.displayName && currentSession) {
    const bookName = extractBookName(currentSession.problemDocumentName);
    const page = (problem.pageIndex ?? 0) + 1;
    problem.displayName = `${bookName}_p${page}_${problem.problemNumber}`;
  }

  // API 호출...
}
```

### Step 3: 백엔드 - 기본값 형식 개선
**파일**: `backend/app/routers/work_sessions.py`

- [ ] Line 262: `addProblemToSession` 기본값 형식 변경
- [ ] 문서 정보 조회하여 적절한 displayName 생성
- [ ] fallback: `"{problemNumber}번"` (최소한 파싱 가능한 형식)

```python
# Before
displayName=request.displayName or f"문제 {request.problemNumber}"

# After
displayName=request.displayName or generate_display_name(session, request)
```

### Step 4: 파서 유연성 강화
**파일**: `frontend/src/utils/problemDisplayUtils.ts`

- [ ] 레거시 "문제 X" 형식도 최소한의 정보로 파싱
- [ ] 다양한 형식 지원 (2파트, 3파트, 4파트)

```typescript
// 추가할 패턴 처리
// 패턴 1: "문제 L1" → { bookName: "문제", page: "?", problemNumber: "L1" }
// 패턴 2: "3번" → { bookName: "?", page: "?", problemNumber: "3" }
// 패턴 3: "베이직쎈_p10_3" → { bookName: "베이직쎈", page: "10", problemNumber: "3" }
// 패턴 4: "베이직쎈_공통수학1_p10_3번" → 기존 파서
```

### Step 5: 기존 데이터 마이그레이션 (선택)
- [ ] 기존 세션의 잘못된 displayName을 수정하는 유틸리티 작성
- [ ] 또는 sync_problems_from_groups 호출 시 자동 수정

### Step 6: 검증
- [ ] 새 세션 생성 → 문제 추가 → 좌측 사이드바 형식 확인
- [ ] 기존 세션 로드 → fallback 동작 확인
- [ ] 빌드 오류 없음 확인

---

## 파일 수정 목록

| 파일 | 수정 내용 | 우선순위 |
|------|----------|----------|
| `frontend/src/stores/workSessionStore.ts` | addProblem에 displayName 자동 생성 | P1 |
| `frontend/src/utils/problemDisplayUtils.ts` | 파서 유연성 강화 | P1 |
| `backend/app/routers/work_sessions.py` | 기본값 형식 개선 (Line 262) | P2 |

---

## 상세 구현 명세

### A. workSessionStore.ts 수정

**위치**: `addProblem` 함수 내부

```typescript
// frontend/src/stores/workSessionStore.ts

// 헬퍼 함수 추가
function extractBookName(documentName: string | undefined): string {
  if (!documentName) return '문제';
  // "고1 공통수학1 - 베이직쎈" → "베이직쎈"
  // "베이직쎈_공통수학1_p10" → "베이직쎈"
  const parts = documentName.split(/[-_]/);
  return parts[parts.length - 1]?.trim() || '문제';
}

// addProblem 함수 수정
addProblem: async (problem) => {
  const { currentSession } = get();
  if (!currentSession) throw new Error('No active session');

  // Phase 45-Fix: displayName 자동 생성
  const problemToAdd = { ...problem };
  if (!problemToAdd.displayName) {
    const bookName = extractBookName(currentSession.problemDocumentName);
    const page = (problemToAdd.pageIndex ?? 0) + 1;
    problemToAdd.displayName = `${bookName}_p${page}_${problemToAdd.problemNumber}`;
    logger.debug('WorkSession', `Auto-generated displayName: ${problemToAdd.displayName}`);
  }

  const response = await api.addProblemToSession(currentSession.sessionId, problemToAdd);
  // ... 나머지 로직
}
```

### B. problemDisplayUtils.ts 수정

**위치**: `parseProblemDisplayName` 함수

```typescript
// frontend/src/utils/problemDisplayUtils.ts

export function parseProblemDisplayName(displayName: string | undefined): ParsedProblemInfo | null {
  if (!displayName) return null;

  // Phase 45-Fix: 레거시 "문제 X" 형식 처리
  const legacyMatch = displayName.match(/^문제\s+(.+)$/);
  if (legacyMatch) {
    return {
      bookName: '문제',
      page: '-',
      problemNumber: legacyMatch[1].replace('번', ''),
    };
  }

  // Phase 45-Fix: 단순 "X번" 형식 처리
  const simpleMatch = displayName.match(/^(\d+)번?$/);
  if (simpleMatch) {
    return {
      bookName: '-',
      page: '-',
      problemNumber: simpleMatch[1],
    };
  }

  const parts = displayName.split('_');

  // 2파트: "베이직쎈_3" → bookName + problemNumber
  if (parts.length === 2) {
    return {
      bookName: parts[0],
      page: '-',
      problemNumber: parts[1].replace('번', ''),
    };
  }

  // 3파트: "베이직쎈_p10_3" → bookName + page + problemNumber
  if (parts.length === 3) {
    const pagePart = parts[1];
    const page = pagePart.toLowerCase().startsWith('p')
      ? pagePart.substring(1)
      : pagePart;
    return {
      bookName: parts[0],
      page: page,
      problemNumber: parts[2].replace('번', ''),
    };
  }

  // 4파트 이상: "베이직쎈_공통수학1_p10_3번"
  if (parts.length >= 4) {
    const lastPart = parts[parts.length - 1];
    const problemNumber = lastPart.replace('번', '');

    const pagePart = parts[parts.length - 2];
    if (!pagePart.toLowerCase().startsWith('p')) return null;
    const page = pagePart.substring(1);

    const remainingParts = parts.slice(0, -2);
    const bookName = remainingParts[0] || '-';

    return {
      bookName,
      course: remainingParts.length > 1 ? remainingParts.slice(1).join(' ') : undefined,
      page,
      problemNumber,
    };
  }

  return null;
}
```

### C. work_sessions.py 수정

**위치**: Line 262 부근

```python
# backend/app/routers/work_sessions.py

def generate_display_name(session: dict, request) -> str:
    """Phase 45-Fix: displayName 자동 생성"""
    problem_doc_id = session.get("problemDocumentId")
    if problem_doc_id:
        doc = document_store.get(problem_doc_id)
        if doc:
            # 문서명에서 책 이름 추출
            doc_name = doc.get("name", "")
            # "고1 공통수학1 - 베이직쎈" → "베이직쎈"
            parts = doc_name.replace("-", "_").split("_")
            book_name = parts[-1].strip() if parts else "문제"

            page = (request.pageIndex or 0) + 1
            return f"{book_name}_p{page}_{request.problemNumber}"

    # fallback
    return f"{request.problemNumber}번"

# addProblemToSession 함수 내
displayName = request.displayName or generate_display_name(session, request)
```

---

## 체크리스트

- [ ] Step 1: 디버깅 로그 추가
- [ ] Step 2: workSessionStore.ts 수정
- [ ] Step 3: work_sessions.py 수정
- [ ] Step 4: problemDisplayUtils.ts 수정
- [ ] Step 5: 기존 데이터 마이그레이션 (선택)
- [ ] Step 6: 테스트 및 검증

---

## 예상 결과

### Before
```
┌──────────────────┐
│ ○ 문제 L1번     │
│ ○ 문제 L2번     │
└──────────────────┘
```

### After
```
┌─────────────────────────────┐
│ ○ 베이직쎈 · 10p · 1번     │
│ ○ 베이직쎈 · 10p · 2번     │
└─────────────────────────────┘
```

---

*작성자: Claude Code*
*Phase: 45-Fix*
