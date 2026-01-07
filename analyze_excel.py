# -*- coding: utf-8 -*-
"""
Excel 파일 분석 스크립트
수업목록(원생포함) 파일에서 수업명과 학생 정보 추출
"""

import pandas as pd
import sys
import io

# 콘솔 인코딩 설정
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Excel 파일 읽기
excel_path = r'c:\MYCLAUDE_PROJECT\pdf\수업목록(원생포함)_20251216101435.xlsx'
df = pd.read_excel(excel_path)

print("=" * 60)
print("Excel 파일 구조 분석")
print("=" * 60)

print(f"\n총 컬럼: {list(df.columns)}")
print(f"총 행 수: {len(df)}")

print("\n" + "=" * 60)
print("모든 수업명 목록")
print("=" * 60)

class_names = df['수업명'].unique()
for name in sorted(class_names):
    count = len(df[df['수업명'] == name])
    print(f"  {name}: {count}명")

print(f"\n총 수업 수: {len(class_names)}")

print("\n" + "=" * 60)
print("샘플 데이터 (첫 20행)")
print("=" * 60)
cols_to_show = ['수업명', '이름', '학년', '학교', '상태']
print(df[cols_to_show].head(20).to_string())

print("\n" + "=" * 60)
print("고유 학생 수")
print("=" * 60)
unique_students = df['이름'].nunique()
print(f"고유 학생 수: {unique_students}")
