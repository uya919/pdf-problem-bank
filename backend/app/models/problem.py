"""
문제(Problem) 데이터 모델

Phase 21+ A-2: Problem 데이터 모델

문제은행의 핵심 엔티티인 Problem 모델 정의
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime
from uuid import uuid4

from .classification import ClassificationPath


class ProblemSource(BaseModel):
    """
    문제 출처 정보

    문제가 어디서 왔는지 추적하는 정보
    """
    type: Literal["book", "exam", "custom"] = Field(
        "book",
        description="출처 유형 (book: 교재, exam: 기출, custom: 직접 입력)"
    )
    name: str = Field(..., description="출처 이름 (수학의 바이블, 2020 교육청 6월 등)")
    page: Optional[int] = Field(None, description="페이지 번호")
    problemNumber: Optional[str] = Field(None, description="문제 번호 (3, 예제2 등)")
    year: Optional[int] = Field(None, description="출제 연도 (기출용)")
    month: Optional[int] = Field(None, description="출제 월 (기출용)")
    organization: Optional[str] = Field(
        None,
        description="출제 기관 (교육청, 평가원, 수능)"
    )

    # 원본 문서 참조 (라벨링 시스템 연동)
    documentId: Optional[str] = Field(None, description="원본 문서 ID")
    groupId: Optional[str] = Field(None, description="원본 그룹 ID")

    class Config:
        json_schema_extra = {
            "example": {
                "type": "book",
                "name": "수학의 바이블 개념on",
                "page": 464,
                "problemNumber": "3",
                "documentId": "math_bible_2024",
                "groupId": "page_10_group_3"
            }
        }


class ProblemContent(BaseModel):
    """
    문제 콘텐츠

    문제 이미지, 정답, 해설 등 실제 내용
    """
    imageUrl: str = Field(..., description="문제 이미지 경로")
    thumbnailUrl: Optional[str] = Field(None, description="썸네일 경로")

    # 텍스트 콘텐츠 (HML에서 추출 시)
    latex: Optional[str] = Field(None, description="LaTeX 수식")
    ocrText: Optional[str] = Field(None, description="OCR 추출 텍스트")

    # 객관식 선지
    choices: Optional[List[str]] = Field(
        None,
        description="객관식 선지 (①, ②, ③, ④, ⑤)"
    )

    # 정답/해설
    answer: Optional[str] = Field(None, description="정답")
    answerType: Optional[Literal["number", "text", "choice"]] = Field(
        None,
        description="정답 유형"
    )
    solution: Optional[str] = Field(None, description="해설 텍스트")
    solutionImageUrl: Optional[str] = Field(None, description="해설 이미지 경로")

    class Config:
        json_schema_extra = {
            "example": {
                "imageUrl": "/problems/abc123/image.png",
                "thumbnailUrl": "/problems/abc123/thumbnail.png",
                "answer": "3",
                "answerType": "number"
            }
        }


class Problem(BaseModel):
    """
    문제 엔티티

    문제은행의 핵심 단위. 분류, 속성, 콘텐츠, 출처 정보를 포함
    """
    # 식별자
    id: str = Field(
        default_factory=lambda: str(uuid4()),
        description="문제 고유 ID (UUID)"
    )

    # 분류 정보
    classification: Optional[ClassificationPath] = Field(
        None,
        description="5단계 분류 경로"
    )

    # 문제 속성
    questionType: Literal["multiple_choice", "short_answer", "essay"] = Field(
        "short_answer",
        description="문제 유형 (객관식, 단답형, 서술형)"
    )
    difficulty: int = Field(
        5,
        ge=1,
        le=10,
        description="난이도 (1-10)"
    )
    points: Optional[float] = Field(None, description="배점")

    # 콘텐츠
    content: ProblemContent = Field(..., description="문제 콘텐츠")

    # 출처
    source: ProblemSource = Field(..., description="출처 정보")

    # 태그
    tags: List[str] = Field(default_factory=list, description="태그 목록")

    # 메타데이터
    createdAt: datetime = Field(
        default_factory=datetime.now,
        description="생성 시각"
    )
    updatedAt: datetime = Field(
        default_factory=datetime.now,
        description="수정 시각"
    )
    createdBy: str = Field("system", description="생성자")

    # 사용 통계
    usageCount: int = Field(0, description="시험지에 사용된 횟수")
    lastUsedAt: Optional[datetime] = Field(None, description="마지막 사용 시각")
    isFavorite: bool = Field(False, description="즐겨찾기 여부")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "classification": {
                    "gradeId": 7,
                    "majorUnitId": 702,
                    "middleUnitId": 70202,
                    "gradeName": "공통수학1",
                    "fullPath": "공통수학1 > 방정식과 부등식 > 이차방정식"
                },
                "questionType": "short_answer",
                "difficulty": 5,
                "content": {
                    "imageUrl": "/problems/abc123/image.png",
                    "answer": "3"
                },
                "source": {
                    "type": "book",
                    "name": "수학의 바이블",
                    "page": 100
                },
                "tags": ["이차방정식", "근의 공식"],
                "isFavorite": False
            }
        }


class ProblemCreate(BaseModel):
    """문제 생성 요청"""
    classification: Optional[ClassificationPath] = None
    questionType: Literal["multiple_choice", "short_answer", "essay"] = "short_answer"
    difficulty: int = Field(5, ge=1, le=10)
    points: Optional[float] = None
    content: ProblemContent
    source: ProblemSource
    tags: List[str] = []


class ProblemUpdate(BaseModel):
    """문제 수정 요청"""
    classification: Optional[ClassificationPath] = None
    questionType: Optional[Literal["multiple_choice", "short_answer", "essay"]] = None
    difficulty: Optional[int] = Field(None, ge=1, le=10)
    points: Optional[float] = None
    content: Optional[ProblemContent] = None
    source: Optional[ProblemSource] = None
    tags: Optional[List[str]] = None
    isFavorite: Optional[bool] = None


class ProblemFilter(BaseModel):
    """
    문제 필터링 조건

    문제 목록 조회 시 사용하는 필터
    """
    # 분류 필터
    gradeIds: Optional[List[int]] = Field(None, description="학년 ID 목록")
    majorUnitIds: Optional[List[int]] = Field(None, description="대단원 ID 목록")
    middleUnitIds: Optional[List[int]] = Field(None, description="중단원 ID 목록")
    minorUnitIds: Optional[List[int]] = Field(None, description="소단원 ID 목록")
    typeIds: Optional[List[int]] = Field(None, description="유형 ID 목록")

    # 속성 필터
    questionTypes: Optional[List[str]] = Field(None, description="문제 유형 목록")
    difficultyMin: Optional[int] = Field(None, ge=1, le=10, description="최소 난이도")
    difficultyMax: Optional[int] = Field(None, ge=1, le=10, description="최대 난이도")

    # 출처 필터
    sourceTypes: Optional[List[str]] = Field(None, description="출처 유형 목록")
    years: Optional[List[int]] = Field(None, description="출제 연도 목록")
    organizations: Optional[List[str]] = Field(None, description="출제 기관 목록")

    # 기타
    tags: Optional[List[str]] = Field(None, description="태그 목록")
    hasAnswer: Optional[bool] = Field(None, description="정답 있는 문제만")
    hasSolution: Optional[bool] = Field(None, description="해설 있는 문제만")
    isFavorite: Optional[bool] = Field(None, description="즐겨찾기만")

    # 검색
    searchQuery: Optional[str] = Field(None, description="검색어")


class ProblemListResponse(BaseModel):
    """문제 목록 응답"""
    items: List[Problem] = Field(..., description="문제 목록")
    total: int = Field(..., description="전체 개수")
    page: int = Field(..., description="현재 페이지")
    pageSize: int = Field(..., description="페이지 크기")
    totalPages: int = Field(..., description="전체 페이지 수")


class ProblemStats(BaseModel):
    """문제 통계"""
    total: int = Field(..., description="전체 문제 수")
    byQuestionType: dict = Field(..., description="문제 유형별 개수")
    byDifficulty: dict = Field(..., description="난이도별 개수")
    byGrade: dict = Field(..., description="학년별 개수")
    recentlyAdded: int = Field(..., description="최근 추가된 문제 수")
    favorites: int = Field(..., description="즐겨찾기 수")
