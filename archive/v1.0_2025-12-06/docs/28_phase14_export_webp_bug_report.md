# Phase 14-2 내보내기 WebP 호환성 버그 리포트

**날짜**: 2025-11-27
**심각도**: Critical
**상태**: 분석 완료, 수정 필요

---

## 1. 증상

### 사용자 보고
- 11페이지에서 "내보내기" 버튼 클릭 시 실패
- 브라우저 콘솔 에러:
```
GET /api/export/documents/베이직쎈 중등 2-1/pages/11/export - 404 Not Found
```

### 에러 메시지
```
페이지 이미지를 찾을 수 없습니다
```

---

## 2. 근본 원인

### 버그 위치
`backend/app/routers/export.py` - 라인 63

### 문제 코드
```python
# 페이지 이미지 로드
image_file = doc_dir / "pages" / f"page_{page_index:04d}.png"  # PNG만 검색!
if not image_file.exists():
    raise HTTPException(status_code=404, detail="페이지 이미지를 찾을 수 없습니다")
```

### 원인 설명
1. **Phase 14-2**에서 이미지 포맷을 PNG → WebP로 변경
2. 새로 업로드된 문서의 이미지는 `.webp` 확장자로 저장됨
3. `export.py`는 여전히 `.png` 파일만 검색
4. 결과: WebP 이미지를 찾지 못하고 404 반환

### 동일 버그 패턴
이 버그는 이전에 수정한 버그와 동일한 패턴입니다:

| 파일 | 상태 | 수정 내용 |
|------|------|----------|
| `pdf.py` - `list_documents` | ✅ 수정됨 | PNG + WebP 모두 검색 |
| `pdf.py` - `get_document_info` | ✅ 수정됨 | PNG + WebP 모두 검색 |
| `export.py` - `export_page_problems` | ⚠️ 미수정 | PNG만 검색 중 |

---

## 3. 영향 범위

| 기능 | 영향 |
|------|------|
| 페이지별 문제 내보내기 | ❌ 실패 (11페이지 이후) |
| 문서 전체 내보내기 | ❌ 실패 |
| 기존 PNG 문서 | ✅ 정상 |
| 새 WebP 문서 | ❌ 내보내기 불가 |

---

## 4. 해결 방안

### 수정 파일
`backend/app/routers/export.py`

### 변경 전 (라인 62-65)
```python
# 페이지 이미지 로드
image_file = doc_dir / "pages" / f"page_{page_index:04d}.png"
if not image_file.exists():
    raise HTTPException(status_code=404, detail="페이지 이미지를 찾을 수 없습니다")
```

### 변경 후
```python
# 페이지 이미지 로드 - Phase 14-2 Bugfix: PNG와 WebP 모두 지원
image_file = doc_dir / "pages" / f"page_{page_index:04d}.png"
if not image_file.exists():
    # WebP 파일도 확인
    image_file = doc_dir / "pages" / f"page_{page_index:04d}.webp"
    if not image_file.exists():
        raise HTTPException(status_code=404, detail="페이지 이미지를 찾을 수 없습니다")
```

---

## 5. 테스트 계획

### 수정 후 검증
1. 브라우저에서 11페이지 이동
2. 그룹이 있는 상태에서 "내보내기" 버튼 클릭
3. 성공 메시지 확인: "X개의 문제가 성공적으로 내보내졌습니다!"
4. `dataset_root/베이직쎈 중등 2-1/problems/` 폴더에 이미지 생성 확인

### API 테스트
```bash
curl -X POST "http://localhost:8000/api/export/documents/베이직쎈%20중등%202-1/pages/11/export"
# 기대: {"exported_count": N, "problems": [...]}
```

---

## 6. 관련 버그 이력

| 버그 | 파일 | 수정일 | 상태 |
|------|------|--------|------|
| 블록 분석 인덱스 오류 | `pdf_pipeline.py` | 2025-11-27 | ✅ 수정됨 |
| WebP 파일 미검색 (pdf.py) | `pdf.py` | 2025-11-27 | ✅ 수정됨 |
| WebP 파일 미검색 (export.py) | `export.py` | - | ⚠️ 수정 필요 |

---

## 7. 교훈

Phase 14-2에서 이미지 포맷을 변경할 때, 파일 검색이 발생하는 **모든 위치**를 업데이트해야 했습니다.

### 누락된 파일 검색 위치
```
backend/app/routers/
├── pdf.py          ✅ 수정됨
├── blocks.py       (이미지 검색 없음)
├── export.py       ⚠️ 수정 필요
└── ...
```

### 향후 주의사항
이미지 포맷 변경 시 다음 패턴을 전체 검색하여 확인:
- `glob("page_*.png")`
- `f"page_{...}.png"`
- `.png` 하드코딩

---

*리포트 작성: Claude Code*
*날짜: 2025-11-27*
