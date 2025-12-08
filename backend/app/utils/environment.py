"""
Phase 20-A: 환경 감지 및 설정 유틸리티

실행 환경을 감지하고 환경별 설정을 제공합니다.

사용법:
    from app.utils import is_development, is_production

    if is_development():
        # 개발 환경 전용 로직
        pass
"""
import os
from enum import Enum
from typing import Optional


class Environment(Enum):
    """실행 환경 타입"""
    DEVELOPMENT = "development"
    PRODUCTION = "production"
    TESTING = "testing"


def get_environment() -> Environment:
    """
    현재 실행 환경 반환

    환경 변수 APP_ENV 값에 따라 결정:
    - development (기본값)
    - production / prod
    - testing / test

    Returns:
        Environment: 현재 실행 환경
    """
    env = os.getenv('APP_ENV', 'development').lower().strip()

    if env in ('prod', 'production'):
        return Environment.PRODUCTION
    elif env in ('test', 'testing'):
        return Environment.TESTING
    else:
        return Environment.DEVELOPMENT


def is_development() -> bool:
    """
    개발 환경 여부 확인

    Returns:
        bool: 개발 환경이면 True
    """
    return get_environment() == Environment.DEVELOPMENT


def is_production() -> bool:
    """
    프로덕션 환경 여부 확인

    Returns:
        bool: 프로덕션 환경이면 True
    """
    return get_environment() == Environment.PRODUCTION


def is_testing() -> bool:
    """
    테스트 환경 여부 확인

    Returns:
        bool: 테스트 환경이면 True
    """
    return get_environment() == Environment.TESTING


def get_env_info() -> dict:
    """
    환경 정보 딕셔너리 반환 (디버깅용)

    Returns:
        dict: 환경 정보
    """
    return {
        'environment': get_environment().value,
        'is_development': is_development(),
        'is_production': is_production(),
        'is_testing': is_testing(),
        'APP_ENV': os.getenv('APP_ENV', '(not set)'),
        'PYTHONDONTWRITEBYTECODE': os.getenv('PYTHONDONTWRITEBYTECODE', '(not set)'),
    }
