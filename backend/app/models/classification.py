"""
분류 체계 데이터 모델

Phase 21+ A-1: 분류 체계 DB 구축
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum


class ClassificationLevel(str, Enum):
    """분류 레벨"""
    GRADE = "grade"           # 학년 (Level 1)
    MAJOR_UNIT = "majorUnit"  # 대단원 (Level 2)
    MIDDLE_UNIT = "middleUnit"  # 중단원 (Level 3)
    MINOR_UNIT = "minorUnit"  # 소단원 (Level 4)
    TYPE = "type"             # 유형 (Level 5)


class ClassificationNode(BaseModel):
    """
    분류 트리 노드

    수학비서 5단계 분류 체계:
    - Level 1: 학년 (중1-1, 중1-2, ..., 기하)
    - Level 2: 대단원 (다항식, 방정식과 부등식 등)
    - Level 3: 중단원 (복소수, 이차방정식 등)
    - Level 4: 소단원 (이차방정식의 풀이, 판별식 등)
    - Level 5: 유형 (근의 공식, 판별식의 뜻 등)
    """
    id: int = Field(..., description="노드 고유 ID")
    code: str = Field(..., description="노드 코드 (01, 02 등)")
    name: str = Field(..., description="노드 이름 (이차방정식)")
    fullName: str = Field(..., description="전체 이름 (03 이차방정식)")
    level: int = Field(..., ge=1, le=5, description="레벨 (1-5)")
    parentId: Optional[int] = Field(None, description="부모 노드 ID")
    order: int = Field(..., description="정렬 순서")
    problemCount: int = Field(0, description="하위 문제 수 (캐시)")
    children: List["ClassificationNode"] = Field(
        default_factory=list,
        description="자식 노드 목록"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "id": 7020203,
                "code": "03",
                "name": "근과 계수의 관계",
                "fullName": "03 근과 계수의 관계",
                "level": 4,
                "parentId": 70202,
                "order": 3,
                "problemCount": 45,
                "children": []
            }
        }


class ClassificationPath(BaseModel):
    """
    분류 경로 (선택된 분류)

    문제에 할당되는 분류 정보를 담는 모델
    """
    gradeId: Optional[int] = Field(None, description="학년 ID")
    majorUnitId: Optional[int] = Field(None, description="대단원 ID")
    middleUnitId: Optional[int] = Field(None, description="중단원 ID")
    minorUnitId: Optional[int] = Field(None, description="소단원 ID")
    typeId: Optional[int] = Field(None, description="유형 ID")

    # 캐시된 텍스트 (표시용)
    gradeName: Optional[str] = Field(None, description="학년 이름")
    fullPath: Optional[str] = Field(None, description="전체 경로 텍스트")

    class Config:
        json_schema_extra = {
            "example": {
                "gradeId": 7,
                "majorUnitId": 702,
                "middleUnitId": 70202,
                "minorUnitId": 7020203,
                "typeId": 702020303,
                "gradeName": "공통수학1",
                "fullPath": "공통수학1 > 방정식과 부등식 > 이차방정식 > 근과 계수의 관계 > 근대입"
            }
        }

    def get_deepest_id(self) -> Optional[int]:
        """가장 깊은 레벨의 ID 반환"""
        if self.typeId:
            return self.typeId
        if self.minorUnitId:
            return self.minorUnitId
        if self.middleUnitId:
            return self.middleUnitId
        if self.majorUnitId:
            return self.majorUnitId
        return self.gradeId

    def get_level(self) -> int:
        """선택된 레벨 반환 (1-5)"""
        if self.typeId:
            return 5
        if self.minorUnitId:
            return 4
        if self.middleUnitId:
            return 3
        if self.majorUnitId:
            return 2
        if self.gradeId:
            return 1
        return 0


class ClassificationSearchResult(BaseModel):
    """분류 검색 결과"""
    node: ClassificationNode = Field(..., description="검색된 노드")
    path: str = Field(..., description="전체 경로 텍스트")
    pathIds: List[int] = Field(
        default_factory=list,
        description="경로상의 노드 ID 목록"
    )
    matchType: str = Field(
        "contains",
        description="매칭 타입 (exact, prefix, contains)"
    )
    score: float = Field(1.0, description="관련도 점수 (0-1)")

    class Config:
        json_schema_extra = {
            "example": {
                "node": {
                    "id": 70202,
                    "code": "02",
                    "name": "이차방정식",
                    "fullName": "02 이차방정식",
                    "level": 3,
                    "parentId": 702,
                    "order": 2,
                    "problemCount": 120,
                    "children": []
                },
                "path": "공통수학1 > 방정식과 부등식 > 이차방정식",
                "pathIds": [7, 702, 70202],
                "matchType": "exact",
                "score": 1.0
            }
        }


class ClassificationTreeResponse(BaseModel):
    """분류 트리 응답"""
    version: str = Field("1.0", description="데이터 버전")
    totalNodes: int = Field(..., description="전체 노드 수")
    tree: List[ClassificationNode] = Field(..., description="트리 데이터")

    class Config:
        json_schema_extra = {
            "example": {
                "version": "1.0",
                "totalNodes": 847,
                "tree": []
            }
        }


class ClassificationStatsResponse(BaseModel):
    """분류별 통계 응답"""
    nodeId: int = Field(..., description="노드 ID")
    name: str = Field(..., description="노드 이름")
    level: int = Field(..., description="레벨")
    problemCount: int = Field(..., description="문제 수")
    childrenCount: int = Field(0, description="자식 노드 수")


# Pydantic v2에서 필요한 forward reference 업데이트
ClassificationNode.model_rebuild()
