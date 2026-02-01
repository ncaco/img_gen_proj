"""
인증(회원) 관련 스키마 정의
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional


def _validate_email(v: str) -> str:
    """이메일 검증 (표준 형식 또는 @localhost 허용)"""
    v = (v or "").strip().lower()
    if not v or "@" not in v:
        raise ValueError("올바른 이메일 형식이 아닙니다.")
    local, domain = v.split("@", 1)
    if not local:
        raise ValueError("올바른 이메일 형식이 아닙니다.")
    # 개발용: @localhost 허용
    if domain == "localhost":
        return v
    # 그 외는 도메인에 마침표 필요
    if "." not in domain:
        raise ValueError("도메인 형식이 올바르지 않습니다. (예: user@example.com 또는 user@localhost)")
    return v


class UserRegisterSchema(BaseModel):
    """회원가입 요청 스키마"""
    email: str = Field(..., description="이메일 (로그인 ID)")
    password: str = Field(..., min_length=8, description="비밀번호 (8자 이상)")
    display_name: Optional[str] = Field(None, max_length=100, description="표시 이름")

    @field_validator("email")
    @classmethod
    def email_format(cls, v: str) -> str:
        return _validate_email(v)


class UserLoginSchema(BaseModel):
    """로그인 요청 스키마"""
    email: str = Field(..., description="이메일")
    password: str = Field(..., description="비밀번호")

    @field_validator("email")
    @classmethod
    def email_format(cls, v: str) -> str:
        return _validate_email(v)


class TokenSchema(BaseModel):
    """JWT 토큰 응답 스키마"""
    access_token: str = Field(..., description="액세스 토큰")
    token_type: str = Field(default="bearer", description="토큰 타입")


class UserResponseSchema(BaseModel):
    """회원 정보 응답 스키마 (비밀번호 제외)"""
    id: int
    email: str
    display_name: Optional[str] = None
    is_admin: bool = False

    class Config:
        from_attributes = True
