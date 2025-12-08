"""
문서 페어 모델

Phase 22-L: 영구 페어링 시스템

문제 문서와 해설 문서의 영구적인 연결 관계를 정의합니다.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class DocumentPair(BaseModel):
    """문서 페어 모델"""
    id: str = Field(..., description="페어 고유 ID")
    problem_document_id: str = Field(..., description="문제 문서 ID")
    solution_document_id: str = Field(..., description="해설 문서 ID")
    created_at: datetime = Field(default_factory=datetime.now, description="생성 시간")
    status: str = Field(default="active", description="상태 (active, archived)")
    last_session_id: Optional[str] = Field(None, description="마지막 매칭 세션 ID")
    matched_count: int = Field(default=0, description="매칭된 문제 수")

    # 추가 메타데이터
    problem_document_name: Optional[str] = Field(None, description="문제 문서 이름")
    solution_document_name: Optional[str] = Field(None, description="해설 문서 이름")


class CreatePairRequest(BaseModel):
    """페어 생성 요청"""
    problem_document_id: str = Field(..., description="문제 문서 ID")
    solution_document_id: str = Field(..., description="해설 문서 ID")
    problem_document_name: Optional[str] = Field(None, description="문제 문서 이름 (선택)")
    solution_document_name: Optional[str] = Field(None, description="해설 문서 이름 (선택)")


class UpdatePairRequest(BaseModel):
    """페어 업데이트 요청"""
    status: Optional[str] = Field(None, description="상태 변경")
    last_session_id: Optional[str] = Field(None, description="마지막 세션 ID 업데이트")
    matched_count: Optional[int] = Field(None, description="매칭 수 업데이트")


class PairStats(BaseModel):
    """페어 통계"""
    total_pairs: int = Field(..., description="전체 페어 수")
    active_pairs: int = Field(..., description="활성 페어 수")
    total_matched: int = Field(..., description="총 매칭된 문제 수")


class DocumentPairList(BaseModel):
    """페어 목록 응답"""
    items: List[DocumentPair] = Field(default_factory=list, description="페어 목록")
    total: int = Field(default=0, description="전체 개수")
