"""
Supabase Admin 클라이언트 (Phase 8-5)
Service Role Key를 사용한 관리자 전용 기능

⚠️ 주의: 이 모듈은 백엔드에서만 사용해야 합니다.
         Service Role Key는 절대 프론트엔드에 노출하면 안 됩니다!
"""
import secrets
import string
from typing import Optional
from supabase import create_client, Client
from ..config import config


# Supabase Admin 클라이언트 (싱글톤)
_supabase_admin: Optional[Client] = None


def get_supabase_admin() -> Client:
    """
    Supabase Admin 클라이언트 반환 (Service Role Key 사용)

    Returns:
        Supabase Client (Admin 권한)

    Raises:
        ValueError: Supabase 설정이 없는 경우
    """
    global _supabase_admin

    if _supabase_admin is None:
        if not config.SUPABASE_URL or not config.SUPABASE_SERVICE_KEY:
            raise ValueError(
                "Supabase 설정이 없습니다. "
                "SUPABASE_URL과 SUPABASE_SERVICE_KEY 환경변수를 설정하세요."
            )

        _supabase_admin = create_client(
            config.SUPABASE_URL,
            config.SUPABASE_SERVICE_KEY
        )

    return _supabase_admin


def generate_temp_password(email: Optional[str] = None) -> str:
    """
    임시 비밀번호 생성

    - email이 있으면: 이메일 아이디를 비밀번호로 사용
      예: dlgksthf0820@hyeyum.com → dlgksthf0820
    - email이 없으면: 랜덤 비밀번호 생성

    Args:
        email: 사용자 이메일 (선택)

    Returns:
        생성된 임시 비밀번호
    """
    # 이메일이 있으면 @ 앞부분을 비밀번호로 사용
    if email and '@' in email:
        return email.split('@')[0]

    # 폴백: 랜덤 비밀번호
    prefixes = ["Temp", "Reset", "Init", "Pass"]
    prefix = secrets.choice(prefixes)
    numbers = ''.join(secrets.choice(string.digits) for _ in range(4))
    return f"{prefix}#{numbers}!"


def is_supabase_configured() -> bool:
    """Supabase Admin이 설정되어 있는지 확인"""
    return bool(config.SUPABASE_URL and config.SUPABASE_SERVICE_KEY)
