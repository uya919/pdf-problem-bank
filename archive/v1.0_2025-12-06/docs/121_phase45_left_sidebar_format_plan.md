# Phase 45: 좌측 사이드바 표시 형식 개선 개발 계획

**작성일**: 2025-12-04
**목표**: 좌측 사이드바에 "베이직쎈 · 10p · 3번" 형식으로 표시
**예상 소요**: 30분
**상태**: 승인 대기

---

## 목표 결과물

```
Before:                          After:
┌─────────────────────┐          ┌─────────────────────────────┐
│ 미연결 문제      7  │          │ 미연결 문제              7  │
│ ○ 문제 L3번        │    →     │ ○ 베이직쎈 · 10p · 3번     │
│ ○ 문제 L2번        │          │ ○ 베이직쎈 · 10p · 4번     │
│ ○ 문제 L1번        │          │ ○ 베이직쎈 · 10p · 5번     │
└─────────────────────┘          └─────────────────────────────┘
```

---

## 단계별 개발 계획

### 45-A: displayName 파싱 유틸 함수 생성
**예상 시간**: 10분
**파일**: `frontend/src/utils/problemDisplayUtils.ts` (신규)

**구현 내용**:
```typescript
/**
 * displayName을 파싱하여 구조화된 객체로 반환
 * 입력: "베이직쎈_공통수학1_p10_3번"
 * 출력: { bookName: "베이직쎈", course: "공통수학1", page: "10", problemNumber: "3" }
 */
export function parseProblemDisplayName(displayName: string | undefined): ParsedProblemInfo | null;

/**
 * 파싱된 정보를 "베이직쎈 · 10p · 3번" 형식으로 포맷
 */
export function formatProblemLabel(parsed: ParsedProblemInfo): string;
```

**체크리스트**:
- [ ] `parseProblemDisplayName` 함수 구현
- [ ] `formatProblemLabel` 함수 구현
- [ ] 다양한 형식 테스트 (정상, 불완전, null)

---

### 45-B: UnlinkedProblemItem 컴포넌트 수정
**예상 시간**: 10분
**파일**: `frontend/src/components/matching/ProblemListPanel.tsx`

**현재 코드 (Line 247-253)**:
```typescript
<span className="text-sm font-medium">
  {problem.problemNumber}번
</span>
{problem.displayName && (
  <p className="text-xs text-grey-400 truncate mt-0.5">
    {problem.displayName}
  </p>
)}
```

**수정 후**:
```typescript
const parsed = parseProblemDisplayName(problem.displayName);

{parsed ? (
  <span className="text-sm font-medium truncate">
    {parsed.bookName} · {parsed.page}p · {parsed.problemNumber}번
  </span>
) : (
  <span className="text-sm font-medium">
    {problem.problemNumber}번
  </span>
)}
```

**체크리스트**:
- [ ] `parseProblemDisplayName` import 추가
- [ ] `UnlinkedProblemItem` 컴포넌트 수정
- [ ] useMemo로 파싱 결과 캐싱

---

### 45-C: LinkedProblemItem 컴포넌트 수정
**예상 시간**: 10분
**파일**: `frontend/src/components/matching/ProblemListPanel.tsx`

**현재 코드 (Line 290-296)**:
```typescript
<span className="text-sm font-medium text-grey-700">
  {problem.problemNumber}번
</span>
<ArrowRight className="w-3 h-3 text-grey-400" />
<span className="text-sm text-grey-500">
  {link.solutionGroupId.split('_').pop() || '해설'}
</span>
```

**수정 후**:
```typescript
const parsed = parseProblemDisplayName(problem.displayName);

{parsed ? (
  <span className="text-sm font-medium text-grey-700 truncate">
    {parsed.bookName} · {parsed.page}p · {parsed.problemNumber}번
  </span>
) : (
  <span className="text-sm font-medium text-grey-700">
    {problem.problemNumber}번
  </span>
)}
<ArrowRight />
<span className="text-sm text-grey-500">해설</span>
```

**체크리스트**:
- [ ] `LinkedProblemItem` 컴포넌트 수정
- [ ] useMemo로 파싱 결과 캐싱

---

## 수정 파일 요약

| 파일 | 작업 | 신규/수정 |
|------|------|----------|
| `frontend/src/utils/problemDisplayUtils.ts` | 유틸 함수 생성 | 신규 |
| `frontend/src/components/matching/ProblemListPanel.tsx` | 컴포넌트 수정 | 수정 |

---

## 테스트 체크리스트

- [ ] displayName이 있는 경우: "베이직쎈 · 10p · 3번" 형식 표시
- [ ] displayName이 없는 경우: 기존 형식 "문제 L3번" 유지
- [ ] displayName 형식이 다른 경우: graceful fallback
- [ ] 긴 책이름: truncate 처리 확인
- [ ] 미연결/연결 문제 모두 동일 형식 적용 확인

---

## 롤백 계획

문제 발생 시:
1. `ProblemListPanel.tsx`를 이전 버전으로 복구
2. `problemDisplayUtils.ts` 삭제

---

## 승인 체크리스트

- [ ] 45-A: displayName 파싱 유틸 함수
- [ ] 45-B: UnlinkedProblemItem 수정
- [ ] 45-C: LinkedProblemItem 수정

---

*"진행해줘"로 구현을 시작합니다.*
