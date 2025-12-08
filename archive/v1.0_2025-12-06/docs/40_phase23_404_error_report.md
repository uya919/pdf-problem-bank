# Phase 23 API 404 Error Report

---

## 1. 에러 현상

```
GET http://localhost:8000/api/export/all-problems? 404 (Not Found)
```

문제은행 허브 페이지(`/bank`)에서 전체 문제 목록 API 호출 시 404 에러 발생.

---

## 2. 원인 분석

### 2.1 가능한 원인 1: 서버 미재시작 (가장 유력)

백엔드 서버 로그 확인 결과:
```
WARNING: WatchFiles detected changes in 'app\models\document_pair.py'. Reloading...
```

`export.py` 파일 변경이 감지되지 않음. uvicorn의 `--reload` 옵션이 때때로 파일 변경을 놓칠 수 있음.

### 2.2 가능한 원인 2: 라우터 등록 확인

`main.py` 확인 결과:
```python
app.include_router(export.router, prefix="/api/export", tags=["Export"])
```

라우터는 정상 등록되어 있음. 새 엔드포인트 URL은 `/api/export/all-problems`로 올바름.

### 2.3 가능한 원인 3: 빈 문제 목록

문제가 확정되지 않아 `problems/` 폴더가 비어 있을 경우:
- API 자체는 정상 동작해야 함 (빈 배열 반환)
- 404는 API 자체가 등록되지 않았을 때 발생

---

## 3. 해결 방법

### 3.1 백엔드 서버 재시작

```powershell
# 기존 프로세스 종료 후 재시작
cd backend
PYTHONDONTWRITEBYTECODE=1 python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3.2 API 동작 검증

```bash
# API 직접 호출 테스트
curl http://localhost:8000/api/export/all-problems
```

예상 응답 (빈 목록):
```json
{
  "problems": [],
  "total": 0,
  "has_more": false
}
```

---

## 4. 추가 고려사항

### 4.1 빈 문제 목록 UI 처리

CropProblemBank 컴포넌트에서 이미 처리됨:
```tsx
{data?.problems.length === 0 ? (
  <div className="text-center py-12">
    <p className="text-gray-500">확정된 문제가 없습니다</p>
    <p className="text-sm text-gray-400 mt-1">
      라벨링 작업에서 그룹을 "확정"하면 여기에 표시됩니다
    </p>
  </div>
)}
```

### 4.2 에러 처리

API 에러 시 에러 메시지 표시됨:
```tsx
if (error) {
  return (
    <div className="text-center py-8 text-red-500">
      문제 목록을 불러오는데 실패했습니다.
    </div>
  );
}
```

---

## 5. 결론

**주요 원인**: 백엔드 서버가 `export.py` 파일 변경을 자동 감지하지 못함

**해결책**: 백엔드 서버 수동 재시작 필요

---

## 6. 해결 완료

### 6.1 서버 재시작 후 결과

```
INFO: "GET /api/export/all-problems HTTP/1.1" 200 OK
```

API가 정상 작동함.

### 6.2 응답 확인 (빈 목록)

```json
{
  "problems": [],
  "total": 0,
  "has_more": false
}
```

확정된 문제가 없어 빈 목록 반환 - **정상 동작**.

### 6.3 추가 발견된 문제

이미지 로드 시 undefined 전달:
```
GET /api/export/documents/undefined/problems/image?image_path=undefined 404
```

이는 빈 목록에서 발생하지 않아야 하는 요청으로, UI에서 빈 배열 처리 확인 필요.
그러나 현재 `problems.length === 0` 조건으로 빈 목록 UI가 표시되므로 이미지 요청이 발생하지 않아야 함.

---

---

## 7. 추가 수정 사항 (undefined 이미지 URL 방지)

### 7.1 원인

```
GET /api/export/documents/undefined/problems/image?image_path=undefined 404
```

`getProblemImageUrl` 함수가 undefined 값을 검증하지 않아 잘못된 URL 생성.

### 7.2 수정 내용

**client.ts** - undefined 값 방어 코드 추가:
```typescript
getProblemImageUrl: (documentId: string, imagePath: string): string => {
  // Phase 23: undefined 값 방어
  if (!documentId || !imagePath) {
    console.warn('getProblemImageUrl: missing documentId or imagePath', { documentId, imagePath });
    return '';
  }
  return `${API_BASE_URL}/api/export/documents/${documentId}/problems/image?...`;
},
```

**CropProblemBank.tsx** - 빈 URL일 때 플레이스홀더 아이콘 표시:
```tsx
{imageUrl ? (
  <img src={imageUrl} alt={displayName} ... />
) : (
  <ImageIcon className="w-8 h-8 text-gray-300" />
)}
```

---

*작성: 2025-12-02*
*업데이트: 서버 재시작으로 해결됨*
*업데이트 2: undefined URL 방어 코드 추가*
