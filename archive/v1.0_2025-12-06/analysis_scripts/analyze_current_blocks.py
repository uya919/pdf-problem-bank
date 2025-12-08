"""
현재 검출된 블록 상세 분석 스크립트
"""
import sys
from pathlib import Path
import json
import numpy as np

# 프로젝트 루트를 path에 추가
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "src"))

from config import Config
from data_models import PageData

def analyze_blocks():
    """현재 검출된 블록들을 상세 분석"""

    # JSON 파일 로드
    json_path = Path("C:/MYCLAUDE_PROJECT/pdf/dataset_root/documents/test_doc/blocks/page_0000_blocks.json")

    if not json_path.exists():
        print(f"[ERROR] JSON 파일을 찾을 수 없습니다: {json_path}")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    page_data = PageData.from_dict(data)

    print("=" * 70)
    print("블록 검출 상세 분석")
    print("=" * 70)
    print()

    # 기본 정보
    print(f"문서 ID: {page_data.document_id}")
    print(f"페이지 번호: {page_data.page_index}")
    print(f"페이지 크기: {page_data.width} × {page_data.height}")
    print(f"총 블록 수: {len(page_data.blocks)}개")
    print()

    # 컬럼별 분포
    left_blocks = [b for b in page_data.blocks if b.column == 'L']
    right_blocks = [b for b in page_data.blocks if b.column == 'R']
    print(f"왼쪽 컬럼: {len(left_blocks)}개")
    print(f"오른쪽 컬럼: {len(right_blocks)}개")
    print()

    # 크기 분석
    print("-" * 70)
    print("1. 블록 크기 분석")
    print("-" * 70)

    areas = [b.bbox.area for b in page_data.blocks]
    widths = [b.bbox.width for b in page_data.blocks]
    heights = [b.bbox.height for b in page_data.blocks]

    print(f"면적 (px²):")
    print(f"  최소: {min(areas):,}px²")
    print(f"  최대: {max(areas):,}px²")
    print(f"  평균: {np.mean(areas):,.0f}px²")
    print(f"  중앙값: {np.median(areas):,.0f}px²")
    print(f"  표준편차: {np.std(areas):,.0f}px²")
    print()

    print(f"너비 (px):")
    print(f"  최소: {min(widths)}px")
    print(f"  최대: {max(widths)}px")
    print(f"  평균: {np.mean(widths):.0f}px")
    print()

    print(f"높이 (px):")
    print(f"  최소: {min(heights)}px")
    print(f"  최대: {max(heights)}px")
    print(f"  평균: {np.mean(heights):.0f}px")
    print()

    # 밀집도 분석
    print("-" * 70)
    print("2. 밀집도 분석")
    print("-" * 70)

    densities = [b.pixel_density for b in page_data.blocks]
    print(f"밀집도:")
    print(f"  최소: {min(densities):.3f}")
    print(f"  최대: {max(densities):.3f}")
    print(f"  평균: {np.mean(densities):.3f}")
    print(f"  중앙값: {np.median(densities):.3f}")
    print()

    # 밀집도 분포
    low_density = [b for b in page_data.blocks if b.pixel_density < 0.2]
    medium_density = [b for b in page_data.blocks if 0.2 <= b.pixel_density < 0.5]
    high_density = [b for b in page_data.blocks if b.pixel_density >= 0.5]

    print(f"밀집도 분포:")
    print(f"  낮음 (<0.2): {len(low_density)}개")
    print(f"  중간 (0.2-0.5): {len(medium_density)}개")
    print(f"  높음 (>=0.5): {len(high_density)}개")
    print()

    # 대형 블록 분석
    print("-" * 70)
    print("3. 대형 블록 분석 (면적 > 20,000px²)")
    print("-" * 70)

    large_blocks = sorted(
        [b for b in page_data.blocks if b.bbox.area > 20000],
        key=lambda b: b.bbox.area,
        reverse=True
    )

    if large_blocks:
        print(f"대형 블록: {len(large_blocks)}개")
        print()
        for i, b in enumerate(large_blocks, 1):
            print(f"  {i}. Block #{b.block_id} ({b.column} 컬럼)")
            print(f"     크기: {b.bbox.width} × {b.bbox.height} = {b.bbox.area:,}px²")
            print(f"     밀집도: {b.pixel_density:.3f}")
            print(f"     위치: ({b.bbox.x_min}, {b.bbox.y_min}) → ({b.bbox.x_max}, {b.bbox.y_max})")
            print()
    else:
        print("대형 블록 없음")
        print()

    # 표 영역 후보 (크고 밀집도 낮음)
    table_candidates = [b for b in page_data.blocks if b.bbox.area > 20000 and b.pixel_density < 0.3]
    if table_candidates:
        print(">> 표 영역 후보 (크고 밀집도 낮음):")
        for b in table_candidates:
            print(f"   Block #{b.block_id}: {b.bbox.area:,}px², density={b.pixel_density:.3f}")
        print()

    # 소형 블록 분석
    print("-" * 70)
    print("4. 소형 블록 분석 (면적 < 1,000px²)")
    print("-" * 70)

    small_blocks = sorted(
        [b for b in page_data.blocks if b.bbox.area < 1000],
        key=lambda b: b.bbox.area
    )

    if small_blocks:
        print(f"소형 블록: {len(small_blocks)}개")
        print()
        print(f"  가장 작은 5개:")
        for i, b in enumerate(small_blocks[:5], 1):
            print(f"    {i}. Block #{b.block_id}: {b.bbox.width}×{b.bbox.height} = {b.bbox.area}px², density={b.pixel_density:.3f}")
        print()
    else:
        print("소형 블록 없음 (모두 >= 1,000px²)")
        print()

    # 종횡비 분석
    print("-" * 70)
    print("5. 종횡비 분석")
    print("-" * 70)

    aspect_ratios = [b.bbox.width / b.bbox.height for b in page_data.blocks]

    print(f"종횡비 (너비/높이):")
    print(f"  최소: {min(aspect_ratios):.2f}")
    print(f"  최대: {max(aspect_ratios):.2f}")
    print(f"  평균: {np.mean(aspect_ratios):.2f}")
    print()

    # 매우 넓은 블록 (가로선, 수평 텍스트)
    wide_blocks = [b for b in page_data.blocks if (b.bbox.width / b.bbox.height) > 10]
    if wide_blocks:
        print(f"매우 넓은 블록 (종횡비 > 10): {len(wide_blocks)}개")
        for b in wide_blocks:
            ratio = b.bbox.width / b.bbox.height
            print(f"  Block #{b.block_id}: {b.bbox.width}×{b.bbox.height} (비율 {ratio:.1f}:1)")
        print()

    # 매우 높은 블록 (세로선, 수직 텍스트)
    tall_blocks = [b for b in page_data.blocks if (b.bbox.height / b.bbox.width) > 10]
    if tall_blocks:
        print(f"매우 높은 블록 (종횡비 < 0.1): {len(tall_blocks)}개")
        for b in tall_blocks:
            ratio = b.bbox.width / b.bbox.height
            print(f"  Block #{b.block_id}: {b.bbox.width}×{b.bbox.height} (비율 {ratio:.2f}:1)")
        print()

    # 정사각형에 가까운 블록
    square_blocks = [b for b in page_data.blocks if 0.8 <= (b.bbox.width / b.bbox.height) <= 1.2]
    print(f"정사각형에 가까운 블록 (종횡비 0.8-1.2): {len(square_blocks)}개")
    print()

    # Y 좌표별 분포
    print("-" * 70)
    print("6. 페이지 영역별 블록 분포")
    print("-" * 70)

    page_height = page_data.height
    top_blocks = [b for b in page_data.blocks if b.bbox.y_min < page_height * 0.33]
    middle_blocks = [b for b in page_data.blocks if page_height * 0.33 <= b.bbox.y_min < page_height * 0.67]
    bottom_blocks = [b for b in page_data.blocks if b.bbox.y_min >= page_height * 0.67]

    print(f"상단 (0-33%): {len(top_blocks)}개")
    print(f"중단 (33-67%): {len(middle_blocks)}개")
    print(f"하단 (67-100%): {len(bottom_blocks)}개")
    print()

    # 블록 간 간격 분석
    print("-" * 70)
    print("7. 블록 간 간격 분석 (Y 방향)")
    print("-" * 70)

    # Y 좌표 기준 정렬
    sorted_blocks = sorted(page_data.blocks, key=lambda b: b.bbox.y_min)

    gaps = []
    for i in range(len(sorted_blocks) - 1):
        current = sorted_blocks[i]
        next_block = sorted_blocks[i + 1]

        # 같은 컬럼이면서 겹치지 않는 경우만
        if current.column == next_block.column and current.bbox.y_max < next_block.bbox.y_min:
            gap = next_block.bbox.y_min - current.bbox.y_max
            gaps.append(gap)

    if gaps:
        print(f"블록 간 수직 간격:")
        print(f"  최소: {min(gaps)}px")
        print(f"  최대: {max(gaps)}px")
        print(f"  평균: {np.mean(gaps):.0f}px")
        print(f"  중앙값: {np.median(gaps):.0f}px")
        print()

        # 큰 간격 (> 50px) - 문제 간 경계 가능성
        large_gaps = [g for g in gaps if g > 50]
        if large_gaps:
            print(f"  큰 간격 (>50px): {len(large_gaps)}개")
            print(f"  → 문제 간 경계일 가능성")
            print()

    # 권장사항
    print("=" * 70)
    print("분석 결과 요약 및 권장사항")
    print("=" * 70)
    print()

    # 표 영역 체크
    if table_candidates:
        print("1. [주목] 표 영역 후보 발견")
        print(f"   {len(table_candidates)}개의 대형 저밀집도 블록이 있습니다.")
        print("   → 표 내부를 재분할하면 블록 수 증가 가능")
        print()

    # 소형 블록 체크
    if len(small_blocks) < 10:
        print("2. [주목] 소형 블록 부족")
        print(f"   1,000px² 미만 블록이 {len(small_blocks)}개뿐입니다.")
        print("   → MIN_BLOCK_SIZE 완화 또는 h_kernel 감소 고려")
        print()

    # 밀집도 분포 체크
    if len(low_density) > 20:
        print("3. [주목] 저밀집도 블록 많음")
        print(f"   밀집도 < 0.2인 블록이 {len(low_density)}개입니다.")
        print("   → 표, 그래프, 여백 영역일 가능성")
        print()

    # 다음 단계 제안
    print("-" * 70)
    print("다음 단계 제안:")
    print("-" * 70)
    print()
    print("1. h_kernel을 8 또는 7로 줄여서 재테스트")
    print("   → 예상: 100-120개 블록")
    print()
    print("2. 표 영역 후보를 수동으로 확인")
    print("   → 시각화 이미지에서 대형 블록 위치 확인")
    print()
    print("3. 사용자에게 질문:")
    print("   - 표 내부를 각 셀로 나눠야 하나요?")
    print("   - 복합 보기(①-1, ①-2)를 별도 블록으로 나눠야 하나요?")
    print("   - 어떤 영역이 누락되었는지 구체적으로 지적해주세요.")
    print()


if __name__ == "__main__":
    analyze_blocks()
