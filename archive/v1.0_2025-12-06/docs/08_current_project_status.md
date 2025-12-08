# PDF 문제 라벨링 프로젝트 현황 (2025-11-18)

## Executive Summary

**프로젝트 상태:** FastAPI + React 웹 앱 개발 완료 (Core Features)

**기술 스택:**
- Backend: FastAPI + Python 3.11
- Frontend: React 19 + TypeScript + Vite + Tailwind CSS + Konva
- 데이터: JSON 파일 기반 (dataset_root)

---

## 완료된 Phase 요약

| Phase | 기능 | 상태 | 완료일 |
|-------|------|------|--------|
| Phase 1 | 블록 검출 알고리즘 | ✅ 완료 | 2025-11-16 |
| Phase 2 | FastAPI 백엔드 | ✅ 완료 | 2025-11-17 |
| Phase 3 | React 라벨링 UI | ✅ 완료 | 2025-11-17 |
| Phase 4 | 문제 내보내기 | ✅ 완료 | 2025-11-17 |
| Phase 5 | 문제은행 브라우저 | ✅ 완료 | 2025-11-17 |
| Phase 6 | Modern UI/UX | ✅ 완료 | 2025-11-18 |
| Phase 7 | 작업 관리 UI | ✅ 완료 | 2025-11-18 |

---

## Phase 1: 블록 검출 (✅ 완료)

### 결과
- **검출 정확도:** 99.9% (914/915개)
- **알고리즘:** 단순 Connected Components
- **설정:** WHITE_THRESHOLD=200, MIN_BLOCK_SIZE=2

### 주요 파일
- `src/density_analyzer.py` - 블록 검출 핵심 로직
- `src/config.py` - 설정 관리

### 데이터 구조
```json
// dataset_root/documents/{doc_id}/blocks/page_0000_blocks.json
{
  "document_id": "문서ID",
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

---

## Phase 2: FastAPI 백엔드 (✅ 완료)

### 아키텍처
```
backend/
├── app/
│   ├── main.py              # FastAPI 앱
│   ├── config.py            # 설정
│   └── routers/
│       ├── pdf.py           # PDF 업로드/처리
│       ├── blocks.py        # 블록 조회
│       └── export.py        # 내보내기
└── requirements.txt
```

### API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/pdf/upload` | PDF 업로드 및 분석 |
| GET | `/api/pdf/documents` | 문서 목록 |
| GET | `/api/pdf/documents/{id}` | 문서 정보 |
| DELETE | `/api/pdf/documents/{id}` | 문서 삭제 |
| GET | `/api/blocks/documents/{id}/pages/{idx}` | 페이지 블록 조회 |
| GET | `/api/blocks/documents/{id}/pages/{idx}/image` | 페이지 이미지 |
| GET | `/api/blocks/documents/{id}/groups/{idx}` | 그룹 조회 |
| POST | `/api/blocks/documents/{id}/groups/{idx}` | 그룹 저장 |
| POST | `/api/export/documents/{id}/pages/{idx}/export` | 페이지 내보내기 |
| POST | `/api/export/documents/{id}/export-all` | 전체 내보내기 |
| GET | `/api/stats/dashboard` | 대시보드 통계 |

### 실행 방법
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

---

## Phase 3: React 라벨링 UI (✅ 완료)

### 아키텍처
```
frontend/
├── src/
│   ├── api/
│   │   └── client.ts         # API 클라이언트
│   ├── components/
│   │   ├── PageCanvas.tsx    # Konva 캔버스 (드래그 선택 포함)
│   │   ├── PageNavigation.tsx
│   │   ├── GroupPanel.tsx
│   │   └── ui/               # 재사용 컴포넌트
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── DocumentsPage.tsx
│   │   ├── LabelingPage.tsx
│   │   ├── PageViewer.tsx
│   │   ├── ProblemsPage.tsx
│   │   └── TasksPage.tsx
│   ├── hooks/
│   │   └── useDocuments.ts   # React Query hooks
│   └── App.tsx
├── package.json
└── vite.config.ts
```

### 주요 기능

#### 1. 블록 선택
- **클릭 선택:** 개별 블록 클릭
- **다중 선택:** Ctrl+클릭
- **드래그 선택:** 빈 공간에서 드래그하여 영역 선택
- **선택 해제:** ESC 키

#### 2. 그룹 관리
- 그룹 생성 (선택된 블록들로)
- 그룹 삭제
- 자동 저장 (2초 디바운스)

#### 3. 키보드 단축키
- `←/→`: 페이지 이동
- `Delete/Backspace`: 선택된 그룹 삭제
- `ESC`: 선택 해제

### 실행 방법
```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

---

## Phase 4: 문제 내보내기 (✅ 완료)

### 기능
- 페이지별 그룹을 PNG 이미지로 크롭
- 그룹 정보와 함께 저장
- 전체 문서 일괄 내보내기

### 저장 구조
```
dataset_root/
└── documents/{doc_id}/
    ├── pages/            # 페이지 이미지
    ├── blocks/           # 블록 JSON
    ├── labels/           # 그룹 JSON
    └── problems/         # 내보낸 문제 이미지
        ├── page_0000_L1.png
        ├── page_0000_L2.png
        └── ...
```

---

## Phase 5: 문제은행 브라우저 (✅ 완료)

### 기능
- 내보낸 문제 목록 조회
- 문제 이미지 미리보기
- 문서별 필터링

### UI 컴포넌트
- `ProblemsPage.tsx` - 문제은행 메인 페이지
- 그리드 뷰로 문제 이미지 표시

---

## Phase 6: Modern UI/UX (✅ 완료)

### 디자인 시스템
- **색상:** Primary Blue (#3B82F6), Gradients
- **폰트:** Pretendard (시스템 폰트 폴백)
- **레이아웃:** 사이드바 + 메인 컨텐츠
- **컴포넌트:** Card, Badge, Toast, Progress

### 페이지 구조
1. **대시보드** - 통계 개요, 최근 활동
2. **문서 관리** - PDF 업로드/삭제, 문서 목록
3. **라벨링 작업** - 블록 선택, 그룹 생성
4. **문제은행** - 내보낸 문제 브라우저
5. **해설 연결** - (예정)
6. **작업 관리** - 배치 작업 모니터링
7. **통계** - (예정)
8. **설정** - (예정)

### 반응형 지원
- 데스크톱 우선 디자인
- Tailwind CSS 반응형 클래스

---

## Phase 7: 작업 관리 UI (✅ 완료)

### 기능 (현재 Mock 데이터)
- 작업 목록 표시
- 작업 상태별 필터링 (전체/실행 중/대기/일시정지/완료/실패)
- 작업 일시정지/재개/취소
- 진행률 표시

### 향후 구현 예정
- 실제 백그라운드 작업 처리 (Celery + Redis)
- 폴더 일괄 업로드
- WebSocket 실시간 업데이트

---

## 최근 버그 수정 (2025-11-18)

### 1. TypeScript 모듈 오류 수정
**문제:** `TasksPage.tsx`에서 `Task` 타입 import 오류
```
Uncaught SyntaxError: The requested module does not provide an export named 'Task'
```

**원인:** TypeScript 5.0+ `verbatimModuleSyntax: true` 설정

**해결:** 타입과 값을 분리하여 import
```typescript
// Before
import { TaskCard, Task, TaskStatus } from '../components/ui/TaskCard';

// After
import { TaskCard } from '../components/ui/TaskCard';
import type { Task, TaskStatus } from '../components/ui/TaskCard';
```

### 2. 드래그 선택 기능 수정
**문제:** 캔버스에서 드래그로 블록 선택 불가

**원인:**
1. Image 컴포넌트가 Stage 전체를 덮어 이벤트 캡처
2. `e.target === e.target.getStage()` 조건이 절대 true가 될 수 없음

**해결:**
1. Image에 `listening={false}` 추가
2. 드래그 조건을 `targetType === 'Stage' || targetType === 'Image'`로 수정
3. 디버깅 로그 추가

**수정 파일:** `frontend/src/components/PageCanvas.tsx`

---

## 현재 폴더 구조

```
pdf/
├── backend/                    # FastAPI 백엔드
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   └── routers/
│   └── requirements.txt
│
├── frontend/                   # React 프론트엔드
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   └── hooks/
│   ├── package.json
│   └── vite.config.ts
│
├── src/                        # 기존 Python 코드 (블록 검출)
│   ├── config.py
│   ├── data_models.py
│   ├── pdf_processor.py
│   ├── density_analyzer.py
│   └── gui/                    # PySide6 GUI (레거시)
│
├── dataset_root/               # 데이터 저장소
│   ├── raw_pdfs/
│   └── documents/
│       └── {doc_id}/
│           ├── pages/
│           ├── blocks/
│           ├── labels/
│           └── problems/
│
├── docs/                       # 문서
│   ├── 00_project_overview.md
│   ├── 01_phase1_block_detection.md
│   ├── ...
│   └── 08_current_project_status.md  # 이 문서
│
└── CLAUDE.md                   # 프로젝트 가이드
```

---

## 개발 서버 실행

### 1. 백엔드 (FastAPI)
```bash
cd c:\MYCLAUDE_PROJECT\pdf\backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. 프론트엔드 (Vite)
```bash
cd c:\MYCLAUDE_PROJECT\pdf\frontend
npm run dev
# http://localhost:5173 또는 5174
```

### 3. 환경 변수
```bash
# .env 파일 (backend/)
DATASET_ROOT=c:/MYCLAUDE_PROJECT/pdf/dataset_root
WHITE_THRESHOLD=200
MIN_BLOCK_SIZE=2
```

---

## 다음 단계 (TODO)

### 단기 (1-2주)
- [ ] 해설 연결 기능 구현
- [ ] 통계 페이지 구현
- [ ] 설정 페이지 구현
- [ ] 디버깅 로그 제거 (프로덕션 배포 전)

### 중기 (1개월)
- [ ] 실제 백그라운드 작업 처리 (Celery + Redis)
- [ ] WebSocket 실시간 업데이트
- [ ] 폴더 일괄 업로드

### 장기 (3-6개월)
- [ ] ML 자동 그룹핑
- [ ] 사용자 인증 시스템
- [ ] Docker 배포

---

## 기술적 결정 사항

### 1. 캔버스 라이브러리 선택: react-konva
**이유:**
- Lazy Loading으로 페이지당 최대 ~1,066개 블록만 렌더링
- Pixi.js(WebGL) 대신 react-konva로 충분
- React 통합이 자연스러움

### 2. 상태 관리: React Query
**이유:**
- 서버 상태 관리에 최적화
- 캐싱, 프리페칭 자동 지원
- 로딩/에러 상태 자동 처리

### 3. 스타일링: Tailwind CSS
**이유:**
- 빠른 프로토타이핑
- 일관된 디자인 시스템
- 작은 번들 크기

### 4. 데이터 저장: JSON 파일
**이유:**
- 단순함
- NAS 동기화 용이
- 추후 DB 마이그레이션 가능

---

## 문제 해결 가이드

### 1. 서버 연결 오류
```
Network Error / CORS Error
```
**해결:** 백엔드 서버가 실행 중인지 확인 (port 8000)

### 2. 이미지 로딩 실패
```
GET /api/blocks/documents/.../image 404
```
**해결:** 문서가 제대로 분석되었는지 확인, pages 폴더에 이미지 있는지 확인

### 3. 드래그 선택 안 됨
**해결:** 브라우저 콘솔에서 `[PageCanvas Debug]` 로그 확인
- `targetType: 'Stage'`이면 정상
- `targetType: 'Image'`이면 `listening={false}` 확인

### 4. TypeScript 타입 오류
```
The requested module does not provide an export named 'X'
```
**해결:** `import type { X }` 문법 사용

---

## 연락처 및 기록

**개발:** Claude Code + 사용자 협업
**시작일:** 2025-11-15
**최종 업데이트:** 2025-11-18
**버전:** 2.0 (FastAPI + React)

---

## 관련 문서

- [00_project_overview.md](00_project_overview.md) - 프로젝트 전체 개요
- [01_phase1_block_detection.md](01_phase1_block_detection.md) - 블록 검출 상세
- [07_fastapi_react_migration_plan.md](07_fastapi_react_migration_plan.md) - 마이그레이션 계획
- [../CLAUDE.md](../CLAUDE.md) - 개발 가이드
