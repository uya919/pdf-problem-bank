# Phase 35 업로드 버그 에러 리포트

**작성일**: 2025-12-03
**상태**: 분석 완료

---

## 1. 문제 요약

### 증상
1. **커스텀 document_id가 무시됨**: 모달에서 입력한 이름이 적용되지 않음
2. **문서 목록 미표시**: 업로드 성공 후 "최근 사용한 문서가 없습니다" 표시

### 콘솔 로그 증거
```
[api.uploadPDF] Starting upload {
  fileName: '베이직쎈 공통수학1 문제_250527_194013 (1).pdf',
  customDocumentId: '고1_공통수학1_베이직쎈_문제'  ← 전송한 값
}

[api.uploadPDF] Upload successful {
  document_id: '베이직쎈 공통수학1 문제_250527_194013 (1)',  ← 파일명 그대로!
  total_pages: 191,
  analyzed_pages: 10,
  status: 'processing'
}
```

**핵심**: `customDocumentId`가 전송되었지만, 응답의 `document_id`는 파일명에서 추출된 값

---

## 2. 근본 원인 분석

### 버그 1: Form 파라미터 전달 실패

**위치**: `backend/app/routers/pdf.py:26-28`

```python
@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    document_id: Optional[str] = Form(None),  # ← 이 값이 None으로 들어옴
    ...
):
```

**원인**: FastAPI에서 `multipart/form-data`로 파일과 함께 Form 필드를 보낼 때, 프론트엔드에서 `FormData.append()`로 추가한 필드가 제대로 파싱되지 않을 수 있음

**검증 필요**:
```python
# 백엔드에서 실제로 받은 값 확인
print(f"[DEBUG] Received document_id: {document_id}")  # None인지 확인
```

### 버그 2: 문서 목록 미표시

**화면 상태**: "최근 사용한 문서가 없습니다"

**가능한 원인**:
1. `useDocuments()` 훅의 데이터가 비어있음
2. 필터링 로직 문제 (최근 사용 vs 전체)
3. React Query 캐시 문제

**API 확인 결과**:
```bash
curl http://localhost:8000/api/pdf/documents
# → 3개 문서 존재 (정상)
```

---

## 3. 해결 방안

### 방안 A: 백엔드 Form 파싱 수정 (권장)

**문제**: FastAPI의 `Form()` 파라미터가 multipart에서 제대로 파싱되지 않음

**해결**: Request body에서 직접 추출

```python
from fastapi import Request

@router.post("/upload")
async def upload_pdf(
    request: Request,
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    # Form 데이터 직접 파싱
    form = await request.form()
    document_id = form.get("document_id")

    final_document_id = document_id if document_id else Path(file.filename).stem
```

### 방안 B: 프론트엔드 FormData 확인

**확인 필요**: FormData가 올바르게 구성되었는지

```typescript
// client.ts에서 디버깅
const formData = new FormData();
formData.append('file', file);
if (customDocumentId) {
  formData.append('document_id', customDocumentId);
}

// FormData 내용 확인
for (const [key, value] of formData.entries()) {
  console.log(`[FormData] ${key}:`, value);
}
```

### 방안 C: 문서 목록 표시 문제 해결

**확인 필요**: MainPage에서 documents 데이터가 어떻게 렌더링되는지

```typescript
// 디버깅 추가
const { data: documents } = useDocuments();
console.log('[MainPage] documents:', documents);
```

---

## 4. 우선순위

| 순위 | 작업 | 긴급도 |
|------|------|--------|
| 1 | 백엔드 Form 파싱 디버깅 | 높음 |
| 2 | document_id 전달 확인 | 높음 |
| 3 | 문서 목록 표시 문제 | 중간 |

---

## 5. 즉시 실행 계획

### Step 1: 백엔드 디버그 로그 추가
```python
# pdf.py upload_pdf 함수 시작 부분
print(f"[API] document_id param: {document_id}")
print(f"[API] file.filename: {file.filename}")
```

### Step 2: FormData 전송 확인
```typescript
// client.ts uploadPDF 함수
for (const [key, value] of formData.entries()) {
  console.log(`[FormData] ${key}:`, typeof value === 'string' ? value : (value as File).name);
}
```

### Step 3: 결과에 따라 수정
- document_id가 None → 백엔드 파싱 수정
- document_id가 전달됨 → 다른 로직 문제

---

## 6. 결론

**주요 버그**: FastAPI Form 파라미터가 multipart/form-data에서 제대로 파싱되지 않음

**해결 방향**:
1. 백엔드에서 Request.form()으로 직접 파싱
2. 또는 file과 함께 JSON body 사용 (구조 변경 필요)

**예상 소요 시간**: 30분 내 수정 가능
