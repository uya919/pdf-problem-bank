# Phase 17 React Hook 순서 에러 리포트

**작성일**: 2025-11-28
**Phase**: 17
**심각도**: Critical (앱 크래시)
**상태**: 분석 완료, 수정 필요

---

## 1. 에러 요약

### 1.1 에러 메시지

```
React has detected a change in the order of Hooks called by ProblemDetailModal.
This will lead to bugs and errors if not fixed.

   Previous render            Next render
   ------------------------------------------------------
1. useEffect                  useEffect
2. undefined                  useContext
   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Error: Rendered more hooks than during the previous render.
```

### 1.2 발생 위치

- **파일**: `frontend/src/pages/IntegratedProblemBankPage.tsx`
- **컴포넌트**: `ProblemDetailModal`
- **줄 번호**: 311

---

## 2. 원인 분석

### 2.1 React Hook 규칙

React의 Hook 규칙 (Rules of Hooks):
1. **최상위에서만 Hook 호출**: 반복문, 조건문, 중첩 함수 내에서 Hook 호출 금지
2. **React 함수 컴포넌트 내에서만 Hook 호출**
3. **모든 렌더링에서 동일한 순서로 Hook 호출**

### 2.2 문제 코드

```tsx
// ProblemDetailModal 컴포넌트 (288-315줄)

function ProblemDetailModal({
  problem,
  isOpen,
  onClose,
}: {
  problem: ProblemDetail | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  // ✅ Hook #1: useEffect (항상 호출됨)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // ❌ 조기 반환 (Early Return)
  if (!isOpen || !problem) return null;

  // ❌ Hook #2: useQuery (조기 반환 후에 호출 - 문제!)
  const { data: detailData } = useQuery({
    queryKey: ['problem-detail', problem.id],
    queryFn: () => hangulApi.getProblem(problem.id),
    enabled: isOpen && !!problem.id,
  });

  // ...
}
```

### 2.3 문제 발생 시나리오

| 시나리오 | isOpen | problem | 호출된 Hook 수 |
|---------|--------|---------|---------------|
| 초기 렌더링 (모달 닫힘) | `false` | `null` | 1 (useEffect만) |
| 문제 클릭 후 (모달 열림) | `true` | `{...}` | 2 (useEffect + useQuery) |

**렌더링 순서 비교:**
```
첫 렌더링 (모달 닫힘):
  1. useEffect() ✓
  2. (return null로 종료)

두 번째 렌더링 (모달 열림):
  1. useEffect() ✓
  2. useQuery() ← 새로 추가됨! React 에러 발생
```

### 2.4 근본 원인

`useQuery` Hook이 **조건부 반환(early return) 이후에** 위치해 있어, 모달이 닫혀있을 때는 호출되지 않고 열려있을 때만 호출됩니다. 이로 인해 React가 Hook 순서 변경을 감지하고 에러를 발생시킵니다.

---

## 3. 해결 방법

### 3.1 올바른 코드 구조

모든 Hook은 **조기 반환 이전에** 호출되어야 합니다:

```tsx
function ProblemDetailModal({
  problem,
  isOpen,
  onClose,
}: {
  problem: ProblemDetail | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  // ✅ Hook #1: useEffect (항상 호출)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // ✅ Hook #2: useQuery (항상 호출, enabled로 실행 제어)
  const { data: detailData } = useQuery({
    queryKey: ['problem-detail', problem?.id],
    queryFn: () => hangulApi.getProblem(problem!.id),
    enabled: isOpen && !!problem?.id,  // 조건부 실행
  });

  // ✅ 조기 반환은 모든 Hook 호출 후에
  if (!isOpen || !problem) return null;

  const displayProblem = detailData || problem;

  return (
    // ... 모달 JSX
  );
}
```

### 3.2 핵심 변경점

| 항목 | 변경 전 | 변경 후 |
|-----|--------|--------|
| useQuery 위치 | 조기 반환 후 (309줄 뒤) | 조기 반환 전 (useEffect 직후) |
| problem 참조 | `problem.id` | `problem?.id` (옵셔널 체이닝) |
| queryFn | `problem.id` 직접 사용 | `problem!.id` (enabled가 보장) |

### 3.3 대안: 컴포넌트 분리

더 깔끔한 방법은 모달 내용을 별도 컴포넌트로 분리하는 것입니다:

```tsx
// 부모 컴포넌트
function ProblemDetailModal({ problem, isOpen, onClose }) {
  // ESC 키 핸들링
  useEffect(() => { /* ... */ }, [isOpen, onClose]);

  if (!isOpen || !problem) return null;

  return (
    <div className="modal-backdrop">
      <ProblemDetailContent problem={problem} onClose={onClose} />
    </div>
  );
}

// 자식 컴포넌트 (항상 렌더링됨)
function ProblemDetailContent({ problem, onClose }) {
  // useQuery는 여기서 항상 호출됨
  const { data: detailData } = useQuery({
    queryKey: ['problem-detail', problem.id],
    queryFn: () => hangulApi.getProblem(problem.id),
  });

  const displayProblem = detailData || problem;

  return (
    // 모달 내용
  );
}
```

---

## 4. 영향 범위

### 4.1 영향 받는 파일

| 파일 | 영향 |
|-----|------|
| `IntegratedProblemBankPage.tsx` | 직접 수정 필요 |

### 4.2 사용자 영향

- 통합 문제은행 페이지 (`/bank`)에서 문제 카드 클릭 시 앱 크래시
- ErrorBoundary가 에러를 캐치하여 전체 앱은 보호되지만, 해당 기능 사용 불가

---

## 5. 코드 품질 검토

### 5.1 추가로 발견된 문제점

#### 5.1.1 useToast 미사용
```tsx
// 475줄
const { showToast } = useToast();  // 선언되었지만 사용되지 않음
```
**권장**: 에러 핸들링에 사용하거나 제거

#### 5.1.2 타입 안전성
```tsx
// 440줄
level <= displayProblem.metadata!.difficulty!  // Non-null assertion 남용
```
**권장**: 옵셔널 체이닝 및 기본값 사용

#### 5.1.3 키 중복 가능성
```tsx
// 461줄
{displayProblem.metadata.tags.map((tag) => (
  <Badge key={tag} variant="secondary">{tag}</Badge>  // 중복 태그 시 키 충돌
))}
```
**권장**: `key={`${tag}-${index}`}` 사용

---

## 6. 수정 작업

### 6.1 즉시 수정 필요

1. `ProblemDetailModal`에서 `useQuery` Hook을 조기 반환 이전으로 이동
2. `problem?.id` 옵셔널 체이닝 적용

### 6.2 권장 수정

1. 미사용 `showToast` 제거 또는 활용
2. Non-null assertion (`!`) 대신 안전한 접근 방식 사용
3. 배열 키에 인덱스 추가

---

## 7. 테스트 계획

### 7.1 수정 후 테스트

| 테스트 | 예상 결과 |
|--------|----------|
| 페이지 로드 | 에러 없이 정상 로드 |
| 문제 카드 클릭 | 모달 정상 표시 |
| 모달 닫기 (X 버튼) | 정상 닫힘 |
| 모달 닫기 (ESC 키) | 정상 닫힘 |
| 모달 닫기 (배경 클릭) | 정상 닫힘 |
| 여러 문제 연속 클릭 | 각 문제 정상 표시 |

---

## 8. 결론

이 에러는 **React Hook의 기본 규칙 위반**으로 인해 발생했습니다. 모든 Hook은 조건부 반환 이전에 호출되어야 하며, `enabled` 옵션 등을 사용하여 실제 실행을 제어해야 합니다.

수정은 간단하지만, 이 패턴은 React 개발에서 흔히 발생하는 실수이므로 주의가 필요합니다.

---

*작성: Claude Code (Opus)*
*날짜: 2025-11-28*
