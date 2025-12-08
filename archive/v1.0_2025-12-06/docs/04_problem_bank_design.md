# 문제은행(Problem Bank) 시스템 설계 문서

**작성일**: 2025-01-17
**버전**: 1.0 (설계 단계)
**목적**: 문제+해설 매칭, 태깅, 문제은행 관리 기능 설계

---

## 📋 목차

1. [전체 아키텍처 개요](#1-전체-아키텍처-개요)
2. [모듈/레이어 구조](#2-모듈레이어-구조)
3. [UI/UX 설계 - 3가지 모드](#3-uiux-설계---3가지-모드)
4. [듀얼 캔버스 설계](#4-듀얼-캔버스-설계)
5. [데이터 모델 및 스키마](#5-데이터-모델-및-스키마)
6. [서비스 레이어 설계](#6-서비스-레이어-설계)
7. [작업 플로우](#7-작업-플로우)
8. [단계별 구현 로드맵](#8-단계별-구현-로드맵)
9. [실현가능성 평가](#9-실현가능성-평가)

---

## 1. 전체 아키텍처 개요

### 1.1 현재 시스템 (Phase 1-3)

```
[PDF 입력]
    ↓
[페이지 변환] → pages/*.png
    ↓
[블록 검출] → blocks/*.json
    ↓
[그룹핑 (수동)] → labels/*.json
    ↓
[Export] → problems/*.png
```

**현재 한계**:
- 문제 이미지만 저장, 해설 없음
- 메타데이터(난이도, 단원 등) 없음
- 문제 재활용/검색 불가능
- 문제와 해설의 연결 관계 없음

### 1.2 목표 시스템 (Phase 4+)

```
[문제 PDF + 해설 PDF 입력]
    ↓
[듀얼 캔버스 모드]
    ↓
[문제 그룹 ←→ 해설 영역 매칭]
    ↓
[메타데이터 태깅]
    ↓
[문제은행 레코드 생성]
    ↓
[검색/필터/재사용]
```

**새로운 가치**:
- 문제 + 해설을 하나의 단위로 관리
- 학년/과정/단원/난이도 등 체계적 분류
- 문제 검색 및 시험지 구성 기능 (향후)
- NAS 동기화로 학원 전체 공유

### 1.3 핵심 설계 원칙

1. **기존 데이터 보존**:
   - `blocks/*.json`, `labels/*.json`, `problems/*.png`는 그대로 유지
   - 문제은행은 **추가 레이어**로 설계

2. **점진적 마이그레이션**:
   - 기존 Export한 문제도 나중에 문제은행에 등록 가능
   - 새로운 문제부터는 처음부터 문제은행 워크플로우 사용

3. **비개발자 친화적**:
   - 3가지 명확한 모드 분리
   - 단계별 가이드 UI
   - 실수 방지 검증

4. **확장성**:
   - SQLite 기반으로 나중에 서버 DB 마이그레이션 가능
   - 플러그인 아키텍처로 OCR, 자동 태깅 추가 가능

---

## 2. 모듈/레이어 구조

### 2.1 레이어 아키텍처

```
┌─────────────────────────────────────────────────┐
│             GUI Layer (PySide6)                 │
│  - MainWindow (모드 전환)                        │
│  - LabelingModeWidget                           │
│  - TaggingModeWidget                            │
│  - BankViewModeWidget                           │
└─────────────────────────────────────────────────┘
                      ↓ signals/slots
┌─────────────────────────────────────────────────┐
│          Service Layer (비즈니스 로직)           │
│  - ProblemBankService                           │
│  - SolutionMatchingService                      │
│  - TaggingService                               │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│         Domain Layer (도메인 모델)               │
│  - ProblemRecord                                │
│  - SolutionRegion                               │
│  - ProblemMetadata                              │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│       Data Layer (영속성)                        │
│  - SQLite DB (problem_bank.db)                  │
│  - JSON 백업 (export 기능)                       │
│  - 이미지 파일 (problems/, solutions/)           │
└─────────────────────────────────────────────────┘
```

### 2.2 파일 구조

```
src/
├── gui/
│   ├── main_window.py              # 기존 (모드 전환 기능 추가)
│   ├── page_canvas.py              # 기존 (듀얼 캔버스 베이스)
│   ├── side_panels.py              # 기존
│   │
│   ├── dual_canvas_widget.py       # 신규: 문제+해설 듀얼 뷰
│   ├── solution_selector.py        # 신규: 해설 영역 선택 도구
│   ├── tagging_panel.py            # 신규: 메타데이터 입력 폼
│   ├── problem_card.py             # 신규: 문제 카드 위젯
│   ├── bank_view_widget.py         # 신규: 문제은행 조회 UI
│   └── filter_panel.py             # 신규: 검색/필터 UI
│
├── core/
│   ├── models.py                   # 신규: 도메인 모델 (dataclass)
│   ├── problem_bank_service.py     # 신규: 문제은행 CRUD
│   ├── solution_matcher.py         # 신규: 문제-해설 매칭 로직
│   └── tagging_service.py          # 신규: 태깅 검증/저장
│
├── data/
│   ├── database.py                 # 신규: SQLite 연결/초기화
│   ├── schema.sql                  # 신규: DB 스키마 정의
│   └── migrations/                 # 신규: 스키마 버전 관리
│
├── config.py                       # 기존 (DB 경로 추가)
├── pdf_pipeline.py                 # 기존
├── density_analyzer.py             # 기존
├── grouping.py                     # 기존
├── utils.py                        # 기존
└── main.py                         # 기존 (시작점)

dataset_root/
├── raw_pdfs/
├── documents/
│   └── {document_id}/
│       ├── pages/
│       ├── blocks/
│       ├── labels/
│       ├── problems/              # 기존
│       └── solutions/             # 신규: 해설 이미지
│
└── problem_bank/
    ├── problem_bank.db            # 신규: SQLite DB
    ├── backups/                   # 신규: JSON 백업
    └── exports/                   # 신규: CSV/JSON export
```

### 2.3 각 모듈의 책임

#### GUI Layer

| 모듈 | 책임 |
|------|------|
| `main_window.py` | 모드 전환, 전역 상태 관리, 메뉴바 |
| `dual_canvas_widget.py` | 좌우 캔버스 배치, 줌/스크롤 동기화 |
| `solution_selector.py` | 해설 페이지에서 드래그 영역 선택 |
| `tagging_panel.py` | 학년/과정/단원/난이도 등 폼 입력 |
| `problem_card.py` | 문제 썸네일 + 요약 정보 표시 |
| `bank_view_widget.py` | 문제 리스트 그리드/테이블 뷰 |
| `filter_panel.py` | 다중 필터 선택 UI |

#### Service Layer

| 모듈 | 책임 |
|------|------|
| `problem_bank_service.py` | 문제 CRUD, 검색, 필터링 |
| `solution_matcher.py` | 문제 그룹 ↔ 해설 영역 매칭 관리 |
| `tagging_service.py` | 메타데이터 검증, 기본값 제안 |

#### Domain Layer

| 모듈 | 책임 |
|------|------|
| `models.py` | `ProblemRecord`, `SolutionRegion`, `ProblemMetadata` 정의 |

#### Data Layer

| 모듈 | 책임 |
|------|------|
| `database.py` | SQLite 연결, 트랜잭션, 마이그레이션 |
| `schema.sql` | 테이블 정의 |

---

## 3. UI/UX 설계 - 3가지 모드

### 3.1 모드 전환 구조

**상단 모드 선택 버튼** (QToolBar):

```
┌────────────────────────────────────────────────┐
│ [📄 라벨링] [🏷️ 태깅] [🗄️ 문제은행] [⚙️ 설정] │
└────────────────────────────────────────────────┘
```

**내부 구현**: `QStackedWidget`을 사용하여 3가지 위젯 전환

```python
# 시그니처 (설계)
class MainWindow(QMainWindow):
    def __init__(self):
        self.mode_stack = QStackedWidget()
        self.labeling_widget = LabelingModeWidget()
        self.tagging_widget = TaggingModeWidget()
        self.bank_widget = BankViewModeWidget()

        self.mode_stack.addWidget(self.labeling_widget)  # index 0
        self.mode_stack.addWidget(self.tagging_widget)   # index 1
        self.mode_stack.addWidget(self.bank_widget)      # index 2

    def switch_to_labeling_mode(self):
        """라벨링 모드로 전환"""

    def switch_to_tagging_mode(self):
        """태깅 모드로 전환"""

    def switch_to_bank_mode(self):
        """문제은행 모드로 전환"""
```

### 3.2 모드 1: 페이지 라벨링 모드

**목적**: 기존 Phase 3 기능 + 해설 PDF 연동

**레이아웃** (ASCII):

```
┌─────────────────────────────────────────────────────────────┐
│  [📄 라벨링] [🏷️ 태깅] [🗄️ 문제은행]                          │
├─────────┬──────────────────────┬──────────────────────┬──────┤
│         │                      │                      │      │
│ 문서    │   문제 페이지         │   해설 페이지         │ 그룹 │
│ 리스트  │   (좌측 캔버스)       │   (우측 캔버스)       │ 목록 │
│         │                      │                      │      │
│ ├─Doc1  │  ┌──────────────┐   │  ┌──────────────┐   │ L1   │
│ ├─Doc2  │  │  [블록 1]    │   │  │              │   │ L2   │
│ └─Doc3  │  │  [블록 2]    │   │  │  해설 텍스트  │   │ R1   │
│         │  │  [블록 3]    │   │  │              │   │      │
│ 페이지  │  └──────────────┘   │  └──────────────┘   │      │
│ 0001 ✓  │                      │                      │      │
│ 0002 ○  │  페이지: 1/10        │  페이지: 1/8         │      │
│ 0003    │  [◀] [▶] [🔍]       │  [◀] [▶] [🔍]       │      │
└─────────┴──────────────────────┴──────────────────────┴──────┘
```

**위젯 구성**:

- 좌측: `LeftSidePanel` (기존, 문서/페이지 리스트)
- 중앙: `DualCanvasWidget` (신규, 좌우 캔버스)
  - 좌측 캔버스: 문제 페이지 + 블록/그룹 오버레이
  - 우측 캔버스: 해설 페이지 (읽기 전용, 선택 가능)
- 우측: `GroupListPanel` (기존)

**새 기능**:
1. 툴바에 "해설 PDF 열기" 버튼 추가
2. 해설 페이지 자동 매칭 (같은 페이지 번호)
3. 수동 페이지 선택 (SpinBox)

**시그널 흐름**:

```
[문제 그룹 선택]
    → signal: group_selected(group_id)
    → 좌측 캔버스: 해당 그룹 하이라이트
    → 우측 캔버스: 해설 영역 선택 모드 활성화
```

### 3.3 모드 2: 문제 태깅 모드

**목적**: 각 문제 그룹에 메타데이터 입력 + 해설 영역 매칭

**레이아웃**:

```
┌─────────────────────────────────────────────────────────────┐
│  [📄 라벨링] [🏷️ 태깅] [🗄️ 문제은행]                          │
├─────────┬──────────────────────┬──────────────────────────────┤
│         │                      │                              │
│ 문제    │   문제 미리보기       │   태깅 패널                   │
│ 목록    │                      │                              │
│         │  ┌──────────────┐   │  학년: [중1 ▼]               │
│ □ L1    │  │              │   │  과정: [대수 ▼]              │
│ ✓ L2    │  │   문제 L2    │   │  대단원: [일차방정식 ▼]      │
│ □ R1    │  │   이미지     │   │  난이도: ○하 ●중 ○상        │
│ □ R2    │  │              │   │  유형: [객관식 ▼]            │
│         │  └──────────────┘   │  출처: [베이직쎈 2022]       │
│ 진행률: │                      │                              │
│ 2/4     │  해설 미리보기        │  정답: [________________]    │
│         │  ┌──────────────┐   │                              │
│         │  │   [선택됨]   │   │  [이전] [저장+다음] [완료]   │
│         │  │   해설 영역   │   │                              │
│         │  └──────────────┘   │  자동 제안: ✓단원 분석       │
└─────────┴──────────────────────┴──────────────────────────────┘
```

**위젯 구성**:

- 좌측: `ProblemListWidget` (신규)
  - 체크박스 + 썸네일 + ID
  - 완료/미완료 표시

- 중앙: `ProblemPreviewWidget` (신규)
  - 상단: 문제 이미지 (확대 가능)
  - 하단: 해설 이미지 (영역 선택 도구)

- 우측: `TaggingPanel` (신규)
  - 드롭다운, 라디오 버튼, 텍스트 입력
  - 자동 완성 (기존 태그 제안)
  - 검증 (필수 필드 체크)

**작업 흐름**:

1. 좌측에서 문제 선택 (예: L2)
2. 중앙에 문제 이미지 표시
3. 해설 영역 선택:
   - [해설 선택] 버튼 클릭
   - 모달 다이얼로그로 해설 페이지 표시
   - 드래그로 영역 선택
   - [확인] → bbox 저장
4. 우측 패널에서 메타데이터 입력
5. [저장+다음] → 다음 문제로 자동 이동

**시그널 흐름**:

```
[문제 선택]
    → load_problem(problem_id)
    → 중앙 패널 업데이트
    → 우측 패널 로드 (기존 태그 또는 빈 폼)

[저장+다음]
    → validate_tags()
    → save_to_database()
    → select_next_problem()
```

### 3.4 모드 3: 문제은행 보기 모드

**목적**: 저장된 문제 검색/필터/조회

**레이아웃**:

```
┌─────────────────────────────────────────────────────────────┐
│  [📄 라벨링] [🏷️ 태깅] [🗄️ 문제은행]                          │
├─────────────────────────────────────────────────────────────┤
│  검색: [___________________] [🔍] [전체 초기화]              │
├─────────┬───────────────────────────────────────────────────┤
│ 필터    │   문제 그리드 (총 128문제)                         │
│         │                                                   │
│ 학년    │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               │
│ ☑중1    │  │ L1  │ │ L2  │ │ R1  │ │ R2  │               │
│ ☑중2    │  │[썸네일]│[썸네일]│[썸네일]│[썸네일]│             │
│ □중3    │  │중1-대수│중2-기하│중1-대수│중2-함수│             │
│         │  │난이도:중│난이도:상│난이도:하│난이도:중│           │
│ 과정    │  └─────┘ └─────┘ └─────┘ └─────┘               │
│ ☑대수   │                                                   │
│ □기하   │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               │
│         │  │ L3  │ │ L4  │ │ ...│ │ ...│                │
│ 난이도  │  │     │ │     │ │     │ │     │                │
│ ☑하     │  └─────┘ └─────┘ └─────┘ └─────┘               │
│ ☑중     │                                                   │
│ □상     │  [1] [2] [3] ... [13]  페이지네이션               │
│         │                                                   │
│ [검색]  │  [CSV Export] [JSON Export] [인쇄 미리보기]       │
└─────────┴───────────────────────────────────────────────────┘
```

**위젯 구성**:

- 상단: 검색바 (`QLineEdit` + 버튼)
- 좌측: `FilterPanel` (신규)
  - 체크박스 트리 (학년 → 과정 → 단원)
  - 난이도, 유형 필터
  - [검색] 버튼

- 중앙: `ProblemGridWidget` (신규)
  - `QScrollArea` + `FlowLayout` 또는 `QGridLayout`
  - 각 셀: `ProblemCard` 위젯
  - 페이지네이션 (10~20개씩)

- 하단: 액션 버튼 (Export, 인쇄 등)

**카드 위젯 (`ProblemCard`) 구조**:

```
┌──────────────┐
│  [썸네일]    │
├──────────────┤
│ ID: P-00123  │
│ 중2 | 대수   │
│ 일차방정식   │
│ 난이도: 중   │
│ 정답: ③     │
└──────────────┘
```

**더블클릭 시**:
- 상세 보기 다이얼로그
- 문제 이미지 + 해설 이미지 + 전체 메타데이터
- [편집] [삭제] 버튼

**시그널 흐름**:

```
[필터 변경]
    → update_filter()
    → query_database()
    → refresh_grid()

[카드 더블클릭]
    → show_problem_detail_dialog(problem_id)
```

---

## 4. 듀얼 캔버스 설계

### 4.1 기술 스택 선택

**베이스 위젯**: `QGraphicsView` + `QGraphicsScene`

**이유**:
- 줌/스크롤 내장 지원
- 오버레이 도형(bbox) 쉽게 추가 가능
- 마우스 이벤트 세밀 제어
- 기존 `PageCanvas`도 동일 구조

### 4.2 클래스 설계

#### `DualCanvasWidget` (컨테이너)

```
┌──────────────────────────────────────────────┐
│  DualCanvasWidget (QSplitter)                │
│  ┌──────────────┬───────────────────────┐   │
│  │ 문제 캔버스  │  해설 캔버스          │   │
│  │ (좌측)      │  (우측)               │   │
│  └──────────────┴───────────────────────┘   │
│  [해설 페이지: 스핀박스] [동기화 ☑]         │
└──────────────────────────────────────────────┘
```

**시그니처**:

```python
class DualCanvasWidget(QWidget):
    """문제 + 해설 듀얼 캔버스"""

    # Signals
    problem_bbox_selected = Signal(list)  # [x, y, w, h]
    solution_bbox_selected = Signal(list)

    def __init__(self):
        self.splitter = QSplitter(Qt.Horizontal)
        self.problem_canvas = ProblemCanvas()
        self.solution_canvas = SolutionCanvas()

    def load_problem_page(self, image_path: Path, blocks_path: Path):
        """문제 페이지 로드"""

    def load_solution_page(self, image_path: Path):
        """해설 페이지 로드"""

    def sync_zoom(self, enabled: bool):
        """줌 동기화 토글"""

    def sync_scroll(self, enabled: bool):
        """스크롤 동기화 토글"""
```

#### `ProblemCanvas` (좌측)

**역할**: 기존 `PageCanvas`와 유사, 블록 표시 + 그룹 하이라이트

```python
class ProblemCanvas(QGraphicsView):
    """문제 페이지 캔버스 (블록 오버레이 포함)"""

    block_clicked = Signal(int)
    group_highlighted = Signal(str)

    def __init__(self):
        self.scene = QGraphicsScene()
        self.setScene(self.scene)

    def draw_blocks(self, blocks: List[Block]):
        """블록 bbox 그리기"""

    def highlight_group(self, group_id: str, blocks: List[int]):
        """특정 그룹 강조 표시"""
```

#### `SolutionCanvas` (우측)

**역할**: 해설 페이지 표시 + 영역 선택 도구

```python
class SolutionCanvas(QGraphicsView):
    """해설 페이지 캔버스 (영역 선택 가능)"""

    region_selected = Signal(tuple)  # (x, y, w, h)

    def __init__(self):
        self.scene = QGraphicsScene()
        self.selection_mode = False
        self.selection_rect = None

    def enable_selection_mode(self):
        """영역 선택 모드 활성화"""

    def mousePressEvent(self, event):
        """드래그 시작"""

    def mouseMoveEvent(self, event):
        """드래그 중 사각형 그리기"""

    def mouseReleaseEvent(self, event):
        """드래그 완료 → 시그널 발생"""

    def draw_existing_region(self, bbox: tuple):
        """기존 해설 영역 표시 (노란색 테두리)"""
```

### 4.3 상호작용 시나리오

#### 시나리오 1: 문제 그룹 선택 시

```
[사용자] 우측 패널에서 "L1" 그룹 클릭
    ↓
[MainWindow] group_selected("L1") 시그널 수신
    ↓
[ProblemCanvas] highlight_group("L1", block_ids=[1,2,3])
    → 해당 블록들을 노란색 하이라이트
    ↓
[SolutionCanvas] enable_selection_mode()
    → 커서가 십자선으로 변경
    → 안내 메시지 표시: "해설 영역을 드래그하세요"
```

#### 시나리오 2: 해설 영역 선택

```
[사용자] 우측 캔버스에서 드래그
    ↓
[SolutionCanvas] mousePressEvent → 시작점 저장
    ↓
[SolutionCanvas] mouseMoveEvent → 임시 사각형 그리기
    ↓
[SolutionCanvas] mouseReleaseEvent
    → bbox 계산
    → region_selected(x, y, w, h) 시그널 발생
    ↓
[TaggingPanel] 해설 영역 저장
    → solution_bbox 필드 업데이트
    → 미리보기 썸네일 생성
```

#### 시나리오 3: 줌 동기화

```
[사용자] "동기화" 체크박스 ON
    ↓
[DualCanvasWidget] sync_zoom(True)
    ↓
[ProblemCanvas] wheel 이벤트 발생
    → scale_factor 계산
    → zoom_changed(scale_factor) 시그널
    ↓
[DualCanvasWidget] 시그널 수신
    → solution_canvas.setTransform(동일 스케일)
```

### 4.4 페이지 매칭 전략

#### 기본 전략: 1:1 매칭

- 문제 페이지 N → 해설 페이지 N

#### 예외 처리: 수동 선택

**UI**:

```
해설 페이지: [3 ▼]  (SpinBox)
```

**시그니처**:

```python
class DualCanvasWidget:
    def set_solution_page_manual(self, page_index: int):
        """해설 페이지 수동 선택"""
        self.load_solution_page(
            self.solution_pdf_pages[page_index]
        )
```

#### 저장 구조 (JSON):

```json
{
  "document_id": "basic2022",
  "problem_page": 3,
  "solution_page": 5,  // 다를 수 있음
  "groups": [
    {
      "id": "L1",
      "block_ids": [1, 2],
      "solution_bbox": [100, 200, 400, 300]
    }
  ]
}
```

---

## 5. 데이터 모델 및 스키마

### 5.1 저장 방식 비교

| 방식 | 장점 | 단점 | 적합성 |
|------|------|------|--------|
| **JSON** | - 단순<br>- 버전 관리 용이<br>- 백업 쉬움 | - 검색 느림<br>- 동시 쓰기 불가<br>- 인덱싱 없음 | △ 소규모 (100개 이하) |
| **CSV** | - 엑셀 호환<br>- 단순 | - 중첩 데이터 불가<br>- 이미지 경로만 저장 | △ Export 용도만 |
| **SQLite** | - SQL 쿼리<br>- 인덱싱<br>- 트랜잭션<br>- 확장 용이 | - 초기 설정 복잡 | ✅ **추천** |

**결론**: **SQLite** 사용

**이유**:
1. 학원에서 수백~수천 문제 관리 예상
2. 복잡한 필터링 필요 (학년 AND 단원 AND 난이도)
3. 나중에 서버 DB로 마이그레이션 가능
4. Python `sqlite3` 모듈 기본 제공

### 5.2 데이터베이스 스키마

#### 테이블 1: `problems`

```sql
CREATE TABLE problems (
    -- PK
    problem_id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- 파일 경로
    image_path TEXT NOT NULL,              -- problems/*.png
    solution_image_path TEXT,              -- solutions/*.png (nullable)

    -- 메타데이터
    grade TEXT NOT NULL,                   -- 중1, 중2, 중3, 고1, ...
    course TEXT NOT NULL,                  -- 대수, 기하, 확률과통계, ...
    unit_big TEXT NOT NULL,                -- 일차방정식, 이차함수, ...
    unit_small TEXT,                       -- 소단원 (nullable)
    difficulty TEXT NOT NULL,              -- 하, 중, 상
    item_type TEXT NOT NULL,               -- 객관식, 단답형, 서술형
    source TEXT NOT NULL,                  -- 베이직쎈 2022, 개념쎈 2023, ...
    answer_text TEXT,                      -- 정답 (nullable)

    -- 원본 추적
    origin_document_id TEXT NOT NULL,      -- document_id
    origin_page_index INTEGER NOT NULL,    -- page_index
    origin_group_id TEXT NOT NULL,         -- L1, R2, ...

    -- 해설 매칭 정보
    solution_document_id TEXT,             -- 해설 PDF document_id
    solution_page_index INTEGER,           -- 해설 페이지 번호
    solution_bbox TEXT,                    -- JSON: [x, y, w, h]

    -- 메타
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT 0,          -- Soft delete

    -- 인덱스
    UNIQUE(origin_document_id, origin_page_index, origin_group_id)
);

-- 인덱스 생성
CREATE INDEX idx_grade ON problems(grade);
CREATE INDEX idx_course ON problems(course);
CREATE INDEX idx_unit_big ON problems(unit_big);
CREATE INDEX idx_difficulty ON problems(difficulty);
CREATE INDEX idx_source ON problems(source);
CREATE INDEX idx_origin ON problems(origin_document_id, origin_page_index);
```

#### 테이블 2: `tags` (다대다 관계, 향후 확장용)

```sql
CREATE TABLE tags (
    tag_id INTEGER PRIMARY KEY AUTOINCREMENT,
    tag_name TEXT UNIQUE NOT NULL,         -- "연립방정식", "대입법", ...
    tag_category TEXT,                     -- "개념", "유형", "키워드"
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE problem_tags (
    problem_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (problem_id, tag_id),
    FOREIGN KEY (problem_id) REFERENCES problems(problem_id),
    FOREIGN KEY (tag_id) REFERENCES tags(tag_id)
);
```

#### 테이블 3: `exports` (Export 이력 추적, 선택)

```sql
CREATE TABLE exports (
    export_id INTEGER PRIMARY KEY AUTOINCREMENT,
    export_type TEXT NOT NULL,             -- CSV, JSON, PDF
    file_path TEXT NOT NULL,
    problem_count INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 5.3 도메인 모델 (Python Dataclass)

#### `ProblemRecord`

```python
@dataclass
class ProblemRecord:
    """문제 단위 레코드"""

    # PK
    problem_id: Optional[int] = None

    # 파일
    image_path: Path
    solution_image_path: Optional[Path] = None

    # 메타데이터
    grade: str              # "중1", "중2", ...
    course: str             # "대수", "기하", ...
    unit_big: str           # "일차방정식"
    unit_small: Optional[str] = None
    difficulty: str         # "하", "중", "상"
    item_type: str          # "객관식", "단답형", "서술형"
    source: str             # "베이직쎈 2022"
    answer_text: Optional[str] = None

    # 원본 추적
    origin_document_id: str
    origin_page_index: int
    origin_group_id: str    # "L1", "R2"

    # 해설
    solution_document_id: Optional[str] = None
    solution_page_index: Optional[int] = None
    solution_bbox: Optional[Tuple[int, int, int, int]] = None

    # 메타
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    is_deleted: bool = False

    def to_dict(self) -> dict:
        """DB 삽입용 딕셔너리 변환"""

    @classmethod
    def from_dict(cls, data: dict) -> 'ProblemRecord':
        """DB 로드용"""
```

#### `ProblemMetadata` (태깅 폼용)

```python
@dataclass
class ProblemMetadata:
    """태깅 폼 데이터"""
    grade: str
    course: str
    unit_big: str
    unit_small: Optional[str] = None
    difficulty: str
    item_type: str
    source: str
    answer_text: Optional[str] = None

    def validate(self) -> List[str]:
        """필수 필드 검증, 에러 메시지 리스트 반환"""
        errors = []
        if not self.grade:
            errors.append("학년을 선택해주세요")
        # ...
        return errors
```

#### `SolutionRegion`

```python
@dataclass
class SolutionRegion:
    """해설 영역 정보"""
    document_id: str        # 해설 PDF
    page_index: int
    bbox: Tuple[int, int, int, int]  # (x, y, w, h)

    def crop_image(self, full_page_image: np.ndarray) -> np.ndarray:
        """해설 영역만 크롭"""
```

### 5.4 예시 레코드

```python
problem = ProblemRecord(
    problem_id=123,
    image_path=Path("dataset_root/documents/basic2022/problems/page_0003_L1.png"),
    solution_image_path=Path("dataset_root/documents/basic2022/solutions/page_0005_L1.png"),

    grade="중2",
    course="대수",
    unit_big="일차방정식",
    difficulty="중",
    item_type="객관식",
    source="베이직쎈 수학2 2022",
    answer_text="③",

    origin_document_id="basic2022",
    origin_page_index=3,
    origin_group_id="L1",

    solution_document_id="basic2022_sol",
    solution_page_index=5,
    solution_bbox=(120, 250, 800, 600),

    created_at=datetime.now()
)
```

---

## 6. 서비스 레이어 설계

### 6.1 `ProblemBankService`

**파일**: `src/core/problem_bank_service.py`

**역할**: 문제은행 CRUD 및 검색

**메서드 시그니처**:

```python
class ProblemBankService:
    """문제은행 비즈니스 로직"""

    def __init__(self, db_path: Path):
        """
        Args:
            db_path: problem_bank.db 경로
        """
        self.db = Database(db_path)

    def create_problem(self, record: ProblemRecord) -> int:
        """
        새 문제 등록

        Args:
            record: ProblemRecord 객체

        Returns:
            problem_id (새로 생성된 ID)

        Raises:
            ValueError: 필수 필드 누락
            DuplicateError: 동일 origin 중복
        """

    def update_problem(self, problem_id: int, record: ProblemRecord):
        """
        기존 문제 수정

        Args:
            problem_id: 수정할 문제 ID
            record: 수정할 데이터

        Raises:
            NotFoundError: 문제 없음
        """

    def delete_problem(self, problem_id: int, soft: bool = True):
        """
        문제 삭제

        Args:
            problem_id: 삭제할 문제 ID
            soft: True면 is_deleted=1, False면 완전 삭제
        """

    def get_problem(self, problem_id: int) -> Optional[ProblemRecord]:
        """
        문제 1개 조회

        Args:
            problem_id: 문제 ID

        Returns:
            ProblemRecord 또는 None
        """

    def search_problems(
        self,
        grade: Optional[str] = None,
        course: Optional[str] = None,
        unit_big: Optional[str] = None,
        difficulty: Optional[str] = None,
        item_type: Optional[str] = None,
        source: Optional[str] = None,
        keyword: Optional[str] = None,
        offset: int = 0,
        limit: int = 20
    ) -> Tuple[List[ProblemRecord], int]:
        """
        문제 검색 (필터 + 페이지네이션)

        Args:
            grade, course, ...: 필터 조건 (None이면 무시)
            keyword: 정답 텍스트 검색
            offset: 시작 인덱스
            limit: 결과 개수

        Returns:
            (문제 리스트, 전체 개수)
        """

    def list_all_problems(self) -> List[ProblemRecord]:
        """전체 문제 조회 (삭제 제외)"""

    def get_statistics(self) -> dict:
        """
        통계 정보

        Returns:
            {
                "total": 128,
                "by_grade": {"중1": 40, "중2": 50, ...},
                "by_difficulty": {"하": 30, "중": 60, "상": 38},
                ...
            }
        """

    def export_to_csv(self, file_path: Path, problem_ids: Optional[List[int]] = None):
        """
        CSV로 Export

        Args:
            file_path: 저장 경로
            problem_ids: None이면 전체, 리스트면 해당 문제만
        """

    def export_to_json(self, file_path: Path, problem_ids: Optional[List[int]] = None):
        """JSON으로 Export"""

    def backup_database(self, backup_path: Path):
        """DB 백업"""
```

### 6.2 `SolutionMatchingService`

**파일**: `src/core/solution_matcher.py`

**역할**: 문제-해설 매칭 관리

**메서드 시그니처**:

```python
class SolutionMatchingService:
    """문제-해설 매칭 로직"""

    def match_solution(
        self,
        problem_group_id: str,
        solution_document_id: str,
        solution_page_index: int,
        solution_bbox: Tuple[int, int, int, int]
    ) -> SolutionRegion:
        """
        해설 영역 매칭

        Args:
            problem_group_id: 문제 그룹 ID (L1, R2, ...)
            solution_document_id: 해설 PDF document_id
            solution_page_index: 해설 페이지 번호
            solution_bbox: (x, y, w, h)

        Returns:
            SolutionRegion 객체
        """

    def crop_solution_image(
        self,
        solution_page_image: np.ndarray,
        bbox: Tuple[int, int, int, int],
        output_path: Path
    ):
        """
        해설 영역 크롭 및 저장

        Args:
            solution_page_image: 전체 해설 페이지 이미지
            bbox: (x, y, w, h)
            output_path: 저장 경로 (solutions/*.png)
        """

    def validate_bbox(
        self,
        bbox: Tuple[int, int, int, int],
        page_width: int,
        page_height: int
    ) -> bool:
        """
        bbox 유효성 검증

        Returns:
            True if valid
        """
```

### 6.3 `TaggingService`

**파일**: `src/core/tagging_service.py`

**역할**: 태깅 자동 완성 및 검증

**메서드 시그니처**:

```python
class TaggingService:
    """태깅 보조 기능"""

    def __init__(self, db_service: ProblemBankService):
        self.db = db_service

    def suggest_tags_from_source(self, source: str) -> ProblemMetadata:
        """
        출처 기반 태그 제안

        예: "베이직쎈 수학2 2022" → grade="중2", course="대수"

        Args:
            source: 교재명

        Returns:
            부분적으로 채워진 ProblemMetadata
        """

    def get_unique_values(self, field: str) -> List[str]:
        """
        특정 필드의 고유값 조회 (자동 완성용)

        Args:
            field: "grade", "course", "unit_big", ...

        Returns:
            기존 사용된 값 리스트 (중복 제거)
        """

    def validate_metadata(self, metadata: ProblemMetadata) -> List[str]:
        """
        메타데이터 검증

        Returns:
            에러 메시지 리스트 (빈 리스트면 OK)
        """

    def auto_detect_difficulty(self, problem_image: np.ndarray) -> str:
        """
        [향후 확장] 이미지 기반 난이도 자동 분류

        현재는 NotImplementedError
        """
        raise NotImplementedError("향후 ML 모델 연동 예정")
```

---

## 7. 작업 플로우

### 7.1 전체 플로우 다이어그램

```
┌─────────────────────────────────────────────────────┐
│ 1. PDF 준비                                          │
│    - 문제 PDF                                        │
│    - 해설 PDF (선택)                                 │
└──────────────────┬──────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────┐
│ 2. [라벨링 모드] 문제 그룹 생성                       │
│    - PDF → 페이지 → 블록 검출 (기존)                │
│    - 블록 → 그룹핑 (L1, L2, R1, ...) (기존)         │
│    - Export → problems/*.png (기존)                  │
└──────────────────┬──────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────┐
│ 3. [태깅 모드] 문제별 메타데이터 입력                 │
│    For each 그룹 (L1, L2, ...):                     │
│      3-1. 문제 선택                                  │
│      3-2. 해설 영역 선택 (드래그)                    │
│      3-3. 메타데이터 입력 (학년/과정/난이도/...)     │
│      3-4. [저장+다음] 클릭                           │
│           → ProblemRecord 생성                       │
│           → DB INSERT                                │
└──────────────────┬──────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────┐
│ 4. [문제은행 모드] 문제 조회/관리                     │
│    - 필터링 (학년, 단원, 난이도)                     │
│    - 검색 (키워드)                                   │
│    - Export (CSV, JSON)                              │
│    - 상세 보기/수정/삭제                             │
└─────────────────────────────────────────────────────┘
```

### 7.2 상세 워크플로우

#### 워크플로우 1: 문제 그룹 생성 (기존 Phase 3)

```
[사용자] "Open PDF" 버튼 클릭
    ↓
[MainWindow] PDF 파일 선택 다이얼로그
    ↓
[PDFPipeline] PDF → 페이지 PNG 변환
    ↓
[DensityAnalyzer] 블록 검출
    ↓
[PageCanvas] 블록 오버레이 표시
    ↓
[사용자] 블록 선택 + "새 그룹 만들기"
    ↓
[GroupingManager] 그룹 생성 (L1, L2, ...)
    ↓
[MainWindow] labels/*.json 저장
    ↓
[사용자] "Export" 클릭
    ↓
[GroupingManager] problems/*.png 저장
```

**변경사항**: 없음 (기존 유지)

#### 워크플로우 2: 해설 PDF 추가 (신규)

```
[사용자] [라벨링 모드]에서 "해설 PDF 열기" 클릭
    ↓
[MainWindow] 해설 PDF 선택 다이얼로그
    ↓
[PDFPipeline] 해설 PDF → 페이지 PNG 변환
    → 저장 경로: documents/{doc_id}_solution/pages/
    ↓
[DualCanvasWidget] 우측 캔버스 활성화
    ↓
[SolutionCanvas] 해설 페이지 표시
```

**저장 구조**:

```
documents/
├── basic2022/              # 문제 PDF
│   ├── pages/
│   ├── blocks/
│   ├── labels/
│   └── problems/
│
└── basic2022_solution/     # 해설 PDF
    └── pages/
```

#### 워크플로우 3: 문제 태깅 (신규, 핵심)

```
[사용자] 상단에서 [🏷️ 태깅] 모드 클릭
    ↓
[MainWindow] switch_to_tagging_mode()
    → 현재 문서의 그룹 목록 로드
    ↓
[TaggingModeWidget] 좌측에 문제 리스트 표시
    - L1 (미완료)
    - L2 (미완료)
    - R1 (미완료)
    ↓
[사용자] L1 클릭
    ↓
[ProblemPreviewWidget] 문제 이미지 로드
    → documents/basic2022/problems/page_0003_L1.png
    ↓
[TaggingPanel] 빈 폼 표시
    ↓
[사용자] "해설 선택" 버튼 클릭
    ↓
[SolutionSelectorDialog] 모달 다이얼로그 표시
    - 해설 페이지 이미지 표시
    - 드래그 도구 활성화
    ↓
[사용자] 드래그로 영역 선택
    ↓
[SolutionSelectorDialog] bbox 저장
    → (120, 250, 800, 600)
    ↓
[사용자] [확인] 클릭
    ↓
[TaggingPanel] 해설 영역 미리보기 표시
    ↓
[사용자] 메타데이터 입력
    - 학년: 중2
    - 과정: 대수
    - 대단원: 일차방정식
    - 난이도: 중
    - 유형: 객관식
    - 출처: 베이직쎈 2022
    - 정답: ③
    ↓
[사용자] [저장+다음] 클릭
    ↓
[TaggingService] validate_metadata()
    → 필수 필드 검증
    ↓ (OK)
[SolutionMatchingService] crop_solution_image()
    → solutions/page_0005_L1.png 저장
    ↓
[ProblemBankService] create_problem()
    → ProblemRecord 생성
    → DB INSERT
    → problem_id = 123 반환
    ↓
[TaggingModeWidget] 좌측 리스트 업데이트
    - L1 (✓ 완료)
    - L2 (미완료) ← 자동 선택
    ↓
(L2 반복...)
```

**에러 처리**:

```
[검증 실패]
    → [TaggingPanel] 에러 메시지 표시
    → "학년을 선택해주세요"
    → 저장 중단

[해설 영역 미선택]
    → 경고 메시지: "해설 영역을 선택하거나 '해설 없음' 체크"
    → 저장 허용 (solution_bbox = NULL)

[중복 문제]
    → DB UNIQUE 제약 위반
    → "이미 등록된 문제입니다 (document: basic2022, page: 3, group: L1)"
    → [덮어쓰기] [취소] 선택
```

#### 워크플로우 4: 문제은행 조회

```
[사용자] 상단에서 [🗄️ 문제은행] 모드 클릭
    ↓
[MainWindow] switch_to_bank_mode()
    ↓
[BankViewModeWidget] 초기 로드
    → search_problems(limit=20, offset=0)
    → 최신 20개 표시
    ↓
[사용자] 필터 선택
    - 학년: 중2 ✓
    - 과정: 대수 ✓
    - 난이도: 중 ✓
    ↓
[사용자] [검색] 클릭
    ↓
[FilterPanel] filter_changed 시그널
    ↓
[BankViewModeWidget] search_problems(
    grade="중2",
    course="대수",
    difficulty="중"
)
    → 결과: 42개
    ↓
[ProblemGridWidget] 카드 20개 표시 (페이지 1/3)
    ↓
[사용자] 카드 더블클릭
    ↓
[ProblemDetailDialog] 모달 다이얼로그 표시
    - 문제 이미지 (확대)
    - 해설 이미지
    - 전체 메타데이터
    - [편집] [삭제] 버튼
```

---

## 8. 단계별 구현 로드맵

### Phase 4: 듀얼 캔버스 기반 구축 (1주)

**목표**: 문제+해설 동시 보기 기능

#### Step 4.1: 모드 전환 골격

- `main_window.py`에 `QStackedWidget` 추가
- 상단 모드 버튼 (라벨링/태깅/문제은행)
- 빈 위젯 3개 배치

**예상 시간**: 2시간
**테스트**: 모드 전환 시 화면 전환 확인

#### Step 4.2: 듀얼 캔버스 위젯

- `dual_canvas_widget.py` 생성
- `ProblemCanvas` (기존 `PageCanvas` 복사)
- `SolutionCanvas` (새로 생성)
- 좌우 `QSplitter` 배치

**예상 시간**: 4시간
**테스트**: 문제/해설 이미지 동시 표시

#### Step 4.3: 해설 PDF 로딩

- "해설 PDF 열기" 버튼
- `PDFPipeline` 재사용하여 페이지 변환
- `documents/{doc_id}_solution/pages/` 저장

**예상 시간**: 2시간
**테스트**: 해설 PDF 열면 우측 캔버스에 표시

#### Step 4.4: 줌/스크롤 동기화

- "동기화" 체크박스
- `wheel` 이벤트 연결
- `scrollbar` 동기화

**예상 시간**: 3시간
**테스트**: 좌측 줌 → 우측도 동일 줌

---

### Phase 5: 해설 영역 선택 (3일)

**목표**: 드래그로 해설 영역 선택 + 크롭

#### Step 5.1: 드래그 선택 도구

- `SolutionCanvas`에 마우스 이벤트 구현
- `mousePressEvent`, `mouseMoveEvent`, `mouseReleaseEvent`
- 임시 사각형 그리기

**예상 시간**: 4시간
**테스트**: 드래그 시 노란 사각형 표시

#### Step 5.2: bbox 저장 및 표시

- `region_selected(bbox)` 시그널
- `labels/*.json`에 `solution_bbox` 필드 추가
- 기존 영역 노란 테두리로 표시

**예상 시간**: 3시간
**테스트**: 저장 후 재로드 시 영역 표시

#### Step 5.3: 해설 이미지 크롭

- `SolutionMatchingService.crop_solution_image()`
- `solutions/` 폴더 생성
- `imwrite_unicode` 사용

**예상 시간**: 2시간
**테스트**: `solutions/*.png` 파일 생성 확인

---

### Phase 6: 문제은행 DB 구축 (5일)

**목표**: SQLite 스키마 + CRUD

#### Step 6.1: 스키마 생성

- `data/schema.sql` 작성
- `database.py` 초기화 코드
- `problem_bank.db` 생성

**예상 시간**: 3시간
**테스트**: DB 파일 생성, 테이블 확인

#### Step 6.2: 도메인 모델

- `core/models.py`에 `ProblemRecord` dataclass
- `to_dict()`, `from_dict()` 메서드

**예상 시간**: 2시간
**테스트**: 단위 테스트 (pytest)

#### Step 6.3: ProblemBankService

- `create_problem()` 구현
- `get_problem()` 구현
- `update_problem()` 구현
- `delete_problem()` 구현

**예상 시간**: 6시간
**테스트**: CRUD 테스트 (pytest)

#### Step 6.4: 검색/필터 기능

- `search_problems()` SQL 쿼리 구현
- 동적 WHERE 절 생성
- 페이지네이션 (LIMIT/OFFSET)

**예상 시간**: 5시간
**테스트**: 다양한 필터 조합 테스트

---

### Phase 7: 태깅 모드 UI (1주)

**목표**: 문제별 메타데이터 입력 화면

#### Step 7.1: 태깅 패널 레이아웃

- `tagging_panel.py` 생성
- 드롭다운, 라디오 버튼 배치
- 폼 레이아웃

**예상 시간**: 4시간
**테스트**: 빈 폼 표시

#### Step 7.2: 자동 완성

- `TaggingService.get_unique_values()`
- `QCompleter` 연동
- 드롭다운에 기존 값 표시

**예상 시간**: 3시간
**테스트**: 타이핑 시 자동 완성

#### Step 7.3: 검증 및 저장

- "저장+다음" 버튼
- `validate_metadata()`
- `create_problem()` 호출
- 다음 문제 자동 선택

**예상 시간**: 5시간
**테스트**: 저장 → DB 확인

#### Step 7.4: 문제 리스트 패널

- 좌측 `ProblemListWidget`
- 체크박스 + 썸네일
- 완료/미완료 표시

**예상 시간**: 4시간
**테스트**: 리스트 클릭 시 우측 업데이트

---

### Phase 8: 문제은행 뷰 (1주)

**목표**: 검색/필터/조회 화면

#### Step 8.1: 필터 패널

- `filter_panel.py` 생성
- 체크박스 트리 (학년 → 과정 → 단원)
- [검색] 버튼

**예상 시간**: 5시간
**테스트**: 필터 선택 시 시그널 발생

#### Step 8.2: 문제 그리드

- `problem_grid_widget.py`
- `FlowLayout` 또는 `QGridLayout`
- `ProblemCard` 위젯 배치

**예상 시간**: 6시간
**테스트**: 카드 20개 표시

#### Step 8.3: 페이지네이션

- 하단 페이지 버튼
- `offset` 계산
- 페이지 전환

**예상 시간**: 3시간
**테스트**: 페이지 이동 시 데이터 로드

#### Step 8.4: 상세 보기 다이얼로그

- `ProblemDetailDialog`
- 문제+해설 이미지 표시
- [편집] [삭제] 버튼

**예상 시간**: 4시간
**테스트**: 더블클릭 시 다이얼로그 표시

---

### Phase 9: Export 및 백업 (2일)

**목표**: CSV/JSON export, DB 백업

#### Step 9.1: CSV Export

- `export_to_csv()` 구현
- `QFileDialog` 저장 경로
- pandas 사용 (선택)

**예상 시간**: 3시간
**테스트**: CSV 파일 생성 확인

#### Step 9.2: JSON Export

- `export_to_json()` 구현
- 중첩 구조 (이미지 base64 인코딩?)

**예상 시간**: 2시간
**테스트**: JSON 파일 생성

#### Step 9.3: DB 백업

- `backup_database()`
- SQLite `.backup` 명령 또는 파일 복사
- 자동 백업 (일주일마다)

**예상 시간**: 2시간
**테스트**: 백업 파일 복원 가능

---

### Phase 10: 통합 테스트 및 UX 개선 (1주)

**목표**: 전체 워크플로우 테스트, 버그 수정

#### Step 10.1: 전체 워크플로우 테스트

- PDF → 라벨링 → 태깅 → 문제은행
- 50문제 등록 테스트
- 성능 측정 (검색 속도)

**예상 시간**: 1일

#### Step 10.2: UX 개선

- 키보드 단축키 추가 (Ctrl+S 저장 등)
- 진행률 표시
- 에러 메시지 개선

**예상 시간**: 2일

#### Step 10.3: 문서 작성

- 사용자 가이드 (비개발자용)
- 스크린샷 포함
- 트러블슈팅

**예상 시간**: 1일

---

## 9. 실현가능성 평가

### 9.1 기술적 실현가능성: ★★★★★ (5/5)

**근거**:

1. **기존 코드 재사용**:
   - `PageCanvas` → `ProblemCanvas` 거의 그대로 사용
   - `GroupingManager` 로직 재활용
   - `PDFPipeline` 그대로 사용

2. **검증된 기술 스택**:
   - PySide6: 안정적인 Qt 바인딩
   - SQLite: Python 기본 제공, 검증됨
   - OpenCV: 이미지 처리 이미 사용 중

3. **점진적 확장**:
   - Phase 4~10으로 단계 분리
   - 각 단계 독립적으로 테스트 가능
   - 실패해도 이전 단계로 롤백 가능

4. **복잡도 관리**:
   - 레이어 아키텍처로 관심사 분리
   - 각 클래스 단일 책임
   - 테스트 가능한 구조

### 9.2 UX 실현가능성: ★★★★☆ (4/5)

**장점**:

1. **명확한 모드 분리**:
   - 라벨링 / 태깅 / 문제은행
   - 각 모드 목적 뚜렷함
   - 혼란 최소화

2. **직관적 워크플로우**:
   - 1→2→3 순차적 진행
   - 진행률 표시로 현재 위치 파악
   - "저장+다음"으로 빠른 작업

3. **비개발자 친화**:
   - 드래그앤드롭
   - 드롭다운/라디오 버튼
   - 자동 완성

**우려사항**:

1. **학습 곡선**:
   - 처음 사용자는 "왜 3개 모드?"라고 혼란 가능
   - **해결책**: 온보딩 튜토리얼, 툴팁

2. **반복 작업 피로도**:
   - 100문제 태깅 시 지루함
   - **해결책**: 키보드 단축키, 일괄 적용 기능

### 9.3 데이터 구조 실현가능성: ★★★★★ (5/5)

**강점**:

1. **정규화된 스키마**:
   - 중복 최소화
   - 인덱스로 검색 최적화
   - 확장 용이 (tags 테이블)

2. **하위 호환성**:
   - 기존 `blocks/*.json`, `labels/*.json` 보존
   - 문제은행은 추가 레이어

3. **백업 전략**:
   - SQLite 백업 쉬움
   - JSON export로 이중 백업
   - NAS 동기화

**잠재 리스크**:

1. **동시 쓰기**:
   - SQLite는 단일 쓰기만 지원
   - **현재 문제 없음** (데스크톱 앱, 1명 사용)
   - 나중에 서버 DB로 확장 시 고려

### 9.4 개발 일정 실현가능성: ★★★★☆ (4/5)

**예상 총 개발 시간**: 3~4주 (1명 풀타임 기준)

**단계별 시간**:

| Phase | 예상 시간 | 비고 |
|-------|----------|------|
| Phase 4 (듀얼 캔버스) | 2일 | 기존 코드 재사용 |
| Phase 5 (해설 선택) | 3일 | 마우스 이벤트 까다로움 |
| Phase 6 (DB 구축) | 5일 | CRUD + 검색 로직 |
| Phase 7 (태깅 UI) | 5일 | 폼 레이아웃 반복 |
| Phase 8 (문제은행 뷰) | 5일 | 그리드 + 필터 |
| Phase 9 (Export) | 2일 | 단순 변환 |
| Phase 10 (통합 테스트) | 3일 | 버그 수정 |
| **합계** | **25일** | |

**현실적 조정**:
- 비개발자가 Claude Code에게 요청하는 방식이므로
- 디버깅 + 수정 반복 시간 고려
- **실제 예상: 5~6주**

**위험 요소**:

1. **예상치 못한 버그**:
   - 한글 경로 문제 (이미 해결 경험)
   - PySide6 버전 차이
   - **완화**: 단계별 테스트, 롤백 가능

2. **요구사항 변경**:
   - 사용자 피드백으로 UI 수정
   - **완화**: 프로토타입 먼저, 검증 후 확정

### 9.5 유지보수성: ★★★★★ (5/5)

**장점**:

1. **명확한 레이어 분리**:
   - GUI ↔ Service ↔ Data
   - 각 레이어 독립 수정 가능

2. **타입 힌트 + Docstring**:
   - 코드 가독성 높음
   - Claude Code가 나중에 수정 용이

3. **SQLite 마이그레이션**:
   - `migrations/` 폴더로 스키마 버전 관리
   - ALTER TABLE 스크립트

4. **테스트 가능 구조**:
   - Service 레이어 단위 테스트
   - Mock DB로 UI 테스트

### 9.6 확장 가능성: ★★★★★ (5/5)

**향후 확장 시나리오**:

1. **시험지 자동 구성** (Phase 11):
   - 문제은행에서 조건 선택 (학년, 난이도, 개수)
   - 자동으로 PDF 생성 (문제 + 해설 분리)
   - **기반**: 이미 문제 이미지 + 메타데이터 있음

2. **OCR 자동 태깅** (Phase 12):
   - 문제 이미지 → OCR → 키워드 추출
   - "일차방정식" 키워드 → unit_big 자동 제안
   - **기반**: 이미지 경로 DB에 저장됨

3. **AI 난이도 분류** (Phase 13):
   - CNN 모델 학습 (문제 이미지 → 난이도)
   - 자동 난이도 제안
   - **기반**: 레이블 데이터 축적 가능

4. **협업 기능** (Phase 14):
   - SQLite → PostgreSQL 마이그레이션
   - 웹 인터페이스 (Flask/Django)
   - 여러 조교가 동시 작업
   - **기반**: 서비스 레이어 재사용 가능

5. **클라우드 동기화** (Phase 15):
   - AWS S3에 이미지 업로드
   - RDS에 메타데이터
   - **기반**: 파일 경로만 수정하면 됨

### 9.7 종합 평가

| 항목 | 점수 | 코멘트 |
|------|------|--------|
| 기술적 실현가능성 | ★★★★★ | 검증된 기술, 기존 코드 재사용 |
| UX 실현가능성 | ★★★★☆ | 학습 곡선 있지만 직관적 |
| 데이터 구조 | ★★★★★ | 정규화, 확장성 우수 |
| 개발 일정 | ★★★★☆ | 5~6주 현실적 |
| 유지보수성 | ★★★★★ | 레이어 분리, 타입 힌트 |
| 확장 가능성 | ★★★★★ | OCR, AI, 협업 확장 가능 |
| **종합** | **★★★★★** | **적극 추천** |

---

## 10. 결론 및 권장사항

### 10.1 최종 결론

이 설계는 **현재 프로젝트에 완전히 실현 가능**하며, 다음 이유로 **강력히 추천**합니다:

1. ✅ **기존 시스템과 자연스러운 통합**
   - Phase 1-3 위에 Phase 4-10 추가
   - 기존 데이터 보존
   - 점진적 마이그레이션

2. ✅ **명확한 사용자 가치**
   - 문제 재활용 가능
   - 체계적 분류
   - 검색/필터로 빠른 접근

3. ✅ **안정적인 기술 스택**
   - PySide6, SQLite 검증됨
   - 기존 개발 패턴 유지

4. ✅ **현실적인 일정**
   - 5~6주면 충분
   - 단계별 테스트 가능

5. ✅ **미래 확장 여지**
   - OCR, AI, 협업까지 확장 가능

### 10.2 구현 순서 권장

**우선순위 1 (필수)**:
1. Phase 4: 듀얼 캔버스
2. Phase 5: 해설 선택
3. Phase 6: 문제은행 DB
4. Phase 7: 태깅 UI

→ **여기까지만 해도 MVP 완성**

**우선순위 2 (중요)**:
5. Phase 8: 문제은행 뷰
6. Phase 9: Export

→ **실용적 사용 가능**

**우선순위 3 (개선)**:
7. Phase 10: UX 개선

→ **완성도 향상**

### 10.3 다음 단계

이 설계를 승인하시면:

1. **Phase 4부터 단계별 구현 시작**
2. 각 Phase마다:
   - 설계 확인 → 코드 생성 → 테스트 → 다음 Phase
3. 사용자 피드백 반영하며 반복

**시작 명령어 예시**:

```
"Phase 4 Step 4.1부터 시작해줘.
main_window.py에 QStackedWidget 추가하고,
3개 모드 전환 버튼 만들어줘."
```

---

## 11. 부록

### 11.1 용어 정리

| 용어 | 설명 |
|------|------|
| 문제 그룹 | 여러 블록을 하나의 문제로 묶은 단위 (L1, R2 등) |
| 해설 영역 | 해설 페이지에서 드래그로 선택한 bbox |
| 문제 레코드 | 문제+해설+메타데이터를 하나로 묶은 DB 레코드 |
| 문제은행 | 모든 문제 레코드의 집합 (problem_bank.db) |
| 듀얼 캔버스 | 문제 페이지(좌) + 해설 페이지(우) 동시 표시 |

### 11.2 파일 경로 규칙

```
dataset_root/
├── documents/
│   ├── {doc_id}/                    # 문제 PDF
│   │   ├── pages/page_0001.png
│   │   ├── blocks/page_0001_blocks.json
│   │   ├── labels/page_0001_labels.json
│   │   ├── problems/page_0001_L1.png
│   │   └── solutions/page_0005_L1.png    # 해설 이미지
│   │
│   └── {doc_id}_solution/           # 해설 PDF
│       └── pages/page_0001.png
│
└── problem_bank/
    ├── problem_bank.db
    ├── backups/2025-01-17_backup.db
    └── exports/2025-01-17_problems.csv
```

### 11.3 데이터 흐름 요약

```
PDF
  ↓ PDFPipeline
pages/*.png
  ↓ DensityAnalyzer
blocks/*.json
  ↓ GroupingManager
labels/*.json
  ↓ Export
problems/*.png
  ↓ TaggingMode
ProblemRecord
  ↓ ProblemBankService
problem_bank.db
  ↓ BankViewMode
검색/필터/조회
```

---

**문서 끝**

이 설계는 **코드 작성 없이 순수 설계**만을 담고 있습니다.
다음 단계에서 단계별 구현을 진행할 수 있습니다.
