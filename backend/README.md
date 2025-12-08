# FastAPI Backend (Phase 1: Lazy Loading)

PDF 라벨링 애플리케이션의 FastAPI 백엔드입니다.

## 주요 기능

### Phase 0/1: Lazy Loading
- **첫 10페이지 즉시 분석**: PDF 업로드 시 첫 10페이지만 즉시 분석하여 3초 내 응답
- **백그라운드 처리**: 나머지 페이지는 백그라운드에서 자동 분석
- **On-Demand 블록 조회**: 필요한 페이지의 블록 데이터만 요청 시 전송

## 설치 및 실행

### 1. 의존성 설치

```bash
cd backend
pip install -r requirements.txt
```

### 2. 환경 변수 설정

`.env` 파일을 생성하거나 수정:

```bash
# 데이터셋 경로
DATASET_ROOT=c:/MYCLAUDE_PROJECT/pdf/dataset_root

# 처리 설정
DEFAULT_DPI=150
WHITE_THRESHOLD=200
MIN_BLOCK_SIZE=2

# Lazy Loading 설정
INITIAL_PAGES=10
BATCH_SIZE=10

# FastAPI 설정
API_HOST=0.0.0.0
API_PORT=8000

# CORS Origins (쉼표로 구분)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 3. 서버 실행

```bash
# 백엔드 디렉토리에서 실행
cd backend
python -m app.main
```

또는

```bash
# 프로젝트 루트에서 실행
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

서버가 시작되면:
- API: http://localhost:8000
- Swagger 문서: http://localhost:8000/docs
- ReDoc 문서: http://localhost:8000/redoc

## API 엔드포인트

### 기본 엔드포인트

#### `GET /`
API 정보 조회

**Response:**
```json
{
  "message": "PDF Labeling API",
  "version": "1.0.0",
  "phase": "Phase 1: Lazy Loading",
  "docs": "/docs"
}
```

#### `GET /health`
헬스 체크

**Response:**
```json
{
  "status": "healthy",
  "dataset_root": "C:\\MYCLAUDE_PROJECT\\pdf\\dataset_root",
  "api_version": "1.0.0"
}
```

### PDF 관리 (`/api/pdf`)

#### `POST /api/pdf/upload`
PDF 업로드 및 Lazy Loading 처리

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (PDF 파일)

**Response:**
```json
{
  "document_id": "문서명",
  "total_pages": 264,
  "analyzed_pages": 10,
  "status": "processing",
  "task_id": "uuid-task-id",
  "message": "첫 10페이지 분석 완료. 나머지 페이지는 백그라운드에서 처리 중입니다."
}
```

#### `GET /api/pdf/documents`
분석된 문서 목록 조회

**Response:**
```json
[
  {
    "document_id": "문서명",
    "total_pages": 264,
    "analyzed_pages": 264,
    "created_at": 1763344996.0990357
  }
]
```

#### `GET /api/pdf/documents/{document_id}`
특정 문서 정보 조회

**Response:**
```json
{
  "document_id": "문서명",
  "total_pages": 264,
  "analyzed_pages": 264,
  "status": "completed"
}
```

#### `DELETE /api/pdf/documents/{document_id}`
문서 삭제

**Response:**
```json
{
  "message": "문서 '문서명'가 삭제되었습니다"
}
```

#### `GET /api/pdf/tasks/{task_id}`
백그라운드 작업 상태 조회

**Response:**
```json
{
  "task_id": "uuid-task-id",
  "document_id": "문서명",
  "status": "processing",
  "progress": 50,
  "total_pages": 264,
  "created_at": "2025-11-17T06:00:00",
  "completed_at": null,
  "error": null
}
```

#### `GET /api/pdf/tasks?document_id={document_id}`
백그라운드 작업 목록 조회

**Response:**
```json
[
  {
    "task_id": "uuid-task-id",
    "document_id": "문서명",
    "status": "completed",
    "progress": 264,
    "total_pages": 264,
    "created_at": "2025-11-17T06:00:00"
  }
]
```

### 블록 데이터 (`/api/blocks`)

#### `GET /api/blocks/documents/{document_id}/pages/{page_index}`
특정 페이지의 블록 데이터 조회

**Response:**
```json
{
  "document_id": "문서명",
  "page_index": 0,
  "width": 2480,
  "height": 3508,
  "columns": [
    {"id": "L", "x_min": 0, "x_max": 1240},
    {"id": "R", "x_min": 1240, "x_max": 2480}
  ],
  "blocks": [
    {
      "block_id": 1,
      "column": "L",
      "bbox": [100, 200, 400, 260],
      "pixel_density": 0.32
    }
  ]
}
```

#### `GET /api/blocks/documents/{document_id}/pages/{page_index}/image`
특정 페이지의 이미지 조회

**Response:**
PNG 이미지 파일 (Content-Type: image/png)

#### `GET /api/blocks/documents/{document_id}/groups/{page_index}`
특정 페이지의 문제 그룹 데이터 조회

**Response:**
```json
{
  "document_id": "문서명",
  "page_index": 0,
  "groups": [
    {
      "id": "L1",
      "column": "L",
      "block_ids": [1, 2, 3]
    }
  ]
}
```

#### `POST /api/blocks/documents/{document_id}/groups/{page_index}`
특정 페이지의 문제 그룹 데이터 저장

**Request Body:**
```json
{
  "document_id": "문서명",
  "page_index": 0,
  "groups": [
    {
      "id": "L1",
      "column": "L",
      "block_ids": [1, 2, 3]
    }
  ]
}
```

**Response:**
```json
{
  "message": "페이지 0의 그룹 데이터가 저장되었습니다"
}
```

#### `GET /api/blocks/documents/{document_id}/pages/{page_index}/status`
특정 페이지의 처리 상태 조회

**Response:**
```json
{
  "page_index": 0,
  "has_blocks": true,
  "has_groups": true,
  "status": "labeled"
}
```

상태:
- `not_analyzed`: 아직 분석되지 않음
- `analyzed`: 블록 분석 완료
- `labeled`: 그룹 라벨링 완료

## 디렉토리 구조

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI 앱 진입점
│   ├── config.py            # 설정 관리
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── pdf.py           # PDF 업로드 및 관리
│   │   └── blocks.py        # 블록 데이터 조회
│   └── services/
│       ├── __init__.py
│       └── task_queue.py    # 백그라운드 작업 큐
├── requirements.txt         # 의존성 목록
├── .env                     # 환경 변수
└── README.md               # 이 문서
```

## 테스트

### curl로 테스트

```bash
# 헬스 체크
curl http://localhost:8000/health

# 문서 목록 조회
curl http://localhost:8000/api/pdf/documents

# 특정 문서 정보 조회
curl "http://localhost:8000/api/pdf/documents/문서명"

# 페이지 블록 데이터 조회
curl "http://localhost:8000/api/blocks/documents/문서명/pages/0"

# 페이지 상태 조회
curl "http://localhost:8000/api/blocks/documents/문서명/pages/0/status"

# PDF 업로드
curl -X POST -F "file=@test.pdf" http://localhost:8000/api/pdf/upload
```

## 다음 단계 (Phase 2)

React 프론트엔드 구축:
- Vite + React + TypeScript + Tailwind CSS
- React Query로 API 연동
- PDF 업로드 UI
- 문서 목록 뷰
- 페이지 캔버스 (react-konva)

## 기술 스택

- **FastAPI 0.104.1**: 현대적인 Python 웹 프레임워크
- **Uvicorn 0.24.0**: ASGI 서버
- **Pydantic 2.5.0**: 데이터 검증
- **aiofiles 23.2.1**: 비동기 파일 처리
- **OpenCV 4.8.1**: 이미지 처리
- **PyMuPDF 1.23.8**: PDF 처리
- **Pillow 10.1.0**: 이미지 처리

## 라이선스

내부 프로젝트
