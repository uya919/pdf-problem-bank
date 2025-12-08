# Phase 35 버그 수정 계획

**작성일**: 2025-12-03
**목표**: 업로드 시 커스텀 document_id 적용 + 문서 목록 표시 수정

---

## 수정 대상 버그

| # | 버그 | 현재 상태 | 목표 상태 |
|---|------|----------|----------|
| 1 | 커스텀 ID 무시 | 파일명 사용 | 모달 입력값 사용 |
| 2 | 문서 목록 미표시 | "없습니다" | 업로드된 문서 표시 |

---

## 단계별 개발 계획

### Step 1: 백엔드 Form 파싱 수정
**파일**: `backend/app/routers/pdf.py`

**변경 내용**:
- `Form(None)` 대신 `Request.form()`으로 직접 파싱
- 디버그 로그 추가

**예상 코드**:
```python
from fastapi import Request

@router.post("/upload")
async def upload_pdf(
    request: Request,
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    # Form 데이터에서 document_id 직접 추출
    form = await request.form()
    custom_document_id = form.get("document_id")

    print(f"[API] custom_document_id from form: {custom_document_id}")

    final_document_id = custom_document_id if custom_document_id else Path(file.filename).stem
```

---

### Step 2: 프론트엔드 FormData 디버깅 추가
**파일**: `frontend/src/api/client.ts`

**변경 내용**:
- FormData 내용 로깅 추가 (이미 완료된 로그 활용)

---

### Step 3: 문서 목록 표시 확인
**파일**: `frontend/src/pages/MainPage.tsx` 또는 관련 컴포넌트

**확인 사항**:
- `useDocuments()` 훅 데이터 확인
- "최근 사용한 문서" 필터링 로직 확인
- React Query 캐시 무효화 확인

---

### Step 4: 통합 테스트
1. PDF 파일 드래그 앤 드롭
2. 모달에서 학년/과정/시리즈/유형 선택
3. 업로드 버튼 클릭
4. 콘솔에서 document_id 확인
5. 문서 목록에 새 문서 표시 확인

---

### Step 5: 디버그 로그 정리
- 개발용 console.log 제거 또는 조건부 처리

---

## 체크리스트

- [ ] Step 1: 백엔드 Form 파싱 수정
- [ ] Step 2: FormData 전송 확인
- [ ] Step 3: 문서 목록 표시 확인
- [ ] Step 4: 통합 테스트
- [ ] Step 5: 디버그 로그 정리

---

## 예상 소요 시간

| 단계 | 작업 | 복잡도 |
|------|------|--------|
| Step 1 | 백엔드 수정 | 낮음 |
| Step 2 | 프론트 확인 | 낮음 |
| Step 3 | 목록 표시 수정 | 중간 |
| Step 4 | 테스트 | 낮음 |
| Step 5 | 정리 | 낮음 |

**총 예상**: 20-30분
