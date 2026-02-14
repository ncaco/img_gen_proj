# 백엔드 (FastAPI) Dockerfile
FROM python:3.13-slim

WORKDIR /app

# uv 설치
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# 의존성 먼저 복사 (캐시 활용)
COPY backend/pyproject.toml backend/uv.lock ./

# 의존성 설치 (시스템 패키지 제외)
RUN uv sync --frozen --no-install-project --no-dev

# 애플리케이션 코드 복사
COPY backend/ ./

# 프로젝트 설치
RUN uv sync --frozen --no-dev

# data 디렉토리 생성 (볼륨 마운트 시 사용)
RUN mkdir -p /app/data/database /app/data/upload

ENV PYTHONUNBUFFERED=1
ENV DATABASE_DIR=data/database
ENV UPLOAD_DIR=data/upload

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
