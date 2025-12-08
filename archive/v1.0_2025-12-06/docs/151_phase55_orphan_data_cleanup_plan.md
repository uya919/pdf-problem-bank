# Phase 55: 고아 데이터 정리 기능

**작성일**: 2025-12-05
**관련 리포트**: `docs/150_error_report_orphaned_data_after_manual_deletion.md`

---

## 목표

파일 수동 삭제 또는 데이터 불일치 시 고아 데이터를 정리하는 기능 추가

---

## 체크리스트

### Phase 55-A: sync_manager에 정리 함수 추가
- [x] `cleanup_all_groups()` 함수 추가 - 모든 groups.json 비우기
- [x] `reset_session()` 함수 추가 - session.problems, links 초기화

### Phase 55-B: API 엔드포인트 추가
- [x] `POST /api/work-sessions/{session_id}/reset` - 세션 초기화 API
- [x] 응답에 삭제된 문제/연결 수 포함

### Phase 55-C: 테스트
- [ ] 세션 초기화 후 "0문제 0개 연결됨" 확인
- [ ] 라벨링 페이지에서 그룹 사라짐 확인

---

## 상세 구현

### Phase 55-A: sync_manager.py 수정

**파일**: `backend/app/services/sync_manager.py`

```python
def cleanup_all_groups(self, document_id: str) -> dict:
    """
    Phase 55-A: 문서의 모든 groups.json 비우기

    Args:
        document_id: 문서 ID

    Returns:
        {"files_cleaned": int, "groups_removed": int}
    """
    doc_dir = self.config.get_document_dir(document_id)
    groups_dir = doc_dir / "groups"

    if not groups_dir.exists():
        return {"files_cleaned": 0, "groups_removed": 0}

    files_cleaned = 0
    groups_removed = 0

    for groups_file in groups_dir.glob("page_*_groups.json"):
        with file_lock(groups_file):
            data = safe_json_read(groups_file, {"groups": []})
            groups_removed += len(data.get("groups", []))

            # 그룹 배열 비우기
            data["groups"] = []
            atomic_json_write(groups_file, data)
            files_cleaned += 1

    return {"files_cleaned": files_cleaned, "groups_removed": groups_removed}


def reset_session(self, session: WorkSession) -> dict:
    """
    Phase 55-A: 세션 완전 초기화

    1. session.problems 비우기
    2. session.links 비우기
    3. 문제/해설 문서의 groups.json 비우기

    Returns:
        {"problems_removed": int, "links_removed": int, "groups_removed": int}
    """
    result = {
        "problems_removed": len(session.problems),
        "links_removed": len(session.links),
        "groups_removed": 0
    }

    # 1. 문제 문서의 groups.json 정리
    if session.problemDocumentId:
        cleanup_result = self.cleanup_all_groups(session.problemDocumentId)
        result["groups_removed"] += cleanup_result["groups_removed"]

    # 2. 해설 문서의 groups.json 정리 (다른 문서인 경우)
    if session.solutionDocumentId and session.solutionDocumentId != session.problemDocumentId:
        cleanup_result = self.cleanup_all_groups(session.solutionDocumentId)
        result["groups_removed"] += cleanup_result["groups_removed"]

    # 3. 세션 데이터 초기화
    session.problems = []
    session.links = []

    return result
```

---

### Phase 55-B: work_sessions.py 수정

**파일**: `backend/app/routers/work_sessions.py`

```python
@router.post("/{session_id}/reset")
async def reset_session(session_id: str):
    """
    Phase 55-B: 세션 완전 초기화

    모든 문제, 연결, groups.json 데이터 삭제

    Args:
        session_id: 세션 ID

    Returns:
        초기화 결과 및 업데이트된 세션
    """
    try:
        session = _load_session(session_id)

        # 세션 초기화
        result = sync_manager.reset_session(session)

        # 세션 저장
        _save_session(session)

        print(f"[Phase 55] 세션 초기화: {session_id}")
        print(f"  - 문제 삭제: {result['problems_removed']}개")
        print(f"  - 연결 삭제: {result['links_removed']}개")
        print(f"  - 그룹 삭제: {result['groups_removed']}개")

        return {
            "success": True,
            "result": result,
            "session": session
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[API 오류] 세션 초기화 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"세션 초기화 실패: {str(e)}")
```

---

## 데이터 흐름

```
POST /api/work-sessions/{id}/reset
         │
         ▼
    reset_session()
         │
         ├─► 1. cleanup_all_groups(problemDocumentId)
         │       └─ 모든 page_*_groups.json 비우기
         │
         ├─► 2. cleanup_all_groups(solutionDocumentId)
         │       └─ 해설 문서 groups.json 비우기
         │
         ├─► 3. session.problems = []
         │
         ├─► 4. session.links = []
         │
         └─► 5. _save_session()
```

---

## 사용 시나리오

### 시나리오 1: 수동 파일 삭제 후 정리
```
1. 사용자가 problems/ 폴더의 파일을 직접 삭제
2. UI에서 "세션 초기화" 버튼 클릭 (또는 API 직접 호출)
3. 모든 고아 데이터 정리됨
4. "0문제 0개 연결됨" 표시
```

### 시나리오 2: 새로 시작하고 싶을 때
```
1. 기존 라벨링 작업을 전부 버리고 새로 시작
2. "세션 초기화" 클릭
3. 깨끗한 상태에서 다시 시작
```

---

## API 테스트 방법

```bash
# curl로 테스트
curl -X POST http://localhost:8000/api/work-sessions/{session_id}/reset

# 응답 예시
{
  "success": true,
  "result": {
    "problems_removed": 57,
    "links_removed": 3,
    "groups_removed": 57
  },
  "session": {
    "sessionId": "ws-...",
    "problems": [],
    "links": []
  }
}
```

---

## 영향 범위

| 파일 | 수정 내용 |
|------|----------|
| `sync_manager.py` | `cleanup_all_groups()`, `reset_session()` 추가 |
| `work_sessions.py` | `POST /{session_id}/reset` 엔드포인트 추가 |

---

## 예상 시간

| 단계 | 시간 |
|------|------|
| Phase 55-A | 10분 |
| Phase 55-B | 10분 |
| Phase 55-C (테스트) | 10분 |
| **총계** | **30분** |

---

## 향후 확장 (선택)

### UI 버튼 추가
```typescript
// UnifiedWorkPage.tsx 또는 문제은행 페이지
<Button onClick={handleReset} variant="destructive">
  세션 초기화
</Button>
```

### 확인 다이얼로그
```typescript
const handleReset = async () => {
  if (confirm("모든 문제와 연결이 삭제됩니다. 계속하시겠습니까?")) {
    await api.resetSession(sessionId);
    // 새로고침 또는 상태 업데이트
  }
};
```

---

**"진행해줘"로 구현을 시작합니다.**
