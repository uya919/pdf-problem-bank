"""
폰트 정규화 테스트 스크립트

Phase A: MVP 테스트

사용법:
    python scripts/test_font_normalization.py
"""
from pathlib import Path
import sys
import os

# Windows 콘솔 UTF-8 인코딩 설정
if sys.platform == 'win32':
    os.system('chcp 65001 > nul')
    sys.stdout.reconfigure(encoding='utf-8')

# 프로젝트 루트를 sys.path에 추가
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "src"))

from font_normalizer import FontNormalizer
from utils import imwrite_unicode
import cv2


def main():
    print("=" * 60)
    print("폰트 정규화 테스트 (Phase A - MVP)")
    print("=" * 60)
    print()

    # 테스트할 문제 이미지 찾기
    # dataset_root/documents/{문서명}/problems/ 폴더 탐색
    documents_root = project_root / "dataset_root" / "documents"

    if not documents_root.exists():
        print(f"[오류] documents 폴더가 없습니다: {documents_root}")
        print("먼저 문제 이미지를 Export 해주세요.")
        return

    # 모든 problems 폴더에서 PNG 찾기
    test_images = []
    for doc_folder in documents_root.iterdir():
        if not doc_folder.is_dir():
            continue

        problems_folder = doc_folder / "problems"
        if problems_folder.exists():
            # 최대 3개까지만 샘플링
            png_files = list(problems_folder.glob("*.png"))
            test_images.extend(png_files[:3])

            if len(test_images) >= 3:
                break

    if not test_images:
        print("[오류] 테스트할 문제 이미지를 찾을 수 없습니다.")
        print("다음 경로에 PNG 파일이 있는지 확인해주세요:")
        print(f"  {documents_root}/<문서명>/problems/")
        print()
        print("또는 GUI에서 먼저 문제를 Export 해주세요.")
        return

    print(f"테스트 이미지 {len(test_images)}개 발견:")
    for img_path in test_images:
        print(f"  - {img_path.name}")
    print()

    # 출력 디렉토리
    output_dir = project_root / "dataset_root" / "normalized_test"
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"출력 디렉토리: {output_dir}")
    print()

    # Normalizer 생성
    normalizer = FontNormalizer(target_height=22)

    print(f"목표 폰트 높이: {normalizer.target_height}px")
    print(f"스케일 범위: {normalizer.min_scale:.2f}x ~ {normalizer.max_scale:.2f}x")
    print()
    print("-" * 60)
    print()

    # 각 이미지 처리
    success_count = 0
    fail_count = 0

    for i, img_path in enumerate(test_images, 1):
        print(f"[{i}/{len(test_images)}] {img_path.name}")
        print()

        # 원본 이미지 로드 (한글 경로 지원)
        from utils import imread_unicode as load_img
        original = load_img(img_path)
        if original is None:
            print(f"  ❌ 원본 로드 실패")
            print()
            fail_count += 1
            continue

        original_size = (original.shape[1], original.shape[0])

        # 정규화
        normalized, est_height, scale = normalizer.normalize_image(img_path)

        if normalized is None:
            print(f"  ❌ 실패")
            print()
            fail_count += 1
            continue

        # 저장
        output_path = output_dir / f"normalized_{img_path.name}"
        success = imwrite_unicode(output_path, normalized)

        if success:
            print(f"  ✅ 저장 완료: {output_path.name}")
            print(f"     추정 높이: {est_height:.1f}px")
            print(f"     스케일: {scale:.3f}x")
            print(f"     원본 크기: {original_size[0]}x{original_size[1]}px")
            print(f"     결과 크기: {normalized.shape[1]}x{normalized.shape[0]}px")
            success_count += 1
        else:
            print(f"  ❌ 저장 실패")
            fail_count += 1

        print()

    print("-" * 60)
    print()
    print("테스트 결과:")
    print(f"  성공: {success_count}개")
    print(f"  실패: {fail_count}개")
    print()

    if success_count > 0:
        print(f"✅ 정규화된 이미지는 다음 폴더에 저장되었습니다:")
        print(f"   {output_dir}")
        print()
        print("수동 검증:")
        print("  1. 폴더를 열어서 이미지를 확인해주세요")
        print("  2. 폰트 크기가 비슷해졌는지 확인해주세요")
        print("  3. 선명도와 가독성을 확인해주세요")
    else:
        print("❌ 모든 이미지 처리에 실패했습니다.")
        print()
        print("문제 해결:")
        print("  1. 문제 이미지에 충분한 텍스트가 있는지 확인")
        print("  2. 이미지 품질이 너무 낮지 않은지 확인")
        print("  3. 에러 메시지를 확인하여 원인 파악")

    print()
    print("=" * 60)
    print("테스트 완료!")
    print("=" * 60)


if __name__ == "__main__":
    main()
