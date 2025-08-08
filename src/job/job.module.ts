import { Module } from '@nestjs/common';
import { JobService } from './job.service';
import { ExcelParsingService } from 'src/file/excel-parsing.service';
import { DataValidationService } from 'src/file/data-validation.service';

@Module({
  providers: [JobService, ExcelParsingService, DataValidationService],
  exports: [JobService],
})
export class JobModule {}
