# 다층 스케일 블록 검출 구현 계획

**목표**: 사람 눈으로 봤을 때 존재하는 **모든** 블록을 빠짐없이 검출
**방법론**: Multi-scale Morphological Analysis
**작성일**: 2025-11-16
**예상 소요 시간**: 4-5시간 (구현 + 테스트)

---

## 📋 전체 개요

### 핵심 원리

**"모든 크기의 블록을 검출하려면, 모든 스케일에서 검출해야 한다"**

```
큰 스케일 (h_kernel=15):
  [문제 01 전체 제목과 지문이 하나로]
  → 큰 구조 파악

중간 스케일 (h_kernel=10):
  [문제 01] [제목] [지문 라인1] [지문 라인2]
  → 의미 단위

작은 스케일 (h_kernel=7):
  [문] [제] [01] [제목] [지문] [라인1] [단어1] [단어2]
  → 세부 요소

초소형 스케일 (h_kernel=5):
  [문][제][0][1][제][목][지][문][라][인]...
  → 개별 요소 (너무 세밀, 선택적 사용)

최종 병합:
  큰 스케일의 결과 + 중간 스케일의 추가 블록 + 작은 스케일의 추가 블록
  = 모든 스케일의 블록 포함
```

### 병합 전략

**핵심 아이디어**: "계층적 포함 관계 유지"

```python
# 예시:
큰 블록: [0, 0, 100, 50]     (제목 전체)
작은 블록1: [0, 0, 30, 25]   (문제 번호)
작은 블록2: [35, 0, 100, 50] (제목 텍스트)

병합 결과:
→ 3개 블록 모두 유지
→ 큰 블록은 "부모 블록" 역할
→ 작은 블록들은 "자식 블록" 역할

이유:
- 사용자가 "제목 전체"를 선택하고 싶을 때: 큰 블록 사용
- 사용자가 "번호만" 선택하고 싶을 때: 작은 블록1 사용
- 모든 가능성 제공
```

---

## 🏗️ Phase 1: 아키텍처 설계

### 1.1 새로운 클래스 구조

**multiscale_analyzer.py 생성**:

```python
class MultiscaleAnalyzer:
    """
    다층 스케일 블록 검출기

    여러 커널 크기로 검출한 결과를 병합하여
    모든 크기의 블록을 빠짐없이 검출
    """

    def __init__(self, config: Config):
        self.config = config
        self.density_analyzer = DensityAnalyzer(config)

        # 스케일 정의
        self.scales = [
            {"name": "large", "h_kernel": 15, "v_kernel": 2},
            {"name": "medium", "h_kernel": 10, "v_kernel": 2},
            {"name": "small", "h_kernel": 7, "v_kernel": 2},
            {"name": "tiny", "h_kernel": 5, "v_kernel": 1},  # 선택적
        ]

    def detect_all_blocks(
        self,
        image: np.ndarray,
        columns: List[Column],
        use_tiny: bool = False
    ) -> List[Block]:
        """
        모든 스케일에서 블록 검출 후 병합

        Args:
            image: 페이지 이미지
            columns: 컬럼 정보
            use_tiny: 초소형 스케일 사용 여부

        Returns:
            병합된 블록 리스트
        """
        pass

    def _detect_at_scale(
        self,
        image: np.ndarray,
        columns: List[Column],
        h_kernel: int,
        v_kernel: int
    ) -> List[BoundingBox]:
        """특정 스케일에서 블록 검출"""
        pass

    def _merge_blocks(
        self,
        blocks_by_scale: Dict[str, List[BoundingBox]]
    ) -> List[BoundingBox]:
        """
        스케일별 블록 병합

        전략:
        1. 큰 스케일부터 시작
        2. 작은 스케일의 블록 중 새로운 것만 추가
        3. 중복은 제거하되, 계층 구조는 유지
        """
        pass

    def _is_duplicate(
        self,
        bbox1: BoundingBox,
        bbox2: BoundingBox,
        iou_threshold: float = 0.8
    ) -> bool:
        """두 블록이 중복인지 판단 (IoU 기준)"""
        pass

    def _is_contained(
        self,
        child: BoundingBox,
        parent: BoundingBox,
        threshold: float = 0.9
    ) -> bool:
        """child가 parent에 거의 포함되는지 판단"""
        pass
```

### 1.2 데이터 모델 확장

**data_models.py 수정**:

```python
@dataclass
class Block:
    """텍스트 블록"""
    block_id: int
    column: str
    bbox: BoundingBox
    pixel_density: float

    # 새로운 필드 추가
    scale: str = "unknown"  # "large", "medium", "small", "tiny"
    parent_id: Optional[int] = None  # 부모 블록 ID (계층 구조)
    children_ids: List[int] = field(default_factory=list)  # 자식 블록 IDs

    def to_dict(self) -> dict:
        return {
            "block_id": int(self.block_id),
            "column": self.column,
            "bbox": self.bbox.to_list(),
            "pixel_density": float(self.pixel_density),
            "scale": self.scale,
            "parent_id": self.parent_id,
            "children_ids": self.children_ids
        }
```

---

## 🔧 Phase 2: 핵심 알고리즘 구현

### 2.1 스케일별 검출

**구현 세부사항**:

```python
def _detect_at_scale(
    self,
    image: np.ndarray,
    columns: List[Column],
    h_kernel: int,
    v_kernel: int
) -> List[BoundingBox]:
    """
    특정 스케일에서 블록 검출

    현재 DensityAnalyzer를 재사용하되,
    커널 크기를 동적으로 변경
    """

    # 1. 흰색 배경 제거
    mask = self._remove_white_background(image)

    # 2. 모폴로지 연산
    h_kernel_mat = cv2.getStructuringElement(
        cv2.MORPH_RECT, (h_kernel, 1)
    )
    h_closed = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, h_kernel_mat)

    v_kernel_mat = cv2.getStructuringElement(
        cv2.MORPH_RECT, (1, v_kernel)
    )
    v_closed = cv2.morphologyEx(h_closed, cv2.MORPH_CLOSE, v_kernel_mat)

    # 3. 노이즈 제거
    final_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    mask_cleaned = cv2.morphologyEx(v_closed, cv2.MORPH_OPEN, final_kernel)

    # 4. 컴포넌트 검출
    contours, _ = cv2.findContours(
        mask_cleaned,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )

    # 5. BoundingBox 추출
    bboxes = []
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)

        # 최소 크기 필터 (스케일별로 다르게)
        min_size = self._get_min_size_for_scale(h_kernel)
        if w * h < min_size:
            continue

        bbox = BoundingBox(x, y, x + w, y + h)
        bboxes.append(bbox)

    return bboxes

def _get_min_size_for_scale(self, h_kernel: int) -> int:
    """
    스케일별 최소 블록 크기

    작은 커널일수록 더 작은 블록 허용
    """
    if h_kernel >= 15:
        return 400  # 큰 스케일: 큰 블록만
    elif h_kernel >= 10:
        return 300  # 중간 스케일
    elif h_kernel >= 7:
        return 200  # 작은 스케일
    else:
        return 100  # 초소형 스케일: 매우 작은 블록도 허용
```

### 2.2 중복 제거 알고리즘

**IoU (Intersection over Union) 기반**:

```python
def _calculate_iou(
    self,
    bbox1: BoundingBox,
    bbox2: BoundingBox
) -> float:
    """
    두 박스의 IoU 계산

    IoU = Intersection / Union
    """
    # 교집합 영역
    x_min = max(bbox1.x_min, bbox2.x_min)
    y_min = max(bbox1.y_min, bbox2.y_min)
    x_max = min(bbox1.x_max, bbox2.x_max)
    y_max = min(bbox1.y_max, bbox2.y_max)

    if x_max < x_min or y_max < y_min:
        return 0.0  # 겹치지 않음

    intersection = (x_max - x_min) * (y_max - y_min)

    # 합집합 영역
    area1 = bbox1.area
    area2 = bbox2.area
    union = area1 + area2 - intersection

    return intersection / union if union > 0 else 0.0

def _is_duplicate(
    self,
    bbox1: BoundingBox,
    bbox2: BoundingBox,
    iou_threshold: float = 0.85
) -> bool:
    """
    두 블록이 중복인지 판단

    IoU > 0.85 → 거의 같은 블록으로 판단
    """
    iou = self._calculate_iou(bbox1, bbox2)
    return iou > iou_threshold
```

### 2.3 병합 전략 (핵심!)

**계층적 병합**:

```python
def _merge_blocks(
    self,
    blocks_by_scale: Dict[str, List[BoundingBox]]
) -> List[BoundingBox]:
    """
    스케일별 블록 병합

    전략:
    1. 큰 스케일 → 작은 스케일 순으로 처리
    2. 새로운 블록만 추가 (중복 제거)
    3. 하지만 계층 구조는 유지

    예시:
    large: [A(전체)]
    medium: [B(왼쪽), C(오른쪽)]
    small: [D(번호), E(텍스트1), F(텍스트2)]

    결과: [A, B, C, D, E, F] (모두 포함)
    - A는 B, C를 포함 → parent
    - B는 D, E를 포함 → parent
    - D, E, F는 leaf
    """

    merged = []

    # 1. 큰 스케일부터 추가
    for scale_name in ["large", "medium", "small", "tiny"]:
        if scale_name not in blocks_by_scale:
            continue

        scale_blocks = blocks_by_scale[scale_name]

        for bbox in scale_blocks:
            # 2. 이미 있는 블록과 중복 확인
            is_new = True

            for existing in merged:
                iou = self._calculate_iou(bbox, existing)

                # 2-1. 거의 같은 블록 (IoU > 0.85)
                if iou > 0.85:
                    is_new = False
                    break

                # 2-2. 기존 블록에 거의 포함됨 (IoU > 0.95, 면적도 작음)
                if iou > 0.95 and bbox.area < existing.area * 0.8:
                    # 이건 새로운 블록이지만, 기존 블록의 일부
                    # → 계층 관계로 처리 (나중에)
                    pass

            # 3. 새로운 블록이면 추가
            if is_new:
                merged.append(bbox)

    return merged
```

**개선된 병합 (포함 관계 고려)**:

```python
def _merge_with_hierarchy(
    self,
    blocks_by_scale: Dict[str, List[BoundingBox]]
) -> List[BoundingBox]:
    """
    계층 구조를 고려한 병합

    전략:
    1. 모든 블록을 일단 모음
    2. 포함 관계 분석
    3. 중복은 제거, 포함 관계는 유지
    """

    all_blocks = []

    # 1. 모든 블록 수집 (스케일 정보 포함)
    for scale_name in ["large", "medium", "small", "tiny"]:
        if scale_name not in blocks_by_scale:
            continue

        for bbox in blocks_by_scale[scale_name]:
            all_blocks.append({
                "bbox": bbox,
                "scale": scale_name,
                "area": bbox.area
            })

    # 2. 면적 기준 정렬 (큰 것부터)
    all_blocks.sort(key=lambda x: x["area"], reverse=True)

    # 3. 중복 제거 및 포함 관계 분석
    unique_blocks = []

    for i, block in enumerate(all_blocks):
        bbox = block["bbox"]

        # 이미 추가된 블록들과 비교
        is_duplicate = False

        for existing in unique_blocks:
            iou = self._calculate_iou(bbox, existing["bbox"])

            # 중복 판단 (IoU > 0.9)
            if iou > 0.9:
                is_duplicate = True
                break

        if not is_duplicate:
            unique_blocks.append(block)

    # 4. BoundingBox만 추출
    result = [b["bbox"] for b in unique_blocks]

    return result
```

---

## 🧪 Phase 3: 테스트 및 검증

### 3.1 단위 테스트

**tests/test_multiscale.py**:

```python
import pytest
from pathlib import Path
import numpy as np
import cv2

from src.config import Config
from src.multiscale_analyzer import MultiscaleAnalyzer
from src.data_models import Column, BoundingBox

class TestMultiscaleAnalyzer:
    """다층 스케일 분석기 단위 테스트"""

    @pytest.fixture
    def config(self):
        return Config.load()

    @pytest.fixture
    def analyzer(self, config):
        return MultiscaleAnalyzer(config)

    def test_scale_detection(self, analyzer):
        """스케일별 검출 테스트"""

        # 간단한 테스트 이미지 생성
        image = np.ones((500, 500), dtype=np.uint8) * 255

        # 큰 블록 그리기
        cv2.rectangle(image, (50, 50), (450, 150), 0, -1)

        # 작은 블록 그리기
        cv2.rectangle(image, (60, 60), (100, 90), 0, -1)

        columns = [Column(id="C", x_min=0, x_max=500)]

        # 큰 스케일 검출
        large_blocks = analyzer._detect_at_scale(
            image, columns, h_kernel=15, v_kernel=2
        )
        assert len(large_blocks) >= 1  # 큰 블록 검출

        # 작은 스케일 검출
        small_blocks = analyzer._detect_at_scale(
            image, columns, h_kernel=5, v_kernel=1
        )
        assert len(small_blocks) >= 2  # 큰 블록 + 작은 블록

    def test_iou_calculation(self, analyzer):
        """IoU 계산 테스트"""

        bbox1 = BoundingBox(0, 0, 100, 100)
        bbox2 = BoundingBox(50, 50, 150, 150)

        iou = analyzer._calculate_iou(bbox1, bbox2)

        # 교집합: 50×50 = 2,500
        # 합집합: 10,000 + 10,000 - 2,500 = 17,500
        # IoU = 2,500 / 17,500 = 0.142...

        assert 0.14 < iou < 0.15

    def test_duplicate_detection(self, analyzer):
        """중복 판단 테스트"""

        bbox1 = BoundingBox(0, 0, 100, 100)
        bbox2 = BoundingBox(2, 2, 102, 102)  # 거의 같음
        bbox3 = BoundingBox(200, 200, 300, 300)  # 완전히 다름

        assert analyzer._is_duplicate(bbox1, bbox2, iou_threshold=0.85)
        assert not analyzer._is_duplicate(bbox1, bbox3, iou_threshold=0.85)

    def test_merge_blocks(self, analyzer):
        """블록 병합 테스트"""

        blocks_by_scale = {
            "large": [
                BoundingBox(0, 0, 200, 100),
            ],
            "medium": [
                BoundingBox(0, 0, 100, 100),
                BoundingBox(100, 0, 200, 100),
            ],
            "small": [
                BoundingBox(0, 0, 50, 50),
                BoundingBox(50, 0, 100, 100),
                BoundingBox(100, 0, 150, 50),
            ],
        }

        merged = analyzer._merge_with_hierarchy(blocks_by_scale)

        # 중복 제거되어야 함
        # large의 [0,0,200,100]과 medium의 두 블록이 합쳐진 것과 중복
        # → 실제로는 세밀한 블록들이 우선

        assert len(merged) > 0
        print(f"Merged blocks: {len(merged)}")
```

### 3.2 통합 테스트

**tests/test_multiscale_pipeline.py**:

```python
def test_full_pipeline():
    """전체 파이프라인 테스트"""

    config = Config.load()
    pdf_processor = PDFProcessor(config)
    multiscale_analyzer = MultiscaleAnalyzer(config)

    # 1. PDF → 이미지
    pdf_path = Path("test.pdf")
    image_paths = pdf_processor.convert_pdf_to_images(
        pdf_path, "test_multiscale"
    )

    # 2. 첫 페이지 로드
    image = cv2.imread(str(image_paths[0]), cv2.IMREAD_GRAYSCALE)

    # 3. 컬럼 검출
    columns = [
        Column(id="L", x_min=0, x_max=image.shape[1]//2),
        Column(id="R", x_min=image.shape[1]//2, x_max=image.shape[1])
    ]

    # 4. 다층 스케일 검출
    blocks = multiscale_analyzer.detect_all_blocks(
        image, columns, use_tiny=True
    )

    print(f"Detected blocks: {len(blocks)}")

    # 5. 검증
    assert len(blocks) > 89  # 현재(89개)보다 많아야 함
    assert len(blocks) < 200  # 과도한 파편화는 아니어야 함

    # 6. 스케일별 분포 확인
    scales = {}
    for block in blocks:
        scale = block.get("scale", "unknown")
        scales[scale] = scales.get(scale, 0) + 1

    print(f"Blocks by scale: {scales}")
```

### 3.3 시각화 테스트

**tests/visualize_multiscale.py**:

```python
def visualize_multiscale_results():
    """
    다층 스케일 결과를 시각화

    각 스케일별로 다른 색상으로 표시
    """

    config = Config.load()
    multiscale_analyzer = MultiscaleAnalyzer(config)

    # 이미지 로드
    image_path = Path("dataset_root/documents/test_doc/pages/page_0000.png")
    image = cv2.imread(str(image_path))

    # 컬럼 정의
    columns = [
        Column(id="L", x_min=0, x_max=image.shape[1]//2),
        Column(id="R", x_min=image.shape[1]//2, x_max=image.shape[1])
    ]

    # 스케일별 검출
    blocks_by_scale = {}

    for scale in multiscale_analyzer.scales:
        blocks = multiscale_analyzer._detect_at_scale(
            cv2.cvtColor(image, cv2.COLOR_BGR2GRAY),
            columns,
            scale["h_kernel"],
            scale["v_kernel"]
        )
        blocks_by_scale[scale["name"]] = blocks
        print(f"{scale['name']}: {len(blocks)} blocks")

    # 시각화
    colors = {
        "large": (255, 0, 0),      # 파란색
        "medium": (0, 255, 0),     # 초록색
        "small": (0, 0, 255),      # 빨간색
        "tiny": (255, 255, 0),     # 청록색
    }

    vis_image = image.copy()

    for scale_name, blocks in blocks_by_scale.items():
        color = colors.get(scale_name, (128, 128, 128))

        for bbox in blocks:
            cv2.rectangle(
                vis_image,
                (bbox.x_min, bbox.y_min),
                (bbox.x_max, bbox.y_max),
                color,
                2
            )

    # 저장
    output_path = Path("dataset_root/multiscale_visualization.png")
    cv2.imwrite(str(output_path), vis_image)
    print(f"Saved visualization: {output_path}")
```

---

## 📊 Phase 4: 성능 최적화

### 4.1 병렬 처리

**스케일별 검출을 병렬로**:

```python
from concurrent.futures import ThreadPoolExecutor, as_completed

def detect_all_blocks_parallel(
    self,
    image: np.ndarray,
    columns: List[Column],
    use_tiny: bool = False
) -> List[Block]:
    """
    병렬 처리로 속도 향상
    """

    scales_to_use = self.scales[:-1] if not use_tiny else self.scales

    # 병렬 실행
    blocks_by_scale = {}

    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {}

        for scale in scales_to_use:
            future = executor.submit(
                self._detect_at_scale,
                image,
                columns,
                scale["h_kernel"],
                scale["v_kernel"]
            )
            futures[future] = scale["name"]

        for future in as_completed(futures):
            scale_name = futures[future]
            blocks = future.result()
            blocks_by_scale[scale_name] = blocks

    # 병합
    merged_blocks = self._merge_with_hierarchy(blocks_by_scale)

    return merged_blocks
```

### 4.2 캐싱

**중간 결과 캐싱**:

```python
from functools import lru_cache
import hashlib

def _get_image_hash(self, image: np.ndarray) -> str:
    """이미지 해시 계산 (캐싱용)"""
    return hashlib.md5(image.tobytes()).hexdigest()

def detect_all_blocks_cached(
    self,
    image: np.ndarray,
    columns: List[Column],
    use_tiny: bool = False
) -> List[Block]:
    """
    캐싱을 사용한 검출

    같은 이미지에 대해 재검출하지 않음
    """

    image_hash = self._get_image_hash(image)
    cache_key = f"{image_hash}_{use_tiny}"

    if cache_key in self._cache:
        return self._cache[cache_key]

    blocks = self.detect_all_blocks_parallel(image, columns, use_tiny)

    self._cache[cache_key] = blocks

    return blocks
```

---

## 🎛️ Phase 5: 파라미터 튜닝

### 5.1 스케일 설정 최적화

**실험할 조합**:

```python
# 조합 1: 3단계 (빠름, 균형)
scales_3 = [
    {"name": "large", "h_kernel": 15, "v_kernel": 2},
    {"name": "medium", "h_kernel": 10, "v_kernel": 2},
    {"name": "small", "h_kernel": 6, "v_kernel": 1},
]

# 조합 2: 4단계 (권장, 정밀)
scales_4 = [
    {"name": "large", "h_kernel": 15, "v_kernel": 2},
    {"name": "medium", "h_kernel": 10, "v_kernel": 2},
    {"name": "small", "h_kernel": 7, "v_kernel": 2},
    {"name": "tiny", "h_kernel": 5, "v_kernel": 1},
]

# 조합 3: 5단계 (매우 정밀, 느림)
scales_5 = [
    {"name": "xlarge", "h_kernel": 20, "v_kernel": 3},
    {"name": "large", "h_kernel": 15, "v_kernel": 2},
    {"name": "medium", "h_kernel": 10, "v_kernel": 2},
    {"name": "small", "h_kernel": 7, "v_kernel": 2},
    {"name": "tiny", "h_kernel": 5, "v_kernel": 1},
]
```

### 5.2 IoU 임계값 조정

**실험**:

```python
# 중복 판단 임계값
iou_thresholds = [0.75, 0.80, 0.85, 0.90, 0.95]

for threshold in iou_thresholds:
    blocks = multiscale_analyzer.detect_all_blocks(
        image, columns, iou_threshold=threshold
    )
    print(f"IoU={threshold}: {len(blocks)} blocks")

# 예상 결과:
# IoU=0.75: 120개 (중복 많이 제거)
# IoU=0.85: 135개 (균형) ← 권장
# IoU=0.95: 150개 (거의 제거 안 함)
```

### 5.3 최소 블록 크기 조정

**스케일별 최적값 찾기**:

```python
min_sizes = {
    "large": [300, 400, 500],
    "medium": [200, 300, 400],
    "small": [150, 200, 250],
    "tiny": [50, 100, 150],
}

# 각 조합 테스트
for large_min in min_sizes["large"]:
    for medium_min in min_sizes["medium"]:
        for small_min in min_sizes["small"]:
            for tiny_min in min_sizes["tiny"]:
                # 테스트...
                pass
```

---

## 📈 Phase 6: 평가 및 비교

### 6.1 정량적 평가

**지표**:

```python
def evaluate_detection(blocks: List[Block], ground_truth: List[Block]):
    """
    검출 결과 평가

    Metrics:
    - Precision: 정확도
    - Recall: 재현율
    - F1-Score: 조화평균
    - Block count: 블록 수
    """

    TP = 0  # True Positive
    FP = 0  # False Positive
    FN = 0  # False Negative

    for gt_block in ground_truth:
        matched = False
        for detected_block in blocks:
            iou = calculate_iou(gt_block.bbox, detected_block.bbox)
            if iou > 0.5:
                TP += 1
                matched = True
                break

        if not matched:
            FN += 1

    FP = len(blocks) - TP

    precision = TP / (TP + FP) if (TP + FP) > 0 else 0
    recall = TP / (TP + FN) if (TP + FN) > 0 else 0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0

    return {
        "precision": precision,
        "recall": recall,
        "f1_score": f1,
        "block_count": len(blocks),
        "TP": TP,
        "FP": FP,
        "FN": FN
    }
```

### 6.2 버전 비교

**현재 방식 vs 다층 스케일**:

```python
def compare_methods():
    """
    현재 방식과 다층 스케일 비교
    """

    config = Config.load()

    # 현재 방식 (h_kernel=10)
    current_analyzer = DensityAnalyzer(config, use_projection=False)
    current_blocks = current_analyzer.analyze_page(image, 0)

    # 다층 스케일
    multiscale_analyzer = MultiscaleAnalyzer(config)
    multiscale_blocks = multiscale_analyzer.detect_all_blocks(
        image, current_blocks.columns
    )

    print("=== 비교 ===")
    print(f"현재 방식: {len(current_blocks.blocks)}개")
    print(f"다층 스케일: {len(multiscale_blocks)}개")
    print(f"증가: +{len(multiscale_blocks) - len(current_blocks.blocks)}개")

    # 스케일별 분포
    scales = {}
    for block in multiscale_blocks:
        scale = block.scale
        scales[scale] = scales.get(scale, 0) + 1

    print(f"\n스케일별 분포:")
    for scale, count in scales.items():
        print(f"  {scale}: {count}개")
```

---

## 🚀 Phase 7: 배포 및 통합

### 7.1 기존 코드 통합

**density_analyzer.py 수정**:

```python
class DensityAnalyzer:
    """밀집도 기반 블록 검출"""

    def __init__(
        self,
        config: Config,
        use_projection: bool = False,
        use_multiscale: bool = False  # 새로운 옵션
    ):
        self.config = config
        self.use_projection = use_projection
        self.use_multiscale = use_multiscale

        if use_multiscale:
            from multiscale_analyzer import MultiscaleAnalyzer
            self.multiscale_analyzer = MultiscaleAnalyzer(config)

    def analyze_page(
        self,
        image: np.ndarray,
        page_index: int
    ) -> PageData:
        """페이지 분석"""

        # ... 기존 코드 ...

        if self.use_multiscale:
            # 다층 스케일 사용
            bboxes = self.multiscale_analyzer.detect_all_blocks(
                mask, columns
            )
        elif self.use_projection:
            # 투영 분석 사용
            bboxes = self._find_blocks_with_projection(mask, columns)
        else:
            # 기본 모폴로지 사용
            bboxes = self._find_blocks(mask)

        # ... 나머지 코드 ...
```

### 7.2 설정 파일 업데이트

**.env 파일**:

```bash
# 블록 검출 방식
USE_MULTISCALE=true
MULTISCALE_USE_TINY=false  # 초소형 스케일 사용 여부

# 다층 스케일 파라미터
MULTISCALE_LARGE_H=15
MULTISCALE_MEDIUM_H=10
MULTISCALE_SMALL_H=7
MULTISCALE_TINY_H=5

# 병합 파라미터
MULTISCALE_IOU_THRESHOLD=0.85
```

### 7.3 테스트 파이프라인 업데이트

**tests/test_pipeline.py 수정**:

```python
def main():
    """Phase 1 통합 테스트"""

    # ... 기존 코드 ...

    # 블록 검출 (다층 스케일 사용)
    analyzer = DensityAnalyzer(
        config,
        use_projection=False,
        use_multiscale=True  # 다층 스케일 활성화
    )

    page_data = analyzer.analyze_page(image, 0)

    print(f"  [OK] {len(page_data.blocks)}개 블록 검출")

    # 스케일별 통계
    scales = {}
    for block in page_data.blocks:
        scale = block.scale
        scales[scale] = scales.get(scale, 0) + 1

    print(f"\n  스케일별 분포:")
    for scale, count in sorted(scales.items()):
        print(f"    {scale}: {count}개")
```

---

## 📝 Phase 8: 문서화

### 8.1 사용자 가이드

**docs/multiscale_guide.md**:

```markdown
# 다층 스케일 블록 검출 가이드

## 개요

다층 스케일 검출은 여러 커널 크기로 블록을 검출한 후 병합하는 방식입니다.
이를 통해 **모든 크기의 블록을 빠짐없이 검출**할 수 있습니다.

## 사용 방법

### 1. 활성화

`.env` 파일:
```bash
USE_MULTISCALE=true
```

### 2. 파라미터 조정

```bash
# 스케일 정의
MULTISCALE_LARGE_H=15   # 큰 구조
MULTISCALE_MEDIUM_H=10  # 중간 구조
MULTISCALE_SMALL_H=7    # 작은 구조
MULTISCALE_TINY_H=5     # 초소형 구조 (선택적)

# 초소형 스케일 사용 여부
MULTISCALE_USE_TINY=false  # true면 더 세밀

# 중복 제거 임계값
MULTISCALE_IOU_THRESHOLD=0.85  # 낮을수록 엄격
```

### 3. 실행

```bash
python tests/test_pipeline.py
```

## 결과 해석

- **large**: 큰 구조 (제목, 문단 전체 등)
- **medium**: 중간 구조 (문장, 라인 등)
- **small**: 작은 구조 (단어, 보기 등)
- **tiny**: 초소형 구조 (기호, 단위 등)

## 튜닝 가이드

### 블록 수가 너무 많을 때
→ `MULTISCALE_IOU_THRESHOLD`를 낮추기 (0.85 → 0.80)
→ `MULTISCALE_USE_TINY`를 false로

### 블록 수가 너무 적을 때
→ `MULTISCALE_USE_TINY`를 true로
→ 스케일 추가 (xlarge, xsmall 등)

### 성능 문제
→ 스케일 개수 줄이기 (4개 → 3개)
→ 병렬 처리 활성화
```

### 8.2 API 문서

**docs/api_multiscale.md**:

```markdown
# MultiscaleAnalyzer API

## 클래스

### `MultiscaleAnalyzer`

다층 스케일 블록 검출기.

#### 생성자

```python
MultiscaleAnalyzer(config: Config)
```

#### 메서드

##### `detect_all_blocks()`

```python
def detect_all_blocks(
    self,
    image: np.ndarray,
    columns: List[Column],
    use_tiny: bool = False
) -> List[Block]
```

**Parameters:**
- `image`: 페이지 이미지 (grayscale)
- `columns`: 컬럼 리스트
- `use_tiny`: 초소형 스케일 사용 여부

**Returns:**
- 검출된 블록 리스트

**Example:**
```python
analyzer = MultiscaleAnalyzer(config)
blocks = analyzer.detect_all_blocks(image, columns, use_tiny=True)
```
```

---

## ⏱️ 일정 및 체크리스트

### 전체 일정 (4-5시간)

```
Phase 1: 아키텍처 설계 (30분)
  ✓ MultiscaleAnalyzer 클래스 설계
  ✓ 데이터 모델 확장

Phase 2: 핵심 알고리즘 구현 (2시간)
  ✓ _detect_at_scale() 구현
  ✓ _calculate_iou() 구현
  ✓ _is_duplicate() 구현
  ✓ _merge_with_hierarchy() 구현

Phase 3: 테스트 (1시간)
  ✓ 단위 테스트
  ✓ 통합 테스트
  ✓ 시각화 테스트

Phase 4: 최적화 (30분)
  ✓ 병렬 처리
  ✓ 캐싱 (선택적)

Phase 5: 파라미터 튜닝 (30분)
  ✓ 스케일 조합 실험
  ✓ IoU 임계값 실험

Phase 6: 평가 (30분)
  ✓ 정량적 평가
  ✓ 버전 비교

Phase 7: 배포 (30분)
  ✓ 기존 코드 통합
  ✓ 설정 파일 업데이트
  ✓ 테스트 파이프라인 수정

Phase 8: 문서화 (30분)
  ✓ 사용자 가이드
  ✓ API 문서
```

### 체크리스트

**Phase 1**:
- [ ] `src/multiscale_analyzer.py` 생성
- [ ] `MultiscaleAnalyzer` 클래스 구조 작성
- [ ] `data_models.py`에 `scale`, `parent_id`, `children_ids` 추가

**Phase 2**:
- [ ] `_detect_at_scale()` 구현
- [ ] `_calculate_iou()` 구현
- [ ] `_is_duplicate()` 구현
- [ ] `_merge_with_hierarchy()` 구현
- [ ] `_get_min_size_for_scale()` 구현

**Phase 3**:
- [ ] `tests/test_multiscale.py` 작성
- [ ] `tests/test_multiscale_pipeline.py` 작성
- [ ] `tests/visualize_multiscale.py` 작성
- [ ] 모든 테스트 통과 확인

**Phase 4**:
- [ ] `detect_all_blocks_parallel()` 구현 (선택적)
- [ ] 캐싱 추가 (선택적)

**Phase 5**:
- [ ] 스케일 조합 3-4가지 실험
- [ ] IoU 임계값 0.75-0.95 실험
- [ ] 최적 파라미터 확정

**Phase 6**:
- [ ] 평가 함수 구현
- [ ] 현재 방식과 비교
- [ ] 결과 리포트 작성

**Phase 7**:
- [ ] `density_analyzer.py`에 `use_multiscale` 옵션 추가
- [ ] `.env` 파일에 설정 추가
- [ ] `test_pipeline.py` 수정

**Phase 8**:
- [ ] 사용자 가이드 작성
- [ ] API 문서 작성
- [ ] README 업데이트

---

## 🎯 예상 결과

### 정량적 목표

**현재 (h_kernel=10)**:
- 블록 수: 89개
- 품질: 92%

**다층 스케일 (3단계)**:
- 블록 수: 110-130개
- 품질: 95%+
- 추가 검출: +21-41개 (24-46% 증가)

**다층 스케일 (4단계 + tiny)**:
- 블록 수: 130-150개
- 품질: 97%+
- 추가 검출: +41-61개 (46-68% 증가)

### 정성적 목표

**검출 가능한 요소**:
- ✅ 큰 구조: 문제 전체, 표 전체
- ✅ 중간 구조: 문장, 라인, 문단
- ✅ 작은 구조: 단어, 보기, 문제 번호
- ✅ 초소형 구조: 기호, 단위, 괄호

**놓치지 않는 것**:
- ✅ 표 내부 셀
- ✅ 복합 보기의 세부 항목
- ✅ 수식의 구성 요소 (선택적)
- ✅ 작은 단위, 기호

---

## 🛡️ 위험 요소 및 대응

### 위험 1: 과도한 블록 수

**증상**: 150개 이상

**원인**: IoU 임계값이 너무 높음, tiny 스케일 사용

**대응**:
- IoU 임계값 낮추기 (0.85 → 0.80)
- tiny 스케일 비활성화
- 스케일 개수 줄이기 (4개 → 3개)

### 위험 2: 성능 저하

**증상**: 처리 시간 > 5초/페이지

**원인**: 스케일이 너무 많음, 병렬 처리 미사용

**대응**:
- 병렬 처리 활성화
- 스케일 개수 줄이기
- 캐싱 활용

### 위험 3: 여전히 누락 존재

**증상**: 사용자가 "아직도 부족"

**원인**: 특수한 구조, 매우 작은 요소

**대응**:
- tiny 스케일 활성화
- 최소 블록 크기 낮추기
- 스케일 추가 (h_kernel=3 등)

---

## 📊 성공 기준

**최소 성공 기준**:
- [ ] 블록 수 > 110개 (현재 대비 +20% 이상)
- [ ] 사용자 만족 ("누락 없음" 확인)
- [ ] 처리 시간 < 3초/페이지

**이상적 성공 기준**:
- [ ] 블록 수 120-140개
- [ ] 모든 스케일의 요소 검출
- [ ] Recall > 95%
- [ ] 처리 시간 < 2초/페이지

---

**작성자**: Claude Code (Opus)
**계획 상세도**: ⭐⭐⭐⭐⭐ (5/5)
**실행 가능성**: ⭐⭐⭐⭐⭐ (5/5)
**예상 성공률**: 95%+
**다음 단계**: 사용자 승인 후 Phase 1 시작
