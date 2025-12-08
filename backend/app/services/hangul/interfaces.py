"""
Phase 20-C: 서비스 인터페이스 정의

HWP 수식 변환 서비스의 추상 인터페이스 정의
- 테스트 시 Mock 객체 주입 가능
- 의존성 역전 원칙(DIP) 적용
"""
from abc import ABC, abstractmethod
from typing import Optional


class ILatexConverter(ABC):
    """LaTeX 변환기 인터페이스

    HWP 수식 문자열을 LaTeX 형식으로 변환하는 서비스의 추상 인터페이스.
    실제 구현체와 Mock 구현체 모두 이 인터페이스를 따름.
    """

    @abstractmethod
    def convert(self, hwp_eq: str) -> str:
        """HWP 수식을 LaTeX로 변환

        Args:
            hwp_eq: HWP 수식 문자열 (예: "rm A", "sqrt{2}")

        Returns:
            LaTeX 형식 문자열 (예: "\\mathrm{A}", "\\sqrt{2}")
        """
        pass

    @abstractmethod
    def get_info(self) -> dict:
        """변환기 상태 정보 반환

        Returns:
            dict: {
                "instance_exists": bool,
                "instance_id": int | None,
                "file_mtime": float,
                "current_file_mtime": float | None,
                "app_env": str,
                "note": str | None
            }
        """
        pass


class IEquationCleaner(ABC):
    """수식 정리기 인터페이스

    HWP 수식을 일반 텍스트로 정리하는 서비스의 추상 인터페이스.
    LaTeX 변환 전처리 또는 텍스트 추출에 사용.
    """

    @abstractmethod
    def clean(self, equation: str) -> str:
        """HWP 수식을 일반 텍스트로 정리

        Args:
            equation: 정리할 수식 문자열

        Returns:
            정리된 텍스트 문자열
        """
        pass


class IHMLParser(ABC):
    """HML 파서 인터페이스

    HML 문서에서 수식을 파싱하고 변환하는 서비스의 추상 인터페이스.
    """

    @abstractmethod
    def parse_equations(self, hml_content: str) -> list[dict]:
        """HML 콘텐츠에서 수식 추출

        Args:
            hml_content: HML 문서 내용

        Returns:
            수식 정보 리스트 [{
                "original": str,
                "converted": str,
                "position": int
            }]
        """
        pass

    @abstractmethod
    def convert_document(self, hml_content: str) -> str:
        """HML 문서 내 모든 수식을 변환

        Args:
            hml_content: HML 문서 내용

        Returns:
            수식이 LaTeX로 변환된 HML 문서
        """
        pass
