# Phase 34-C-Fix: verbatimModuleSyntax 에러 수정 계획

**작성일**: 2025-12-03
**근거 문서**: [80_phase34c_verbatimmodulesyntax_deep_analysis.md](80_phase34c_verbatimmodulesyntax_deep_analysis.md)

---

## 1. 문제 요약

### 에러
```
The requested module '...client.ts' does not provide an export named 'CoursesConfig'
```

### 원인
`tsconfig.app.json`의 `verbatimModuleSyntax: true` 설정으로 인해, TypeScript interface를 일반 `import`로 가져오면 런타임에서 해당 export를 찾지 못함.

### 해결책
```typescript
// Before (에러)
import { api, CoursesConfig } from '../../api/client';

// After (수정)
import { api, type CoursesConfig } from '../../api/client';
```

---

## 2. 단계별 수정 계획

### Step 1: UploadNamingModal.tsx 수정 (즉시)

**파일**: `frontend/src/components/main/UploadNamingModal.tsx`

**변경**:
```typescript
// Line 14
// Before
import { api, CoursesConfig } from '../../api/client';

// After
import { api, type CoursesConfig } from '../../api/client';
```

**예상 시간**: 1분

---

### Step 2: 동일 패턴 전체 검색

**목적**: 프로젝트 전체에서 같은 문제가 있는 파일 찾기

**검색 대상**: `client.ts`에서 interface를 값처럼 import하는 모든 케이스

**검색 패턴**:
- `import { ... SomeInterface ... } from '...client'`
- interface 이름은 대문자로 시작

**예상 시간**: 5분

---

### Step 3: 발견된 파일들 수정

각 파일에서:
```typescript
// Before
import { api, SomeInterface } from '...client';

// After
import { api, type SomeInterface } from '...client';
```

**예상 시간**: 파일당 1분

---

### Step 4: TypeScript 컴파일 확인

```bash
cd frontend
npx tsc --noEmit
```

**예상 결과**: 에러 없음

**예상 시간**: 1분

---

### Step 5: 브라우저 테스트

1. Vite 개발 서버 실행 확인
2. http://localhost:5173 접속
3. PDF 업로드 모달 열기
4. 과정 선택 드롭다운 확인
5. "새 과정 추가" 기능 테스트

**예상 시간**: 3분

---

### Step 6: (선택) ESLint 규칙 추가

**목적**: 향후 같은 실수 방지

**파일**: `frontend/.eslintrc.cjs` 또는 `eslint.config.js`

**추가 규칙**:
```javascript
rules: {
  '@typescript-eslint/consistent-type-imports': [
    'error',
    { prefer: 'type-imports' }
  ]
}
```

**예상 시간**: 10분 (설정 + 기존 코드 자동 수정)

---

## 3. 체크리스트

```
[ ] Step 1: UploadNamingModal.tsx 수정
[ ] Step 2: 동일 패턴 전체 검색
[ ] Step 3: 발견된 파일들 수정
[ ] Step 4: TypeScript 컴파일 확인
[ ] Step 5: 브라우저 테스트
[ ] Step 6: (선택) ESLint 규칙 추가
```

---

## 4. 예상 총 소요 시간

| 단계 | 시간 |
|------|------|
| Step 1 | 1분 |
| Step 2 | 5분 |
| Step 3 | 5분 (최대 5개 파일 가정) |
| Step 4 | 1분 |
| Step 5 | 3분 |
| Step 6 | 10분 (선택) |
| **합계** | **15분** (Step 6 제외) |

---

## 5. 수정 후 검증 포인트

### 5.1 기능 검증
- [ ] PDF 업로드 모달 정상 열림
- [ ] 과정 목록이 API에서 로드됨
- [ ] "새 과정 추가" 클릭 시 입력 폼 표시
- [ ] 과정 추가 후 드롭다운에 반영

### 5.2 에러 없음 확인
- [ ] 브라우저 콘솔에 SyntaxError 없음
- [ ] TypeScript 컴파일 성공
- [ ] Vite HMR 정상 작동

---

## 6. 롤백 계획

만약 수정 후에도 문제가 있다면:

### 옵션 A: tsconfig 설정 완화 (임시)
```json
// tsconfig.app.json
{
  "compilerOptions": {
    "verbatimModuleSyntax": false
  }
}
```

### 옵션 B: CoursesConfig를 직접 정의
```typescript
// UploadNamingModal.tsx
interface CoursesConfig {
  defaultCourses: Record<string, string[]>;
  customCourses: Record<string, string[]>;
}
```

---

*승인 시 "Step 1 진행해줘"로 실행*
