"""
문제-해설 매칭 모델

Phase 22-E: 문제-해설 매칭 시스템 백엔드

듀얼 윈도우 매칭 세션 및 매칭 결과 데이터 모델
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime
from uuid import uuid4


class PendingProblem(BaseModel):
    """
    대기 중인 문제

    문제 창에서 라벨링되었지만 아직 해설과 매칭되지 않은 문제
    """
    problemNumber: str = Field(..., description="문제 번호")
    groupId: str = Field(..., description="문제 그룹 ID")
    documentId: str = Field(..., description="문서 ID")
    pageIndex: int = Field(..., description="페이지 인덱스")
    createdAt: int = Field(
        default_factory=lambda: int(datetime.now().timestamp() * 1000),
        description="생성 시각 (밀리초)"
    )
    windowId: str = Field(..., description="문제 창 ID")

    class Config:
        json_schema_extra = {
            "example": {
                "problemNumber": "1",
                "groupId": "G1",
                "documentId": "math_bible_2024",
                "pageIndex": 0,
                "createdAt": 1701388800000,
                "windowId": "window-abc123"
            }
        }


class SolutionInfo(BaseModel):
    """
    해설 정보
    """
    groupId: str = Field(..., description="해설 그룹 ID")
    documentId: str = Field(..., description="해설 문서 ID")
    pageIndex: int = Field(..., description="해설 페이지 인덱스")


class ProblemSolutionMatch(BaseModel):
    """
    문제-해설 매칭

    문제와 해설이 매칭된 결과
    """
    matchId: str = Field(
        default_factory=lambda: f"match-{int(datetime.now().timestamp() * 1000)}-{str(uuid4())[:8]}",
        description="매칭 고유 ID"
    )
    sessionId: str = Field(..., description="매칭 세션 ID")
    problem: PendingProblem = Field(..., description="문제 정보")
    solution: SolutionInfo = Field(..., description="해설 정보")
    matchedAt: int = Field(
        default_factory=lambda: int(datetime.now().timestamp() * 1000),
        description="매칭 시각 (밀리초)"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "matchId": "match-1701388800000-abc12345",
                "sessionId": "session-xyz789",
                "problem": {
                    "problemNumber": "1",
                    "groupId": "G1",
                    "documentId": "problem_doc",
                    "pageIndex": 0,
                    "createdAt": 1701388800000,
                    "windowId": "window-abc123"
                },
                "solution": {
                    "groupId": "G1",
                    "documentId": "solution_doc",
                    "pageIndex": 0
                },
                "matchedAt": 1701388800000
            }
        }


class MatchingSession(BaseModel):
    """
    매칭 세션

    듀얼 윈도우 매칭 작업 단위
    """
    sessionId: str = Field(
        default_factory=lambda: f"session-{int(datetime.now().timestamp() * 1000)}-{str(uuid4())[:8]}",
        description="세션 고유 ID"
    )
    name: Optional[str] = Field(None, description="세션 이름 (선택)")
    problemDocumentId: Optional[str] = Field(None, description="문제 문서 ID")
    solutionDocumentId: Optional[str] = Field(None, description="해설 문서 ID")
    pendingProblems: List[PendingProblem] = Field(
        default_factory=list,
        description="대기 중인 문제 목록"
    )
    matchedPairs: List[ProblemSolutionMatch] = Field(
        default_factory=list,
        description="매칭된 쌍 목록"
    )
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
                "sessionId": "session-1701388800000-xyz78901",
                "name": "수학의 바이블 매칭",
                "problemDocumentId": "problem_doc",
                "solutionDocumentId": "solution_doc",
                "pendingProblems": [],
                "matchedPairs": [],
                "createdAt": 1701388800000,
                "updatedAt": 1701388800000,
                "status": "active"
            }
        }


class MatchingSessionCreate(BaseModel):
    """세션 생성 요청"""
    name: Optional[str] = None
    problemDocumentId: Optional[str] = None
    solutionDocumentId: Optional[str] = None


class MatchingSessionUpdate(BaseModel):
    """세션 업데이트 요청"""
    name: Optional[str] = None
    status: Optional[Literal["active", "completed", "cancelled"]] = None


class SaveMatchRequest(BaseModel):
    """매칭 저장 요청"""
    sessionId: str = Field(..., description="세션 ID")
    problem: PendingProblem = Field(..., description="문제 정보")
    solution: SolutionInfo = Field(..., description="해설 정보")


class MatchingSessionStats(BaseModel):
    """세션 통계"""
    totalSessions: int = Field(..., description="전체 세션 수")
    activeSessions: int = Field(..., description="활성 세션 수")
    completedSessions: int = Field(..., description="완료된 세션 수")
    totalMatches: int = Field(..., description="전체 매칭 수")


class MatchingSessionListResponse(BaseModel):
    """세션 목록 응답"""
    items: List[MatchingSession] = Field(..., description="세션 목록")
    total: int = Field(..., description="전체 개수")
