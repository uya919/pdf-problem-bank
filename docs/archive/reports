# PDF 문제은행 v2.0 마스터 플랜

**문서 번호**: 200
**작성일**: 2025-12-06
**목적**: v1.0 아카이브 및 v2.0 개발 기반 구축

---

## 1. 현재 상태 분석

### 1.1 문제점

| 영역 | 현재 상태 | 문제 |
|------|----------|------|
| docs/ | 303개 파일 | 새 세션에서 파악 불가 |
| 루트 폴더 | 27개 파일 산재 | PDF, 스크립트 혼재 |
| .claude/ | 테스트 파일 포함 | 메모리 오염 |
| 코드 | 41개 파일 300줄+ | 유지보수 어려움 |

### 1.2 해결 방향

```
v1.0 (현재) → 아카이브 (보존)
     ↓
v2.0 (신규) → 깔끔한 시작
     ├── 핵심 문서만 유지
     ├── 코드 모듈화
     └── 메모리 정리
```

---

## 2. 단계별 개발 계획 (모듈화)

### Phase 200: 정리 및 아카이브
> 상세: [201_phase200_archive_plan.md](201_phase200_archive_plan.md)

| 단계 | 작업 | 예상 시간 |
|------|------|----------|
| 200-A | 아카이브 폴더 구조 생성 | 10분 |
| 200-B | docs/ 아카이브 이동 | 15분 |
| 200-C | 루트 파일 정리 | 10분 |
| 200-D | .claude/ 정리 | 10분 |
| 200-E | dataset_root/ 테스트 파일 정리 | 10분 |

### Phase 201: 문서 재구성
> 상세: [202_phase201_docs_plan.md](202_phase201_docs_plan.md)

| 단계 | 작업 | 예상 시간 |
|------|------|----------|
| 201-A | CLAUDE.md v2.0 작성 | 30분 |
| 201-B | plan.md v2.0 작성 | 20분 |
| 201-C | 핵심 참조 문서 선별 | 15분 |

### Phase 202: 메모리 설정
> 상세: [203_phase202_memory_plan.md](203_phase202_memory_plan.md)

| 단계 | 작업 | 예상 시간 |
|------|------|----------|
| 202-A | /memory 프로젝트 요약 저장 | 15분 |
| 202-B | 핵심 아키텍처 정보 저장 | 15분 |
| 202-C | 개발 컨벤션 저장 | 10분 |

### Phase 203: 코드 모듈화 (Frontend)
> 상세: [204_phase203_frontend_modular_plan.md](204_phase203_frontend_modular_plan.md)

| 단계 | 작업 | 예상 시간 |
|------|------|----------|
| 203-A | API 클라이언트 분리 | 2시간 |
| 203-B | features/ 구조 생성 | 1시간 |
| 203-C | 대형 페이지 분리 | 4시간 |

### Phase 204: 코드 모듈화 (Backend)
> 상세: [205_phase204_backend_modular_plan.md](205_phase204_backend_modular_plan.md)

| 단계 | 작업 | 예상 시간 |
|------|------|----------|
| 204-A | 라우터 분리 | 2시간 |
| 204-B | 서비스 레이어 정리 | 2시간 |

---

## 3. 아카이브 구조

```
pdf/
├── archive/                    # v1.0 보존
│   └── v1.0_2025-12-06/
│       ├── docs/               # 303개 문서
│       ├── analysis_scripts/   # 분석 스크립트
│       ├── test_files/         # 테스트 파일들
│       └── README.md           # 아카이브 설명
│
├── docs/                       # v2.0 핵심 문서만
│   ├── 00_project_overview.md  # 프로젝트 개요
│   ├── 01_architecture.md      # 아키텍처
│   ├── 02_api_reference.md     # API 참조
│   ├── plan.md                 # 실행 계획
│   └── reference/              # 참조 문서
│       ├── 40_comprehensive_research_report.md
│       └── 158_modularization_report.md
│
├── .claude/
│   ├── settings.json           # 설정
│   └── gimini report/          # Gemini 리포트 (참조용)
│
├── backend/                    # 백엔드 코드
├── frontend/                   # 프론트엔드 코드
├── dataset_root/               # 실제 데이터만
│   ├── documents/
│   └── work_sessions/
│
└── CLAUDE.md                   # v2.0 가이드
```

---

## 4. 유지해야 할 핵심 자산

### 코드 (건드리지 않음)
- `src/density_analyzer.py` - PDF 블록 검출
- `backend/app/services/hangul/` - HML/HWPX 파서
- `backend/app/data/classification/math_tree.json` - 분류 체계

### 문서 (reference/로 이동)
- `docs/40_comprehensive_research_report.md` - 종합 연구
- `docs/157_deep_learning_data_preparation.md` - DL 데이터 준비
- `docs/158_modularization_feasibility_report.md` - 모듈화 분석

### 데이터
- `dataset_root/documents/` - 문서 데이터
- `dataset_root/work_sessions/` - 작업 세션

---

## 5. 삭제/이동 대상

### 루트에서 제거 (archive로)
```
*.pdf (3개)
analyze_*.py (5개)
pixel_*.png (1개)
grouping_*.png (1개)
test_*.py (있으면)
```

### .claude/에서 제거
```
*.hwp, *.hml, *.hwpx (테스트 파일)
extracted_*.json
hwpx_analysis/ (전체)
extracted_images/
```

### dataset_root/에서 제거
```
*_truncation.png (다수)
*_visualization*.png
test_*.png
```

---

## 6. 실행 순서

```
1. Phase 200 승인 → 아카이브 생성
2. Phase 201 승인 → 문서 재구성
3. Phase 202 승인 → 메모리 설정
4. (선택) Phase 203-204 → 코드 모듈화
```

**중요**: 각 Phase는 독립적으로 승인/실행 가능

---

## 7. 예상 효과

### Before (v1.0)
- 새 세션: "이 프로젝트가 뭐죠?"
- 문서 파악: 303개 읽어야 함
- 코드 수정: 에러 빈발

### After (v2.0)
- 새 세션: 메모리에서 즉시 파악
- 문서 파악: 5개 핵심 문서
- 코드 수정: 모듈화된 작은 파일

---

*다음 단계: "Phase 200 진행해줘" 또는 개별 단계 지정*
