"""
문제(Problem) API 라우터

Phase 21+ A-2: Problem REST API

문제 CRUD 및 검색 API 엔드포인트
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from typing import List, Optional

from ..models.problem import (
    Problem,
    ProblemCreate,
    ProblemUpdate,
    ProblemFilter,
    ProblemListResponse,
    ProblemStats,
)
from ..services.problems import ProblemService, get_problem_service


router = APIRouter(prefix="/api/problems", tags=["problems"])


# ========== 목록/통계 엔드포인트 (정적 경로 먼저!) ==========

@router.get("", response_model=ProblemListResponse)
async def list_problems(
    # 페이지네이션
    page: int = Query(1, ge=1, description="페이지 번호"),
    pageSize: int = Query(20, ge=1, le=100, description="페이지 크기"),
    # 정렬
    sortBy: str = Query("createdAt", description="정렬 기준"),
    sortDesc: bool = Query(True, description="내림차순 정렬"),
    # 분류 필터
    gradeIds: Optional[str] = Query(None, description="학년 ID 목록 (콤마 구분)"),
    majorUnitIds: Optional[str] = Query(None, description="대단원 ID 목록 (콤마 구분)"),
    middleUnitIds: Optional[str] = Query(None, description="중단원 ID 목록 (콤마 구분)"),
    # 속성 필터
    questionTypes: Optional[str] = Query(None, description="문제 유형 목록 (콤마 구분)"),
    difficultyMin: Optional[int] = Query(None, ge=1, le=10, description="최소 난이도"),
    difficultyMax: Optional[int] = Query(None, ge=1, le=10, description="최대 난이도"),
    # 출처 필터
    sourceTypes: Optional[str] = Query(None, description="출처 유형 목록 (콤마 구분)"),
    years: Optional[str] = Query(None, description="출제 연도 목록 (콤마 구분)"),
    # 기타 필터
    tags: Optional[str] = Query(None, description="태그 목록 (콤마 구분)"),
    hasAnswer: Optional[bool] = Query(None, description="정답 있는 문제만"),
    hasSolution: Optional[bool] = Query(None, description="해설 있는 문제만"),
    isFavorite: Optional[bool] = Query(None, description="즐겨찾기만"),
    # 검색
    searchQuery: Optional[str] = Query(None, description="검색어"),
    # 서비스
    service: ProblemService = Depends(get_problem_service),
):
    """
    문제 목록 조회

    필터링, 정렬, 페이지네이션을 지원합니다.
    """
    # 콤마 구분 문자열을 리스트로 변환
    def parse_int_list(s: Optional[str]) -> Optional[List[int]]:
        if not s:
            return None
        return [int(x.strip()) for x in s.split(",") if x.strip().isdigit()]

    def parse_str_list(s: Optional[str]) -> Optional[List[str]]:
        if not s:
            return None
        return [x.strip() for x in s.split(",") if x.strip()]

    # 필터 구성
    filter_obj = ProblemFilter(
        gradeIds=parse_int_list(gradeIds),
        majorUnitIds=parse_int_list(majorUnitIds),
        middleUnitIds=parse_int_list(middleUnitIds),
        questionTypes=parse_str_list(questionTypes),
        difficultyMin=difficultyMin,
        difficultyMax=difficultyMax,
        sourceTypes=parse_str_list(sourceTypes),
        years=parse_int_list(years),
        tags=parse_str_list(tags),
        hasAnswer=hasAnswer,
        hasSolution=hasSolution,
        isFavorite=isFavorite,
        searchQuery=searchQuery,
    )

    return service.list(
        filter=filter_obj,
        page=page,
        page_size=pageSize,
        sort_by=sortBy,
        sort_desc=sortDesc,
    )


@router.get("/stats/summary", response_model=ProblemStats)
async def get_stats(
    service: ProblemService = Depends(get_problem_service),
):
    """
    문제 통계 조회

    전체 문제 통계를 반환합니다.
    """
    return service.get_stats()


@router.get("/tags/all", response_model=List[str])
async def get_all_tags(
    service: ProblemService = Depends(get_problem_service),
):
    """
    전체 태그 목록 조회

    모든 문제에서 사용된 태그 목록을 반환합니다.
    """
    return service.get_all_tags()


@router.get("/by-source/{document_id}", response_model=List[Problem])
async def get_by_source(
    document_id: str,
    groupId: Optional[str] = Query(None, description="그룹 ID"),
    service: ProblemService = Depends(get_problem_service),
):
    """
    출처 기준 문제 조회

    라벨링 시스템에서 생성된 문제를 조회할 때 사용합니다.
    """
    return service.get_by_source(document_id, groupId)


@router.post("", response_model=Problem)
async def create_problem(
    data: ProblemCreate,
    service: ProblemService = Depends(get_problem_service),
):
    """
    문제 생성

    새로운 문제를 생성합니다.
    """
    return service.create(data)


@router.post("/search", response_model=ProblemListResponse)
async def search_problems(
    filter: ProblemFilter = Body(...),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    sortBy: str = Query("createdAt"),
    sortDesc: bool = Query(True),
    service: ProblemService = Depends(get_problem_service),
):
    """
    문제 검색 (POST)

    복잡한 필터 조건으로 검색할 때 사용합니다.
    """
    return service.list(
        filter=filter,
        page=page,
        page_size=pageSize,
        sort_by=sortBy,
        sort_desc=sortDesc,
    )


@router.post("/bulk", response_model=List[Problem])
async def bulk_create(
    items: List[ProblemCreate],
    service: ProblemService = Depends(get_problem_service),
):
    """
    문제 일괄 생성

    여러 문제를 한 번에 생성합니다.
    """
    return service.bulk_create(items)


@router.post("/bulk-fetch", response_model=List[Problem])
async def bulk_fetch(
    ids: List[str] = Body(..., embed=True),
    service: ProblemService = Depends(get_problem_service),
):
    """
    문제 일괄 조회

    Phase F-1: 여러 문제를 한 번에 조회합니다.
    시험지 미리보기에서 사용됩니다.

    Request Body:
    {
        "ids": ["prob1", "prob2", ...]
    }
    """
    return service.bulk_get(ids)


@router.post("/import-from-labeling", response_model=List[Problem])
async def import_from_labeling(
    data: dict = Body(...),
    service: ProblemService = Depends(get_problem_service),
):
    """
    라벨링 시스템에서 문제 가져오기

    Phase 21+ C-1: 라벨링 → 문제은행 연동

    내보낸 문제 이미지를 문제은행에 등록합니다.

    Request Body:
    {
        "documentId": str,           # 문서 ID
        "documentName": str,         # 문서명 (출처명으로 사용)
        "problems": [                # 가져올 문제 목록
            {
                "group_id": str,
                "page_index": int,
                "image_path": str,
                "column": str
            }
        ],
        "defaultSource": {           # 기본 출처 정보
            "type": "book" | "exam" | "custom",
            "name": str,             # 출처명 (없으면 documentName 사용)
            "year": int?,
            "month": int?,
            "organization": str?
        },
        "classification": {          # 기본 분류 (선택)
            "gradeId": int,
            "majorUnitId": int?,
            ...
        },
        "difficulty": int,           # 기본 난이도 (1-10)
        "questionType": str          # 기본 문제 유형
    }
    """
    from app.config import config

    document_id = data.get("documentId")
    document_name = data.get("documentName", document_id)
    problems_data = data.get("problems", [])
    default_source = data.get("defaultSource", {})
    classification = data.get("classification")
    difficulty = data.get("difficulty", 5)
    question_type = data.get("questionType", "short_answer")

    if not document_id or not problems_data:
        raise HTTPException(
            status_code=400,
            detail="documentId와 problems는 필수입니다"
        )

    # ProblemCreate 목록 생성
    items = []
    for p in problems_data:
        # 이미지 URL 생성 (API 경로로 변환)
        image_path = p.get("image_path", "")
        image_url = f"/api/documents/{document_id}/problems/image?image_path={image_path}"

        # 출처 정보 구성
        source = {
            "type": default_source.get("type", "book"),
            "name": default_source.get("name") or document_name,
            "page": p.get("page_index", 0) + 1,  # 0-indexed → 1-indexed
            "problemNumber": int(p.get("group_id", "0").replace("G", "").replace("g", "")) if p.get("group_id") else None,
            "year": default_source.get("year"),
            "month": default_source.get("month"),
            "organization": default_source.get("organization"),
            "documentId": document_id,  # 원본 문서 ID 저장
            "groupId": p.get("group_id"),  # 원본 그룹 ID 저장
        }

        item = ProblemCreate(
            classification=classification,
            questionType=question_type,
            difficulty=difficulty,
            source=source,
            content={
                "imageUrl": image_url,
                "thumbnailUrl": image_url,
            },
            tags=[],
        )
        items.append(item)

    # 일괄 생성
    return service.bulk_create(items)


@router.post("/import-from-hangul", response_model=List[Problem])
async def import_from_hangul(
    data: dict = Body(...),
    service: ProblemService = Depends(get_problem_service),
):
    """
    한글 파일에서 문제 가져오기

    Phase 21+ C-2: 한글 파일 → 문제은행 연동

    파싱된 한글 문제를 문제은행에 등록합니다.

    Request Body:
    {
        "problems": [                # 파싱된 문제 목록
            {
                "id": str,
                "number": str,
                "content_text": str,
                "content_latex": str,
                "answer": str?,
                "answer_latex": str?,
                "explanation": str?
            }
        ],
        "defaultSource": {           # 기본 출처 정보
            "type": "book" | "exam" | "custom",
            "name": str
        },
        "classification": {          # 기본 분류 (선택)
            "gradeId": int,
            "majorUnitId": int?,
            ...
        },
        "difficulty": int,           # 기본 난이도 (1-10)
        "questionType": str          # 기본 문제 유형
    }
    """
    problems_data = data.get("problems", [])
    default_source = data.get("defaultSource", {})
    classification = data.get("classification")
    difficulty = data.get("difficulty", 5)
    question_type = data.get("questionType", "short_answer")

    if not problems_data:
        raise HTTPException(
            status_code=400,
            detail="problems는 필수입니다"
        )

    # ProblemCreate 목록 생성
    items = []
    for p in problems_data:
        # 출처 정보 구성
        source = {
            "type": default_source.get("type", "book"),
            "name": default_source.get("name", "한글 파일"),
            "problemNumber": int(p.get("number", "0")) if p.get("number", "").isdigit() else None,
        }

        # 정답 및 해설
        answer_text = p.get("answer") or p.get("answer_latex")
        solution_text = p.get("explanation")

        item = ProblemCreate(
            classification=classification,
            questionType=question_type,
            difficulty=difficulty,
            source=source,
            content={
                "text": p.get("content_latex") or p.get("content_text"),
            },
            answer=answer_text,
            solution=solution_text,
            tags=[],
        )
        items.append(item)

    # 일괄 생성
    return service.bulk_create(items)


# ========== 동적 경로 (/{problem_id})는 마지막에! ==========

@router.get("/{problem_id}", response_model=Problem)
async def get_problem(
    problem_id: str,
    service: ProblemService = Depends(get_problem_service),
):
    """
    문제 조회

    ID로 문제를 조회합니다.
    """
    problem = service.get(problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="문제를 찾을 수 없습니다")
    return problem


@router.patch("/{problem_id}", response_model=Problem)
async def update_problem(
    problem_id: str,
    data: ProblemUpdate,
    service: ProblemService = Depends(get_problem_service),
):
    """
    문제 수정

    문제 정보를 수정합니다.
    """
    problem = service.update(problem_id, data)
    if not problem:
        raise HTTPException(status_code=404, detail="문제를 찾을 수 없습니다")
    return problem


@router.delete("/{problem_id}")
async def delete_problem(
    problem_id: str,
    service: ProblemService = Depends(get_problem_service),
):
    """
    문제 삭제

    문제를 삭제합니다.
    """
    success = service.delete(problem_id)
    if not success:
        raise HTTPException(status_code=404, detail="문제를 찾을 수 없습니다")
    return {"success": True, "message": "문제가 삭제되었습니다"}


@router.post("/{problem_id}/use", response_model=Problem)
async def increment_usage(
    problem_id: str,
    service: ProblemService = Depends(get_problem_service),
):
    """
    문제 사용 횟수 증가

    시험지에 문제가 추가될 때 호출합니다.
    """
    problem = service.increment_usage(problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="문제를 찾을 수 없습니다")
    return problem


@router.post("/{problem_id}/favorite", response_model=Problem)
async def toggle_favorite(
    problem_id: str,
    service: ProblemService = Depends(get_problem_service),
):
    """
    즐겨찾기 토글

    문제의 즐겨찾기 상태를 토글합니다.
    """
    problem = service.toggle_favorite(problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="문제를 찾을 수 없습니다")
    return problem
