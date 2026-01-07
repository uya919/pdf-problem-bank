# 문제은행 표시 오류 리포트

**문서 번호**: 224
**작성일**: 2025-12-09
**심각도**: 높음 (데이터 표시 누락)
**상태**: 원인 파악 완료

---

## 1. 증상

### 1.1 사용자 보고
- 라벨링 작업에서 모문제에 연결된 문제들을 등록하고 해설 연결까지 완료
- 문제은행 페이지에서 해당 문제들이 보이지 않음

### 1.2 현황 분석

| 페이지 | 라벨링된 문제 | 문제은행에 표시 | 상태 |
|--------|--------------|----------------|------|
| p8 (pageIndex=7) | 12개 문제 + 4개 모문제 | 0개 | **누락** |
| p9 (pageIndex=8) | 12개 문제 + 3개 모문제 | 0개 | **누락** |
| p10 (pageIndex=9) | 7개 문제 | 7개 | 정상 |

**API 응답 확인**:
```
GET /api/export/all-problems
→ Total: 7개 (p10 문제만 표시)
```

---

## 2. 원인 분석

### 2.1 데이터 흐름 분석

```
┌─────────────────────────────────────────────────────────────────┐
│                     PDF 라벨링 워크플로우                         │
└─────────────────────────────────────────────────────────────────┘

[1] 그룹 생성 (라벨링)
    └── groups/page_XXXX_groups.json 저장
    └── status: 없음 (미확정)

[2] 문제 정보 입력
    └── problemInfo 추가 (문제번호, 교재명 등)
    └── parentGroupId 연결 (모문제 연결)

[3] 해설 연결                          ← 여기까지 완료됨
    └── work_sessions/session.links에 저장

[4] ★ 내보내기(확정) ★                 ← 이 단계 누락!
    └── groups.json에 status: "confirmed" 추가
    └── problems/ 폴더에 JSON + PNG 생성
    └── 문제은행 API에서 조회 가능

```

### 2.2 핵심 원인

**"내보내기(확정)" 단계가 수행되지 않음**

문제은행 API (`/api/export/all-problems`)는 `problems/` 폴더의 JSON 파일을 스캔합니다:

```python
# backend/app/routers/export.py:1054-1059
problems_dir = doc_dir / "problems"
if not problems_dir.exists():
    continue

for meta_file in problems_dir.glob("*.json"):
    # 문제 데이터 읽기...
```

### 2.3 데이터 상태 비교

**p8, p9 문제 (누락)**:
```json
// groups/page_0007_groups.json
{
  "id": "g_1765102238787_9uepaznmr",
  "problemInfo": { "problemNumber": "1", ... },
  "parentGroupId": "g_1765102235199_s26b1j2g7"
  // ❌ status 필드 없음
  // ❌ exportedAt 필드 없음
}
```

**p10 문제 (정상)**:
```json
// groups/page_0009_groups.json
{
  "id": "p9_L1",
  "status": "confirmed",        // ✅ 확정됨
  "exportedAt": "2025-12-09T01:01:46.744Z",  // ✅ 내보내기 완료
  "problemInfo": { ... }
}

// problems/고1_공통수학1_베이직쎈_문제_p0009_p9_L1.json
{
  "document_id": "고1_공통수학1_베이직쎈_문제",
  "page_index": 9,
  "group_id": "p9_L1",
  "image_path": "problems/고1_공통수학1_베이직쎈_문제_p0009_p9_L1.png"
}
```

---

## 3. 영향 범위

### 3.1 누락된 데이터

| 문서 | 페이지 | 문제 수 | 모문제 | 해설 연결 |
|------|--------|---------|--------|----------|
| 고1_공통수학1_베이직쎈_문제 | p8 | 12개 | 4개 | 12개 연결됨 |
| 고1_공통수학1_베이직쎈_문제 | p9 | 12개 | 3개 | 12개 연결됨 |
| **합계** | - | **24개** | **7개** | **24개** |

### 3.2 정상 표시 데이터

| 문서 | 페이지 | 문제 수 |
|------|--------|---------|
| 고1_공통수학1_베이직쎈_문제 | p10 | 7개 |

---

## 4. 해결 방안

### 4.1 즉시 조치 (수동 내보내기)

라벨링 페이지에서 해당 문제들을 선택하고 **"확정"** 버튼 클릭:

1. http://localhost:5173 접속
2. 작업 세션 선택: "고1 공통수학1 - 베이직쎈"
3. 문제집 탭 → 페이지 8 이동
4. 각 문제 그룹 선택 → "확정" 클릭
5. 페이지 9에서도 동일 작업 수행

### 4.2 UI/UX 개선 제안 (장기)

#### A. 라벨링 완료 상태 명확화

```
현재: 그룹 생성 후 별도 "확정" 필요
개선: 문제번호 입력 시 자동 확정 옵션 추가

[x] 문제번호 입력 시 자동으로 문제은행에 등록
```

#### B. 일괄 내보내기 기능

```
페이지 단위 일괄 확정 버튼:
[📤 이 페이지 전체 확정] [📤 미확정 문제 모두 확정]
```

#### C. 상태 시각화 개선

```
그룹 카드에 상태 표시:
┌─────────────────┐
│ 1번 문제        │ ← 문제번호
│ [미확정]        │ ← 상태 뱃지 (노란색)
│ [해설 연결됨]    │ ← 해설 연결 상태 (초록색)
└─────────────────┘
```

---

## 5. 데이터 복구 절차

### 5.1 현재 상태 확인

```bash
# 라벨링된 그룹 수 확인
# groups/ 폴더의 그룹 수

# 내보내기된 문제 수 확인
# problems/ 폴더의 JSON 파일 수
```

### 5.2 자동 복구 스크립트 (필요시)

```python
# 미확정 그룹을 자동으로 내보내기하는 스크립트
# backend/scripts/export_pending_groups.py

import json
from pathlib import Path

def export_pending_groups(document_id: str):
    """미확정 상태의 그룹들을 자동으로 내보내기"""
    doc_dir = Path(f"dataset_root/documents/{document_id}")
    groups_dir = doc_dir / "groups"

    for groups_file in groups_dir.glob("page_*_groups.json"):
        data = json.load(open(groups_file))

        for group in data.get("groups", []):
            # 문제번호가 있고, 확정되지 않은 그룹
            if (group.get("problemInfo", {}).get("problemNumber")
                and group.get("status") != "confirmed"):
                # 내보내기 API 호출
                export_group(document_id, page_index, group["id"])
```

---

## 6. 결론

| 항목 | 내용 |
|------|------|
| **근본 원인** | 라벨링 후 "내보내기(확정)" 단계 미수행 |
| **영향** | 24개 문제가 문제은행에 표시되지 않음 |
| **즉시 해결** | 라벨링 페이지에서 수동으로 각 문제 "확정" |
| **장기 개선** | 자동 확정 옵션 또는 일괄 확정 기능 추가 |

---

## 7. 참고 자료

### 7.1 관련 코드

| 파일 | 역할 |
|------|------|
| `frontend/src/components/problemBank/CropProblemBank.tsx` | 문제은행 UI |
| `frontend/src/hooks/useDocuments.ts:useAllExportedProblems` | API 호출 훅 |
| `backend/app/routers/export.py:list_all_exported_problems` | 문제 조회 API |

### 7.2 데이터 파일

| 파일 | 내용 |
|------|------|
| `dataset_root/documents/*/groups/page_*_groups.json` | 그룹 데이터 (라벨링) |
| `dataset_root/documents/*/problems/*.json` | 내보내기된 문제 메타데이터 |
| `dataset_root/work_sessions/*.json` | 작업 세션 (해설 연결 정보) |

---

*작성: Claude Code 자동 분석*
