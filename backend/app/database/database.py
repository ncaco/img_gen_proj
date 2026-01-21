"""
데이터베이스 연결 및 세션 관리
"""
from sqlalchemy import create_engine
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


def init_db():
    """
    데이터베이스 테이블 초기화
    모든 모델을 import한 후 호출해야 함
    """
    # 모든 모델을 import하여 Base.metadata에 등록
    from app.database import models  # noqa: F401
    
    # 테이블 생성
    Base.metadata.create_all(bind=engine)
    print(f"✅ 데이터베이스 테이블이 초기화되었습니다: {settings.database_url}")
