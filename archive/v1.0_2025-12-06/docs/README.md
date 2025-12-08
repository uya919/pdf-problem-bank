# 프로젝트 문서 인덱스

이 폴더는 PDF 문제 이미지 자동 크롭 프로젝트의 모든 문서를 포함합니다.

---

## 📚 문서 구조

### 📌 시작하기 (필독)

- **[08_current_project_status.md](08_current_project_status.md)** - 🔥 **현재 프로젝트 상태** (2025-11-18)
  - FastAPI + React 웹앱 개발 완료
  - 모든 완료된 Phase 요약
  - API 엔드포인트 목록
  - 개발 서버 실행 방법
  - 문제 해결 가이드

- **[00_project_overview.md](00_project_overview.md)** - 프로젝트 전체 개요
  - 목표, 아키텍처, 기술 스택
  - Phase별 요약
  - 폴더 구조

---

### 📖 Phase별 상세 문서

#### ✅ Phase 1: PDF 변환 및 블록 검출 (완료)
- **[01_phase1_block_detection.md](01_phase1_block_detection.md)**
  - 개발 과정 상세 기록
  - 단순 Connected Components 방식 채택
  - 작은 기호 검출 최적화 (-, =, 지수)
  - **최종 결과: 914개 블록 검출 (정확도 99.9%)**

**최종 성과 (2025-11-17):**
- 검출 정확도: 99.9% (914/915)
- 작은 기호 검출: 157개 tiny symbols
- 알고리즘: 단순 Connected Components
- 설정: WHITE_THRESHOLD=200, MIN_BLOCK_SIZE=2

**주요 결정:**
- MultiscaleAnalyzer 비활성화 (과다 검출 문제)
- 단순하고 예측 가능한 방식 채택
- 환경 변수 오버라이드 강제 (`load_dotenv(override=True)`)

---

#### 🔨 Phase 2: GUI 구현 (진행 중)
- **[02_phase2_gui_plan.md](02_phase2_gui_plan.md)**
  - PySide6 기반 데스크톱 앱
  - ✅ UI 레이아웃 구현
  - ✅ 페이지 시각화 + 블록 표시
  - ⏳ PDF 열기 기능 구현 필요
  - ⏳ 페이지 네비게이션 완성 필요

**현재 상태:**
- [x] 기본 레이아웃 (3-panel)
- [x] 문서/페이지 리스트 패널
- [x] 중앙 캔버스 (이미지 + 블록 오버레이)
- [x] 줌 기능
- [x] 블록 검출 정확도 확보 (99.9%)
- [ ] PDF 열기 기능
- [ ] 페이지 네비게이션 버튼

---

#### 📅 Phase 3: 문제 그룹핑 기능 (진행 예정)
- **[03_phase3_grouping_plan.md](03_phase3_grouping_plan.md)**
  - 블록 선택/해제
  - 그룹 생성/수정/삭제
  - 자동 크롭 및 저장
  - 예상 기간: 1-2주

---

#### 💡 Phase 4: ML 모델 학습 (장기 계획)
- **[04_phase4_ml_plan.md](04_phase4_ml_plan.md)**
  - 자동 문제 그룹핑
  - 규칙 기반 → ML → 딥러닝
  - 재학습 파이프라인
  - 예상 기간: 수개월

---

### 📝 개발 기록

#### 개발 일지
- **[development_log.md](development_log.md)**
  - 날짜별 개발 활동
  - 의사결정 과정
  - 문제 및 해결 방법
  - 성과 기록

**최근 업데이트:** 2025-11-16 (Phase 1 완료)

---

#### 핵심 학습 내용
- **[lessons_learned.md](lessons_learned.md)**
  - 기술적 인사이트
  - 개발 방법론
  - 설계 패턴
  - 피해야 할 실수

**주요 교훈:**
- "추측 대신 측정하라"
- "진단 우선 접근"
- "점진적 개선"
- "시각화의 힘"

---

## 🔍 빠른 참조

### 프로젝트 상태 (2025-11-18 기준)
| Phase | 상태 | 진행률 | 문서 |
|-------|------|--------|------|
| Phase 1: 블록 검출 | ✅ 완료 | 100% | [01_phase1](01_phase1_block_detection.md) |
| Phase 2: FastAPI 백엔드 | ✅ 완료 | 100% | [08_current_project_status.md](08_current_project_status.md) |
| Phase 3: React 라벨링 UI | ✅ 완료 | 100% | [08_current_project_status.md](08_current_project_status.md) |
| Phase 4: 문제 내보내기 | ✅ 완료 | 100% | [08_current_project_status.md](08_current_project_status.md) |
| Phase 5: 문제은행 브라우저 | ✅ 완료 | 100% | [08_current_project_status.md](08_current_project_status.md) |
| Phase 6: Modern UI/UX | ✅ 완료 | 100% | [08_current_project_status.md](08_current_project_status.md) |
| Phase 7: 작업 관리 UI | ✅ 완료 | 100% | [08_current_project_status.md](08_current_project_status.md) |
| Phase 8: ML 자동 그룹핑 | 💡 계획 | 0% | [04_phase4](04_phase4_ml_plan.md) |

### 주요 수치 (Phase 1 최종)
- **검출 정확도:** 99.9% (914/915개)
- **작은 기호 검출:** 157개 tiny symbols
- **알고리즘:** 단순 Connected Components
- **설정:** WHITE_THRESHOLD=200, MIN_BLOCK_SIZE=2

---

## 📂 기타 문서

### 프로젝트 루트
- **[../CLAUDE.md](../CLAUDE.md)** - 프로젝트 가이드 (사용자 → Claude Code)
- **[../multiscale_detection_final_report.md](../multiscale_detection_final_report.md)** - Phase 1 최종 리포트

### 백업
- **[../plan_old_backup.md](../plan_old_backup.md)** - 이전 통합 plan.md (백업)

---

## 🚀 다음 단계

### 단기 (1-2주)
1. 해설 연결 기능 구현
2. 통계 페이지 구현
3. 설정 페이지 구현
4. 디버깅 로그 제거 (프로덕션 배포 전)

### 중기 (1개월)
1. 실제 백그라운드 작업 처리 (Celery + Redis)
2. WebSocket 실시간 업데이트
3. 폴더 일괄 업로드

### 장기 (3-6개월)
1. ML 자동 그룹핑
2. 사용자 인증 시스템
3. Docker 배포

---

## 📞 연락처

**개발자:** Claude Code
**프로젝트 관리:** 사용자 (비개발자)
**개발 방식:** AI 페어 프로그래밍

---

## 🔄 문서 업데이트 정책

### 업데이트 시점
- 새로운 Phase 시작 시
- 주요 마일스톤 달성 시
- 중요한 의사결정 시
- 문제 발견 및 해결 시

### 업데이트 담당
- Phase별 문서: 해당 Phase 개발 중 업데이트
- 개발 일지: 매 작업일 종료 시
- 학습 내용: Phase 완료 시 정리

---

**작성일:** 2025-11-16
**최종 업데이트:** 2025-11-18
**버전:** 2.0 (FastAPI + React 웹앱 완료)
