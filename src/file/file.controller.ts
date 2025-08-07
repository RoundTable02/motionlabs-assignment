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
import { PatientQueryDto } from './upload.dto';

@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('/upload')
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
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('파일이 업로드되지 않았습니다.');
    }

    try {
      const result = await this.fileService.processUpload(file.path);
      return {
        message: '파일 업로드 및 처리가 완료되었습니다.',
        data: result,
      };
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : '파일 처리 중 오류가 발생했습니다.',
      );
    }
  }

  @Get('/patients')
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
