"""
Phase 20-C: 의존성 주입 (DI) 테스트

HMLParser에 Mock 컨버터를 주입하여 테스트 가능성 검증
"""
import pytest
import tempfile
import os
from pathlib import Path

from app.services.hangul.interfaces import ILatexConverter
from app.services.hangul.hml_parser import HMLParser


class MockLatexConverter(ILatexConverter):
    """테스트용 Mock LaTeX 변환기

    실제 변환 로직 없이 고정된 값 반환
    """

    def __init__(self, prefix: str = "MOCK_"):
        self.prefix = prefix
        self.call_count = 0
        self.call_history = []

    def convert(self, hwp_eq: str) -> str:
        """Mock 변환: prefix + 원본 문자열"""
        self.call_count += 1
        self.call_history.append(hwp_eq)
        return f"{self.prefix}{hwp_eq}"

    def get_info(self) -> dict:
        """Mock 정보 반환"""
        return {
            "instance_exists": True,
            "instance_id": 999999,
            "file_mtime": 0,
            "current_file_mtime": 0,
            "app_env": "test",
            "note": "Mock converter for testing"
        }


class TestMockLatexConverter:
    """Mock 변환기 기본 테스트"""

    def test_mock_convert(self):
        """Mock 변환기가 올바르게 변환하는지 테스트"""
        mock = MockLatexConverter(prefix="TEST_")

        result = mock.convert("rm A")
        assert result == "TEST_rm A"

    def test_mock_call_count(self):
        """호출 횟수가 정확히 추적되는지 테스트"""
        mock = MockLatexConverter()

        mock.convert("a")
        mock.convert("b")
        mock.convert("c")

        assert mock.call_count == 3

    def test_mock_call_history(self):
        """호출 이력이 정확히 기록되는지 테스트"""
        mock = MockLatexConverter()

        mock.convert("first")
        mock.convert("second")

        assert mock.call_history == ["first", "second"]

    def test_mock_get_info(self):
        """Mock 정보가 올바르게 반환되는지 테스트"""
        mock = MockLatexConverter()
        info = mock.get_info()

        assert info["instance_exists"] is True
        assert info["instance_id"] == 999999
        assert info["app_env"] == "test"


class TestHMLParserDependencyInjection:
    """HMLParser 의존성 주입 테스트"""

    @pytest.fixture
    def sample_hml_content(self):
        """테스트용 HML 콘텐츠"""
        return """<?xml version="1.0" encoding="UTF-8"?>
<HWPML Version="2.8">
  <HEAD>
    <DOCSUMMARY>
      <TITLE>테스트 문서</TITLE>
    </DOCSUMMARY>
  </HEAD>
  <BODY>
    <SECTION>
      <P>
        <TEXT>문제 1</TEXT>
        <EQUATION>rm A + rm B</EQUATION>
      </P>
    </SECTION>
  </BODY>
</HWPML>"""

    @pytest.fixture
    def temp_hml_file(self, sample_hml_content):
        """임시 HML 파일 생성"""
        with tempfile.NamedTemporaryFile(
            mode='w',
            suffix='.hml',
            delete=False,
            encoding='utf-8'
        ) as f:
            f.write(sample_hml_content)
            temp_path = f.name

        yield temp_path

        # 정리
        if os.path.exists(temp_path):
            os.unlink(temp_path)

    def test_hml_parser_with_default_converter(self, temp_hml_file):
        """기본 컨버터(None)로 HMLParser 생성 테스트"""
        parser = HMLParser(temp_hml_file)

        # latex_converter가 None이면 기본 싱글톤 사용
        assert parser._latex_converter is None

    def test_hml_parser_with_mock_converter(self, temp_hml_file):
        """Mock 컨버터 주입 테스트"""
        mock = MockLatexConverter(prefix="INJECTED_")
        parser = HMLParser(temp_hml_file, latex_converter=mock)

        assert parser._latex_converter is mock
        assert parser._latex_converter.prefix == "INJECTED_"

    def test_hml_parser_convert_to_latex_with_mock(self, temp_hml_file):
        """Mock 컨버터가 _convert_to_latex에서 사용되는지 테스트"""
        mock = MockLatexConverter(prefix="MOCK_")
        parser = HMLParser(temp_hml_file, latex_converter=mock)

        result = parser._convert_to_latex("test equation")

        assert result == "MOCK_test equation"
        assert mock.call_count == 1
        assert mock.call_history == ["test equation"]

    def test_hml_parser_convert_to_latex_without_mock(self, temp_hml_file):
        """Mock 없이 기본 싱글톤 사용 테스트"""
        parser = HMLParser(temp_hml_file)  # latex_converter=None

        # 기본 싱글톤 hwp_to_latex 사용
        result = parser._convert_to_latex("rm A")

        # 실제 변환 결과 확인 (\\mathrm{A})
        assert "mathrm" in result or "A" in result


class TestDependencyInjectionIsolation:
    """의존성 주입 격리 테스트

    여러 파서 인스턴스가 독립적으로 동작하는지 검증
    """

    @pytest.fixture
    def temp_hml_file(self):
        """최소 HML 파일"""
        content = """<?xml version="1.0"?>
<HWPML><BODY><SECTION><P><TEXT>Test</TEXT></P></SECTION></BODY></HWPML>"""
        with tempfile.NamedTemporaryFile(
            mode='w',
            suffix='.hml',
            delete=False,
            encoding='utf-8'
        ) as f:
            f.write(content)
            temp_path = f.name
        yield temp_path
        if os.path.exists(temp_path):
            os.unlink(temp_path)

    def test_multiple_parsers_different_converters(self, temp_hml_file):
        """각 파서가 다른 컨버터를 사용하는지 테스트"""
        mock1 = MockLatexConverter(prefix="PARSER1_")
        mock2 = MockLatexConverter(prefix="PARSER2_")

        parser1 = HMLParser(temp_hml_file, latex_converter=mock1)
        parser2 = HMLParser(temp_hml_file, latex_converter=mock2)

        result1 = parser1._convert_to_latex("eq")
        result2 = parser2._convert_to_latex("eq")

        assert result1 == "PARSER1_eq"
        assert result2 == "PARSER2_eq"

    def test_converter_isolation(self, temp_hml_file):
        """컨버터 상태가 격리되는지 테스트"""
        mock1 = MockLatexConverter()
        mock2 = MockLatexConverter()

        parser1 = HMLParser(temp_hml_file, latex_converter=mock1)
        parser2 = HMLParser(temp_hml_file, latex_converter=mock2)

        # parser1만 사용
        parser1._convert_to_latex("a")
        parser1._convert_to_latex("b")

        # parser1의 mock만 호출됨
        assert mock1.call_count == 2
        assert mock2.call_count == 0

        # parser2 사용
        parser2._convert_to_latex("x")

        assert mock1.call_count == 2
        assert mock2.call_count == 1


class TestInterfaceImplementation:
    """인터페이스 구현 검증 테스트"""

    def test_mock_implements_interface(self):
        """MockLatexConverter가 ILatexConverter를 구현하는지 테스트"""
        mock = MockLatexConverter()

        assert isinstance(mock, ILatexConverter)

    def test_interface_methods_exist(self):
        """인터페이스 필수 메서드가 존재하는지 테스트"""
        mock = MockLatexConverter()

        # convert 메서드
        assert hasattr(mock, 'convert')
        assert callable(mock.convert)

        # get_info 메서드
        assert hasattr(mock, 'get_info')
        assert callable(mock.get_info)
