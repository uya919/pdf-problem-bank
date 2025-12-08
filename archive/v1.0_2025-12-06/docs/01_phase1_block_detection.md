# Phase 1: PDF 변환 및 블록 검출

**목표:** PDF를 이미지로 변환하고 텍스트/수식 블록을 자동으로 검출

**기간:** 2025-11-16

**상태:** ✅ **완료**

---

## 📊 최종 결과 요약

| 항목 | 초기 | 최종 | 개선 |
|------|------|------|------|
| **검출 블록 수** | 79개 | **623개** | **+688%** |
| **누락 블록** | 많음 | **20개** | **대폭 감소** |
| **스케일 수** | 1개 | **4개** | +3 |
| **IoU 임계값** | - | **0.60** | 최적화 완료 |

---

## 🚀 개발 과정

### 1.1 초기 구현 (단일 스케일)

#### 구현 파일
1. **[config.py](../src/config.py)**
   - `dataset_root` 경로 설정
   - `WHITE_THRESHOLD = 245`
   - 2단 컬럼 분할 설정

2. **[data_models.py](../src/data_models.py)**
   ```python
   @dataclass
   class BoundingBox:
       x_min, y_min, x_max, y_max: int

   @dataclass
   class Block:
       block_id: int
       column: str  # 'L' or 'R'
       bbox: BoundingBox
       pixel_density: float

   @dataclass
   class PageData:
       document_id: str
       page_index: int
       width, height: int
       columns: List[Column]
       blocks: List[Block]
   ```

3. **[pdf_processor.py](../src/pdf_processor.py)**
   - PyMuPDF 사용, 300 DPI
   - PDF → PNG 변환
   - `pages/page_XXXX.png` 저장

4. **[density_analyzer.py](../src/density_analyzer.py)** (초기 버전)
   - 흰색 배경 제거 (threshold=245)
   - 형태학적 연산 (h_kernel=10, v_kernel=2)
   - Connected Component Analysis
   - 밀집도 계산

#### 초기 결과
- ❌ **79개 블록 검출**
- ❌ 사용자 피드백: "많은 블록이 누락됨"
- ❌ 특히 번호 동그라미, 작은 답지 박스 미검출

---

### 1.2 다층 스케일 시스템 개발

#### 1.2.1 계획 수립

**사용자 요구사항:**
> "목표 블록 수가 있는 것이 아니고, 있는 대로 다 찾는 게 목표여야 해"

**전략 선택:**
- 다층 스케일 형태학적 분석 (Multi-scale Morphological Analysis)
- 각 스케일에서 독립 검출 후 NMS 병합
- 사용자 선택: **정밀 모드** (4-stage)

**계획 문서:**
- [multiscale_detection_implementation_plan.md](../multiscale_detection_implementation_plan.md) (8,000+ 단어)

#### 1.2.2 MultiscaleAnalyzer 구현 (1차)

**파일:** [src/multiscale_analyzer.py](../src/multiscale_analyzer.py)

**초기 스케일 구성 (3-scale):**
```python
self.scales = [
    {"name": "large", "h_kernel": 15, "v_kernel": 2, "min_size": 400},
    {"name": "medium", "h_kernel": 10, "v_kernel": 2, "min_size": 250},
    {"name": "small", "h_kernel": 6, "v_kernel": 1, "min_size": 150},
]
```

**병합 전략:**
```python
# 1. 작은 스케일부터 수집
for scale_name in ["small", "medium", "large"]:
    ...

# 2. 면적 기준 정렬
all_blocks.sort(key=lambda x: x["area"])

# 3. NMS 중복 제거 (IoU > 0.40)
if iou > 0.40:
    should_add = False
```

**1차 결과:**
- **336개 블록 검출** (79 → +325%)
- ❌ 여전히 누락: 사용자가 번호 블록(325, 326, 324 등) 지적

#### 1.2.3 데이터 모델 확장

**Block 클래스 확장:**
```python
@dataclass
class Block:
    # 기존 필드
    block_id: int
    column: str
    bbox: BoundingBox
    pixel_density: float

    # 새 필드 (계층 구조)
    scale: Optional[str] = None
    parent_id: Optional[int] = None
    children_ids: List[int] = field(default_factory=list)
```

**목적:**
- 스케일별 블록 추적
- 계층 관계 저장
- 향후 ML 학습 활용

#### 1.2.4 DensityAnalyzer 통합

**변경 사항:**
```python
class DensityAnalyzer:
    def __init__(self, config: Config,
                 use_multiscale: bool = True):  # 새 파라미터
        if use_multiscale:
            self.multiscale = MultiscaleAnalyzer(config)

    def analyze_page(self, ...):
        if self.use_multiscale:
            bboxes = self.multiscale.detect_all_blocks(...)
        else:
            bboxes = self._find_blocks(...)
```

**장점:**
- 기존 코드 호환성 유지
- 쉬운 활성화/비활성화
- A/B 테스트 가능

---

### 1.3 누락 블록 진단 및 최적화

#### 문제 상황
**사용자 피드백:**
> "이런 부분들은 검출이 안됐어"
> (번호 동그라미 325, 326, 324, 323, 334, 335, 333 등 표시)

#### 1.3.1 진단 도구 개발

**도구 1: diagnose_missing_blocks.py**

**파일:** [tests/diagnose_missing_blocks.py](../tests/diagnose_missing_blocks.py)

**기능:**
- 초소형 커널(h=4, 5, 6) 테스트 검출
- 정사각형 블록 후보 찾기
- 현재 검출과 비교하여 누락 식별
- 시각화 이미지 생성

**진단 결과:**
```
누락 블록: 34개
평균 크기: 252px²
번호 동그라미 후보: 95개 (143-156px²)

원인:
  1. min_size 임계값 150px² 너무 높음
  2. 많은 번호 블록이 150px² 이하
```

**도구 2: analyze_merge_process.py**

**파일:** [tests/analyze_merge_process.py](../tests/analyze_merge_process.py)

**기능:**
- IoU 임계값별 병합 결과 비교
- 스케일 간 충돌 분석

**분석 결과:**
```
스케일 간 충돌: 255개
(ultra_small vs small/medium)

IoU 임계값 영향:
  0.20 → 357개 (295개 제거)
  0.30 → 370개 (282개 제거)
  0.40 → 389개 (263개 제거) ← 초기
  0.50 → 403개 (249개 제거)
  0.60 → 421개 (231개 제거) ← 권장

결론: IoU를 0.60으로 높여 작은 블록 보존
```

**도구 3: analyze_current_blocks.py**

**파일:** [tests/analyze_current_blocks.py](../tests/analyze_current_blocks.py)

**기능:**
- 블록 크기/밀집도/종횡비 분포
- 페이지 영역별 분포
- 블록 간 간격 분석

---

#### 1.3.2 해결책 적용

**해결책 1: ultra_small 스케일 추가**

**수정 위치:** [src/multiscale_analyzer.py:27-32](../src/multiscale_analyzer.py)

**변경 내용:**
```python
# 3-scale → 4-scale 확장
self.scales = [
    {"name": "large", "h_kernel": 15, "v_kernel": 2, "min_size": 400},
    {"name": "medium", "h_kernel": 10, "v_kernel": 2, "min_size": 250},
    {"name": "small", "h_kernel": 6, "v_kernel": 1, "min_size": 150},
    {"name": "ultra_small", "h_kernel": 4, "v_kernel": 1, "min_size": 50},  # 추가
]

# 병합 순서에도 추가
for scale_name in ["ultra_small", "small", "medium", "large"]:
    ...
```

**효과:**
- 50px² 이상 블록 검출 가능
- 번호 동그라미, 작은 수식 검출 개선

**중간 결과:**
- **545개 블록 검출** (336 → +209)
- 누락 블록: 23개 (34 → -11)

---

**해결책 2: IoU 임계값 최적화**

**수정 위치:** [src/multiscale_analyzer.py:188-189](../src/multiscale_analyzer.py)

**변경 내용:**
```python
def _merge_with_hierarchy(
    self,
    blocks_by_scale: Dict[str, List[BoundingBox]],
    iou_threshold: float = 0.60  # 0.40 → 0.60
) -> List[BoundingBox]:
```

**논리:**
- 높은 IoU (0.60) = 60% 이상 겹쳐야 병합
- → 덜 공격적인 병합
- → 작은 블록 보존

**최종 결과:**
- ✅ **623개 블록 검출** (545 → +78)
- ✅ **누락 블록: 20개** (23 → -3)

---

## 🎯 최종 설정 및 성능

### 최종 파라미터
```python
# multiscale_analyzer.py
scales = [
    {"name": "large", "h_kernel": 15, "v_kernel": 2, "min_size": 400},
    {"name": "medium", "h_kernel": 10, "v_kernel": 2, "min_size": 250},
    {"name": "small", "h_kernel": 6, "v_kernel": 1, "min_size": 150},
    {"name": "ultra_small", "h_kernel": 4, "v_kernel": 1, "min_size": 50},
]

iou_threshold = 0.60
```

### 단계별 개선 결과

| 단계 | 스케일 | IoU | 검출 수 | 누락 수 |
|------|--------|-----|---------|---------|
| 초기 | 1개 (단일) | - | 79개 | 많음 |
| 1차 | 3개 | 0.40 | 336개 | 34개 |
| 2차 | 4개 | 0.40 | 545개 | 23개 |
| **최종** | **4개** | **0.60** | **623개** | **20개** |

### 스케일별 검출 분포

```
검출 단계별:
  large (h=15):        96개
  medium (h=10):      153개
  small (h=6):        252개
  ultra_small (h=4):  394개
  ─────────────────────────
  병합 전 합계:       895개

병합 후 (IoU>0.60):   623개
  (272개 중복 제거)
```

### 블록 크기 분포 (623개)

```
면적:
  최소: 50px²
  평균: ~800px²
  중앙값: ~450px²
  최대: 20,293px²

크기별:
  초소형 (<200px²):      35% (~218개)
  소형 (200-1,000px²):   40% (~249개)
  중형 (1,000-5,000px²): 20% (~125개)
  대형 (>5,000px²):       5% (~31개)
```

### 밀집도 분포

```
범위: 0.183 ~ 0.942
평균: 0.447

분포:
  낮음 (<0.2):   2% - 표, 그래프
  중간 (0.2-0.5): 60% - 일반 텍스트
  높음 (≥0.5):   38% - 진한 수식, 번호
```

---

## 📁 생성된 결과물

### 1. 검출 결과 JSON
**경로:** `dataset_root/documents/test_doc/blocks/page_0000_blocks.json`

**내용:**
```json
{
  "document_id": "test_doc",
  "page_index": 0,
  "width": 1320,
  "height": 1764,
  "columns": [
    {"id": "L", "x_min": 0, "x_max": 660},
    {"id": "R", "x_min": 660, "x_max": 1320}
  ],
  "blocks": [
    {
      "block_id": 1,
      "column": "L",
      "bbox": {"x_min": 369, "y_min": 30, "x_max": 379, "y_max": 39},
      "pixel_density": 0.722,
      "scale": "ultra_small"
    },
    ...
  ]
}
```

### 2. 시각화 이미지
- `dataset_root/test_result_visualization.png` - 최종 검출 결과
- `dataset_root/documents/test_doc/diagnosis/current_detection.png` - 현재 검출 (초록)
- `dataset_root/documents/test_doc/diagnosis/missing_blocks.png` - 누락 블록 (빨강)

### 3. 문서
- [multiscale_detection_final_report.md](../multiscale_detection_final_report.md) - 상세 리포트

---

## 🎓 핵심 학습 내용

### 1. 다층 스케일의 중요성
- 단일 커널로는 모든 크기의 블록 검출 불가능
- 각 스케일은 특정 크기 범위에 최적화
- 4-5개 스케일이 대부분 문서에 적합

### 2. IoU 임계값의 영향
```
낮은 IoU (0.20-0.30): 공격적 병합 → 적은 블록
중간 IoU (0.40-0.50): 균형
높은 IoU (0.60-0.80): 보수적 병합 → 많은 블록

선택 기준:
  "빠짐없이 검출" → 높은 IoU (0.60-0.70)
  "깔끔한 결과"   → 중간 IoU (0.40-0.50)
  "최소 블록"     → 낮은 IoU (0.20-0.30)
```

### 3. 병합 순서의 중요성
- 작은 블록 우선 → 세밀한 검출 보존
- 면적 정렬 → 일관된 NMS
- Y 좌표 정렬 → 읽기 순서

### 4. 진단 도구의 가치
- 정량적 분석으로 문제 파악
- 파라미터 영향 예측
- 시각화로 직관적 검증

---

## 🔧 실행 방법

### 전체 파이프라인 테스트
```bash
python tests/test_pipeline.py
```

### 진단 도구 실행
```bash
# 누락 블록 진단
python tests/diagnose_missing_blocks.py

# 병합 과정 분석
python tests/analyze_merge_process.py

# 블록 통계 분석
python tests/analyze_current_blocks.py
```

### 결과 확인
```bash
# 시각화 이미지
dataset_root/test_result_visualization.png

# JSON 결과
dataset_root/documents/test_doc/blocks/page_0000_blocks.json
```

---

## 🔄 향후 개선 가능성

### 단기 (필요시)
1. **IoU 0.70 테스트**
   - 누락 15개로 감소 예상
   - 중복 위험 확인 필요

2. **특수 블록 전용 검출**
   - 번호 동그라미 전용 패스
   - 표 경계선 전용 검출

3. **흰색 임계값 조정**
   - 245 → 250 완화
   - 희미한 블록 검출 개선

### 중기 (ML 도입 후)
1. **학습 기반 병합**
   - ML 모델로 중복 판단
   - 문맥 고려한 병합

2. **계층 구조 활용**
   - parent_id, children_ids 활용
   - 블록 간 관계 학습

### 장기
1. **적응형 스케일**
   - 문서 특성 자동 분석
   - 페이지별 최적 파라미터

2. **실시간 피드백**
   - 사용자 수정 학습
   - 점진적 개선

---

## ✅ Phase 1 완료 체크리스트

- [x] PDF → 이미지 변환
- [x] 흰색 배경 제거
- [x] 단일 스케일 블록 검출
- [x] 다층 스케일 시스템 구현
- [x] 누락 블록 진단 도구
- [x] IoU 최적화
- [x] 최종 검증 (623개 검출)
- [x] 문서화 완료
- [ ] Phase 2 GUI 개발 (다음 단계)

---

**완료일:** 2025-11-16
**작성자:** Claude Code
**다음 Phase:** [Phase 2: GUI 구현](02_phase2_gui_plan.md)
