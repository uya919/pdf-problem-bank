# Phase 34.5 심층 에러 분석 리포트

> **작성일**: 2025-12-03
> **상태**: ✅ 원인 파악 완료
> **긴급도**: 높음 (앱 전체 렌더링 실패)

---

## 1. 문제 요약

### 에러 메시지
```
The requested module '/@fs/C:/MYCLAUDE_PROJECT/pdf/frontend/src/lib/documentParser.ts'
does not provide an export named 'DocumentCombo'
```

### 증상
- 프론트엔드 완전 렌더링 실패 (빈 화면)
- 모든 컴포넌트 로드 차단

---

## 2. 근본 원인 분석

### 2.1 핵심 발견

**Vite/esbuild가 TypeScript 인터페이스를 완전히 제거함**

실제 Vite가 서빙하는 파일 내용 (curl로 확인):
```javascript
// 함수만 export됨!
export function parseDocumentName(filename) { ... }
export function generateSearchKeywords(doc) { ... }
export function buildDocumentIndex(documents) { ... }

// DocumentCombo, SchoolLevel 등 타입은 완전히 없음!
```

원본 TypeScript 파일:
```typescript
export type SchoolLevel = 'elementary' | 'middle' | 'high';  // ← 컴파일 후 사라짐
export interface DocumentCombo { ... }                        // ← 컴파일 후 사라짐
export function parseDocumentName(filename: string) { ... }   // ← 유지됨
```

### 2.2 왜 이런 일이 발생하는가?

**tsconfig.app.json의 `verbatimModuleSyntax: true` 설정**

```json
{
  "compilerOptions": {
    "verbatimModuleSyntax": true,  // ← 이 설정!
    ...
  }
}
```

이 설정의 의미:
1. **Type-only exports는 런타임에서 제거됨** (정상 동작)
2. **import 구문도 type-only인지 명시해야 함**
3. 일반 import로 type을 가져오면 런타임 에러 발생

### 2.3 문제의 import 문들

```typescript
// ❌ 현재 (잘못됨)
import { DocumentCombo, generateSearchKeywords } from '../lib/documentParser';

// ✅ 올바른 방법
import type { DocumentCombo } from '../lib/documentParser';
import { generateSearchKeywords } from '../lib/documentParser';

// ✅ 또는 한 줄로
import { generateSearchKeywords, type DocumentCombo } from '../lib/documentParser';
```

---

## 3. 영향받는 파일 목록

| 파일 | 잘못된 import |
|------|---------------|
| `hooks/useDocumentSearch.ts` | `{ DocumentCombo, generateSearchKeywords }` |
| `hooks/useDocumentIndex.ts` | `{ buildDocumentIndex, DocumentIndex }` |
| `components/main/BrowseAllSection.tsx` | `{ DocumentIndex, DocumentCombo, SchoolLevel, SeriesInfo }` |
| `components/main/GradeCourseSelector.tsx` | `{ GradeInfo, SchoolLevel }` |
| `components/main/HeroSection.tsx` | `{ DocumentCombo }` |
| `components/main/SchoolTabs.tsx` | `{ SchoolLevel }` |
| `components/main/SearchResultItem.tsx` | `{ DocumentCombo }` |
| `components/main/SeriesGrid.tsx` | `{ SeriesInfo }` |
| `components/main/SmartSearchBox.tsx` | `{ DocumentCombo }` |

---

## 4. 해결 방안

### 방안 A: 모든 import 수정 (권장)

각 파일의 import를 `import type` 구문으로 변경:

```typescript
// Before
import { DocumentCombo } from '../../lib/documentParser';

// After
import type { DocumentCombo } from '../../lib/documentParser';
```

값과 타입을 함께 import하는 경우:
```typescript
// Before
import { DocumentCombo, generateSearchKeywords } from '../lib/documentParser';

// After
import { generateSearchKeywords } from '../lib/documentParser';
import type { DocumentCombo } from '../lib/documentParser';
```

### 방안 B: tsconfig 설정 변경 (비권장)

```json
{
  "compilerOptions": {
    "verbatimModuleSyntax": false,  // 변경
    // 또는 제거
  }
}
```

⚠️ **비권장 이유**: 이 설정은 TypeScript 5.0+ 권장 사항이며, 향후 모듈 시스템 호환성을 위해 유지하는 것이 좋음.

---

## 5. 수정 대상 상세

### 5.1 hooks/useDocumentSearch.ts
```typescript
// Before
import { DocumentCombo, generateSearchKeywords } from '../lib/documentParser';

// After
import { generateSearchKeywords } from '../lib/documentParser';
import type { DocumentCombo } from '../lib/documentParser';
```

### 5.2 hooks/useDocumentIndex.ts
```typescript
// Before
import { buildDocumentIndex, DocumentIndex } from '../lib/documentParser';

// After
import { buildDocumentIndex } from '../lib/documentParser';
import type { DocumentIndex } from '../lib/documentParser';
```

### 5.3 components/main/BrowseAllSection.tsx
```typescript
// Before
import { DocumentIndex, DocumentCombo, SchoolLevel, SeriesInfo } from '../../lib/documentParser';

// After
import type { DocumentIndex, DocumentCombo, SchoolLevel, SeriesInfo } from '../../lib/documentParser';
```

### 5.4 components/main/GradeCourseSelector.tsx
```typescript
// Before
import { GradeInfo, SchoolLevel } from '../../lib/documentParser';

// After
import type { GradeInfo, SchoolLevel } from '../../lib/documentParser';
```

### 5.5 components/main/HeroSection.tsx
```typescript
// Before
import { DocumentCombo } from '../../lib/documentParser';

// After
import type { DocumentCombo } from '../../lib/documentParser';
```

### 5.6 components/main/SchoolTabs.tsx
```typescript
// Before
import { SchoolLevel } from '../../lib/documentParser';

// After
import type { SchoolLevel } from '../../lib/documentParser';
```

### 5.7 components/main/SearchResultItem.tsx
```typescript
// Before
import { DocumentCombo } from '../../lib/documentParser';

// After
import type { DocumentCombo } from '../../lib/documentParser';
```

### 5.8 components/main/SeriesGrid.tsx
```typescript
// Before
import { SeriesInfo } from '../../lib/documentParser';

// After
import type { SeriesInfo } from '../../lib/documentParser';
```

### 5.9 components/main/SmartSearchBox.tsx
```typescript
// Before
import { DocumentCombo } from '../../lib/documentParser';

// After
import type { DocumentCombo } from '../../lib/documentParser';
```

---

## 6. 결론

### 근본 원인
`verbatimModuleSyntax: true` 설정으로 인해 TypeScript 타입/인터페이스가 런타임에서 제거되는데, import 문에서 타입을 값처럼 가져오려고 시도하여 에러 발생.

### 해결책
모든 타입 전용 import를 `import type` 구문으로 변경.

### 예방
1. 새 파일 작성 시 타입 import는 항상 `import type` 사용
2. ESLint에 `@typescript-eslint/consistent-type-imports` 규칙 추가 권장

---

## 7. 디버깅 명령어 (참고용)

```bash
# Vite가 실제로 서빙하는 파일 확인
curl -s "http://localhost:5173/@fs/C:/MYCLAUDE_PROJECT/pdf/frontend/src/lib/documentParser.ts"

# 모든 node 프로세스 종료
cmd /c "taskkill /F /IM node.exe"

# Vite 캐시 삭제
cmd /c "cd frontend && rmdir /s /q node_modules\.vite"
```

---

*리포트 작성: Claude Code*
*최종 업데이트: 2025-12-03*
