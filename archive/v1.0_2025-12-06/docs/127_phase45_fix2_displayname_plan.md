# Phase 45-Fix-2: displayName 버그 수정 개발 계획

**작성일**: 2025-12-04
**근거**: [126_displayname_bug_deep_analysis_report.md](126_displayname_bug_deep_analysis_report.md)
**목표**: 새 문제 등록 시 "베이직쎈 · 18p · 3번" 형식으로 올바르게 표시

---

## 1. 문제 요약

| 항목 | 현재 | 목표 |
|------|------|------|
| 새 문제 표시 | "문제 · L1번" | "베이직쎈 · 10p · L1번" |
| 버그 위치 | `UnifiedWorkPage.tsx:117` | 수정 필요 |
| 원인 | displayName 직접 전달로 자동생성 우회 | displayName 생략 |

---

## 2. 수정 범위

### 2-A: UnifiedWorkPage displayName 제거 (필수)
**예상 시간**: 10분
**파일**: `frontend/src/pages/UnifiedWorkPage.tsx`

**수정 내용**:
```typescript
// Before (117줄)
await addProblem({
  groupId: group.id,
  pageIndex,
  problemNumber,
  displayName: problemNumber,  // ← 삭제
});

// After
await addProblem({
  groupId: group.id,
  pageIndex,
  problemNumber,
  // displayName 생략 → workSessionStore에서 자동 생성
});
```

---

### 2-B: problemNumber 폴백 개선 (권장)
**예상 시간**: 5분
**파일**: `frontend/src/pages/UnifiedWorkPage.tsx`

**수정 내용**:
```typescript
// Before (111줄)
const problemNumber = group.problemInfo?.problemNumber || `문제 ${group.id}`;

// After
const problemNumber = group.problemInfo?.problemNumber || group.id;
// "L1" → workSessionStore에서 "베이직쎈_p10_L1" 형식으로 자동 생성
```

---

### 2-C: Toast 메시지 개선 (선택)
**예상 시간**: 5분
**파일**: `frontend/src/pages/UnifiedWorkPage.tsx`

**수정 내용**:
```typescript
// Before (119줄)
showToast(`${problemNumber} 문제가 추가되었습니다`, 'success');

// After
showToast(`${problemNumber}번 문제가 추가되었습니다`, 'success');
```

---

## 3. 검증 계획

### 3-1: 빌드 검증
```bash
cd frontend && npm run build
```

### 3-2: 기능 테스트

| 테스트 | 예상 결과 |
|--------|----------|
| 새 그룹 생성 (problemInfo O) | "베이직쎈 · 10p · 3번" |
| 새 그룹 생성 (problemInfo X) | "베이직쎈 · 10p · L1번" |
| 기존 데이터 표시 | 변경 없음 |

### 3-3: 세션 데이터 확인
```json
{
  "problemNumber": "L1",
  "displayName": "베이직쎈_p10_L1"  // ← 자동 생성 확인
}
```

---

## 4. 체크리스트

### 필수
- [ ] 2-A: displayName 파라미터 제거
- [ ] 빌드 검증 (npm run build)
- [ ] 새 문제 등록 테스트

### 권장
- [ ] 2-B: problemNumber 폴백 개선
- [ ] 2-C: Toast 메시지 개선

### 완료 후
- [ ] 세션 JSON 데이터 확인
- [ ] 좌측 사이드바 표시 확인
- [ ] plan.md 업데이트

---

## 5. 위험도 평가

| 항목 | 위험도 | 설명 |
|------|--------|------|
| 기존 데이터 영향 | ✅ 없음 | 새 문제만 영향 |
| 빌드 오류 | ✅ 낮음 | 파라미터 삭제만 |
| 사이드 이펙트 | ✅ 낮음 | displayName 생성 위치만 변경 |

---

## 6. 예상 소요 시간

| 작업 | 시간 |
|------|------|
| 코드 수정 | 10분 |
| 빌드 검증 | 2분 |
| 기능 테스트 | 5분 |
| **총합** | **~20분** |

---

*승인 후 "진행해줘"로 실행*
