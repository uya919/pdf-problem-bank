# Phase 3 완료 요약

**완료일:** 2025-11-17
**상태:** ✅ 완료

---

## 📋 개요

Phase 3 "문제 그룹핑 기능" 구현이 완료되었습니다. 사용자는 이제 블록을 선택하고 그룹으로 묶어 문제 이미지를 자동으로 크롭할 수 있습니다.

---

## ✅ 구현된 기능

### 1. 블록 선택 (PageCanvas)
**파일:** [src/gui/page_canvas.py](../src/gui/page_canvas.py)

#### 기능:
- ✅ 마우스 클릭으로 블록 선택
- ✅ Ctrl+클릭으로 다중 선택 (토글)
- ✅ 선택 상태 시각화 (파랑 테두리 + 진한 배경)
- ✅ 빈 공간 클릭 시 선택 해제
- ✅ `blocks_selected` 시그널로 선택 상태 전달

#### 주요 코드:
```python
# 선택 상태 관리
self.selected_blocks: set = set()

# 시그널
blocks_selected = Signal(list)  # [block_id, ...]

# 마우스 이벤트
def mousePressEvent(self, event):
    # Ctrl+클릭: 토글 선택
    # 일반 클릭: 단일 선택
    self.update_block_styles()
    self.blocks_selected.emit(list(self.selected_blocks))
```

#### 테스트:
- [tests/test_block_selection.py](../tests/test_block_selection.py)
- ✅ 모든 테스트 통과

---

### 2. 그룹 관리 UI (GroupListPanel)
**파일:** [src/gui/side_panels.py](../src/gui/side_panels.py)

#### 기능:
- ✅ 그룹 트리 위젯 (컬럼별 분류: L/R)
- ✅ 선택된 블록 표시 (개수 + 블록 ID)
- ✅ "새 그룹 만들기" 버튼
- ✅ "기존 그룹에 추가" 버튼
- ✅ "선택 해제" 버튼
- ✅ 그룹 더블클릭으로 삭제

#### 시그널:
```python
create_group_clicked = Signal()
add_to_group_clicked = Signal(str)  # group_id
delete_group_clicked = Signal(str)  # group_id
clear_selection_clicked = Signal()
```

#### UI 구조:
```
📦 문제 그룹
├─ 왼쪽 컬럼 (2개)
│  ├─ L1  [3개 블록]
│  └─ L2  [2개 블록]
└─ 오른쪽 컬럼 (1개)
   └─ R1  [5개 블록]

선택된 블록: 3개
#1, #2, #3

[➕ 새 그룹 만들기]
[⬇️ 기존 그룹에 추가]
[🗑️ 선택 해제]
```

---

### 3. 그룹 관리 로직 (GroupingManager)
**파일:** [src/grouping.py](../src/grouping.py)

#### 주요 메서드:

**그룹 생성:**
```python
def create_group(
    self,
    page_data: PageData,
    selected_block_ids: List[int],
    column: str
) -> ProblemGroup:
    # 그룹 ID 자동 생성 (L1, L2, R1, R2...)
    # 전체 BBox 계산
    # ProblemGroup 반환
```

**블록 추가/제거:**
```python
def add_blocks_to_group(...)  # 기존 그룹에 블록 추가
def remove_blocks_from_group(...)  # 그룹에서 블록 제거
```

**이미지 크롭:**
```python
def crop_group_image(
    self,
    image: np.ndarray,
    group: ProblemGroup,
    output_dir: Path,
    document_id: str,
    page_index: int
) -> Path:
    # BBox 영역 크롭
    # PNG로 저장
    # 파일명: {doc_id}_page{num:04d}_{group_id}.png
```

**JSON 저장/로드:**
```python
def save_labels(group_data: GroupData, output_path: Path)
def load_labels(labels_path: Path) -> Optional[GroupData]
```

---

### 4. MainWindow 통합
**파일:** [src/gui/main_window.py](../src/gui/main_window.py)

#### 추가된 핸들러:

**블록 선택:**
```python
def on_blocks_selected(self, block_ids: list):
    # 우측 패널 업데이트
    self.right_panel.update_selected_blocks(block_ids)
```

**그룹 생성:**
```python
def on_create_group(self):
    # 선택된 블록으로 그룹 생성
    # GroupData 업데이트
    # JSON 저장
    # UI 업데이트
```

**그룹 추가/삭제:**
```python
def on_add_to_group(self, group_id: str):
    # 선택된 블록을 기존 그룹에 추가

def on_delete_group(self, group_id: str):
    # 그룹 삭제
```

**페이지 로드 시 그룹 복원:**
```python
def load_page_to_canvas(self, doc_id: str, page_index: int):
    # 이미지 + 블록 로드
    self.load_current_groups()  # Phase 3: 그룹 데이터 로드
```

---

### 5. Export 기능
**파일:** [src/gui/main_window.py](../src/gui/main_window.py)

#### 기능:
- ✅ 현재 페이지 또는 전체 문서 선택
- ✅ 그룹별 이미지 크롭
- ✅ `problems/` 폴더에 PNG 저장
- ✅ 진행 상황 다이얼로그
- ✅ 취소 가능

#### 사용자 워크플로우:
```
1. 💾 Export 버튼 클릭
2. 범위 선택: "Save" (현재 페이지) / "Save All" (전체)
3. 진행 상황 확인
4. 완료 메시지 확인
```

#### 출력:
```
dataset_root/documents/{doc_id}/problems/
  ├─ {doc_id}_page0000_L1.png
  ├─ {doc_id}_page0000_L2.png
  ├─ {doc_id}_page0001_R1.png
  └─ ...
```

---

## 📁 데이터 구조

### labels JSON
**경로:** `dataset_root/documents/{doc_id}/labels/page_XXXX_labels.json`

```json
{
  "version": "1.0",
  "document_id": "베이직쎈 수학2 2022_본문",
  "page_index": 0,
  "status": "edited",
  "created_at": "2025-11-17T12:00:00",
  "modified_at": "2025-11-17T13:30:00",
  "groups": [
    {
      "id": "L1",
      "column": "L",
      "block_ids": [1, 2, 3, 4],
      "bbox": [100, 200, 500, 350],
      "crop_image_path": null,
      "created_at": "2025-11-17T12:00:00",
      "created_by": "user",
      "notes": "",
      "metadata": {}
    },
    {
      "id": "L2",
      "column": "L",
      "block_ids": [5, 6],
      "bbox": [100, 400, 500, 550],
      "created_at": "2025-11-17T12:05:00",
      "created_by": "user",
      "notes": "복합 보기 문제",
      "metadata": {}
    }
  ]
}
```

---

## 🎯 데이터 모델 업데이트

### ProblemGroup
**파일:** [src/data_models.py](../src/data_models.py)

```python
@dataclass
class ProblemGroup:
    id: str  # "L1", "R2" 등
    column: str
    block_ids: List[int]
    bbox: Optional[BoundingBox] = None
    crop_image_path: Optional[str] = None
    created_at: Optional[str] = None  # ISO 8601 형식 (NEW)
    created_by: str = "user"  # "user" 또는 "auto" (NEW)
    notes: str = ""  # 사용자 메모 (NEW)
    metadata: dict = field(default_factory=dict)
```

### GroupData
```python
@dataclass
class GroupData:
    document_id: str
    page_index: int
    groups: List[ProblemGroup]
    status: Literal["todo", "auto", "edited"] = "todo"
    created_at: Optional[datetime] = None
    modified_at: Optional[datetime] = None
```

---

## 🧪 테스트

### 단위 테스트
**파일:** [tests/test_block_selection.py](../tests/test_block_selection.py)

#### 테스트 항목:
1. ✅ 선택 상태 관리
2. ✅ 시그널 정의 및 발생
3. ✅ 메서드 존재 확인
4. ✅ 선택 해제 기능

#### 결과:
```
============================================================
✅ 모든 테스트 통과!
============================================================
```

### 통합 테스트
**방법:** GUI 앱 실행 테스트
- ✅ 블록 선택/해제
- ✅ 그룹 생성
- ✅ 그룹에 블록 추가
- ✅ 그룹 삭제
- ✅ 페이지 전환 시 그룹 복원
- ✅ Export 기능

---

## 📊 구현 통계

### 파일 수정/생성

#### 신규 파일:
- `src/grouping.py` (350줄)
- `tests/test_block_selection.py` (120줄)
- `docs/phase3_completion_summary.md` (이 파일)

#### 수정된 파일:
- `src/data_models.py` (ProblemGroup 업데이트)
- `src/gui/page_canvas.py` (+100줄, 블록 선택 기능)
- `src/gui/side_panels.py` (+200줄, GroupListPanel 구현)
- `src/gui/main_window.py` (+350줄, 그룹 관리 통합)

### 코드 라인 수:
- **추가:** ~1,120줄
- **수정:** ~50줄

### 개발 시간:
- **Phase 3 총 시간:** ~3시간 (2025-11-17)

---

## 🚀 사용자 워크플로우

### 1. 블록 선택
```
1. 페이지 선택
2. 문제에 해당하는 블록들을 클릭
   - 일반 클릭: 단일 선택
   - Ctrl+클릭: 다중 선택 (토글)
3. 우측 패널에서 선택된 블록 확인
```

### 2. 그룹 생성
```
1. 블록 선택 완료
2. "➕ 새 그룹 만들기" 클릭
3. 그룹 ID 자동 생성 (L1, L2, R1...)
4. 우측 패널에 그룹 표시
5. JSON 자동 저장
```

### 3. 그룹 수정
```
# 블록 추가
1. 추가할 블록 선택
2. 우측 패널에서 대상 그룹 선택
3. "⬇️ 기존 그룹에 추가" 클릭

# 그룹 삭제
1. 우측 패널에서 그룹 더블클릭
2. 삭제 확인
```

### 4. Export
```
1. 모든 페이지에서 그룹 생성 완료
2. 💾 Export 버튼 클릭
3. 범위 선택 (현재 페이지 / 전체)
4. 진행 상황 확인
5. problems/ 폴더에서 PNG 확인
```

---

## 🔄 다음 단계 (Phase 4)

**Phase 4: ML 기반 자동 그룹핑**

### 계획:
1. Phase 3에서 생성한 라벨 데이터 수집
2. 규칙 기반 베이스라인 구현
3. ML 모델 학습 (문제 경계 예측)
4. 자동 그룹핑 기능 추가
5. 사용자 수정 → 재학습 파이프라인

### 예상 기간:
- 수개월 (데이터 수집 + 모델 학습)

---

## 📝 기술적 하이라이트

### 1. 불변성 유지
```python
# 그룹 수정 시 새 객체 생성
updated_group = ProblemGroup(
    id=group.id,
    column=group.column,
    block_ids=all_block_ids,  # 업데이트된 블록 목록
    bbox=bbox,  # 재계산된 BBox
    ...
)
```

### 2. 시그널/슬롯 패턴
```python
# PageCanvas
blocks_selected = Signal(list)  # 선택 상태 변경

# GroupListPanel
create_group_clicked = Signal()  # 그룹 생성 요청

# MainWindow
self.center_canvas.blocks_selected.connect(self.on_blocks_selected)
self.right_panel.create_group_clicked.connect(self.on_create_group)
```

### 3. 자동 ID 생성
```python
def _generate_group_id(self, page_data: PageData, column: str) -> str:
    # 같은 컬럼의 기존 그룹 ID 확인
    # 다음 번호 계산
    # L1, L2, L3... 또는 R1, R2, R3...
```

### 4. 에러 처리
```python
try:
    # 그룹 생성/수정/삭제
    ...
except Exception as e:
    QMessageBox.critical(self, "오류", f"오류 발생:\n\n{str(e)}")
    print(f"[오류] {e}")
    traceback.print_exc()
```

---

## ✅ Phase 3 완료 기준

### 필수 기능 (모두 완료)
- [x] 블록 선택/해제
- [x] 새 그룹 생성
- [x] 그룹 수정 (블록 추가)
- [x] 그룹 삭제
- [x] 그룹별 이미지 크롭
- [x] JSON 라벨 저장/로드
- [x] Export 기능

### 선택 기능 (Phase 4로 이월)
- [ ] 그룹 이름 변경
- [ ] 그룹 병합
- [ ] 실행 취소/다시 실행 (Undo/Redo)
- [ ] 키보드 단축키
- [ ] 드래그 선택 (마우스 영역 선택)

---

## 🎉 결론

**Phase 3 "문제 그룹핑 기능"이 성공적으로 완료되었습니다!**

사용자는 이제 PDF 페이지에서 블록을 선택하고 문제 단위로 그룹핑하여 자동으로 크롭된 이미지를 얻을 수 있습니다. 이 라벨 데이터는 Phase 4의 ML 모델 학습에 활용될 예정입니다.

**주요 성과:**
- ✅ 직관적인 블록 선택 UI
- ✅ 자동 그룹 ID 생성
- ✅ 실시간 그룹 관리 (생성/수정/삭제)
- ✅ 그룹 데이터 영속성 (JSON 저장/로드)
- ✅ 일괄 Export 기능
- ✅ 에러 처리 및 사용자 피드백

**다음:** Phase 4 - ML 기반 자동 그룹핑 (장기 계획)

---

**작성일:** 2025-11-17
**작성자:** Claude Code
**버전:** Phase 3 완료
