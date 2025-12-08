# -*- coding: utf-8 -*-
"""Debug extract_images function - Phase 21 Deep Analysis"""
import sys
import xml.etree.ElementTree as ET
sys.path.insert(0, 'c:/MYCLAUDE_PROJECT/pdf/backend')

file_path = r"C:\MYCLAUDE_PROJECT\pdf\.claude\내신 2024년 인천 미추홀구 인화여고 고1 공통 1학기기말 수학상.Hml"

print("=== 0. Direct XML Parse ===")
tree = ET.parse(file_path)
root = tree.getroot()
print(f"Root tag: {root.tag}")
print(f"Root attrib: {root.attrib}")
print()

print("=== 1. All unique tags in document ===")
all_tags = set()
for elem in root.iter():
    all_tags.add(elem.tag)
# 이미지 관련 태그만 필터
image_tags = [t for t in sorted(all_tags) if any(k in t.upper() for k in ['BIN', 'IMAGE', 'PICTURE', 'DATA'])]
print(f"Image-related tags: {image_tags}")
print()

print("=== 2. BINITEM check ===")
binitem_count = 0
for elem in root.iter():
    if 'BINITEM' in elem.tag.upper():
        binitem_count += 1
        print(f"  Tag: {elem.tag}, Attribs: {elem.attrib}")
print(f"Total BINITEMs: {binitem_count}")
print()

print("=== 3. BINDATA check ===")
bindata_count = 0
for elem in root.iter():
    if 'BINDATA' in elem.tag.upper():
        bindata_count += 1
        has_text = bool(elem.text and elem.text.strip())
        text_len = len(elem.text.strip()) if has_text else 0
        print(f"  Tag: {elem.tag}, Attribs: {elem.attrib}, has_text={has_text}, len={text_len}")
print(f"Total BINDATAs: {bindata_count}")
print()

print("=== 4. PICTURE check ===")
picture_count = 0
for elem in root.iter():
    if 'PICTURE' in elem.tag.upper():
        picture_count += 1
        if picture_count <= 5:
            print(f"  Tag: {elem.tag}, Attribs: {elem.attrib}")
print(f"Total PICTUREs: {picture_count}")
print()

print("=== 5. IMAGE check ===")
image_count = 0
for elem in root.iter():
    if 'IMAGE' in elem.tag.upper() and 'BINITEM' not in elem.tag.upper():
        image_count += 1
        if image_count <= 5:
            print(f"  Tag: {elem.tag}, Attribs: {elem.attrib}")
print(f"Total IMAGEs: {image_count}")
print()

print("=== 6. HEAD/MAPPINGTABLE/BINDATALIST structure ===")
for elem in root.iter():
    if 'HEAD' in elem.tag.upper():
        print(f"Found HEAD: {elem.tag}")
        for child in elem:
            print(f"  HEAD child: {child.tag}")
            if 'MAPPING' in child.tag.upper():
                for grandchild in child:
                    print(f"    MAPPINGTABLE child: {grandchild.tag}")
print()

print("=== 7. TAIL/BINDATASTORAGE structure ===")
for elem in root.iter():
    if 'TAIL' in elem.tag.upper():
        print(f"Found TAIL: {elem.tag}")
        for child in elem:
            print(f"  TAIL child: {child.tag}")
            if 'BINDATA' in child.tag.upper():
                for grandchild in child:
                    if grandchild.text:
                        print(f"    {grandchild.tag} has {len(grandchild.text)} chars")
print()

# Now test HMLParser
print("=== 8. HMLParser test ===")
from app.services.hangul.hml_parser import HMLParser
parser = HMLParser(file_path)
result = parser.parse()

print(f"Parse success: {result.success}")
print(f"All metadata keys: {list(result.detected_metadata.keys()) if result.detected_metadata else []}")
print()

images_data = result.detected_metadata.get('images', {}) if result.detected_metadata else {}
print(f"images_data type: {type(images_data)}")
print(f"images_data keys: {list(images_data.keys()) if images_data else []}")
print(f"images_data truthy: {bool(images_data)}")
print()

for bin_id, img_info in images_data.items():
    print(f"  Image {bin_id}: data_len={len(img_info.get('data', b''))}, format={img_info.get('format')}")
print()

print(f"image_count from metadata: {result.detected_metadata.get('image_count') if result.detected_metadata else None}")
print()

# Check problems for content_images
print("=== 9. Problems with content_images ===")
for p in result.problems:
    if p.content_images:
        print(f"  Problem {p.number}: {p.content_images}")
