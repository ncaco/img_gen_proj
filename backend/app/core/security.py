"""
인증/보안 유틸 (JWT, 비밀번호)
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# 비밀번호 해싱
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """평문 비밀번호와 해시가 일치하는지 검증"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """비밀번호 해시 생성"""
    return pwd_context.hash(password)


def create_access_token(subject: str | int, expires_delta: Optional[timedelta] = None) -> str:
    """
    JWT 액세스 토큰 생성
    subject: 보통 사용자 ID (정수) 또는 이메일
    """
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode = {"sub": str(subject), "exp": expire}
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[str]:
    """
    JWT 토큰 디코딩. 성공 시 subject(보통 user id) 반환, 실패 시 None.
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        sub = payload.get("sub")
        return sub
    except JWTError:
        return None
