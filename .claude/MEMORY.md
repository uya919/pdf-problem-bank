# 프로젝트 메모리 (새 세션용)

이 파일은 새로운 Claude 세션에서 프로젝트를 빠르게 이해하기 위한 요약입니다.

---

## 프로젝트 개요

**PDF 문제은행 시스템** - 학원용 수학 문제집 PDF → 문제 이미지 자동 크롭 + 라벨링 웹앱

### 핵심 기능
1. PDF 업로드 → 페이지 이미지 변환
2. 텍스트 블록 자동 검출
3. 사용자가 블록을 문제 단위로 그룹핑
4. 문제 이미지 PNG + 메타데이터 JSON 저장

### 사용자
- 학원 선생님 (비개발자)
- Claude Code가 100% 코드 작성

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Backend | FastAPI, Python 3.11, PyMuPDF, OpenCV |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| 상태관리 | Zustand, TanStack Query |
| 스타일 | 토스(Toss) 디자인 시스템 |

---

## 핵심 자산

| 자산 | 위치 |
|------|------|
| PDF 블록 검출 | `src/density_analyzer.py` |
| HML 파서 | `backend/app/services/hangul/hml_parser.py` |
| HWPX 파서 | `backend/app/services/hangul/hwpx_parser.py` |
| 분류 체계 | `backend/app/data/classification/math_tree.json` |
| 라벨링 UI | `frontend/src/pages/PageViewer.tsx` |

---

## 폴더 구조

```
pdf/
├── backend/app/        # FastAPI 백엔드
├── frontend/src/       # React 프론트엔드
├── dataset_root/       # 데이터 저장
├── docs/               # 개발 문서
│   ├── plan.md         # 개발 계획
│   └── reference/      # 참조 문서
└── archive/            # v1.0 아카이브
```

---

## 주요 API 엔드포인트

| 엔드포인트 | 기능 |
|-----------|------|
| POST /api/pdf/upload | PDF 업로드 |
| GET /api/documents | 문서 목록 |
| GET /api/blocks/{doc}/{page} | 블록 데이터 |
| POST /api/groups/{doc}/{page} | 그룹 저장 |
| GET /api/work-sessions | 작업 세션 |

---

## 개발 서버

```bash
# 백엔드
cd backend && python -m uvicorn app.main:app --reload --port 8000

# 프론트엔드
cd frontend && npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8000/docs

---

## 개발 규칙

- 파일당 300줄 이하 권장
- 함수에 docstring 필수
- 모든 문서는 docs/ 폴더에
- 계획은 docs/plan.md 참조

---

## 현재 상태 (v2.0)

- v1.0 완료 및 아카이브됨
- 라벨링 시스템 안정화 완료
- 70+ 페이지 라벨링됨
- 100페이지 도달 시 AI 자동화 시작 예정

---

*마지막 업데이트: 2025-12-06*
