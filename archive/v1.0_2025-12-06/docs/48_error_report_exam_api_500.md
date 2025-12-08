# 에러 리포트: /api/exams 500 Internal Server Error

**작성일**: 2025-12-02
**심각도**: 🔴 High (시험지 목록 API 완전 차단)
**상태**: ✅ 수정 완료

---

## 1. 증상

사용자가 "PDF 업로드가 안 된다"고 보고했으나, 실제 분석 결과:

| API 엔드포인트 | 상태 | 설명 |
|---------------|------|------|
| `POST /api/pdf/upload` | ✅ 200 OK | PDF 업로드 정상 동작 |
| `POST /api/pdf/process/{doc_id}` | ✅ 200 OK | PDF 처리 정상 (6페이지, 4734블록) |
| `GET /api/exams` | ❌ 500 Error | **실제 에러 발생 지점** |

사용자가 PDF 업로드 후 화면이 업데이트되지 않는 것은 `/api/exams` API 실패 때문으로 추정됩니다.

---

## 2. 에러 로그

```
INFO:     127.0.0.1:58692 - "GET /api/exams HTTP/1.1" 500 Internal Server Error
```

---

## 3. 원인 분석

### 3.1 버그 위치

**파일**: `backend/app/services/exam_paper.py`
**라인**: 32

```python
# 버그 코드
self.data_dir = data_dir or Path(config.dataset_root) / "exam_papers"
#                                      ^^^^^^^^^^^^^ 소문자 (존재하지 않음)
```

### 3.2 Config 클래스 정의

**파일**: `backend/app/config.py`

```python
# 실제 Config 클래스의 속성명
config.DATASET_ROOT = Path(dataset_root_str).resolve()
#      ^^^^^^^^^^^^ 대문자
```

### 3.3 문제점

Python에서 `config.dataset_root`를 접근하면:
- `Config` 클래스에 `dataset_root` 속성이 없음
- `AttributeError: 'Config' object has no attribute 'dataset_root'` 발생
- API가 500 Internal Server Error 반환

---

## 4. 영향 범위

| 기능 | 영향 |
|------|------|
| 시험지 목록 조회 | ❌ 완전 차단 |
| 시험지 상세 조회 | ❌ 완전 차단 |
| 시험지 생성/수정 | ❌ 완전 차단 |
| PDF 업로드 | ✅ 정상 동작 |
| PDF 처리 | ✅ 정상 동작 |
| 블록 검출 | ✅ 정상 동작 |

---

## 5. 수정 방안

### 5.1 즉시 수정 (1줄 변경)

```python
# 수정 전
self.data_dir = data_dir or Path(config.dataset_root) / "exam_papers"

# 수정 후
self.data_dir = data_dir or Path(config.DATASET_ROOT) / "exam_papers"
```

### 5.2 추가 검토 필요

동일한 패턴의 버그가 다른 파일에도 있을 수 있으므로 전체 검색 권장:

```bash
grep -r "config.dataset_root" backend/
```

---

## 6. 테스트 계획

1. 백엔드 서버 재시작
2. `GET /api/exams` 호출 → 200 OK 확인
3. 프론트엔드에서 시험지 목록 정상 표시 확인
4. PDF 업로드 후 목록에 반영되는지 확인

---

## 7. 근본 원인 (Root Cause)

- Config 클래스의 속성명 규칙 불일치
- `DATASET_ROOT` (대문자, 환경변수 스타일) vs 일반적인 Python 속성 (소문자)
- IDE 자동완성 없이 수동 작성 시 오타 발생 가능

### 7.1 장기적 개선 방안

1. **타입 힌트 강화**: Config 클래스에 모든 속성 명시
2. **속성명 일관성**: 모든 Config 속성을 소문자 snake_case로 통일
3. **단위 테스트**: Config 속성 접근 테스트 추가

---

## 8. 결론

- **PDF 업로드는 정상 동작** (사용자 오해)
- **실제 문제는 시험지 API** (`/api/exams`)
- **원인**: Config 속성명 대소문자 불일치
- **수정**: 1줄 변경으로 해결 가능

---

## 9. 실제 수정 내역

### 수정 파일 1: `backend/app/services/exam_paper.py` (라인 32)
```python
# 수정 전
self.data_dir = data_dir or Path(config.dataset_root) / "exam_papers"

# 수정 후
self.data_dir = data_dir or Path(config.DATASET_ROOT) / "exam_papers"
```

### 수정 파일 2: `backend/app/routers/exam_papers.py` (라인 320)
```python
# 수정 전
exporter = ExamPdfExporter(config.dataset_root)

# 수정 후
exporter = ExamPdfExporter(config.DATASET_ROOT)
```

### 검증 결과
```bash
$ curl http://localhost:8000/api/exams
{"items":[],"total":0,"page":1,"pageSize":20,"totalPages":0}
# ✅ 200 OK - 정상 응답
```

---

*Phase 21.6 진행 중 발견된 버그 - 수정 완료*
