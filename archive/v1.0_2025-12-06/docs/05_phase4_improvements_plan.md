# Phase 4 개선사항 상세 계획

**작성일**: 2025-01-15
**대상 Phase**: 4.5 (UX 개선), 4.6 (해설 블록 분석)

---

## 1. 배경 및 요구사항

### Phase 4 완료 현황
- ✅ Step 4.1: 모드 전환 골격 (라벨링/태깅/문제은행)
- ✅ Step 4.2: 듀얼 캔버스 위젯 (문제 + 해설)
- ✅ Step 4.3: 해설 PDF 로딩 (이미지만)
- ✅ Step 4.4: 줌/스크롤 동기화

### 식별된 문제점

#### 문제 1: 해설 PDF 블록 분석 부재
**현상**:
- 현재: `convert_solution_pdf_to_images()` → 이미지만 생성
- 해설 페이지에 블록 구조 정보 없음

**영향**:
- Phase 5 (해설 영역 선택)에서 정확한 영역 선택 어려움
- 해설 페이지 구조 파악 불가

**근거**:
```python
# pdf_processor.py:82-140
def convert_solution_pdf_to_images(...):
    # 이미지만 생성, 블록 분석 없음
    pix.save(str(image_path))
```

#### 문제 2: 문제/해설 페이지 강제 동기화
**현상**:
```python
# main_window.py:427
def load_page_to_canvas(self, doc_id: str, page_index: int):
    self.center_canvas.load_page(image_path, json_path)
    self.load_solution_page(page_index)  # ❌ 자동 동기화
```

**영향**:
- 문제 페이지 8번 → 해설 페이지도 무조건 8번
- 사용자가 독립적으로 제어 불가

**요구사항**:
- 문제 페이지 8번 ↔ 해설 페이지 3번 (독립적)
- 문제 네비게이션(◀▶)은 문제만 영향
- 해설은 SpinBox로만 제어

#### 문제 3: 레이아웃 저장 기능 부재
**현상**:
```python
# labeling_mode_widget.py:56
self.main_splitter.setSizes([200, 1200, 200])  # 하드코딩
```

**영향**:
- 사용자가 스플리터 조정 → 앱 재시작 시 초기화
- 작업 스타일별 레이아웃 전환 불가

**요구사항**:
- 레이아웃 비율 자동 저장
- 여러 프리셋 생성/전환 (예: "듀얼뷰", "넓은 캔버스")
- 앱 시작 시 마지막 레이아웃 복원

---

## 2. Phase 4.5: UX 개선 (우선순위: 최상)

### 총 소요시간: 5-6시간
### 목표: 사용자 경험 즉각 개선

---

### Step 4.5.1: 문제/해설 페이지 독립화

**소요시간**: 30분
**우선순위**: 최상 (즉시 적용)

#### 변경사항

##### 1. 자동 동기화 제거
```python
# main_window.py:407-435
def load_page_to_canvas(self, doc_id: str, page_index: int):
    """캔버스에 페이지 로드"""
    # 경로 생성
    doc_folder = self.config.DOCUMENTS_DIR / doc_id
    image_path = doc_folder / "pages" / f"page_{page_index:04d}.png"
    json_path = doc_folder / "blocks" / f"page_{page_index:04d}_blocks.json"

    # 캔버스에 로드
    self.center_canvas.load_page(image_path, json_path)

    # Phase 3: 그룹 데이터 로드
    self.load_current_groups()

    # ❌ 제거: self.load_solution_page(page_index)
    # 해설 페이지는 사용자가 SpinBox로 수동 선택

    # 상태바 업데이트
    # ...
```

##### 2. 해설 PDF 로드 시 초기 페이지 설정
```python
# main_window.py:859-862
def on_load_solution_pdf(self):
    # ...
    # 기존: solution_page_index = min(self.current_page, total_solution_pages - 1)
    # 변경: 항상 첫 페이지
    if total_solution_pages > 0:
        self.load_solution_page(0)  # 항상 0번 페이지
```

##### 3. 문서 선택 시 해설 페이지 초기화 안 함
```python
# main_window.py:888-896
def check_solution_pdf_loaded(self, doc_id: str):
    """해설 PDF 존재 확인 (자동 로드 X)"""
    solution_pages_dir = self.config.DOCUMENTS_DIR / doc_id / "solution_pages"
    if solution_pages_dir.exists():
        solution_images = list(solution_pages_dir.glob("solution_page_*.png"))
        if solution_images:
            total_pages = len(solution_images)
            self.center_canvas.set_solution_pdf_info(total_pages)
            # ❌ 제거: 자동 로드
            print(f"[MainWindow] 기존 해설 PDF 발견: {total_pages}페이지")
```

#### 테스트 시나리오
1. 문제 PDF 로드 → 문제 페이지 1
2. 해설 PDF 로드 → 해설 페이지 0 (고정)
3. 문제 페이지 1→2→3 이동 → 해설 페이지 0 유지 확인
4. 해설 SpinBox로 5번 선택 → 해설만 5번으로 이동
5. 문제 페이지 3→4 이동 → 해설 5번 유지 확인

---

### Step 4.5.2: 레이아웃 매니저 아키텍처 설계

**소요시간**: 1시간
**우선순위**: 상

#### 시스템 구조

```
레이아웃 시스템
├── 데이터 계층
│   ├── LayoutPreset (dataclass)
│   │   ├── name: str
│   │   ├── labeling_mode_sizes: List[int]
│   │   ├── dual_canvas_sizes: List[int]
│   │   ├── created_at: str
│   │   └── is_default: bool
│   └── layout_presets.json (영구 저장)
│
├── 비즈니스 로직 계층
│   └── LayoutManager (싱글톤)
│       ├── save_preset(preset)
│       ├── load_preset(name) → LayoutPreset
│       ├── delete_preset(name)
│       ├── get_all_preset_names() → List[str]
│       ├── _save_to_file()
│       ├── load_all_presets() → List[LayoutPreset]
│       └── _create_default_presets()
│
└── UI 계층
    ├── 툴바 (main_window.py)
    │   ├── QLabel("레이아웃:")
    │   ├── QComboBox (프리셋 선택)
    │   └── QAction("💾 레이아웃 저장")
    └── 시그널/슬롯
        ├── layout_combo.currentTextChanged → on_layout_preset_changed()
        └── action_save.triggered → on_save_layout_preset()
```

#### 데이터 구조

##### LayoutPreset 클래스
```python
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import List

@dataclass
class LayoutPreset:
    """레이아웃 프리셋"""
    name: str
    labeling_mode_sizes: List[int]  # [좌측, 중앙, 우측]
    dual_canvas_sizes: List[int]    # [문제, 해설]
    created_at: str = None
    is_default: bool = False

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now().isoformat()

    def validate(self) -> bool:
        """프리셋 유효성 검사"""
        # 음수/0 방지
        if any(s <= 0 for s in self.labeling_mode_sizes):
            return False
        if any(s <= 0 for s in self.dual_canvas_sizes):
            return False
        # 최소 크기 보장 (각 패널 최소 50px)
        if any(s < 50 for s in self.labeling_mode_sizes):
            return False
        return True
```

##### JSON 저장 포맷
```json
{
  "presets": [
    {
      "name": "균형 뷰",
      "labeling_mode_sizes": [200, 1200, 200],
      "dual_canvas_sizes": [600, 600],
      "created_at": "2025-01-15T10:30:00",
      "is_default": true
    },
    {
      "name": "넓은 캔버스",
      "labeling_mode_sizes": [150, 1400, 50],
      "dual_canvas_sizes": [700, 700],
      "created_at": "2025-01-15T10:35:00",
      "is_default": true
    }
  ],
  "version": "1.0"
}
```

##### 저장 위치
```
dataset_root/
└── config/
    ├── layout_presets.json  # 프리셋 저장
    └── .gitignore           # layout_presets.json 제외
```

#### 기본 프리셋 3종

| 이름 | 좌측 | 중앙 | 우측 | 문제 | 해설 | 용도 |
|------|------|------|------|------|------|------|
| 균형 뷰 | 200 | 1200 | 200 | 600 | 600 | 기본 작업 |
| 넓은 캔버스 | 150 | 1400 | 50 | 700 | 700 | 이미지 집중 |
| 좌측 집중 | 300 | 1100 | 100 | 800 | 400 | 문제 위주 |

---

### Step 4.5.3: LayoutManager 구현

**소요시간**: 2시간
**우선순위**: 상

#### 파일 생성: `src/layout_manager.py`

```python
"""
레이아웃 프리셋 관리자

Phase 4.5에서 추가
"""
from dataclasses import dataclass, asdict
from typing import List, Optional
from pathlib import Path
from datetime import datetime
import json


@dataclass
class LayoutPreset:
    """레이아웃 프리셋"""
    name: str
    labeling_mode_sizes: List[int]
    dual_canvas_sizes: List[int]
    created_at: str = None
    is_default: bool = False

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now().isoformat()

    def validate(self) -> bool:
        """유효성 검사"""
        # 음수/0 방지
        if any(s <= 0 for s in self.labeling_mode_sizes):
            return False
        if any(s <= 0 for s in self.dual_canvas_sizes):
            return False
        # 최소 크기 (50px)
        if any(s < 50 for s in self.labeling_mode_sizes):
            return False
        if any(s < 50 for s in self.dual_canvas_sizes):
            return False
        return True


class LayoutManager:
    """레이아웃 프리셋 관리자 (싱글톤)"""

    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, config_dir: Path):
        if hasattr(self, '_initialized'):
            return

        self.config_dir = config_dir
        self.config_dir.mkdir(parents=True, exist_ok=True)
        self.config_file = self.config_dir / "layout_presets.json"
        self.presets = self.load_all_presets()
        self._initialized = True

    def save_preset(self, preset: LayoutPreset) -> bool:
        """
        프리셋 저장

        같은 이름이 있으면 덮어쓰기

        Args:
            preset: 저장할 프리셋

        Returns:
            성공 여부
        """
        # 유효성 검사
        if not preset.validate():
            print(f"[LayoutManager] 유효하지 않은 프리셋: {preset.name}")
            return False

        # 기존 프리셋 제거
        self.presets = [p for p in self.presets if p.name != preset.name]

        # 새 프리셋 추가
        self.presets.append(preset)

        # 파일에 저장
        return self._save_to_file()

    def load_preset(self, name: str) -> Optional[LayoutPreset]:
        """프리셋 로드"""
        for preset in self.presets:
            if preset.name == name:
                return preset
        return None

    def delete_preset(self, name: str) -> bool:
        """
        프리셋 삭제

        기본 프리셋은 삭제 불가
        """
        preset = self.load_preset(name)
        if preset and preset.is_default:
            print(f"[LayoutManager] 기본 프리셋은 삭제할 수 없습니다: {name}")
            return False

        self.presets = [p for p in self.presets if p.name != name]
        return self._save_to_file()

    def get_all_preset_names(self) -> List[str]:
        """모든 프리셋 이름 반환"""
        return [p.name for p in self.presets]

    def _save_to_file(self) -> bool:
        """파일에 저장"""
        try:
            data = {
                "presets": [asdict(p) for p in self.presets],
                "version": "1.0"
            }
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"[LayoutManager] 저장 완료: {self.config_file}")
            return True
        except Exception as e:
            print(f"[LayoutManager] 저장 실패: {e}")
            return False

    def load_all_presets(self) -> List[LayoutPreset]:
        """파일에서 모든 프리셋 로드"""
        if not self.config_file.exists():
            print("[LayoutManager] 설정 파일 없음, 기본 프리셋 생성")
            return self._create_default_presets()

        try:
            with open(self.config_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            presets = [LayoutPreset(**p) for p in data.get("presets", [])]
            print(f"[LayoutManager] {len(presets)}개 프리셋 로드")
            return presets

        except Exception as e:
            print(f"[LayoutManager] 로드 실패: {e}, 기본 프리셋 사용")
            return self._create_default_presets()

    def _create_default_presets(self) -> List[LayoutPreset]:
        """기본 프리셋 3개 생성"""
        defaults = [
            LayoutPreset(
                name="균형 뷰",
                labeling_mode_sizes=[200, 1200, 200],
                dual_canvas_sizes=[600, 600],
                is_default=True
            ),
            LayoutPreset(
                name="넓은 캔버스",
                labeling_mode_sizes=[150, 1400, 50],
                dual_canvas_sizes=[700, 700],
                is_default=True
            ),
            LayoutPreset(
                name="좌측 집중",
                labeling_mode_sizes=[300, 1100, 100],
                dual_canvas_sizes=[800, 400],
                is_default=True
            )
        ]

        # 파일에 저장
        self.presets = defaults
        self._save_to_file()

        return defaults


# 직접 실행 시 테스트
if __name__ == "__main__":
    from pathlib import Path

    # 테스트용 디렉토리
    test_dir = Path("./test_layout_config")

    # LayoutManager 생성
    manager = LayoutManager(test_dir)

    # 프리셋 목록 출력
    print("\n=== 기본 프리셋 ===")
    for name in manager.get_all_preset_names():
        preset = manager.load_preset(name)
        print(f"{name}: {preset.labeling_mode_sizes}, {preset.dual_canvas_sizes}")

    # 새 프리셋 저장
    print("\n=== 새 프리셋 저장 ===")
    custom = LayoutPreset(
        name="사용자정의",
        labeling_mode_sizes=[250, 1250, 100],
        dual_canvas_sizes=[700, 500]
    )
    manager.save_preset(custom)

    # 저장 확인
    loaded = manager.load_preset("사용자정의")
    print(f"저장 확인: {loaded.name}, {loaded.labeling_mode_sizes}")

    # 삭제 테스트
    print("\n=== 삭제 테스트 ===")
    manager.delete_preset("사용자정의")  # OK
    manager.delete_preset("균형 뷰")     # 기본 프리셋 → 삭제 불가

    print("\n테스트 완료!")
```

#### 단위 테스트

```python
# tests/test_layout_manager.py (선택적)
import pytest
from layout_manager import LayoutPreset, LayoutManager
from pathlib import Path
import tempfile
import shutil


@pytest.fixture
def temp_config_dir():
    """임시 설정 디렉토리"""
    temp_dir = Path(tempfile.mkdtemp())
    yield temp_dir
    shutil.rmtree(temp_dir)


def test_preset_validation():
    """프리셋 유효성 검사"""
    # 유효한 프리셋
    valid = LayoutPreset(
        name="test",
        labeling_mode_sizes=[100, 200, 100],
        dual_canvas_sizes=[200, 200]
    )
    assert valid.validate() == True

    # 음수 포함
    invalid1 = LayoutPreset(
        name="test",
        labeling_mode_sizes=[-100, 200, 100],
        dual_canvas_sizes=[200, 200]
    )
    assert invalid1.validate() == False

    # 너무 작음
    invalid2 = LayoutPreset(
        name="test",
        labeling_mode_sizes=[10, 200, 100],
        dual_canvas_sizes=[200, 200]
    )
    assert invalid2.validate() == False


def test_save_and_load(temp_config_dir):
    """저장/로드 테스트"""
    manager = LayoutManager(temp_config_dir)

    # 새 프리셋 저장
    preset = LayoutPreset(
        name="커스텀",
        labeling_mode_sizes=[250, 1000, 150],
        dual_canvas_sizes=[500, 700]
    )
    assert manager.save_preset(preset) == True

    # 로드
    loaded = manager.load_preset("커스텀")
    assert loaded is not None
    assert loaded.name == "커스텀"
    assert loaded.labeling_mode_sizes == [250, 1000, 150]


def test_default_presets(temp_config_dir):
    """기본 프리셋 테스트"""
    manager = LayoutManager(temp_config_dir)

    names = manager.get_all_preset_names()
    assert "균형 뷰" in names
    assert "넓은 캔버스" in names
    assert "좌측 집중" in names


def test_delete_protection(temp_config_dir):
    """기본 프리셋 삭제 방지"""
    manager = LayoutManager(temp_config_dir)

    # 기본 프리셋 삭제 시도
    assert manager.delete_preset("균형 뷰") == False
    assert "균형 뷰" in manager.get_all_preset_names()
```

---

### Step 4.5.4: GUI 통합

**소요시간**: 1.5시간
**우선순위**: 상

#### 변경사항: `main_window.py`

##### 1. LayoutManager 초기화
```python
# main_window.py:48-68
from layout_manager import LayoutManager, LayoutPreset

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.config = Config.load()
        self.pipeline = PDFPipeline(self.config)
        self.grouping_manager = GroupingManager(self.config)

        # Phase 4.5: LayoutManager 추가
        config_dir = self.config.DATASET_ROOT / "config"
        self.layout_manager = LayoutManager(config_dir)

        # ... 기존 코드
```

##### 2. 툴바에 레이아웃 UI 추가
```python
# main_window.py:123-196 (setup_toolbar 끝부분)
def setup_toolbar(self):
    """툴바 설정"""
    toolbar = QToolBar("메인 툴바")
    # ... 기존 버튼들 ...

    toolbar.addSeparator()

    # ===== Phase 4.5: 레이아웃 프리셋 =====
    layout_label = QLabel("  레이아웃:")
    toolbar.addWidget(layout_label)

    self.layout_combo = QComboBox()
    self.layout_combo.addItems(self.layout_manager.get_all_preset_names())
    self.layout_combo.setMinimumWidth(120)
    self.layout_combo.currentTextChanged.connect(self.on_layout_preset_changed)
    toolbar.addWidget(self.layout_combo)

    self.action_save_layout = QAction("💾 저장", self)
    self.action_save_layout.setStatusTip("현재 레이아웃을 프리셋으로 저장")
    self.action_save_layout.triggered.connect(self.on_save_layout_preset)
    toolbar.addAction(self.action_save_layout)
    # ==========================================
```

##### 3. 프리셋 적용 메서드
```python
# main_window.py (새 메서드)
def on_layout_preset_changed(self, preset_name: str):
    """레이아웃 프리셋 선택 시"""
    if not preset_name:
        return

    preset = self.layout_manager.load_preset(preset_name)
    if not preset:
        print(f"[Layout] 프리셋 없음: {preset_name}")
        return

    # 라벨링 모드 레이아웃 적용
    self.labeling_widget.main_splitter.setSizes(preset.labeling_mode_sizes)

    # 듀얼 캔버스 레이아웃 적용
    self.labeling_widget.center_canvas.splitter.setSizes(preset.dual_canvas_sizes)

    print(f"[Layout] '{preset_name}' 적용됨")
    print(f"  - 라벨링: {preset.labeling_mode_sizes}")
    print(f"  - 듀얼 캔버스: {preset.dual_canvas_sizes}")

    self.statusbar.showMessage(f"레이아웃: {preset_name}")


def on_save_layout_preset(self):
    """현재 레이아웃을 프리셋으로 저장"""
    from PySide6.QtWidgets import QInputDialog

    # 프리셋 이름 입력
    name, ok = QInputDialog.getText(
        self,
        "레이아웃 저장",
        "프리셋 이름:",
        text="내 레이아웃"
    )

    if not ok or not name:
        return

    # 기본 프리셋과 중복 확인
    existing = self.layout_manager.load_preset(name)
    if existing and existing.is_default:
        QMessageBox.warning(
            self,
            "저장 불가",
            f"'{name}'은(는) 기본 프리셋입니다.\n다른 이름을 사용해주세요."
        )
        return

    # 현재 크기 가져오기
    labeling_sizes = self.labeling_widget.main_splitter.sizes()
    dual_sizes = self.labeling_widget.center_canvas.splitter.sizes()

    # 프리셋 생성
    preset = LayoutPreset(
        name=name,
        labeling_mode_sizes=labeling_sizes,
        dual_canvas_sizes=dual_sizes
    )

    # 저장
    if self.layout_manager.save_preset(preset):
        # 콤보박스 업데이트
        self.layout_combo.clear()
        self.layout_combo.addItems(self.layout_manager.get_all_preset_names())
        self.layout_combo.setCurrentText(name)

        QMessageBox.information(
            self,
            "저장 완료",
            f"레이아웃 '{name}'이(가) 저장되었습니다."
        )

        print(f"[Layout] '{name}' 저장 완료")
    else:
        QMessageBox.critical(
            self,
            "저장 실패",
            "레이아웃 저장 중 오류가 발생했습니다."
        )
```

---

### Step 4.5.5: 자동 저장/로드

**소요시간**: 30분
**우선순위**: 중

#### QSettings 활용

```python
# main_window.py
from PySide6.QtCore import QSettings

class MainWindow(QMainWindow):
    def __init__(self):
        # ... 기존 코드 ...

        # Phase 4.5: 마지막 레이아웃 복원
        self.load_last_layout()

    def load_last_layout(self):
        """마지막 사용한 레이아웃 복원"""
        settings = QSettings("MyAcademy", "PDFCropper")
        last_preset = settings.value("layout/last_preset", "균형 뷰")

        print(f"[Layout] 마지막 프리셋 복원: {last_preset}")

        # 콤보박스 선택 (자동으로 on_layout_preset_changed 호출됨)
        index = self.layout_combo.findText(last_preset)
        if index >= 0:
            self.layout_combo.setCurrentIndex(index)
        else:
            # 프리셋이 삭제된 경우 기본값
            self.layout_combo.setCurrentIndex(0)

    def closeEvent(self, event):
        """앱 종료 시 현재 레이아웃 저장"""
        # 현재 선택된 프리셋 저장
        current_preset = self.layout_combo.currentText()
        settings = QSettings("MyAcademy", "PDFCropper")
        settings.setValue("layout/last_preset", current_preset)

        print(f"[Layout] 마지막 프리셋 저장: {current_preset}")

        event.accept()
```

#### 테스트 시나리오
1. 앱 시작 → "균형 뷰" 자동 적용 확인
2. "넓은 캔버스" 선택 → 레이아웃 변경 확인
3. 앱 종료 후 재시작 → "넓은 캔버스" 자동 복원 확인
4. 사용자 정의 프리셋 저장 → 재시작 후 복원 확인

---

## 3. Phase 4.6: 해설 PDF 블록 분석 (우선순위: 중)

### 총 소요시간: 4-5시간
### 목표: Phase 5 (해설 영역 선택) 준비

---

### Step 4.6.1: PDFPipeline 확장

**소요시간**: 1시간
**우선순위**: 중

#### 새 메서드: `process_solution_pdf()`

```python
# pdf_pipeline.py
class PDFPipeline:
    def process_solution_pdf(
        self,
        pdf_path: Path,
        document_id: str,
        progress_callback=None
    ) -> str:
        """
        해설 PDF 전체 처리 (Phase 4.6)

        1. PDF → 이미지 변환
        2. 블록 검출
        3. JSON 저장

        Args:
            pdf_path: 해설 PDF 경로
            document_id: 문서 ID (문제 PDF와 동일)
            progress_callback: 진행 상황 콜백

        Returns:
            document_id
        """
        if progress_callback:
            progress_callback("해설 PDF 이미지 변환 중...", 0, 100)

        # 1. 이미지 변환
        image_paths = self.pdf_processor.convert_solution_pdf_to_images(
            pdf_path=pdf_path,
            document_id=document_id,
            dpi=self.config.DEFAULT_DPI
        )

        total_pages = len(image_paths)
        print(f"[PDFPipeline] 해설 이미지 변환 완료: {total_pages}페이지")

        # 2. 블록 검출 (각 페이지)
        solution_blocks_dir = self.config.DOCUMENTS_DIR / document_id / "solution_blocks"
        solution_blocks_dir.mkdir(parents=True, exist_ok=True)

        for page_idx, image_path in enumerate(image_paths):
            if progress_callback:
                progress = 50 + int((page_idx / total_pages) * 50)
                progress_callback(
                    f"해설 블록 분석 중... ({page_idx+1}/{total_pages})",
                    progress,
                    100
                )

            # 블록 분석
            page_data = self.density_analyzer.analyze_page(
                image_path=image_path,
                document_id=document_id,
                page_index=page_idx
            )

            # JSON 저장
            json_path = solution_blocks_dir / f"solution_page_{page_idx:04d}_blocks.json"
            self._save_solution_blocks_json(page_data, json_path)

            print(f"  [해설 블록] 페이지 {page_idx}: {len(page_data.blocks)}개 블록")

        if progress_callback:
            progress_callback("해설 PDF 처리 완료", 100, 100)

        return document_id

    def _save_solution_blocks_json(self, page_data: PageData, json_path: Path):
        """해설 블록 JSON 저장"""
        data = {
            "document_id": page_data.document_id,
            "page_index": page_data.page_index,
            "page_type": "solution",  # 해설 페이지 표시
            "width": page_data.width,
            "height": page_data.height,
            "columns": [
                {
                    "id": col.id,
                    "x_min": col.x_min,
                    "x_max": col.x_max
                }
                for col in page_data.columns
            ],
            "blocks": [
                {
                    "block_id": block.block_id,
                    "column": block.column,
                    "bbox": block.bbox,
                    "pixel_density": block.pixel_density
                }
                for block in page_data.blocks
            ]
        }

        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
```

#### 폴더 구조

```
dataset_root/documents/{doc_id}/
├── pages/                # 문제 이미지
├── blocks/               # 문제 블록 JSON
├── solution_pages/       # 해설 이미지
└── solution_blocks/      # 해설 블록 JSON (새로 추가)
    ├── solution_page_0000_blocks.json
    ├── solution_page_0001_blocks.json
    └── ...
```

---

### Step 4.6.2: GUI 통합 - 해설 블록 분석

**소요시간**: 1시간
**우선순위**: 중

#### 변경사항: `main_window.py`

```python
# main_window.py:808-886
def on_load_solution_pdf(self):
    """해설 PDF 로드 (Phase 4.6: 블록 분석 추가)"""
    if not self.current_document:
        QMessageBox.warning(self, "문서 없음", "먼저 문제 PDF 문서를 선택해주세요.")
        return

    # 파일 선택
    file_path, _ = QFileDialog.getOpenFileName(
        self,
        "해설 PDF 파일 선택",
        str(self.config.RAW_PDFS_DIR),
        "PDF Files (*.pdf)"
    )

    if not file_path:
        return

    pdf_path = Path(file_path)
    print(f"[해설 PDF 선택] {pdf_path}")

    # 프로그레스 다이얼로그
    progress = QProgressDialog(
        "해설 PDF 처리 중...",
        "취소",
        0,
        100,
        self
    )
    progress.setWindowTitle("해설 PDF 처리")
    progress.setWindowModality(Qt.WindowModal)
    progress.setMinimumDuration(0)
    progress.setValue(0)

    try:
        # 진행 상황 콜백
        def update_progress(message: str, current: int, total: int):
            progress.setLabelText(message)
            progress.setValue(current)
            QCoreApplication.processEvents()
            if progress.wasCanceled():
                raise InterruptedError("사용자가 취소했습니다")

        # Phase 4.6: 전체 파이프라인 실행 (이미지 + 블록)
        document_id = self.pipeline.process_solution_pdf(
            pdf_path=pdf_path,
            document_id=self.current_document,
            progress_callback=update_progress
        )

        progress.setValue(100)

        # 듀얼 캔버스 정보 설정
        solution_blocks_dir = self.config.DOCUMENTS_DIR / document_id / "solution_blocks"
        total_solution_pages = len(list(solution_blocks_dir.glob("solution_page_*_blocks.json")))

        self.center_canvas.set_solution_pdf_info(total_solution_pages)

        # Phase 4.5: 첫 페이지 로드
        if total_solution_pages > 0:
            self.load_solution_page(0)

        QMessageBox.information(
            self,
            "해설 PDF 로드 완료",
            f"해설 PDF가 로드되었습니다!\n\n"
            f"총 페이지 수: {total_solution_pages}"
        )

        self.statusbar.showMessage(f"해설 PDF 로드 완료: {total_solution_pages}페이지")

    except InterruptedError as e:
        self.statusbar.showMessage(str(e))
        print(f"[취소됨] {e}")

    except Exception as e:
        progress.close()
        QMessageBox.critical(
            self,
            "오류",
            f"해설 PDF 처리 중 오류가 발생했습니다:\n\n{str(e)}"
        )
        self.statusbar.showMessage(f"오류: {str(e)}")
        print(f"[오류] {e}")
        import traceback
        traceback.print_exc()

    finally:
        progress.close()
```

---

### Step 4.6.3: 해설 캔버스 블록 표시

**소요시간**: 1시간
**우선순위**: 중

#### 변경사항: `dual_canvas_widget.py`

```python
# dual_canvas_widget.py:164-184
def load_solution_page(self, image_path: Path):
    """
    해설 페이지 로드 (Phase 4.6: 블록 JSON 포함)

    Args:
        image_path: 해설 페이지 이미지 경로
    """
    if not image_path.exists():
        print(f"[DualCanvas] 해설 이미지 없음: {image_path}")
        return

    # Phase 4.6: 블록 JSON 경로 (있으면 로드)
    page_index = int(image_path.stem.split('_')[-1])  # solution_page_0007 → 7
    solution_blocks_path = image_path.parent.parent / "solution_blocks" / f"solution_page_{page_index:04d}_blocks.json"

    # 해설 캔버스에 로드 (블록 JSON 포함)
    if solution_blocks_path.exists():
        self.solution_canvas_view.load_page(image_path, solution_blocks_path)
        print(f"[DualCanvas] 해설 페이지 + 블록 로드: {image_path.name}")
    else:
        # 블록 없이 이미지만
        self.solution_canvas_view.load_page(image_path, None)
        print(f"[DualCanvas] 해설 페이지 로드 (블록 없음): {image_path.name}")

    # UI 업데이트
    self.solution_canvas_view.show()
    self.no_solution_label.hide()
```

#### 해설 블록 스타일 차별화 (선택적)

```python
# page_canvas.py:150-180 (load_blocks 메서드)
def load_blocks(self, json_path: Path):
    """블록 데이터 표시 및 오버레이"""
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        self.current_page_data = PageData.from_dict(data)

        # Phase 4.6: 페이지 타입 확인
        page_type = data.get("page_type", "problem")

        # 블록 색상 (문제: 파란색, 해설: 초록색)
        if page_type == "solution":
            block_color = QColor(0, 150, 0, 80)    # 초록색 반투명
            block_border = QColor(0, 200, 0, 200)  # 초록색 테두리
        else:
            block_color = QColor(0, 100, 255, 60)  # 파란색 반투명
            block_border = QColor(0, 150, 255, 200)

        # 블록 그리기
        for block in self.current_page_data.blocks:
            x, y, x2, y2 = block.bbox
            w = x2 - x
            h = y2 - y

            rect_item = QGraphicsRectItem(x, y, w, h)
            rect_item.setBrush(QBrush(block_color))
            rect_item.setPen(QPen(block_border, 2))

            # Phase 4.6: 해설 페이지는 선택 비활성화
            if page_type == "solution":
                rect_item.setFlag(QGraphicsRectItem.ItemIsSelectable, False)

            self.scene.addItem(rect_item)
            self.block_items[block.block_id] = rect_item

        print(f"[PageCanvas] {len(self.current_page_data.blocks)}개 블록 표시 (타입: {page_type})")

    except Exception as e:
        print(f"[오류] 블록 로드 실패: {e}")
```

---

### Step 4.6.4: 성능 최적화 (선택적)

**소요시간**: 1시간
**우선순위**: 하

#### 옵션 1: 멀티프로세싱

```python
# pdf_pipeline.py
from multiprocessing import Pool, cpu_count

def process_solution_pdf(self, pdf_path: Path, document_id: str, ...):
    # ...

    # 멀티프로세싱으로 블록 분석
    num_workers = max(1, cpu_count() - 1)

    with Pool(processes=num_workers) as pool:
        results = pool.starmap(
            self._analyze_solution_page,
            [(image_path, document_id, idx) for idx, image_path in enumerate(image_paths)]
        )

    # ...

def _analyze_solution_page(self, image_path, document_id, page_idx):
    """단일 페이지 분석 (프로세스용)"""
    page_data = self.density_analyzer.analyze_page(...)
    return page_data
```

#### 옵션 2: 간소화된 블록 분석

```python
# density_analyzer.py
def analyze_page(self, image_path: Path, ..., mode="full"):
    """
    mode="full": 정확한 블록 검출 (문제 페이지)
    mode="fast": 빠른 블록 검출 (해설 페이지)
    """
    if mode == "fast":
        # 컬럼 검출 생략, 간단한 블록만
        # ...
```

---

## 4. 구현 순서 및 마일스톤

### 우선순위 1: Phase 4.5 즉시 구현 (1일)

| 시간 | Step | 작업 | 완료 기준 |
|------|------|------|----------|
| 09:00 | 4.5.1 | 페이지 독립화 | 문제/해설 독립 제어 확인 |
| 09:30 | 4.5.2 | 레이아웃 설계 | 아키텍처 문서 완료 |
| 10:30 | 4.5.3 | LayoutManager 구현 | 단위 테스트 통과 |
| 12:30 | 점심 | - | - |
| 13:30 | 4.5.4 | GUI 통합 | 툴바에서 프리셋 전환 확인 |
| 15:00 | 4.5.5 | 자동 저장/로드 | 재시작 후 복원 확인 |
| 15:30 | - | 통합 테스트 | 모든 시나리오 통과 |
| 16:00 | - | 문서 업데이트 | CLAUDE.md 업데이트 |

### 우선순위 2: Phase 4.6 구현 (1일, 선택적)

| 시간 | Step | 작업 | 완료 기준 |
|------|------|------|----------|
| 09:00 | 4.6.1 | PDFPipeline 확장 | process_solution_pdf() 동작 |
| 10:00 | 4.6.2 | 블록 JSON 저장 | solution_blocks/ 생성 확인 |
| 10:30 | 4.6.3 | GUI 통합 | 해설 블록 표시 확인 |
| 11:30 | 4.6.4 | 성능 측정 | 400페이지 처리 시간 |
| 12:30 | 점심 | - | - |
| 13:30 | 4.6.5 | 최적화 (필요시) | 처리 시간 단축 |
| 15:00 | - | 통합 테스트 | 전체 워크플로우 테스트 |
| 16:00 | - | 문서 업데이트 | 설계 문서 완료 |

---

## 5. 테스트 계획

### Phase 4.5 테스트

#### 1. 페이지 독립화
```
1. 문제 PDF 로드
2. 해설 PDF 로드 → 해설 0번 페이지
3. 문제 페이지 1→2→3 이동
   → ✅ 해설 페이지 0번 유지 확인
4. 해설 SpinBox로 5번 선택
   → ✅ 해설만 5번 이동
5. 문제 페이지 3→4 이동
   → ✅ 해설 5번 유지
```

#### 2. 레이아웃 프리셋
```
1. 앱 시작 → "균형 뷰" 자동 적용
2. "넓은 캔버스" 선택
   → ✅ 레이아웃 변경 확인
3. 스플리터 수동 조정
4. "내 레이아웃" 저장
   → ✅ 콤보박스에 추가 확인
5. 앱 재시작
   → ✅ "내 레이아웃" 복원 확인
```

#### 3. 엣지 케이스
```
1. 기본 프리셋 삭제 시도
   → ✅ 경고 메시지
2. 잘못된 프리셋 (음수)
   → ✅ 저장 실패
3. 프리셋 파일 삭제 후 시작
   → ✅ 기본 프리셋 재생성
```

### Phase 4.6 테스트

#### 1. 해설 블록 분석
```
1. 해설 PDF 로드 (400페이지)
2. 진행률 표시 확인
   → ✅ 0-50%: 이미지 변환
   → ✅ 50-100%: 블록 분석
3. solution_blocks/ 폴더 생성 확인
4. 블록 JSON 파일 수 = 400 확인
```

#### 2. 해설 블록 표시
```
1. 해설 페이지 선택
   → ✅ 초록색 블록 표시
2. 문제 페이지 선택
   → ✅ 파란색 블록 표시
3. 해설 블록 클릭
   → ✅ 선택 안 됨 (비활성화)
```

#### 3. 성능 테스트
```
1. 400페이지 해설 PDF 처리
   → 목표: 15분 이내
2. 메모리 사용량 모니터링
   → 목표: 2GB 이하
3. 취소 기능 테스트
   → ✅ 중간에 취소 가능
```

---

## 6. 리스크 및 대응 방안

### 리스크 1: 해설 PDF 처리 시간 과다
**문제**: 400페이지 블록 분석 → 15-20분 소요 가능

**대응**:
1. **단기**: 프로그레스바 + 취소 버튼
2. **중기**: 백그라운드 스레드 처리
3. **장기**: "필요시에만 분석" 옵션

**코드**:
```python
# 백그라운드 처리 (선택적)
from PySide6.QtCore import QThread

class SolutionPDFThread(QThread):
    progress_updated = Signal(str, int)
    finished = Signal(str)

    def run(self):
        # process_solution_pdf() 실행
        ...
```

### 리스크 2: 레이아웃 복원 실패
**문제**: 잘못된 프리셋으로 UI 깨짐

**대응**:
1. **검증**: `LayoutPreset.validate()` 철저히
2. **폴백**: 복원 실패 시 기본값
3. **UI**: "초기화" 버튼 제공

**코드**:
```python
def on_layout_preset_changed(self, preset_name):
    preset = self.layout_manager.load_preset(preset_name)

    if not preset or not preset.validate():
        # 폴백: 기본 프리셋
        preset = self.layout_manager.load_preset("균형 뷰")

    # 적용
    ...
```

### 리스크 3: 해설 블록 정확도 저하
**문제**: 해설 페이지 레이아웃이 문제와 다를 수 있음

**대응**:
1. **단기**: 동일한 DensityAnalyzer 사용 (일관성)
2. **중기**: Phase 5에서 수동 조정 기능
3. **장기**: 해설 전용 분석기

---

## 7. 성공 기준

### Phase 4.5
- ✅ 문제/해설 페이지 독립 제어
- ✅ 3개 이상 기본 프리셋 제공
- ✅ 사용자 정의 프리셋 저장/로드/삭제
- ✅ 앱 재시작 후 마지막 레이아웃 복원
- ✅ 모든 테스트 시나리오 통과

### Phase 4.6
- ✅ 해설 PDF 블록 JSON 생성
- ✅ solution_blocks/ 폴더 구조
- ✅ 해설 캔버스 블록 표시 (초록색)
- ✅ 400페이지 처리 15분 이내
- ✅ 프로그레스 표시 정확
- ✅ 취소 기능 동작

---

## 8. 영향받는 파일 목록

### 새로 생성
| 파일 | 용도 | 라인 수 (예상) |
|------|------|---------------|
| `src/layout_manager.py` | 레이아웃 프리셋 관리 | ~200 |
| `dataset_root/config/layout_presets.json` | 프리셋 저장 | - |
| `docs/05_phase4_improvements_plan.md` | 이 문서 | - |

### 수정
| 파일 | 변경 내용 | 추가 라인 (예상) |
|------|----------|-----------------|
| `src/gui/main_window.py` | 페이지 독립화, 레이아웃 UI, 해설 블록 분석 | +150 |
| `src/gui/dual_canvas_widget.py` | 해설 블록 JSON 로드 | +20 |
| `src/pdf_pipeline.py` | process_solution_pdf() 추가 | +80 |
| `src/gui/page_canvas.py` | 해설 블록 스타일 차별화 (선택적) | +30 |

---

## 9. 다음 단계 (Phase 5 준비)

### Phase 5: 해설 영역 선택 (예정)

**기반 작업** (Phase 4.6 완료 시):
- ✅ 해설 페이지 블록 구조 정보
- ✅ 해설 캔버스 준비

**구현 내용**:
1. 해설 캔버스에서 드래그로 영역 선택
2. 선택된 영역을 문제 그룹과 연결
3. 문제↔해설 매핑 저장

**설계 방향**:
```python
# SolutionCanvas에 드래그 선택 기능 추가
class SolutionCanvas(PageCanvas):
    region_selected = Signal(tuple)  # (x, y, w, h)

    def mousePressEvent(self, event):
        if self.selection_mode:
            # 드래그 시작
            ...

    def mouseReleaseEvent(self, event):
        if self.selection_mode:
            # 영역 확정
            self.region_selected.emit(bbox)
```

---

## 10. 참고 자료

### 관련 문서
- [docs/04_problem_bank_design.md](./04_problem_bank_design.md) - 전체 설계
- [CLAUDE.md](../CLAUDE.md) - 프로젝트 개요

### Qt 문서
- [QSplitter](https://doc.qt.io/qt-6/qsplitter.html) - 스플리터 사용법
- [QSettings](https://doc.qt.io/qt-6/qsettings.html) - 설정 저장
- [QThread](https://doc.qt.io/qt-6/qthread.html) - 백그라운드 처리

### Python 표준 라이브러리
- [dataclasses](https://docs.python.org/3/library/dataclasses.html) - 데이터 클래스
- [json](https://docs.python.org/3/library/json.html) - JSON 처리
- [multiprocessing](https://docs.python.org/3/library/multiprocessing.html) - 병렬 처리

---

**작성**: Claude Code
**검토**: 사용자 승인 대기
**상태**: 계획 완료, 구현 대기
