"""
Supabase 학생 동기화 스크립트
스크래핑 결과를 DB와 동기화

사용법:
  python sync_api.py --preview   # 미리보기 (dry_run=True)
  python sync_api.py --execute   # 실제 동기화 (dry_run=False)
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime
from supabase import create_client, Client

# Windows 콘솔 인코딩 설정
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Supabase 설정
SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL:
    print(json.dumps({"error": "SUPABASE_URL이 설정되지 않았습니다"}))
    sys.exit(1)

if not SERVICE_ROLE_KEY:
    print(json.dumps({"error": "SUPABASE_SERVICE_KEY가 설정되지 않았습니다"}))
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)


# 학년 정규화 패턴
GRADE_PATTERNS = [
    # 중학교
    (r'중[등학교]*\s*1', '중1'),
    (r'중[등학교]*\s*2', '중2'),
    (r'중[등학교]*\s*3', '중3'),
    # 고등학교
    (r'고[등학교]*\s*1', '고1'),
    (r'고[등학교]*\s*2', '고2'),
    (r'고[등학교]*\s*3', '고3'),
    # 초등학교
    (r'초[등학교]*\s*1', '초1'),
    (r'초[등학교]*\s*2', '초2'),
    (r'초[등학교]*\s*3', '초3'),
    (r'초[등학교]*\s*4', '초4'),
    (r'초[등학교]*\s*5', '초5'),
    (r'초[등학교]*\s*6', '초6'),
]

# 표준 학년 목록
STANDARD_GRADES = ['중1', '중2', '중3', '고1', '고2', '고3', '초1', '초2', '초3', '초4', '초5', '초6']


def normalize_grade(raw_grade: str) -> str:
    """
    학년 문자열을 표준 형식으로 정규화

    Examples:
        "중등 1학년" → "중1"
        "중학교 2학년" → "중2"
        "고1" → "고1"
        "초등학교 5학년" → "초5"
    """
    if not raw_grade:
        return ""

    raw = raw_grade.strip()

    # 이미 표준 형식이면 그대로 반환
    if raw in STANDARD_GRADES:
        return raw

    # 패턴 매칭으로 변환
    for pattern, standard in GRADE_PATTERNS:
        if re.search(pattern, raw):
            return standard

    # 매칭 안되면 원본 반환 (로그용)
    return raw


def map_makeedu_to_supabase(makeedu_student: dict, grade_map: dict = None) -> dict:
    """MakeEdu 데이터를 Supabase 형식으로 변환

    pdf 프로젝트 스키마:
    - grade_id (uuid FK) - NOT grade string
    - is_active (boolean) - NOT status
    """
    raw_grade = makeedu_student.get("grade") or ""
    grade_name = normalize_grade(raw_grade)  # 정규화된 학년
    grade_id = None
    if grade_map and grade_name:
        grade_id = grade_map.get(grade_name)
        if not grade_id and raw_grade:
            print(f"⚠️ 학년 매핑 실패: '{raw_grade}' → '{grade_name}'")

    return {
        "name": makeedu_student["name"],
        "phone": makeedu_student.get("student_phone") or None,
        "parent_phone": makeedu_student.get("parent_phone") or "",
        "grade_id": grade_id,
        "school": makeedu_student.get("school") or None,
        "is_active": True,
        "notes": f"MakeEdu 동기화 (입학일: {makeedu_student.get('admission_date', '-')}, 출결번호: {makeedu_student.get('attendance_no', '-')})",
    }


def sync_students(makeedu_students: list[dict], dry_run: bool = True) -> dict:
    """
    학생 데이터 동기화

    Args:
        makeedu_students: MakeEdu에서 스크래핑한 학생 목록
        dry_run: True면 미리보기만, False면 실제 DB 반영

    Returns:
        동기화 통계 및 변경 내역
    """
    stats = {
        "total": len(makeedu_students),
        "new": 0,
        "existing": 0,
        "updated": 0,
        "deleted": 0,
        "errors": 0,
        "dry_run": dry_run,
        "new_students": [],
        "updated_students": [],
        "deleted_students": [],
    }

    try:
        # grades 테이블에서 grade_id 매핑 로드
        grades_response = supabase.table("grades").select("id, name").execute()
        grade_map = {g["name"]: g["id"] for g in grades_response.data}
    except Exception as e:
        grade_map = {}  # 실패해도 계속 진행

    try:
        # 기존 활성 학생 조회 (pdf 스키마: is_active, grade_id)
        response = supabase.table("students").select(
            "id, name, parent_phone, phone, grade_id, is_active"
        ).eq("is_active", True).execute()

        existing_students = {s["name"]: s for s in response.data}
    except Exception as e:
        return {"error": f"Supabase 조회 실패: {str(e)}"}

    # 각 학생 처리
    for makeedu_student in makeedu_students:
        name = makeedu_student.get("name")
        if not name:
            continue

        try:
            supabase_data = map_makeedu_to_supabase(makeedu_student, grade_map)

            if name in existing_students:
                existing = existing_students[name]
                stats["existing"] += 1

                # 연락처 변경 체크
                phone_changed = (
                    existing.get("parent_phone") != supabase_data["parent_phone"] or
                    existing.get("phone") != supabase_data["phone"]
                )

                if phone_changed:
                    stats["updated"] += 1
                    stats["updated_students"].append({
                        "name": name,
                        "old_phone": existing.get("phone"),
                        "new_phone": supabase_data["phone"],
                        "old_parent_phone": existing.get("parent_phone"),
                        "new_parent_phone": supabase_data["parent_phone"],
                    })

                    if not dry_run:
                        supabase.table("students").update(supabase_data).eq(
                            "id", existing["id"]
                        ).execute()

            else:
                # 신규 학생
                stats["new"] += 1
                stats["new_students"].append({
                    "name": name,
                    "grade": makeedu_student.get("grade"),  # 표시용 원본 값
                    "phone": supabase_data["phone"],
                    "parent_phone": supabase_data["parent_phone"],
                })

                if not dry_run:
                    supabase.table("students").insert(supabase_data).execute()

        except Exception as e:
            stats["errors"] += 1

    # MakeEdu에 없는 학생 → is_active=False 처리
    makeedu_names = {s.get("name") for s in makeedu_students if s.get("name")}

    for name, student in existing_students.items():
        if name not in makeedu_names:
            stats["deleted"] += 1
            stats["deleted_students"].append({
                "name": name,
                "grade_id": student.get("grade_id"),
            })

            if not dry_run:
                try:
                    supabase.table("students").update({
                        "is_active": False
                    }).eq("id", student["id"]).execute()
                except Exception:
                    stats["errors"] += 1

    return stats


def main():
    """메인 실행"""
    parser = argparse.ArgumentParser(description="메이크에듀 학생 동기화")
    parser.add_argument("--preview", action="store_true", help="미리보기 (dry_run)")
    parser.add_argument("--execute", action="store_true", help="실제 동기화")
    args = parser.parse_args()

    if not args.preview and not args.execute:
        print(json.dumps({"error": "--preview 또는 --execute 중 하나를 선택하세요"}))
        sys.exit(1)

    # 스크래핑 결과 파일 경로
    result_file = os.path.join(os.path.dirname(__file__), "temp", "scraping_result.json")

    if not os.path.exists(result_file):
        print(json.dumps({"error": "스크래핑 결과 파일을 찾을 수 없습니다"}))
        sys.exit(1)

    with open(result_file, "r", encoding="utf-8") as f:
        scraping_result = json.load(f)

    students = scraping_result.get("students", [])

    if not students:
        print(json.dumps({"error": "학생 데이터가 없습니다"}))
        sys.exit(1)

    # 동기화 실행
    dry_run = args.preview
    stats = sync_students(students, dry_run=dry_run)

    # 에러 체크
    if "error" in stats:
        print(json.dumps(stats, ensure_ascii=False))
        sys.exit(1)

    # JSON 결과 출력
    result = {
        "success": True,
        "mode": "preview" if dry_run else "execute",
        "stats": stats,
        "timestamp": datetime.now().isoformat(),
    }

    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
