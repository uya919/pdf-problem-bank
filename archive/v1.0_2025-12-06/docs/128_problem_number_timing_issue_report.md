# 문항번호 입력 타이밍 이슈 분석 리포트

**작성일**: 2025-12-04
**문제**: 사용자가 입력한 문항번호(1번)가 반영되지 않고 그룹ID(L1번)로 표시됨
**심각도**: 🔴 높음 (핵심 UX 문제)

---

## 1. 문제 현상

### 1.1 사용자 시나리오

```
1. 사용자가 블록 선택 후 G키로 그룹 생성
2. GroupPanel에서 문항번호 "1" 입력
3. 저장 완료
4. 좌측 사이드바 확인 → "고1 · 10p · L1번" 😡
```

### 1.2 예상 vs 실제

| 항목 | 예상 | 실제 |
|------|------|------|
| 문항번호 | "1" | "L1" |
| displayName | "고1_p10_1" | "고1_p10_L1" |
| 표시 | "고1 · 10p · 1번" | "고1 · 10p · L1번" |

---

## 2. 근본 원인 분석

### 2.1 데이터 흐름 타이밍

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. handleCreateGroup() - PageViewer.tsx:388                         │
│    newGroup = { id: "L1", problemInfo: undefined }                  │
│                          ↓                                          │
│ 2. onGroupCreated(newGroup) - 즉시 호출                             │
│    → handleGroupCreated() - UnifiedWorkPage.tsx:106                 │
│    → problemNumber = group.problemInfo?.problemNumber || group.id;  │
│                        ────────────────────────────   ─────────     │
│                        undefined (없음!)               "L1" 사용    │
│                          ↓                                          │
│ 3. addProblem({ problemNumber: "L1" }) - 세션에 저장됨!             │
│                          ↓                                          │
│ 4. setAutoEditGroupId(newGroupId) - 편집 모드 활성화                │
│                          ↓                                          │
│ 5. [사용자] GroupPanel에서 "1" 입력                                 │
│                          ↓                                          │
│ 6. handleUpdateGroupInfo() - groups.json에 저장                     │
│                          ↓                                          │
│ 7. onGroupUpdated() - 현재 빈 함수! 세션 업데이트 안 됨!            │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 핵심 문제점

| 문제 | 위치 | 설명 |
|------|------|------|
| **타이밍 역전** | PageViewer.tsx:434 | 문항번호 입력 전에 addProblem 호출 |
| **빈 콜백** | UnifiedWorkPage.tsx:184-188 | onGroupUpdated가 세션 업데이트 안 함 |
| **단방향 흐름** | - | 생성 시에만 동기화, 수정 시 동기화 없음 |

### 2.3 코드 확인

**UnifiedWorkPage.tsx:184-188** (현재 빈 콜백):
```typescript
const handleGroupUpdated = useCallback(async (groupId: string, problemInfo: ProblemInfo, pageIndex: number) => {
  console.log('[Phase 39] Group updated:', groupId, problemInfo, 'page:', pageIndex);
  // 문제 정보 업데이트는 groups.json에 저장되므로 fullSync 시 반영됨
  // 즉시 반영이 필요하면 여기서 addProblem을 다시 호출하거나 updateProblem 구현 필요
}, []);
```

---

## 3. 해결 방안

### 방안 A: onGroupUpdated에서 세션 업데이트 (권장)

**개념**: 사용자가 문항번호 수정하면 세션도 즉시 업데이트

**장점**:
- 기존 흐름 유지
- 최소한의 변경
- 수정 시에도 즉시 반영

**단점**:
- updateProblem API 필요 (현재 없음)
- 또는 addProblem을 upsert로 재활용

**구현**:
```typescript
const handleGroupUpdated = useCallback(async (groupId: string, problemInfo: ProblemInfo, pageIndex: number) => {
  if (activeTab === 'problem') {
    try {
      // 기존 addProblem을 upsert로 사용 (Phase 43에서 이미 구현됨)
      await addProblem({
        groupId,
        pageIndex,
        problemNumber: problemInfo.problemNumber || groupId,
        // displayName은 자동 생성
      });
    } catch (error) {
      console.error('[Phase 45-Fix-3] Failed to update problem:', error);
    }
  }
}, [activeTab, addProblem]);
```

**예상 시간**: 30분
**위험도**: 낮음

---

### 방안 B: addProblem 호출 지연 (대안)

**개념**: 그룹 생성 시 addProblem 호출하지 않고, 문항번호 입력 후 호출

**장점**:
- 타이밍 문제 근본 해결
- 데이터 정확성 보장

**단점**:
- 기존 흐름 대폭 변경
- 그룹 생성만 하고 문항번호 안 입력하면 세션에 추가 안 됨
- UX 복잡도 증가

**구현 복잡도**: 높음
**예상 시간**: 2-3시간
**위험도**: 중간

---

### 방안 C: 자동 문항번호 계산 (보완)

**개념**: 그룹 생성 시 다음 문항번호 자동 계산

**장점**:
- 사용자 입력 전에도 합리적인 기본값
- UX 개선 (입력 생략 가능)

**단점**:
- 방안 A와 함께 사용해야 완전한 해결
- 기존 로직과 충돌 가능성

**예상 시간**: 1시간
**위험도**: 중간

---

## 4. 구현 권장 순서

### 4.1 즉시 해결 (Phase 45-Fix-3)

```
1단계: 방안 A 구현 (30분)
   - handleGroupUpdated에서 addProblem 호출
   - upsert로 세션 문제 정보 업데이트

2단계: 테스트 (10분)
   - 그룹 생성 → 문항번호 입력 → 사이드바 확인
```

### 4.2 추가 개선 (선택적)

```
3단계: 방안 C 구현 (1시간)
   - 자동 문항번호 계산
   - 기본값으로 설정
```

---

## 5. 우려 사항

### 5.1 기술적 우려

| 우려 | 가능성 | 대응 |
|------|--------|------|
| addProblem 중복 호출 | 낮음 | upsert 동작으로 안전 |
| 네트워크 지연 | 낮음 | Optimistic UI 유지 |
| 기존 데이터 영향 | 없음 | 새 그룹만 영향 |

### 5.2 UX 우려

| 우려 | 가능성 | 대응 |
|------|--------|------|
| 사용자 혼란 | 낮음 | 즉시 반영으로 해소 |
| 느린 반응 | 낮음 | API 호출 빠름 |

---

## 6. 체크리스트

### Phase 45-Fix-3 (방안 A)

- [ ] handleGroupUpdated에서 addProblem 호출
- [ ] displayName 자동 생성 (workSessionStore에서)
- [ ] 빌드 검증
- [ ] 기능 테스트

### 추가 개선 (선택)

- [ ] 자동 문항번호 계산
- [ ] 기본값 설정

---

## 7. 결론

### 7.1 근본 원인

```
addProblem이 문항번호 입력 전에 호출됨
+ onGroupUpdated가 세션 업데이트 안 함
= 사용자 입력 무시됨
```

### 7.2 권장 해결책

**방안 A: onGroupUpdated에서 세션 업데이트**

- 예상 시간: 30분
- 위험도: 낮음
- 기존 upsert 로직 재활용

### 7.3 예상 결과

```
Before: "고1 · 10p · L1번"
After:  "고1 · 10p · 1번" (사용자가 입력한 값)
```

---

*작성자: Claude Code (Opus)*
*Phase: 45-Fix-3 Feasibility Study*
