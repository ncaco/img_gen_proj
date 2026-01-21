# 카드 생성기 Backend API

FastAPI 기반의 카드 생성기 백엔드 서버입니다.

## 기술 스택

- **Python**: 3.13+
- **FastAPI**: 웹 프레임워크
- **Uvicorn**: ASGI 서버
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

### 3. 서버 실행

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

### POST `/api/cards/generate`
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
├── main.py          # FastAPI 애플리케이션 메인 파일
├── pyproject.toml   # 프로젝트 설정 및 의존성
├── uv.lock         # 의존성 잠금 파일
└── README.md       # 프로젝트 문서
```

### 의존성 추가

```bash
uv add 패키지명
```

### 의존성 제거

```bash
uv remove 패키지명
```

## 향후 계획

- [ ] AI 이미지 생성 API 통합
- [ ] 이미지 업로드 및 저장 기능
- [ ] 카드 데이터베이스 저장
- [ ] 사용자 인증 및 권한 관리
- [ ] 카드 생성 히스토리 관리
