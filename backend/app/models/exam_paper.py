"""
시험지(ExamPaper) Pydantic 모델

Phase 21+ D-1: 시험지 모델
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
from enum import Enum


class ExamPaperStatus(str, Enum):
    """시험지 상태"""
    DRAFT = "draft"
    READY = "ready"
    ARCHIVED = "archived"


class PaperSize(str, Enum):
    """용지 크기"""
    A4 = "A4"
    B4 = "B4"
    LETTER = "Letter"


class Orientation(str, Enum):
    """용지 방향"""
    PORTRAIT = "portrait"
    LANDSCAPE = "landscape"


class FontSize(str, Enum):
    """글자 크기"""
    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"


class ExamProblemItem(BaseModel):
    """시험지 문제 항목"""
    id: str = Field(..., description="항목 ID")
    problemId: str = Field(..., description="원본 문제 ID")
    order: int = Field(..., ge=1, description="문제 순서")
    points: int = Field(default=5, ge=0, description="배점")
    customNumber: Optional[str] = Field(None, description="커스텀 문제 번호")
    note: Optional[str] = Field(None, description="출제자 메모")


class ExamSection(BaseModel):
    """시험지 섹션"""
    id: str = Field(..., description="섹션 ID")
    title: str = Field(..., description="섹션 제목")
    description: Optional[str] = Field(None, description="섹션 설명")
    problems: List[ExamProblemItem] = Field(default_factory=list, description="문제 목록")
    order: int = Field(..., ge=1, description="섹션 순서")


class ExamPaperSettings(BaseModel):
    """시험지 설정"""
    # 기본 정보
    title: str = Field(default="시험", description="시험 제목")
    subtitle: Optional[str] = Field(None, description="부제목")
    institution: Optional[str] = Field(None, description="기관명")
    subject: Optional[str] = Field(None, description="과목")
    grade: Optional[str] = Field(None, description="학년")
    date: Optional[str] = Field(None, description="시험 날짜")
    duration: Optional[int] = Field(None, ge=1, description="시험 시간 (분)")

    # 레이아웃
    paperSize: PaperSize = Field(default=PaperSize.A4, description="용지 크기")
    orientation: Orientation = Field(default=Orientation.PORTRAIT, description="용지 방향")
    columns: Literal[1, 2] = Field(default=1, description="단/양단")
    fontSize: FontSize = Field(default=FontSize.MEDIUM, description="글자 크기")

    # 헤더/푸터
    showHeader: bool = Field(default=True, description="헤더 표시")
    showFooter: bool = Field(default=True, description="푸터 표시")
    showPageNumbers: bool = Field(default=True, description="페이지 번호 표시")
    showTotalPoints: bool = Field(default=True, description="총점 표시")

    # 문제 표시
    showPoints: bool = Field(default=True, description="배점 표시")
    showAnswerSpace: bool = Field(default=False, description="답안 작성란 표시")
    answerSpaceLines: int = Field(default=3, ge=1, le=20, description="답안 작성란 줄 수")

    # 정답지
    generateAnswerKey: bool = Field(default=True, description="정답지 생성")


class ExamPaper(BaseModel):
    """시험지 모델"""
    id: str = Field(..., description="시험지 ID")

    # 메타데이터
    name: str = Field(..., description="시험지 이름")
    description: Optional[str] = Field(None, description="설명")
    status: ExamPaperStatus = Field(default=ExamPaperStatus.DRAFT, description="상태")

    # 구조
    sections: List[ExamSection] = Field(default_factory=list, description="섹션 목록")
    settings: ExamPaperSettings = Field(default_factory=ExamPaperSettings, description="설정")

    # 통계
    totalProblems: int = Field(default=0, ge=0, description="총 문제 수")
    totalPoints: int = Field(default=0, ge=0, description="총 배점")

    # 타임스탬프
    createdAt: datetime = Field(default_factory=datetime.now, description="생성 시간")
    updatedAt: datetime = Field(default_factory=datetime.now, description="수정 시간")


class ExamPaperCreate(BaseModel):
    """시험지 생성 요청"""
    name: str = Field(..., min_length=1, description="시험지 이름")
    description: Optional[str] = Field(None, description="설명")
    settings: Optional[ExamPaperSettings] = Field(None, description="설정")


class ExamPaperUpdate(BaseModel):
    """시험지 수정 요청"""
    name: Optional[str] = Field(None, min_length=1, description="시험지 이름")
    description: Optional[str] = Field(None, description="설명")
    status: Optional[ExamPaperStatus] = Field(None, description="상태")
    sections: Optional[List[ExamSection]] = Field(None, description="섹션 목록")
    settings: Optional[ExamPaperSettings] = Field(None, description="설정")


class AddProblemToExam(BaseModel):
    """시험지에 문제 추가 요청"""
    problemId: str = Field(..., description="문제 ID")
    sectionId: Optional[str] = Field(None, description="섹션 ID")
    points: Optional[int] = Field(None, ge=0, description="배점")


class RemoveProblemFromExam(BaseModel):
    """시험지에서 문제 제거 요청"""
    problemItemId: str = Field(..., description="문제 항목 ID")


class ReorderProblems(BaseModel):
    """문제 순서 변경 요청"""
    sectionId: str = Field(..., description="섹션 ID")
    problemItemIds: List[str] = Field(..., description="새로운 순서의 문제 항목 ID 목록")


class ExamPaperListResponse(BaseModel):
    """시험지 목록 응답"""
    items: List[ExamPaper] = Field(default_factory=list, description="시험지 목록")
    total: int = Field(default=0, description="전체 개수")
    page: int = Field(default=1, description="현재 페이지")
    pageSize: int = Field(default=20, description="페이지 크기")
    totalPages: int = Field(default=0, description="전체 페이지 수")


class ExportFormat(str, Enum):
    """내보내기 형식"""
    PDF = "pdf"
    DOCX = "docx"
    HWP = "hwp"


class ExportExamRequest(BaseModel):
    """시험지 내보내기 요청"""
    format: ExportFormat = Field(default=ExportFormat.PDF, description="내보내기 형식")
    includeAnswerKey: bool = Field(default=True, description="정답지 포함")


class ExamPreviewData(BaseModel):
    """시험지 미리보기 데이터"""
    html: str = Field(..., description="렌더링된 HTML")
    answerKeyHtml: Optional[str] = Field(None, description="정답지 HTML")
    pageCount: int = Field(default=1, ge=1, description="페이지 수")
