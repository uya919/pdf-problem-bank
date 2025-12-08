"""
시험지(ExamPaper) API 라우터

Phase 21+ D-1: 시험지 REST API
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from fastapi.responses import Response
from typing import Optional, List

from ..models.exam_paper import (
    ExamPaper,
    ExamPaperCreate,
    ExamPaperUpdate,
    ExamPaperStatus,
    ExamPaperListResponse,
    AddProblemToExam,
    ReorderProblems,
)
from ..services.exam_paper import ExamPaperService, get_exam_paper_service
from ..services.problems import ProblemService, get_problem_service
from ..services.exam import ExamPdfExporter
from ..config import config


router = APIRouter(prefix="/api/exams", tags=["exam-papers"])


# ========== CRUD 엔드포인트 ==========

@router.get("", response_model=ExamPaperListResponse)
async def list_exam_papers(
    page: int = Query(1, ge=1, description="페이지 번호"),
    pageSize: int = Query(20, ge=1, le=100, description="페이지 크기"),
    status: Optional[ExamPaperStatus] = Query(None, description="상태 필터"),
    service: ExamPaperService = Depends(get_exam_paper_service),
):
    """
    시험지 목록 조회
    """
    return service.list(page=page, page_size=pageSize, status=status)


@router.post("", response_model=ExamPaper)
async def create_exam_paper(
    data: ExamPaperCreate,
    service: ExamPaperService = Depends(get_exam_paper_service),
):
    """
    시험지 생성
    """
    return service.create(data)


@router.get("/{exam_id}", response_model=ExamPaper)
async def get_exam_paper(
    exam_id: str,
    service: ExamPaperService = Depends(get_exam_paper_service),
):
    """
    시험지 조회
    """
    exam = service.get(exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="시험지를 찾을 수 없습니다")
    return exam


@router.patch("/{exam_id}", response_model=ExamPaper)
async def update_exam_paper(
    exam_id: str,
    data: ExamPaperUpdate,
    service: ExamPaperService = Depends(get_exam_paper_service),
):
    """
    시험지 수정
    """
    exam = service.update(exam_id, data)
    if not exam:
        raise HTTPException(status_code=404, detail="시험지를 찾을 수 없습니다")
    return exam


@router.delete("/{exam_id}")
async def delete_exam_paper(
    exam_id: str,
    service: ExamPaperService = Depends(get_exam_paper_service),
):
    """
    시험지 삭제
    """
    success = service.delete(exam_id)
    if not success:
        raise HTTPException(status_code=404, detail="시험지를 찾을 수 없습니다")
    return {"success": True, "message": "시험지가 삭제되었습니다"}


# ========== 문제 관리 엔드포인트 ==========

@router.post("/{exam_id}/problems", response_model=ExamPaper)
async def add_problem_to_exam(
    exam_id: str,
    data: AddProblemToExam,
    service: ExamPaperService = Depends(get_exam_paper_service),
):
    """
    시험지에 문제 추가
    """
    exam = service.add_problem(
        exam_id=exam_id,
        problem_id=data.problemId,
        section_id=data.sectionId,
        points=data.points or 5,
    )
    if not exam:
        raise HTTPException(status_code=404, detail="시험지 또는 섹션을 찾을 수 없습니다")
    return exam


@router.post("/{exam_id}/problems/bulk", response_model=ExamPaper)
async def add_problems_bulk(
    exam_id: str,
    data: dict = Body(...),
    service: ExamPaperService = Depends(get_exam_paper_service),
):
    """
    시험지에 여러 문제 일괄 추가
    """
    problem_ids = data.get("problemIds", [])
    section_id = data.get("sectionId")
    points = data.get("points", 5)

    exam = service.get(exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="시험지를 찾을 수 없습니다")

    for problem_id in problem_ids:
        exam = service.add_problem(
            exam_id=exam_id,
            problem_id=problem_id,
            section_id=section_id,
            points=points,
        )

    return exam


@router.delete("/{exam_id}/problems/{problem_item_id}", response_model=ExamPaper)
async def remove_problem_from_exam(
    exam_id: str,
    problem_item_id: str,
    service: ExamPaperService = Depends(get_exam_paper_service),
):
    """
    시험지에서 문제 제거
    """
    exam = service.remove_problem(exam_id, problem_item_id)
    if not exam:
        raise HTTPException(status_code=404, detail="시험지를 찾을 수 없습니다")
    return exam


@router.patch("/{exam_id}/problems/{problem_item_id}/points", response_model=ExamPaper)
async def update_problem_points(
    exam_id: str,
    problem_item_id: str,
    points: int = Body(..., embed=True, ge=0),
    service: ExamPaperService = Depends(get_exam_paper_service),
):
    """
    문제 배점 수정
    """
    exam = service.update_problem_points(exam_id, problem_item_id, points)
    if not exam:
        raise HTTPException(status_code=404, detail="시험지를 찾을 수 없습니다")
    return exam


@router.post("/{exam_id}/problems/reorder", response_model=ExamPaper)
async def reorder_problems(
    exam_id: str,
    data: ReorderProblems,
    service: ExamPaperService = Depends(get_exam_paper_service),
):
    """
    문제 순서 변경
    """
    exam = service.reorder_problems(exam_id, data.sectionId, data.problemItemIds)
    if not exam:
        raise HTTPException(status_code=404, detail="시험지 또는 섹션을 찾을 수 없습니다")
    return exam


# ========== 섹션 관리 엔드포인트 ==========

@router.post("/{exam_id}/sections", response_model=ExamPaper)
async def add_section(
    exam_id: str,
    data: dict = Body(...),
    service: ExamPaperService = Depends(get_exam_paper_service),
):
    """
    섹션 추가
    """
    title = data.get("title", "새 섹션")
    description = data.get("description")

    exam = service.add_section(exam_id, title, description)
    if not exam:
        raise HTTPException(status_code=404, detail="시험지를 찾을 수 없습니다")
    return exam


@router.delete("/{exam_id}/sections/{section_id}", response_model=ExamPaper)
async def remove_section(
    exam_id: str,
    section_id: str,
    service: ExamPaperService = Depends(get_exam_paper_service),
):
    """
    섹션 삭제
    """
    exam = service.remove_section(exam_id, section_id)
    if not exam:
        raise HTTPException(
            status_code=400,
            detail="섹션을 삭제할 수 없습니다. 최소 1개의 섹션이 필요합니다."
        )
    return exam


@router.patch("/{exam_id}/sections/{section_id}", response_model=ExamPaper)
async def update_section(
    exam_id: str,
    section_id: str,
    data: dict = Body(...),
    service: ExamPaperService = Depends(get_exam_paper_service),
):
    """
    섹션 수정
    """
    title = data.get("title")
    description = data.get("description")

    exam = service.update_section(exam_id, section_id, title, description)
    if not exam:
        raise HTTPException(status_code=404, detail="시험지 또는 섹션을 찾을 수 없습니다")
    return exam


# ========== 기타 엔드포인트 ==========

@router.post("/{exam_id}/duplicate", response_model=ExamPaper)
async def duplicate_exam_paper(
    exam_id: str,
    name: Optional[str] = Body(None, embed=True),
    service: ExamPaperService = Depends(get_exam_paper_service),
):
    """
    시험지 복제
    """
    exam = service.duplicate(exam_id, name)
    if not exam:
        raise HTTPException(status_code=404, detail="시험지를 찾을 수 없습니다")
    return exam


@router.post("/{exam_id}/status", response_model=ExamPaper)
async def update_status(
    exam_id: str,
    status: ExamPaperStatus = Body(..., embed=True),
    service: ExamPaperService = Depends(get_exam_paper_service),
):
    """
    시험지 상태 변경
    """
    exam = service.update(exam_id, ExamPaperUpdate(status=status))
    if not exam:
        raise HTTPException(status_code=404, detail="시험지를 찾을 수 없습니다")
    return exam


# ========== 내보내기 엔드포인트 ==========

@router.get("/{exam_id}/export/pdf")
async def export_to_pdf(
    exam_id: str,
    include_answer_key: bool = Query(False, description="정답지 포함 여부"),
    exam_service: ExamPaperService = Depends(get_exam_paper_service),
    problem_service: ProblemService = Depends(get_problem_service),
):
    """
    시험지 PDF 내보내기

    Phase E-1: 시험지를 PDF 파일로 내보냅니다.

    Args:
        exam_id: 시험지 ID
        include_answer_key: 정답지 포함 여부

    Returns:
        PDF 파일
    """
    # 시험지 조회
    exam = exam_service.get(exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="시험지를 찾을 수 없습니다")

    # 문제 ID 수집
    problem_ids = []
    for section in exam.sections:
        for item in section.problems:
            problem_ids.append(item.problemId)

    # 문제 조회
    problems = problem_service.bulk_get(problem_ids)
    problems_map = {p.id: p for p in problems}

    # PDF 생성
    exporter = ExamPdfExporter(config.DATASET_ROOT)
    pdf_bytes = exporter.export_to_pdf(
        exam=exam,
        problems_map=problems_map,
        include_answer_key=include_answer_key,
    )

    # 파일명 생성
    filename = f"{exam.name.replace(' ', '_')}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )
