"""
설정 관리 라우터 (Phase 34-C)

과정 목록 동적 관리
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List
import json

from app.config import config


router = APIRouter()


class AddCourseRequest(BaseModel):
    grade: str
    course: str


def get_courses_config() -> dict:
    """courses.json 로드"""
    config_path = config.DATASET_ROOT / "config" / "courses.json"
    if not config_path.exists():
        # 기본값 반환
        return {
            "version": 1,
            "defaultCourses": {
                "고1": ["공통수학1", "공통수학2", "수학"],
                "고2": ["미적분", "확률과통계", "기하", "수학I", "수학II"],
                "고3": ["미적분", "확률과통계", "기하", "수학I", "수학II"],
                "중1": ["수학"],
                "중2": ["수학"],
                "중3": ["수학"]
            },
            "customCourses": {}
        }

    with open(config_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_courses_config(data: dict):
    """courses.json 저장"""
    config_path = config.DATASET_ROOT / "config" / "courses.json"
    config_path.parent.mkdir(parents=True, exist_ok=True)

    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


@router.get("/courses")
async def get_courses():
    """
    과정 목록 조회 (기본 + 사용자 추가)

    Returns:
        {
            "defaultCourses": { "고1": [...], "고2": [...], ... },
            "customCourses": { "고1": [...], ... }
        }
    """
    try:
        data = get_courses_config()
        return {
            "defaultCourses": data.get("defaultCourses", {}),
            "customCourses": data.get("customCourses", {})
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"과정 목록 조회 실패: {str(e)}")


@router.post("/courses")
async def add_course(request: AddCourseRequest):
    """
    과정 추가 (사용자 정의)

    Args:
        grade: 학년 (예: "고1")
        course: 과정명 (예: "심화수학")
    """
    try:
        data = get_courses_config()

        # customCourses 초기화
        if "customCourses" not in data:
            data["customCourses"] = {}

        # 해당 학년의 customCourses 초기화
        if request.grade not in data["customCourses"]:
            data["customCourses"][request.grade] = []

        # 이미 존재하는지 확인 (기본 + 사용자 정의)
        default_courses = data.get("defaultCourses", {}).get(request.grade, [])
        custom_courses = data["customCourses"][request.grade]

        if request.course in default_courses or request.course in custom_courses:
            raise HTTPException(status_code=400, detail=f"'{request.course}'는 이미 존재하는 과정입니다")

        # 추가
        data["customCourses"][request.grade].append(request.course)
        save_courses_config(data)

        return {"message": f"'{request.course}' 과정이 추가되었습니다", "grade": request.grade, "course": request.course}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"과정 추가 실패: {str(e)}")


@router.delete("/courses/{grade}/{course}")
async def delete_course(grade: str, course: str):
    """
    사용자 정의 과정 삭제

    Args:
        grade: 학년 (예: "고1")
        course: 과정명 (예: "심화수학")
    """
    try:
        data = get_courses_config()

        # 기본 과정은 삭제 불가
        default_courses = data.get("defaultCourses", {}).get(grade, [])
        if course in default_courses:
            raise HTTPException(status_code=400, detail="기본 과정은 삭제할 수 없습니다")

        # customCourses에서 삭제
        custom_courses = data.get("customCourses", {}).get(grade, [])
        if course not in custom_courses:
            raise HTTPException(status_code=404, detail=f"'{course}' 과정을 찾을 수 없습니다")

        data["customCourses"][grade].remove(course)
        save_courses_config(data)

        return {"message": f"'{course}' 과정이 삭제되었습니다", "grade": grade, "course": course}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"과정 삭제 실패: {str(e)}")
