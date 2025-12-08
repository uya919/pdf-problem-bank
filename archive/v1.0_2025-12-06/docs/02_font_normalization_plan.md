# 폰트 크기 정규화 기능 구현 계획

**작성일:** 2025-11-17
**작성자:** Claude Code
**상태:** 계획 단계 (Phase 0)
**난이도:** 중상 (8.5/10 feasibility)
**예상 소요 시간:** 2-3일 (12-18시간)

---

## 📋 목차

1. [개요 및 배경](#1-개요-및-배경)
2. [기술적 목표](#2-기술적-목표)
3. [핵심 알고리즘 설계](#3-핵심-알고리즘-설계)
4. [Phase A: MVP 구현](#4-phase-a-mvp-구현)
5. [Phase B: 견고성 강화](#5-phase-b-견고성-강화)
6. [Phase C: 프로덕션 준비](#6-phase-c-프로덕션-준비)
7. [테스트 전략](#7-테스트-전략)
8. [리스크 관리 및 롤백](#8-리스크-관리-및-롤백)
9. [성공 지표](#9-성공-지표)
10. [타임라인](#10-타임라인)

---

## 1. 개요 및 배경

### 1.1 문제 정의

현재 시스템은 서로 다른 문제집(교재)에서 문제 이미지를 추출할 때, **각 교재마다 폰트 크기가 다르다**는 문제가 있다.

**예시:**
- 교재 A: 본문 폰트 24px
- 교재 B: 본문 폰트 18px
- 교재 C: 본문 폰트 30px

이로 인해:
- 딥러닝 모델 학습 시 폰트 크기 편차가 모델 성능에 악영향
- 문제 이미지 시각적 일관성 부족
- 데이터셋 품질 저하

### 1.2 기존 해결 방법의 한계

**OCR 기반 접근:**
- 정확한 텍스트 검출 가능
- 하지만 **수식(LaTeX, MathML)** 처리 어려움
- 라이브러리 의존성 증가 (Tesseract, PaddleOCR 등)
- 처리 속도 느림

### 1.3 제안하는 해결책

**OCR 없이 이미지 분석만으로 폰트 크기 추정 및 정규화**

**핵심 아이디어:**
- 대부분의 문제는 70% 이상이 일반 텍스트
- Connected Components 분석으로 문자 후보 추출
- 통계적 필터링으로 본문 텍스트 높이 추정
- 목표 높이(예: 22px)로 스케일링

**장점:**
- OCR 불필요 → 수식 처리 문제 없음
- 빠른 처리 속도
- 간단한 구현
- 기존 파이프라인과 독립적 (롤백 용이)

---

## 2. 기술적 목표

### 2.1 기능 요구사항

1. **폰트 높이 추정**
   - 입력: 문제 이미지 (PNG)
   - 출력: 추정된 본문 텍스트 높이 (픽셀 단위)
   - 정확도 목표: ±2px 이내

2. **이미지 정규화**
   - 입력: 문제 이미지, 목표 폰트 높이
   - 출력: 스케일링된 이미지
   - 품질: 선명도 유지, 아티팩트 최소화

3. **문서 단위 처리**
   - 한 교재의 여러 문제를 일괄 처리
   - 교재별 평균 폰트 크기 계산
   - 메타데이터 저장 (스케일 팩터, 원본 높이 등)

### 2.2 비기능 요구사항

1. **성능**
   - 이미지당 처리 시간: < 0.5초
   - 100개 문제 일괄 처리: < 1분

2. **견고성**
   - 수식 위주 문제도 처리 가능
   - 노이즈/저화질 이미지 대응
   - 예외 상황 처리 (텍스트 없는 이미지 등)

3. **유지보수성**
   - 독립 모듈 (`src/font_normalizer.py`)
   - 기존 코드 수정 최소화
   - 롤백 가능한 구조

---

## 3. 핵심 알고리즘 설계

### 3.1 전체 워크플로우

```
입력 이미지
    ↓
[1] 이진화 (Binary Thresholding)
    ↓
[2] Connected Components 분석
    ↓
[3] 문자 후보 필터링
    - 크기 필터: 8px ≤ height ≤ 80px
    - 종횡비 필터: aspect_ratio ≤ 3.5
    - 너비비 필터: width_ratio ≤ 5.0
    - 최소 면적: area ≥ 30px²
    ↓
[4] 통계 분석
    - 높이 히스토그램 생성
    - 10-90 백분위 범위 추출 (Trimmed)
    - Mode(최빈값) 계산
    ↓
[5] 폰트 높이 추정
    - 추정 높이 = Mode of trimmed heights
    ↓
[6] 스케일 팩터 계산
    - scale = target_height / estimated_height
    - Clamping: 0.8 ≤ scale ≤ 1.3
    ↓
[7] 이미지 리사이징
    - Upscale: cv2.INTER_CUBIC
    - Downscale: cv2.INTER_AREA
    ↓
출력 이미지
```

### 3.2 알고리즘 상세 설명

#### 3.2.1 이진화 (Binarization)

**목적:** 텍스트와 배경 분리

```python
# Grayscale 변환
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

# Otsu's thresholding
_, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
```

**주의사항:**
- `THRESH_BINARY_INV`: 텍스트가 흰색(255), 배경이 검정(0)이 되도록
- Otsu 방법: 자동으로 최적 임계값 계산

#### 3.2.2 Connected Components 분석

**목적:** 연결된 픽셀 영역(문자 후보) 검출

```python
num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
    binary, connectivity=8
)

# stats 배열 구조:
# [left, top, width, height, area]
```

**출력:**
- `num_labels`: 검출된 컴포넌트 개수
- `stats`: 각 컴포넌트의 bounding box 정보

#### 3.2.3 문자 후보 필터링

**목적:** 노이즈, 구분선, 괄호 등 제거하고 순수 텍스트만 추출

**Filter 1: 크기 범위**
```python
MIN_HEIGHT = 8   # 너무 작은 점/노이즈 제거
MAX_HEIGHT = 80  # 제목/큰 숫자 제외

valid = (height >= MIN_HEIGHT) and (height <= MAX_HEIGHT)
```

**Filter 2: 종횡비 (Aspect Ratio)**
```python
MAX_ASPECT_RATIO = 3.5

aspect_ratio = height / width
valid = aspect_ratio <= MAX_ASPECT_RATIO

# 제외 대상: 긴 괄호 "(", 세로선 "|", 분수선 등
```

**Filter 3: 너비비 (Width Ratio)**
```python
MAX_WIDTH_RATIO = 5.0

width_ratio = width / height
valid = width_ratio <= MAX_WIDTH_RATIO

# 제외 대상: 긴 밑줄 "_____", 구분선 "─────" 등
```

**Filter 4: 최소 면적**
```python
MIN_AREA = 30  # px²

valid = area >= MIN_AREA

# 제외 대상: 매우 작은 점, 아티팩트
```

#### 3.2.4 통계 분석 (Trimmed Histogram + Mode)

**목적:** 이상치(outlier)를 제거하고 본문 텍스트 높이 추정

```python
# Step 1: 높이 리스트 수집
heights = [h for h in filtered_heights]

# Step 2: 10-90 백분위 범위 추출 (Trimming)
p10 = np.percentile(heights, 10)
p90 = np.percentile(heights, 90)
trimmed_heights = [h for h in heights if p10 <= h <= p90]

# Step 3: 히스토그램 생성 (bin size = 1px)
hist, bins = np.histogram(trimmed_heights, bins=range(8, 81))

# Step 4: Mode (최빈값) 계산
mode_height = bins[np.argmax(hist)]
```

**예시:**
```
원본 heights: [10, 11, 12, 12, 13, 13, 13, 14, 50, 60]
              (50, 60은 제목/숫자)

Trimmed (10-90%): [11, 12, 12, 13, 13, 13, 14]

Histogram:
  11: █
  12: ██
  13: ███  ← Mode
  14: █

→ 추정 높이 = 13px
```

#### 3.2.5 스케일 팩터 계산 및 클램핑

```python
TARGET_HEIGHT = 22  # 목표 폰트 높이

scale = TARGET_HEIGHT / estimated_height

# Clamping (과도한 스케일링 방지)
MIN_SCALE = 0.8
MAX_SCALE = 1.3

scale = np.clip(scale, MIN_SCALE, MAX_SCALE)
```

**클램핑 이유:**
- 너무 큰 확대(>1.3): 화질 저하, 블러 발생
- 너무 큰 축소(<0.8): 가독성 저하

#### 3.2.6 이미지 리사이징

```python
new_width = int(img.shape[1] * scale)
new_height = int(img.shape[0] * scale)

if scale > 1.0:
    # Upscaling: INTER_CUBIC (고품질)
    resized = cv2.resize(img, (new_width, new_height),
                         interpolation=cv2.INTER_CUBIC)
else:
    # Downscaling: INTER_AREA (안티앨리어싱)
    resized = cv2.resize(img, (new_width, new_height),
                         interpolation=cv2.INTER_AREA)
```

**Interpolation 선택:**
- `INTER_CUBIC`: 부드러운 확대, 에지 보존
- `INTER_AREA`: 다운스케일 시 모아레 패턴 방지

---

## 4. Phase A: MVP 구현

**목표:** 기본 동작하는 프로토타입 완성
**기간:** 1일 (6-8시간)

### 4.1 파일 구조

```
src/
  font_normalizer.py        # 메인 모듈
scripts/
  test_font_normalization.py  # 테스트 스크립트
```

### 4.2 구현 상세

#### 4.2.1 `src/font_normalizer.py`

**Class: FontNormalizer**

```python
class FontNormalizer:
    """폰트 크기 정규화 (OCR-free)"""

    def __init__(
        self,
        target_height: int = 22,
        min_scale: float = 0.8,
        max_scale: float = 1.3
    ):
        """
        Args:
            target_height: 목표 폰트 높이 (픽셀)
            min_scale: 최소 스케일 팩터
            max_scale: 최대 스케일 팩터
        """
        self.target_height = target_height
        self.min_scale = min_scale
        self.max_scale = max_scale

        # 필터링 파라미터
        self.min_height = 8
        self.max_height = 80
        self.max_aspect_ratio = 3.5
        self.max_width_ratio = 5.0
        self.min_area = 30

    def estimate_text_height(self, img: np.ndarray) -> Optional[float]:
        """
        이미지에서 본문 텍스트 높이 추정

        Args:
            img: BGR 이미지 (numpy array)

        Returns:
            추정된 높이 (픽셀), 실패 시 None
        """
        # 1. 이진화
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        _, binary = cv2.threshold(gray, 0, 255,
                                   cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        # 2. Connected Components
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
            binary, connectivity=8
        )

        # 3. 필터링
        valid_heights = []
        for i in range(1, num_labels):  # 0은 배경
            x, y, w, h, area = stats[i]

            # Filter 1: 크기 범위
            if h < self.min_height or h > self.max_height:
                continue

            # Filter 2: 종횡비
            if h / w > self.max_aspect_ratio:
                continue

            # Filter 3: 너비비
            if w / h > self.max_width_ratio:
                continue

            # Filter 4: 최소 면적
            if area < self.min_area:
                continue

            valid_heights.append(h)

        # 4. 통계 분석
        if len(valid_heights) < 15:
            # 유효 컴포넌트 부족
            return None

        # Trimmed histogram
        p10 = np.percentile(valid_heights, 10)
        p90 = np.percentile(valid_heights, 90)
        trimmed = [h for h in valid_heights if p10 <= h <= p90]

        if len(trimmed) < 5:
            return None

        # Mode 계산
        hist, bins = np.histogram(trimmed, bins=range(self.min_height, self.max_height+1))
        mode_idx = np.argmax(hist)
        mode_height = bins[mode_idx]

        return float(mode_height)

    def compute_scale(self, estimated_height: float) -> float:
        """
        스케일 팩터 계산

        Args:
            estimated_height: 추정된 폰트 높이

        Returns:
            클램핑된 스케일 팩터
        """
        scale = self.target_height / estimated_height
        return np.clip(scale, self.min_scale, self.max_scale)

    def resize_image(self, img: np.ndarray, scale: float) -> np.ndarray:
        """
        이미지 리사이징

        Args:
            img: 입력 이미지
            scale: 스케일 팩터

        Returns:
            리사이징된 이미지
        """
        new_h = int(img.shape[0] * scale)
        new_w = int(img.shape[1] * scale)

        interp = cv2.INTER_CUBIC if scale > 1.0 else cv2.INTER_AREA
        return cv2.resize(img, (new_w, new_h), interpolation=interp)

    def normalize_image(
        self,
        image_path: Path
    ) -> Tuple[Optional[np.ndarray], Optional[float], Optional[float]]:
        """
        이미지 정규화 (전체 파이프라인)

        Args:
            image_path: 입력 이미지 경로

        Returns:
            (정규화된 이미지, 추정 높이, 스케일 팩터)
            실패 시 (None, None, None)
        """
        from utils import imread_unicode

        # 이미지 로드
        img = imread_unicode(image_path)
        if img is None:
            print(f"[FontNormalizer] 이미지 로드 실패: {image_path}")
            return None, None, None

        # 높이 추정
        estimated_height = self.estimate_text_height(img)
        if estimated_height is None:
            print(f"[FontNormalizer] 텍스트 높이 추정 실패: {image_path}")
            return None, None, None

        # 스케일 계산
        scale = self.compute_scale(estimated_height)

        # 리사이징
        normalized = self.resize_image(img, scale)

        print(f"[FontNormalizer] {image_path.name}: "
              f"높이 {estimated_height:.1f}px → {self.target_height}px "
              f"(scale={scale:.3f})")

        return normalized, estimated_height, scale
```

#### 4.2.2 `scripts/test_font_normalization.py`

```python
"""
폰트 정규화 테스트 스크립트

사용법:
  python scripts/test_font_normalization.py
"""
from pathlib import Path
import sys

# 프로젝트 루트를 sys.path에 추가
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "src"))

from font_normalizer import FontNormalizer
from utils import imwrite_unicode
import cv2

def main():
    print("=== 폰트 정규화 테스트 ===\n")

    # 테스트할 문제 이미지들
    test_images = [
        Path("dataset_root/problems/베이직쎈 수학2 2022_본문_page0001_L1.png"),
        Path("dataset_root/problems/베이직쎈 수학2 2022_본문_page0001_L2.png"),
    ]

    # 출력 디렉토리
    output_dir = Path("dataset_root/normalized_test")
    output_dir.mkdir(parents=True, exist_ok=True)

    # Normalizer 생성
    normalizer = FontNormalizer(target_height=22)

    # 각 이미지 처리
    for img_path in test_images:
        if not img_path.exists():
            print(f"[SKIP] 파일 없음: {img_path}")
            continue

        print(f"\n처리 중: {img_path.name}")

        # 정규화
        normalized, est_height, scale = normalizer.normalize_image(img_path)

        if normalized is None:
            print(f"  → 실패")
            continue

        # 저장
        output_path = output_dir / f"normalized_{img_path.name}"
        success = imwrite_unicode(output_path, normalized)

        if success:
            print(f"  → 저장 완료: {output_path}")
            print(f"     추정 높이: {est_height:.1f}px")
            print(f"     스케일: {scale:.3f}x")
            print(f"     크기: {normalized.shape[1]}x{normalized.shape[0]}px")
        else:
            print(f"  → 저장 실패")

    print(f"\n\n결과 확인: {output_dir}")
    print("완료!")

if __name__ == "__main__":
    main()
```

### 4.3 MVP 테스트 절차

1. **준비:**
   ```bash
   # 테스트용 문제 이미지 확인
   dir dataset_root\problems\*.png
   ```

2. **실행:**
   ```bash
   python scripts/test_font_normalization.py
   ```

3. **기대 출력:**
   ```
   === 폰트 정규화 테스트 ===

   처리 중: 베이직쎈 수학2 2022_본문_page0001_L1.png
   [FontNormalizer] 베이직쎈 수학2 2022_본문_page0001_L1.png: 높이 18.0px → 22px (scale=1.222)
     → 저장 완료: dataset_root\normalized_test\normalized_베이직쎈 수학2 2022_본문_page0001_L1.png
        추정 높이: 18.0px
        스케일: 1.222x
        크기: 520x680px

   처리 중: 베이직쎈 수학2 2022_본문_page0001_L2.png
   [FontNormalizer] 베이직쎈 수학2 2022_본문_page0001_L2.png: 높이 24.0px → 22px (scale=0.917)
     → 저장 완료: dataset_root\normalized_test\normalized_베이직쎈 수학2 2022_본문_page0001_L2.png
        추정 높이: 24.0px
        스케일: 0.917x
        크기: 440x560px

   결과 확인: dataset_root\normalized_test
   완료!
   ```

4. **수동 검증:**
   - `dataset_root/normalized_test/` 폴더의 이미지 열기
   - 폰트 크기가 비슷해졌는지 육안 확인
   - 선명도, 가독성 확인

### 4.4 MVP 성공 기준

- [ ] 정상 이미지 3개 이상에서 높이 추정 성공
- [ ] 추정 오차 ±3px 이내
- [ ] 리사이징 후 선명도 유지
- [ ] 한글 경로 처리 정상 동작

---

## 5. Phase B: 견고성 강화

**목표:** 예외 상황 처리 및 품질 개선
**기간:** 1일 (6-8시간)

### 5.1 개선 사항 목록

#### 5.1.1 문서 단위 평균 계산

**문제:**
- 수식 위주 문제는 텍스트 높이 추정 실패 가능
- 개별 문제마다 다른 스케일 적용 시 일관성 저하

**해결:**
```python
def estimate_document_text_height(
    problem_image_paths: List[Path],
    sample_size: int = 20
) -> float:
    """
    문서(교재) 전체의 평균 폰트 높이 추정

    Args:
        problem_image_paths: 문제 이미지 경로 리스트
        sample_size: 샘플링할 이미지 개수

    Returns:
        평균 폰트 높이
    """
    normalizer = FontNormalizer()

    # 샘플링 (너무 많으면 랜덤 샘플)
    if len(problem_image_paths) > sample_size:
        samples = random.sample(problem_image_paths, sample_size)
    else:
        samples = problem_image_paths

    heights = []
    for img_path in samples:
        img = imread_unicode(img_path)
        if img is None:
            continue

        height = normalizer.estimate_text_height(img)
        if height is not None:
            heights.append(height)

    if len(heights) < 5:
        raise ValueError("유효한 샘플 부족 (최소 5개 필요)")

    # Median 사용 (이상치에 강건)
    return np.median(heights)
```

#### 5.1.2 이중 모드(Bimodal) 처리

**문제:**
- 일부 교재는 본문(12px)과 문제번호(16px)가 섞여 있음
- 히스토그램이 두 개의 피크를 가질 수 있음

**해결:**
```python
def detect_bimodal_and_average(hist, bins):
    """
    이중 모드 검출 및 평균 계산

    Returns:
        평균 높이
    """
    from scipy.signal import find_peaks

    # 피크 검출
    peaks, _ = find_peaks(hist, height=len(hist)*0.1)  # 10% 이상만

    if len(peaks) == 2:
        # 두 피크의 가중 평균
        h1, h2 = bins[peaks[0]], bins[peaks[1]]
        w1, w2 = hist[peaks[0]], hist[peaks[1]]

        avg = (h1 * w1 + h2 * w2) / (w1 + w2)
        print(f"  [Bimodal 검출] {h1}px ({w1}개), {h2}px ({w2}개) → 평균 {avg:.1f}px")
        return avg
    else:
        # 단일 모드
        return bins[np.argmax(hist)]
```

#### 5.1.3 화질 개선 (Sharpening)

**문제:**
- 20% 이상 확대 시 블러 발생 가능

**해결:**
```python
def apply_sharpening(img: np.ndarray, scale: float) -> np.ndarray:
    """
    확대 이미지에 샤프닝 적용

    Args:
        img: 입력 이미지
        scale: 스케일 팩터

    Returns:
        샤프닝된 이미지
    """
    if scale <= 1.2:
        return img  # 필요 없음

    # Unsharp Mask
    kernel = np.array([
        [0, -1, 0],
        [-1, 5, -1],
        [0, -1, 0]
    ])

    sharpened = cv2.filter2D(img, -1, kernel)

    # 원본과 블렌딩 (과도한 샤프닝 방지)
    alpha = 0.3  # 샤프닝 강도
    result = cv2.addWeighted(img, 1 - alpha, sharpened, alpha, 0)

    return result
```

#### 5.1.4 폴백(Fallback) 로직

**문제:**
- 텍스트가 거의 없는 이미지 (도표, 그래프만)
- 컴포넌트 개수 부족

**해결:**
```python
def normalize_image_with_fallback(
    self,
    image_path: Path,
    fallback_height: Optional[float] = None
) -> Tuple[Optional[np.ndarray], Optional[float], Optional[float]]:
    """
    Fallback 지원 정규화

    Args:
        image_path: 이미지 경로
        fallback_height: 추정 실패 시 사용할 기본 높이

    Returns:
        (정규화 이미지, 추정 높이, 스케일)
    """
    img = imread_unicode(image_path)
    if img is None:
        return None, None, None

    # 높이 추정 시도
    estimated_height = self.estimate_text_height(img)

    if estimated_height is None:
        if fallback_height is not None:
            print(f"  [Fallback] 기본 높이 {fallback_height}px 사용")
            estimated_height = fallback_height
        else:
            print(f"  [Skip] 정규화 건너뜀 (텍스트 추정 실패)")
            return img, None, 1.0  # 원본 그대로 반환

    # 나머지 동일
    scale = self.compute_scale(estimated_height)
    normalized = self.resize_image(img, scale)

    return normalized, estimated_height, scale
```

### 5.2 Phase B 테스트

**테스트 케이스:**
1. 정상 문제 (텍스트 70% 이상)
2. 수식 위주 문제 (텍스트 30% 미만)
3. 도표/그래프만 있는 문제
4. 저화질 이미지 (스캔 품질 낮음)
5. 이중 폰트 크기 혼재

**성공 기준:**
- [ ] 정상 케이스 95% 성공
- [ ] 수식 위주 케이스 70% 성공
- [ ] 도표 케이스 Fallback 동작 확인
- [ ] 문서 평균 계산 정상 동작

---

## 6. Phase C: 프로덕션 준비

**목표:** GUI 통합 및 대량 처리
**기간:** 0.5일 (3-4시간)

### 6.1 GUI 통합

#### 6.1.1 Export 다이얼로그에 옵션 추가

**파일:** `src/gui/main_window.py`

```python
def on_export_problems(self):
    """문제 Export (수정)"""
    # 기존 코드...

    # 다이얼로그에 체크박스 추가
    dialog = QDialog(self)
    dialog.setWindowTitle("Export Problems")

    layout = QVBoxLayout()

    # 폰트 정규화 옵션
    normalize_checkbox = QCheckBox("폰트 크기 정규화 적용")
    normalize_checkbox.setChecked(True)  # 기본값: 활성화
    layout.addWidget(normalize_checkbox)

    # 목표 높이 설정
    height_layout = QHBoxLayout()
    height_layout.addWidget(QLabel("목표 폰트 높이 (px):"))
    height_spinbox = QSpinBox()
    height_spinbox.setRange(16, 32)
    height_spinbox.setValue(22)  # 기본값
    height_layout.addWidget(height_spinbox)
    layout.addLayout(height_layout)

    # 나머지 다이얼로그 구성...

    if dialog.exec_() == QDialog.Accepted:
        apply_normalize = normalize_checkbox.isChecked()
        target_height = height_spinbox.value()

        # Export 로직 수정
        self._export_with_normalization(
            document_id=...,
            apply_normalize=apply_normalize,
            target_height=target_height
        )

def _export_with_normalization(
    self,
    document_id: str,
    apply_normalize: bool,
    target_height: int
):
    """정규화 옵션 포함 Export"""
    from font_normalizer import FontNormalizer

    if apply_normalize:
        normalizer = FontNormalizer(target_height=target_height)

        # 1단계: 문서 평균 높이 계산
        all_problem_paths = self._get_all_problem_paths(document_id)
        avg_height = normalizer.estimate_document_text_height(all_problem_paths)

        print(f"[Export] 문서 평균 폰트 높이: {avg_height:.1f}px")

        # 2단계: 각 문제 정규화 및 저장
        for problem_path in all_problem_paths:
            normalized, _, scale = normalizer.normalize_image_with_fallback(
                problem_path,
                fallback_height=avg_height
            )

            if normalized is not None:
                # 원본 덮어쓰기 OR 별도 폴더에 저장
                output_path = problem_path.parent / f"normalized_{problem_path.name}"
                imwrite_unicode(output_path, normalized)
    else:
        # 기존 Export 로직
        pass
```

### 6.2 메타데이터 저장

**구조:**
```json
{
  "document_id": "베이직쎈 수학2 2022_본문",
  "normalization_applied": true,
  "target_height": 22,
  "estimated_avg_height": 18.3,
  "scale_factor": 1.202,
  "processed_at": "2025-11-17T14:30:00",
  "problems": [
    {
      "id": "L1",
      "page": 1,
      "original_height": 18.0,
      "scale": 1.222
    },
    {
      "id": "L2",
      "page": 1,
      "original_height": 17.5,
      "scale": 1.257
    }
  ]
}
```

**저장 위치:**
```
dataset_root/
  labels/
    {document_id}/
      normalization_meta.json
```

### 6.3 배치 처리 스크립트

**파일:** `scripts/batch_normalize.py`

```python
"""
대량 문서 정규화 배치 스크립트

사용법:
  python scripts/batch_normalize.py --input dataset_root/problems --output dataset_root/problems_normalized
"""
import argparse
from pathlib import Path
import sys

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "src"))

from font_normalizer import FontNormalizer
from utils import imread_unicode, imwrite_unicode
import json

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="입력 폴더")
    parser.add_argument("--output", required=True, help="출력 폴더")
    parser.add_argument("--target-height", type=int, default=22)
    args = parser.parse_args()

    input_dir = Path(args.input)
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    # 문서별로 그룹핑
    documents = {}
    for img_path in input_dir.glob("**/*.png"):
        # 파일명 패턴: {doc_id}_page{num}_{group_id}.png
        doc_id = "_".join(img_path.stem.split("_")[:-2])

        if doc_id not in documents:
            documents[doc_id] = []
        documents[doc_id].append(img_path)

    print(f"총 {len(documents)}개 문서 발견\n")

    # 문서별 처리
    for doc_id, image_paths in documents.items():
        print(f"=== {doc_id} ({len(image_paths)}개 문제) ===")

        normalizer = FontNormalizer(target_height=args.target_height)

        # 평균 높이 계산
        avg_height = normalizer.estimate_document_text_height(image_paths)
        print(f"  평균 폰트 높이: {avg_height:.1f}px")

        # 각 문제 정규화
        metadata = {
            "document_id": doc_id,
            "target_height": args.target_height,
            "estimated_avg_height": avg_height,
            "problems": []
        }

        for img_path in image_paths:
            normalized, est_h, scale = normalizer.normalize_image_with_fallback(
                img_path, fallback_height=avg_height
            )

            if normalized is not None:
                # 저장
                rel_path = img_path.relative_to(input_dir)
                output_path = output_dir / rel_path
                output_path.parent.mkdir(parents=True, exist_ok=True)

                imwrite_unicode(output_path, normalized)

                # 메타데이터 기록
                metadata["problems"].append({
                    "file": str(rel_path),
                    "original_height": est_h,
                    "scale": scale
                })

        # 메타데이터 저장
        meta_path = output_dir / f"{doc_id}_normalization_meta.json"
        with open(meta_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)

        print(f"  → 완료! ({len(metadata['problems'])}개 처리)\n")

    print("전체 배치 처리 완료!")

if __name__ == "__main__":
    main()
```

### 6.4 Phase C 성공 기준

- [ ] GUI Export 다이얼로그에 옵션 추가 완료
- [ ] 메타데이터 JSON 정상 저장
- [ ] 배치 스크립트로 100개 이상 문제 일괄 처리 성공
- [ ] 처리 속도: 100개 문제 < 1분

---

## 7. 테스트 전략

### 7.1 단위 테스트 (Unit Test)

**파일:** `tests/test_font_normalizer.py`

```python
import pytest
import numpy as np
from font_normalizer import FontNormalizer

def test_estimate_text_height_normal():
    """정상 텍스트 이미지 테스트"""
    normalizer = FontNormalizer()

    # 테스트 이미지 로드
    img = cv2.imread("tests/fixtures/normal_text.png")

    height = normalizer.estimate_text_height(img)

    assert height is not None
    assert 10 <= height <= 30  # 합리적인 범위

def test_estimate_text_height_formula_heavy():
    """수식 위주 이미지 테스트"""
    normalizer = FontNormalizer()

    img = cv2.imread("tests/fixtures/formula_heavy.png")

    height = normalizer.estimate_text_height(img)

    # 실패 가능 (None 허용)
    if height is not None:
        assert 10 <= height <= 40

def test_compute_scale_clamping():
    """스케일 클램핑 테스트"""
    normalizer = FontNormalizer(target_height=22)

    # 매우 작은 폰트 (10px) → 2.2배 확대 → 1.3으로 클램핑
    scale = normalizer.compute_scale(10)
    assert scale == 1.3

    # 매우 큰 폰트 (50px) → 0.44배 축소 → 0.8로 클램핑
    scale = normalizer.compute_scale(50)
    assert scale == 0.8

def test_resize_image_upscale():
    """확대 리사이징 테스트"""
    normalizer = FontNormalizer()

    img = np.zeros((100, 100, 3), dtype=np.uint8)

    resized = normalizer.resize_image(img, scale=1.5)

    assert resized.shape[0] == 150
    assert resized.shape[1] == 150
```

### 7.2 통합 테스트 (Integration Test)

**테스트 시나리오:**

1. **시나리오 1: 단일 교재 전체 처리**
   - 입력: 베이직쎈 수학2 (50페이지, 200문제)
   - 출력: 정규화된 문제 이미지 + 메타데이터
   - 검증:
     - 모든 문제 처리 완료
     - 평균 폰트 높이 22px ± 2px
     - 메타데이터 JSON 유효성

2. **시나리오 2: 다양한 교재 혼합**
   - 입력: 3개 교재 (폰트 크기 각각 18px, 24px, 30px)
   - 출력: 교재별 정규화
   - 검증:
     - 교재 간 일관성 (모두 22px 목표)
     - 원본 대비 품질 저하 없음

3. **시나리오 3: 예외 케이스**
   - 입력: 수식만, 도표만, 빈 페이지
   - 출력: Fallback 또는 Skip
   - 검증:
     - 에러 없이 처리
     - 로그 메시지 출력

### 7.3 품질 검증 (Quality Assurance)

**자동 검증 메트릭:**

1. **폰트 높이 일관성**
   ```python
   def validate_font_consistency(normalized_images):
       """정규화 후 폰트 높이 일관성 검증"""
       heights = []
       for img_path in normalized_images:
           h = estimate_text_height(img_path)
           if h is not None:
               heights.append(h)

       mean_h = np.mean(heights)
       std_h = np.std(heights)

       # 표준편차 < 2px 기대
       assert std_h < 2.0, f"높이 편차 과다: {std_h:.2f}px"
   ```

2. **화질 평가 (PSNR)**
   ```python
   def compute_quality_score(original, normalized):
       """원본 대비 정규화 이미지 품질"""
       # 같은 크기로 리사이징 후 비교
       norm_resized = cv2.resize(normalized, (original.shape[1], original.shape[0]))

       psnr = cv2.PSNR(original, norm_resized)

       # PSNR > 30dB이면 양호
       return psnr
   ```

**수동 검증:**
- 랜덤 샘플 20개 육안 확인
- 선명도, 가독성, 아티팩트 체크

---

## 8. 리스크 관리 및 롤백

### 8.1 주요 리스크

| 리스크 | 확률 | 영향도 | 완화 전략 |
|--------|------|--------|-----------|
| 수식 위주 문제 추정 실패 | 중 | 중 | 문서 평균 Fallback |
| 화질 저하 (과도한 확대) | 중 | 중 | 스케일 클램핑 + 샤프닝 |
| 한글 경로 처리 오류 | 낮 | 높 | imread_unicode 사용 |
| 처리 속도 느림 | 낮 | 낮 | 최적화 (멀티스레딩) |

### 8.2 롤백 절차

**상황 1: 정규화 품질 불만족**

```bash
# 원본 복원 (백업이 있는 경우)
cp -r dataset_root/problems_backup/* dataset_root/problems/

# 또는 메타데이터 기반 역변환
python scripts/reverse_normalization.py --meta dataset_root/labels/normalization_meta.json
```

**상황 2: 코드 버그 발견**

```bash
# 1. font_normalizer.py 삭제
rm src/font_normalizer.py

# 2. 관련 Import 제거
# main_window.py에서 font_normalizer import 주석 처리

# 3. Git revert (버전 관리 중인 경우)
git revert <commit_hash>
```

### 8.3 독립 모듈 설계의 장점

- `font_normalizer.py`는 기존 코드에 의존성 없음
- 삭제해도 기존 기능 영향 없음
- GUI 옵션으로 On/Off 가능

---

## 9. 성공 지표

### 9.1 기술적 지표

| 지표 | 목표 | 측정 방법 |
|------|------|-----------|
| 추정 정확도 | ±2px 이내 | 수동 측정 vs 자동 추정 비교 |
| 처리 속도 | 이미지당 <0.5초 | 타이머 측정 |
| 성공률 | 정상 케이스 95% | 테스트 스위트 pass rate |
| 화질 유지 | PSNR >30dB | cv2.PSNR 계산 |

### 9.2 사용자 만족도 지표

- GUI Export 옵션 사용 편의성
- 정규화 결과 시각적 만족도 (설문)
- 작업 시간 단축 (전/후 비교)

---

## 10. 타임라인

### 10.1 상세 일정

| Phase | 작업 내용 | 소요 시간 | 완료 기준 |
|-------|-----------|-----------|-----------|
| **Phase A** | MVP 구현 | 6-8시간 | 기본 동작 확인 |
| - font_normalizer.py 작성 | 4시간 | estimate_text_height 구현 |
| - test_font_normalization.py 작성 | 1시간 | 테스트 스크립트 완성 |
| - 초기 테스트 | 1-2시간 | 3개 이미지 정상 처리 |
| - 디버깅 | 1-2시간 | 버그 수정 |
| **Phase B** | 견고성 강화 | 6-8시간 | 예외 처리 완료 |
| - 문서 평균 계산 | 2시간 | estimate_document_text_height |
| - Bimodal 처리 | 2시간 | 이중 피크 검출 |
| - 화질 개선 (샤프닝) | 1시간 | apply_sharpening |
| - Fallback 로직 | 1시간 | normalize_with_fallback |
| - 통합 테스트 | 2-3시간 | 다양한 케이스 검증 |
| **Phase C** | 프로덕션 | 3-4시간 | GUI 통합 완료 |
| - GUI 옵션 추가 | 1.5시간 | Export 다이얼로그 |
| - 메타데이터 저장 | 0.5시간 | JSON 구조 정의 |
| - 배치 스크립트 | 1시간 | batch_normalize.py |
| - 최종 검증 | 1시간 | 전체 파이프라인 테스트 |

**총 소요 시간:** 15-20시간 (2-3일)

### 10.2 마일스톤

- **M1 (Day 1 종료)**: MVP 완성, 기본 기능 동작
- **M2 (Day 2 종료)**: 견고성 강화 완료, 대부분 케이스 처리
- **M3 (Day 3 종료)**: GUI 통합, 프로덕션 배포 가능

---

## 11. 다음 단계 (Phase 4+)

### 11.1 추가 개선 아이디어

1. **딥러닝 기반 폰트 크기 예측**
   - CNN 모델로 직접 폰트 높이 회귀
   - 더 정확한 추정 (±1px)

2. **멀티스레딩 최적화**
   - 대량 처리 시 병렬화
   - ThreadPoolExecutor 사용

3. **실시간 미리보기**
   - GUI에서 정규화 전/후 비교
   - 슬라이더로 target_height 조정

4. **자동 품질 평가**
   - 정규화 결과 자동 검증
   - 품질 점수 표시

### 11.2 장기 비전

- **자동 라벨링 파이프라인 통합**
  - 정규화 → 블록 검출 → 그룹핑 → Export
  - 완전 자동화

- **클라우드 배포**
  - 웹 기반 인터페이스
  - NAS 동기화 자동화

---

## 📚 참고 자료

### 논문 및 기술 문서

1. **Connected Components Labeling**
   - [OpenCV Documentation](https://docs.opencv.org/4.x/d3/dc0/group__imgproc__shape.html#gae57b028a2b2ca327227c2399a9d53241)

2. **Image Interpolation Methods**
   - [Comparative Study of Interpolation Methods](https://www.sciencedirect.com/science/article/pii/S1047320318301378)

3. **Unsharp Masking**
   - [Digital Image Sharpening](https://en.wikipedia.org/wiki/Unsharp_masking)

### 코드 예제

- **Histogram Mode Calculation**: NumPy histogram + argmax
- **Percentile Filtering**: np.percentile()
- **Image Resizing**: cv2.resize()

---

## ✅ 체크리스트 (구현 시)

### Phase A
- [ ] `src/font_normalizer.py` 작성
- [ ] `FontNormalizer` 클래스 구현
- [ ] `estimate_text_height()` 메서드 구현
- [ ] `compute_scale()` 메서드 구현
- [ ] `resize_image()` 메서드 구현
- [ ] `normalize_image()` 메서드 구현
- [ ] `scripts/test_font_normalization.py` 작성
- [ ] 초기 테스트 실행 (3개 이미지)

### Phase B
- [ ] `estimate_document_text_height()` 구현
- [ ] `detect_bimodal_and_average()` 구현
- [ ] `apply_sharpening()` 구현
- [ ] `normalize_image_with_fallback()` 구현
- [ ] 통합 테스트 (5가지 케이스)

### Phase C
- [ ] `main_window.py` Export 다이얼로그 수정
- [ ] 메타데이터 JSON 저장 로직
- [ ] `scripts/batch_normalize.py` 작성
- [ ] 최종 검증 (100개 문제 일괄 처리)

---

**작성 완료일:** 2025-11-17
**최종 업데이트:** 2025-11-17
**문서 버전:** 1.0

**다음 단계:** Phase A 구현 시작
