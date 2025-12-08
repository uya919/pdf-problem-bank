# Phase 56-K: "고1" vs "베이직쎈" displayName 버그 리포트

**문서 번호**: 220
**작성일**: 2025-12-07
**심각도**: 중간

---

## 1. 문제 현상

### 1.1 사용자 보고

```
새롭게 등록하면:
  현재: "고1 · 8p · 1번"
  기대: "베이직쎈 · 8p · 1번"
```

### 1.2 영향 범위

- L키로 생성한 하위문제
- G키로 생성한 일반 문제 (동일 문제 가능성)
- 좌측 사이드바의 미연결/연결 문제 목록

---

## 2. 근본 원인

### 2.1 두 개의 서로 다른 `extractBookName` 함수

**문제 핵심**: 프로젝트에 **두 개의 다른** `extractBookName` 함수가 존재하며, 각각 다른 파싱 로직을 사용

| 위치 | 파싱 방식 | 결과 |
|------|-----------|------|
| `documentUtils.ts` | `series` 추출 (마지막-2번째) | **"베이직쎈"** ✅ |
| `workSessionStore.ts` | 첫 번째 `_` 앞 부분 | **"고1"** ❌ |

### 2.2 상세 비교

#### (A) documentUtils.ts - `extractBookNameAndCourse()` ✅ 올바름

```typescript
// 파일: frontend/src/utils/documentUtils.ts
export function parseDocumentId(documentId: string): ParsedDocumentId | null {
  const parts = documentId.split('_');
  // parts = ["고1", "공통수학1", "베이직쎈", "문제"]

  const type = parts[parts.length - 1];       // "문제"
  const grade = parts[0];                      // "고1"
  const series = parts[parts.length - 2];     // "베이직쎈" ✅
  const course = parts.slice(1, -2).join('_'); // "공통수학1"

  return { grade, course, series, type };
}

export function extractBookNameAndCourse(documentId: string) {
  const parsed = parseDocumentId(documentId);
  return {
    bookName: parsed.series,  // "베이직쎈" ✅
    course: parsed.course,    // "공통수학1"
  };
}
```

#### (B) workSessionStore.ts - `extractBookName()` ❌ 잘못됨

```typescript
// 파일: frontend/src/stores/workSessionStore.ts (라인 52-69)
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
    return underscoreParts[0].trim();  // ← "고1" 반환! ❌
  }

  return documentName.trim() || '문제';
}
```

---

## 3. 버그 발생 시나리오

### 3.1 데이터 흐름

```
┌─────────────────────────────────────────────────────────────────────┐
│ PageViewer.tsx - L키 핸들러                                          │
├─────────────────────────────────────────────────────────────────────┤
│ const { bookName, course } = extractBookNameAndCourse(documentId);  │
│ // bookName = "베이직쎈" ✅                                          │
│                                                                      │
│ problemInfo: {                                                       │
│   bookName: documentSettings?.defaultBookName || bookName,          │
│   // bookName = "베이직쎈" ✅                                        │
│ }                                                                    │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼ groups.json에 저장
┌─────────────────────────────────────────────────────────────────────┐
│ groups.json                                                          │
├─────────────────────────────────────────────────────────────────────┤
│ {                                                                    │
│   "problemInfo": {                                                   │
│     "problemNumber": "1",                                            │
│     "bookName": "베이직쎈",  // ✅ 올바름                             │
│     "course": "공통수학1",                                           │
│     "page": 8                                                        │
│   }                                                                  │
│ }                                                                    │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼ Backend sync_manager가 동기화
┌─────────────────────────────────────────────────────────────────────┐
│ sync_manager.py - sync_problems_to_session()                        │
├─────────────────────────────────────────────────────────────────────┤
│ problem_info = group.get("problemInfo", {})                          │
│ book_name = problem_info.get("bookName", "")                         │
│ display_name = problem_info.get("displayName", "")                   │
│                                                                      │
│ if not display_name:                                                 │
│     display_name = f"{book_name} {problem_number}".strip()           │
│     // display_name = "베이직쎈 1" ← 형식이 다름!                     │
│     // 기대: "베이직쎈_p8_1번"                                        │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼ 사이드바에서 파싱
┌─────────────────────────────────────────────────────────────────────┐
│ ProblemListPanel.tsx                                                 │
├─────────────────────────────────────────────────────────────────────┤
│ parseProblemDisplayName("베이직쎈 1")                                │
│ // 결과: null (형식 불일치)                                          │
│ // fallback: problem.problemNumber = "1번"                           │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 실제 버그 발생 지점

**주요 버그**: `sync_manager.py`에서 displayName 생성 형식 불일치

```python
# 현재 코드 (sync_manager.py 라인 129-130)
if not display_name:
    display_name = f"{book_name} {problem_number}".strip()
    # 결과: "베이직쎈 1" (공백으로 구분)
```

```typescript
// 기대 형식 (workSessionStore.ts와 일치해야 함)
displayName = `${bookName}_p${page}_${problemNumber}번`;
// 결과: "베이직쎈_p8_1번" (언더스코어 구분, p, 번 포함)
```

### 3.3 왜 "고1"이 나오는가?

**추가 발견**: workSessionStore.ts의 fallback 로직도 문제

```typescript
// workSessionStore.ts addProblem (라인 372-380)
if (problemData.bookName && problemData.page) {
  // metadata 있으면 올바른 형식 생성
  problemData.displayName = `${problemData.bookName}_p${problemData.page}_${problemData.problemNumber}번`;
} else {
  // ❌ Fallback: 잘못된 extractBookName 사용
  const docName = currentSession.problemDocumentName || '';
  const bookName = extractBookName(docName);  // ← "고1" 반환!
  problemData.displayName = `${bookName}_p${page}_${problemData.problemNumber}번`;
  // 결과: "고1_p8_1번"
}
```

---

## 4. 문제가 발생하는 조건

| 조건 | bookName 결과 |
|------|---------------|
| `documentSettings?.defaultBookName` 설정됨 | 설정값 (올바름) |
| `documentSettings` 없음 + L키/G키 | `extractBookNameAndCourse` → "베이직쎈" ✅ |
| Backend sync 시 `problemInfo.bookName` 존재 | "베이직쎈" ✅ |
| Backend sync 시 `problemInfo.bookName` 없음 | 빈 문자열 → 형식 불일치 |
| workSessionStore fallback 사용 | `extractBookName` → "고1" ❌ |

---

## 5. 해결 방안

### 5.1 즉각 수정 (권장)

#### 수정 1: workSessionStore.ts의 `extractBookName` 제거

```typescript
// 파일: workSessionStore.ts

// 제거: 로컬 extractBookName 함수 (라인 52-69)
// 대신: documentUtils.ts에서 import

import { extractBookNameAndCourse } from '../utils/documentUtils';

// addProblem fallback 수정 (라인 375-378)
const { bookName } = extractBookNameAndCourse(currentSession.problemDocumentId || '');
const page = (problemData.pageIndex ?? 0) + 1;
problemData.displayName = `${bookName}_p${page}_${problemData.problemNumber}번`;
```

#### 수정 2: sync_manager.py의 displayName 형식 통일

```python
# 파일: sync_manager.py (라인 124-132)

# displayName 생성
problem_number = problem_info.get("problemNumber", "")
book_name = problem_info.get("bookName", "")
page = problem_info.get("page", group_data["pageIndex"] + 1)
display_name = problem_info.get("displayName", "")

if not display_name:
    if book_name and page:
        display_name = f"{book_name}_p{page}_{problem_number}번"
    elif book_name:
        display_name = f"{book_name}_{problem_number}번"
    else:
        display_name = f"#{original_group_id[:8]}"
```

### 5.2 검증 체크리스트

- [ ] workSessionStore.ts의 중복 `extractBookName` 제거
- [ ] sync_manager.py displayName 형식 통일
- [ ] 기존 데이터 마이그레이션 불필요 (새 데이터만 영향)

---

## 6. 영향 분석

### 6.1 위험도: **낮음**

| 항목 | 평가 |
|------|------|
| 기존 데이터 | 영향 없음 (새 데이터만) |
| 기능 손상 | 없음 (표시만 다름) |
| 롤백 가능 | 예 |

### 6.2 수정 범위

| 파일 | 변경 내용 | 라인 수 |
|------|-----------|---------|
| `workSessionStore.ts` | `extractBookName` 제거, import 추가 | ~20줄 |
| `sync_manager.py` | displayName 형식 통일 | ~5줄 |

---

## 7. 결론

### 버그 요약

```
원인: 두 개의 서로 다른 extractBookName 함수
      - documentUtils.ts: "베이직쎈" (올바름)
      - workSessionStore.ts: "고1" (잘못됨)

영향: 좌측 사이드바 문제 표시 형식 불일치

수정: workSessionStore.ts의 로컬 함수 제거
      + sync_manager.py 형식 통일
```

### 수정 난이도: **낮음** (15분)

---

*승인 후 실행: "Phase 56-K 진행해줘"*
