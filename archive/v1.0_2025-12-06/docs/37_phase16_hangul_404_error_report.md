# Phase 16 한글 파일 API 404 에러 리포트

**작성일**: 2025-11-28
**Phase**: 16
**상태**: 해결됨

---

## 1. 증상

프론트엔드에서 한글 파일(HWPX/HML) 업로드 시 다음 에러 발생:

```
Failed to load resource: the server responded with a status of 404 (Not Found)
:8000/api/hangul/parse
```

## 2. 원인 분석

### 2.1 직접적 원인

**서버가 새 코드로 재시작되지 않음**

FastAPI 서버의 `--reload` 옵션이 파일 변경을 감지했으나, 실제로 새 라우터를 로드하지 않았습니다.

### 2.2 근본 원인

1. **WatchFiles 리로드 실패**: `uvicorn`의 `--reload` 기능(WatchFiles)이 새로 추가된 `app/services/hangul/` 모듈 전체를 감지하는 과정에서 불완전한 리로드가 발생

2. **기존 프로세스 유지**: 서버 프로세스(PID 16232)가 이전 코드 상태를 유지한 채 실행 중

3. **모듈 임포트 순서**: `main.py`에서 `hangul` 라우터를 import하고 등록했으나, 기존 실행 중인 프로세스에는 반영되지 않음

### 2.3 진단 과정

1. **서버 로그 확인**:
   ```
   WARNING: WatchFiles detected changes in 'app\services\hangul\__init__.py'. Reloading...
   ```
   - 변경 감지는 됐으나 리로드 완료 메시지 없음

2. **모듈 임포트 테스트**:
   ```bash
   python -c "from app.routers import hangul; print('Import success')"
   # 결과: Import success
   ```
   - 코드 자체에는 문제 없음

3. **OpenAPI 스펙 확인**:
   ```bash
   curl -s http://localhost:8000/openapi.json | python -c "..."
   # 결과: Hangul paths: []
   ```
   - API에 hangul 경로가 등록되지 않음 → 서버가 구 코드로 실행 중

## 3. 해결 방법

### 3.1 즉시 해결

서버 프로세스 강제 종료 후 재시작:

```bash
# 1. 기존 프로세스 종료
taskkill /F /PID 16232

# 2. 서버 재시작
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3.2 검증

```bash
curl -s http://localhost:8000/openapi.json | python -c "import json,sys; d=json.load(sys.stdin); paths=[p for p in d.get('paths',{}).keys() if 'hangul' in p]; print(paths)"
# 결과: ['/api/hangul/parse', '/api/hangul/save', '/api/hangul/problems', '/api/hangul/problems/{problem_id}']
```

## 4. 영향 받는 파일

### 4.1 새로 추가된 파일

| 파일 | 설명 |
|------|------|
| `backend/app/services/hangul/__init__.py` | 모듈 초기화 |
| `backend/app/services/hangul/parser_base.py` | 기본 클래스 |
| `backend/app/services/hangul/hml_parser.py` | HML 파서 |
| `backend/app/services/hangul/hwpx_parser.py` | HWPX 파서 |
| `backend/app/services/hangul/problem_extractor.py` | 문제 추출기 |
| `backend/app/routers/hangul.py` | API 라우터 |

### 4.2 수정된 파일

| 파일 | 수정 내용 |
|------|-----------|
| `backend/app/main.py` | `hangul` 라우터 import 및 등록 |

## 5. 예방 조치

### 5.1 개발 시 권장 사항

1. **새 라우터 추가 후 서버 재시작**
   - `--reload` 옵션이 있어도 새 모듈 추가 시 수동 재시작 권장

2. **API 등록 확인**
   ```bash
   # 서버 시작 후 확인
   curl -s http://localhost:8000/openapi.json | grep "hangul"
   ```

3. **프론트엔드 테스트 전 백엔드 검증**
   - Swagger UI (http://localhost:8000/docs)에서 엔드포인트 확인

### 5.2 uvicorn reload 한계

`--reload` 옵션은 다음 경우에 불완전할 수 있음:
- 새로운 Python 패키지/모듈 디렉토리 추가
- `__init__.py` 파일 생성
- 순환 임포트가 발생하는 복잡한 모듈 구조

## 6. 현재 상태

- **백엔드**: `/api/hangul/*` 엔드포인트 정상 작동
- **프론트엔드**: 업로드 UI 정상 작동
- **API 문서**: http://localhost:8000/docs 에서 Hangul 태그 확인 가능

## 7. 결론

이 에러는 코드 버그가 아닌 **개발 서버 리로드 문제**였습니다.
새로운 모듈/패키지를 추가할 때는 서버를 수동으로 재시작해야 합니다.

---

*작성: Claude Code*
