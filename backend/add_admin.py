"""
DB에 관리자 계정 추가 스크립트

사용법:
  uv run python add_admin.py

환경변수(.env)로 지정 가능:
  ADMIN_EMAIL=admin@example.com
  ADMIN_PASSWORD=비밀번호8자이상

미지정 시 기본값: admin@localhost / admin123
"""
import os
from app.database.database import SessionLocal, init_db
from app.database.models import User
from app.core.config import settings
from app.core.security import get_password_hash


def main() -> None:
    init_db(force_recreate=False)

    email = (settings.ADMIN_EMAIL or os.environ.get("ADMIN_EMAIL") or "admin@localhost").strip().lower()
    password = settings.ADMIN_PASSWORD or os.environ.get("ADMIN_PASSWORD") or "admin123"

    if len(password) < 8:
        print("❌ ADMIN_PASSWORD는 8자 이상이어야 합니다.")
        return

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.is_admin = 1
            user.hashed_password = get_password_hash(password)
            db.commit()
            db.refresh(user)
            print(f"✅ 기존 계정을 관리자로 설정했습니다: {email}")
        else:
            user = User(
                email=email,
                hashed_password=get_password_hash(password),
                display_name="관리자",
                is_admin=1,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"✅ 관리자 계정을 생성했습니다: {email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
