import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadResponseDto {
  @ApiProperty({
    description: '총 행 수',
    example: 100,
  })
  totalRows: number;

  @ApiProperty({
    description: '처리된 행 수',
    example: 95,
  })
  processedRows: number;

  @ApiProperty({
    description: '건너뛴 행 수',
    example: 5,
  })
  skippedRows: number;
}

export class PatientQueryDto {
  @ApiPropertyOptional({
    description: '페이지 번호',
    example: 1,
    default: 1,
  })
  page?: number = 1;

  @ApiPropertyOptional({
    description: '페이지당 항목 수',
    example: 10,
    default: 10,
  })
  limit?: number = 10;

  @ApiPropertyOptional({
    description: '환자 이름 (부분 검색)',
    example: '김철수',
  })
  name?: string;

  @ApiPropertyOptional({
    description: '전화번호 (부분 검색)',
    example: '010-1234-5678',
  })
  phone?: string;

  @ApiPropertyOptional({
    description: '차트 번호 (부분 검색)',
    example: 'C001',
  })
  chart?: string;
}

export class PatientListResponseDto {
  @ApiProperty({
    description: '총 환자 수',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: '현재 페이지',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: '현재 페이지의 항목 수',
    example: 10,
  })
  count: number;

  @ApiProperty({
    description: '환자 데이터 목록',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        name: { type: 'string', example: '김철수' },
        phone: { type: 'string', example: '01012345678' },
        chart: { type: 'string', example: 'C001' },
        rrm: { type: 'string', example: '900101-1' },
        address: { type: 'string', example: '서울시 강남구' },
        memo: { type: 'string', example: '특이사항 없음' },
        rowNum: { type: 'number', example: 2 },
        fileName: {
          type: 'string',
          example: 'uploads/aed339e7febb123b077aa42f3bfcebcc.xlsx',
        },
      },
    },
  })
  data: any[];
}
