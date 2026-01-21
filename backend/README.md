# 카드 생성기 Backend API

FastAPI 기반의 카드 생성기 백엔드 서버입니다.

## 기술 스택

- **Python**: 3.13+
- **FastAPI**: 웹 프레임워크
- **Uvicorn**: ASGI 서버
- **SQLAlchemy**: ORM (Object-Relational Mapping)
- **SQLite**: 데이터베이스
- **uv**: 패키지 관리자

## 설치 및 실행

### 1. uv 설치 확인

```bash
# uv가 설치되어 있지 않다면 설치
# Windows (PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### 2. 의존성 설치

```bash
cd backend
uv sync
```

### 3. 환경변수 설정

`.env.example` 파일을 복사하여 `.env` 파일을 생성하고 필요한 값들을 수정하세요:

```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# Linux/Mac
cp .env.example .env
```

`.env` 파일에서 다음 설정을 변경할 수 있습니다:

- **APP_NAME**: 애플리케이션 이름
- **HOST**: 서버 호스트 (기본: 0.0.0.0)
- **PORT**: 서버 포트 (기본: 8000)
- **DEBUG**: 디버그 모드 (기본: true)
- **CORS_ORIGINS**: CORS 허용 오리진 (쉼표로 구분)
- **DATABASE_DIR**: 데이터베이스 디렉토리 (기본: data/database)
- **DATABASE_NAME**: 데이터베이스 파일명 (기본: cards.db)
- **UPLOAD_DIR**: 업로드 디렉토리 (기본: data/upload)
- **MAX_UPLOAD_SIZE**: 최대 업로드 파일 크기 (바이트, 기본: 10485760 = 10MB)
- **ALLOWED_EXTENSIONS**: 허용된 파일 확장자 (쉼표로 구분)

### 4. 서버 실행

```bash
# 개발 모드 (자동 리로드)
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 또는 직접 실행
uv run python main.py
```

서버가 실행되면 다음 주소에서 접근할 수 있습니다:
- API 문서: http://localhost:8000/docs
- 대체 문서: http://localhost:8000/redoc
- API 루트: http://localhost:8000

## API 엔드포인트

### GET `/`
루트 엔드포인트 - 서버 상태 확인

### GET `/health`
헬스 체크 엔드포인트

### POST `/api/v1/cards/generate`
카드 생성 요청

**Request Body:**
```json
{
  "cardData": {
    "cardName": "카드명",
    "type": "타입",
    "attribute": "속성",
    "rarity": "등급",
    "attack": "100",
    "health": "200",
    "skill1Name": "스킬명",
    "skill1Description": "효과 설명",
    "skill2Name": "스킬명",
    "skill2Description": "효과 설명",
    "flavorText": "플레이버 텍스트",
    "cardNumber": "#001",
    "series": "시리즈명"
  },
  "characterImageUrl": "이미지 URL (선택)",
  "backgroundImageUrl": "이미지 URL (선택)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "카드 생성 요청이 성공적으로 처리되었습니다.",
  "prompt": "생성된 프롬프트 텍스트",
  "imageUrl": null
}
```

## 개발 가이드

### 프로젝트 구조

```
backend/
├── app/                    # 애플리케이션 메인 코드
│   ├── __init__.py
│   ├── api/                # API 라우터
│   │   ├── __init__.py
│   │   └── routes/         # 각 도메인별 라우터
│   │       ├── __init__.py
│   │       └── cards.py     # 카드 관련 API
│   ├── core/               # 핵심 설정 및 유틸리티
│   │   ├── __init__.py
│   │   ├── config.py        # 애플리케이션 설정
│   │   └── cors.py          # CORS 설정
│   ├── schemas/             # Pydantic 스키마
│   │   ├── __init__.py
│   │   └── card.py          # 카드 관련 스키마
│   ├── services/            # 비즈니스 로직
│   │   ├── __init__.py
│   │   └── card_service.py  # 카드 생성 서비스
│   ├── database/            # 데이터베이스 레이어
│   │   ├── __init__.py
│   │   ├── database.py      # 데이터베이스 연결 및 세션 관리
│   │   └── models.py        # SQLAlchemy 모델 정의
│   └── utils/               # 유틸리티 함수
│       └── __init__.py
├── main.py                  # 애플리케이션 진입점
├── pyproject.toml           # 프로젝트 설정 및 의존성
├── uv.lock                  # 의존성 잠금 파일
├── .gitignore              # Git 무시 파일
└── README.md                # 프로젝트 문서
```

### 아키텍처 설명

프로젝트는 **계층형 아키텍처(Layered Architecture)**를 따릅니다:

1. **API Layer** (`app/api/`)
   - HTTP 요청/응답 처리
   - 라우터 정의 및 엔드포인트 관리
   - 요청 검증 및 에러 핸들링

2. **Service Layer** (`app/services/`)
   - 비즈니스 로직 구현
   - 도메인별 서비스 클래스
   - 프롬프트 생성, 데이터 검증 등

3. **Schema Layer** (`app/schemas/`)
   - Pydantic 모델 정의
   - 요청/응답 데이터 구조
   - 데이터 유효성 검증

4. **Core Layer** (`app/core/`)
   - 애플리케이션 설정 관리
   - CORS, 미들웨어 설정
   - 전역 설정 및 상수

5. **Database Layer** (`app/database/`)
   - 데이터베이스 연결 및 세션 관리
   - SQLAlchemy 모델 정의
   - 테이블 초기화 및 마이그레이션

6. **Utils Layer** (`app/utils/`)
   - 공통 유틸리티 함수
   - 헬퍼 함수들

### 의존성 추가

```bash
uv add 패키지명
```

### 의존성 제거

```bash
uv remove 패키지명
```

## 데이터베이스

### 데이터베이스 위치
- **경로**: `data/database/cards.db`
- **타입**: SQLite

### 테이블 구조

#### `cards` 테이블
카드 정보를 저장하는 메인 테이블입니다.

**주요 필드:**
- `id`: 카드 고유 ID (Primary Key)
- `card_name`: 카드명
- `type`: 카드 타입
- `attribute`: 카드 속성
- `rarity`: 카드 등급
- `attack`: 공격력
- `health`: 체력
- `skill1_name`, `skill1_description`: 스킬 1 정보
- `skill2_name`, `skill2_description`: 스킬 2 정보
- `flavor_text`: 플레이버 텍스트
- `card_number`: 카드 번호
- `series`: 시리즈/제작자 정보
- `character_image_url`: 캐릭터 이미지 URL
- `background_image_url`: 배경 이미지 URL
- `generated_prompt`: 생성된 프롬프트
- `generated_image_url`: 생성된 이미지 URL
- `created_at`: 생성일시
- `updated_at`: 수정일시

#### `card_generation_history` 테이블
카드 생성 히스토리를 저장하는 테이블입니다.

**주요 필드:**
- `id`: 히스토리 고유 ID (Primary Key)
- `card_id`: 카드 ID (Foreign Key)
- `request_data`: 요청 데이터 (JSON)
- `prompt`: 생성된 프롬프트
- `image_url`: 생성된 이미지 URL
- `success`: 성공 여부 (1: 성공, 0: 실패)
- `error_message`: 에러 메시지
- `created_at`: 생성일시

### 테이블 초기화

서버 시작 시 자동으로 테이블이 생성됩니다. 수동으로 초기화하려면:

```bash
uv run python -c "from app.database import init_db; init_db()"
```

## 파일 업로드

### 업로드 디렉토리
- **경로**: `data/upload/`
- 서버 시작 시 자동 생성됩니다.

### 파일 업로드 API

#### POST `/api/v1/upload/single`
단일 파일 업로드

**파라미터:**
- `file`: 업로드할 파일 (multipart/form-data)
- `subdirectory`: 서브디렉토리 (선택, 예: "cards", "characters")

**응답:**
```json
{
  "success": true,
  "message": "파일이 성공적으로 업로드되었습니다.",
  "file_url": "/data/upload/cards/uuid-filename.jpg",
  "filename": "uuid-filename.jpg"
}
```

#### POST `/api/v1/upload/multiple`
다중 파일 업로드

**파라미터:**
- `files`: 업로드할 파일 목록 (multipart/form-data)
- `subdirectory`: 서브디렉토리 (선택)

**응답:**
```json
{
  "success": true,
  "message": "2개 파일이 업로드되었습니다.",
  "files": [
    {
      "filename": "original.jpg",
      "saved_filename": "uuid-filename.jpg",
      "file_url": "/data/upload/uuid-filename.jpg",
      "success": true
    }
  ]
}
```

#### GET `/api/v1/upload/file/{file_path}`
업로드된 파일 조회/다운로드

**예시:**
- `/api/v1/upload/file/cards/image.jpg`
- `/api/v1/upload/file/characters/char1.png`

#### DELETE `/api/v1/upload/file/{file_path}`
업로드된 파일 삭제

### 파일 제한사항
- **허용된 확장자**: jpg, jpeg, png, gif, webp, svg
- **최대 파일 크기**: 10MB
- **파일명**: UUID 기반 고유 파일명으로 자동 변환

### 정적 파일 서빙
업로드된 파일은 `/data/upload/{file_path}` 경로로 직접 접근할 수 있습니다.

예: `http://localhost:8000/data/upload/cards/image.jpg`

## 향후 계획

- [x] 카드 데이터베이스 저장
- [x] 카드 생성 히스토리 관리
- [x] 이미지 업로드 및 저장 기능
- [ ] AI 이미지 생성 API 통합
- [ ] 사용자 인증 및 권한 관리
- [ ] 카드 조회/수정/삭제 API 추가
