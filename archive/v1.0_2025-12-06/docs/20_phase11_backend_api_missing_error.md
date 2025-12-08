# Phase 11 에러 리포트: 백엔드 API 누락으로 인한 페이지간 연속성 실패

**보고일**: 2025-11-26
**심각도**: 🔴 Critical
**영향**: Phase 10-2와 Phase 11-3 완전 실패

---

## 📋 Executive Summary

**증상**: 페이지 내에서는 문항번호가 잘 증가(1→2→3)하지만, 다음 페이지로 넘어가면 **1번으로 리셋**됨.

**근본 원인**: 백엔드 API `/api/blocks/documents/{id}/groups-summary`가 **404 Not Found** 반환. Phase 10-2에서 구현한 API가 백엔드 서버에 로드되지 않음.

**영향 범위**:
- ✅ Phase 10-2: 페이지간 문항번호 연속성 (백엔드 API 누락으로 실패)
- ✅ Phase 11-3: 클로저 버그 수정 (완료되었으나 백엔드 API 없어서 테스트 불가)
- ✅ Phase 11-1: 자동 확정 (정상 작동)

---

## 🔍 에러 분석

### 1. 콘솔 에러 로그

**반복되는 404 에러**:
```
GET http://localhost:8000/api/blocks/documents/251117_251117%20.../%EB%AC%B8%EC%A0%9C%EC%A7%80/groups-summary 404 (Not Found)
```

**발생 빈도**:
- 그룹 저장 시마다 발생 (queryClient.invalidateQueries 호출)
- 페이지 이동 시 발생 (useProblemNumberContext 훅 사용)

---

### 2. 프론트엔드 코드 분석

#### 2.1 API 호출 코드 (정상)

**파일**: `frontend/src/api/client.ts:331-336`
```typescript
// Phase 10-2: 문항번호 연속성용 그룹 요약 조회
getGroupsSummary: async (documentId: string): Promise<GroupsSummary> => {
  const response = await apiClient.get<GroupsSummary>(
    `/api/blocks/documents/${encodeURIComponent(documentId)}/groups-summary`
  );
  return response.data;
},
```

✅ **정상**: API 경로가 올바름

---

#### 2.2 Hook 사용 코드 (정상)

**파일**: `frontend/src/hooks/useProblemNumberContext.ts:15-21`
```typescript
const { data: summary, isLoading, error } = useQuery({
  queryKey: ['problemSummaries', documentId],
  queryFn: () => api.getGroupsSummary(documentId),
  staleTime: 30 * 1000,
  gcTime: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
});
```

✅ **정상**: React Query 설정 올바름

---

#### 2.3 캐시 무효화 코드 (정상)

**파일**: `frontend/src/pages/PageViewer.tsx:292`
```typescript
// Phase 10-2: 그룹 저장 후 요약 캐시 무효화
queryClient.invalidateQueries({ queryKey: ['problemSummaries', documentId] });
```

✅ **정상**: 캐시 무효화 로직 올바름

---

### 3. 백엔드 코드 분석

#### 3.1 API 구현 코드 (존재함)

**파일**: `backend/app/routers/blocks.py:209-265`
```python
@router.get("/documents/{document_id}/groups-summary")
async def get_groups_summary(document_id: str):
    """
    Phase 10-2: 문서 전체 그룹 요약 조회 (문항번호 연속성용)

    Returns:
        {
            "document_id": str,
            "pages": [
                {
                    "page_index": int,
                    "last_problem_number": str | null,
                    "group_count": int
                }
            ]
        }
    """
    try:
        doc_dir = config.get_document_dir(document_id)
        groups_dir = doc_dir / "groups"
        summaries = []

        if groups_dir.exists():
            # 모든 그룹 파일을 page_index 순서로 정렬
            groups_files = sorted(groups_dir.glob("page_*_groups.json"))

            for groups_file in groups_files:
                # 파일명에서 page_index 추출
                page_index = int(groups_file.stem.split("_")[1])

                with groups_file.open("r", encoding="utf-8") as f:
                    data = json.load(f)

                groups = data.get("groups", [])

                # 마지막 문항번호 찾기
                last_number = None
                for g in reversed(groups):
                    problem_info = g.get("problemInfo")
                    if problem_info and problem_info.get("problemNumber"):
                        last_number = problem_info["problemNumber"]
                        break

                summaries.append({
                    "page_index": page_index,
                    "last_problem_number": last_number,
                    "group_count": len(groups)
                })

        return {
            "document_id": document_id,
            "pages": summaries
        }

    except Exception as e:
        print(f"[API 오류] 그룹 요약 조회 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"그룹 요약 조회 실패: {str(e)}")
```

✅ **존재**: API 코드가 blocks.py에 구현되어 있음

---

#### 3.2 라우터 등록 코드 (정상)

**파일**: `backend/app/main.py:37`
```python
app.include_router(blocks.router, prefix="/api/blocks", tags=["Blocks"])
```

✅ **정상**: blocks 라우터가 `/api/blocks` prefix로 등록됨

**최종 경로**: `/api/blocks` + `/documents/{document_id}/groups-summary`
= `/api/blocks/documents/{document_id}/groups-summary`

✅ **일치**: 프론트엔드 호출 경로와 동일

---

### 4. 실제 테스트 결과

#### 4.1 백엔드 헬스 체크 (성공)
```bash
$ curl http://localhost:8000/health
{"status":"healthy","dataset_root":"C:\\MYCLAUDE_PROJECT\\pdf\\dataset_root","api_version":"1.0.0"}
```

✅ **성공**: 백엔드 서버 실행 중

---

#### 4.2 groups-summary API 테스트 (실패)
```bash
$ curl "http://localhost:8000/api/blocks/documents/test/groups-summary"
{"detail":"Not Found"}
```

❌ **실패**: 404 Not Found

---

#### 4.3 FastAPI Docs 확인 (미등록)
```bash
$ curl "http://localhost:8000/docs" | grep "groups-summary"
(결과 없음)
```

❌ **미등록**: `/docs`에 groups-summary API가 표시되지 않음

---

## 🐛 근본 원인

### Phase 10-2 구현 시 백엔드 서버 재시작 누락

**시간 순서**:
1. **Phase 10-2 구현 (이전)**: `blocks.py`에 `groups-summary` API 추가
2. **백엔드 서버 시작**: uvicorn 실행 (Phase 10-2 이전 코드)
3. **blocks.py 수정 후 저장**
4. ❌ **백엔드 서버 재시작 안 함** ← 문제!
5. **Phase 11 개발 진행**
6. **테스트**: API 호출 → 404 에러

### 원인 분석

**FastAPI uvicorn의 auto-reload 특성**:
```python
# backend/app/main.py:85-90
uvicorn.run(
    "app.main:app",
    host=config.API_HOST,
    port=config.API_PORT,
    reload=True  # ← auto-reload 활성화
)
```

- `reload=True`로 설정되어 있음
- **하지만**: uvicorn이 실행 중이 아니거나, reload가 제대로 작동하지 않음
- 또는: blocks.py 수정 후 **수동 재시작이 필요**했으나 하지 않음

---

## 📊 영향도 분석

### 기능별 영향

| 기능 | 상태 | 영향 |
|------|------|------|
| Phase 10-2: 페이지간 문항번호 연속성 | 🔴 실패 | API 없어서 작동 안 함 |
| Phase 11-3: 클로저 버그 수정 | 🟡 구현 완료 | API 없어서 테스트 불가 |
| Phase 11-1: 자동 확정 | 🟢 정상 | 영향 없음 |
| 페이지 내 문항번호 증가 | 🟢 정상 | 같은 페이지 내에서만 작동 |
| 디바운스 자동 저장 | 🟢 정상 | 저장은 되지만 404 에러 발생 |

---

### 사용자 경험 영향

**페이지 내에서**:
- ✅ 문항 1, 2, 3, ... 정상 증가
- ✅ 자동 확정 정상 작동
- ✅ 저장 정상 작동

**페이지 넘어갈 때**:
- ❌ 문항번호 1로 리셋
- ❌ 브라우저 콘솔에 404 에러 반복 표시
- 😡 사용자 혼란

---

## 💡 해결 방안

### 방안 1: 백엔드 서버 재시작 (권장)

#### 1.1 현재 서버 종료
```bash
# Windows에서 uvicorn 프로세스 찾기
tasklist | findstr python

# 또는 Ctrl+C로 터미널에서 종료
```

#### 1.2 서버 재시작
```bash
cd c:\MYCLAUDE_PROJECT\pdf\backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 1.3 API 확인
```bash
# FastAPI Docs 확인
http://localhost:8000/docs

# groups-summary API 확인
curl "http://localhost:8000/api/blocks/documents/test/groups-summary"
```

**예상 결과**:
```json
{
  "document_id": "test",
  "pages": []
}
```

---

### 방안 2: 백엔드 코드 재검증 (추가 확인)

#### 2.1 blocks.py 파일 확인
```bash
grep -n "groups-summary" c:/MYCLAUDE_PROJECT/pdf/backend/app/routers/blocks.py
```

**예상 출력**:
```
209:@router.get("/documents/{document_id}/groups-summary")
```

#### 2.2 import 확인
```bash
grep -n "from app.routers import" c:/MYCLAUDE_PROJECT/pdf/backend/app/main.py
```

**예상 출력**:
```
15:from app.routers import pdf, blocks, export, stats, documents
```

✅ **정상**: blocks가 import됨

---

### 방안 3: 새로운 터미널에서 백엔드 실행 (완전 재시작)

```bash
# 새 터미널 열기
cd c:\MYCLAUDE_PROJECT\pdf\backend

# 가상환경 활성화 (필요 시)
# .venv\Scripts\activate

# uvicorn 실행
uvicorn app.main:app --reload --port 8000
```

---

## 🧪 테스트 계획

### Test 1: 백엔드 API 확인

```bash
# 1. 서버 재시작
cd backend
uvicorn app.main:app --reload --port 8000

# 2. 헬스 체크
curl http://localhost:8000/health

# 3. groups-summary API 테스트
curl "http://localhost:8000/api/blocks/documents/test/groups-summary"

# 4. 실제 문서 ID로 테스트
curl "http://localhost:8000/api/blocks/documents/YOUR_DOCUMENT_ID/groups-summary"
```

**성공 기준**:
- [ ] 헬스 체크 200 OK
- [ ] groups-summary API 200 OK (빈 배열이라도 OK)
- [ ] `/docs`에 groups-summary API 표시됨

---

### Test 2: 프론트엔드 통합 테스트

```
1. 브라우저 개발자 도구 열기
2. Console 탭에서 404 에러 확인
3. Page 0에서 문항 1 생성
4. 방향키 → 로 Page 1 이동
5. 블록 드래그하여 그룹 생성
6. ✅ 문항번호 "2" 자동 제안되는지 확인!
7. ✅ Console에 404 에러 없는지 확인
```

**성공 기준**:
- [ ] 404 에러 없음
- [ ] 페이지간 문항번호 연속성 작동 (1 → 2)
- [ ] Network 탭에서 GET groups-summary 200 OK

---

### Test 3: 여러 페이지 연속성 테스트

```
1. Page 0: 문항 1, 2, 3 생성
2. 방향키 → (Page 1)
3. ✅ 문항 4 제안 확인
4. 문항 4, 5 생성
5. 방향키 → (Page 2)
6. ✅ 문항 6 제안 확인
```

**성공 기준**:
- [ ] Page 0: 마지막 문항 3
- [ ] Page 1: 첫 문항 4, 마지막 문항 5
- [ ] Page 2: 첫 문항 6

---

## 📝 체크리스트

### 즉시 조치
- [ ] 백엔드 서버 재시작
- [ ] `/docs` 페이지에서 groups-summary API 확인
- [ ] curl로 API 테스트
- [ ] 프론트엔드에서 404 에러 사라짐 확인

### 검증
- [ ] Page 0 → Page 1 문항번호 연속성 확인 (1 → 2)
- [ ] Page 1 → Page 2 문항번호 연속성 확인 (2 → 3)
- [ ] Console에 404 에러 없음

### 장기 조치
- [ ] 백엔드 auto-reload 작동 확인
- [ ] 개발 프로세스에 "백엔드 재시작" 단계 추가
- [ ] CI/CD 파이프라인에 API 엔드포인트 테스트 추가

---

## 🔍 진단 명령어 요약

```bash
# 1. 백엔드 서버 상태 확인
curl http://localhost:8000/health

# 2. API 존재 여부 확인
curl http://localhost:8000/docs | grep groups-summary

# 3. API 직접 테스트
curl "http://localhost:8000/api/blocks/documents/test/groups-summary"

# 4. blocks.py에 API 코드 확인
grep -A 10 "groups-summary" backend/app/routers/blocks.py

# 5. 라우터 등록 확인
grep "blocks.router" backend/app/main.py
```

---

## 🎯 결론

### 문제 요약
- ✅ 프론트엔드 코드: 정상
- ✅ 백엔드 코드: 정상 (구현됨)
- ✅ 라우터 등록: 정상
- ❌ **백엔드 서버**: 최신 코드를 로드하지 않음

### 해결책
**백엔드 서버를 재시작**하면 즉시 해결됨.

### 예상 결과
- ✅ 404 에러 사라짐
- ✅ 페이지간 문항번호 연속성 정상 작동
- ✅ Phase 11-3 클로저 버그 수정 효과 확인 가능

---

## 📚 관련 문서

- [18_phase11_bug_report_page_continuity.md](18_phase11_bug_report_page_continuity.md) - 클로저 버그 분석
- [19_phase11_bugfix_implementation_plan.md](19_phase11_bugfix_implementation_plan.md) - 수정 계획
- [docs/08_current_project_status.md](08_current_project_status.md#phase-10-2) - Phase 10-2 상태

---

**작성자**: Claude Code (Opus)
**우선순위**: 🔴 Critical - 즉시 조치 필요
**예상 해결 시간**: 5분 (서버 재시작만 하면 됨)
