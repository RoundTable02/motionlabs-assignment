import http from 'k6/http';
import { check, sleep } from 'k6';
import { FormData } from 'https://jslib.k6.io/formdata/0.0.2/index.js';

// 파일 데이터를 초기화 단계에서 읽어오기
const patientDataFile = open('./patient_data.xlsx', 'b');

// 테스트 시나리오 설정
export const options = {
  scenarios:
    __ENV.K6_SCENARIO === 'upload_test'
      ? {
          // 파일 업로드 테스트만
          upload_test: {
            executor: 'constant-vus',
            vus: 2,
            duration: '2m',
            tags: { test_type: 'upload' },
          },
        }
      : __ENV.K6_SCENARIO === 'patients_list_test'
        ? {
            // 환자 목록 조회 테스트만
            patients_list_test: {
              executor: 'ramping-vus',
              startVUs: 10,
              stages: [
                { duration: '1m', target: 50 },
                { duration: '3m', target: 50 },
                { duration: '1m', target: 100 },
                { duration: '2m', target: 100 },
                { duration: '1m', target: 0 },
              ],
              tags: { test_type: 'patients_query' },
            },
          }
        : {
            // 혼합 테스트 (기본)
            upload_test: {
              executor: 'constant-vus',
              vus: 5,
              duration: '2m',
              tags: { test_type: 'upload' },
            },
            patients_list_test: {
              executor: 'ramping-vus',
              startVUs: 10,
              stages: [
                { duration: '1m', target: 50 },
                { duration: '3m', target: 50 },
                { duration: '1m', target: 100 },
                { duration: '2m', target: 100 },
                { duration: '1m', target: 0 },
              ],
              tags: { test_type: 'patients_query' },
            },
          },

  thresholds: {
    // 전체 응답 시간 임계값
    http_req_duration: ['p(95)<2000'], // 95%의 요청이 2초 이내
    'http_req_duration{test_type:upload}': ['p(95)<5000'], // 업로드는 5초 이내
    'http_req_duration{test_type:patients_query}': ['p(95)<1000'], // 조회는 1초 이내

    // 성공률 임계값
    http_req_failed: ['rate<0.1'], // 실패율 10% 미만
    'http_req_failed{test_type:upload}': ['rate<0.05'], // 업로드 실패율 5% 미만
    'http_req_failed{test_type:patients_query}': ['rate<0.02'], // 조회 실패율 2% 미만
  },
};

const BASE_URL = 'http://localhost:3000';

// 파일 업로드 테스트 함수
export function uploadTest() {
  const formData = new FormData();
  formData.append(
    'file',
    http.file(
      patientDataFile,
      'patient_data.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ),
  );

  const uploadResponse = http.post(`${BASE_URL}/file/upload`, formData.body(), {
    headers: {
      'Content-Type': 'multipart/form-data; boundary=' + formData.boundary,
    },
    tags: { test_type: 'upload' },
  });

  check(uploadResponse, {
    '업로드 응답 상태가 201': (r) => r.status === 201,
    '업로드 응답에 totalRows 포함': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('totalRows');
      } catch {
        return false;
      }
    },
    '업로드 응답에 processedRows 포함': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('processedRows');
      } catch {
        return false;
      }
    },
    '업로드 응답 시간 < 10초': (r) => r.timings.duration < 10000,
  });

  // 업로드 후 잠시 대기
  sleep(1);
}

// 환자 목록 조회 테스트 함수
export function patientsQueryTest() {
  // 다양한 검색 파라미터로 테스트
  const searchParams = [
    '', // 전체 조회
    '?page=1&limit=10', // 기본 페이징
    '?name=' + encodeURIComponent('이예원'), // 한글 인코딩
    '?phone=01018556059', // 전화번호 검색
    '?chart=476989', // 차트번호 검색
    '?page=1&limit=5&name=' +
      encodeURIComponent('이은지') +
      '&phone=01058807957', // 복합 검색 (한글 인코딩)
  ];

  const randomParam =
    searchParams[Math.floor(Math.random() * searchParams.length)];

  const queryResponse = http.get(`${BASE_URL}/file/patients${randomParam}`, {
    tags: { test_type: 'patients_query' },
  });

  check(queryResponse, {
    '조회 응답 상태가 200': (r) => r.status === 200,
    '조회 응답에 total 포함': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('total');
      } catch {
        return false;
      }
    },
    '조회 응답에 data 배열 포함': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.data);
      } catch {
        return false;
      }
    },
    '조회 응답 시간 < 2초': (r) => r.timings.duration < 2000,
  });

  // 요청 간 간격
  sleep(0.5);
}

// 기본 실행 함수
export default function () {
  // 현재 시나리오에 따라 다른 테스트 실행
  if (__ENV.K6_SCENARIO === 'upload_test') {
    uploadTest();
  } else if (__ENV.K6_SCENARIO === 'patients_list_test') {
    patientsQueryTest();
  } else {
    // 혼합 테스트 (기본)
    const testType = Math.random();
    if (testType < 0.2) {
      // 20% 확률로 업로드 테스트
      uploadTest();
    } else {
      // 80% 확률로 조회 테스트
      patientsQueryTest();
    }
  }
}

// 테스트 시작 전 설정
export function setup() {
  console.log('🚀 FileController 성능 테스트 시작');
  console.log(`📊 테스트 대상: ${BASE_URL}`);

  // 서버 상태 확인
  const healthCheck = http.get(`${BASE_URL}/`);
  if (healthCheck.status !== 200) {
    console.error(
      '❌ 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.',
    );
    return;
  }

  console.log('✅ 서버 연결 확인됨');
  return { baseUrl: BASE_URL };
}

// 테스트 종료 후 정리
export function teardown(data) {
  console.log('🏁 FileController 성능 테스트 완료');
  console.log('📈 상세 결과는 k6 리포트를 확인하세요.');
}
