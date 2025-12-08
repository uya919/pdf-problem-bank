"""
작업 세션 모델 (Phase 32 → Phase 33)

Phase 33: 통합 워크플로우
- 시작 시 문제+해설 문서 동시 지정
- 탭 전환으로 라벨링+매칭 통합
- 그룹 생성 시 자동 문제은행 등록
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime
from uuid import uuid4


class ProblemReference(BaseModel):
    """
    문제 참조 정보

    groups.json에 저장된 그룹을 참조
    """
    groupId: str = Field(..., description="그룹 ID")
    documentId: str = Field(..., description="문서 ID")
    pageIndex: int = Field(..., description="페이지 인덱스")
    problemNumber: str = Field(..., description="문제 번호")
    displayName: str = Field(default="", description="표시 이름")
    # Phase 56-M: 모문제 여부 (해설 연결 불필요)
    isParent: bool = Field(default=False, description="모문제 여부")
    createdAt: int = Field(
        default_factory=lambda: int(datetime.now().timestamp() * 1000),
        description="생성 시각 (밀리초)"
    )


class ProblemSolutionLink(BaseModel):
    """
    문제-해설 연결 정보
    """
    problemGroupId: str = Field(..., description="문제 그룹 ID")
    solutionGroupId: str = Field(..., description="해설 그룹 ID")
    solutionDocumentId: str = Field(..., description="해설 문서 ID")
    solutionPageIndex: int = Field(..., description="해설 페이지 인덱스")
    linkedAt: int = Field(
        default_factory=lambda: int(datetime.now().timestamp() * 1000),
        description="연결 시각 (밀리초)"
    )


class WorkSession(BaseModel):
    """
    작업 세션

    문제 라벨링부터 매칭까지의 전체 워크플로우를 관리
    """
    sessionId: str = Field(
        default_factory=lambda: f"ws-{int(datetime.now().timestamp() * 1000)}-{str(uuid4())[:8]}",
        description="세션 고유 ID"
    )
    name: str = Field(default="", description="세션 이름")

    # 문서 정보
    problemDocumentId: str = Field(..., description="문제 문서 ID")
    problemDocumentName: str = Field(default="", description="문제 문서 이름")
    solutionDocumentId: Optional[str] = Field(None, description="해설 문서 ID (선택)")
    solutionDocumentName: str = Field(default="", description="해설 문서 이름")

    # 워크플로우 단계
    step: Literal["labeling", "setup", "matching", "completed"] = Field(
        "labeling",
        description="현재 단계: labeling(문제 라벨링) → setup(해설 설정) → matching(매칭) → completed(완료)"
    )

    # 문제 및 연결 정보
    problems: List[ProblemReference] = Field(
        default_factory=list,
        description="라벨링된 문제 목록"
    )
    links: List[ProblemSolutionLink] = Field(
        default_factory=list,
        description="문제-해설 연결 목록"
    )

    # Phase 48: 마지막 작업 페이지 저장
    lastProblemPage: int = Field(default=0, description="마지막 문제 페이지")
    lastSolutionPage: int = Field(default=0, description="마지막 해설 페이지")

    # 메타데이터
    createdAt: int = Field(
        default_factory=lambda: int(datetime.now().timestamp() * 1000),
        description="생성 시각 (밀리초)"
    )
    updatedAt: int = Field(
        default_factory=lambda: int(datetime.now().timestamp() * 1000),
        description="수정 시각 (밀리초)"
    )
    status: Literal["active", "completed", "cancelled"] = Field(
        "active",
        description="세션 상태"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "sessionId": "ws-1701388800000-abc12345",
                "name": "수학의 바이블 1단원",
                "problemDocumentId": "math_bible_2024",
                "problemDocumentName": "수학의바이블_기하_본문.pdf",
                "solutionDocumentId": "math_bible_2024_sol",
                "solutionDocumentName": "수학의바이블_기하_해설.pdf",
                "step": "matching",
                "problems": [
                    {
                        "groupId": "g_1234567890_abc12",
                        "documentId": "math_bible_2024",
                        "pageIndex": 0,
                        "problemNumber": "1",
                        "displayName": "수학의바이블_기하_p1. 1",
                        "createdAt": 1701388800000
                    }
                ],
                "links": [
                    {
                        "problemGroupId": "g_1234567890_abc12",
                        "solutionGroupId": "g_1234567891_def34",
                        "solutionDocumentId": "math_bible_2024_sol",
                        "solutionPageIndex": 0,
                        "linkedAt": 1701388900000
                    }
                ],
                "createdAt": 1701388800000,
                "updatedAt": 1701388900000,
                "status": "active"
            }
        }


# === API 요청/응답 모델 ===

class WorkSessionCreate(BaseModel):
    """작업 세션 생성 요청 (Phase 33: 양쪽 문서 필수)"""
    name: Optional[str] = None
    problemDocumentId: str = Field(..., description="문제 문서 ID")
    problemDocumentName: Optional[str] = None
    solutionDocumentId: str = Field(..., description="해설 문서 ID (필수)")
    solutionDocumentName: Optional[str] = None


class WorkSessionUpdate(BaseModel):
    """작업 세션 업데이트 요청"""
    name: Optional[str] = None
    solutionDocumentId: Optional[str] = None
    solutionDocumentName: Optional[str] = None
    step: Optional[Literal["labeling", "setup", "matching", "completed"]] = None
    status: Optional[Literal["active", "completed", "cancelled"]] = None
    # Phase 48: 마지막 작업 페이지
    lastProblemPage: Optional[int] = None
    lastSolutionPage: Optional[int] = None


class AddProblemRequest(BaseModel):
    """문제 추가 요청"""
    groupId: str = Field(..., description="그룹 ID")
    pageIndex: int = Field(..., description="페이지 인덱스")
    problemNumber: str = Field(..., description="문제 번호")
    displayName: Optional[str] = None


class CreateLinkRequest(BaseModel):
    """연결 생성 요청"""
    problemGroupId: str = Field(..., description="문제 그룹 ID")
    solutionGroupId: str = Field(..., description="해설 그룹 ID")
    solutionDocumentId: str = Field(..., description="해설 문서 ID")
    solutionPageIndex: int = Field(..., description="해설 페이지 인덱스")


class WorkSessionStats(BaseModel):
    """세션 통계"""
    totalProblems: int = Field(..., description="전체 문제 수")
    linkedProblems: int = Field(..., description="연결된 문제 수")
    progress: int = Field(..., description="진행률 (0-100)")


class WorkSessionListResponse(BaseModel):
    """세션 목록 응답"""
    items: List[WorkSession] = Field(..., description="세션 목록")
    total: int = Field(..., description="전체 개수")


class WorkSessionDetailResponse(BaseModel):
    """세션 상세 응답"""
    session: WorkSession
    stats: WorkSessionStats
