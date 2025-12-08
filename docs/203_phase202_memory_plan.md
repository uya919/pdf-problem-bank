# Phase 202: 메모리 설정 상세 계획

**문서 번호**: 203
**상위 문서**: [200_v2_master_plan.md](200_v2_master_plan.md)
**예상 시간**: 40분

---

## 202-A: 프로젝트 요약 저장 (15분)

### /memory에 저장할 내용

```markdown
# PDF 문제은행 시스템

## 프로젝트 목적
학원용 수학 문제집 PDF를 처리하여:
1. 페이지를 이미지로 변환
2. 텍스트 블록 자동 검출
3. 블록을 문제 단위로 그룹핑
4. 문제 이미지 PNG + 메타데이터 JSON 저장

## 기술 스택
- Backend: FastAPI + Python 3.11
- Frontend: React 18 + TypeScript + Vite
- 스타일: Tailwind CSS (토스 스타일)
- 상태관리: Zustand + TanStack Query

## 핵심 자산
| 자산 | 위치 |
|------|------|
| PDF 블록 검출 | src/density_analyzer.py |
| HML 파서 | backend/app/services/hangul/hml_parser.py |
| HWPX 파서 | backend/app/services/hangul/hwpx_parser.py |
| 분류 체계 | backend/app/data/classification/math_tree.json |

## 데이터 위치
- dataset_root/documents/ - 문서 데이터
- dataset_root/work_sessions/ - 작업 세션
```

---

## 202-B: 핵심 아키텍처 정보 저장 (15분)

### /memory에 저장할 내용

```markdown
# 아키텍처 정보

## 폴더 구조
```
pdf/
├── backend/app/
│   ├── routers/     # API 라우터
│   ├── services/    # 비즈니스 로직
│   └── models/      # 데이터 모델
├── frontend/src/
│   ├── api/         # API 클라이언트
│   ├── pages/       # 페이지 컴포넌트
│   ├── components/  # UI 컴포넌트
│   └── stores/      # Zustand 스토어
├── dataset_root/    # 데이터 저장
└── docs/            # 문서
```

## 주요 API 엔드포인트
- POST /api/pdf/upload - PDF 업로드
- GET /api/documents - 문서 목록
- GET /api/blocks/{doc_id}/{page} - 블록 데이터
- POST /api/groups/{doc_id}/{page} - 그룹 저장
- GET /api/work-sessions - 작업 세션

## 데이터 흐름 (SSOT)
groups.json (원본) ←→ session.problems (캐시)
session.links (원본) ←→ groups.json.link (캐시)
```

---

## 202-C: 개발 컨벤션 저장 (10분)

### /memory에 저장할 내용

```markdown
# 개발 컨벤션

## 코드 작성
- 함수/클래스에 docstring 필수
- TypeScript 타입 힌트 사용
- 파일당 300줄 이하 권장

## 문서 작성
- 모든 문서는 docs/ 폴더에
- 번호 체계: 200번대 = v2.0
- 프로젝트 루트에 .md 생성 금지

## 커밋 메시지
🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>

## 서버 실행
# 백엔드
cd backend && python -m uvicorn app.main:app --reload --port 8000

# 프론트엔드
cd frontend && npm run dev
```

---

## 메모리 저장 명령어

Phase 202 실행 시 다음 명령어 사용:
```
/memory add "PDF 문제은행 프로젝트 요약" (202-A 내용)
/memory add "아키텍처 정보" (202-B 내용)
/memory add "개발 컨벤션" (202-C 내용)
```

---

## 실행 확인 체크리스트

### 202-A 완료 확인
- [ ] 프로젝트 목적 저장됨
- [ ] 기술 스택 저장됨
- [ ] 핵심 자산 위치 저장됨

### 202-B 완료 확인
- [ ] 폴더 구조 저장됨
- [ ] API 엔드포인트 저장됨
- [ ] 데이터 흐름 저장됨

### 202-C 완료 확인
- [ ] 코드 컨벤션 저장됨
- [ ] 문서 규칙 저장됨
- [ ] 서버 실행 방법 저장됨

---

*승인 후 실행: "202-A 진행해줘" 또는 "Phase 202 전체 진행해줘"*
