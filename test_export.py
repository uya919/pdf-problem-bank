# -*- coding: utf-8 -*-
"""
테스트 스크립트: 왼쪽 정렬 내보내기 확인
"""
import sys
import json
from PIL import Image
from pathlib import Path

sys.path.insert(0, r'c:\MYCLAUDE_PROJECT\pdf\backend')
from app.utils.image_utils import calculate_bounding_box, add_padding, merge_images_vertically

# 경로 설정 - 폴더 이름 직접 탐색
docs_path = Path(r'c:\MYCLAUDE_PROJECT\pdf\dataset_root\documents')
target_doc_name = None

for folder in docs_path.iterdir():
    if folder.is_dir() and '베이직쎈' in folder.name and '해설' in folder.name:
        target_doc_name = folder.name
        break

if not target_doc_name:
    print("ERROR: Target folder not found!")
    sys.exit(1)

doc_id = target_doc_name
base_path = docs_path / doc_id
print(f"Found document: {doc_id}")
print(f"Base path exists: {base_path.exists()}")

# 페이지 이미지 로드
pages_dir = base_path / 'pages'
print(f"Pages dir exists: {pages_dir.exists()}")

# List files in pages dir
if pages_dir.exists():
    page_files = list(pages_dir.iterdir())
    print(f"Files in pages dir: {len(page_files)}")
    for f in page_files[:5]:
        print(f"  - {f.name}")

page_path = pages_dir / 'page_0007.webp'
print(f"Page path: {page_path}")
print(f"Page path exists: {page_path.exists()}")

page_image = Image.open(page_path)
print(f'Page image size: {page_image.size}')

# 블록 데이터 로드
blocks_path = base_path / 'blocks' / 'page_0007_blocks.json'
with open(blocks_path, 'r', encoding='utf-8') as f:
    blocks_data = json.load(f)

# 그룹 데이터 로드
groups_path = base_path / 'groups' / 'page_0007_groups.json'
with open(groups_path, 'r', encoding='utf-8') as f:
    groups_data = json.load(f)

target_group = groups_data['groups'][0]  # p7_X1
print(f'Group ID: {target_group["id"]}')
print(f'Column: {target_group["column"]}')
print(f'Segments: {len(target_group.get("segments", []))}')

# 세그먼트별 크롭
cropped_images = []
for segment in sorted(target_group['segments'], key=lambda s: s.get('order', 0)):
    segment_blocks = [b for b in blocks_data['blocks'] if b['block_id'] in segment['block_ids']]
    print(f'  Segment {segment["column"]}: {len(segment_blocks)} blocks')

    if not segment_blocks:
        continue

    seg_bbox = calculate_bounding_box(segment_blocks)
    seg_x1, seg_y1, seg_x2, seg_y2 = add_padding(seg_bbox, 5, page_image.width, page_image.height)
    print(f'    bbox: ({seg_x1}, {seg_y1}, {seg_x2}, {seg_y2})')
    print(f'    size: {seg_x2 - seg_x1} x {seg_y2 - seg_y1}')

    seg_cropped = page_image.crop((seg_x1, seg_y1, seg_x2, seg_y2))
    cropped_images.append(seg_cropped)

# 세로 합성
result = merge_images_vertically(cropped_images, padding=10)
print(f'Merged result size: {result.size}')

# 저장
output_path = base_path / 'problems' / f'{doc_id}_p0007_p7_X1.png'
result.save(output_path)
print(f'Saved to: {output_path}')

# 왼쪽 정렬 확인
L_width = cropped_images[0].width
R_width = cropped_images[1].width
print(f'L width: {L_width}, R width: {R_width}')

if L_width < R_width:
    # L 세그먼트의 오른쪽 끝+1 위치 픽셀 확인
    test_x = L_width + 1
    test_y = cropped_images[0].height // 2
    pixel = result.getpixel((test_x, test_y))
    print(f'Pixel at ({test_x}, {test_y}): {pixel}')
    if pixel == (255, 255, 255):
        print('LEFT ALIGNMENT CONFIRMED!')
    else:
        print('NOT left aligned')
