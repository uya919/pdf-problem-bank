# -*- coding: utf-8 -*-
"""HML 파일에서 이미지 추출 테스트"""
import re
import base64
import zlib
from pathlib import Path

hml_file = Path(r'C:\MYCLAUDE_PROJECT\pdf\.claude\내신 2024년 인천 미추홀구 인화여고 고1 공통 1학기기말 수학상.Hml')
output_dir = Path(r'C:\MYCLAUDE_PROJECT\pdf\.claude\extracted_images')
output_dir.mkdir(exist_ok=True)

content = hml_file.read_text(encoding='utf-8')

print("=" * 60)
print("HML 이미지 추출 테스트")
print("=" * 60)

# 1. BINITEM에서 메타데이터 수집
binitem_map = {}
binitem_pattern = r'<BINITEM[^>]*BinData="(\d+)"[^>]*Format="([^"]*)"[^>]*/>'
for match in re.finditer(binitem_pattern, content):
    bid = match.group(1)
    fmt = match.group(2)
    binitem_map[bid] = fmt
    print(f"BINITEM 발견: ID={bid}, Format={fmt}")

# 2. BINDATA에서 실제 데이터 추출
bindata_pattern = r'<BINDATA[^>]*Compress="([^"]*)"[^>]*Encoding="([^"]*)"[^>]*Id="(\d+)"[^>]*Size="(\d+)"[^>]*>(.*?)</BINDATA>'
bindata_matches = re.findall(bindata_pattern, content, re.DOTALL)

print(f"\nBINDATA 태그: {len(bindata_matches)}개")

for compress, encoding, bid, size, data in bindata_matches:
    print(f"\n처리 중: ID={bid}, Size={size}, Compress={compress}")

    # Base64 디코딩
    try:
        # 줄바꿈/공백 제거
        data_clean = data.strip().replace('\n', '').replace('\r', '').replace(' ', '')
        raw_data = base64.b64decode(data_clean)
        print(f"  Base64 디코딩 성공: {len(raw_data)} bytes")

        # 압축 해제
        if compress.lower() == 'true':
            try:
                # zlib 압축 해제 (raw deflate)
                decompressed = zlib.decompress(raw_data, -15)
                print(f"  압축 해제 성공: {len(decompressed)} bytes")
                raw_data = decompressed
            except Exception as e:
                print(f"  압축 해제 실패: {e}")
                # 다른 방식 시도
                try:
                    decompressed = zlib.decompress(raw_data)
                    print(f"  압축 해제 성공 (기본): {len(decompressed)} bytes")
                    raw_data = decompressed
                except:
                    print(f"  압축 해제 건너뜀")

        # 파일 저장
        fmt = binitem_map.get(bid, 'bin')
        output_file = output_dir / f"image_{bid}.{fmt}"
        output_file.write_bytes(raw_data)
        print(f"  저장됨: {output_file}")
        print(f"  파일 크기: {output_file.stat().st_size} bytes")

    except Exception as e:
        print(f"  오류: {e}")

print("\n" + "=" * 60)
print(f"추출 완료! 출력 폴더: {output_dir}")
print("=" * 60)

# 추출된 파일 목록
print("\n추출된 파일:")
for f in output_dir.iterdir():
    print(f"  {f.name}: {f.stat().st_size} bytes")
