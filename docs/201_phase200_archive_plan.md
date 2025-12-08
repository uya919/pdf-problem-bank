# Phase 200: 정리 및 아카이브 상세 계획

**문서 번호**: 201
**상위 문서**: [200_v2_master_plan.md](200_v2_master_plan.md)
**예상 시간**: 55분

---

## 200-A: 아카이브 폴더 구조 생성 (10분)

### 생성할 폴더
```
archive/
└── v1.0_2025-12-06/
    ├── docs/               # 문서 아카이브
    ├── analysis_scripts/   # 분석 스크립트
    ├── test_files/         # 테스트 파일
    ├── test_images/        # 테스트 이미지
    └── README.md           # 아카이브 설명
```

### README.md 내용
```markdown
# v1.0 Archive (2025-12-06)

이 폴더는 v1.0 개발 과정에서 생성된 파일들을 보존합니다.
v2.0 개발 시 참조용으로만 사용하세요.

## 폴더 구조
- docs/: 개발 문서 303개
- analysis_scripts/: 블록 검출 분석 스크립트
- test_files/: HML/HWPX 테스트 파일
- test_images/: 시각화 테스트 이미지

## 핵심 참조 문서 (docs/reference/로 복사됨)
- 40_comprehensive_research_report.md
- 157_deep_learning_data_preparation.md
- 158_modularization_feasibility_report.md
```

---

## 200-B: docs/ 아카이브 이동 (15분)

### 유지할 문서 (docs/에 남김)
```
00_project_overview.md      → 수정하여 v2.0용으로
plan.md                     → 완전히 새로 작성
```

### reference/로 복사
```
40_comprehensive_research_report.md
157_deep_learning_data_preparation_feasibility_report.md
158_modularization_feasibility_report.md
154_gemini_ai_automation_comprehensive_research.md
155_ai_automation_webapp_feasibility_report.md
156_laptop_desktop_workflow_research_report.md
```

### archive/v1.0/docs/로 이동
```
나머지 모든 .md 파일 (약 295개)
```

---

## 200-C: 루트 파일 정리 (10분)

### 유지 (루트에 남김)
```
.env
.env.example
.gitignore
CLAUDE.md (새로 작성 예정)
requirements.txt
```

### archive/v1.0/analysis_scripts/로 이동
```
analyze_equation.py
analyze_hml.py
analyze_hml2.py
analyze_hml_deep.py
analyze_hml_endnote.py
기타 analyze_*.py
```

### archive/v1.0/test_files/로 이동
```
*.pdf (루트에 있는 것들)
pixel_block_analysis_1.png
grouping_visualization.png
```

---

## 200-D: .claude/ 정리 (10분)

### 유지
```
.claude/settings.local.json (설정)
.claude/gimini report/       (Gemini 리포트 폴더)
```

### archive/v1.0/test_files/로 이동
```
.claude/*.hwp
.claude/*.hml
.claude/*.hwpx
.claude/extracted_text.json
.claude/hwpx_extracted.json
.claude/hwpx_analysis/ (전체)
.claude/extracted_images/ (전체)
```

---

## 200-E: dataset_root/ 테스트 파일 정리 (10분)

### 유지 (실제 데이터)
```
dataset_root/documents/      # 문서 데이터
dataset_root/work_sessions/  # 작업 세션
dataset_root/raw_pdfs/       # 원본 PDF (필요시)
```

### archive/v1.0/test_images/로 이동
```
dataset_root/*_truncation.png
dataset_root/*_visualization*.png
dataset_root/test_*.png
dataset_root/block_*.png
dataset_root/integral_*.png
dataset_root/distance_*.png
dataset_root/projection_*.png
dataset_root/contour_*.png
```

---

## 실행 확인 체크리스트

### 200-A 완료 확인
- [ ] archive/v1.0_2025-12-06/ 폴더 생성됨
- [ ] 하위 폴더 4개 생성됨
- [ ] README.md 생성됨

### 200-B 완료 확인
- [ ] docs/reference/ 폴더 생성됨
- [ ] 핵심 문서 6개 reference/에 복사됨
- [ ] 나머지 문서 archive/로 이동됨
- [ ] docs/에 plan.md, 00_project_overview.md만 남음

### 200-C 완료 확인
- [ ] 루트에 PDF 없음
- [ ] 루트에 분석 스크립트 없음
- [ ] .env, CLAUDE.md 등 핵심 파일만 남음

### 200-D 완료 확인
- [ ] .claude/에 settings.local.json만 남음
- [ ] .claude/gimini report/ 유지됨
- [ ] 테스트 파일들 archive/로 이동됨

### 200-E 완료 확인
- [ ] dataset_root/에 테스트 이미지 없음
- [ ] documents/, work_sessions/ 유지됨

---

*승인 후 실행: "200-A 진행해줘" 또는 "Phase 200 전체 진행해줘"*
