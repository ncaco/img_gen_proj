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
from fastapi.responses import Response
from pathlib import Path
import mimetypes


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    애플리케이션 생명주기 관리
    서버 시작 시 데이터베이스 테이블 및 업로드 디렉토리 초기화
    """
    # 서버 시작 시 실행
    print("🚀 서버 시작 중...")
    # DEBUG 모드일 때는 테이블 구조 변경 시 자동 재생성
    init_db(force_recreate=False)
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

# 정적 파일 서빙은 커스텀 엔드포인트로 처리 (CORS 헤더 포함)
# app.mount("/data", StaticFiles(directory=str(settings.upload_path.parent)), name="data")

# /data 경로로 정적 파일 서빙 (CORS 헤더 포함)
@app.get("/data/{file_path:path}")
async def serve_static_file(file_path: str):
    """
    정적 파일 서빙 (CORS 헤더 포함)
    
    - **file_path**: 파일 경로 (예: upload/cards/image.jpg 또는 upload/image.jpg)
    """
    try:
        from fastapi import HTTPException
        
        # file_path에서 앞의 슬래시 제거 및 정규화
        # "/upload/xxx.png" 또는 "upload/xxx.png" 모두 처리
        file_path = file_path.lstrip('/')
        
        # 전체 경로 구성
        # file_path는 "upload/cards/xxx.png" 또는 "upload/xxx.png" 형식
        full_path = settings.upload_path.parent / file_path
        
        # 디버깅 로그 (개발 환경에서만)
        if settings.DEBUG:
            print(f"📁 파일 요청: {file_path}")
            print(f"📂 전체 경로: {full_path}")
            print(f"📂 절대 경로: {full_path.resolve()}")
            print(f"✅ 파일 존재: {full_path.exists()}")
            if full_path.exists():
                print(f"📏 파일 크기: {full_path.stat().st_size} bytes")
        
        # 보안: upload_path.parent 밖의 파일 접근 방지
        upload_parent_resolved = str(settings.upload_path.parent.resolve())
        full_path_resolved = str(full_path.resolve())
        
        if settings.DEBUG:
            print(f"🔒 보안 검증:")
            print(f"   upload_parent: {upload_parent_resolved}")
            print(f"   full_path: {full_path_resolved}")
            print(f"   시작 확인: {full_path_resolved.startswith(upload_parent_resolved)}")
        
        if not full_path_resolved.startswith(upload_parent_resolved):
            if settings.DEBUG:
                print(f"❌ 보안 검증 실패: 경로가 허용된 디렉토리 밖입니다")
            raise HTTPException(status_code=403, detail="접근이 거부되었습니다.")
        
        if not full_path.exists():
            # 디버깅 정보 포함
            error_detail = f"파일을 찾을 수 없습니다: {file_path}"
            if settings.DEBUG:
                error_detail += f" (전체 경로: {full_path})"
            raise HTTPException(status_code=404, detail=error_detail)
        
        # MIME 타입 감지
        mime_type, _ = mimetypes.guess_type(str(full_path))
        if not mime_type:
            # 이미지 파일인 경우 기본값 설정
            if str(full_path).lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')):
                mime_type = f"image/{full_path.suffix[1:].lower()}"
                if mime_type == "image/jpg":
                    mime_type = "image/jpeg"
            else:
                mime_type = "application/octet-stream"
        
        # 파일 읽기
        with open(full_path, "rb") as f:
            content = f.read()
        
        if settings.DEBUG:
            print(f"✅ 파일 읽기 완료: {len(content)} bytes")
            print(f"📄 MIME 타입: {mime_type}")
        
        # CORS 헤더 포함하여 응답
        response = Response(
            content=content,
            media_type=mime_type,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "*",
                "Cache-Control": "public, max-age=3600",
            }
        )
        
        if settings.DEBUG:
            print(f"✅ 응답 생성 완료")
        
        return response
    
    except HTTPException:
        raise
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=500,
            detail=f"파일 조회 중 오류가 발생했습니다: {str(e)}"
        )

# OPTIONS 요청 처리 (CORS preflight)
@app.options("/data/{file_path:path}")
async def options_static_file(file_path: str):
    """CORS preflight 요청 처리"""
    return Response(
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    )

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
