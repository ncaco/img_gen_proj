"""
애플리케이션 설정 관리
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator
from typing import List, Optional
from pathlib import Path


class Settings(BaseSettings):
    """애플리케이션 설정"""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )
    
    # 애플리케이션 정보
    APP_NAME: str = Field(default="카드 생성기 API", description="애플리케이션 이름")
    APP_VERSION: str = Field(default="0.1.0", description="애플리케이션 버전")
    APP_DESCRIPTION: str = Field(
        default="트레이딩 카드 게임 스타일의 카드를 생성하는 API 서버",
        description="애플리케이션 설명"
    )
    
    # 서버 설정
    HOST: str = Field(default="0.0.0.0", description="서버 호스트")
    PORT: int = Field(default=8000, description="서버 포트")
    DEBUG: bool = Field(default=True, description="디버그 모드")
    
    # CORS 설정 (환경변수에서 쉼표로 구분된 문자열로 받아서 리스트로 변환)
    CORS_ORIGINS: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000",
        description="CORS 허용 오리진 (쉼표로 구분)"
    )
    
    @property
    def cors_origins_list(self) -> List[str]:
        """CORS 오리진 문자열을 리스트로 변환"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
    
    # API 설정
    API_V1_PREFIX: str = Field(default="/api/v1", description="API v1 프리픽스")
    
    # 데이터베이스 설정
    DATABASE_DIR: str = Field(default="data/database", description="데이터베이스 디렉토리")
    DATABASE_NAME: str = Field(default="cards.db", description="데이터베이스 파일명")
    
    @property
    def database_path(self) -> Path:
        """데이터베이스 디렉토리 경로 (Path 객체)"""
        base_path = Path(__file__).parent.parent.parent
        return base_path / self.DATABASE_DIR
    
    @property
    def database_url(self) -> str:
        """데이터베이스 URL"""
        db_file = self.database_path / self.DATABASE_NAME
        return f"sqlite:///{db_file}"
    
    # JWT / 인증 설정
    JWT_SECRET: str = Field(
        default="change-me-in-production-use-env",
        description="JWT 서명 시크릿 (환경변수 JWT_SECRET 권장)",
    )
    JWT_ALGORITHM: str = Field(default="HS256", description="JWT 알고리즘")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=60 * 24 * 7,
        description="액세스 토큰 만료 시간 (분, 기본 7일)",
    )

    # 관리자 계정 추가 스크립트용 (add_admin.py, .env에 설정)
    ADMIN_EMAIL: Optional[str] = Field(default=None, description="관리자 이메일 (add_admin.py)")
    ADMIN_PASSWORD: Optional[str] = Field(default=None, description="관리자 비밀번호 (add_admin.py, 8자 이상)")

    # OpenAI (플로우 Lore 분석 등)
    OPENAI_API_KEY: Optional[str] = Field(default=None, description="OpenAI API 키 (환경변수 OPENAI_API_KEY)")

    # 파일 업로드 설정
    UPLOAD_DIR: str = Field(default="data/upload", description="업로드 디렉토리")
    MAX_UPLOAD_SIZE: int = Field(
        default=10485760,  # 10MB
        description="최대 업로드 파일 크기 (바이트)"
    )
    ALLOWED_EXTENSIONS: str = Field(
        default="jpg,jpeg,png,gif,webp,svg",
        description="허용된 파일 확장자 (쉼표로 구분)"
    )
    
    @property
    def allowed_extensions_list(self) -> List[str]:
        """허용된 확장자 문자열을 리스트로 변환"""
        return [ext.strip().lower() for ext in self.ALLOWED_EXTENSIONS.split(",") if ext.strip()]
    
    @property
    def upload_path(self) -> Path:
        """업로드 디렉토리 경로 (Path 객체)"""
        base_path = Path(__file__).parent.parent.parent
        return base_path / self.UPLOAD_DIR


# 전역 설정 인스턴스
settings = Settings()
