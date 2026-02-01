"""
데이터베이스 연결 및 세션 관리
"""
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from pathlib import Path

# 데이터베이스 디렉토리 생성
settings.database_path.mkdir(parents=True, exist_ok=True)

# SQLAlchemy 엔진 생성
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},  # SQLite용 설정
    echo=settings.DEBUG,  # 디버그 모드에서 SQL 쿼리 출력
)

# 세션 팩토리 생성
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base 클래스 (모델 상속용)
Base = declarative_base()


def get_db():
    """
    데이터베이스 세션 의존성 주입 함수
    
    Yields:
        Session: 데이터베이스 세션
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db(force_recreate: bool = False):
    """
    데이터베이스 테이블 초기화
    모든 모델을 import한 후 호출해야 함
    
    Args:
        force_recreate: True이면 기존 테이블을 삭제하고 재생성
    """
    # 모든 모델을 import하여 Base.metadata에 등록
    from app.database import models  # noqa: F401
    
    # 기존 테이블 구조 확인
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    # cards 테이블이 있고 구조가 다른 경우 재생성
    should_recreate = force_recreate
    if 'cards' in existing_tables and not should_recreate:
        columns = [col['name'] for col in inspector.get_columns('cards')]
        # 기존 테이블에 'card_sn' 컬럼이 없으면 (구 스키마) 재생성 필요
        if 'card_sn' not in columns:
            print("⚠️  기존 테이블 구조가 변경되었습니다. 테이블을 재생성합니다...")
            should_recreate = True
    
    if should_recreate:
        Base.metadata.drop_all(bind=engine, tables=[models.Card.__table__, models.CardGenerationHistory.__table__])
        print("🗑️  기존 테이블이 삭제되었습니다.")
    
    # 테이블 생성 (기존 테이블이 있으면 무시)
    Base.metadata.create_all(bind=engine)

    # users 테이블에 is_admin 컬럼이 없으면 추가 (마이그레이션)
    if "users" in inspector.get_table_names():
        user_columns = [c["name"] for c in inspector.get_columns("users")]
        if "is_admin" not in user_columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0"))
                conn.commit()
            print("✅ users 테이블에 is_admin 컬럼을 추가했습니다.")

    # cards 테이블에 user_id 컬럼이 없으면 추가 (마이그레이션)
    if "cards" in inspector.get_table_names():
        card_columns = [c["name"] for c in inspector.get_columns("cards")]
        if "user_id" not in card_columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE cards ADD COLUMN user_id INTEGER"))
                conn.commit()
            print("✅ cards 테이블에 user_id 컬럼을 추가했습니다.")

    # workspaces 테이블에 deleted_at 컬럼이 없으면 추가 (소프트 삭제용 마이그레이션)
    if "workspaces" in inspector.get_table_names():
        ws_columns = [c["name"] for c in inspector.get_columns("workspaces")]
        if "deleted_at" not in ws_columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE workspaces ADD COLUMN deleted_at DATETIME"))
                conn.commit()
            print("✅ workspaces 테이블에 deleted_at 컬럼을 추가했습니다.")

    print(f"✅ 데이터베이스 테이블이 초기화되었습니다: {settings.database_url}")


def reset_db():
    """
    데이터베이스 테이블 삭제 후 재생성
    ⚠️ 주의: 모든 데이터가 삭제됩니다!
    """
    # 모든 모델을 import하여 Base.metadata에 등록
    from app.database import models  # noqa: F401
    
    # 모든 테이블 삭제
    Base.metadata.drop_all(bind=engine)
    print("🗑️  기존 테이블이 삭제되었습니다.")
    
    # 테이블 재생성
    Base.metadata.create_all(bind=engine)
    print(f"✅ 데이터베이스 테이블이 재생성되었습니다: {settings.database_url}")
