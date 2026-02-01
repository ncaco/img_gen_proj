"""
회원(인증) 관련 비즈니스 로직
"""
from sqlalchemy.orm import Session

from app.database.models import User
from app.schemas.auth import UserRegisterSchema, UserResponseSchema
from app.core.security import get_password_hash, create_access_token


def get_user_by_email(db: Session, email: str):
    """이메일로 사용자 조회"""
    return db.query(User).filter(User.email == email.strip().lower()).first()


def get_user_by_id(db: Session, user_id: int):
    """ID로 사용자 조회"""
    return db.query(User).filter(User.id == user_id).first()


def create_user(db: Session, data: UserRegisterSchema) -> User:
    """회원가입: 사용자 생성"""
    user = User(
        email=data.email.strip().lower(),
        hashed_password=get_password_hash(data.password),
        display_name=(data.display_name or "").strip() or None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def user_to_response(user: User) -> UserResponseSchema:
    """User 모델을 응답 스키마로 변환"""
    return UserResponseSchema(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        is_admin=bool(getattr(user, "is_admin", 0)),
    )
