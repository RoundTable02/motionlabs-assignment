-- MySQL 초기화 스크립트
-- Docker 컨테이너 시작 시 자동으로 실행됩니다

-- 사용자 권한 설정 (이미 docker-compose.yml에서 생성되지만 추가 보장)
GRANT ALL PRIVILEGES ON motionlabs.* TO 'motionlabs'@'%';
FLUSH PRIVILEGES;

-- 테이블 생성은 TypeORM이 자동으로 처리하므로 별도 스키마 정의 불필요
-- (synchronize: true 설정으로 인해)