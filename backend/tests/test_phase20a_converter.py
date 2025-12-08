# -*- coding: utf-8 -*-
"""
Phase 20-A: 컨버터 싱글톤 패턴 테스트

테스트 항목:
1. 기본 변환 기능
2. 싱글톤 인스턴스 재사용
3. 파일 변경 시 재생성 (개발 환경)
4. 프로덕션 환경에서 싱글톤 유지
"""
import pytest
import os
import sys

# 경로 설정
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


class TestHwpToLatex:
    """hwp_to_latex 함수 테스트"""

    def test_basic_conversion(self):
        """기본 변환 테스트"""
        from app.services.hangul.hwp_latex_converter import hwp_to_latex

        # rm 패턴
        assert r'\mathrm{A}' in hwp_to_latex('rm A')

        # overline 패턴
        result = hwp_to_latex('overline{{rm{AB}} it }')
        assert r'\overline' in result
        assert r'\mathrm{AB}' in result

    def test_fraction_conversion(self):
        """분수 변환 테스트"""
        from app.services.hangul.hwp_latex_converter import hwp_to_latex

        result = hwp_to_latex('{5} over {4}')
        assert r'\frac{5}{4}' in result

    def test_bracket_conversion(self):
        """괄호 변환 테스트"""
        from app.services.hangul.hwp_latex_converter import hwp_to_latex

        result = hwp_to_latex('LEFT ( x RIGHT )')
        assert r'\left(' in result
        assert r'\right)' in result


class TestSingletonPattern:
    """싱글톤 패턴 테스트"""

    def test_instance_reuse(self):
        """인스턴스 재사용 확인"""
        from app.services.hangul import hwp_latex_converter

        # 첫 번째 호출
        hwp_latex_converter.hwp_to_latex('test1')
        info1 = hwp_latex_converter.get_converter_info()

        # 두 번째 호출
        hwp_latex_converter.hwp_to_latex('test2')
        info2 = hwp_latex_converter.get_converter_info()

        # 같은 인스턴스여야 함
        assert info1['instance_id'] == info2['instance_id']

    def test_converter_info(self):
        """컨버터 정보 확인"""
        from app.services.hangul.hwp_latex_converter import get_converter_info

        info = get_converter_info()

        assert 'instance_exists' in info
        assert 'instance_id' in info
        assert 'file_mtime' in info
        assert 'app_env' in info


class TestFileChangeDetection:
    """파일 변경 감지 테스트"""

    def test_mtime_tracking(self):
        """파일 mtime 추적 확인"""
        from app.services.hangul import hwp_latex_converter

        # 변환 실행 (인스턴스 생성)
        hwp_latex_converter.hwp_to_latex('test')
        info = hwp_latex_converter.get_converter_info()

        # mtime이 기록되어야 함
        assert info['file_mtime'] > 0
        assert info['current_file_mtime'] is not None

    def test_recreate_on_mtime_change(self):
        """mtime 변경 시 재생성 확인 (개발 환경)"""
        from app.services.hangul import hwp_latex_converter

        # 환경 변수 확인 (production이 아니어야 함)
        env = os.environ.get('APP_ENV', 'development')
        if env in ('prod', 'production'):
            pytest.skip('프로덕션 환경에서는 스킵')

        # 첫 번째 호출
        hwp_latex_converter.hwp_to_latex('test')
        info1 = hwp_latex_converter.get_converter_info()
        old_id = info1['instance_id']

        # mtime 강제 변경 (재생성 트리거)
        hwp_latex_converter._converter_file_mtime = 0

        # 두 번째 호출 (새 인스턴스 생성되어야 함)
        hwp_latex_converter.hwp_to_latex('test')
        info2 = hwp_latex_converter.get_converter_info()
        new_id = info2['instance_id']

        # 다른 인스턴스여야 함
        assert old_id != new_id


class TestProductionBehavior:
    """프로덕션 환경 동작 테스트"""

    def test_singleton_in_production(self):
        """프로덕션에서 싱글톤 유지"""
        from app.services.hangul import hwp_latex_converter

        # 프로덕션 환경 설정
        original_env = os.environ.get('APP_ENV')
        os.environ['APP_ENV'] = 'production'

        try:
            # 기존 인스턴스 리셋
            hwp_latex_converter._converter = None
            hwp_latex_converter._converter_file_mtime = 0

            # 첫 번째 호출
            hwp_latex_converter.hwp_to_latex('test')
            info1 = hwp_latex_converter.get_converter_info()
            old_id = info1['instance_id']

            # mtime 변경해도 재생성 안됨
            hwp_latex_converter._converter_file_mtime = 0

            # 두 번째 호출
            hwp_latex_converter.hwp_to_latex('test')
            info2 = hwp_latex_converter.get_converter_info()
            new_id = info2['instance_id']

            # 같은 인스턴스여야 함 (프로덕션)
            assert old_id == new_id

        finally:
            # 환경 복원
            if original_env is not None:
                os.environ['APP_ENV'] = original_env
            elif 'APP_ENV' in os.environ:
                del os.environ['APP_ENV']

            # 인스턴스 리셋 (다른 테스트 영향 방지)
            hwp_latex_converter._converter = None
            hwp_latex_converter._converter_file_mtime = 0


class TestEnvironmentUtility:
    """환경 유틸리티 테스트"""

    def test_is_development_default(self):
        """기본값이 development인지 확인"""
        from app.utils import is_development

        # APP_ENV가 설정되지 않으면 development
        original_env = os.environ.get('APP_ENV')
        if 'APP_ENV' in os.environ:
            del os.environ['APP_ENV']

        try:
            assert is_development() == True
        finally:
            if original_env is not None:
                os.environ['APP_ENV'] = original_env

    def test_environment_detection(self):
        """환경 감지 테스트"""
        from app.utils import get_environment, Environment

        original_env = os.environ.get('APP_ENV')

        try:
            # 개발 환경
            os.environ['APP_ENV'] = 'development'
            assert get_environment() == Environment.DEVELOPMENT

            # 프로덕션 환경
            os.environ['APP_ENV'] = 'production'
            assert get_environment() == Environment.PRODUCTION

            # 테스트 환경
            os.environ['APP_ENV'] = 'testing'
            assert get_environment() == Environment.TESTING

        finally:
            if original_env is not None:
                os.environ['APP_ENV'] = original_env
            elif 'APP_ENV' in os.environ:
                del os.environ['APP_ENV']


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
