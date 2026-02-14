# 프론트엔드 (Next.js) Dockerfile
FROM node:20-alpine

WORKDIR /app

# package.json, package-lock.json 복사 후 의존성 설치
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

# 소스 복사
COPY frontend/ ./

EXPOSE 3000

# 개발 서버 실행 (0.0.0.0 바인딩으로 컨테이너 외부 접근)
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]
