import {
  Controller,
  Post,
  Get,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { FileService } from './file.service';
import { JobService } from '../job/job.service';
import {
  PatientQueryDto,
  UploadResponseDto,
  PatientListResponseDto,
} from './upload.dto';
import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';

@ApiTags('파일 관리 API')
@Controller('file')
export class FileController {
  constructor(
    private readonly fileService: FileService,
    private readonly jobService: JobService,
  ) {}

  @Post('/upload')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: '엑셀 파일 업로드',
    description:
      '환자 데이터가 포함된 엑셀 파일을 업로드하여 처리 작업을 시작합니다. 파일은 즉시 파싱되어 유효성 검사를 거친 후 처리 통계를 반환합니다.',
  })
  @ApiBody({
    description: '업로드할 엑셀 파일',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '엑셀 파일 (.xlsx, .xls) - 최대 50MB',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: '파일 업로드 및 처리 성공',
    type: UploadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example: '파일이 업로드되지 않았습니다.',
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(xlsx|xls)$/)) {
          return cb(new Error('Excel 파일만 업로드 가능합니다!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('파일이 업로드되지 않았습니다.');
    }

    return this.jobService.addJob(file.path);
  }

  @Get('/patients')
  @ApiOperation({
    summary: '환자 목록 조회',
    description: '등록된 환자 목록을 페이지네이션과 검색 조건으로 조회합니다.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: '페이지 번호 (기본값: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '페이지당 항목 수 (기본값: 10)',
    example: 10,
  })
  @ApiQuery({
    name: 'name',
    required: false,
    type: String,
    description: '환자 이름으로 부분 검색',
    example: '김철수',
  })
  @ApiQuery({
    name: 'phone',
    required: false,
    type: String,
    description: '전화번호로 부분 검색 (하이픈 포함/미포함 모두 가능)',
    example: '010-1234-5678',
  })
  @ApiQuery({
    name: 'chart',
    required: false,
    type: String,
    description: '차트 번호로 부분 검색',
    example: 'C001',
  })
  @ApiResponse({
    status: 200,
    description: '환자 목록 조회 성공',
    type: PatientListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example: '환자 정보 조회 중 오류가 발생했습니다.',
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async getPatients(@Query() query: PatientQueryDto) {
    try {
      const result = await this.fileService.findPatients(query);
      return result;
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : '환자 정보 조회 중 오류가 발생했습니다.',
      );
    }
  }
}
