"""
인증(회원) API 라우트
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.auth import (
    UserRegisterSchema,
    UserLoginSchema,
    TokenSchema,
    UserResponseSchema,
)
from app.services.auth_service import (
    get_user_by_email,
    get_user_by_id,
    create_user,
    user_to_response,
)
from app.core.security import verify_password, create_access_token, decode_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

# Bearer 토큰 (Authorization: Bearer <token>)
security_bearer = HTTPBearer(auto_error=False)


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_bearer),
) -> int | None:
    """
    Authorization 헤더에서 Bearer 토큰을 읽어 사용자 ID를 반환.
    없거나 유효하지 않으면 None.
    """
    if not credentials or credentials.scheme.lower() != "bearer":
        return None
    sub = decode_access_token(credentials.credentials)
    if sub is None:
        return None
    try:
        return int(sub)
    except ValueError:
        return None


def get_current_user_optional(
    user_id: int | None = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """로그인한 사용자만 필요할 때: User 또는 None 반환"""
    if user_id is None:
        return None
    user = get_user_by_id(db, user_id)
    return user


def get_current_user_required(
    user_id: int | None = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """로그인 필수: User 반환, 없으면 401"""
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="로그인이 필요합니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="사용자를 찾을 수 없습니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


@router.post("/register", response_model=UserResponseSchema)
def register(data: UserRegisterSchema, db: Session = Depends(get_db)):
    """회원가입"""
    if get_user_by_email(db, data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 사용 중인 이메일입니다.",
        )
    user = create_user(db, data)
    return user_to_response(user)


@router.post("/login", response_model=TokenSchema)
def login(data: UserLoginSchema, db: Session = Depends(get_db)):
    """로그인: 액세스 토큰 발급"""
    user = get_user_by_email(db, data.email)
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다.",
        )
    access_token = create_access_token(subject=user.id)
    return TokenSchema(access_token=access_token, token_type="bearer")


@router.get("/me", response_model=UserResponseSchema)
def me(user=Depends(get_current_user_required)):
    """현재 로그인한 사용자 정보"""
    return user_to_response(user)
