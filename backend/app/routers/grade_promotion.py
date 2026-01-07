"""
학년 일괄 승급 API 라우터

매년 3월에 모든 학생의 학년을 한 단계 올리는 기능
- 고3 학생: 졸업 처리 (is_active = false)
- 나머지: 한 학년 올림 (초6 → 중1, 중3 → 고1 등)
- 반(class) 자동 승급: 중1 수학 심화 → 중2 수학 심화
- 이력 저장으로 롤백 지원
"""

import json
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from app.utils.supabase_admin import get_supabase_admin
from app.utils.class_parser import (
    parse_class_name,
    get_promoted_class_name,
    can_auto_promote
)

router = APIRouter(prefix="/api/grade-promotion", tags=["Grade Promotion"])


# =====================================================
# Request/Response Models
# =====================================================

class PromotionPreviewStudent(BaseModel):
    """승급 미리보기 학생 정보"""
    id: str
    name: str
    current_grade: str
    next_grade: Optional[str]  # None이면 졸업
    school: Optional[str]


class PromotionPreviewResponse(BaseModel):
    """승급 미리보기 응답"""
    total_students: int
    to_promote: int        # 승급 대상
    to_graduate: int       # 졸업 대상 (고3)
    inactive_count: int    # 이미 비활성 (스킵)
    students: list[PromotionPreviewStudent]


class PromotionExecuteRequest(BaseModel):
    """승급 실행 요청"""
    confirm: bool = False  # 확인 플래그 (True여야 실행)


class PromotionExecuteResponse(BaseModel):
    """승급 실행 응답"""
    success: bool
    batch_id: str           # 롤백용 배치 ID
    promoted_count: int     # 승급된 학생 수
    graduated_count: int    # 졸업 처리된 학생 수
    message: str


class PromotionHistoryItem(BaseModel):
    """승급 이력 항목"""
    batch_id: str
    promoted_at: str
    total_affected: int
    promoted_count: int
    graduated_count: int
    is_rolled_back: bool
    rolled_back_at: Optional[str]


class PromotionHistoryResponse(BaseModel):
    """승급 이력 목록 응답"""
    history: list[PromotionHistoryItem]


class RollbackRequest(BaseModel):
    """롤백 요청"""
    batch_id: str
    confirm: bool = False


class RollbackResponse(BaseModel):
    """롤백 응답"""
    success: bool
    restored_count: int
    reactivated_count: int  # 졸업→활성 복원
    message: str


# =====================================================
# V2 Models (반 승급 정보 포함)
# =====================================================

class ClassPromotionInfo(BaseModel):
    """반 승급 정보"""
    enrollment_id: str
    current_class_id: str
    current_class_name: str
    new_class_id: Optional[str]      # None이면 반 해제
    new_class_name: Optional[str]
    status: str                       # "auto", "unassigned", "graduated"
    reason: Optional[str]


class PromotionPreviewStudentV2(BaseModel):
    """승급 미리보기 학생 정보 (반 정보 포함)"""
    id: str
    name: str
    current_grade: str
    next_grade: Optional[str]
    school: Optional[str]
    class_promotions: List[ClassPromotionInfo]  # 반 승급 정보 목록


class PromotionPreviewResponseV2(BaseModel):
    """승급 미리보기 응답 (반 정보 포함)"""
    total_students: int
    to_promote: int
    to_graduate: int
    inactive_count: int
    students: List[PromotionPreviewStudentV2]
    # 반 승급 통계
    class_auto_count: int       # 자동 이동 가능
    class_unassigned_count: int # 수동 배정 필요


class PromotionExecuteResponseV2(BaseModel):
    """승급 실행 응답 V2 (반 승급 포함)"""
    success: bool
    batch_id: str
    promoted_count: int
    graduated_count: int
    class_auto_moved: int       # 자동 반 이동
    class_unassigned: int       # 반 해제 (수동 배정 필요)
    message: str


# 학년 순서 (sort_order 기반)
GRADE_ORDER = [
    "초1", "초2", "초3", "초4", "초5", "초6",
    "중1", "중2", "중3",
    "고1", "고2", "고3"
]


def get_next_grade(current_grade: str) -> Optional[str]:
    """
    현재 학년의 다음 학년 반환
    고3이면 None (졸업)
    """
    try:
        idx = GRADE_ORDER.index(current_grade)
        if idx >= len(GRADE_ORDER) - 1:
            return None  # 고3 → 졸업
        return GRADE_ORDER[idx + 1]
    except ValueError:
        return None  # 알 수 없는 학년


# =====================================================
# API Endpoints
# =====================================================

@router.get("/preview", response_model=PromotionPreviewResponse)
async def preview_promotion():
    """
    학년 승급 미리보기

    현재 활성 학생들의 승급 예정 정보를 반환합니다.
    - 각 학생의 현재 학년과 승급 후 학년
    - 고3 학생은 졸업 예정으로 표시
    """
    supabase = get_supabase_admin()

    # 활성 학생 + 학년 정보 조회
    response = supabase.from_("students") \
        .select("id, name, school, grade_id, is_active, grades(id, name)") \
        .eq("is_active", True) \
        .execute()

    students = response.data or []

    preview_students = []
    to_promote = 0
    to_graduate = 0

    for student in students:
        grade_info = student.get("grades")
        current_grade = grade_info.get("name") if grade_info else None

        if not current_grade:
            continue

        next_grade = get_next_grade(current_grade)

        preview_students.append(PromotionPreviewStudent(
            id=student["id"],
            name=student["name"],
            current_grade=current_grade,
            next_grade=next_grade,
            school=student.get("school")
        ))

        if next_grade is None:
            to_graduate += 1
        else:
            to_promote += 1

    # 학년 순으로 정렬
    preview_students.sort(
        key=lambda s: (
            GRADE_ORDER.index(s.current_grade) if s.current_grade in GRADE_ORDER else 999,
            s.name
        )
    )

    # 비활성 학생 수 조회
    inactive_response = supabase.from_("students") \
        .select("id", count="exact") \
        .eq("is_active", False) \
        .execute()
    inactive_count = inactive_response.count or 0

    return PromotionPreviewResponse(
        total_students=len(students),
        to_promote=to_promote,
        to_graduate=to_graduate,
        inactive_count=inactive_count,
        students=preview_students
    )


@router.post("/execute", response_model=PromotionExecuteResponse)
async def execute_promotion(request: PromotionExecuteRequest):
    """
    학년 일괄 승급 실행

    - 고3 학생: is_active = false로 변경 (졸업 처리)
    - 나머지 학생: grade_id를 다음 학년으로 변경
    - 이력 저장으로 롤백 가능
    """
    if not request.confirm:
        raise HTTPException(
            status_code=400,
            detail="confirm 플래그가 True여야 실행됩니다. 미리보기를 먼저 확인하세요."
        )

    supabase = get_supabase_admin()
    batch_id = str(uuid.uuid4())

    # 1. grades 테이블에서 학년 ID 매핑 조회
    grades_response = supabase.from_("grades") \
        .select("id, name") \
        .execute()

    grade_name_to_id = {g["name"]: g["id"] for g in (grades_response.data or [])}
    grade_id_to_name = {g["id"]: g["name"] for g in (grades_response.data or [])}

    # 2. 활성 학생 조회
    students_response = supabase.from_("students") \
        .select("id, name, grade_id, is_active, grades(id, name)") \
        .eq("is_active", True) \
        .execute()

    students = students_response.data or []

    promoted_count = 0
    graduated_count = 0
    history_records = []

    for student in students:
        grade_info = student.get("grades")
        current_grade = grade_info.get("name") if grade_info else None
        current_grade_id = student.get("grade_id")

        if not current_grade:
            continue

        next_grade = get_next_grade(current_grade)
        next_grade_id = grade_name_to_id.get(next_grade) if next_grade else None

        # 이력 레코드 준비
        history_record = {
            "batch_id": batch_id,
            "student_id": student["id"],
            "student_name": student["name"],
            "previous_grade_id": current_grade_id,
            "previous_grade_name": current_grade,
            "new_grade_id": next_grade_id,
            "new_grade_name": next_grade,
            "previous_is_active": True,
            "new_is_active": next_grade is not None,
        }
        history_records.append(history_record)

        if next_grade is None:
            # 고3 → 졸업 처리
            supabase.from_("students") \
                .update({"is_active": False}) \
                .eq("id", student["id"]) \
                .execute()
            graduated_count += 1
        else:
            # 다음 학년으로 승급
            if next_grade_id:
                supabase.from_("students") \
                    .update({"grade_id": next_grade_id}) \
                    .eq("id", student["id"]) \
                    .execute()
                promoted_count += 1

    # 3. 이력 저장
    if history_records:
        supabase.from_("grade_promotion_history") \
            .insert(history_records) \
            .execute()

    return PromotionExecuteResponse(
        success=True,
        batch_id=batch_id,
        promoted_count=promoted_count,
        graduated_count=graduated_count,
        message=f"학년 승급 완료: {promoted_count}명 승급, {graduated_count}명 졸업 처리"
    )


@router.get("/history", response_model=PromotionHistoryResponse)
async def get_promotion_history():
    """
    승급 이력 조회

    롤백 가능한 승급 배치 목록을 반환합니다.
    """
    supabase = get_supabase_admin()

    # 배치별로 그룹화된 이력 조회
    response = supabase.from_("grade_promotion_history") \
        .select("batch_id, promoted_at, is_rolled_back, rolled_back_at, new_is_active") \
        .order("promoted_at", desc=True) \
        .execute()

    records = response.data or []

    # 배치별로 집계
    batch_map = {}
    for record in records:
        batch_id = record["batch_id"]
        if batch_id not in batch_map:
            batch_map[batch_id] = {
                "batch_id": batch_id,
                "promoted_at": record["promoted_at"],
                "is_rolled_back": record["is_rolled_back"],
                "rolled_back_at": record["rolled_back_at"],
                "total_affected": 0,
                "promoted_count": 0,
                "graduated_count": 0,
            }

        batch_map[batch_id]["total_affected"] += 1
        if record["new_is_active"]:
            batch_map[batch_id]["promoted_count"] += 1
        else:
            batch_map[batch_id]["graduated_count"] += 1

    history = [
        PromotionHistoryItem(**batch)
        for batch in batch_map.values()
    ]

    # 날짜 내림차순 정렬
    history.sort(key=lambda x: x.promoted_at, reverse=True)

    return PromotionHistoryResponse(history=history)


@router.post("/rollback", response_model=RollbackResponse)
async def rollback_promotion(request: RollbackRequest):
    """
    학년 승급 롤백

    특정 배치의 승급을 되돌립니다.
    - 승급된 학생: 이전 학년으로 복원
    - 졸업 처리된 학생: is_active = true로 복원
    """
    if not request.confirm:
        raise HTTPException(
            status_code=400,
            detail="confirm 플래그가 True여야 실행됩니다."
        )

    supabase = get_supabase_admin()

    # 1. 해당 배치의 이력 조회
    history_response = supabase.from_("grade_promotion_history") \
        .select("*") \
        .eq("batch_id", request.batch_id) \
        .eq("is_rolled_back", False) \
        .execute()

    history_records = history_response.data or []

    if not history_records:
        raise HTTPException(
            status_code=404,
            detail="롤백할 이력이 없거나 이미 롤백되었습니다."
        )

    restored_count = 0
    reactivated_count = 0

    # 2. 각 학생 복원
    for record in history_records:
        student_id = record["student_id"]
        previous_grade_id = record["previous_grade_id"]
        previous_is_active = record["previous_is_active"]
        new_is_active = record["new_is_active"]

        update_data = {}

        # 학년 복원
        if previous_grade_id:
            update_data["grade_id"] = previous_grade_id
            restored_count += 1

        # 활성 상태 복원 (졸업 → 활성)
        if not new_is_active and previous_is_active:
            update_data["is_active"] = True
            reactivated_count += 1

        if update_data:
            supabase.from_("students") \
                .update(update_data) \
                .eq("id", student_id) \
                .execute()

    # 3. 이력 롤백 표시
    supabase.from_("grade_promotion_history") \
        .update({
            "is_rolled_back": True,
            "rolled_back_at": datetime.now().isoformat()
        }) \
        .eq("batch_id", request.batch_id) \
        .execute()

    return RollbackResponse(
        success=True,
        restored_count=restored_count,
        reactivated_count=reactivated_count,
        message=f"롤백 완료: {restored_count}명 학년 복원, {reactivated_count}명 졸업 취소"
    )


@router.get("/status")
async def get_grade_stats():
    """
    현재 학년별 학생 수 통계
    """
    supabase = get_supabase_admin()

    # 학년별 활성 학생 수
    response = supabase.from_("students") \
        .select("grade_id, grades(name), is_active") \
        .eq("is_active", True) \
        .execute()

    students = response.data or []

    grade_counts = {}
    for student in students:
        grade_info = student.get("grades")
        grade_name = grade_info.get("name") if grade_info else "미지정"
        grade_counts[grade_name] = grade_counts.get(grade_name, 0) + 1

    # 정렬된 결과
    sorted_stats = []
    for grade in GRADE_ORDER:
        if grade in grade_counts:
            sorted_stats.append({
                "grade": grade,
                "count": grade_counts[grade]
            })

    # 미지정 학년이 있으면 마지막에 추가
    if "미지정" in grade_counts:
        sorted_stats.append({
            "grade": "미지정",
            "count": grade_counts["미지정"]
        })

    return {
        "total_active": len(students),
        "by_grade": sorted_stats
    }


# =====================================================
# V2 API Endpoints (반 승급 포함)
# =====================================================

@router.get("/preview/v2", response_model=PromotionPreviewResponseV2)
async def preview_promotion_v2():
    """
    학년 승급 미리보기 V2 (반 승급 정보 포함)

    현재 활성 학생들의 승급 예정 정보를 반환합니다.
    - 각 학생의 현재 학년과 승급 후 학년
    - 각 학생의 반(class) 승급 정보
    - 고3 학생은 졸업 예정으로 표시
    """
    supabase = get_supabase_admin()

    # 1. 활성 학생 + 학년 정보 조회
    students_response = supabase.from_("students") \
        .select("id, name, school, grade_id, is_active, grades(id, name)") \
        .eq("is_active", True) \
        .execute()

    students = students_response.data or []

    # 2. 모든 활성 반 조회 (새 반 매칭용)
    classes_response = supabase.from_("classes") \
        .select("id, name, grade_id, grades(name)") \
        .eq("is_active", True) \
        .execute()

    classes = classes_response.data or []
    # 반 이름 → 반 정보 매핑
    class_name_to_info = {c["name"]: c for c in classes}

    # 3. 모든 활성 enrollment 조회
    enrollments_response = supabase.from_("enrollments") \
        .select("id, student_id, class_id, is_active, classes(id, name)") \
        .eq("is_active", True) \
        .execute()

    enrollments = enrollments_response.data or []
    # 학생별 enrollment 그룹핑
    student_enrollments = {}
    for enrollment in enrollments:
        student_id = enrollment["student_id"]
        if student_id not in student_enrollments:
            student_enrollments[student_id] = []
        student_enrollments[student_id].append(enrollment)

    preview_students = []
    to_promote = 0
    to_graduate = 0
    class_auto_count = 0
    class_unassigned_count = 0

    for student in students:
        grade_info = student.get("grades")
        current_grade = grade_info.get("name") if grade_info else None

        if not current_grade:
            continue

        next_grade = get_next_grade(current_grade)
        is_graduating = next_grade is None

        # 학생의 반 승급 정보 계산
        class_promotions = []
        student_id = student["id"]
        student_enrollment_list = student_enrollments.get(student_id, [])

        for enrollment in student_enrollment_list:
            class_info = enrollment.get("classes")
            if not class_info:
                continue

            current_class_name = class_info.get("name", "")
            current_class_id = class_info.get("id", "")

            if is_graduating:
                # 졸업 처리 - 모든 반 해제
                class_promotions.append(ClassPromotionInfo(
                    enrollment_id=enrollment["id"],
                    current_class_id=current_class_id,
                    current_class_name=current_class_name,
                    new_class_id=None,
                    new_class_name=None,
                    status="graduated",
                    reason="졸업"
                ))
                class_unassigned_count += 1
            else:
                # 반 승급 시도
                new_class_name, status = get_promoted_class_name(
                    current_class_name, next_grade
                )

                if status == "auto" and new_class_name:
                    # 새 반이 실제로 존재하는지 확인
                    new_class_info = class_name_to_info.get(new_class_name)
                    if new_class_info:
                        class_promotions.append(ClassPromotionInfo(
                            enrollment_id=enrollment["id"],
                            current_class_id=current_class_id,
                            current_class_name=current_class_name,
                            new_class_id=new_class_info["id"],
                            new_class_name=new_class_name,
                            status="auto",
                            reason="자동 이동"
                        ))
                        class_auto_count += 1
                    else:
                        # 새 반이 존재하지 않음
                        class_promotions.append(ClassPromotionInfo(
                            enrollment_id=enrollment["id"],
                            current_class_id=current_class_id,
                            current_class_name=current_class_name,
                            new_class_id=None,
                            new_class_name=new_class_name,
                            status="unassigned",
                            reason=f"'{new_class_name}' 반이 존재하지 않음"
                        ))
                        class_unassigned_count += 1
                else:
                    # 자동 매칭 불가 (번호 반 등)
                    _, reason = can_auto_promote(current_class_name)
                    class_promotions.append(ClassPromotionInfo(
                        enrollment_id=enrollment["id"],
                        current_class_id=current_class_id,
                        current_class_name=current_class_name,
                        new_class_id=None,
                        new_class_name=None,
                        status="unassigned",
                        reason=reason
                    ))
                    class_unassigned_count += 1

        preview_students.append(PromotionPreviewStudentV2(
            id=student["id"],
            name=student["name"],
            current_grade=current_grade,
            next_grade=next_grade,
            school=student.get("school"),
            class_promotions=class_promotions
        ))

        if is_graduating:
            to_graduate += 1
        else:
            to_promote += 1

    # 학년 순으로 정렬
    preview_students.sort(
        key=lambda s: (
            GRADE_ORDER.index(s.current_grade) if s.current_grade in GRADE_ORDER else 999,
            s.name
        )
    )

    # 비활성 학생 수 조회
    inactive_response = supabase.from_("students") \
        .select("id", count="exact") \
        .eq("is_active", False) \
        .execute()
    inactive_count = inactive_response.count or 0

    return PromotionPreviewResponseV2(
        total_students=len(students),
        to_promote=to_promote,
        to_graduate=to_graduate,
        inactive_count=inactive_count,
        students=preview_students,
        class_auto_count=class_auto_count,
        class_unassigned_count=class_unassigned_count
    )


@router.post("/execute/v2", response_model=PromotionExecuteResponseV2)
async def execute_promotion_v2(request: PromotionExecuteRequest):
    """
    학년 일괄 승급 실행 V2 (반 승급 포함)

    1. 학년 승급 (기존 로직)
    2. 반 승급 (새 로직)
       - 자동 매칭 가능: enrollment.class_id 변경
       - 자동 매칭 불가: enrollment.is_active = false
    """
    if not request.confirm:
        raise HTTPException(
            status_code=400,
            detail="confirm 플래그가 True여야 실행됩니다. 미리보기를 먼저 확인하세요."
        )

    supabase = get_supabase_admin()
    batch_id = str(uuid.uuid4())

    # 1. grades 테이블에서 학년 ID 매핑 조회
    grades_response = supabase.from_("grades") \
        .select("id, name") \
        .execute()

    grade_name_to_id = {g["name"]: g["id"] for g in (grades_response.data or [])}

    # 2. 모든 활성 반 조회
    classes_response = supabase.from_("classes") \
        .select("id, name") \
        .eq("is_active", True) \
        .execute()

    class_name_to_id = {c["name"]: c["id"] for c in (classes_response.data or [])}

    # 3. 활성 학생 조회
    students_response = supabase.from_("students") \
        .select("id, name, grade_id, is_active, grades(id, name)") \
        .eq("is_active", True) \
        .execute()

    students = students_response.data or []

    # 4. 모든 활성 enrollment 조회
    enrollments_response = supabase.from_("enrollments") \
        .select("id, student_id, class_id, is_active, classes(id, name)") \
        .eq("is_active", True) \
        .execute()

    enrollments = enrollments_response.data or []
    # 학생별 enrollment 그룹핑
    student_enrollments = {}
    for enrollment in enrollments:
        student_id = enrollment["student_id"]
        if student_id not in student_enrollments:
            student_enrollments[student_id] = []
        student_enrollments[student_id].append(enrollment)

    promoted_count = 0
    graduated_count = 0
    class_auto_moved = 0
    class_unassigned = 0
    history_records = []

    for student in students:
        grade_info = student.get("grades")
        current_grade = grade_info.get("name") if grade_info else None
        current_grade_id = student.get("grade_id")

        if not current_grade:
            continue

        next_grade = get_next_grade(current_grade)
        next_grade_id = grade_name_to_id.get(next_grade) if next_grade else None
        is_graduating = next_grade is None

        # 반 변경 정보 수집
        class_changes = []
        student_id = student["id"]
        student_enrollment_list = student_enrollments.get(student_id, [])

        for enrollment in student_enrollment_list:
            class_info = enrollment.get("classes")
            if not class_info:
                continue

            current_class_name = class_info.get("name", "")
            current_class_id = enrollment.get("class_id")
            enrollment_id = enrollment["id"]

            if is_graduating:
                # 졸업 - 반 해제
                supabase.from_("enrollments") \
                    .update({"is_active": False}) \
                    .eq("id", enrollment_id) \
                    .execute()

                class_changes.append({
                    "enrollment_id": enrollment_id,
                    "previous_class_id": current_class_id,
                    "previous_class_name": current_class_name,
                    "new_class_id": None,
                    "new_class_name": None,
                    "status": "graduated"
                })
                class_unassigned += 1
            else:
                # 반 승급 시도
                new_class_name, status = get_promoted_class_name(
                    current_class_name, next_grade
                )

                if status == "auto" and new_class_name:
                    new_class_id = class_name_to_id.get(new_class_name)
                    if new_class_id:
                        # 자동 이동
                        supabase.from_("enrollments") \
                            .update({"class_id": new_class_id}) \
                            .eq("id", enrollment_id) \
                            .execute()

                        class_changes.append({
                            "enrollment_id": enrollment_id,
                            "previous_class_id": current_class_id,
                            "previous_class_name": current_class_name,
                            "new_class_id": new_class_id,
                            "new_class_name": new_class_name,
                            "status": "auto"
                        })
                        class_auto_moved += 1
                    else:
                        # 새 반이 존재하지 않음 - 반 해제
                        supabase.from_("enrollments") \
                            .update({"is_active": False}) \
                            .eq("id", enrollment_id) \
                            .execute()

                        class_changes.append({
                            "enrollment_id": enrollment_id,
                            "previous_class_id": current_class_id,
                            "previous_class_name": current_class_name,
                            "new_class_id": None,
                            "new_class_name": new_class_name,
                            "status": "unassigned"
                        })
                        class_unassigned += 1
                else:
                    # 자동 매칭 불가 - 반 해제
                    supabase.from_("enrollments") \
                        .update({"is_active": False}) \
                        .eq("id", enrollment_id) \
                        .execute()

                    class_changes.append({
                        "enrollment_id": enrollment_id,
                        "previous_class_id": current_class_id,
                        "previous_class_name": current_class_name,
                        "new_class_id": None,
                        "new_class_name": None,
                        "status": "unassigned"
                    })
                    class_unassigned += 1

        # 이력 레코드 준비 (반 변경 정보 포함)
        history_record = {
            "batch_id": batch_id,
            "student_id": student_id,
            "student_name": student["name"],
            "previous_grade_id": current_grade_id,
            "previous_grade_name": current_grade,
            "new_grade_id": next_grade_id,
            "new_grade_name": next_grade,
            "previous_is_active": True,
            "new_is_active": not is_graduating,
            "class_changes": json.dumps(class_changes, ensure_ascii=False) if class_changes else None
        }
        history_records.append(history_record)

        if is_graduating:
            # 고3 → 졸업 처리
            supabase.from_("students") \
                .update({"is_active": False}) \
                .eq("id", student_id) \
                .execute()
            graduated_count += 1
        else:
            # 다음 학년으로 승급
            if next_grade_id:
                supabase.from_("students") \
                    .update({"grade_id": next_grade_id}) \
                    .eq("id", student_id) \
                    .execute()
                promoted_count += 1

    # 5. 이력 저장
    if history_records:
        supabase.from_("grade_promotion_history") \
            .insert(history_records) \
            .execute()

    return PromotionExecuteResponseV2(
        success=True,
        batch_id=batch_id,
        promoted_count=promoted_count,
        graduated_count=graduated_count,
        class_auto_moved=class_auto_moved,
        class_unassigned=class_unassigned,
        message=f"학년 승급 완료: {promoted_count}명 승급, {graduated_count}명 졸업 처리 / 반: {class_auto_moved}개 자동 이동, {class_unassigned}개 수동 배정 필요"
    )


# =====================================================
# Batch Assign API (승급 후 빠른 배정)
# =====================================================

class BatchAssignRequest(BaseModel):
    """일괄 배정 요청"""
    enrollment_ids: List[str]
    new_class_id: str


class BatchAssignResponse(BaseModel):
    """일괄 배정 응답"""
    success: bool
    assigned_count: int
    message: str


@router.post("/batch-assign", response_model=BatchAssignResponse)
async def batch_assign_enrollments(request: BatchAssignRequest):
    """
    미배정 enrollment들을 특정 반에 일괄 배정

    승급 후 반 해제된 학생들을 빠르게 새 반에 배정할 때 사용
    1. enrollment.class_id 변경
    2. enrollment.is_active = True
    """
    supabase = get_supabase_admin()

    assigned_count = 0
    for enrollment_id in request.enrollment_ids:
        try:
            result = supabase.from_("enrollments") \
                .update({
                    "class_id": request.new_class_id,
                    "is_active": True
                }) \
                .eq("id", enrollment_id) \
                .execute()

            if result.data:
                assigned_count += 1
        except Exception as e:
            # 개별 실패는 무시하고 계속 진행
            print(f"Failed to assign enrollment {enrollment_id}: {e}")
            continue

    return BatchAssignResponse(
        success=True,
        assigned_count=assigned_count,
        message=f"{assigned_count}개 등록 완료"
    )
