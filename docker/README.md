# Docker 실행

프론트엔드(Next.js)와 백엔드(FastAPI)를 Docker Compose로 한 번에 실행합니다.  
**개발 모드**: 소스를 볼륨으로 마운트해, 파일 수정 시 백엔드(uvicorn --reload)·프론트(Next.js hot reload)에 바로 반영됩니다.

## 요구 사항

- Docker 및 Docker Compose (v2 이상)

## 실행 방법

**프로젝트 루트**에서 실행하세요.

```powershell
# 백그라운드 실행
docker compose -f docker/docker-compose.yml up -d

# 로그 보면서 실행
docker compose -f docker/docker-compose.yml up
```

## 접속

- 프론트엔드: http://localhost:3000
- 백엔드 API: http://localhost:8000
- API 문서: http://localhost:8000/docs

## 중지

```powershell
docker compose -f docker/docker-compose.yml down
```

데이터(DB, 업로드 파일)는 `backend-data` 볼륨에 유지됩니다. 볼륨까지 삭제하려면:

```powershell
docker compose -f docker/docker-compose.yml down -v
```

## 환경 변수 (선택)

`docker/` 폴더에 `.env`를 두고 사용할 수 있습니다. 예시는 `docker/.env.example`을 참고하세요.

- `OPENAI_API_KEY`: OpenAI API 키 (필요 시)
- `JWT_SECRET`: 운영 시 변경 권장
- `CORS_ORIGINS`: CORS 허용 오리진 (기본: http://localhost:3000,http://127.0.0.1:3000)

백엔드 전용 설정은 `docker/.env` 또는 프로젝트 루트 `.env`에 두면 됩니다.
