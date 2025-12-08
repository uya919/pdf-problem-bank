# Phase 54: 문제은행-라벨링 시스템 동기화

**작성일**: 2025-12-05
**관련 리포트**: `docs/148_feasibility_problem_bank_labeling_sync.md`

---

## 목표

문제은행에서 문제 삭제 시 라벨링 파일(groups.json)에서도 삭제되도록 동기화

---

## 체크리스트

### Phase 54-A: sync_manager에 삭제 함수 추가
- [x] `delete_group_from_disk()` 함수 추가
- [x] `delete_exported_problem()` 함수 추가 (이미지/JSON 삭제)

### Phase 54-B: 삭제 API 수정
- [x] `work_sessions.py`의 `remove_problem()` 수정
- [x] groups.json에서 그룹 삭제 로직 추가
- [x] 해설 groups.json의 link 제거 로직 추가
- [x] 내보낸 이미지/JSON 삭제 로직 추가

### Phase 54-C: 테스트
- [ ] 문제 삭제 → 라벨링 페이지 확인
- [ ] 동기화 후 부활하지 않는지 확인
- [ ] 해설 연결이 정리되는지 확인

---

## 상세 구현

### Phase 54-A: sync_manager.py 수정

**파일**: `backend/app/services/sync_manager.py`

```python
# 추가할 함수들

def delete_group_from_disk(
    document_id: str,
    page_index: int,
    group_id: str
) -> bool:
    """
    Phase 54-A: groups.json에서 그룹 삭제

    Args:
        document_id: 문서 ID
        page_index: 페이지 인덱스
        group_id: 삭제할 그룹 ID

    Returns:
        삭제 성공 여부
    """
    groups_file = (
        config.get_document_dir(document_id) /
        "groups" /
        f"page_{page_index:04d}_groups.json"
    )

    if not groups_file.exists():
        return False

    data = json.loads(groups_file.read_text(encoding='utf-8'))
    original_count = len(data.get('groups', []))

    # 그룹 필터링 (삭제)
    data['groups'] = [
        g for g in data.get('groups', [])
        if g.get('id') != group_id
    ]

    # 변경이 있으면 저장
    if len(data['groups']) < original_count:
        groups_file.write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding='utf-8'
        )
        return True

    return False


def delete_exported_problem(
    document_id: str,
    page_index: int,
    group_id: str
) -> dict:
    """
    Phase 54-A: 내보낸 문제 이미지/JSON 삭제

    Args:
        document_id: 문서 ID
        page_index: 페이지 인덱스
        group_id: 그룹 ID

    Returns:
        삭제 결과 {"png": bool, "json": bool}
    """
    problems_dir = config.get_document_dir(document_id) / "problems"
    base_name = f"{document_id}_p{page_index:04d}_{group_id}"

    result = {"png": False, "json": False}

    # PNG 삭제
    png_file = problems_dir / f"{base_name}.png"
    if png_file.exists():
        png_file.unlink()
        result["png"] = True

    # JSON 삭제
    json_file = problems_dir / f"{base_name}.json"
    if json_file.exists():
        json_file.unlink()
        result["json"] = True

    return result
```

---

### Phase 54-B: work_sessions.py 수정

**파일**: `backend/app/routers/work_sessions.py`

**현재 코드** (약 288-320행):
```python
@router.delete("/{session_id}/problems/{group_id}")
async def remove_problem(session_id: str, group_id: str):
    session = _load_session(session_id)

    # 세션에서 삭제
    session.problems = [p for p in session.problems if p.groupId != group_id]
    session.links = [l for l in session.links if l.problemGroupId != group_id]

    _save_session(session)
    return session
```

**수정 코드**:
```python
@router.delete("/{session_id}/problems/{group_id}")
async def remove_problem(session_id: str, group_id: str):
    """
    Phase 54-B: 문제 삭제 (세션 + groups.json + 이미지)
    """
    session = _load_session(session_id)

    # 1. 삭제할 문제 찾기
    problem = next(
        (p for p in session.problems if p.groupId == group_id),
        None
    )

    if not problem:
        raise HTTPException(
            status_code=404,
            detail=f"문제를 찾을 수 없습니다: {group_id}"
        )

    # 2. 연결된 해설 링크 찾기
    link = next(
        (l for l in session.links if l.problemGroupId == group_id),
        None
    )

    # 3. 문제 groups.json에서 삭제
    from app.services import sync_manager

    deleted_from_disk = sync_manager.delete_group_from_disk(
        document_id=session.problemDocumentId,
        page_index=problem.pageIndex,
        group_id=group_id
    )

    # 4. 해설 groups.json에서 link 제거 (있으면)
    if link:
        sync_manager.clear_link_from_group(
            document_id=link.solutionDocumentId,
            page_index=link.solutionPageIndex,
            group_id=link.solutionGroupId
        )

    # 5. 내보낸 이미지/JSON 삭제
    deleted_exports = sync_manager.delete_exported_problem(
        document_id=session.problemDocumentId,
        page_index=problem.pageIndex,
        group_id=group_id
    )

    # 6. 세션에서 삭제
    session.problems = [p for p in session.problems if p.groupId != group_id]
    session.links = [l for l in session.links if l.problemGroupId != group_id]

    _save_session(session)

    # 로그
    print(f"[Phase 54] 문제 삭제: {group_id}")
    print(f"  - groups.json: {deleted_from_disk}")
    print(f"  - exports: {deleted_exports}")

    return session
```

---

## 데이터 흐름 (수정 후)

```
사용자: "문제 L1 삭제"
         │
         ▼
DELETE /api/work-sessions/{id}/problems/L1
         │
         ├─► 1. problem 찾기 (pageIndex 확보)
         │
         ├─► 2. link 찾기 (해설 연결 정보)
         │
         ├─► 3. groups.json에서 삭제 ◄─── 신규
         │   └─ delete_group_from_disk()
         │
         ├─► 4. 해설 link 제거 ◄─── 신규
         │   └─ clear_link_from_group()
         │
         ├─► 5. 내보낸 파일 삭제 ◄─── 신규
         │   └─ delete_exported_problem()
         │
         ├─► 6. session.problems에서 삭제 (기존)
         │
         └─► 7. session.links에서 삭제 (기존)
```

---

## 영향 범위

| 파일 | 수정 내용 |
|------|----------|
| `sync_manager.py` | 함수 2개 추가 |
| `work_sessions.py` | `remove_problem()` 수정 |

---

## 테스트 시나리오

### 시나리오 1: 단순 삭제
1. 문제은행에서 문제 "L1" 삭제
2. 라벨링 페이지 이동
3. **기대**: "L1" 그룹이 보이지 않음

### 시나리오 2: 연결된 문제 삭제
1. 문제 "L1"과 해설 "S1"이 연결됨
2. 문제 "L1" 삭제
3. **기대**:
   - 문제 "L1" 삭제됨
   - 해설 "S1"의 link 필드 제거됨
   - 해설 "S1"은 유지됨 (독립적)

### 시나리오 3: 부활 방지
1. 문제 "L1" 삭제
2. 동기화 버튼 클릭 또는 페이지 새로고침
3. **기대**: "L1"이 다시 나타나지 않음

### 시나리오 4: 내보낸 파일 삭제
1. 문제 "L1" 내보내기 완료
2. 문제 "L1" 삭제
3. **기대**:
   - `problems/문서_p0001_L1.png` 삭제됨
   - `problems/문서_p0001_L1.json` 삭제됨

---

## 예상 시간

| 단계 | 시간 |
|------|------|
| Phase 54-A | 10분 |
| Phase 54-B | 15분 |
| Phase 54-C (테스트) | 15분 |
| **총계** | **40분** |

---

## 롤백 계획

문제 발생 시:
1. `sync_manager.py`의 신규 함수 제거
2. `work_sessions.py`의 `remove_problem()` 원복

---

**"진행해줘"로 구현을 시작합니다.**
