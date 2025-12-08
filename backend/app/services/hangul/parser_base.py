"""
Phase 16-1: 한글 파서 기본 클래스 및 데이터 구조
"""
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from abc import ABC, abstractmethod
from pathlib import Path
import uuid


@dataclass
class ParsedProblem:
    """파싱된 개별 문제"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    number: str = ""                           # 원본 문제 번호 (1, 2, 01-1 등)
    content_text: str = ""                     # 문제 텍스트 (일반 텍스트)
    content_images: List[str] = field(default_factory=list)   # 이미지 경로들
    content_equations: List[str] = field(default_factory=list) # 원본 HWP 수식들

    # Phase 19-C: LaTeX 변환 필드
    content_latex: str = ""                    # LaTeX 포함 텍스트 ($수식$ 형태)
    content_equations_latex: List[str] = field(default_factory=list)  # LaTeX로 변환된 수식들

    # 정답 정보
    answer: Optional[str] = None               # 정답 값 (원본)
    answer_latex: Optional[str] = None         # Phase 19-C: 정답 LaTeX 형식
    answer_type: str = "unknown"               # 'choice' | 'value' | 'expression' | 'unknown'

    # 해설 정보
    explanation: Optional[str] = None          # 해설 텍스트

    # 추가 정보
    points: Optional[float] = None             # 배점

    def to_dict(self) -> Dict[str, Any]:
        """딕셔너리로 변환"""
        return {
            "id": self.id,
            "number": self.number,
            "content_text": self.content_text,
            "content_latex": self.content_latex,
            "content_images": self.content_images,
            "content_equations": self.content_equations,
            "content_equations_latex": self.content_equations_latex,
            "answer": self.answer,
            "answer_latex": self.answer_latex,
            "answer_type": self.answer_type,
            "explanation": self.explanation,
            "points": self.points,
        }


@dataclass
class ParseResult:
    """파싱 전체 결과"""
    file_name: str
    file_type: str                             # 'hml' | 'hwpx'
    problems: List[ParsedProblem] = field(default_factory=list)

    # 자동 감지된 메타데이터
    detected_metadata: Dict[str, Any] = field(default_factory=dict)

    # 파싱 상태
    success: bool = True
    warnings: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)

    # 통계
    total_problems: int = 0
    problems_with_answer: int = 0
    problems_with_explanation: int = 0

    def calculate_stats(self):
        """통계 계산"""
        self.total_problems = len(self.problems)
        self.problems_with_answer = sum(1 for p in self.problems if p.answer)
        self.problems_with_explanation = sum(1 for p in self.problems if p.explanation)

    def to_dict(self) -> Dict[str, Any]:
        """딕셔너리로 변환"""
        self.calculate_stats()
        return {
            "file_name": self.file_name,
            "file_type": self.file_type,
            "problems": [p.to_dict() for p in self.problems],
            "detected_metadata": self.detected_metadata,
            "success": self.success,
            "warnings": self.warnings,
            "errors": self.errors,
            "stats": {
                "total_problems": self.total_problems,
                "problems_with_answer": self.problems_with_answer,
                "problems_with_explanation": self.problems_with_explanation,
            }
        }


class HangulParserBase(ABC):
    """한글 파서 기본 클래스"""

    def __init__(self, file_path: str):
        self.file_path = Path(file_path)
        self.file_name = self.file_path.name

    @abstractmethod
    def parse(self) -> ParseResult:
        """
        파일을 파싱하여 결과 반환

        Returns:
            ParseResult: 파싱된 문제들과 메타데이터
        """
        pass

    @abstractmethod
    def extract_text(self) -> List[str]:
        """
        파일에서 텍스트 추출

        Returns:
            List[str]: 문단 단위 텍스트 리스트
        """
        pass

    @abstractmethod
    def extract_images(self) -> Dict[str, bytes]:
        """
        파일에서 이미지 추출

        Returns:
            Dict[str, bytes]: 이미지 ID -> 이미지 데이터
        """
        pass

    def get_file_type(self) -> str:
        """파일 타입 반환"""
        suffix = self.file_path.suffix.lower()
        if suffix == '.hml':
            return 'hml'
        elif suffix == '.hwpx':
            return 'hwpx'
        else:
            return 'unknown'
