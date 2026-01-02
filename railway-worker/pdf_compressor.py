"""
PDF 압축 모듈
Stage 46: 서버사이드 PDF 압축

2단계 압축:
1. 무손실 최적화 (garbage=4, deflate)
2. JPEG 90 이미지 압축 (항상 적용)

예상 결과: 85MB -> 25-35MB (60-70% 감소)
"""

import fitz  # PyMuPDF
import io
from typing import Tuple, Dict, Any

# 기본 JPEG 품질 (90 = 고품질, 300% 확대에서도 선명)
DEFAULT_JPEG_QUALITY = 90


def compress_pdf(
    input_bytes: bytes,
    jpeg_quality: int = DEFAULT_JPEG_QUALITY
) -> Tuple[bytes, Dict[str, Any]]:
    """
    PDF 2단계 압축 수행

    1단계: 무손실 최적화 (garbage=4, deflate, use_objstms)
    2단계: 이미지 JPEG 재압축 (quality 90)

    Args:
        input_bytes: 원본 PDF 바이트
        jpeg_quality: JPEG 압축 품질 (1-100, 기본 90)

    Returns:
        (압축된 PDF 바이트, 통계 정보)
    """
    original_size = len(input_bytes)
    stats = {
        'original_size': original_size,
        'jpeg_quality': jpeg_quality,
        'images_processed': 0,
        'images_skipped': 0,
        'pages': 0,
    }

    # PDF 문서 열기
    doc = fitz.open(stream=input_bytes, filetype="pdf")
    stats['pages'] = doc.page_count

    print(f"📄 [COMPRESS] PDF 열기 완료: {doc.page_count}페이지")

    # 이미지 압축 (JPEG 90)
    for page_num in range(doc.page_count):
        page = doc[page_num]
        image_list = page.get_images(full=True)

        for img_index, img_info in enumerate(image_list):
            xref = img_info[0]

            try:
                # 이미지 추출
                base_image = doc.extract_image(xref)
                if not base_image:
                    continue

                image_bytes = base_image["image"]
                image_ext = base_image["ext"]

                # 이미 JPEG이고 작은 파일이면 스킵 (50KB 이하)
                if image_ext == "jpeg" and len(image_bytes) < 50000:
                    stats['images_skipped'] += 1
                    continue

                # Pixmap 생성
                pix = fitz.Pixmap(doc, xref)

                # CMYK -> RGB 변환 (필요시)
                if pix.n > 4:  # CMYK
                    pix = fitz.Pixmap(fitz.csRGB, pix)

                # 알파 채널 제거 (JPEG는 알파 미지원)
                if pix.alpha:
                    pix = fitz.Pixmap(pix, 0)  # 알파 제거

                # JPEG로 재압축
                jpeg_bytes = pix.tobytes("jpeg", jpg_quality=jpeg_quality)

                # 이미지 교체
                # Note: xref로 직접 이미지 스트림 업데이트
                doc.update_stream(xref, jpeg_bytes)

                stats['images_processed'] += 1

            except Exception as e:
                # 개별 이미지 실패는 무시하고 계속
                print(f"[WARN] 이미지 압축 실패 (page {page_num}, xref {xref}): {e}")
                stats['images_skipped'] += 1
                continue

    print(f"🖼️  [COMPRESS] 이미지 처리: {stats['images_processed']}개 압축, {stats['images_skipped']}개 스킵")

    # 무손실 최적화 + 저장
    output_buffer = io.BytesIO()
    doc.save(
        output_buffer,
        garbage=4,           # 최대 정리 (중복 객체 제거)
        deflate=True,        # 스트림 압축
        deflate_images=True, # 이미지 스트림 압축
        deflate_fonts=True,  # 폰트 스트림 압축
        clean=True,          # 구문 정리
    )

    doc.close()

    compressed_bytes = output_buffer.getvalue()
    stats['compressed_size'] = len(compressed_bytes)
    stats['compression_ratio'] = round(
        (1 - len(compressed_bytes) / original_size) * 100, 1
    )

    print(f"✅ [COMPRESS] 완료: {original_size / 1024 / 1024:.1f}MB -> {stats['compressed_size'] / 1024 / 1024:.1f}MB ({stats['compression_ratio']}% 감소)")

    return compressed_bytes, stats


def get_pdf_info(input_bytes: bytes) -> Dict[str, Any]:
    """
    PDF 정보 조회 (압축 없이)

    Args:
        input_bytes: PDF 바이트

    Returns:
        PDF 정보 (페이지 수, 이미지 수 등)
    """
    doc = fitz.open(stream=input_bytes, filetype="pdf")

    total_images = 0
    for page_num in range(doc.page_count):
        page = doc[page_num]
        total_images += len(page.get_images(full=True))

    info = {
        'pages': doc.page_count,
        'images': total_images,
        'size': len(input_bytes),
        'title': doc.metadata.get('title', ''),
        'author': doc.metadata.get('author', ''),
    }

    doc.close()
    return info
