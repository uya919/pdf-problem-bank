# Phase 34.5 심층 연구 리포트: verbatimModuleSyntax와 타입 시스템

> **작성일**: 2025-12-03
> **상태**: 연구 완료
> **작성자**: Claude Code (Opus)
> **키워드**: verbatimModuleSyntax, import type, TypeScript 5.0, Vite, ESM

---

## 1. Executive Summary

### 문제 요약
프론트엔드 앱이 런타임에서 "does not provide an export named 'X'" 에러로 완전히 실패합니다.

### 근본 원인
`tsconfig.app.json`의 `verbatimModuleSyntax: true` 설정이 TypeScript의 타입 시스템과 Vite/esbuild의 트랜스파일링 간에 불일치를 유발합니다.

### 핵심 발견
1. TypeScript 컴파일(`tsc --noEmit`)은 성공하지만 런타임에서 실패
2. Vite/esbuild는 모든 `interface`와 `type`을 **완전히 제거**
3. `import { SomeType }` 구문은 런타임에서 존재하지 않는 export를 찾으려 함
4. 해결책: 모든 타입 전용 import를 `import type` 구문으로 변경

---

## 2. 기술적 배경

### 2.1 verbatimModuleSyntax란?

TypeScript 5.0에서 도입된 설정으로, 모듈 구문을 "있는 그대로" 유지합니다.

```json
{
  "compilerOptions": {
    "verbatimModuleSyntax": true
  }
}
```

**이 설정의 의미:**
- `import type`으로 가져온 것만 타입으로 인식
- 일반 `import`는 런타임 값으로 취급
- 타입과 값의 구분을 **명시적으로 강제**

### 2.2 이전 방식과의 차이

| 설정 | 동작 | TypeScript 버전 |
|------|------|-----------------|
| `isolatedModules` | 경고만 표시 | 3.x - 4.x |
| `verbatimModuleSyntax` | **엄격하게 강제** | 5.0+ |

### 2.3 Vite/esbuild의 트랜스파일링

Vite는 esbuild를 사용하여 TypeScript를 JavaScript로 변환합니다:

```typescript
// 원본 TypeScript
export interface DocumentCombo { id: string; }
export function parseDoc() { return {}; }
```

```javascript
// Vite가 서빙하는 JavaScript (런타임)
export function parseDoc() { return {}; }
// DocumentCombo는 완전히 사라짐!
```

---

## 3. 에러 발생 메커니즘

### 3.1 흐름도

```
┌──────────────────────────────────────────────────────────────────┐
│  1. 소스 코드 작성                                               │
│     export interface Foo { ... }                                 │
│     export function bar() { ... }                                │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  2. TypeScript 컴파일 (tsc --noEmit)                             │
│     ✅ 성공 - 타입 체크만 수행                                   │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  3. Vite/esbuild 트랜스파일                                      │
│     - interface Foo → 삭제됨                                     │
│     - function bar → 유지됨                                      │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  4. 브라우저 런타임                                              │
│     import { Foo, bar } from './module';                         │
│     ❌ Foo를 찾을 수 없음!                                       │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 TypeScript가 에러를 못 잡는 이유

TypeScript 컴파일러는 타입 정보를 가지고 있으므로:
- `import { Foo }` → Foo가 interface임을 앎 → 타입 체크 통과
- 하지만 런타임 코드 생성 시 Vite가 처리하므로 TypeScript는 관여 안 함

**결과**: 컴파일은 성공, 런타임에서 실패

---

## 4. 현재 코드베이스 분석

### 4.1 문제가 있는 Import 패턴들

#### 패턴 A: 타입만 import (가장 흔함)
```typescript
// ❌ 문제 있음
import { DocumentCombo } from '../../lib/documentParser';

// ✅ 올바른 방법
import type { DocumentCombo } from '../../lib/documentParser';
```

#### 패턴 B: 타입과 값을 함께 import
```typescript
// ❌ 문제 있음
import { DocumentCombo, parseDocumentName } from '../../lib/documentParser';

// ✅ 올바른 방법 (분리)
import { parseDocumentName } from '../../lib/documentParser';
import type { DocumentCombo } from '../../lib/documentParser';

// ✅ 또는 인라인 타입
import { parseDocumentName, type DocumentCombo } from '../../lib/documentParser';
```

#### 패턴 C: Hook에서 타입과 함수 함께 export
```typescript
// useRecentUsed.ts
export interface RecentUsedItem { ... }  // 타입
export function useRecentUsed() { ... }  // 값

// 사용처
// ❌ 문제 있음
import { useRecentUsed, RecentUsedItem } from './useRecentUsed';

// ✅ 올바른 방법
import { useRecentUsed } from './useRecentUsed';
import type { RecentUsedItem } from './useRecentUsed';
```

### 4.2 영향받는 파일 목록 (Phase 34.5 신규 파일)

| # | 파일 | 문제 import | 수정 필요 |
|---|------|-------------|-----------|
| 1 | `QuickStartCard.tsx` | `{ RecentUsedItem }` | `type { RecentUsedItem }` |
| 2 | `RecentUsedSection.tsx` | `{ RecentUsedItem }` | `type { RecentUsedItem }` |
| 3 | `HeroSection.tsx` | `{ useRecentUsed, RecentUsedItem }` | 분리 필요 |
| 4 | `SmartSearchBox.tsx` | ✅ 수정 완료 | - |
| 5 | `SearchResultItem.tsx` | ✅ 수정 완료 | - |
| 6 | `SchoolTabs.tsx` | ✅ 수정 완료 | - |
| 7 | `SeriesGrid.tsx` | ✅ 수정 완료 | - |
| 8 | `BrowseAllSection.tsx` | ✅ 수정 완료 | - |
| 9 | `GradeCourseSelector.tsx` | ✅ 수정 완료 | - |
| 10 | `useDocumentSearch.ts` | ✅ 수정 완료 | - |
| 11 | `useDocumentIndex.ts` | ✅ 수정 완료 | - |

### 4.3 기존 코드베이스의 잠재적 문제 파일

grep 분석 결과, 다음 파일들도 같은 패턴을 사용:

```
components/unified/ProblemListPanel.tsx
  → import { useMatchingStore, type ProblemItem }  (이미 올바름!)

pages/IntegratedProblemBankPage.tsx
  → import { hangulApi, type ProblemDetail, ... }  (이미 올바름!)
```

**발견**: 일부 기존 파일은 이미 `type` 키워드를 사용 중. 새 파일들만 문제.

---

## 5. 코드베이스 최적화 제안

### 5.1 권장 Import 패턴

```typescript
// 1. 타입만 import할 때
import type { SomeType } from './module';

// 2. 타입과 값을 함께 import할 때 (권장: 인라인)
import { someFunction, type SomeType } from './module';

// 3. 타입과 값을 함께 import할 때 (대안: 분리)
import { someFunction } from './module';
import type { SomeType } from './module';
```

### 5.2 타입 전용 모듈 분리 (선택적)

큰 프로젝트에서는 타입을 별도 파일로 분리:

```
src/
├── lib/
│   ├── documentParser.ts       # 함수만
│   └── documentParser.types.ts # 타입만
└── types/
    └── document.ts             # 공통 타입
```

**장점:**
- Import 구문이 명확해짐
- 순환 참조 방지
- 번들 크기 최적화

**현재 프로젝트에서는**: 파일 수가 적으므로 인라인 `type` 키워드로 충분

### 5.3 ESLint 규칙 추가 (예방)

```json
// .eslintrc.json
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

## 6. 수정 계획

### Phase 1: 즉시 수정 (3개 파일)

| 파일 | 변경 내용 |
|------|-----------|
| `QuickStartCard.tsx` | `import type { RecentUsedItem }` |
| `RecentUsedSection.tsx` | `import type { RecentUsedItem }` |
| `HeroSection.tsx` | `useRecentUsed`와 `RecentUsedItem` 분리 |

### Phase 2: 검증

1. `npx tsc --noEmit` - TypeScript 컴파일 확인
2. Vite 서버 재시작
3. 브라우저 테스트

### Phase 3: 예방 조치 (선택)

1. ESLint `consistent-type-imports` 규칙 추가
2. 개발 가이드 문서 업데이트

---

## 7. 체크리스트

### 즉시 수정 필요

- [ ] `QuickStartCard.tsx` - `import type { RecentUsedItem }`
- [ ] `RecentUsedSection.tsx` - `import type { RecentUsedItem }`
- [ ] `HeroSection.tsx` - import 분리

### 검증

- [ ] TypeScript 컴파일 성공
- [ ] Vite 서버 정상 시작
- [ ] 브라우저에서 페이지 로드 성공
- [ ] 검색 기능 동작 확인
- [ ] 최근 사용 섹션 표시 확인

---

## 8. 결론

### 핵심 교훈

1. **verbatimModuleSyntax는 엄격함**: TypeScript 5.0+에서 타입/값 구분을 강제
2. **컴파일 성공 ≠ 런타임 성공**: Vite/esbuild는 별도로 트랜스파일
3. **import type은 필수**: 타입만 가져올 때는 반드시 `import type` 사용
4. **기존 코드 참고**: `ProblemListPanel.tsx` 등은 이미 올바른 패턴 사용 중

### 향후 개발 시

```typescript
// 항상 이렇게!
import { someFunction, type SomeType } from './module';

// 또는 이렇게!
import { someFunction } from './module';
import type { SomeType } from './module';
```

---

*리포트 작성: Claude Code (Opus)*
*최종 업데이트: 2025-12-03*
