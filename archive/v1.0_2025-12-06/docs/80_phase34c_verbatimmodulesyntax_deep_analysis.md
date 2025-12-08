# Phase 34-C: CoursesConfig Export 에러 - 심층 분석 리포트

**작성일**: 2025-12-03
**심각도**: Critical (기능 완전 차단)
**상태**: 근본 원인 발견

---

## 1. 에러 현상

### 에러 메시지
```
Uncaught SyntaxError: The requested module
'/@fs/C:/MYCLAUDE_PROJECT/pdf/frontend/src/api/client.ts'
does not provide an export named 'CoursesConfig'
(at UploadNamingModal.tsx:14:15)
```

### 문제 코드
```typescript
// UploadNamingModal.tsx:14
import { api, CoursesConfig } from '../../api/client';
```

### 중요한 사실
- TypeScript 컴파일 (`npx tsc --noEmit`): **성공**
- 브라우저 런타임: **실패**
- Vite 캐시 클리어 후에도: **동일 에러**

---

## 2. 근본 원인: TypeScript 5.0+ 엄격 모드 설정

### 2.1 핵심 설정 발견

**파일**: `frontend/tsconfig.app.json`

```json
{
  "compilerOptions": {
    "verbatimModuleSyntax": true,   // ← 핵심 원인 #1
    "erasableSyntaxOnly": true,     // ← 핵심 원인 #2
    // ...
  }
}
```

### 2.2 설정 의미

#### `verbatimModuleSyntax: true` (TypeScript 5.0+)
> **"모듈 구문을 있는 그대로 유지하라"**

이 설정이 활성화되면:
- **타입 전용 import**는 반드시 `import type` 구문을 사용해야 함
- 일반 `import`로 타입을 가져오면 **런타임에서 해당 export를 찾으려 함**
- 하지만 TypeScript interface는 컴파일 시 **완전히 삭제됨** (erasable)
- 결과: 런타임에서 해당 export가 존재하지 않음 → 에러

#### `erasableSyntaxOnly: true` (TypeScript 5.7+)
> **"지울 수 있는 구문만 허용하라"**

이 설정은 `verbatimModuleSyntax`를 더 엄격하게 강제함.

### 2.3 에러 발생 메커니즘

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. 소스 코드 (TypeScript)                                       │
├─────────────────────────────────────────────────────────────────┤
│ // client.ts                                                    │
│ export interface CoursesConfig { ... }  // 타입 정의            │
│ export const api = { ... }               // 값 정의             │
│                                                                 │
│ // UploadNamingModal.tsx                                        │
│ import { api, CoursesConfig } from './client';                  │
│         ↑      ↑                                                │
│         값     타입 (하지만 값처럼 import됨!)                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. esbuild 변환 (Vite 내부)                                     │
├─────────────────────────────────────────────────────────────────┤
│ // client.js (변환 후)                                          │
│ // interface CoursesConfig는 완전히 삭제됨!                     │
│ export const api = { ... }               // 값만 남음           │
│                                                                 │
│ // UploadNamingModal.js (변환 후)                               │
│ import { api, CoursesConfig } from './client';                  │
│                ↑                                                │
│                이 export가 존재하지 않음!                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. 브라우저 ESM 로더                                            │
├─────────────────────────────────────────────────────────────────┤
│ "client.js에서 'CoursesConfig' export를 찾을 수 없음!"          │
│                                                                 │
│ → SyntaxError 발생                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 왜 TypeScript 컴파일은 성공하는가?

TypeScript 컴파일러(`tsc`)는 **타입 검사만** 수행하고 **JavaScript 출력은 하지 않음** (`noEmit: true`).

```
tsc --noEmit
  ↓
타입 검사 수행 (interface 포함)
  ↓
✅ 성공 (코드 문법상 문제 없음)
```

반면 Vite/esbuild는:
```
esbuild (런타임 변환)
  ↓
TypeScript → JavaScript 변환
  ↓
interface는 삭제됨
  ↓
import 문의 CoursesConfig가 존재하지 않음
  ↓
❌ 런타임 에러
```

---

## 4. 다른 interface는 왜 동작하는가?

### 4.1 현재 client.ts의 다른 export들

```typescript
// 이것들도 interface인데?
export interface Document { ... }
export interface UploadResponse { ... }
export interface ProblemGroup { ... }
```

### 4.2 차이점 분석

**다른 곳에서의 import 방식 확인 필요:**

만약 다른 파일에서:
```typescript
// 방법 1: 타입으로만 사용 (문제 없음)
const data: Document = await api.getDocument(id);
//          ↑ 타입 위치에서만 사용

// 방법 2: 값처럼 import (문제 발생 가능)
import { Document } from './client';  // ← 이것도 문제일 수 있음
```

**핵심**: `verbatimModuleSyntax: true`에서는 **모든 타입 import**가 `import type`이어야 함.

기존 코드가 동작한다면:
1. 해당 interface가 타입 위치에서만 사용되어 esbuild가 자동으로 제거했거나
2. 해당 import가 다른 방식으로 되어있거나
3. 해당 파일이 아직 로드되지 않았을 수 있음

---

## 5. 해결 방법

### 방법 A: `import type` 사용 (권장)

```typescript
// Before (에러)
import { api, CoursesConfig } from '../../api/client';

// After (수정)
import { api } from '../../api/client';
import type { CoursesConfig } from '../../api/client';
```

### 방법 B: 인라인 type modifier 사용 (TypeScript 4.5+)

```typescript
// 한 줄로 값과 타입을 구분
import { api, type CoursesConfig } from '../../api/client';
```

### 방법 C: tsconfig 설정 변경 (비권장)

```json
{
  "compilerOptions": {
    "verbatimModuleSyntax": false,  // 엄격 모드 비활성화
    "erasableSyntaxOnly": false
  }
}
```

⚠️ **비권장 이유**: 이 설정들은 TypeScript 모범 사례를 강제하며, 비활성화하면 다른 잠재적 문제가 발생할 수 있음.

---

## 6. 영향 범위 분석

### 6.1 현재 프로젝트에서 같은 패턴 검색

다음 패턴을 가진 모든 파일이 잠재적 문제:
```typescript
import { someValue, SomeType } from './module';
//       ↑값        ↑타입 (interface/type)
```

### 6.2 확인 필요 파일

```bash
# 모든 client.ts import를 검색
grep -r "from.*client" frontend/src --include="*.tsx" --include="*.ts"
```

---

## 7. 왜 이제서야 발생했는가?

### 7.1 타임라인

1. **이전**: `client.ts`의 interface들은 존재했지만, `UploadNamingModal.tsx`에서 직접 import하지 않았음
2. **Phase 34-C**: `CoursesConfig` interface 추가 + `UploadNamingModal.tsx`에서 직접 import
3. **에러 발생**: 새로 추가된 import가 `verbatimModuleSyntax` 규칙 위반

### 7.2 기존 코드가 문제없던 이유

기존에 `client.ts`에서 타입을 import하는 경우:
```typescript
// 예: hooks/useDocuments.ts
import { api } from '../api/client';
// 타입은 import하지 않고 인라인으로 사용
const data = await api.getDocuments(); // 타입 추론으로 처리
```

또는:
```typescript
// 예: 일부 컴포넌트
import type { ProblemGroup } from '../api/client';  // 이미 올바른 방식
```

---

## 8. 프로젝트 전체 점검 권장

### 8.1 전체 검사 스크립트

```bash
# client.ts에서 interface를 값처럼 import하는 모든 케이스 찾기
grep -rn "import {[^}]*[A-Z][a-zA-Z]*[^}]*} from.*client" frontend/src \
  --include="*.tsx" --include="*.ts" | \
  grep -v "import type"
```

### 8.2 자동 수정 도구

ESLint + `@typescript-eslint/consistent-type-imports` 규칙을 활성화하면 자동으로 감지/수정 가능:

```json
// .eslintrc.js
{
  "rules": {
    "@typescript-eslint/consistent-type-imports": [
      "error",
      { "prefer": "type-imports" }
    ]
  }
}
```

---

## 9. 결론

### 근본 원인
`tsconfig.app.json`의 `verbatimModuleSyntax: true` 설정으로 인해, TypeScript interface를 일반 `import`로 가져오면 런타임에서 해당 export를 찾지 못함.

### 해결책
```typescript
// UploadNamingModal.tsx 수정
import { api } from '../../api/client';
import type { CoursesConfig } from '../../api/client';

// 또는
import { api, type CoursesConfig } from '../../api/client';
```

### 예방책
- ESLint `@typescript-eslint/consistent-type-imports` 규칙 활성화
- 코드 리뷰 시 타입 import 방식 확인

---

## 10. 참고 자료

- [TypeScript 5.0: verbatimModuleSyntax](https://www.typescriptlang.org/tsconfig#verbatimModuleSyntax)
- [TypeScript 5.7: erasableSyntaxOnly](https://devblogs.microsoft.com/typescript/announcing-typescript-5-7/#the---erasablesyntaxonly-option)
- [Vite + TypeScript: Type-Only Imports](https://vitejs.dev/guide/features.html#typescript)

---

*이 에러는 TypeScript 5.0+의 엄격한 모듈 구문 설정과 Vite/esbuild의 타입 삭제 동작 사이의 불일치로 발생합니다.*
