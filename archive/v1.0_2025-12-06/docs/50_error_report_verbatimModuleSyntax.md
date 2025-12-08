# 에러 리포트: ProblemReference Export 오류

> **Phase**: 32 (작업 세션 시스템)
> **발생일**: 2025-12-03
> **심각도**: Critical (앱 실행 불가)
> **상태**: 원인 분석 완료, 수정 대기

---

## 1. 증상

### 에러 메시지
```
workSessionStore.ts:12 Uncaught SyntaxError: The requested module
'/@fs/C:/MYCLAUDE_PROJECT/pdf/frontend/src/api/client.ts'
does not provide an export named 'ProblemReference' (at workSessionStore.ts:12:28)
```

### 관찰된 행동
- 프론트엔드 앱이 로드되지 않음
- 브라우저 콘솔에 위 에러 반복
- Vite 캐시 삭제, 타입 순서 변경 등으로도 해결 안 됨

---

## 2. 근본 원인 (Root Cause)

### 핵심 발견: `verbatimModuleSyntax: true`

**tsconfig.app.json (line 14)**:
```json
{
  "compilerOptions": {
    "verbatimModuleSyntax": true,
    // ...
  }
}
```

### 이 설정의 의미

TypeScript 5.0+에서 도입된 `verbatimModuleSyntax`는 **import/export 구문을 그대로 JavaScript에 전달**합니다.

| 모드 | 동작 |
|------|------|
| `verbatimModuleSyntax: false` (기본) | TypeScript가 타입 전용 import를 자동으로 제거 |
| `verbatimModuleSyntax: true` | import 구문을 그대로 유지 → **런타임에서 해석** |

### 문제의 코드

**workSessionStore.ts (line 12)**:
```typescript
import { api, WorkSession, ProblemReference, ProblemSolutionLink } from '../api/client';
```

이 import는:
- `api` → **값(value)** - 런타임에 존재 ✅
- `WorkSession` → **타입(interface)** - 런타임에 없음 ❌
- `ProblemReference` → **타입(interface)** - 런타임에 없음 ❌
- `ProblemSolutionLink` → **타입(interface)** - 런타임에 없음 ❌

### 왜 에러가 발생하는가?

```
┌────────────────────────────────────────────────────────────────────┐
│  1. TypeScript 컴파일                                              │
│     - verbatimModuleSyntax가 켜져 있음                             │
│     - import { ProblemReference } 구문을 그대로 유지               │
│                                                                    │
│  2. Vite/esbuild 번들링                                            │
│     - client.ts를 ESM으로 변환                                     │
│     - interface는 JavaScript에서 사라짐 (타입만 존재)              │
│     - export 목록에 ProblemReference가 없음                        │
│                                                                    │
│  3. 브라우저 런타임                                                 │
│     - import { ProblemReference } 실행 시도                        │
│     - 해당 export가 없음 → SyntaxError                             │
└────────────────────────────────────────────────────────────────────┘
```

### 비교: 올바른 import

**WorkSessionMatchingPage.tsx (line 26)** - 정상 동작:
```typescript
import type { ProblemGroup, ProblemInfo, ProblemReference } from '@/api/client';
```

`import type`을 사용하면:
- TypeScript가 컴파일 타임에 타입 검사 수행
- 변환된 JavaScript에는 이 import가 **포함되지 않음**
- 런타임 에러 없음

---

## 3. 해결 방안

### 방법 A: import 분리 (권장)

```typescript
// Before (에러)
import { api, WorkSession, ProblemReference, ProblemSolutionLink } from '../api/client';

// After (수정)
import { api } from '../api/client';
import type { WorkSession, ProblemReference, ProblemSolutionLink } from '../api/client';
```

### 방법 B: 인라인 타입 import

```typescript
import { api, type WorkSession, type ProblemReference, type ProblemSolutionLink } from '../api/client';
```

### 방법 C: verbatimModuleSyntax 비활성화 (비권장)

```json
// tsconfig.app.json
{
  "compilerOptions": {
    "verbatimModuleSyntax": false  // 또는 삭제
  }
}
```

**주의**: 방법 C는 프로젝트 전체에 영향을 미치며, 향후 타입 관련 import 문제를 숨길 수 있어 권장하지 않음.

---

## 4. 영향 받는 파일

### 즉시 수정 필요

| 파일 | 라인 | 문제 |
|------|------|------|
| `stores/workSessionStore.ts` | 12 | `import { api, WorkSession, ProblemReference, ProblemSolutionLink }` |

### 잠재적 위험 파일 (확인 필요)

전체 프로젝트에서 value import로 타입을 가져오는 파일이 있는지 추가 검사 필요:
```bash
grep -r "import {.*}" --include="*.ts" --include="*.tsx" src/
```

---

## 5. 왜 이전 수정들이 실패했는가?

### 시도 1: Vite 캐시 삭제
- `node_modules/.vite` 폴더 삭제
- **실패 이유**: 캐시는 문제가 아니었음. 소스 코드 자체가 문제.

### 시도 2: 타입 정의 순서 변경
- `ProblemReference`를 `WorkSession`보다 먼저 정의
- **실패 이유**: 순서는 TypeScript 타입 해석에만 영향. `verbatimModuleSyntax`로 인한 런타임 문제는 해결 안 됨.

---

## 6. 추가 분석

### tsconfig.app.json 주요 설정

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "verbatimModuleSyntax": true,      // ← 핵심 원인
    "erasableSyntaxOnly": true,        // ← 관련 설정
    "strict": true
  }
}
```

### `erasableSyntaxOnly: true`의 역할

TypeScript 5.8+에서 도입된 이 설정은:
- 런타임에 "지워질 수 있는" 구문만 허용
- `import type`과 함께 사용하면 더 엄격한 타입 전용 import 강제

### Vite의 TypeScript 처리 방식

```
                  TypeScript Source
                        │
                        ▼
            ┌───────────────────────┐
            │      esbuild          │ ← TypeScript 변환 (타입 제거)
            │  (Vite dev server)    │
            └───────────────────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │   ESM Module Output   │ ← interface 정의 사라짐
            └───────────────────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │      Browser          │ ← import { X } 실행 시 에러
            └───────────────────────┘
```

---

## 7. 권장 조치

### 즉시 (Critical)

1. **workSessionStore.ts 수정**
   - Line 12의 import를 value와 type으로 분리

### 단기 (Important)

2. **전체 프로젝트 검사**
   - 다른 파일에서도 동일한 패턴이 있는지 확인
   - ESLint 규칙 추가 고려: `@typescript-eslint/consistent-type-imports`

### 장기 (Nice to have)

3. **개발 가이드 업데이트**
   - CLAUDE.md에 타입 import 규칙 추가
   - PR 리뷰 시 체크리스트 항목 추가

---

## 8. 결론

| 항목 | 내용 |
|------|------|
| **근본 원인** | `verbatimModuleSyntax: true` + value import for interfaces |
| **문제 파일** | `stores/workSessionStore.ts:12` |
| **해결책** | `import type` 사용하여 타입과 값 import 분리 |
| **예상 수정 시간** | 5분 |
| **위험도** | 낮음 (단순 import 구문 변경) |

---

*리포트 작성: Claude Code (Opus)*
*마지막 업데이트: 2025-12-03*
