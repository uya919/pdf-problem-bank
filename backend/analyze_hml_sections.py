# -*- coding: utf-8 -*-
"""
HML 파일 SECTION 구조 분석
문제 본문이 실제로 어디에 있는지 확인
"""
import xml.etree.ElementTree as ET
import re

HML_PATH = r"C:\MYCLAUDE_PROJECT\pdf\.claude\내신 2024년 인천 미추홀구 인화여고 고1 공통 1학기기말 수학상.Hml"

def analyze_sections():
    tree = ET.parse(HML_PATH)
    root = tree.getroot()

    print("="*70)
    print("SECTION 구조 분석")
    print("="*70)

    sections = list(root.iter('SECTION'))
    print(f"총 SECTION 수: {len(sections)}")

    for s_idx, section in enumerate(sections):
        p_tags = list(section.findall('P'))
        print(f"\nSECTION[{s_idx}]: P 태그 {len(p_tags)}개")

        # 해당 섹션의 처음 3개 P 태그 미리보기
        for i, p in enumerate(p_tags[:3]):
            text = ''.join(p.itertext())[:80]
            print(f"  P[{i}]: {text}")

    print("\n" + "="*70)
    print("P[0]의 실제 XML 구조 (첫 500자)")
    print("="*70)

    all_p = list(root.iter('P'))
    if all_p:
        p0_str = ET.tostring(all_p[0], encoding='unicode')[:1500]
        print(p0_str)

    print("\n" + "="*70)
    print("문제 본문 위치 찾기: '부등식' 키워드 포함 P 태그")
    print("="*70)

    for i, p in enumerate(all_p):
        text = ''.join(p.itertext())
        if '부등식' in text and 'x' in text:
            print(f"\nP[{i}] (부등식 포함):")
            print(f"  전체: {text[:200]}")

            # EQUATION 태그 확인
            equations = list(p.iter('EQUATION'))
            if equations:
                print(f"  EQUATION 수: {len(equations)}")
                for eq in equations[:2]:
                    eq_text = ''.join(eq.itertext())
                    print(f"    수식: {eq_text[:100]}")

    print("\n" + "="*70)
    print("'1.' 또는 '1' 뒤에 나오는 문제 본문 추적")
    print("="*70)

    # P[14] = "1" 이후 본문 추적
    found_number = False
    for i, p in enumerate(all_p):
        text = ''.join(p.itertext()).strip()

        # 문제 번호 "1" 발견
        if text == '1' and not found_number:
            found_number = True
            print(f"\n문제번호 P[{i}]: '{text}'")
            continue

        # 문제 번호 이후
        if found_number and i <= 25:
            # 본문으로 보이는 텍스트인지
            has_eq = any(True for _ in p.iter('EQUATION'))
            markers = []
            if has_eq:
                markers.append("EQUATION있음")
            if len(text) > 20:
                markers.append("본문길이")
            if '①' in text:
                markers.append("선택지")
            if '[정답]' in text:
                markers.append("정답")

            marker_str = f" [{', '.join(markers)}]" if markers else ""
            print(f"P[{i}]{marker_str}: {text[:100]}")

if __name__ == '__main__':
    analyze_sections()
