# Phase 34.5 수정 계획: import type 구문 변경

> **작성일**: 2025-12-03
> **예상 소요**: 15분
> **목표**: 모든 타입 import를 `import type` 구문으로 변경하여 런타임 에러 해결

---

## 1. 문제 요약

`verbatimModuleSyntax: true` 설정으로 인해 타입 import가 런타임에서 실패.

**해결**: 모든 타입 전용 import를 `import type` 구문으로 변경.

---

## 2. 수정 단계

### Step 1: Hooks 수정 (2개 파일)

#### 1-1. useDocumentSearch.ts
```typescript
// Before
import { DocumentCombo, generateSearchKeywords } from '../lib/documentParser';

// After
import { generateSearchKeywords } from '../lib/documentParser';
import type { DocumentCombo } from '../lib/documentParser';
```

#### 1-2. useDocumentIndex.ts
```typescript
// Before
import { buildDocumentIndex, DocumentIndex } from '../lib/documentParser';

// After
import { buildDocumentIndex } from '../lib/documentParser';
import type { DocumentIndex } from '../lib/documentParser';
```

---

### Step 2: 순수 타입 import 컴포넌트 수정 (5개 파일)

타입만 import하는 파일들 - 단순히 `import type` 추가

#### 2-1. HeroSection.tsx
```typescript
// Before
import { DocumentCombo } from '../../lib/documentParser';

// After
import type { DocumentCombo } from '../../lib/documentParser';
```

#### 2-2. SearchResultItem.tsx
```typescript
// Before
import { DocumentCombo } from '../../lib/documentParser';

// After
import type { DocumentCombo } from '../../lib/documentParser';
```

#### 2-3. SmartSearchBox.tsx
```typescript
// Before
import { DocumentCombo } from '../../lib/documentParser';

// After
import type { DocumentCombo } from '../../lib/documentParser';
```

#### 2-4. SchoolTabs.tsx
```typescript
// Before
import { SchoolLevel } from '../../lib/documentParser';

// After
import type { SchoolLevel } from '../../lib/documentParser';
```

#### 2-5. SeriesGrid.tsx
```typescript
// Before
import { SeriesInfo } from '../../lib/documentParser';

// After
import type { SeriesInfo } from '../../lib/documentParser';
```

---

### Step 3: 복합 타입 import 컴포넌트 수정 (2개 파일)

여러 타입을 import하는 파일들

#### 3-1. BrowseAllSection.tsx
```typescript
// Before
import { DocumentIndex, DocumentCombo, SchoolLevel, SeriesInfo } from '../../lib/documentParser';

// After
import type { DocumentIndex, DocumentCombo, SchoolLevel, SeriesInfo } from '../../lib/documentParser';
```

#### 3-2. GradeCourseSelector.tsx
```typescript
// Before
import { GradeInfo, SchoolLevel } from '../../lib/documentParser';

// After
import type { GradeInfo, SchoolLevel } from '../../lib/documentParser';
```

---

### Step 4: 검증

1. **TypeScript 컴파일 확인**
   ```bash
   npx tsc --noEmit
   ```

2. **서버 재시작**
   ```bash
   npm run dev
   ```

3. **브라우저 테스트**
   - 에러 없이 페이지 로드 확인
   - 검색 기능 테스트
   - 전체 찾아보기 테스트

---

## 3. 체크리스트

| # | 파일 | 수정 내용 | 상태 |
|---|------|-----------|------|
| 1 | `useDocumentSearch.ts` | 타입/값 분리 import | ⬜ |
| 2 | `useDocumentIndex.ts` | 타입/값 분리 import | ⬜ |
| 3 | `HeroSection.tsx` | `import type` 추가 | ⬜ |
| 4 | `SearchResultItem.tsx` | `import type` 추가 | ⬜ |
| 5 | `SmartSearchBox.tsx` | `import type` 추가 | ⬜ |
| 6 | `SchoolTabs.tsx` | `import type` 추가 | ⬜ |
| 7 | `SeriesGrid.tsx` | `import type` 추가 | ⬜ |
| 8 | `BrowseAllSection.tsx` | `import type` 추가 | ⬜ |
| 9 | `GradeCourseSelector.tsx` | `import type` 추가 | ⬜ |
| 10 | TypeScript 컴파일 확인 | `npx tsc --noEmit` | ⬜ |
| 11 | 브라우저 테스트 | 에러 없이 로드 | ⬜ |

---

## 4. 예상 결과

수정 완료 후:
- ✅ 페이지 정상 로드
- ✅ 검색 기능 동작
- ✅ 최근 사용 섹션 표시
- ✅ 전체 찾아보기 동작

---

*계획 작성: Claude Code*
*최종 업데이트: 2025-12-03*
