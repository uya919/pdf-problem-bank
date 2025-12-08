# 프로젝트 전체 개요

**프로젝트명:** PDF 문제 이미지 자동 크롭 + 라벨링 데스크톱 앱

**목적:** 학원용 수학 문제집 PDF에서 문제 단위로 자동 크롭 및 라벨링

**개발 기간:** 2025년 11월 ~

**개발 방식:** Claude Code 주도 개발 (비개발자 사용자와 협업)

---

## 📌 프로젝트 목표

### 핵심 기능
1. **PDF → 이미지 변환** ✅ (완료)
2. **자동 블록 검출** ✅ (완료)
   - 흰색 배경 제거
   - 텍스트/수식 블록 검출
   - 다층 스케일 검출 (large, medium, small, ultra_small)
3. **GUI 앱** 📅 (예정)
   - 블록 시각화
   - 수동 그룹핑 인터페이스
4. **문제 단위 그룹핑** 📅 (예정)
   - 여러 블록을 하나의 문제로 묶기
   - 자동 크롭 및 저장
5. **ML 기반 자동 그룹핑** 💡 (계획)
   - 사용자 라벨 데이터 학습
   - 자동 문제 분할 예측

---

## 🏗️ 시스템 아키텍처

### 데이터 흐름
```
[PDF 파일]
    ↓ PDFProcessor
[페이지 이미지들]
    ↓ DensityAnalyzer + MultiscaleAnalyzer
[블록 검출 결과 (JSON)]
    ↓ GUI + 사용자 입력
[문제 그룹 라벨 (JSON)]
    ↓ Grouping 모듈
[크롭된 문제 이미지들 (PNG)]
    ↓ ML 모델 (향후)
[자동 문제 분할]
```

### 주요 컴포넌트

#### 1. 백엔드 (완료)
- **PDFProcessor**: PDF → PNG 변환
- **DensityAnalyzer**: 블록 검출 통합 인터페이스
- **MultiscaleAnalyzer**: 다층 스케일 형태학적 분석
- **Config**: 설정 관리
- **DataModels**: 데이터 구조 (Block, BoundingBox, PageData 등)

#### 2. GUI (예정)
- **MainWindow**: 메인 윈도우
- **PageCanvas**: 페이지 및 블록 시각화
- **SidePanels**: 문서/페이지/그룹 리스트

#### 3. 그룹핑 (예정)
- **Grouping**: 그룹 관리 로직
- **Cropping**: 이미지 크롭 및 저장

#### 4. ML (계획)
- **규칙 기반**: Y 좌표 간격 기반 분할
- **ML 모델**: Random Forest / XGBoost
- **딥러닝**: Vision Transformer (장기)

---

## 🛠️ 기술 스택

### 언어 및 프레임워크
- **Python 3.11**
- **PySide6** (GUI, 예정)

### 주요 라이브러리
```python
# PDF 처리
PyMuPDF (fitz)

# 이미지 처리
opencv-python (cv2)
numpy

# GUI (예정)
PySide6

# ML (계획)
scikit-learn
pytorch / transformers
```

### 개발 도구
- Claude Code (AI 페어 프로그래밍)
- Git (버전 관리, 예정)

---

## 📁 폴더 구조

```
pdf/
├── src/                          # 소스 코드
│   ├── config.py                 # 설정
│   ├── data_models.py            # 데이터 모델
│   ├── pdf_processor.py          # PDF 변환
│   ├── density_analyzer.py       # 블록 검출 (통합)
│   ├── multiscale_analyzer.py    # 다층 스케일 검출
│   └── gui/ (예정)               # GUI 컴포넌트
│
├── tests/                        # 테스트 및 진단 도구
│   ├── test_pipeline.py          # 전체 테스트
│   ├── analyze_current_blocks.py # 블록 통계 분석
│   ├── diagnose_missing_blocks.py # 누락 블록 진단
│   └── analyze_merge_process.py  # 병합 과정 분석
│
├── dataset_root/                 # 데이터 저장소 (NAS 동기화)
│   ├── raw_pdfs/                 # 원본 PDF
│   ├── documents/                # 문서별 처리 결과
│   │   └── {doc_id}/
│   │       ├── pages/            # PNG 이미지
│   │       ├── blocks/           # 블록 JSON
│   │       ├── labels/           # 그룹 JSON (예정)
│   │       └── diagnosis/        # 진단 이미지
│   └── models/ (계획)            # ML 모델
│
├── docs/                         # 문서 (이 폴더)
│   ├── 00_project_overview.md    # 이 문서
│   ├── 01_phase1_block_detection.md
│   ├── 02_phase2_gui_plan.md
│   ├── 03_phase3_grouping_plan.md
│   ├── 04_phase4_ml_plan.md
│   ├── development_log.md
│   └── lessons_learned.md
│
├── CLAUDE.md                     # 프로젝트 가이드
├── multiscale_detection_final_report.md
└── requirements.txt
```

---

## 🎯 Phase별 목표

### ✅ Phase 1: PDF 변환 및 블록 검출 (완료)
**기간:** 2025-11-16
**결과:**
- 623개 블록 검출 (초기 79개 대비 688% 증가)
- 4-scale 검출 (large, medium, small, ultra_small)
- 누락 블록 20개 (전체의 ~3%, 허용 범위)

**상세:** [01_phase1_block_detection.md](01_phase1_block_detection.md)

---

### 📅 Phase 2: GUI 구현 (진행 예정)
**목표:**
- PySide6 기반 데스크톱 앱
- 페이지 시각화 + 블록 표시
- 기본 네비게이션 (페이지 이동, 줌)

**예상 기간:** 2-3주

**상세:** [02_phase2_gui_plan.md](02_phase2_gui_plan.md)

---

### 📅 Phase 3: 문제 그룹핑 기능 (진행 예정)
**목표:**
- 수동 그룹 생성/수정/삭제
- 문제 이미지 자동 크롭
- JSON 라벨 저장

**예상 기간:** 1-2주

**상세:** [03_phase3_grouping_plan.md](03_phase3_grouping_plan.md)

---

### 💡 Phase 4: ML 모델 학습 (장기 계획)
**목표:**
- 자동 문제 그룹핑
- 규칙 기반 → ML → 딥러닝 단계적 발전

**예상 기간:** 수개월

**상세:** [04_phase4_ml_plan.md](04_phase4_ml_plan.md)

---

## 📊 현재 상태

### Phase 1 성과
| 항목 | 값 |
|------|-----|
| **검출 블록 수** | 623개 |
| **스케일 수** | 4개 (large, medium, small, ultra_small) |
| **IoU 임계값** | 0.60 |
| **누락 블록** | 20개 (~3%) |
| **검출 개선율** | +688% (79 → 623) |

### 다음 단계
1. **즉시:** GUI 프로토타입 설계
2. **단기:** PySide6 기본 레이아웃 구현
3. **중기:** 그룹핑 기능 개발

---

## 🎓 핵심 원칙

### 1. 단계별 검증
- 각 기능 구현 후 즉시 테스트
- 시각화로 결과 확인
- 문제 발견 시 진단 도구 먼저 개발

### 2. 모듈화
- 각 컴포넌트 독립적 동작
- 명확한 인터페이스
- 설정 파일로 파라미터 관리

### 3. 데이터 기반 의사결정
- 추측 대신 측정
- 진단 스크립트로 정량 분석
- 여러 옵션 비교 후 선택

### 4. 사용자 중심
- 비개발자도 사용 가능한 UI
- 직관적인 워크플로우
- 충분한 문서화

---

## 📚 관련 문서

### 프로젝트 가이드
- [CLAUDE.md](../CLAUDE.md) - 사용자 → Claude Code 가이드

### Phase별 상세 문서
- [Phase 1: 블록 검출](01_phase1_block_detection.md) ✅
- [Phase 2: GUI 구현](02_phase2_gui_plan.md) 📅
- [Phase 3: 그룹핑 기능](03_phase3_grouping_plan.md) 📅
- [Phase 4: ML 모델](04_phase4_ml_plan.md) 💡

### 기타 문서
- [개발 일지](development_log.md)
- [학습 내용](lessons_learned.md)
- [다층 스케일 검출 최종 리포트](../multiscale_detection_final_report.md)

---

**최종 업데이트:** 2025-11-16
**작성자:** Claude Code
**프로젝트 상태:** Phase 1 완료, Phase 2 준비 중
