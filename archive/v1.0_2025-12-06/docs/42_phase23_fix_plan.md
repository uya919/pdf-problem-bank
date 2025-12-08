# Phase 23-E: 크롭 문제은행 데이터 소스 수정 계획

---

## 목표

`/api/export/all-problems` API가 올바른 데이터 소스 (`documents/*/problems/`)를 읽도록 수정

---

## 단계별 계획

### Step 1: 백엔드 API 경로 수정

**파일**: `backend/app/routers/export.py`

**현재 코드** (Line 477-479):
```python
else:
    # 모든 문서
    doc_dirs = [d for d in config.DATASET_ROOT.iterdir() if d.is_dir()]
```

**수정 후**:
```python
else:
    # documents 폴더 내의 문서만 스캔 (problem_bank 등 제외)
    documents_dir = config.DATASET_ROOT / "documents"
    if documents_dir.exists():
        doc_dirs = [d for d in documents_dir.iterdir() if d.is_dir()]
    else:
        doc_dirs = []
```

---

### Step 2: 데이터 검증 추가

**목적**: 잘못된 데이터 구조 필터링

**수정 위치**: `export.py` - `list_all_exported_problems` 함수

```python
# JSON 메타데이터 파일 읽기
for meta_file in problems_dir.glob("*.json"):
    try:
        problem_data = load_json(meta_file)

        # Phase 23-E: 크롭 문제 필수 필드 검증
        if "document_id" not in problem_data or "image_path" not in problem_data:
            continue  # 크롭 문제가 아닌 데이터 스킵

        # 검색 필터 적용...
```

---

### Step 3: 특정 문서 조회 시 경로 수정

**목적**: `document_id` 파라미터로 조회 시에도 올바른 경로 사용

**현재 코드** (Line 474-476):
```python
if document_id:
    # 특정 문서만
    doc_dirs = [config.DATASET_ROOT / document_id]
```

**수정 후**:
```python
if document_id:
    # 특정 문서만 (documents 폴더 내)
    doc_dirs = [config.DATASET_ROOT / "documents" / document_id]
```

---

### Step 4: 서버 재시작 및 테스트

1. 백엔드 서버 재시작
2. API 호출 테스트:
   ```bash
   curl http://localhost:8000/api/export/all-problems?limit=3
   ```
3. 예상 응답 (크롭 문제가 없는 경우):
   ```json
   {
     "problems": [],
     "total": 0,
     "has_more": false
   }
   ```

---

### Step 5: 프론트엔드 확인

1. http://localhost:5173/bank 접속
2. "이미지 크롭" 탭에서 "확정된 문제가 없습니다" 메시지 확인
3. 콘솔에 undefined 에러 없음 확인

---

## 수정 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `backend/app/routers/export.py` | 데이터 소스 경로 수정, 필드 검증 추가 |

---

## 예상 결과

### Before (현재)
- 69개 HML/HWPX 파싱 문제 표시
- 모든 이미지 undefined 에러
- React key 경고

### After (수정 후)
- 크롭 문제만 표시 (현재 0개)
- 빈 목록 UI 정상 표시
- 에러 없음

---

## 롤백 계획

문제 발생 시 원래 코드로 복원:
```python
doc_dirs = [d for d in config.DATASET_ROOT.iterdir() if d.is_dir()]
```

---

*작성: 2025-12-02*
