# Phase 47: 그룹 ID 충돌 버그 수정 계획

**작성일**: 2025-12-04
**선행 분석**: [133_critical_group_id_collision_bug_report.md](133_critical_group_id_collision_bug_report.md)
**심각도**: 🔴 Critical
**예상 소요**: 1.5시간

---

## 목표

1. **그룹 ID 전역 고유성 보장**: 페이지 정보를 포함한 새 ID 형식
2. **동기화 로직 안전성 강화**: 복합 키로 충돌 방지
3. **기존 데이터 호환성**: 마이그레이션 없이 점진적 적용

---

## Step 1: 그룹 ID 형식 변경 (15분)

### 1-1. PageViewer.tsx 수정

**파일**: `frontend/src/pages/PageViewer.tsx`
**위치**: handleCreateGroup 함수 (약 412줄)

```typescript
// Before
const newGroupId = `${column}${maxNumber + 1}`;
// 결과: "L1", "L2"

// After
const newGroupId = `p${currentPage}_${column}${maxNumber + 1}`;
// 결과: "p10_L1", "p10_L2", "p18_L1"
```

### 1-2. 기존 ID 패턴 호환

기존 `L1`, `L2` 형식도 계속 인식하도록 maxNumber 추출 로직 수정:

```typescript
const existingGroups = localGroups.filter((g) => g.column === column);
const maxNumber = existingGroups.reduce((max, g) => {
  // 새 형식: "p10_L1" → 1 추출
  // 기존 형식: "L1" → 1 추출
  const match = g.id.match(/(\d+)$/);
  if (match) {
    return Math.max(max, parseInt(match[0], 10));
  }
  return max;
}, 0);
```

---

## Step 2: 동기화 로직 수정 (20분)

### 2-1. sync_manager.py 수정

**파일**: `backend/app/services/sync_manager.py`
**위치**: sync_problems_to_session 함수 (약 63줄)

```python
# Before (위험)
all_groups[group_id] = {
    "group": group,
    "pageIndex": page_index,
}

# After (안전) - 복합 키 사용
composite_key = f"{page_index}:{group_id}"
all_groups[composite_key] = {
    "group": group,
    "pageIndex": page_index,
    "groupId": group_id,  # 원본 ID 보존
}
```

### 2-2. problems 생성 시 복합 키 해제

```python
# 세션 problems 생성 시
for composite_key, group_data in all_groups.items():
    page_index = group_data["pageIndex"]
    group_id = group_data["groupId"]

    problem_ref = ProblemReference(
        groupId=group_id,
        pageIndex=page_index,
        # ...
    )
```

---

## Step 3: Upsert 조건 강화 (10분)

### 3-1. work_sessions.py 수정

**파일**: `backend/app/routers/work_sessions.py`
**위치**: add_problem 함수 (약 228줄)

```python
# Before (위험)
existing = next((
    p for p in session.problems
    if p.groupId == request.groupId
), None)

# After (안전) - pageIndex도 확인
existing = next((
    p for p in session.problems
    if p.groupId == request.groupId
    and p.pageIndex == request.pageIndex
), None)
```

### 3-2. 동일 로직 적용 위치

- `add_problem` 함수
- `update_problem` 함수 (있다면)
- `sync_problems_to_session` 내부 upsert 로직

---

## Step 4: 프론트엔드 호환성 (15분)

### 4-1. 그룹 표시명 처리

새 ID 형식에서 사용자에게는 간단한 번호만 표시:

**파일**: `frontend/src/components/PageCanvas.tsx`

```typescript
function getGroupStyleAndLabel(group: ProblemGroup) {
  // ID에서 번호만 추출하여 표시
  // "p10_L1" → "1번" 또는 "L1"
  const problemNumber = group.problemInfo?.problemNumber
    || group.id.match(/(\d+)$/)?.[1]
    || group.id;

  return { label: problemNumber };
}
```

### 4-2. GroupPanel 호환성 확인

그룹 목록에서 새 ID 형식이 올바르게 표시되는지 확인

---

## Step 5: 테스트 (20분)

### 5-1. 기본 시나리오 테스트

- [ ] 페이지 10에서 그룹 생성 → ID 확인 ("p10_L1")
- [ ] 페이지 18에서 그룹 생성 → ID 확인 ("p18_L1")
- [ ] 두 페이지 모두 데이터 유지 확인

### 5-2. 동기화 테스트

- [ ] fullSync 호출 후 모든 그룹 유지 확인
- [ ] session.problems에 두 페이지 그룹 모두 존재

### 5-3. 기존 데이터 호환성 테스트

- [ ] 기존 "L1" 형식 그룹이 있는 세션 로드
- [ ] 새 그룹 추가 시 정상 동작

### 5-4. 해설 연결 테스트

- [ ] 문제-해설 링크가 새 ID 형식에서도 정상 동작

---

## 파일 변경 목록

| 파일 | 변경 내용 | 라인 |
|------|----------|------|
| `frontend/src/pages/PageViewer.tsx` | 그룹 ID 형식 변경 | ~412 |
| `backend/app/services/sync_manager.py` | 복합 키 사용 | ~63 |
| `backend/app/routers/work_sessions.py` | Upsert 조건 강화 | ~228 |
| `frontend/src/components/PageCanvas.tsx` | 표시명 호환성 | ~83 |

---

## 롤백 계획

문제 발생 시:

1. **프론트엔드**: 그룹 ID 형식을 원래대로 복원
2. **백엔드**: 복합 키 대신 원본 키 사용
3. **데이터**: groups.json 파일은 영향 없음 (개별 저장)

---

## 체크리스트

- [ ] Step 1: 그룹 ID 형식 변경 (PageViewer.tsx)
- [ ] Step 2: 동기화 로직 수정 (sync_manager.py)
- [ ] Step 3: Upsert 조건 강화 (work_sessions.py)
- [ ] Step 4: 프론트엔드 호환성 (PageCanvas.tsx)
- [ ] Step 5: 테스트 완료
- [ ] 빌드 성공 확인

---

## 예상 결과

### Before (버그)
```
페이지 10: L1, L2, L3
페이지 18: L1, L2
           ↓
세션: L1(18), L2(18), L3(10)  ← 10페이지 L1, L2 유실!
```

### After (수정)
```
페이지 10: p10_L1, p10_L2, p10_L3
페이지 18: p18_L1, p18_L2
           ↓
세션: p10_L1(10), p10_L2(10), p10_L3(10), p18_L1(18), p18_L2(18)  ✅
```

---

**승인 후 "진행해줘"로 구현을 시작합니다.**
