# Phase 19-C: 프론트엔드 LaTeX 통합 구현 계획

**작성일**: 2025-11-28
**Phase**: 19-C (프론트엔드 LaTeX 렌더링)
**상태**: 계획 단계

---

## 1. 현황 분석

### 1.1 백엔드 (완료)
Phase 19-C 백엔드 LaTeX 변환이 완료되어 HML 파싱 시 다음 필드가 생성됨:

| 필드 | 설명 | 예시 |
|-----|------|------|
| `content_latex` | LaTeX 포함 본문 (`$...$` 형태) | `부등식 $\left| x-5 \right| < 3$의 해` |
| `content_equations_latex` | 변환된 수식 목록 | `["\\frac{5}{4}", "\\sqrt{x+1}"]` |
| `answer_latex` | LaTeX 형식 정답 | `$\\frac{5}{4}$` |

### 1.2 프론트엔드 현황

#### MathDisplay.tsx (이미 생성됨)
- 위치: `frontend/src/components/MathDisplay.tsx`
- KaTeX 기반 수식 렌더링 컴포넌트
- 사용 가능한 컴포넌트:
  - `MathDisplay`: 인라인 `$...$` 패턴 자동 감지
  - `Math`: 순수 수식 렌더링
  - `MathBlock`: 블록 수식 렌더링

#### 수정 필요한 파일

| 파일 | 역할 | 수정 필요 위치 |
|------|------|---------------|
| `api/hangul.ts` | API 타입 정의 | 인터페이스 추가 |
| `pages/HangulUploadPage.tsx` | 업로드 후 미리보기 | 5개 위치 |
| `pages/IntegratedProblemBankPage.tsx` | 문제은행 표시 | 6개 위치 |

---

## 2. 데이터 흐름 분석

```
[백엔드 HML Parser]
       ↓
  ParsedProblem {
    content_text       (원본 텍스트)
    content_latex      (LaTeX 포함 텍스트)  ← NEW
    content_equations  (원본 HWP 수식)
    content_equations_latex (LaTeX 수식)   ← NEW
    answer            (원본 정답)
    answer_latex      (LaTeX 정답)         ← NEW
  }
       ↓
[API Response]
       ↓
[Frontend hangul.ts Types]
       ↓
[React Components]
       ↓
[MathDisplay → KaTeX]
       ↓
[사용자 화면 (수식 렌더링)]
```

---

## 3. 상세 구현 계획

### Step 1: API 타입 정의 업데이트

**파일**: `frontend/src/api/hangul.ts`

#### 1.1 ParsedProblem 인터페이스 수정 (라인 8-19)

**현재 코드**:
```typescript
export interface ParsedProblem {
  id: string;
  number: string;
  content_text: string;
  content_images: string[];
  content_equations: string[];
  answer: string | null;
  answer_type: 'choice' | 'value' | 'expression' | 'unknown' | null;
  explanation: string | null;
  points: number | null;
}
```

**수정 후 코드**:
```typescript
export interface ParsedProblem {
  id: string;
  number: string;
  content_text: string;
  content_latex: string;                    // NEW: LaTeX 포함 텍스트
  content_images: string[];
  content_equations: string[];
  content_equations_latex: string[];        // NEW: LaTeX 변환 수식
  answer: string | null;
  answer_latex: string | null;              // NEW: LaTeX 형식 정답
  answer_type: 'choice' | 'value' | 'expression' | 'unknown' | null;
  explanation: string | null;
  points: number | null;
}
```

#### 1.2 ProblemDetail 인터페이스 수정 (라인 72-104)

**추가할 필드**:
```typescript
export interface ProblemDetail {
  // ... 기존 필드들 ...
  content_latex: string;                    // NEW
  content_equations_latex: string[];        // NEW
  // ... answer_data 내부에 answer_latex 추가 ...
  answer_data?: {
    id: string;
    problem_id: string;
    answer: string;
    answer_latex: string | null;            // NEW
    answer_type: string;
    created_at: string;
  };
}
```

---

### Step 2: HangulUploadPage.tsx 수정

**파일**: `frontend/src/pages/HangulUploadPage.tsx`

#### 2.1 MathDisplay 임포트 추가 (라인 24 부근)

```typescript
import { MathDisplay } from '../components/MathDisplay';
```

#### 2.2 ProblemPreviewCard 내 미리보기 수정 (라인 182-185)

**현재 코드**:
```tsx
{/* Preview */}
<p className="mt-2 text-sm text-gray-600 line-clamp-2">
  {problem.content_text || '(내용 없음)'}
</p>
```

**수정 후 코드**:
```tsx
{/* Preview - LaTeX 렌더링 */}
<div className="mt-2 text-sm text-gray-600 line-clamp-2">
  <MathDisplay
    latex={problem.content_latex || problem.content_text || '(내용 없음)'}
  />
</div>
```

#### 2.3 확장된 전체 내용 수정 (라인 190-195)

**현재 코드**:
```tsx
<div>
  <h4 className="text-xs font-medium uppercase text-gray-500">전체 내용</h4>
  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
    {problem.content_text || '(내용 없음)'}
  </p>
</div>
```

**수정 후 코드**:
```tsx
<div>
  <h4 className="text-xs font-medium uppercase text-gray-500">전체 내용</h4>
  <div className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
    <MathDisplay
      latex={problem.content_latex || problem.content_text || '(내용 없음)'}
    />
  </div>
</div>
```

#### 2.4 정답 표시 수정 (라인 197-208)

**현재 코드**:
```tsx
{problem.answer && (
  <div>
    <h4 className="text-xs font-medium uppercase text-gray-500">정답</h4>
    <p className="mt-1 text-sm font-medium text-green-700">
      {problem.answer}
      {problem.answer_type && (
        <span className="ml-2 text-xs text-gray-500">
          ({problem.answer_type})
        </span>
      )}
    </p>
  </div>
)}
```

**수정 후 코드**:
```tsx
{problem.answer && (
  <div>
    <h4 className="text-xs font-medium uppercase text-gray-500">정답</h4>
    <div className="mt-1 text-sm font-medium text-green-700">
      <MathDisplay latex={problem.answer_latex || problem.answer} />
      {problem.answer_type && (
        <span className="ml-2 text-xs text-gray-500">
          ({problem.answer_type})
        </span>
      )}
    </div>
  </div>
)}
```

#### 2.5 해설 표시 수정 (라인 211-218)

**현재 코드**:
```tsx
{problem.explanation && (
  <div>
    <h4 className="text-xs font-medium uppercase text-gray-500">해설</h4>
    <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
      {problem.explanation}
    </p>
  </div>
)}
```

**수정 후 코드**:
```tsx
{problem.explanation && (
  <div>
    <h4 className="text-xs font-medium uppercase text-gray-500">해설</h4>
    <div className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
      <MathDisplay latex={problem.explanation} />
    </div>
  </div>
)}
```

#### 2.6 수식 목록 표시 수정 (라인 220-229)

**현재 코드**:
```tsx
{problem.content_equations.length > 0 && (
  <div>
    <h4 className="text-xs font-medium uppercase text-gray-500">수식</h4>
    <ul className="mt-1 list-inside list-disc text-sm text-gray-700">
      {problem.content_equations.map((eq, i) => (
        <li key={i}>{eq}</li>
      ))}
    </ul>
  </div>
)}
```

**수정 후 코드**:
```tsx
{(problem.content_equations_latex?.length > 0 || problem.content_equations.length > 0) && (
  <div>
    <h4 className="text-xs font-medium uppercase text-gray-500">수식</h4>
    <div className="mt-1 flex flex-wrap gap-2">
      {(problem.content_equations_latex || problem.content_equations).map((eq, i) => (
        <code key={i} className="px-2 py-1 bg-blue-50 text-blue-800 rounded text-sm">
          <MathDisplay latex={`$${eq}$`} />
        </code>
      ))}
    </div>
  </div>
)}
```

---

### Step 3: IntegratedProblemBankPage.tsx 수정

**파일**: `frontend/src/pages/IntegratedProblemBankPage.tsx`

#### 3.1 MathDisplay 임포트 추가 (라인 27 부근)

```typescript
import { MathDisplay } from '../components/MathDisplay';
```

#### 3.2 ProblemCard 미리보기 수정 (라인 307-310)

**현재 코드**:
```tsx
{/* Content Preview */}
<div className="text-sm text-gray-700 line-clamp-3 min-h-[3.75rem] mb-3">
  {problem.content_text || '(내용 없음)'}
</div>
```

**수정 후 코드**:
```tsx
{/* Content Preview - LaTeX 렌더링 */}
<div className="text-sm text-gray-700 line-clamp-3 min-h-[3.75rem] mb-3">
  <MathDisplay
    latex={problem.content_latex || problem.content_text || '(내용 없음)'}
  />
</div>
```

#### 3.3 ProblemDetailModal 문제 내용 수정 (라인 427-433)

**현재 코드**:
```tsx
{/* Problem Content */}
<div>
  <h3 className="text-sm font-semibold text-gray-700 mb-2">문제</h3>
  <div className="p-4 bg-gray-50 rounded-lg whitespace-pre-wrap text-gray-800">
    {displayProblem.content_text || '(문제 내용 없음)'}
  </div>
</div>
```

**수정 후 코드**:
```tsx
{/* Problem Content - LaTeX 렌더링 */}
<div>
  <h3 className="text-sm font-semibold text-gray-700 mb-2">문제</h3>
  <div className="p-4 bg-gray-50 rounded-lg whitespace-pre-wrap text-gray-800">
    <MathDisplay
      latex={displayProblem.content_latex || displayProblem.content_text || '(문제 내용 없음)'}
    />
  </div>
</div>
```

#### 3.4 수식 섹션 수정 (라인 435-447)

**현재 코드**:
```tsx
{/* Equations */}
{displayProblem.content_equations && displayProblem.content_equations.length > 0 && (
  <div>
    <h3 className="text-sm font-semibold text-gray-700 mb-2">수식</h3>
    <div className="flex flex-wrap gap-2">
      {displayProblem.content_equations.map((eq, i) => (
        <code key={i} className="px-2 py-1 bg-blue-50 text-blue-800 rounded text-sm">
          {eq}
        </code>
      ))}
    </div>
  </div>
)}
```

**수정 후 코드**:
```tsx
{/* Equations - LaTeX 렌더링 */}
{(displayProblem.content_equations_latex?.length > 0 || displayProblem.content_equations?.length > 0) && (
  <div>
    <h3 className="text-sm font-semibold text-gray-700 mb-2">수식</h3>
    <div className="flex flex-wrap gap-2">
      {(displayProblem.content_equations_latex || displayProblem.content_equations).map((eq, i) => (
        <code key={i} className="px-2 py-1 bg-blue-50 text-blue-800 rounded text-sm">
          <MathDisplay latex={`$${eq}$`} />
        </code>
      ))}
    </div>
  </div>
)}
```

#### 3.5 정답 섹션 수정 (라인 449-467)

**현재 코드**:
```tsx
{/* Answer */}
{displayProblem.answer_data && (
  <div>
    <h3 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-1">
      <CheckCircle className="w-4 h-4" />
      정답
    </h3>
    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
      <div className="text-lg font-medium text-green-800">
        {displayProblem.answer_data.answer}
      </div>
      {displayProblem.answer_data.answer_type && (
        <div className="text-xs text-green-600 mt-1">
          유형: {displayProblem.answer_data.answer_type}
        </div>
      )}
    </div>
  </div>
)}
```

**수정 후 코드**:
```tsx
{/* Answer - LaTeX 렌더링 */}
{displayProblem.answer_data && (
  <div>
    <h3 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-1">
      <CheckCircle className="w-4 h-4" />
      정답
    </h3>
    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
      <div className="text-lg font-medium text-green-800">
        <MathDisplay
          latex={displayProblem.answer_data.answer_latex || displayProblem.answer_data.answer}
        />
      </div>
      {displayProblem.answer_data.answer_type && (
        <div className="text-xs text-green-600 mt-1">
          유형: {displayProblem.answer_data.answer_type}
        </div>
      )}
    </div>
  </div>
)}
```

#### 3.6 해설 섹션 수정 (라인 469-480)

**현재 코드**:
```tsx
{/* Explanation */}
{displayProblem.explanation_data && (
  <div>
    <h3 className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-1">
      <BookOpen className="w-4 h-4" />
      해설
    </h3>
    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 whitespace-pre-wrap text-blue-800">
      {displayProblem.explanation_data.content}
    </div>
  </div>
)}
```

**수정 후 코드**:
```tsx
{/* Explanation - LaTeX 렌더링 */}
{displayProblem.explanation_data && (
  <div>
    <h3 className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-1">
      <BookOpen className="w-4 h-4" />
      해설
    </h3>
    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 whitespace-pre-wrap text-blue-800">
      <MathDisplay latex={displayProblem.explanation_data.content} />
    </div>
  </div>
)}
```

---

## 4. 구현 순서

| 순서 | 작업 | 파일 | 예상 변경량 |
|-----|------|------|-----------|
| 1 | API 타입 정의 업데이트 | `hangul.ts` | +6 줄 |
| 2 | MathDisplay 임포트 | `HangulUploadPage.tsx` | +1 줄 |
| 3 | HangulUploadPage 5개 위치 수정 | `HangulUploadPage.tsx` | ~25 줄 변경 |
| 4 | MathDisplay 임포트 | `IntegratedProblemBankPage.tsx` | +1 줄 |
| 5 | IntegratedProblemBankPage 6개 위치 수정 | `IntegratedProblemBankPage.tsx` | ~30 줄 변경 |

**총 예상 변경**: 약 65줄

---

## 5. 테스트 체크리스트

### 5.1 HangulUploadPage 테스트

- [ ] HML 파일 업로드 후 미리보기에서 수식이 렌더링되는지 확인
- [ ] 문제 카드 확장 시 전체 내용의 수식이 렌더링되는지 확인
- [ ] 정답 영역에서 분수, 루트 등 수식이 올바르게 표시되는지 확인
- [ ] 해설 영역의 수식이 올바르게 표시되는지 확인
- [ ] 수식 목록이 LaTeX로 렌더링되는지 확인

### 5.2 IntegratedProblemBankPage 테스트

- [ ] 문제 카드 미리보기에서 인라인 수식이 렌더링되는지 확인
- [ ] 문제 상세 모달에서 본문 수식이 렌더링되는지 확인
- [ ] 수식 섹션에서 개별 수식이 렌더링되는지 확인
- [ ] 정답 섹션에서 수식이 렌더링되는지 확인
- [ ] 해설 섹션에서 수식이 렌더링되는지 확인

### 5.3 특수 케이스 테스트

- [ ] LaTeX 필드가 없는 기존 데이터에서도 fallback이 작동하는지 확인
- [ ] 복잡한 수식 (분수, 루트, 절댓값 조합)이 올바르게 표시되는지 확인
- [ ] 빈 수식이나 에러 수식에서 fallback 표시가 되는지 확인
- [ ] 긴 본문에서 수식이 포함된 line-clamp가 올바르게 작동하는지 확인

---

## 6. Fallback 전략

모든 LaTeX 렌더링 위치에서 다음 fallback 패턴 사용:

```typescript
latex={problem.content_latex || problem.content_text || '(기본값)'}
```

이를 통해:
1. `content_latex`가 있으면 LaTeX 렌더링
2. 없으면 `content_text`로 fallback (일반 텍스트)
3. 둘 다 없으면 기본값 표시

---

## 7. 주의사항

1. **KaTeX 에러 처리**: MathDisplay 컴포넌트에서 이미 `throwOnError: false`로 설정되어 있어, 잘못된 LaTeX도 안전하게 처리됨

2. **HTML 구조 변경**: `<p>` 태그를 `<div>` 태그로 변경 필요 (MathDisplay가 span을 반환하므로, p 내부에 div가 있으면 안 됨)

3. **line-clamp 호환성**: MathDisplay 출력이 복잡한 HTML이므로, line-clamp가 예상대로 작동하는지 확인 필요

4. **스타일링**: KaTeX CSS가 이미 MathDisplay.tsx에서 임포트되어 있음 (`import 'katex/dist/katex.min.css'`)

---

## 8. 승인 후 진행

위 계획에 대해 "진행해줘"라고 말씀해 주시면, 순서대로 구현을 시작하겠습니다.
