# Phase 53-Fix: 크로스 컬럼 그룹핑 버그 수정 계획

**작성일**: 2025-12-05
**관련 문서**: [144_phase53_cross_column_implementation_report.md](144_phase53_cross_column_implementation_report.md)
**목표**: segments 필드 저장 및 세로 합성 export 정상화

---

## 문제 요약

```
┌─────────────────────────────────────────────────────────────┐
│  현재 상황                                                   │
│  ━━━━━━━━                                                   │
│  1. X 그룹 생성 시 segments 필드가 생성됨 (프론트엔드) ✅     │
│  2. segments가 groups.json에 저장되지 않음 ❌                │
│  3. export 시 segments 없어서 전체 bbox 크롭 ❌              │
│                                                             │
│  근본 원인: 저장-내보내기 타이밍/데이터 전달 문제             │
└─────────────────────────────────────────────────────────────┘
```

---

## 수정 전략

### 핵심 접근법: Export API에 그룹 데이터 직접 전달

```
현재 흐름 (문제):
┌──────────┐     ┌──────────┐     ┌──────────┐
│ 그룹생성  │ ──► │ 저장     │ ──► │ Export   │
│ segments │     │ POST     │     │ JSON읽기 │ ← 저장 전 old 데이터?
└──────────┘     └──────────┘     └──────────┘

수정 흐름:
┌──────────┐     ┌──────────┐     ┌──────────────┐
│ 그룹생성  │ ──► │ 저장     │     │ Export       │
│ segments │     │ POST     │ ──► │ 데이터 직접  │ ← 확실한 데이터
└──────────┘     └──────────┘     │ 전달         │
                                  └──────────────┘
```

---

## 단계별 계획

### Phase 53-Fix-A: Export API 수정 (Backend)

**목표**: 그룹 데이터를 요청 body로 받아서 처리

**파일**: `backend/app/routers/export.py`

**변경 내용**:
```python
# 새 엔드포인트 추가
@router.post("/documents/{document_id}/pages/{page_index}/groups/{group_id}/export-with-data")
async def export_group_with_data(
    document_id: str,
    page_index: int,
    group_id: str,
    group_data: dict  # 프론트엔드에서 전달받은 그룹 데이터
):
    """
    Phase 53-Fix: 그룹 데이터를 직접 받아서 export

    segments 필드가 포함된 그룹 데이터를 직접 전달받아
    저장 타이밍 문제를 우회합니다.
    """
    # group_data에서 segments 사용
    if group_data.get("column") == "X" and group_data.get("segments"):
        # 세로 합성 로직
    else:
        # 기존 로직
```

**체크리스트**:
- [ ] 새 엔드포인트 `/export-with-data` 추가
- [ ] group_data에서 segments 읽어서 처리
- [ ] 기존 `export_single_group`은 유지 (호환성)

**위험도**: 낮음 (새 엔드포인트, 기존 코드 변경 없음)

---

### Phase 53-Fix-B: Frontend API 클라이언트 추가

**목표**: 새 export API 호출 함수 추가

**파일**: `frontend/src/api/client.ts`

**변경 내용**:
```typescript
// 새 함수 추가
exportGroupWithData: async (
  documentId: string,
  pageIndex: number,
  groupId: string,
  groupData: ProblemGroup  // 그룹 데이터 직접 전달
): Promise<ExportResult> => {
  const response = await apiClient.post(
    `/api/export/documents/${documentId}/pages/${pageIndex}/groups/${groupId}/export-with-data`,
    groupData
  );
  return response.data;
},
```

**체크리스트**:
- [ ] `exportGroupWithData` 함수 추가
- [ ] 기존 `exportGroup` 유지 (호환성)
- [ ] TypeScript 타입 정의

**위험도**: 낮음 (새 함수 추가)

---

### Phase 53-Fix-C: PageViewer 호출 수정

**목표**: X 그룹 생성 시 새 API 사용

**파일**: `frontend/src/pages/PageViewer.tsx`

**변경 내용**:
```typescript
// handleCreateGroup 내부 수정
try {
  // 1. 먼저 그룹 저장
  await saveImmediately(updatedGroups, currentPage);

  // 2. X 그룹이면 데이터 직접 전달, 아니면 기존 방식
  if (newGroup.column === "X" && newGroup.segments) {
    await api.exportGroupWithData(documentId, currentPage, newGroupId, newGroup);
  } else {
    await api.exportGroup(documentId, currentPage, newGroupId);
  }

  // 3. 성공 토스트
  showToast('문제가 문제은행에 등록되었습니다', { ... });
} catch (error) {
  // ...
}
```

**체크리스트**:
- [ ] X 그룹 분기 처리
- [ ] 기존 L/R 그룹은 기존 방식 유지
- [ ] 에러 처리 동일

**위험도**: 낮음 (조건 분기만 추가)

---

### Phase 53-Fix-D: export_page_problems 업데이트

**목표**: 일괄 export 시에도 X 그룹 처리

**파일**: `backend/app/routers/export.py`

**변경 내용**:
```python
# export_page_problems 함수 수정
for group in groups_data.get("groups", []):
    group_id = group["id"]
    block_ids = group["block_ids"]

    group_blocks = [
        b for b in blocks_data["blocks"] if b["block_id"] in block_ids
    ]

    if not group_blocks:
        continue

    # Phase 53-Fix-D: 크로스 컬럼 그룹 처리
    if group.get("column") == "X" and group.get("segments"):
        cropped_images = []
        for segment in sorted(group["segments"], key=lambda s: s.get("order", 0)):
            segment_blocks = [
                b for b in blocks_data["blocks"] if b["block_id"] in segment["block_ids"]
            ]
            if not segment_blocks:
                continue
            seg_bbox = calculate_bounding_box(segment_blocks)
            seg_x1, seg_y1, seg_x2, seg_y2 = add_padding(
                seg_bbox, 5, page_image.width, page_image.height
            )
            seg_cropped = page_image.crop((seg_x1, seg_y1, seg_x2, seg_y2))
            cropped_images.append(seg_cropped)

        cropped = merge_images_vertically(cropped_images, padding=10)
        if cropped is None:
            continue
        bbox = calculate_bounding_box(group_blocks)
        x1, y1, x2, y2 = add_padding(bbox, 5, page_image.width, page_image.height)
    else:
        # 기존 로직
        bbox = calculate_bounding_box(group_blocks)
        x1, y1, x2, y2 = add_padding(bbox, 5, page_image.width, page_image.height)
        cropped = page_image.crop((x1, y1, x2, y2))
```

**체크리스트**:
- [ ] X 그룹 분기 추가
- [ ] segments 순서대로 크롭
- [ ] merge_images_vertically 호출
- [ ] 기존 L/R 그룹 로직 유지

**위험도**: 중간 (기존 함수 수정, 조건 분기로 격리)

---

### Phase 53-Fix-E: 테스트 및 검증

**목표**: 모든 케이스 정상 동작 확인

**테스트 케이스**:

| # | 케이스 | 기대 결과 |
|---|--------|----------|
| 1 | L 블록만 선택 → 그룹 생성 | column="L", segments 없음, 정상 크롭 |
| 2 | R 블록만 선택 → 그룹 생성 | column="R", segments 없음, 정상 크롭 |
| 3 | L+R 블록 선택 → 그룹 생성 | column="X", segments 있음 |
| 4 | X 그룹 export | L(위) + R(아래) 세로 합성 이미지 |
| 5 | 기존 X 그룹 (segments 없음) | 전체 bbox 크롭 (fallback) |
| 6 | 일괄 export | X 그룹도 세로 합성 |

**체크리스트**:
- [ ] 케이스 1-2: 기존 기능 정상 (regression 없음)
- [ ] 케이스 3: X 그룹 생성 시 segments 저장 확인
- [ ] 케이스 4: 세로 합성 이미지 확인
- [ ] 케이스 5: 호환성 (기존 데이터)
- [ ] 케이스 6: 일괄 export 정상

---

## 구현 순서

```
Phase 53-Fix-A (Backend API)
       ↓
Phase 53-Fix-B (Frontend API)
       ↓
Phase 53-Fix-C (PageViewer 수정)
       ↓
Phase 53-Fix-D (일괄 export)
       ↓
Phase 53-Fix-E (테스트)
```

---

## 예상 시간

| Phase | 작업 | 시간 |
|-------|------|------|
| 53-Fix-A | Backend 새 API | 15분 |
| 53-Fix-B | Frontend API 추가 | 10분 |
| 53-Fix-C | PageViewer 수정 | 10분 |
| 53-Fix-D | 일괄 export 수정 | 15분 |
| 53-Fix-E | 테스트 | 20분 |
| **합계** | | **70분** |

---

## 롤백 계획

모든 변경이 조건 분기로 격리되어 있어 롤백 불필요:
- X 그룹 → 새 로직
- L/R 그룹 → 기존 로직 그대로

문제 발생 시:
1. `exportGroupWithData` → `exportGroup`으로 변경
2. X 그룹 분기 제거

---

## 완료 기준

### 필수
- [ ] X 그룹 생성 시 segments 필드 저장됨
- [ ] X 그룹 export 시 L(위) + R(아래) 세로 합성
- [ ] 기존 L/R 그룹 정상 동작

### 확인 방법
```bash
# groups.json에서 segments 확인
grep -r "segments" dataset_root/documents/*/groups/
```

---

**"진행해줘"로 Phase 53-Fix-A부터 시작합니다.**
