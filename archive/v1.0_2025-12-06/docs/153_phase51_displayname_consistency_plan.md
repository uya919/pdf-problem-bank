# Phase 51: displayName 일관성 개발 계획

## 목표
모든 문제의 `displayName`을 일관된 형식으로 통일:
```
{bookName}_{course}_p{page}_{problemNumber}번
예: 베이직쎈_공통수학_p10_3번
```

---

## 안정성 고려사항

### 위험 요소
1. 기존 데이터와의 호환성
2. 빈 값 처리 (bookName, course가 없는 경우)
3. 여러 경로에서의 일관성

### 안정성 전략
1. **유틸리티 함수 분리**: 단일 소스로 displayName 생성
2. **Fallback 처리**: 빈 값에 대한 기본값 설정
3. **단계별 적용**: 새 데이터 → 기존 데이터 순차 적용
4. **롤백 가능성**: workSessionStore의 기존 로직 주석 보존

---

## 구현 계획

### Step 1: displayName 생성 유틸리티 함수 추가

**파일**: `frontend/src/utils/displayNameUtils.ts` (신규)

```typescript
/**
 * Phase 51: displayName 생성 유틸리티
 *
 * Backend sync-problems와 동일한 형식 보장:
 * {bookName}_{course}_p{page}_{problemNumber}번
 */

import type { ProblemInfo } from '../api/client';

export interface DisplayNameParams {
  bookName?: string;
  course?: string;
  page?: number;
  problemNumber?: string;
}

/**
 * problemInfo에서 일관된 displayName 생성
 *
 * @example
 * formatDisplayName({ bookName: '베이직쎈', course: '공통수학', page: 10, problemNumber: '3' })
 * // => '베이직쎈_공통수학_p10_3번'
 *
 * @example
 * formatDisplayName({ bookName: '베이직쎈', page: 10, problemNumber: '3' })
 * // => '베이직쎈_p10_3번'
 */
export function formatDisplayName(params: DisplayNameParams): string {
  const { bookName, course, page, problemNumber } = params;

  const parts: string[] = [];

  // bookName (필수 - 없으면 기본값)
  if (bookName) {
    parts.push(bookName);
  }

  // course (선택 - 있으면 추가)
  if (course) {
    parts.push(course);
  }

  // page (필수 - 없으면 1)
  parts.push(`p${page || 1}`);

  // problemNumber (필수 - 없으면 '?')
  parts.push(`${problemNumber || '?'}번`);

  return parts.join('_');
}

/**
 * ProblemInfo 객체에서 displayName 생성
 */
export function formatDisplayNameFromInfo(
  problemInfo: ProblemInfo | undefined,
  pageIndex: number,
  fallbackProblemNumber?: string
): string {
  return formatDisplayName({
    bookName: problemInfo?.bookName,
    course: problemInfo?.course,
    page: problemInfo?.page || pageIndex + 1,
    problemNumber: problemInfo?.problemNumber || fallbackProblemNumber,
  });
}
```

---

### Step 2: UnifiedWorkPage.handleGroupCreated 수정

**파일**: `frontend/src/pages/UnifiedWorkPage.tsx`

**기존 코드 (106-124줄)**:
```typescript
const handleGroupCreated = useCallback(async (group: ProblemGroup, pageIndex: number) => {
  console.log('[Phase 39] Group created:', group.id, 'tab:', activeTab, 'page:', pageIndex);

  if (activeTab === 'problem') {
    // 문제 탭: 새 문제를 세션에 추가
    // Phase 45-Fix-2: problemNumber만 전달, displayName은 workSessionStore에서 자동 생성
    const problemNumber = group.problemInfo?.problemNumber || group.id;
    try {
      await addProblem({
        groupId: group.id,
        pageIndex,
        problemNumber,
        // displayName 생략 → workSessionStore.addProblem()에서 자동 생성
      });
      showToast(`${problemNumber}번 문제가 추가되었습니다`, 'success');
    } catch (error) {
```

**변경 코드**:
```typescript
import { formatDisplayNameFromInfo } from '../utils/displayNameUtils';

const handleGroupCreated = useCallback(async (group: ProblemGroup, pageIndex: number) => {
  console.log('[Phase 39] Group created:', group.id, 'tab:', activeTab, 'page:', pageIndex);

  if (activeTab === 'problem') {
    // 문제 탭: 새 문제를 세션에 추가
    const problemNumber = group.problemInfo?.problemNumber || group.id;

    // Phase 51: Backend와 동일한 형식으로 displayName 생성
    const displayName = formatDisplayNameFromInfo(
      group.problemInfo,
      pageIndex,
      problemNumber
    );

    try {
      await addProblem({
        groupId: group.id,
        pageIndex,
        problemNumber,
        displayName,  // Phase 51: 명시적 전달
      });
      showToast(`${problemNumber}번 문제가 추가되었습니다`, 'success');
    } catch (error) {
```

---

### Step 3: workSessionStore.addProblem 로직 보강 (Fallback)

**파일**: `frontend/src/stores/workSessionStore.ts`

**기존 로직 유지** + displayName이 전달되면 그대로 사용:

```typescript
// Phase 45-Fix + Phase 51: displayName 처리
const problemData = { ...data };
if (!problemData.displayName) {
  // Fallback: displayName이 전달되지 않은 경우 (레거시 호환)
  const docName = currentSession.problemDocumentName || '';
  const bookName = extractBookName(docName);
  const page = (problemData.pageIndex ?? 0) + 1;
  problemData.displayName = `${bookName}_p${page}_${problemData.problemNumber}번`;
  logger.debug('WorkSession', `[Fallback] Auto-generated displayName: ${problemData.displayName}`);
} else {
  logger.debug('WorkSession', `[Phase 51] Using provided displayName: ${problemData.displayName}`);
}
```

---

## 체크리스트

### Phase 51-A: 유틸리티 함수 생성
- [ ] `displayNameUtils.ts` 파일 생성
- [ ] `formatDisplayName()` 함수 구현
- [ ] `formatDisplayNameFromInfo()` 함수 구현

### Phase 51-B: UnifiedWorkPage 수정
- [ ] `displayNameUtils` import 추가
- [ ] `handleGroupCreated`에서 displayName 명시적 생성
- [ ] 빌드 확인

### Phase 51-C: workSessionStore Fallback 보강
- [ ] displayName이 있으면 그대로 사용하도록 수정
- [ ] 없으면 기존 로직 (레거시 호환)
- [ ] "번" 접미사 추가

### Phase 51-D: 테스트
- [ ] 새 그룹 생성 → displayName 형식 확인
- [ ] 연결된 문제 표시 형식 확인
- [ ] 기존 데이터 호환성 확인

### Phase 51-E: 기존 데이터 마이그레이션 (선택)
- [ ] `/refresh-display-names` API 호출
- [ ] 기존 문제들의 displayName 업데이트 확인

---

## 예상 결과

### Before (현재)
```
5번: "베이직쎈_공통수학..."  (sync-problems)
6번: "고1_p23_6"              (addProblem - 불일치)
```

### After (수정 후)
```
5번: "베이직쎈_공통수학_p10_5번"
6번: "베이직쎈_공통수학_p23_6번"  (일관됨)
```

---

## 롤백 계획

문제 발생 시:
1. `UnifiedWorkPage.tsx`에서 displayName 전달 제거
2. `workSessionStore.ts`의 기존 로직이 Fallback으로 동작

---

*작성일: 2025-12-05*
