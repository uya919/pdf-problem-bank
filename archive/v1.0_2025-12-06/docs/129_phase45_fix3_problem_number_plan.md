# Phase 45-Fix-3: 문항번호 입력 반영 개발 계획

**작성일**: 2025-12-04
**근거**: [128_problem_number_timing_issue_report.md](128_problem_number_timing_issue_report.md)
**목표**: 사용자가 입력한 문항번호가 세션에 즉시 반영되도록 수정

---

## 1. 문제 요약

| 항목 | 현재 | 목표 |
|------|------|------|
| 사용자 입력 | "1" | "1" |
| 실제 저장 | "L1" | "1" |
| 표시 | "고1 · 10p · L1번" | "고1 · 10p · 1번" |

---

## 2. 수정 범위

### 3-A: handleGroupUpdated 구현 (필수)
**예상 시간**: 20분
**파일**: `frontend/src/pages/UnifiedWorkPage.tsx`

**현재 코드** (184-188줄):
```typescript
const handleGroupUpdated = useCallback(async (groupId: string, problemInfo: ProblemInfo, pageIndex: number) => {
  console.log('[Phase 39] Group updated:', groupId, problemInfo, 'page:', pageIndex);
  // 문제 정보 업데이트는 groups.json에 저장되므로 fullSync 시 반영됨
  // 즉시 반영이 필요하면 여기서 addProblem을 다시 호출하거나 updateProblem 구현 필요
}, []);
```

**수정 코드**:
```typescript
const handleGroupUpdated = useCallback(async (groupId: string, problemInfo: ProblemInfo, pageIndex: number) => {
  console.log('[Phase 45-Fix-3] Group updated:', groupId, problemInfo, 'page:', pageIndex);

  if (activeTab === 'problem') {
    // Phase 45-Fix-3: 문항번호 수정 시 세션 즉시 업데이트
    // addProblem은 upsert로 동작 (Phase 43)
    try {
      await addProblem({
        groupId,
        pageIndex,
        problemNumber: problemInfo.problemNumber || groupId,
        // displayName은 workSessionStore에서 자동 생성
      });
      console.log('[Phase 45-Fix-3] Problem updated in session:', problemInfo.problemNumber);
    } catch (error) {
      console.error('[Phase 45-Fix-3] Failed to update problem:', error);
    }
  }
}, [activeTab, addProblem]);
```

---

### 3-B: 의존성 배열 수정 (필수)
**예상 시간**: 5분
**파일**: `frontend/src/pages/UnifiedWorkPage.tsx`

useCallback 의존성에 `activeTab`, `addProblem` 추가 확인

---

## 3. 데이터 흐름 (수정 후)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. G키 → 그룹 생성 → onGroupCreated                                 │
│    → addProblem(problemNumber: "L1") - 임시 저장                    │
│                                                                     │
│ 2. 사용자가 문항번호 "1" 입력                                       │
│                                                                     │
│ 3. handleUpdateGroupInfo → groups.json 저장                         │
│                                                                     │
│ 4. onGroupUpdated → handleGroupUpdated (NEW!)                       │
│    → addProblem(problemNumber: "1") - upsert로 업데이트!            │
│    → workSessionStore에서 displayName 자동 생성                      │
│    → "고1_p10_1"                                                    │
│                                                                     │
│ 5. 좌측 사이드바 → "고1 · 10p · 1번" ✅                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. 검증 계획

### 4-1: 빌드 검증
```bash
cd frontend && npm run build
```

### 4-2: 기능 테스트

| 테스트 | 동작 | 예상 결과 |
|--------|------|----------|
| 새 그룹 생성 | G키 → 문항번호 미입력 | "고1 · 10p · L1번" |
| 문항번호 입력 | "1" 입력 후 저장 | "고1 · 10p · 1번" |
| 문항번호 수정 | "1" → "2" 변경 | "고1 · 10p · 2번" |

### 4-3: 세션 데이터 확인
```json
{
  "groupId": "L1",
  "problemNumber": "1",      // ← 사용자 입력 반영
  "displayName": "고1_p10_1" // ← 자동 생성
}
```

---

## 5. 체크리스트

### 필수
- [ ] 3-A: handleGroupUpdated에서 addProblem 호출
- [ ] 3-B: 의존성 배열 확인
- [ ] 빌드 검증
- [ ] 새 그룹 생성 테스트
- [ ] 문항번호 입력 테스트
- [ ] 문항번호 수정 테스트

### 완료 후
- [ ] 세션 JSON 데이터 확인
- [ ] 좌측 사이드바 표시 확인

---

## 6. 위험도 평가

| 항목 | 위험도 | 설명 |
|------|--------|------|
| 기존 데이터 영향 | ✅ 없음 | 수정 시에만 동작 |
| 빌드 오류 | ✅ 낮음 | 단순 함수 추가 |
| API 호출 증가 | ✅ 낮음 | 수정 시에만 추가 호출 |
| upsert 동작 | ✅ 안전 | Phase 43에서 검증됨 |

---

## 7. 예상 소요 시간

| 작업 | 시간 |
|------|------|
| 코드 수정 | 10분 |
| 빌드 검증 | 2분 |
| 기능 테스트 | 10분 |
| **총합** | **~25분** |

---

*승인 후 "진행해줘"로 실행*
