# 구현 가능성 분석: 문제은행-라벨링 시스템 동기화

**작성일**: 2025-12-05
**요청**: 문제은행에서 삭제 시 라벨링 파일에서도 삭제

---

## 1. 현재 문제

### 증상
```
1. 문제은행에서 문제 삭제
2. 라벨링 페이지로 이동
3. 삭제한 문제의 그룹과 블록이 그대로 표시됨
4. 다음 동기화 시 삭제한 문제가 "부활"함
```

### 원인: 비대칭 삭제
```
┌─────────────────┐     삭제 O     ┌─────────────────┐
│  session.json   │ ◄──────────── │   사용자 삭제    │
│  (문제은행)      │               │                 │
└─────────────────┘               └─────────────────┘
         │
         │ 동기화 (groups → session)
         │
         ▼
┌─────────────────┐     삭제 X
│  groups.json    │ ◄──────────── (변경 없음!)
│  (라벨링 파일)   │
└─────────────────┘
```

---

## 2. 데이터 흐름 분석

### SSOT (Single Source of Truth) 원칙
| 데이터 | 원본 | 캐시 |
|--------|------|------|
| **그룹/문제** | `groups.json` (디스크) | `session.problems` (메모리) |
| **연결(링크)** | `session.links` (메모리) | `groups.json.link` (디스크) |

### 문제점
- 삭제는 `session.problems`에서만 수행
- `groups.json`은 그대로 유지
- 다음 동기화 시 `groups.json` → `session.problems`로 복구됨 (부활 버그)

---

## 3. 영향 받는 코드

### 현재 삭제 로직 (`work_sessions.py:288-320`)
```python
@router.delete("/{session_id}/problems/{group_id}")
async def remove_problem(session_id: str, group_id: str):
    session = _load_session(session_id)

    # ✅ 세션에서 삭제
    session.problems = [p for p in session.problems if p.groupId != group_id]
    session.links = [l for l in session.links if l.problemGroupId != group_id]

    _save_session(session)

    # ❌ groups.json에서 삭제하지 않음!
```

### 동기화 로직 (`sync_manager.py:118`)
```python
# groups.json에 있지만 session에 없으면 → 추가 (부활 버그)
for composite_key in (new_composite_ids - existing_composite_ids):
    session.problems.append(ProblemReference(...))
```

---

## 4. 해결 방안

### Option A: 하드 삭제 (권장)
```python
# groups.json에서 그룹 완전 삭제
def delete_group_from_disk(document_id: str, page_index: int, group_id: str):
    groups_file = get_groups_file(document_id, page_index)
    data = load_json(groups_file)
    data['groups'] = [g for g in data['groups'] if g['id'] != group_id]
    save_json(groups_file, data)
```

**장점**: 깔끔, 데이터 일관성
**단점**: 복구 불가

### Option B: 소프트 삭제
```python
# groups.json에서 삭제 플래그 설정
group['status'] = 'deleted'
group['deletedAt'] = datetime.now().isoformat()
```

**장점**: 복구 가능, 히스토리 보존
**단점**: 복잡도 증가, 필터링 필요

---

## 5. 구현 계획

### Phase 54: 문제은행-라벨링 동기화 수정

#### Phase 54-A: 삭제 API 수정
```python
# work_sessions.py의 remove_problem() 수정
@router.delete("/{session_id}/problems/{group_id}")
async def remove_problem(session_id: str, group_id: str):
    session = _load_session(session_id)
    problem = next((p for p in session.problems if p.groupId == group_id), None)

    if not problem:
        raise HTTPException(404, "문제를 찾을 수 없습니다")

    # 1. 연결된 해설 정보 가져오기
    link = next((l for l in session.links if l.problemGroupId == group_id), None)

    # 2. 문제 groups.json에서 삭제
    sync_manager.delete_group_from_disk(
        document_id=session.problemDocumentId,
        page_index=problem.pageIndex,
        group_id=group_id
    )

    # 3. 해설 groups.json에서 링크 제거 (있으면)
    if link:
        sync_manager.clear_link_from_group(
            document_id=link.solutionDocumentId,
            page_index=link.solutionPageIndex,
            group_id=link.solutionGroupId
        )

    # 4. 세션에서 삭제
    session.problems = [p for p in session.problems if p.groupId != group_id]
    session.links = [l for l in session.links if l.problemGroupId != group_id]

    _save_session(session)
    return session
```

#### Phase 54-B: sync_manager에 삭제 함수 추가
```python
# sync_manager.py에 추가
def delete_group_from_disk(
    document_id: str,
    page_index: int,
    group_id: str
) -> bool:
    """groups.json에서 그룹 삭제"""
    groups_file = config.get_document_dir(document_id) / "groups" / f"page_{page_index:04d}_groups.json"

    if not groups_file.exists():
        return False

    data = json.loads(groups_file.read_text(encoding='utf-8'))
    original_count = len(data.get('groups', []))
    data['groups'] = [g for g in data.get('groups', []) if g['id'] != group_id]

    if len(data['groups']) < original_count:
        groups_file.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
        return True

    return False
```

#### Phase 54-C: 내보낸 이미지 삭제 (선택)
```python
# 문제 이미지도 함께 삭제
def delete_exported_problem(document_id: str, page_index: int, group_id: str):
    problems_dir = config.get_document_dir(document_id) / "problems"

    # PNG 삭제
    png_file = problems_dir / f"{document_id}_p{page_index:04d}_{group_id}.png"
    if png_file.exists():
        png_file.unlink()

    # JSON 삭제
    json_file = problems_dir / f"{document_id}_p{page_index:04d}_{group_id}.json"
    if json_file.exists():
        json_file.unlink()
```

---

## 6. 작업량 추정

| 단계 | 작업 | 시간 |
|------|------|------|
| Phase 54-A | 삭제 API 수정 | 15분 |
| Phase 54-B | sync_manager 함수 추가 | 10분 |
| Phase 54-C | 이미지 삭제 (선택) | 5분 |
| 테스트 | 삭제 → 라벨링 확인 | 10분 |
| **총계** | | **40분** |

---

## 7. 위험도 분석

| 항목 | 위험도 | 설명 |
|------|--------|------|
| 데이터 유실 | **중** | 하드 삭제는 복구 불가 |
| 기존 기능 영향 | 낮음 | 삭제 API만 수정 |
| 동기화 충돌 | 낮음 | 삭제 시점에 즉시 반영 |

### 완화 방안
- 삭제 전 확인 다이얼로그 표시 (프론트엔드)
- 삭제 로그 기록 (백엔드)
- 향후 휴지통 기능 추가 가능 (소프트 삭제)

---

## 8. 결론

### 구현 가능성: **쉬움**

- 코드 변경: 2개 파일 (`work_sessions.py`, `sync_manager.py`)
- 신규 함수: 1-2개
- 위험도: 낮음-중간
- 예상 시간: 40분

### 권장 사항

1. **즉시 구현**: Phase 54-A, 54-B (하드 삭제)
2. **선택 구현**: Phase 54-C (이미지 삭제)
3. **향후 고려**: 소프트 삭제 + 휴지통 기능

---

## 9. 부활 버그 수정

현재 동기화 로직도 수정 필요:

```python
# sync_manager.py 수정
# 기존: groups.json에 있으면 무조건 추가
# 수정: groups.json에 있고 status != 'deleted'인 경우만 추가

# 또는 하드 삭제 사용 시 별도 수정 불필요
# (groups.json에서 삭제되므로 부활 불가)
```

---

**"진행해줘"로 구현을 시작합니다.**
