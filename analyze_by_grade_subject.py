# -*- coding: utf-8 -*-
"""
Excel 수업 데이터를 학생의 실제 학년 × 과목별로 분류
- 수업명에서 과목만 추출
- 학년은 학생 테이블의 '학년' 컬럼 사용
"""

import pandas as pd
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Excel 파일 읽기
df = pd.read_excel(r'c:\MYCLAUDE_PROJECT\pdf\수업목록(원생포함)_20251216101435.xlsx')

# 과목 추출 함수 (수업명에서)
def get_subject(class_name):
    if '과학' in class_name:
        return '과학'
    elif '국어' in class_name or '책나무' in class_name:
        return '국어'
    elif '수학' in class_name:
        return '수학'
    elif '영어' in class_name:
        return '영어'
    return '기타'

# 데이터에 과목 컬럼 추가 (수업명 기준)
df['과목'] = df['수업명'].apply(get_subject)

# 수강 중인 학생만 필터
df_active = df[df['상태'] == '수강'].copy()

print("=" * 70)
print("학년별 × 과목별 수강 현황 (학생의 실제 학년 기준)")
print("=" * 70)

# 피벗 테이블 생성 - 학생의 '학년' 컬럼 사용
pivot = pd.pivot_table(
    df_active,
    values='이름',
    index='학년',  # 학생 테이블의 학년 컬럼!
    columns='과목',
    aggfunc='count',
    fill_value=0
)

# 학년 순서 정렬
grade_order = ['초1', '초2', '초3', '초4', '초5', '초6',
               '중1', '중2', '중3',
               '고1', '고2', '고3']
pivot = pivot.reindex([g for g in grade_order if g in pivot.index])

# 과목 순서 정렬
subject_order = ['국어', '영어', '수학', '과학', '기타']
pivot = pivot[[s for s in subject_order if s in pivot.columns]]

# 합계 추가
pivot['합계'] = pivot.sum(axis=1)
pivot.loc['합계'] = pivot.sum()

print(pivot.to_string())

print("\n" + "=" * 70)
print("고유 학생 수 (학년별)")
print("=" * 70)

# 학생별 학년 정보 (중복 제거)
student_grade = df_active[['이름', '학년']].drop_duplicates()
grade_counts = student_grade['학년'].value_counts()
grade_counts = grade_counts.reindex([g for g in grade_order if g in grade_counts.index])
print(grade_counts.to_string())
print(f"\n총 고유 학생 수: {len(student_grade)}")

print("\n" + "=" * 70)
print("학생별 수강 과목 수")
print("=" * 70)

# 학생별 과목 수
student_subjects = df_active.groupby('이름')['과목'].apply(lambda x: list(set(x)))
subject_count = student_subjects.apply(len).value_counts().sort_index()
print("수강 과목 수 | 학생 수")
for cnt, num in subject_count.items():
    print(f"    {cnt}개    |  {num}명")

print("\n" + "=" * 70)
print("4과목(국영수과) 모두 수강 학생")
print("=" * 70)

all_subjects = student_subjects[student_subjects.apply(lambda x: len(set(x) & {'국어', '영어', '수학', '과학'}) == 4)]
if len(all_subjects) > 0:
    for name, subjects in all_subjects.items():
        grade = df_active[df_active['이름'] == name]['학년'].iloc[0]
        print(f"  {name} ({grade}): {', '.join(sorted(subjects))}")
else:
    print("  (없음)")

print("\n" + "=" * 70)
print("3과목 수강 학생")
print("=" * 70)

three_subjects = student_subjects[student_subjects.apply(len) == 3]
for name, subjects in three_subjects.items():
    grade = df_active[df_active['이름'] == name]['학년'].iloc[0]
    print(f"  {name} ({grade}): {', '.join(sorted(subjects))}")
