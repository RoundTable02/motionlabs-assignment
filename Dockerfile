# 멀티스테이지 빌드를 위한 Dockerfile

# Stage 1: Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# 패키지 파일들 복사
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# 모든 의존성 설치 (개발 의존성 포함)
RUN npm ci && npm cache clean --force

# 소스 코드 복사
COPY src/ ./src/
COPY worker.ts ./

# 애플리케이션 빌드
RUN npm run build

# Stage 2: Production stage
FROM node:18-alpine AS production

# 필요한 시스템 패키지 설치 (SQLite, MySQL 클라이언트 등)
RUN apk add --no-cache sqlite mysql-client

WORKDIR /app

# 프로덕션 의존성만 설치
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 빌드된 애플리케이션 복사
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/worker.ts ./

# ts-node와 typescript 설치 (worker.ts 실행을 위해)
RUN npm install -g ts-node typescript

# 필요한 디렉토리 생성
RUN mkdir -p uploads

# 포트 노출
EXPOSE 3000

# 기본 명령어 (main app) - 올바른 경로로 수정
CMD ["node", "dist/src/main.js"]