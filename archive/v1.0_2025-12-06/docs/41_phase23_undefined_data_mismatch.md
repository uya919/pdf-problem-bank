# Phase 23 데이터 불일치 에러 리포트

---

## 1. 에러 현상

### 1.1 콘솔 에러
```
getProblemImageUrl: missing documentId or imagePath
{documentId: undefined, imagePath: undefined}
```

### 1.2 React 경고
```
Encountered two children with the same key, 'undefined-undefined-undefined'.
Keys should be unique...
```

### 1.3 증상
- 문제은행 허브에서 69개 문제가 표시됨
- 모든 문제 이미지가 플레이스홀더 아이콘으로 표시
- `document_id`, `image_path` 모두 undefined

---

## 2. 원인 분석

### 2.1 핵심 원인: 데이터 소스 혼동

`/api/export/all-problems` API가 **잘못된 데이터 소스**를 읽고 있음.

#### 현재 코드 (export.py:478-479)
```python
# 모든 문서
doc_dirs = [d for d in config.DATASET_ROOT.iterdir() if d.is_dir()]
```

이 코드는 `DATASET_ROOT` 내의 **모든 디렉토리**를 스캔함.

### 2.2 두 가지 데이터 소스

| 폴더 | 용도 | 데이터 구조 |
|------|------|------------|
| `problem_bank/problems/` | HML/HWPX 파싱 문제 (69개) | `id`, `number`, `content_text`, `content_equations` |
| `documents/{doc_id}/problems/` | 크롭 문제 (이미지) | `document_id`, `page_index`, `group_id`, `image_path` |

### 2.3 문제 발생 경로

```
1. API 호출: GET /api/export/all-problems
2. export.py가 DATASET_ROOT 전체 스캔
3. problem_bank/problems/ 폴더 발견 (HML/HWPX 데이터)
4. 69개 JSON 파일 로드 (잘못된 구조)
5. 프론트엔드에서 document_id, image_path 접근 시 undefined
```

### 2.4 실제 API 응답 (잘못된 구조)
```json
{
  "id": "0028b70d-1927-40c2-be55-0000b67ee2f8",
  "number": "11",
  "content_text": "점 A (-2, -1)...",
  "content_equations": [...],
  "metadata": {...},
  "answer_id": "546acd02-9902-4cf9-b460-076a09cdfafc"
}
```

### 2.5 기대하는 API 응답 (크롭 문제)
```json
{
  "document_id": "수학교재_001",
  "page_index": 5,
  "group_id": "G001",
  "image_path": "documents/수학교재_001/problems/..._G001.png",
  "problem_info": {
    "problemNumber": "1번",
    "bookName": "수학교재"
  },
  "exported_at": "2025-12-02T10:00:00"
}
```

---

## 3. 해결 방안

### 3.1 API 수정 필요

`export.py`의 `list_all_exported_problems` 함수를 수정하여 **documents 폴더만** 스캔하도록 변경:

```python
# 수정 전 (현재)
doc_dirs = [d for d in config.DATASET_ROOT.iterdir() if d.is_dir()]

# 수정 후 (권장)
documents_dir = config.DATASET_ROOT / "documents"
if documents_dir.exists():
    doc_dirs = [d for d in documents_dir.iterdir() if d.is_dir()]
else:
    doc_dirs = []
```

### 3.2 대안: 필터 추가

문제 데이터에 `document_id` 필드가 있는지 확인하여 필터링:

```python
for meta_file in problems_dir.glob("*.json"):
    problem_data = load_json(meta_file)

    # 크롭 문제만 포함 (document_id 필드 확인)
    if "document_id" not in problem_data:
        continue

    all_problems.append(problem_data)
```

---

## 4. 영향 범위

### 4.1 영향받는 컴포넌트
- `CropProblemBank.tsx`: 이미지 표시 불가
- `ProblemBankHub.tsx`: 잘못된 문제 개수 표시 (69개)
- `useAllExportedProblems`: 잘못된 데이터 반환

### 4.2 영향받지 않는 컴포넌트
- 라벨링 페이지 (개별 문서별 조회)
- 개별 그룹 확정 기능
- 한글 파일 탭 (별도 API 사용)

---

## 5. 권장 수정 사항

### 우선순위 1: API 경로 수정
`export.py`에서 `documents/` 폴더만 스캔하도록 수정

### 우선순위 2: 데이터 검증 추가
필수 필드 (`document_id`, `image_path`) 없으면 스킵

### 우선순위 3: 크롭 문제 확인
현재 `documents/*/problems/` 폴더에 실제 크롭 문제가 있는지 확인

---

## 6. 해결 완료

### 6.1 적용된 수정사항 (Phase 23-E)

**파일**: `backend/app/routers/export.py` (Line 473-500)

```python
# Phase 23-E: documents 폴더 내의 문서만 스캔 (problem_bank 등 제외)
documents_dir = config.DATASET_ROOT / "documents"

if document_id:
    # 특정 문서만 (documents 폴더 내)
    doc_dirs = [documents_dir / document_id]
else:
    # documents 폴더 내 모든 문서
    if documents_dir.exists():
        doc_dirs = [d for d in documents_dir.iterdir() if d.is_dir()]
    else:
        doc_dirs = []

for doc_dir in doc_dirs:
    problems_dir = doc_dir / "problems"
    if not problems_dir.exists():
        continue

    # JSON 메타데이터 파일 읽기
    for meta_file in problems_dir.glob("*.json"):
        try:
            problem_data = load_json(meta_file)

            # Phase 23-E: 크롭 문제 필수 필드 검증
            if "document_id" not in problem_data or "image_path" not in problem_data:
                continue  # 크롭 문제가 아닌 데이터 스킵

            all_problems.append(problem_data)
```

### 6.2 수정 결과

| 항목 | 수정 전 | 수정 후 |
|------|---------|---------|
| 문제 개수 | 69개 (HML/HWPX) | 15개 (크롭 문제) |
| document_id | undefined | 올바른 값 |
| image_path | undefined | 올바른 경로 |
| 이미지 표시 | 플레이스홀더 | 실제 이미지 |

### 6.3 API 응답 예시 (수정 후)

```json
{
  "problems": [
    {
      "document_id": "베이직쎈 중등 2-1",
      "page_index": 11,
      "group_id": "L1",
      "image_path": "documents\\베이직쎈 중등 2-1\\problems\\..._L1.png",
      "bbox": [157, 452, 677, 623],
      "metadata": {}
    }
  ],
  "total": 15,
  "has_more": true
}
```

---

*작성: 2025-12-02*
*상태: ✅ 해결 완료*
