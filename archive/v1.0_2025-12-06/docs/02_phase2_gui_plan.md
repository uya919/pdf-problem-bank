# Phase 2: GUI 구현 계획

**목표:** PySide6 기반 데스크톱 앱 개발

**상태:** 📅 **예정**

**예상 기간:** 2-3주

---

## 🎯 목표

### 주요 기능
1. **페이지 표시**
   - PDF에서 변환된 이미지 로드
   - 줌 인/아웃 (25% ~ 400%)
   - 페이지 네비게이션 (이전/다음)

2. **블록 시각화**
   - 자동 검출된 블록 오버레이
   - 블록 선택/해제
   - 컬럼 구분 표시

3. **기본 UI**
   - 툴바 (Open PDF, 줌, Export 등)
   - 좌측 패널 (문서/페이지 리스트)
   - 중앙 캔버스 (이미지 + 블록)
   - 우측 패널 (그룹 리스트, Phase 3에서 활성화)

---

## 🏗️ UI 레이아웃

```
┌────────────────────────────────────────────────────────────┐
│ 툴바: [Open PDF] [◀] [▶] [-] [100%] [+] [Export]          │
├────────┬───────────────────────────────────┬───────────────┤
│        │                                   │               │
│ 문서   │           중앙 캔버스              │   그룹 리스트 │
│ 리스트 │    ┌─────────────────────┐        │   (Phase 3)   │
│        │    │                     │        │               │
│ • doc1 │    │   페이지 이미지      │        │               │
│   doc2 │    │   + 블록 박스       │        │               │
│        │    │                     │        │               │
│────────│    └─────────────────────┘        │               │
│        │                                   │               │
│ 페이지 │    블록 검출 상태: 623개           │               │
│ 리스트 │    줌: 100%                       │               │
│        │                                   │               │
│ ☑ p.0  │                                   │               │
│ ☐ p.1  │                                   │               │
│ ☐ p.2  │                                   │               │
│        │                                   │               │
└────────┴───────────────────────────────────┴───────────────┘
```

---

## 📁 구현 예정 파일

### src/gui/

#### 1. main_window.py
**역할:** 메인 윈도우 및 레이아웃
```python
class MainWindow(QMainWindow):
    def __init__(self):
        # 툴바 생성
        # 레이아웃 구성
        # 시그널/슬롯 연결

    def on_open_pdf(self):
        # PDF 열기 다이얼로그

    def on_zoom_changed(self, zoom_level):
        # 줌 레벨 변경
```

#### 2. page_canvas.py
**역할:** 페이지 이미지 + 블록 표시
```python
class PageCanvas(QGraphicsView):
    def __init__(self):
        # QGraphicsScene 설정

    def load_page(self, page_data: PageData):
        # 페이지 이미지 로드
        # 블록 박스 그리기

    def draw_blocks(self, blocks: List[Block]):
        # 블록을 사각형으로 그리기
        # 컬럼별 색상 구분

    def mousePressEvent(self, event):
        # 블록 선택 (Phase 3에서 구현)
```

#### 3. side_panels.py
**역할:** 좌측/우측 패널
```python
class DocumentListPanel(QWidget):
    def __init__(self):
        # 문서 리스트 표시

class PageListPanel(QWidget):
    def __init__(self):
        # 페이지 리스트 + 상태 아이콘

class GroupListPanel(QWidget):
    def __init__(self):
        # 그룹 리스트 (Phase 3)
```

#### 4. toolbar.py
**역할:** 툴바 구성
```python
class AppToolbar(QToolBar):
    def __init__(self):
        # Open PDF 버튼
        # 네비게이션 버튼
        # 줌 컨트롤
```

---

## 🎨 UI 상세 설계

### 툴바 (상단)
```
[📁 Open PDF] [◀ 이전] [▶ 다음] [페이지: 1/10] [줌 -] [100%] [줌 +] [💾 Export]
```

**버튼 기능:**
- **Open PDF**: PDF 파일 선택 다이얼로그
- **이전/다음**: 페이지 네비게이션
- **줌**: 25%, 50%, 75%, 100%, 150%, 200%, 400%
- **Export**: 현재 문서의 그룹별 이미지 저장 (Phase 3)

---

### 좌측 패널

#### 문서 리스트
```
📂 최근 문서
  • test_doc         [623개 블록]
    2022_basic2      [미처리]
    2023_advanced1   [미처리]
```

#### 페이지 리스트
```
📄 페이지
  ☑ 페이지 1    [623개 블록]  ✓
  ☐ 페이지 2    [미분석]
  ☐ 페이지 3    [미분석]
```

**상태 아이콘:**
- ✓ : 블록 검출 완료
- ✏️ : 사용자 수정함 (Phase 3)
- ⏸️ : 미처리

---

### 중앙 캔버스

**기능:**
1. **이미지 표시**
   - 페이지 PNG 이미지
   - 스크롤 가능
   - 줌 가능

2. **블록 오버레이**
   ```python
   # 블록 표시 스타일
   block_style = {
       "border": "2px solid green",
       "fill": "rgba(0, 255, 0, 0.1)",  # 반투명
       "label": f"#{block_id}"
   }
   ```

3. **인터랙션 (Phase 3에서 구현)**
   - 블록 클릭 선택
   - 드래그로 다중 선택
   - 선택된 블록 하이라이트

---

### 우측 패널 (Phase 3에서 활성화)
```
📦 문제 그룹 (0개)

[+ 새 그룹 만들기]
[↓ 기존 그룹에 추가]
[🗑️ 그룹 삭제]

━━━━━━━━━━━━━━━━

선택된 블록: 0개
```

---

## 🔧 기술 스택

### PySide6 컴포넌트
- **QMainWindow**: 메인 윈도우
- **QGraphicsView/Scene**: 이미지 + 블록 표시
- **QToolBar**: 툴바
- **QDockWidget**: 사이드 패널
- **QListWidget**: 문서/페이지 리스트

### 이벤트 처리
```python
# 시그널/슬롯 연결
open_button.clicked.connect(self.on_open_pdf)
zoom_slider.valueChanged.connect(self.on_zoom_changed)
page_list.currentRowChanged.connect(self.on_page_changed)
```

---

## 📋 구현 계획

### Week 1: 기본 레이아웃
- [x] Phase 1 완료 (사전 준비)
- [ ] PySide6 설치 및 Hello World
- [ ] MainWindow 기본 레이아웃
- [ ] 툴바 구현
- [ ] 좌측 패널 (문서/페이지 리스트)

### Week 2: 이미지 표시 및 블록 시각화
- [ ] PageCanvas 구현
- [ ] 페이지 이미지 로드
- [ ] 줌 인/아웃 기능
- [ ] 블록 박스 그리기
- [ ] JSON 로드 연동

### Week 3: 통합 및 테스트
- [ ] 전체 워크플로우 통합
- [ ] PDF 열기 → 페이지 표시 → 블록 시각화
- [ ] 버그 수정 및 UI 개선
- [ ] 사용자 테스트

---

## 🎯 Phase 2 완료 기준

### 필수 기능
- [x] Phase 1 블록 검출 완료
- [ ] PDF 파일 열기
- [ ] 페이지 이미지 표시
- [ ] 블록 박스 오버레이
- [ ] 페이지 네비게이션
- [ ] 줌 인/아웃

### 선택 기능 (시간 여유 시)
- [ ] 문서 히스토리
- [ ] 설정 다이얼로그
- [ ] 단축키 지원
- [ ] 상태바 정보

---

## 🚀 다음 단계

Phase 2 완료 후:
- **Phase 3:** 문제 그룹핑 기능 추가
  - 블록 선택/해제
  - 그룹 생성/수정/삭제
  - 문제 이미지 크롭

---

**상태:** 📅 예정
**이전 Phase:** [Phase 1: 블록 검출](01_phase1_block_detection.md) ✅
**다음 Phase:** [Phase 3: 그룹핑 기능](03_phase3_grouping_plan.md) 📅
