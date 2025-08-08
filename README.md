# 환자 데이터 관리 서버

사용 스택 : nest.js | mysql | sqlite

## 실행 방법

### 환경 설정

1. 환경변수 파일 생성(.env)

2. `.env` 파일 설정:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=motionlabs
DB_PASSWORD=1234
DB_NAME=motionlabs
```

3. MySQL 데이터베이스 생성:

```sql
CREATE DATABASE motionlabs;
CREATE USER 'motionlabs'@'localhost' IDENTIFIED BY '1234';
GRANT ALL PRIVILEGES ON motionlabs.* TO 'motionlabs'@'localhost';
```

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run start:dev

# 워커 프로세스 실행 (별도 터미널)
npm run start:worker
```

파일 업로드의 경우, 빠른 응답 처리를 위해 worker 프로세스를 추가하였습니다.
worker 프로세스에서 sqlite를 통해 추가된 job을 감지하고, upload 과정을 진행합니다.

### API 문서

서버 실행 후 http://localhost:3000/api 에서 Swagger 문서를 확인할 수 있습니다.

## 벤치마크 테스트 결과

벤치마크 테스트는 k6를 통해 진행하였습니다.

### 업로드 테스트

**설정**: 2명 동시 사용자, 2분간 지속, patient_data.xlsx 파일 이용

█ THRESHOLDS

    http_req_duration
    ✓ 'p(95)<2000' p(95)=1.32s

      {test_type:patients_query}
      ✓ 'p(95)<1000' p(95)=0s

      {test_type:upload}
      ✓ 'p(95)<5000' p(95)=1.32s

    http_req_failed
    ✓ 'rate<0.1' rate=0.00%

      {test_type:patients_query}
      ✓ 'rate<0.02' rate=0.00%

      {test_type:upload}
      ✓ 'rate<0.05' rate=0.00%

█ TOTAL RESULTS

    checks_total.......................: 160     1.303935/s
    checks_succeeded...................: 100.00% 160 out of 160
    checks_failed......................: 0.00%   0 out of 160

    ✓ 업로드 응답 상태가 201
    ✓ 업로드 응답에 totalRows 포함
    ✓ 업로드 응답에 processedRows 포함
    ✓ 업로드 응답 시간 < 10초

    HTTP
    http_req_duration...........................................................: avg=1.16s min=6.45ms med=1.15s max=2.31s p(90)=1.28s p(95)=1.32s
      { expected_response:true }................................................: avg=1.16s min=6.45ms med=1.15s max=2.31s p(90)=1.28s p(95)=1.32s
      { test_type:patients_query }..............................................: avg=0s    min=0s     med=0s    max=0s    p(90)=0s    p(95)=0s
      { test_type:upload }......................................................: avg=1.19s min=1.01s  med=1.15s max=2.31s p(90)=1.28s p(95)=1.32s
    http_req_failed.............................................................: 0.00%  0 out of 41
      { test_type:patients_query }..............................................: 0.00%  0 out of 0
      { test_type:upload }......................................................: 0.00%  0 out of 40
    http_reqs...................................................................: 41     0.334133/s

    EXECUTION
    iteration_duration..........................................................: avg=6.1s  min=5.9s   med=6.08s max=7.22s p(90)=6.2s  p(95)=6.25s
    iterations..................................................................: 40     0.325984/s
    vus.........................................................................: 1      min=1       max=2
    vus_max.....................................................................: 2      min=2       max=2

    NETWORK
    data_received...............................................................: 12 kB  100 B/s
    data_sent...................................................................: 147 MB 1.2 MB/s

---

### 조회 테스트

**설정**: 10→100명 단계적 증가, 8분간 지속

█ TOTAL RESULTS

    checks_total.......................: 233796  486.869058/s
    checks_succeeded...................: 100.00% 233796 out of 233796
    checks_failed......................: 0.00%   0 out of 233796

    ✓ 조회 응답 상태가 200
    ✓ 조회 응답에 total 포함
    ✓ 조회 응답에 data 배열 포함
    ✓ 조회 응답 시간 < 2초

    HTTP
    http_req_duration...........................................................: avg=27.51ms min=518µs    med=31.55ms  max=199.34ms p(90)=48.17ms  p(95)=59.69ms
      { expected_response:true }................................................: avg=27.51ms min=518µs    med=31.55ms  max=199.34ms p(90)=48.17ms  p(95)=59.69ms
      { test_type:patients_query }..............................................: avg=27.51ms min=2.34ms   med=31.55ms  max=199.34ms p(90)=48.17ms  p(95)=59.69ms
      { test_type:upload }......................................................: avg=0s      min=0s       med=0s       max=0s       p(90)=0s       p(95)=0s
    http_req_failed.............................................................: 0.00%  0 out of 58450
      { test_type:patients_query }..............................................: 0.00%  0 out of 58449
      { test_type:upload }......................................................: 0.00%  0 out of 0
    http_reqs...................................................................: 58450  121.719347/s

    EXECUTION
    iteration_duration..........................................................: avg=528.6ms min=502.77ms med=532.41ms max=700.31ms p(90)=549.16ms p(95)=560.66ms
    iterations..................................................................: 58449  121.717265/s
    vus.........................................................................: 1      min=1          max=100
    vus_max.....................................................................: 100    min=100        max=100

    NETWORK
    data_received...............................................................: 97 MB  201 kB/s
    data_sent...................................................................: 7.0 MB 15 kB/s
