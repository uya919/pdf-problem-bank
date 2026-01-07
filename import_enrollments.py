# -*- coding: utf-8 -*-
"""
Excel 수강 데이터를 Supabase에 가져오는 스크립트

1. Excel에서 수업명 추출 → classes 테이블에 추가
2. 학생 이름으로 students 테이블과 매칭
3. enrollments 테이블에 수강 관계 생성
"""

import pandas as pd
import os
import sys
import io
import json
import requests

# 콘솔 인코딩 설정
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Supabase 설정
SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SERVICE_ROLE_KEY:
    print("SUPABASE_URL 또는 SUPABASE_SERVICE_KEY가 설정되지 않았습니다")
    print(f"SUPABASE_URL: {SUPABASE_URL}")
    print(f"SERVICE_ROLE_KEY: {'[SET]' if SERVICE_ROLE_KEY else '[NOT SET]'}")
    sys.exit(1)

# Supabase REST API 헬퍼
def supabase_select(table: str, select: str = "*", filters: dict = None):
    """Supabase에서 데이터 조회"""
    url = f"{SUPABASE_URL}/rest/v1/{table}?select={select}"
    if filters:
        for key, value in filters.items():
            url += f"&{key}=eq.{value}"

    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }

    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print(f"Error: {response.status_code} - {response.text}")
        return []
    return response.json()


def supabase_insert(table: str, data: dict):
    """Supabase에 데이터 추가"""
    url = f"{SUPABASE_URL}/rest/v1/{table}"

    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

    response = requests.post(url, headers=headers, json=data)
    if response.status_code not in [200, 201]:
        raise Exception(f"Insert error: {response.status_code} - {response.text}")
    return response.json()


# 과목 매핑 규칙
def get_subject(class_name: str) -> str:
    """수업명에서 과목 추출"""
    if '과학' in class_name:
        return '과학'
    elif '국어' in class_name or '책나무' in class_name:
        return '국어'
    elif '수학' in class_name:
        return '수학'
    elif '영어' in class_name:
        return '영어'
    else:
        return '기타'


def get_grade_level(class_name: str) -> str:
    """수업명에서 학년 수준 추출"""
    if class_name.startswith('고'):
        return '고등'
    elif class_name.startswith('중'):
        return '중등'
    elif class_name.startswith('초'):
        return '초등'
    elif '책나무' in class_name:
        return '초등'
    else:
        return '기타'


def main():
    # Excel 파일 읽기
    excel_path = r'c:\MYCLAUDE_PROJECT\pdf\수업목록(원생포함)_20251216101435.xlsx'
    df = pd.read_excel(excel_path)

    print("=" * 60)
    print("1단계: 기존 Supabase 데이터 조회")
    print("=" * 60)

    # 기존 students 조회
    students_data = supabase_select("students", "id,name", {"is_active": "true"})
    students_map = {s["name"]: s["id"] for s in students_data}
    print(f"기존 활성 학생 수: {len(students_map)}")

    # 기존 classes 조회
    classes_data = supabase_select("classes", "id,name,subject")
    classes_map = {c["name"]: {"id": c["id"], "subject": c["subject"]} for c in classes_data}
    print(f"기존 수업 수: {len(classes_map)}")

    # 기존 enrollments 조회
    enrollments_data = supabase_select("enrollments", "student_id,class_id")
    existing_enrollments = {(e["student_id"], e["class_id"]) for e in enrollments_data}
    print(f"기존 수강 관계 수: {len(existing_enrollments)}")

    print("\n" + "=" * 60)
    print("2단계: 수업 생성/확인")
    print("=" * 60)

    # Excel에서 고유 수업명 추출
    unique_classes = df['수업명'].unique()
    classes_created = 0
    classes_existing = 0

    for class_name in unique_classes:
        if class_name in classes_map:
            classes_existing += 1
            print(f"  [존재] {class_name}")
        else:
            # 새 수업 생성
            subject = get_subject(class_name)
            grade_level = get_grade_level(class_name)

            new_class = {
                "name": class_name,
                "subject": subject,
                "description": f"{grade_level} {subject} - {class_name}",
                "is_active": True
            }

            try:
                result = supabase_insert("classes", new_class)
                new_id = result[0]["id"]
                classes_map[class_name] = {"id": new_id, "subject": subject}
                classes_created += 1
                print(f"  [생성] {class_name} ({subject}) -> ID: {new_id}")
            except Exception as e:
                print(f"  [에러] {class_name}: {e}")

    print(f"\n수업 생성: {classes_created}개, 기존: {classes_existing}개")

    print("\n" + "=" * 60)
    print("3단계: 수강 관계 생성")
    print("=" * 60)

    enrollments_created = 0
    enrollments_existing = 0
    students_not_found = []

    for _, row in df.iterrows():
        student_name = row['이름']
        class_name = row['수업명']
        status = row['상태']

        # 수강 상태가 아닌 경우 건너뛰기
        if status != '수강':
            continue

        # 학생 ID 찾기
        if student_name not in students_map:
            if student_name not in students_not_found:
                students_not_found.append(student_name)
            continue

        student_id = students_map[student_name]
        class_id = classes_map[class_name]["id"]

        # 이미 존재하는지 확인
        if (student_id, class_id) in existing_enrollments:
            enrollments_existing += 1
            continue

        # 새 수강 관계 생성
        try:
            new_enrollment = {
                "student_id": student_id,
                "class_id": class_id,
                "is_active": True
            }
            supabase_insert("enrollments", new_enrollment)
            existing_enrollments.add((student_id, class_id))
            enrollments_created += 1
        except Exception as e:
            print(f"  [에러] {student_name} - {class_name}: {e}")

    print(f"\n수강 관계 생성: {enrollments_created}개")
    print(f"기존 수강 관계: {enrollments_existing}개")

    if students_not_found:
        print(f"\n찾지 못한 학생 ({len(students_not_found)}명):")
        for name in students_not_found:
            print(f"  - {name}")

    print("\n" + "=" * 60)
    print("4단계: 결과 요약")
    print("=" * 60)

    # 최종 통계
    final_enrollments = supabase_select("enrollments", "id")
    final_classes = supabase_select("classes", "id")

    print(f"총 수업 수: {len(final_classes)}")
    print(f"총 수강 관계 수: {len(final_enrollments)}")
    print(f"Excel 총 행: {len(df)}")
    print(f"Excel 고유 학생: {df['이름'].nunique()}")

    # 과목별 수강 통계
    print("\n과목별 수강 통계:")
    for subject in ['국어', '수학', '영어', '과학']:
        subject_classes = [name for name, info in classes_map.items() if info.get("subject") == subject]
        subject_count = len(df[df['수업명'].isin(subject_classes)])
        print(f"  {subject}: {subject_count}명")


if __name__ == "__main__":
    main()
