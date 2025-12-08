# PDF 문제은행 시스템 v2.0

> 학원용 수학 문제집 PDF → 문제 이미지 자동 크롭 + 라벨링 웹앱

---

## 1. 프로젝트 요약

| 항목 | 내용 |
|------|------|
| **목적** | PDF 문제집에서 문제를 자동 검출하고 그룹핑하여 문제은행 구축 |
| **사용자** | 학원 선생님 (비개발자) |
| **개발** | Claude Code 100% 코드 작성 |

---

## 2. 핵심 자산 (유지)

| 자산 | 위치 | 상태 |
|------|------|------|
| PDF 블록 검출 | `src/density_analyzer.py` | 완성 |
| HML 파서 | `backend/app/services/hangul/hml_parser.py` | 완성 |
| HWPX 파서 | `backend/app/services/hangul/hwpx_parser.py` | 완성 |
| 분류 체계 | `backend/app/data/classification/math_tree.json` | 완성 (847노드) |

---

## 3. 기술 스택

| 영역 | 기술 |
|------|------|
| Backend | FastAPI, Python 3.11, PyMuPDF, OpenCV |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| 상태관리 | Zustand, TanStack Query |
| 스타일 | 토스(Toss) 디자인 시스템 |

---

## 4. 폴더 구조

```
pdf/
├── backend/app/           # FastAPI 백엔드
│   ├── routers/           # API 라우터
│   ├── services/          # 비즈니스 로직
│   └── models/            # 데이터 모델
│
├── frontend/src/          # React 프론트엔드
│   ├── api/               # API 클라이언트
│   ├── pages/             # 페이지 컴포넌트
│   ├── components/        # UI 컴포넌트
│   └── stores/            # Zustand 스토어
│
├── dataset_root/          # 데이터 저장
│   ├── documents/         # 문서별 데이터
│   └── work_sessions/     # 작업 세션
│
├── docs/                  # 개발 문서
│   ├── plan.md            # 개발 계획
│   └── reference/         # 참조 문서
│
└── archive/               # v1.0 아카이브
```

---

## 5. 개발 서버 실행

```bash
# 백엔드 (터미널 1)
cd backend
python -m uvicorn app.main:app --reload --port 8000

# 프론트엔드 (터미널 2)
cd frontend
npm run dev
```

**접속 URL**:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/docs

---

## 6. 개발 원칙

### Claude Code 사용법
| 명령어 | 용도 |
|--------|------|
| `진행해줘` | 계획된 작업 실행 |
| `opus thinkharder` | 깊은 분석, 리포트 작성 |
| `에러야` + 로그 | 디버깅 |

### 코드 규칙
- 파일당 **300줄 이하** 권장
- 함수에 **docstring** 필수
- 모든 문서는 **docs/** 폴더에

### 문서 규칙
- 계획: `docs/plan.md` 참조
- 번호 체계: 200번대 = v2.0
- 참조 문서: `docs/reference/`

---

## 7. 데이터 흐름

```
PDF 업로드 → 페이지 이미지 변환 → 블록 자동 검출
                                      ↓
                              사용자가 블록 그룹핑
                                      ↓
                     groups.json 저장 ← → session 동기화
                                      ↓
                              문제 이미지 PNG 내보내기
```

**SSOT (Single Source of Truth)**:
- `groups.json`: 그룹 데이터 원본
- `session.links`: 문제-해설 연결 원본

---

## 8. 참조 문서

| 문서 | 내용 |
|------|------|
| [docs/plan.md](docs/plan.md) | 개발 계획 |
| [docs/reference/architecture/](docs/reference/architecture/) | 아키텍처 문서 |
| [docs/reference/ai_automation/](docs/reference/ai_automation/) | AI 자동화 연구 |
| [archive/v1.0_2025-12-06/](archive/v1.0_2025-12-06/) | v1.0 아카이브 |

---

## 9. 자주 발생하는 문제

| 문제 | 해결 |
|------|------|
| API 404 에러 | 백엔드 서버 재시작 |
| 포트 충돌 | `netstat -ano \| findstr :8000` 후 taskkill |
| TypeScript 에러 | 에러 메시지 확인 후 타입 수정 |

---

*v2.0 - 2025-12-06*
