"""
폰트 크기 정규화 (OCR-free)

Phase 3 확장 기능: 서로 다른 교재의 폰트 크기를 통일
"""
from pathlib import Path
from typing import Optional, Tuple, List
import numpy as np
import cv2
import random

from utils import imread_unicode, imwrite_unicode


class FontNormalizer:
    """
    OCR 없이 이미지 분석만으로 폰트 크기를 추정하고 정규화하는 클래스

    핵심 알고리즘:
    1. 이진화 (Binary Thresholding)
    2. Connected Components 분석
    3. 문자 후보 필터링 (크기, 종횡비, 면적)
    4. 통계 분석 (Trimmed Histogram + Mode)
    5. 스케일 팩터 계산 및 클램핑
    6. 이미지 리사이징
    """

    def __init__(
        self,
        target_height: int = 22,
        min_scale: float = 0.8,
        max_scale: float = 1.3
    ):
        """
        Args:
            target_height: 목표 폰트 높이 (픽셀)
            min_scale: 최소 스케일 팩터 (과도한 축소 방지)
            max_scale: 최대 스케일 팩터 (과도한 확대 방지)
        """
        self.target_height = target_height
        self.min_scale = min_scale
        self.max_scale = max_scale

        # 필터링 파라미터
        self.min_height = 8      # 최소 컴포넌트 높이 (노이즈 제거)
        self.max_height = 80     # 최대 컴포넌트 높이 (제목 제외)
        self.max_aspect_ratio = 3.5   # 최대 종횡비 (긴 괄호 제외)
        self.max_width_ratio = 5.0    # 최대 너비비 (밑줄/구분선 제외)
        self.min_area = 30       # 최소 면적 (px²)

        self.min_components = 15  # 최소 유효 컴포넌트 개수

    def estimate_text_height(self, img: np.ndarray) -> Optional[float]:
        """
        이미지에서 본문 텍스트 높이 추정

        Args:
            img: BGR 이미지 (numpy array)

        Returns:
            추정된 폰트 높이 (픽셀), 실패 시 None
        """
        # 1. 이진화
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        _, binary = cv2.threshold(
            gray, 0, 255,
            cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
        )

        # 2. Connected Components 분석
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

            # Filter 2: 종횡비 (세로로 긴 괄호 제외)
            if w > 0 and h / w > self.max_aspect_ratio:
                continue

            # Filter 3: 너비비 (가로로 긴 밑줄 제외)
            if h > 0 and w / h > self.max_width_ratio:
                continue

            # Filter 4: 최소 면적
            if area < self.min_area:
                continue

            valid_heights.append(h)

        # 4. 통계 분석
        if len(valid_heights) < self.min_components:
            # 유효 컴포넌트 부족
            print(f"  [경고] 유효 컴포넌트 부족: {len(valid_heights)}개 (최소 {self.min_components}개 필요)")
            return None

        # Trimmed histogram (10-90 백분위)
        p10 = np.percentile(valid_heights, 10)
        p90 = np.percentile(valid_heights, 90)
        trimmed = [h for h in valid_heights if p10 <= h <= p90]

        if len(trimmed) < 5:
            print(f"  [경고] Trimmed 컴포넌트 부족: {len(trimmed)}개")
            return None

        # Mode 계산 (Bimodal 검출 포함)
        mode_height = self._calculate_mode_with_bimodal_detection(trimmed)

        return float(mode_height)

    def compute_scale(self, estimated_height: float) -> float:
        """
        스케일 팩터 계산 및 클램핑

        Args:
            estimated_height: 추정된 폰트 높이

        Returns:
            클램핑된 스케일 팩터
        """
        scale = self.target_height / estimated_height
        return np.clip(scale, self.min_scale, self.max_scale)

    def resize_image(self, img: np.ndarray, scale: float) -> np.ndarray:
        """
        이미지 리사이징 (샤프닝 포함)

        확대 시 INTER_CUBIC, 축소 시 INTER_AREA 사용
        1.2배 이상 확대 시 샤프닝 적용

        Args:
            img: 입력 이미지
            scale: 스케일 팩터

        Returns:
            리사이징된 이미지
        """
        new_h = int(img.shape[0] * scale)
        new_w = int(img.shape[1] * scale)

        # 보간 방법 선택
        if scale > 1.0:
            # 확대: INTER_CUBIC (부드러운 확대)
            interp = cv2.INTER_CUBIC
        else:
            # 축소: INTER_AREA (모아레 패턴 방지)
            interp = cv2.INTER_AREA

        resized = cv2.resize(img, (new_w, new_h), interpolation=interp)

        # 큰 확대 시 샤프닝 적용 (Phase B)
        if scale > 1.2:
            resized = self._apply_sharpening(resized, scale)

        return resized

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
        # 이미지 로드 (한글 경로 지원)
        img = imread_unicode(image_path)
        if img is None:
            print(f"[FontNormalizer] 이미지 로드 실패: {image_path}")
            return None, None, None

        # 높이 추정
        estimated_height = self.estimate_text_height(img)
        if estimated_height is None:
            print(f"[FontNormalizer] 텍스트 높이 추정 실패: {image_path.name}")
            return None, None, None

        # 스케일 계산
        scale = self.compute_scale(estimated_height)

        # 리사이징
        normalized = self.resize_image(img, scale)

        print(f"[FontNormalizer] {image_path.name}: "
              f"높이 {estimated_height:.1f}px → {self.target_height}px "
              f"(scale={scale:.3f})")

        return normalized, estimated_height, scale

    def normalize_image_with_fallback(
        self,
        image_path: Path,
        fallback_height: Optional[float] = None
    ) -> Tuple[Optional[np.ndarray], Optional[float], Optional[float]]:
        """
        Fallback 지원 정규화

        높이 추정 실패 시 fallback_height 사용하거나 원본 반환

        Args:
            image_path: 이미지 경로
            fallback_height: 추정 실패 시 사용할 기본 높이

        Returns:
            (정규화 이미지, 추정 높이, 스케일)
            실패 시 원본 반환 또는 (None, None, None)
        """
        # 이미지 로드
        img = imread_unicode(image_path)
        if img is None:
            return None, None, None

        # 높이 추정 시도
        estimated_height = self.estimate_text_height(img)

        if estimated_height is None:
            if fallback_height is not None:
                # Fallback 높이 사용
                print(f"  [Fallback] {image_path.name}: 기본 높이 {fallback_height:.1f}px 사용")
                estimated_height = fallback_height
            else:
                # 정규화 건너뜀 (원본 그대로 반환)
                print(f"  [Skip] {image_path.name}: 정규화 건너뜀 (텍스트 추정 실패)")
                return img, None, 1.0

        # 스케일 계산 및 리사이징
        scale = self.compute_scale(estimated_height)
        normalized = self.resize_image(img, scale)

        return normalized, estimated_height, scale

    def estimate_document_text_height(
        self,
        problem_image_paths: List[Path],
        sample_size: int = 20
    ) -> float:
        """
        문서(교재) 전체의 평균 폰트 높이 추정

        수식 위주 문제 등 일부 실패하는 이미지를 보완하기 위해
        여러 문제 이미지를 샘플링하여 중앙값(median) 사용

        Args:
            problem_image_paths: 문제 이미지 경로 리스트
            sample_size: 샘플링할 이미지 개수

        Returns:
            중앙값 폰트 높이

        Raises:
            ValueError: 유효한 샘플이 부족한 경우
        """
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

            height = self.estimate_text_height(img)
            if height is not None:
                heights.append(height)

        if len(heights) < 5:
            raise ValueError(f"유효한 샘플 부족: {len(heights)}개 (최소 5개 필요)")

        # Median 사용 (이상치에 강건)
        median_height = np.median(heights)

        print(f"[문서 평균 계산] {len(heights)}개 샘플 → 중앙값: {median_height:.1f}px")

        return median_height

    # ========== Phase B: 견고성 강화 헬퍼 메서드 ==========

    def _calculate_mode_with_bimodal_detection(self, heights: List[float]) -> float:
        """
        Bimodal 분포 검출 및 Mode 계산

        히스토그램에 두 개의 피크가 있는 경우 (예: 본문 12px, 문제번호 16px)
        가중 평균을 계산하여 반환

        Args:
            heights: 높이 리스트 (이미 trimmed)

        Returns:
            Mode 또는 Bimodal 평균
        """
        # 히스토그램 생성
        hist, bins = np.histogram(
            heights,
            bins=range(self.min_height, self.max_height + 1)
        )

        # 피크 검출 (간단한 방법: 주변보다 큰 값)
        peaks = []
        min_peak_height = len(heights) * 0.1  # 전체의 10% 이상만 피크로 간주

        for i in range(1, len(hist) - 1):
            # 양쪽 이웃보다 크고, 최소 높이 이상이면 피크
            if hist[i] > hist[i-1] and hist[i] > hist[i+1] and hist[i] >= min_peak_height:
                peaks.append((i, hist[i], bins[i]))

        if len(peaks) >= 2:
            # Bimodal 검출: 가장 큰 두 피크 선택
            peaks_sorted = sorted(peaks, key=lambda x: x[1], reverse=True)
            peak1_idx, peak1_count, peak1_height = peaks_sorted[0]
            peak2_idx, peak2_count, peak2_height = peaks_sorted[1]

            # 가중 평균 계산
            total_count = peak1_count + peak2_count
            weighted_avg = (peak1_height * peak1_count + peak2_height * peak2_count) / total_count

            print(f"  [Bimodal 검출] {peak1_height}px ({peak1_count}개), "
                  f"{peak2_height}px ({peak2_count}개) → 평균 {weighted_avg:.1f}px")

            return weighted_avg
        else:
            # 단일 모드: 최빈값 반환
            mode_idx = np.argmax(hist)
            mode_height = bins[mode_idx]
            return mode_height

    def _apply_sharpening(self, img: np.ndarray, scale: float) -> np.ndarray:
        """
        확대된 이미지에 샤프닝 적용

        과도한 확대로 인한 블러를 개선하기 위해 Unsharp Mask 적용

        Args:
            img: 입력 이미지
            scale: 스케일 팩터

        Returns:
            샤프닝된 이미지
        """
        # Unsharp Mask 커널
        kernel = np.array([
            [0, -1, 0],
            [-1, 5, -1],
            [0, -1, 0]
        ], dtype=np.float32)

        # 샤프닝 적용
        sharpened = cv2.filter2D(img, -1, kernel)

        # 원본과 블렌딩 (과도한 샤프닝 방지)
        # 스케일이 클수록 샤프닝 강도 증가 (최대 0.4)
        alpha = min(0.4, (scale - 1.2) * 0.3)
        result = cv2.addWeighted(img, 1 - alpha, sharpened, alpha, 0)

        print(f"  [샤프닝 적용] scale={scale:.2f}, alpha={alpha:.2f}")

        return result.astype(np.uint8)


# 직접 실행 시 간단한 테스트
if __name__ == "__main__":
    print("=== FontNormalizer 모듈 테스트 ===\n")

    # 간단한 테스트 이미지 생성
    import cv2

    # 테스트 이미지 (흰 배경에 검은 사각형들)
    test_img = np.ones((200, 400, 3), dtype=np.uint8) * 255

    # 다양한 크기의 "문자" 시뮬레이션
    # 본문 텍스트 (18px 높이)
    for i in range(10):
        x = 20 + i * 35
        cv2.rectangle(test_img, (x, 50), (x + 20, 68), (0, 0, 0), -1)

    # 노이즈 (매우 작음)
    cv2.rectangle(test_img, (10, 100), (14, 103), (0, 0, 0), -1)

    # 제목 (큰 텍스트)
    cv2.rectangle(test_img, (50, 120), (100, 150), (0, 0, 0), -1)

    normalizer = FontNormalizer(target_height=22)

    print("테스트 이미지 분석...")
    estimated = normalizer.estimate_text_height(test_img)

    if estimated is not None:
        print(f"\n추정된 폰트 높이: {estimated:.1f}px")
        scale = normalizer.compute_scale(estimated)
        print(f"스케일 팩터: {scale:.3f}x")
        print(f"목표 높이: {normalizer.target_height}px")
    else:
        print("\n높이 추정 실패")

    print("\n모듈 로드 성공!")
