"""
FastAPI 애플리케이션 진입점
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.core.config import settings
from app.core.cors import setup_cors
from app.api import api_router
from app.schemas.card import HealthCheckSchema, RootResponseSchema
from app.database import init_db
from app.utils.file_utils import ensure_upload_dir
from fastapi.staticfiles import StaticFiles


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    애플리케이션 생명주기 관리
    서버 시작 시 데이터베이스 테이블 및 업로드 디렉토리 초기화
    """
    # 서버 시작 시 실행
    print("🚀 서버 시작 중...")
    init_db()
    ensure_upload_dir()
    print(f"📁 업로드 디렉토리 준비 완료: {settings.upload_path}")
    yield
    # 서버 종료 시 실행
    print("🛑 서버 종료 중...")


# FastAPI 애플리케이션 생성
app = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_DESCRIPTION,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# CORS 설정
setup_cors(app)

# 정적 파일 서빙 (업로드된 파일 조회용)
app.mount("/data", StaticFiles(directory=str(settings.upload_path.parent)), name="data")

# API 라우터 등록
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/", response_model=RootResponseSchema)
async def root():
    """루트 엔드포인트"""
    return RootResponseSchema(
        message="카드 생성기 API 서버",
        version=settings.APP_VERSION,
        status="running"
    )


@app.get("/health", response_model=HealthCheckSchema)
async def health_check():
    """헬스 체크 엔드포인트"""
    return HealthCheckSchema(status="healthy")


if __name__ == "__main__":
    import uvicorn
    # reload를 사용하려면 import string을 사용해야 하므로, 직접 실행 시에는 reload=False
    uvicorn.run(
        "main:app",  # import string 사용
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
