# Phase 68: 그룹 삭제 시 Export 파일 연쇄 삭제

**작성일**: 2025-12-09
**목표**: 그룹 삭제 시 관련 export 파일도 자동 삭제

---

## 1. 현재 문제

```
그룹 삭제 흐름 (현재):
1. 프론트엔드: 그룹 삭제 요청
2. 백엔드: groups.json에서 그룹 제거
3. problems/*.png, *.json 파일 → 그대로 유지 ❌

결과:
- 문제은행에 삭제된 그룹이 계속 표시 (유령 문제)
- 디스크 공간 낭비
- 데이터 불일치
```

---

## 2. 목표 흐름

```
그룹 삭제 흐름 (개선 후):
1. 프론트엔드: 그룹 삭제 요청
2. 백엔드: groups.json에서 그룹 제거
3. 백엔드: problems/*.png, *.json 파일도 삭제 ✅

결과:
- 문제은행에서 즉시 사라짐
- 디스크 공간 정리
- 데이터 일관성 유지
```

---

## 3. 단계별 개발 계획

### Phase 68-A: 파일 삭제 유틸리티 함수 추가

**파일**: `backend/app/utils/file_utils.py` (신규 또는 기존 확장)

```python
def delete_exported_problem(document_id: str, page_index: int, group_id: str) -> bool:
    """
    Export된 문제 파일 삭제 (PNG + JSON)

    Args:
        document_id: 문서 ID
        page_index: 페이지 인덱스
        group_id: 그룹 ID

    Returns:
        삭제 성공 여부
    """
    problems_dir = config.get_document_dir(document_id) / "problems"

    # 파일 패턴: {document_id}_p{page_index:04d}_{group_id}.{ext}
    base_name = f"{document_id}_p{page_index:04d}_{group_id}"

    deleted = False
    for ext in [".png", ".json"]:
        file_path = problems_dir / f"{base_name}{ext}"
        if file_path.exists():
            file_path.unlink()
            deleted = True

    return deleted
```

**예상 소요**: 15분

---

### Phase 68-B: Groups API에 삭제 로직 추가

**파일**: `backend/app/routers/groups.py`

**변경 위치**: 그룹 저장 API (또는 그룹 삭제 API)

```python
from app.utils.file_utils import delete_exported_problem

@router.put("/documents/{document_id}/pages/{page_index}/groups")
async def save_groups(document_id: str, page_index: int, groups: GroupsData):
    """그룹 저장 (삭제된 그룹의 export 파일도 정리)"""

    # 1. 기존 그룹 목록 로드
    existing_groups = load_existing_groups(document_id, page_index)
    existing_ids = {g["id"] for g in existing_groups}

    # 2. 새 그룹 목록에서 ID 추출
    new_ids = {g["id"] for g in groups.groups}

    # 3. 삭제된 그룹 식별
    deleted_ids = existing_ids - new_ids

    # 4. 삭제된 그룹의 export 파일 삭제
    for group_id in deleted_ids:
        delete_exported_problem(document_id, page_index, group_id)

    # 5. 새 그룹 목록 저장
    save_groups_json(document_id, page_index, groups)

    return {"status": "success", "deleted_exports": len(deleted_ids)}
```

**예상 소요**: 30분

---

### Phase 68-C: 세션 동기화 시 정리

**파일**: `backend/app/services/sync_manager.py`

**추가 메서드**:

```python
def cleanup_orphaned_exports(self, document_id: str) -> int:
    """
    groups.json에 없는 고아 export 파일 정리

    Returns:
        삭제된 파일 수
    """
    doc_dir = self.config.get_document_dir(document_id)
    problems_dir = doc_dir / "problems"
    groups_dir = doc_dir / "groups"

    if not problems_dir.exists():
        return 0

    # 모든 groups.json에서 유효한 group_id 수집
    valid_groups = set()
    for groups_file in groups_dir.glob("page_*_groups.json"):
        data = safe_json_read(groups_file, {"groups": []})
        for group in data.get("groups", []):
            valid_groups.add(group["id"])

    # problems 폴더에서 고아 파일 찾기
    deleted = 0
    for json_file in problems_dir.glob("*.json"):
        meta = safe_json_read(json_file, {})
        group_id = meta.get("group_id")

        if group_id and group_id not in valid_groups:
            # 고아 파일 삭제
            json_file.unlink()
            png_file = json_file.with_suffix(".png")
            if png_file.exists():
                png_file.unlink()
            deleted += 2

    return deleted
```

**예상 소요**: 30분

---

### Phase 68-D: API 엔드포인트 추가 (관리용)

**파일**: `backend/app/routers/export.py`

```python
@router.post("/documents/{document_id}/cleanup-orphans")
async def cleanup_orphan_exports(document_id: str):
    """고아 export 파일 정리 (수동 실행용)"""
    from app.services.sync_manager import sync_manager

    deleted = sync_manager.cleanup_orphaned_exports(document_id)

    return {
        "status": "success",
        "deleted_files": deleted,
        "message": f"{deleted}개 고아 파일 삭제됨"
    }
```

**예상 소요**: 15분

---

### Phase 68-E: 프론트엔드 그룹 삭제 시 캐시 갱신

**파일**: `frontend/src/hooks/useDocuments.ts`

```typescript
// 그룹 저장 시 문제은행 캐시도 갱신
export function useSavePageGroups() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ documentId, pageIndex, groups }) =>
      api.savePageGroups(documentId, pageIndex, groups),
    onSuccess: (_, variables) => {
      // 기존: 그룹 캐시 갱신
      queryClient.invalidateQueries({
        queryKey: ['groups', variables.documentId, variables.pageIndex],
      });

      // 추가: 문제은행 캐시도 갱신 (삭제된 그룹 반영)
      queryClient.invalidateQueries({
        queryKey: ['allExportedProblems'],
      });
      queryClient.invalidateQueries({
        queryKey: ['problems', variables.documentId],
      });
    },
  });
}
```

**예상 소요**: 15분

---

## 4. 구현 순서 및 의존성

```
Phase 68-A ──────────────────┐
    (파일 삭제 유틸)           │
                              ▼
Phase 68-B ──────────────────┼──▶ 핵심 기능
    (그룹 저장 시 삭제)         │
                              │
Phase 68-C ──────────────────┤
    (고아 파일 정리)           │
                              ▼
Phase 68-D ──────────────────┼──▶ 관리 기능
    (정리 API)                │
                              │
Phase 68-E ──────────────────┘
    (프론트 캐시 갱신)
```

---

## 5. 테스트 시나리오

### 시나리오 1: 그룹 삭제 후 즉시 반영
1. 그룹 생성 → 확정 (export)
2. 그룹 삭제
3. 문제은행 확인 → 삭제된 문제 없어야 함 ✅

### 시나리오 2: 고아 파일 정리
1. cleanup API 호출
2. groups.json에 없는 export 파일 삭제됨 ✅

### 시나리오 3: 그룹 수정
1. 기존 그룹에서 블록 제거/추가
2. 확정 (재export)
3. 기존 export 파일 유지 (삭제 아님)

---

## 6. 예상 총 소요 시간

| Phase | 내용 | 시간 |
|-------|------|------|
| 68-A | 파일 삭제 유틸리티 | 15분 |
| 68-B | Groups API 수정 | 30분 |
| 68-C | 고아 파일 정리 서비스 | 30분 |
| 68-D | 정리 API 엔드포인트 | 15분 |
| 68-E | 프론트엔드 캐시 갱신 | 15분 |
| **합계** | | **~1시간 45분** |

---

## 7. 다음 단계

```
"Phase 68 진행해줘"
```

---

*개발 계획 완료: 2025-12-09*
