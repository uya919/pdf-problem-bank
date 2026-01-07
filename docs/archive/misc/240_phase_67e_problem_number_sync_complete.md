# Phase 67-E: 문제 번호 동기화 수정 완료

**작성일**: 2025-12-09
**상태**: 완료

---

## 1. 문제 원인

사용자가 UI에서 설정한 문제 번호가 **세션에만** 저장되고, **groups.json**에는 동기화되지 않았습니다.

```
데이터 흐름 (Before):
UI 라벨링 → session.problems[].problemNumber ✓
           ↳ groups.json.problemInfo.problemNumber ✗ (누락!)

Export 읽기:
export API → groups.json.problemInfo.problemNumber (없음!)
           → "p9_L1" 같은 group_id가 표시됨
```

---

## 2. 해결 방법

### 2.1 SyncManager 역방향 동기화 추가

```python
# sync_manager.py
def sync_session_to_groups(self, session: WorkSession) -> SyncResult:
    """
    Phase 67-E: session.problems → groups.json 역방향 동기화
    세션에서 설정한 problemNumber를 groups.json에 반영
    """
```

### 2.2 Export API 세션 데이터 보완

```python
# export.py
def _get_problem_number_from_session(document_id, page_index, group_id):
    """groups.json에 problemNumber가 없을 때 세션에서 가져옴"""

# export 시 fallback 로직
problem_info = group.get("problemInfo", {})
if not problem_info.get("problemNumber"):
    session_number = _get_problem_number_from_session(...)
    if session_number:
        problem_info["problemNumber"] = session_number
```

---

## 3. 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `backend/app/services/sync_manager.py` | `sync_session_to_groups()` 메서드 추가, `full_sync()` 에 역동기화 포함 |
| `backend/app/routers/export.py` | `_get_problem_number_from_session()` 헬퍼 추가, export 시 세션 데이터 fallback |

---

## 4. 데이터 흐름 (After)

```
데이터 흐름 (After):
UI 라벨링 → session.problems[].problemNumber ✓

Export 읽기:
1. groups.json.problemInfo.problemNumber 확인
2. 없으면 → session.problems에서 조회
3. 문제 번호를 problem_info에 포함하여 저장
```

---

## 5. 기존 문제 재내보내기

기존에 내보낸 문제들은 다시 "확정" 해야 새로운 problem_info가 적용됩니다.

또는 마이그레이션 API 호출:
```bash
curl -X POST http://localhost:8000/api/export/migrate-problem-info
```

---

## 6. 결론

- **원인**: 단방향 동기화 (groups.json → session만 존재)
- **해결**: 역방향 동기화 추가 + export 시 세션 fallback
- **결과**: 문제 번호가 문제은행 카드에 정상 표시

---

*Phase 67-E 완료: 2025-12-09*
