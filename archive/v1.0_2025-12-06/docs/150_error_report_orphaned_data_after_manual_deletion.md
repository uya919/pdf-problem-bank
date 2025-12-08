# 에러 리포트: 문제은행 파일 수동 삭제 후 고아 데이터 문제

**작성일**: 2025-12-05
**심각도**: 중간
**상태**: 분석 완료

---

## 1. 문제 상황

### 사용자 행동
```
1. 문제은행에서 모든 이미지 크롭 파일(PNG/JSON)을 직접 삭제
2. 라벨링 페이지 확인
```

### 기대 결과
```
- "57문제 3개 연결됨" 메시지 사라짐
- 관련 데이터 모두 삭제됨
```

### 실제 결과
```
- "57문제 3개 연결됨" 메시지 그대로 표시
- session.problems: 57개 유지
- session.links: 3개 유지
- groups.json: 모든 그룹 정의 유지
```

---

## 2. 원인 분석

### 데이터 계층 구조
```
┌─────────────────────────────────────────────────────────────┐
│  groups.json (원본 - SSOT)                                  │
│  └─ 57개 그룹 정의 ✅ 그대로                                │
├─────────────────────────────────────────────────────────────┤
│  session.problems (캐시)                                    │
│  └─ 57개 문제 참조 ✅ 그대로                                │
├─────────────────────────────────────────────────────────────┤
│  session.links (원본 - SSOT)                                │
│  └─ 3개 연결 ✅ 그대로                                      │
├─────────────────────────────────────────────────────────────┤
│  problems/ 폴더 (내보낸 파일)                               │
│  └─ PNG/JSON 파일 ❌ 삭제됨                                 │
└─────────────────────────────────────────────────────────────┘
```

### 핵심 문제
```
파일 시스템에서 직접 삭제 → API 우회 → 동기화 시스템 인식 불가
```

### 동기화 로직의 한계
```python
# sync_manager.py의 get_sync_status()
def get_sync_status(self, session: WorkSession):
    groups_count = len(groups.json의 그룹)  # 57
    session_count = len(session.problems)   # 57

    if groups_count == session_count:
        return "synced"  # ← PNG 파일 존재 여부 확인 안함!
```

---

## 3. 고아 데이터 목록

| 데이터 | 위치 | 상태 | 문제 |
|--------|------|------|------|
| 그룹 정의 57개 | `groups/*.json` | 존재 | 내보낸 파일 없음 |
| 문제 참조 57개 | `session.problems` | 존재 | 실제 파일 없음 |
| 연결 3개 | `session.links` | 존재 | 대상 없음 |
| 내보낸 파일 | `problems/*.png` | **삭제됨** | - |

---

## 4. 영향 범위

### UI 표시 오류
- 문제은행: "57문제" 표시 (실제 파일 없음)
- 연결 상태: "3개 연결됨" 표시 (실제 파일 없음)
- 동기화 상태: "synced" 표시 (불일치)

### 데이터 불일치
- 내보내기 시도 시 파일 없음 오류 발생 가능
- 연결된 해설 조회 시 문제 없음

---

## 5. 해결 방안

### Option A: 전체 초기화 (즉시 해결)
```
문제: 모든 groups.json과 session 데이터 삭제
효과: 깨끗한 상태에서 다시 시작
단점: 기존 작업 전부 손실
```

### Option B: 고아 데이터 정리 기능 추가 (권장)
```python
# sync_manager.py에 추가
def cleanup_session(self, session: WorkSession) -> CleanupResult:
    """
    groups.json에 없는 문제를 session에서 제거
    """
    # 1. groups.json의 모든 그룹 ID 수집
    all_group_ids = self._collect_all_group_ids(session.problemDocumentId)

    # 2. session.problems에서 고아 찾기
    orphaned = [p for p in session.problems
                if f"{p.pageIndex}:{p.groupId}" not in all_group_ids]

    # 3. 고아 제거
    for orphan in orphaned:
        session.problems.remove(orphan)
        session.links = [l for l in session.links
                        if l.problemGroupId != orphan.groupId]

    return CleanupResult(removed=len(orphaned))
```

### Option C: groups.json도 함께 삭제 (완전 정리)
```python
def full_cleanup(self, session: WorkSession):
    """
    1. session.problems, session.links 초기화
    2. 모든 groups.json의 groups 배열 비우기
    3. problems/ 폴더 비우기 (이미 비어있음)
    """
```

---

## 6. 권장 해결책

### Phase 55: 고아 데이터 정리 기능

#### Phase 55-A: cleanup_session() 함수 추가
```python
# sync_manager.py
def cleanup_session(self, session: WorkSession) -> dict:
    """세션에서 고아 데이터 정리"""
    pass
```

#### Phase 55-B: API 엔드포인트 추가
```python
# work_sessions.py
@router.post("/{session_id}/cleanup")
async def cleanup_session(session_id: str):
    """고아 데이터 정리 API"""
    pass
```

#### Phase 55-C: UI 버튼 추가 (선택)
```
[데이터 정리] 버튼 → cleanup API 호출
```

---

## 7. 임시 해결책 (수동)

### 방법 1: 세션 파일 직접 수정
```bash
# 세션 파일 위치
dataset_root/work_sessions/ws-*.json

# problems와 links 배열 비우기
{
  "problems": [],
  "links": []
}
```

### 방법 2: groups.json 파일 직접 수정
```bash
# 모든 groups.json의 groups 배열 비우기
# 위치: documents/{doc_id}/groups/page_*_groups.json
{
  "groups": []
}
```

### 방법 3: 새 세션 생성
```
1. 기존 세션 삭제
2. 새 세션 생성
3. 라벨링 작업 다시 시작
```

---

## 8. 예방책

### API를 통한 삭제만 허용
```
❌ 파일 탐색기에서 직접 삭제
✅ 문제은행 UI에서 삭제 버튼 사용
```

### 삭제 흐름 (올바른 방법)
```
UI 삭제 버튼 클릭
    ↓
DELETE /api/work-sessions/{id}/problems/{groupId}
    ↓
├─ groups.json에서 삭제
├─ session.problems에서 삭제
├─ session.links에서 삭제
└─ problems/*.png, *.json 삭제
```

---

## 9. 결론

| 항목 | 내용 |
|------|------|
| **원인** | 파일 직접 삭제 시 API 우회로 동기화 누락 |
| **영향** | UI에 고아 데이터 표시 (57문제, 3연결) |
| **권장** | Phase 55 구현 또는 수동 정리 |
| **예방** | API를 통한 삭제만 사용 |

---

**"진행해줘"로 Phase 55 구현을 시작합니다.**
