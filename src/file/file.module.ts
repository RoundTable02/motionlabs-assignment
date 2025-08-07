import { Module } from '@nestjs/common';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patient } from './patient.entity';
import { DataValidationService } from './data-validation.service';
import { PatientService } from './patient.service';
import { ExcelParsingService } from './excel-parsing.service';
import { SharedMapService } from './shared-map.service';

@Module({
  imports: [TypeOrmModule.forFeature([Patient])],
  controllers: [FileController],
  providers: [
    FileService,
    DataValidationService,
    PatientService,
    ExcelParsingService,
    SharedMapService,
  ],
})
export class FileModule {}
