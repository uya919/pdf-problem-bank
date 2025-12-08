# Phase 20 에러 리포트: DebugStatus Export 오류 (심층 분석)

## 에러 정보

### 에러 메시지
```
DebugPanel.tsx:10 Uncaught SyntaxError: The requested module '/src/api/debug.ts'
does not provide an export named 'DebugStatus' (at DebugPanel.tsx:10:20)
```

### 발생 시점
- Phase 20 완료 후 개발 서버 재시작 직후
- Vite 캐시 삭제 후에도 동일 에러 발생

---

## 근본 원인 분석

### 핵심 원인: `verbatimModuleSyntax: true`

**tsconfig.app.json (line 14)**
```json
{
  "compilerOptions": {
    "verbatimModuleSyntax": true,  // ← 이 설정이 원인!
    ...
  }
}
```

### `verbatimModuleSyntax`란?

TypeScript 5.0+에서 도입된 설정으로:
- **type-only exports**는 컴파일 시 완전히 제거됨
- **type-only imports**는 명시적으로 `type` 키워드를 사용해야 함
- ES 모듈 표준을 엄격하게 준수

### 문제의 코드

**debug.ts** - 인터페이스 정의 (정상)
```ts
export interface DebugStatus {      // interface는 타입이므로
  converter: ConverterInfo;         // 컴파일 시 JavaScript에서 제거됨
  environment: EnvironmentInfo;
  features: FeatureFlags;
}

export const debugApi = { ... };    // 값(value)이므로 유지됨
```

**DebugPanel.tsx** - 잘못된 import
```tsx
// ❌ 문제: 타입과 값을 같은 방식으로 import
import { debugApi, DebugStatus, TestConvertResponse } from '../api/debug';
```

### 컴파일 결과

TypeScript 컴파일 후 JavaScript:
```js
// debug.js - 컴파일 결과
export const debugApi = { ... };
// DebugStatus, TestConvertResponse는 타입이므로 완전히 제거됨!
```

```js
// DebugPanel.js - 컴파일 결과
import { debugApi, DebugStatus, TestConvertResponse } from '../api/debug';
// ↑ 런타임에 DebugStatus를 찾으려 하지만, 존재하지 않음!
```

---

## 해결 방법

### 방법 1: `type` 키워드 사용 (권장)

```tsx
// ✅ 타입 import에 type 키워드 명시
import { debugApi } from '../api/debug';
import type { DebugStatus, TestConvertResponse } from '../api/debug';
```

또는 인라인 방식:
```tsx
// ✅ 인라인 type import
import { debugApi, type DebugStatus, type TestConvertResponse } from '../api/debug';
```

### 방법 2: `verbatimModuleSyntax` 비활성화 (비권장)

```json
{
  "compilerOptions": {
    "verbatimModuleSyntax": false
  }
}
```

⚠️ 이 방법은 TypeScript 5.0+ 모범 사례에 어긋남

---

## 영향 받는 파일

| 파일 | 현재 상태 | 수정 필요 |
|------|-----------|-----------|
| `DebugPanel.tsx` | 값과 타입 혼합 import | `type` 키워드 추가 |

---

## 기술적 배경

### ES 모듈 vs TypeScript 타입

| 구분 | JavaScript 런타임 | TypeScript 컴파일 |
|------|-------------------|-------------------|
| `export const x` | 존재 | 유지 |
| `export function f` | 존재 | 유지 |
| `export interface I` | ❌ 없음 | 제거됨 |
| `export type T` | ❌ 없음 | 제거됨 |

### `verbatimModuleSyntax`의 목적

1. **명확한 의도 표현**: 타입인지 값인지 명시
2. **트리 쉐이킹 최적화**: 불필요한 import 제거
3. **ES 모듈 호환성**: 런타임 에러 방지
4. **빌드 성능**: esbuild 최적화 지원

---

## 수정 계획

### 수정 대상
```
frontend/src/components/DebugPanel.tsx (line 10)
```

### 수정 내용
```tsx
// Before
import { debugApi, DebugStatus, TestConvertResponse } from '../api/debug';

// After
import { debugApi, type DebugStatus, type TestConvertResponse } from '../api/debug';
```

---

## 예방 조치

### 1. ESLint 규칙 추가 (권장)

```json
{
  "rules": {
    "@typescript-eslint/consistent-type-imports": "error"
  }
}
```

### 2. 코드 리뷰 체크리스트

- [ ] 새 타입 import 시 `type` 키워드 사용 여부 확인
- [ ] `verbatimModuleSyntax` 환경에서 테스트

---

## 결론

- **원인**: `verbatimModuleSyntax: true` + 타입 import에 `type` 키워드 누락
- **해결**: import문에 `type` 키워드 추가
- **난이도**: 간단 (1줄 수정)
- **예방**: ESLint `consistent-type-imports` 규칙 활성화

---

*작성일: 2025-11-29*
*Phase: 20-B (Debug Panel)*
*근본 원인: TypeScript verbatimModuleSyntax 설정*
