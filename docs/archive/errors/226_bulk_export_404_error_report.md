# Phase 59-B 일괄 내보내기 에러 리포트

**작성일**: 2025-12-09
**Phase**: 59-B
**해결 완료**: ✅

---

## 에러 발생 이력

| 순서 | 에러 | 원인 | 해결 |
|------|------|------|------|
| 1 | 404 Not Found | 서버 시작 시 `List` import 누락으로 함수 미등록 | `List` import 추가 + 서버 완전 재시작 |
| 2 | 422 Unprocessable Entity | FastAPI가 body를 list로 기대 | Pydantic 모델 + `Body(default=None)` 사용 |

---

## 1. 404 Not Found 에러

### 증상
```
POST /api/export/documents/.../pages/8/bulk-export
Status: 404 Not Found
```

### 원인
```python
# export.py 초기 코드 - List import 누락
from typing import Optional  # ❌ List 없음

group_ids: Optional[List[str]] = None  # NameError 발생
```

- 서버 시작 시 `NameError: name 'List' is not defined`
- 해당 함수가 라우터에 등록되지 않음
- 이후 import 추가해도 좀비 프로세스가 이전 버전 서빙

### 해결
1. `from typing import Optional, List` 추가
2. 모든 Python 프로세스 종료: `taskkill /F /PID <pid>`
3. 서버 완전 재시작

---

## 2. 422 Unprocessable Entity 에러

### 증상
```
POST /api/export/documents/.../pages/8/bulk-export
Status: 422 Unprocessable Entity

{"detail":[{"type":"list_type","loc":["body"],"msg":"Input should be a valid list"}]}
```

### 원인
```python
# 문제 코드
async def bulk_export_groups(
    document_id: str,
    page_index: int,
    group_ids: Optional[List[str]] = None  # FastAPI가 body를 list로 해석
):
```

- FastAPI가 `Optional[List[str]]` 파라미터를 **body 전체가 list**여야 한다고 해석
- 프론트엔드는 `{}` (빈 객체)를 전송

### 해결
```python
# Pydantic 모델 정의
class BulkExportRequest(BaseModel):
    group_ids: Optional[List[str]] = None

# 수정된 함수 시그니처
async def bulk_export_groups(
    document_id: str,
    page_index: int,
    request: Optional[BulkExportRequest] = Body(default=None)
):
    group_ids = request.group_ids if request else None
```

---

## 3. 최종 수정 코드

### export.py 변경사항

```python
# Line 7-16: Import 및 모델 추가
from fastapi import APIRouter, HTTPException, Body
from typing import Optional, List
from pydantic import BaseModel

class BulkExportRequest(BaseModel):
    group_ids: Optional[List[str]] = None

# Line 564-569: 함수 시그니처 수정
@router.post("/documents/{document_id}/pages/{page_index}/bulk-export")
async def bulk_export_groups(
    document_id: str,
    page_index: int,
    request: Optional[BulkExportRequest] = Body(default=None)
):

# Line 604: body에서 group_ids 추출
group_ids = request.group_ids if request else None
```

---

## 4. 프론트엔드 코드 (변경 없음)

```typescript
// client.ts - 이대로 정상 동작
bulkExportGroups: async (
    documentId: string,
    pageIndex: number,
    groupIds?: string[]
) => {
    const response = await apiClient.post(
        `/api/export/documents/${documentId}/pages/${pageIndex}/bulk-export`,
        groupIds ? { group_ids: groupIds } : {},  // 빈 객체 {} 전송
        { timeout: API_TIMEOUTS.EXPORT * 2 }
    );
    return response.data;
}
```

---

## 5. 테스트 결과

```bash
# 빈 body로 요청 (프론트엔드 기본 동작)
$ curl -X POST "http://localhost:8000/api/export/documents/test/pages/0/bulk-export" \
       -H "Content-Type: application/json" -d "{}"

# 응답: 정상 (404는 test 문서가 없어서 발생)
{"detail":"그룹 파일을 찾을 수 없습니다"}
```

---

## 6. 교훈

1. **타입 import 확인**: 새로운 타입 사용 시 import 문 확인
2. **서버 완전 재시작**: 시작 오류 발생 후에는 완전 재시작 필요
3. **FastAPI Body 처리**:
   - `Optional[List[str]]` 직접 사용 시 body 전체가 list로 해석됨
   - Pydantic 모델 + `Body(default=None)`으로 옵셔널 객체 body 처리

---

*해결 완료: 2025-12-09*
