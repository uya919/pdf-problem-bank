# Phase 53 크로스 컬럼 그룹핑 구현 가능성 및 우려 사항 리포트

**작성일**: 2025-12-04
**상태**: 분석 완료
**분류**: 기능 구현 분석

---

## 1. 현재 상태 진단

### 1.1 버그 증상
사용자가 L(왼쪽) + R(오른쪽) 컬럼의 블록들을 선택하여 그룹을 생성했을 때:
- **기대 결과**: L 영역만 크롭 → R 영역만 크롭 → 두 이미지를 세로로 합성
- **실제 결과**: L+R 전체 영역을 하나의 큰 사각형으로 크롭 (빈 공간 포함)

### 1.2 데이터 흐름 분석

```
[Frontend]
handleCreateGroup()
  ↓ segments 필드 생성 (L, R 분리)
  ↓
newGroup = { id, column: "X", segments: [...], ... }
  ↓
setLocalGroups(updatedGroups)
  ↓
saveImmediately(updatedGroups)
  ↓
saveGroups() → API POST /api/blocks/documents/{id}/groups/{page}

[Backend]
save_page_groups() → save_json(groups_file, groups_data)
  ↓
groups.json 저장 (segments 포함되어야 함)
  ↓
export_single_group() → segments 읽어서 분할 크롭
```

### 1.3 근본 원인 발견

**Grep 검색 결과**: `segments` 필드가 저장된 JSON 파일이 **0개**

```
$ grep -r "segments" dataset_root/
No matches found
```

**실제 저장된 파일 확인** (`고1_공통수학1_베이직쎈_해설_p0007_p7_X1.json`):
```json
{
  "column": "X",           // ← X로 저장됨 (크로스 컬럼)
  "block_ids": [196개],    // ← 블록은 저장됨
  "bbox": [113, 136, 1198, 1660],  // ← 전체 bbox (L+R 합친 것)
  // segments 필드 없음!
}
```

---

## 2. 버그 원인 분석

### 2.1 Primary Root Cause: segments 필드 미저장

**코드 분석 (PageViewer.tsx:450-465)**:
```typescript
// Phase 53-C: 크로스 컬럼 그룹일 경우 segments 추가
if (isCrossColumn) {
  const segments = [
    { column: "L", block_ids: lBlocks.map(b => b.block_id), order: 0 },
    { column: "R", block_ids: rBlocks.map(b => b.block_id), order: 1 },
  ].filter(seg => seg.block_ids.length > 0);

  newGroup = { ...newGroup, segments };  // ← segments 추가됨
}
```

**가설들**:

1. **타이밍 이슈 (가장 유력)**
   - `saveImmediately(updatedGroups)` 호출 시 `segments`가 포함된 상태
   - 하지만 `api.exportGroup()` 이 호출되는 시점에 서버가 아직 저장 완료 전
   - export 로직이 **저장 전** 또는 **캐시된 old 데이터**를 읽음

2. **React State 업데이트 지연**
   - `setLocalGroups(updatedGroups)` 호출 후 바로 `saveImmediately()`
   - React의 비동기 상태 업데이트로 인해 segments가 누락될 수 있음

3. **Backend 데이터 필터링 (가능성 낮음)**
   - blocks.py의 `save_page_groups`는 `groups_data`를 그대로 저장
   - JSON 직렬화 시 필드 필터링 없음

### 2.2 Secondary Issue: export_page_problems 누락

**export.py 비교**:

| 함수 | 크로스 컬럼 지원 |
|------|------------------|
| `export_single_group` (line 222-246) | ✅ segments 처리 로직 있음 |
| `export_page_problems` (line 78-96) | ❌ 기본 bbox 크롭만 수행 |

`export_page_problems`에는 Phase 53 로직이 적용되지 않음.

---

## 3. 구현 가능성 평가

### 3.1 기술적 구현 가능성: **높음 (90%)**

크로스 컬럼 세로 합성 기능은 **기술적으로 완전히 구현 가능**합니다.

**이유**:
1. 이미 `merge_images_vertically()` 함수 구현 완료 (image_utils.py)
2. `export_single_group`에 크로스 컬럼 처리 로직 완료
3. 프론트엔드에서 segments 데이터 생성 로직 완료
4. 데이터 모델 (GroupSegment 타입) 정의 완료

### 3.2 필요한 수정 사항

| 항목 | 복잡도 | 설명 |
|------|--------|------|
| segments 저장 버그 수정 | 낮음 | 저장 타이밍/순서 조정 |
| export_page_problems 업데이트 | 낮음 | 단일 그룹 export 로직 복사 |
| 테스트 및 검증 | 중간 | 다양한 케이스 확인 필요 |

---

## 4. 우려 사항

### 4.1 데이터 일관성 (Critical)

**문제**: 이미 저장된 X 그룹들에 segments가 없음
- 기존 데이터는 복구 불가 (어떤 블록이 L/R인지 정보 손실)
- 새로 그룹핑해야 함

**해결책**:
1. 기존 X 그룹은 그대로 유지 (전체 bbox 크롭)
2. 새로 생성되는 X 그룹부터 segments 저장

### 4.2 저장 순서 (High)

**현재 코드 (handleCreateGroup)**:
```typescript
// 1. 로컬 상태 업데이트
setLocalGroups(updatedGroups);

// 2. 저장
await saveImmediately(updatedGroups, currentPage);

// 3. export (문제!)
await api.exportGroup(documentId, currentPage, newGroupId);
```

**문제**:
- `saveImmediately`는 `await`로 기다리지만, 실제로 서버가 완전히 저장했는지 확인 없음
- `exportGroup`이 서버에서 groups.json을 다시 읽을 때 캐시 문제 가능

**해결책**:
1. save와 export 사이에 딜레이 추가 (임시)
2. export API에 그룹 데이터를 직접 전달 (근본적 해결)

### 4.3 사용자 경험 (Medium)

**문제**: X 그룹 생성 시 사용자가 L/R 순서를 알 수 없음
- 현재: 무조건 L이 위, R이 아래
- 일부 경우 R→L 순서가 필요할 수 있음 (해설 등)

**해결책** (향후):
1. 드래그로 순서 변경 UI
2. 또는 현재 방식 유지 (한국어 책 표준이 L→R이므로)

### 4.4 성능 (Low)

**문제**: X 그룹은 2회 크롭 + 1회 합성 = 추가 연산
- 일반 그룹: 1회 크롭
- X 그룹: 2회 크롭 + 이미지 합성

**영향**: 미미 (PIL 연산은 빠름, 200ms 이내 예상)

---

## 5. 권장 수정 계획

### Phase 53-Fix-A: segments 저장 버그 수정

**파일**: `frontend/src/pages/PageViewer.tsx`

```typescript
// 기존
await saveImmediately(updatedGroups, currentPage);
await api.exportGroup(documentId, currentPage, newGroupId);

// 수정안 1: export에 그룹 데이터 직접 전달
await saveImmediately(updatedGroups, currentPage);
await api.exportGroupWithData(documentId, currentPage, newGroup);  // 새 API

// 수정안 2: 저장 확인 후 export
await saveImmediately(updatedGroups, currentPage);
await new Promise(resolve => setTimeout(resolve, 100));  // 임시 딜레이
await api.exportGroup(documentId, currentPage, newGroupId);
```

**권장**: 수정안 1 (그룹 데이터를 export API에 직접 전달)

### Phase 53-Fix-B: export_page_problems 업데이트

**파일**: `backend/app/routers/export.py`

`export_page_problems` 함수에 X 그룹 처리 로직 추가:
```python
for group in groups_data.get("groups", []):
    if group.get("column") == "X" and group.get("segments"):
        # export_single_group과 동일한 로직
    else:
        # 기존 로직
```

### Phase 53-Fix-C: 테스트 케이스

1. L만 선택 → column="L" 확인
2. R만 선택 → column="R" 확인
3. L+R 선택 → column="X", segments 저장 확인
4. X 그룹 export → L 위, R 아래 합성 확인

---

## 6. 결론

### 구현 가능성: **충분히 가능**

| 항목 | 상태 | 비고 |
|------|------|------|
| 데이터 모델 | ✅ 완료 | GroupSegment 정의됨 |
| 프론트엔드 UI | ✅ 완료 | Shift 선택, X 그룹 표시 |
| 백엔드 이미지 합성 | ✅ 완료 | merge_images_vertically |
| 단일 그룹 export | ✅ 완료 | export_single_group |
| **segments 저장** | ❌ 버그 | 타이밍/순서 문제 |
| 일괄 export | ❌ 미구현 | export_page_problems |

### 예상 수정 시간: 1-2시간

1. segments 저장 버그 수정: 30분
2. export_page_problems 업데이트: 30분
3. 테스트 및 검증: 30-60분

### 리스크 수준: **낮음**

- 기존 기능에 영향 없음 (X 그룹만 추가 처리)
- 롤백 용이 (column !== "X"면 기존 로직 사용)
- 데이터 손실 위험 없음

---

*작성: Claude Code (Opus 4.5)*
