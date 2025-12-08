# -*- coding: utf-8 -*-
"""
HML 파일 구조 분석 스크립트
문제 경계 추출 문제 연구용
"""
import xml.etree.ElementTree as ET
import re

# HML 파일 경로
HML_PATH = r"C:\MYCLAUDE_PROJECT\pdf\.claude\내신 2024년 인천 미추홀구 인화여고 고1 공통 1학기기말 수학상.Hml"

def analyze_hml():
    tree = ET.parse(HML_PATH)
    root = tree.getroot()

    # 모든 P 태그 수집
    all_p = list(root.iter('P'))
    print(f"총 P 태그 수: {len(all_p)}")

    # AUTONUM(Endnote) 위치 찾기
    print("\n" + "="*60)
    print("AUTONUM(Endnote) 위치 분석")
    print("="*60)

    autonum_positions = []
    for p_idx, p in enumerate(all_p):
        for autonum in p.iter('AUTONUM'):
            if autonum.get('NumberType') == 'Endnote':
                num = int(autonum.get('Number', 0))
                text = ''.join(p.itertext())[:100]
                autonum_positions.append({
                    'number': num,
                    'p_index': p_idx,
                    'text_preview': text
                })
                print(f"\nP[{p_idx}] AUTONUM #{num}")
                print(f"  텍스트: {text[:80]}...")

    print(f"\n총 AUTONUM(Endnote) 수: {len(autonum_positions)}")

    # 문제 1번 주변 P 태그 분석
    print("\n" + "="*60)
    print("문제 1번 주변 P 태그 상세 분석")
    print("="*60)

    if autonum_positions:
        first_autonum = autonum_positions[0]
        start_idx = max(0, first_autonum['p_index'] - 10)
        end_idx = min(len(all_p), first_autonum['p_index'] + 15)

        for i in range(start_idx, end_idx):
            p = all_p[i]
            text = ''.join(p.itertext())

            # AUTONUM 태그 확인
            has_autonum = any(a.get('NumberType') == 'Endnote' for a in p.iter('AUTONUM'))
            marker = " [AUTONUM]" if has_autonum else ""

            # 주요 패턴 표시
            if re.search(r'^\d+\.', text.strip()):
                marker += " [문제번호?]"
            if '①' in text or '②' in text:
                marker += " [선택지]"
            if '[정답]' in text:
                marker += " [정답]"

            print(f"\nP[{i}]{marker}")
            print(f"  내용: {text[:120]}")

    # ENDNOTE 분석
    print("\n" + "="*60)
    print("ENDNOTE 내용 분석 (정답 추출)")
    print("="*60)

    endnotes = list(root.iter('ENDNOTE'))
    print(f"총 ENDNOTE 수: {len(endnotes)}")

    for i, note in enumerate(endnotes[:5]):  # 처음 5개만
        text = ''.join(note.itertext())
        print(f"\nENDNOTE #{i+1}")
        print(f"  내용: {text[:150]}")

if __name__ == '__main__':
    analyze_hml()
