# Phase 3: 문제 그룹핑 기능 계획

**목표:** 여러 블록을 하나의 문제로 묶고 자동 크롭

**상태:** 📅 **예정**

**예상 기간:** 1-2주

**선행 조건:** Phase 2 GUI 완료

---

## 🎯 목표

### 핵심 기능
1. **블록 선택**
   - 마우스 클릭으로 블록 선택/해제
   - 드래그로 다중 선택
   - Ctrl+클릭으로 추가 선택

2. **그룹 관리**
   - 새 그룹 생성
   - 기존 그룹에 블록 추가
   - 그룹 수정/삭제

3. **자동 크롭**
   - 그룹별 BBox 계산
   - PNG 이미지 저장
   - JSON 라벨 저장

---

## 📊 데이터 구조

### labels JSON 형식
**경로:** `dataset_root/documents/{doc_id}/labels/page_XXXX_labels.json`

```json
{
  "document_id": "test_doc",
  "page_index": 0,
  "groups": [
    {
      "id": "L1",
      "column": "L",
      "block_ids": [1, 2, 3, 4],
      "bbox": {
        "x_min": 100,
        "y_min": 200,
        "x_max": 500,
        "y_max": 350
      },
      "created_at": "2025-11-16T12:00:00",
      "created_by": "user",
      "notes": ""
    },
    {
      "id": "L2",
      "column": "L",
      "block_ids": [5, 6],
      "bbox": {...},
      "created_at": "2025-11-16T12:05:00",
      "created_by": "user",
      "notes": "복합 보기 문제"
    }
  ]
}
```

### GroupData 모델
```python
@dataclass
class ProblemGroup:
    id: str  # "L1", "L2", "R1" 등
    column: str  # "L" or "R"
    block_ids: List[int]  # 포함된 블록 ID 목록
    bbox: BoundingBox  # 그룹 전체 영역 (자동 계산)
    created_at: str  # ISO 8601 형식
    created_by: str  # "user" 또는 "auto"
    notes: str = ""  # 사용자 메모
```

---

## 🎨 UI 개선

### 우측 패널 활성화
```
┌─────────────────────────────┐
│ 📦 문제 그룹 (3개)           │
├─────────────────────────────┤
│                             │
│ ▼ 왼쪽 컬럼 (2개)            │
│   • L1  [4개 블록]  ✏️ 🗑️   │
│   • L2  [2개 블록]  ✏️ 🗑️   │
│                             │
│ ▼ 오른쪽 컬럼 (1개)          │
│   • R1  [5개 블록]  ✏️ 🗑️   │
│                             │
├─────────────────────────────┤
│                             │
│ 선택된 블록: 3개             │
│   #1, #2, #3               │
│                             │
│ [+ 새 그룹 만들기]           │
│ [↓ 기존 그룹에 추가]         │
│ [🗑️ 선택 해제]              │
│                             │
└─────────────────────────────┘
```

### 캔버스 인터랙션

**블록 선택 시각화:**
```python
# 선택되지 않은 블록
style_normal = {
    "border": "2px solid green",
    "fill": "rgba(0, 255, 0, 0.1)"
}

# 선택된 블록
style_selected = {
    "border": "3px solid blue",
    "fill": "rgba(0, 0, 255, 0.2)"
}

# 그룹에 포함된 블록
style_grouped = {
    "border": "4px solid orange",
    "fill": "rgba(255, 165, 0, 0.15)",
    "label": "L1"  # 그룹 ID 표시
}
```

---

## 🔧 구현 계획

### 1. 데이터 모델 확장

**파일:** [src/data_models.py](../src/data_models.py)

```python
@dataclass
class ProblemGroup:
    id: str
    column: str
    block_ids: List[int]
    bbox: BoundingBox
    created_at: str
    created_by: str
    notes: str = ""

    def to_dict(self) -> dict:
        ...

    @classmethod
    def from_dict(cls, data: dict) -> 'ProblemGroup':
        ...

@dataclass
class PageLabels:
    document_id: str
    page_index: int
    groups: List[ProblemGroup]

    def add_group(self, group: ProblemGroup):
        ...

    def remove_group(self, group_id: str):
        ...

    def get_group(self, group_id: str) -> Optional[ProblemGroup]:
        ...
```

---

### 2. 그룹 관리 로직

**파일:** `src/grouping.py` (새로 생성)

```python
class GroupingManager:
    """문제 그룹 관리"""

    def create_group(
        self,
        page_data: PageData,
        selected_block_ids: List[int],
        column: str
    ) -> ProblemGroup:
        """
        새 그룹 생성

        Args:
            page_data: 페이지 데이터
            selected_block_ids: 선택된 블록 ID 목록
            column: 컬럼 ("L" or "R")

        Returns:
            생성된 그룹
        """
        # 그룹 ID 생성 (L1, L2, R1 등)
        group_id = self._generate_group_id(column)

        # 전체 BBox 계산
        bbox = self._calculate_group_bbox(page_data, selected_block_ids)

        # 그룹 생성
        group = ProblemGroup(
            id=group_id,
            column=column,
            block_ids=selected_block_ids,
            bbox=bbox,
            created_at=datetime.now().isoformat(),
            created_by="user"
        )

        return group

    def crop_group_image(
        self,
        image: np.ndarray,
        group: ProblemGroup,
        output_path: Path
    ) -> None:
        """
        그룹 영역을 이미지로 크롭하여 저장

        Args:
            image: 원본 페이지 이미지
            group: 문제 그룹
            output_path: 저장 경로
        """
        # BBox 영역 크롭
        bbox = group.bbox
        cropped = image[
            bbox.y_min:bbox.y_max,
            bbox.x_min:bbox.x_max
        ]

        # 파일명: {doc_id}_page{num}_{group_id}.png
        filename = f"{doc_id}_page{page_num:04d}_{group.id}.png"
        cv2.imwrite(str(output_path / filename), cropped)

    def save_labels(
        self,
        page_labels: PageLabels,
        output_path: Path
    ) -> None:
        """
        라벨 JSON 저장

        Args:
            page_labels: 페이지 라벨 데이터
            output_path: 저장 경로
        """
        data = {
            "document_id": page_labels.document_id,
            "page_index": page_labels.page_index,
            "groups": [g.to_dict() for g in page_labels.groups]
        }

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def _generate_group_id(self, column: str) -> str:
        """컬럼 내 다음 그룹 ID 생성 (L1, L2, ...)"""
        ...

    def _calculate_group_bbox(
        self,
        page_data: PageData,
        block_ids: List[int]
    ) -> BoundingBox:
        """여러 블록을 포함하는 최소 BBox 계산"""
        blocks = [b for b in page_data.blocks if b.block_id in block_ids]

        x_min = min(b.bbox.x_min for b in blocks)
        y_min = min(b.bbox.y_min for b in blocks)
        x_max = max(b.bbox.x_max for b in blocks)
        y_max = max(b.bbox.y_max for b in blocks)

        return BoundingBox(x_min, y_min, x_max, y_max)
```

---

### 3. GUI 업데이트

**파일:** `src/gui/page_canvas.py` 수정

```python
class PageCanvas(QGraphicsView):
    # 시그널 정의
    block_selected = Signal(int)  # 블록 선택 시
    blocks_selected = Signal(list)  # 다중 선택 시

    def __init__(self):
        super().__init__()
        self.selected_blocks = set()  # 선택된 블록 ID 집합
        self.groups = {}  # 그룹 ID -> ProblemGroup

    def mousePressEvent(self, event):
        """블록 클릭 처리"""
        if event.button() == Qt.LeftButton:
            # 클릭 위치의 블록 찾기
            block_id = self._find_block_at_pos(event.pos())

            if block_id:
                # Ctrl+클릭: 추가 선택
                if event.modifiers() & Qt.ControlModifier:
                    if block_id in self.selected_blocks:
                        self.selected_blocks.remove(block_id)
                    else:
                        self.selected_blocks.add(block_id)
                else:
                    # 일반 클릭: 단일 선택
                    self.selected_blocks = {block_id}

                # 시각화 업데이트
                self.update_block_styles()

                # 시그널 발생
                self.blocks_selected.emit(list(self.selected_blocks))

    def mouseMoveEvent(self, event):
        """드래그로 다중 선택"""
        if self.dragging:
            # 드래그 영역에 포함된 블록 찾기
            rect = self._get_drag_rect()
            selected = self._find_blocks_in_rect(rect)
            self.selected_blocks = set(selected)
            self.update_block_styles()

    def update_block_styles(self):
        """선택 상태에 따라 블록 스타일 업데이트"""
        for block_id, rect_item in self.block_rects.items():
            if block_id in self.selected_blocks:
                rect_item.setPen(QPen(Qt.blue, 3))
                rect_item.setBrush(QBrush(QColor(0, 0, 255, 50)))
            elif self._is_in_group(block_id):
                rect_item.setPen(QPen(Qt.darkYellow, 4))
                rect_item.setBrush(QBrush(QColor(255, 165, 0, 40)))
            else:
                rect_item.setPen(QPen(Qt.green, 2))
                rect_item.setBrush(QBrush(QColor(0, 255, 0, 25)))
```

**파일:** `src/gui/side_panels.py` 수정

```python
class GroupListPanel(QWidget):
    """우측 그룹 리스트 패널"""

    # 시그널
    create_group_clicked = Signal()
    add_to_group_clicked = Signal(str)  # group_id
    delete_group_clicked = Signal(str)  # group_id

    def __init__(self):
        super().__init__()
        self.setup_ui()

    def setup_ui(self):
        layout = QVBoxLayout()

        # 제목
        title = QLabel("📦 문제 그룹")
        layout.addWidget(title)

        # 그룹 트리
        self.group_tree = QTreeWidget()
        self.group_tree.setHeaderLabels(["그룹", "블록 수"])
        layout.addWidget(self.group_tree)

        # 선택된 블록 정보
        self.selected_label = QLabel("선택된 블록: 0개")
        layout.addWidget(self.selected_label)

        # 버튼들
        btn_create = QPushButton("+ 새 그룹 만들기")
        btn_create.clicked.connect(self.create_group_clicked.emit)
        layout.addWidget(btn_create)

        btn_add = QPushButton("↓ 기존 그룹에 추가")
        layout.addWidget(btn_add)

        btn_clear = QPushButton("🗑️ 선택 해제")
        layout.addWidget(btn_clear)

        self.setLayout(layout)

    def update_groups(self, groups: List[ProblemGroup]):
        """그룹 리스트 업데이트"""
        self.group_tree.clear()

        # 컬럼별로 그룹화
        left_groups = [g for g in groups if g.column == "L"]
        right_groups = [g for g in groups if g.column == "R"]

        if left_groups:
            left_item = QTreeWidgetItem(["왼쪽 컬럼", f"{len(left_groups)}개"])
            for group in left_groups:
                child = QTreeWidgetItem([
                    group.id,
                    f"{len(group.block_ids)}개 블록"
                ])
                left_item.addChild(child)
            self.group_tree.addTopLevelItem(left_item)
            left_item.setExpanded(True)

        if right_groups:
            right_item = QTreeWidgetItem(["오른쪽 컬럼", f"{len(right_groups)}개"])
            for group in right_groups:
                child = QTreeWidgetItem([
                    group.id,
                    f"{len(group.block_ids)}개 블록"
                ])
                right_item.addChild(child)
            self.group_tree.addTopLevelItem(right_item)
            right_item.setExpanded(True)
```

---

## 📋 워크플로우

### 사용자 워크플로우
```
1. PDF 열기
   ↓
2. 페이지 선택
   ↓
3. 자동 검출된 블록 확인
   ↓
4. 문제에 해당하는 블록들 선택
   (클릭 또는 드래그)
   ↓
5. "새 그룹 만들기" 클릭
   ↓
6. 그룹 ID 자동 생성 (L1, L2, ...)
   ↓
7. 우측 패널에 그룹 표시
   ↓
8. 다음 문제 반복 (4-7)
   ↓
9. "Export" 클릭
   ↓
10. 그룹별 PNG + JSON 저장
```

---

## 🚀 구현 순서

### Week 1: 블록 선택 기능
- [ ] PageCanvas에 선택 로직 추가
- [ ] 클릭 선택
- [ ] Ctrl+클릭 다중 선택
- [ ] 드래그 선택
- [ ] 선택 시각화

### Week 2: 그룹 관리 기능
- [ ] GroupingManager 구현
- [ ] ProblemGroup 모델 추가
- [ ] 그룹 생성/수정/삭제
- [ ] GroupListPanel 구현
- [ ] 시그널/슬롯 연결

### Week 3: 크롭 및 저장
- [ ] 그룹 BBox 계산
- [ ] 이미지 크롭 및 저장
- [ ] JSON 라벨 저장
- [ ] Export 버튼 기능 구현
- [ ] 전체 테스트

---

## ✅ Phase 3 완료 기준

### 필수 기능
- [ ] 블록 선택/해제
- [ ] 새 그룹 생성
- [ ] 그룹 수정/삭제
- [ ] 그룹별 이미지 크롭
- [ ] JSON 라벨 저장
- [ ] Export 기능

### 선택 기능
- [ ] 그룹 이름 변경
- [ ] 그룹 병합
- [ ] 실행 취소/다시 실행
- [ ] 키보드 단축키

---

## 🔄 다음 단계

Phase 3 완료 후:
- **Phase 4:** ML 기반 자동 그룹핑
  - 사용자 라벨 데이터 수집 (Phase 3 결과 활용)
  - 규칙 기반 베이스라인
  - ML 모델 학습

---

**상태:** 📅 예정
**이전 Phase:** [Phase 2: GUI 구현](02_phase2_gui_plan.md) 📅
**다음 Phase:** [Phase 4: ML 모델](04_phase4_ml_plan.md) 💡
