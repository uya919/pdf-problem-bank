# Phase 204: Backend 코드 모듈화 상세 계획

**문서 번호**: 205
**상위 문서**: [200_v2_master_plan.md](200_v2_master_plan.md)
**예상 시간**: 4시간
**위험도**: 중간

---

## 현재 상태

| 파일 | 줄 수 | 우선순위 |
|------|------|---------|
| hml_parser.py | 1,221 | P1 (복잡) |
| export.py | 1,080 | P0 |
| hangul.py | 1,008 | P0 |
| hwp_latex_converter.py | 834 | P2 |
| work_sessions.py | 775 | P1 |
| sync_manager.py | 563 | P2 |

---

## 204-A: 라우터 분리 (2시간)

### 204-A-1: export.py 분리 (1시간)

**현재**: 1,080줄 (모든 내보내기 로직)

**분리 후**:
```
routers/
└── export.py (~200줄) ← 라우팅만

services/export/
├── __init__.py
├── image_exporter.py (~200줄)   # 이미지 내보내기
├── json_exporter.py (~150줄)    # JSON 내보내기
├── pdf_exporter.py (~200줄)     # PDF 생성
├── batch_exporter.py (~150줄)   # 배치 처리
└── utils.py (~100줄)            # 공통 유틸
```

### 204-A-2: hangul.py 분리 (1시간)

**현재**: 1,008줄 (한글 파일 모든 API)

**분리 후**:
```
routers/hangul/
├── __init__.py (~50줄)      # 라우터 등록
├── upload.py (~150줄)       # 업로드 관련
├── parse.py (~200줄)        # 파싱 관련
├── extract.py (~200줄)      # 추출 관련
└── debug.py (~100줄)        # 디버그 API
```

---

## 204-B: 서비스 레이어 정리 (2시간)

### 204-B-1: work_sessions.py 분리 (1시간)

**현재**: 775줄

**분리 후**:
```
routers/
└── work_sessions.py (~200줄) ← 라우팅만

services/sessions/
├── __init__.py
├── session_service.py (~200줄)   # 세션 CRUD
├── problem_service.py (~150줄)   # 문제 관리
├── link_service.py (~150줄)      # 연결 관리
└── sync_service.py (~100줄)      # 동기화
```

### 204-B-2: sync_manager.py 정리 (1시간)

**현재**: 563줄

**정리 후**:
```
services/sync/
├── __init__.py
├── sync_manager.py (~200줄)     # 핵심 로직만
├── group_sync.py (~150줄)       # 그룹 동기화
└── session_sync.py (~150줄)     # 세션 동기화
```

---

## 분리 원칙

### 라우터 (routers/)
```python
# 라우팅만 담당, 로직은 서비스로
@router.post("/export")
async def export_problems(request: ExportRequest):
    return await export_service.export(request)
```

### 서비스 (services/)
```python
# 비즈니스 로직 담당
class ExportService:
    async def export(self, request: ExportRequest):
        # 실제 로직
        pass
```

---

## 주의사항

### hml_parser.py (1,221줄)
- **분리하지 않음** (복잡한 파서)
- 파서는 단일 책임이므로 유지
- 필요 시 내부 헬퍼 함수만 분리

### hwp_latex_converter.py (834줄)
- **분리하지 않음** (전문 변환기)
- 수식 변환은 복잡하므로 유지

---

## 실행 순서

```
1. 204-A-1 (export.py) ← 독립적, 안전
   ↓ API 테스트
2. 204-A-2 (hangul.py)
   ↓ 한글 파일 업로드 테스트
3. 204-B-1 (work_sessions.py)
   ↓ 세션 기능 테스트
4. 204-B-2 (sync_manager.py)
   ↓ 동기화 테스트
```

---

## 테스트 체크리스트

### 204-A 완료 확인
- [ ] 문제 이미지 내보내기 동작
- [ ] PDF 내보내기 동작
- [ ] 한글 파일 업로드 동작
- [ ] 한글 파일 파싱 동작

### 204-B 완료 확인
- [ ] 작업 세션 생성 동작
- [ ] 문제 추가/삭제 동작
- [ ] 문제-해설 연결 동작
- [ ] 그룹 동기화 동작

---

*승인 후 실행: "204-A-1 진행해줘" (권장: 하나씩)*
