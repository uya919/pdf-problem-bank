"""
사용자 관리 API 라우터 (Phase 8-5)
관리자가 강사/직원 계정을 생성하고 관리

⚠️ 모든 엔드포인트는 인증된 admin/owner만 접근 가능
"""
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Literal
from datetime import datetime

from ..utils.supabase_admin import (
    get_supabase_admin,
    generate_temp_password,
    is_supabase_configured
)


router = APIRouter(prefix="/api/admin/users", tags=["Admin Users"])


# =====================================================
# Request/Response Models
# =====================================================

class CreateUserRequest(BaseModel):
    """사용자 생성 요청"""
    name: str
    email: str  # @hyeyum.com 형식
    role: Literal["teacher", "admin"] = "teacher"
    phone: Optional[str] = None


class CreateUserResponse(BaseModel):
    """사용자 생성 응답"""
    user_id: str
    email: str
    name: str
    role: str
    temp_password: str


class UpdateRoleRequest(BaseModel):
    """권한 변경 요청"""
    role: Literal["teacher", "admin"]


class ResetPasswordResponse(BaseModel):
    """비밀번호 리셋 응답"""
    temp_password: str


class UserProfile(BaseModel):
    """사용자 프로필"""
    id: str
    name: str
    email: str
    role: str
    phone: Optional[str]
    is_active: bool
    created_at: str
    updated_at: str


class UsersListResponse(BaseModel):
    """사용자 목록 응답"""
    users: List[UserProfile]
    total: int


# =====================================================
# Helper Functions
# =====================================================

async def verify_owner_permission(authorization: str) -> dict:
    """
    JWT에서 사용자 정보 추출 및 owner 권한 확인

    Args:
        authorization: Authorization 헤더 (Bearer token)

    Returns:
        사용자 정보 dict

    Raises:
        HTTPException: 인증 실패 또는 권한 부족
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="인증이 필요합니다")

    token = authorization.replace("Bearer ", "")

    try:
        supabase = get_supabase_admin()

        # JWT에서 사용자 정보 추출
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")

        user_id = user_response.user.id

        # profiles에서 role 확인
        profile_response = supabase.table("profiles").select("*").eq("id", user_id).single().execute()

        if not profile_response.data:
            raise HTTPException(status_code=401, detail="프로필을 찾을 수 없습니다")

        profile = profile_response.data

        if profile.get("role") != "owner":
            raise HTTPException(status_code=403, detail="owner 권한이 필요합니다")

        return profile

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"인증 오류: {str(e)}")


async def verify_admin_permission(authorization: str) -> dict:
    """
    JWT에서 사용자 정보 추출 및 admin/owner 권한 확인

    Args:
        authorization: Authorization 헤더 (Bearer token)

    Returns:
        사용자 정보 dict

    Raises:
        HTTPException: 인증 실패 또는 권한 부족
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="인증이 필요합니다")

    token = authorization.replace("Bearer ", "")

    try:
        supabase = get_supabase_admin()

        # JWT에서 사용자 정보 추출
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")

        user_id = user_response.user.id

        # profiles에서 role 확인
        profile_response = supabase.table("profiles").select("*").eq("id", user_id).single().execute()

        if not profile_response.data:
            raise HTTPException(status_code=401, detail="프로필을 찾을 수 없습니다")

        profile = profile_response.data

        if profile.get("role") not in ["admin", "owner"]:
            raise HTTPException(status_code=403, detail="admin 이상의 권한이 필요합니다")

        return profile

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"인증 오류: {str(e)}")


# =====================================================
# API Endpoints
# =====================================================

@router.get("/health")
async def health_check():
    """헬스 체크 및 Supabase 연결 상태"""
    return {
        "status": "ok",
        "supabase_configured": is_supabase_configured()
    }


@router.get("", response_model=UsersListResponse)
async def get_users(
    authorization: str = Header(None),
    role: Optional[str] = None,
    is_active: Optional[bool] = None
):
    """
    사용자 목록 조회 (admin/owner만 가능)

    Query Params:
        role: 역할 필터 (teacher, admin, owner)
        is_active: 활성 상태 필터
    """
    await verify_admin_permission(authorization)

    try:
        supabase = get_supabase_admin()

        query = supabase.table("profiles").select("*")

        if role:
            query = query.eq("role", role)
        if is_active is not None:
            query = query.eq("is_active", is_active)

        response = query.order("created_at", desc=True).execute()

        users = response.data or []

        return UsersListResponse(
            users=[UserProfile(**user) for user in users],
            total=len(users)
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"사용자 목록 조회 실패: {str(e)}")


@router.post("", response_model=CreateUserResponse)
async def create_user(
    data: CreateUserRequest,
    authorization: str = Header(None)
):
    """
    새 사용자 생성 (owner만 가능)

    - 이메일 인증 없이 즉시 활성화
    - 임시 비밀번호 자동 생성
    """
    await verify_owner_permission(authorization)

    try:
        supabase = get_supabase_admin()

        # 임시 비밀번호 생성 (이메일 아이디와 동일)
        temp_password = generate_temp_password(data.email)

        # Supabase Auth에 사용자 생성
        auth_response = supabase.auth.admin.create_user({
            "email": data.email,
            "password": temp_password,
            "email_confirm": True,  # 이메일 인증 건너뛰기
            "user_metadata": {"name": data.name}
        })

        if not auth_response.user:
            raise HTTPException(status_code=400, detail="사용자 생성 실패")

        user_id = auth_response.user.id

        # profiles 테이블 업데이트 (트리거로 기본 생성됨)
        supabase.table("profiles").update({
            "name": data.name,
            "role": data.role,
            "phone": data.phone,
            "is_active": True
        }).eq("id", user_id).execute()

        return CreateUserResponse(
            user_id=user_id,
            email=data.email,
            name=data.name,
            role=data.role,
            temp_password=temp_password
        )

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "already been registered" in error_msg:
            raise HTTPException(status_code=400, detail="이미 등록된 이메일입니다")
        raise HTTPException(status_code=500, detail=f"사용자 생성 실패: {error_msg}")


@router.patch("/{user_id}/role")
async def update_user_role(
    user_id: str,
    data: UpdateRoleRequest,
    authorization: str = Header(None)
):
    """
    사용자 권한 변경 (owner만 가능)

    - teacher ↔ admin 변경만 가능
    - owner 권한은 변경 불가 (DB에서 직접 수정)
    """
    current_user = await verify_owner_permission(authorization)

    # 자기 자신의 권한은 변경 불가
    if current_user.get("id") == user_id:
        raise HTTPException(status_code=400, detail="자신의 권한은 변경할 수 없습니다")

    try:
        supabase = get_supabase_admin()

        # 대상 사용자 확인
        target_response = supabase.table("profiles").select("*").eq("id", user_id).single().execute()

        if not target_response.data:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

        target = target_response.data

        # owner 권한은 변경 불가
        if target.get("role") == "owner":
            raise HTTPException(status_code=400, detail="owner 권한은 변경할 수 없습니다")

        # 권한 업데이트
        supabase.table("profiles").update({
            "role": data.role,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", user_id).execute()

        return {"message": f"권한이 {data.role}로 변경되었습니다"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"권한 변경 실패: {str(e)}")


@router.post("/{user_id}/reset-password", response_model=ResetPasswordResponse)
async def reset_user_password(
    user_id: str,
    authorization: str = Header(None)
):
    """
    사용자 비밀번호 리셋 (owner만 가능)

    - 새 임시 비밀번호 생성
    - 기존 비밀번호는 무효화됨
    """
    current_user = await verify_owner_permission(authorization)

    # 자기 자신의 비밀번호는 직접 변경
    if current_user.get("id") == user_id:
        raise HTTPException(status_code=400, detail="본인 비밀번호는 설정에서 변경하세요")

    try:
        supabase = get_supabase_admin()

        # 대상 사용자 확인
        target_response = supabase.table("profiles").select("*").eq("id", user_id).single().execute()

        if not target_response.data:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

        # 새 임시 비밀번호 생성
        temp_password = generate_temp_password()

        # 비밀번호 업데이트
        supabase.auth.admin.update_user_by_id(
            user_id,
            {"password": temp_password}
        )

        return ResetPasswordResponse(temp_password=temp_password)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"비밀번호 리셋 실패: {str(e)}")


@router.patch("/{user_id}/deactivate")
async def deactivate_user(
    user_id: str,
    authorization: str = Header(None)
):
    """
    사용자 비활성화 (owner만 가능)

    - 로그인 불가 (is_active = false)
    - 데이터는 유지됨
    """
    current_user = await verify_owner_permission(authorization)

    # 자기 자신은 비활성화 불가
    if current_user.get("id") == user_id:
        raise HTTPException(status_code=400, detail="자신의 계정은 비활성화할 수 없습니다")

    try:
        supabase = get_supabase_admin()

        # 대상 사용자 확인
        target_response = supabase.table("profiles").select("*").eq("id", user_id).single().execute()

        if not target_response.data:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

        target = target_response.data

        # owner는 비활성화 불가
        if target.get("role") == "owner":
            raise HTTPException(status_code=400, detail="owner 계정은 비활성화할 수 없습니다")

        # 비활성화
        supabase.table("profiles").update({
            "is_active": False,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", user_id).execute()

        return {"message": "계정이 비활성화되었습니다"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"비활성화 실패: {str(e)}")


@router.patch("/{user_id}/activate")
async def activate_user(
    user_id: str,
    authorization: str = Header(None)
):
    """
    사용자 재활성화 (owner만 가능)
    """
    await verify_owner_permission(authorization)

    try:
        supabase = get_supabase_admin()

        # 대상 사용자 확인
        target_response = supabase.table("profiles").select("*").eq("id", user_id).single().execute()

        if not target_response.data:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

        # 활성화
        supabase.table("profiles").update({
            "is_active": True,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", user_id).execute()

        return {"message": "계정이 활성화되었습니다"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"활성화 실패: {str(e)}")


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    authorization: str = Header(None)
):
    """
    사용자 완전 삭제 (owner만 가능)

    - Supabase Auth에서 사용자 삭제
    - profiles 테이블은 cascade로 자동 삭제
    - ⚠️ 복구 불가능
    """
    current_user = await verify_owner_permission(authorization)

    # 자기 자신은 삭제 불가
    if current_user.get("id") == user_id:
        raise HTTPException(status_code=400, detail="자신의 계정은 삭제할 수 없습니다")

    try:
        supabase = get_supabase_admin()

        # 대상 사용자 확인
        target_response = supabase.table("profiles").select("*").eq("id", user_id).single().execute()

        if not target_response.data:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

        target = target_response.data

        # owner는 삭제 불가
        if target.get("role") == "owner":
            raise HTTPException(status_code=400, detail="owner 계정은 삭제할 수 없습니다")

        # Supabase Auth에서 사용자 삭제 (profiles는 cascade)
        supabase.auth.admin.delete_user(user_id)

        return {"message": "계정이 삭제되었습니다"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"삭제 실패: {str(e)}")
