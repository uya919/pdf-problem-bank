# -*- coding: utf-8 -*-
"""
HML 파일 구조 상세 분석 스크립트
문제 경계 추출 문제 연구용 - Part 2
"""
import xml.etree.ElementTree as ET
import re

HML_PATH = r"C:\MYCLAUDE_PROJECT\pdf\.claude\내신 2024년 인천 미추홀구 인화여고 고1 공통 1학기기말 수학상.Hml"

def analyze_problem_structure():
    tree = ET.parse(HML_PATH)
    root = tree.getroot()

    all_p = list(root.iter('P'))

    print("="*70)
    print("문제 1번 영역 상세 분석 (P[10] ~ P[25])")
    print("="*70)

    for i in range(10, 26):
        if i >= len(all_p):
            break
        p = all_p[i]
        text = ''.join(p.itertext())

        # 태그 구조 확인
        children = [child.tag for child in p]

        # AUTONUM 확인
        has_autonum = any(a.get('NumberType') == 'Endnote' for a in p.iter('AUTONUM'))

        # 특수 패턴
        markers = []
        if has_autonum:
            markers.append("AUTONUM")
        if re.match(r'^\s*\d+\s*$', text):
            markers.append("숫자만")
        if '①' in text:
            markers.append("선택지①")
        if '②' in text:
            markers.append("선택지②")
        if '부등식' in text or '방정식' in text:
            markers.append("문제키워드")
        if '[정답]' in text:
            markers.append("[정답]")

        marker_str = f" [{', '.join(markers)}]" if markers else ""

        print(f"\nP[{i}]{marker_str}")
        print(f"  자식태그: {children[:5]}...")
        print(f"  텍스트: '{text[:100]}'")

    print("\n" + "="*70)
    print("선택지 패턴 분석 (전체 파일에서 ① 포함 P 태그)")
    print("="*70)

    for i, p in enumerate(all_p):
        text = ''.join(p.itertext())
        if '①' in text and len(text) < 200:
            print(f"\nP[{i}]: {text[:150]}")

    print("\n" + "="*70)
    print("문제 번호 패턴 분석 (1~21 단독 숫자)")
    print("="*70)

    for i, p in enumerate(all_p):
        text = ''.join(p.itertext()).strip()
        if re.match(r'^(\d{1,2})\s*$', text):
            num = int(text)
            if 1 <= num <= 25:
                # 다음 몇 개 P 태그 미리보기
                preview = []
                for j in range(i+1, min(i+4, len(all_p))):
                    preview.append(''.join(all_p[j].itertext())[:50])
                print(f"\nP[{i}]: 문제번호 '{num}' 발견")
                print(f"  다음 P들: {preview}")

if __name__ == '__main__':
    analyze_problem_structure()
