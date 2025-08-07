import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import {
  UploadResponseDto,
  PatientQueryDto,
  PatientListResponseDto,
} from './upload.dto';
import { DataValidationService } from './data-validation.service';
import { PatientService } from './patient.service';
import { ExcelParsingService } from './excel-parsing.service';
import { SharedMapService } from 'src/file/shared-map.service';
import { Patient } from './patient.entity';

@Injectable()
export class FileService {
  constructor(
    private readonly excelParsingService: ExcelParsingService,
    private readonly dataValidationService: DataValidationService,
    private readonly patientService: PatientService,
    private readonly sharedMapService: SharedMapService,
  ) {}

  async processUpload(filePath: string): Promise<UploadResponseDto> {
    const time = Date.now();
    try {
      const allMaps = await this.sharedMapService.getAll();
      const totalEntries = Array.from(allMaps.values()).reduce(
        (acc, map) => acc + map.size,
        0,
      );
      Logger.log(
        `처리 시작 - SharedMap 키 개수: ${allMaps.size}, 총 환자 데이터: ${totalEntries}`,
        'FileService',
      );

      const jsonData = this.excelParsingService.parse(filePath);
      const totalRows = jsonData.length;

      const { validEntities, skippedRows } =
        this.dataValidationService.validateAndTransform(jsonData, filePath);

      const toUpdateMap: Map<string, Patient> = new Map();
      const toInsertMap: Map<string, Patient[]> = new Map();
      const toDeleteMap: Map<string, Patient> = new Map();

      const excelDataMap = new Map<string, Map<string, Patient>>();

      for (const entity of validEntities) {
        Logger.log(
          `처리 중 - 이름: ${entity.name}, 전화번호: ${entity.phone}, 차트: ${entity.chart}`,
          'FileService',
        );
        const key = entity.name + '|' + entity.phone;
        if (excelDataMap.has(key)) {
          // 이전 행 중에 같은 이름과 전화번호가 있는 경우
          const dataMap = excelDataMap.get(key) as Map<string, Patient>;
          if (dataMap.has(entity.chart)) {
            // 이름과 전화번호가 같고 동일한 차트 명이 있는 경우
            const existingPatient = dataMap.get(entity.chart) as Patient;
            const newEntity: Patient = {
              ...existingPatient,
              name: entity.name || existingPatient.name,
              phone: entity.phone || existingPatient.phone,
              chart: entity.chart || existingPatient.chart,
              rrm: entity.rrm || existingPatient.rrm,
              address: entity.address || existingPatient.address,
              memo: entity.memo || existingPatient.memo,
              rowNum: entity.rowNum,
              fileName: existingPatient.fileName,
            };
            dataMap.set(newEntity.chart, newEntity);
            excelDataMap.set(key, dataMap);
            Logger.log(
              `이름과 전화번호가 같고 동일한 차트 명이 있는 경우: ${newEntity.name}, ${newEntity.phone}, ${newEntity.chart}`,
              'FileService',
            );
          } else {
            // 이름과 전화번호가 같지만 동일한 차트 명이 없는 경우
            if (dataMap.has('')) {
              // 기존 null & 현재 chart => 병합, delete, insert
              const existingPatient = dataMap.get('') as Patient;

              dataMap.delete(existingPatient.chart);

              const newEntity: Patient = {
                ...existingPatient,
                name: entity.name || existingPatient.name,
                phone: entity.phone || existingPatient.phone,
                chart: entity.chart || existingPatient.chart,
                rrm: entity.rrm || existingPatient.rrm,
                address: entity.address || existingPatient.address,
                memo: entity.memo || existingPatient.memo,
                rowNum: entity.rowNum,
                fileName: existingPatient.fileName,
              };
              dataMap.set(newEntity.chart, newEntity);
              excelDataMap.set(key, dataMap);
              Logger.log(
                `이름과 전화번호가 같지만 차트 명이 다른 경우 (기존 null, 현재 chart): ${newEntity.name}, ${newEntity.phone}, ${newEntity.chart}`,
                'FileService',
              );
            } else {
              // 이름과 전화번호가 같지만 차트 명이 다른 경우
              if (!entity.chart) {
                // 기존 chart & 현재 null => 가장 최근 pop, 병합, update
                const valuesArray = [...dataMap.values()];
                const existingPatient = valuesArray.pop() as Patient;

                const newEntity: Patient = {
                  ...existingPatient,
                  name: entity.name || existingPatient.name,
                  phone: entity.phone || existingPatient.phone,
                  chart: existingPatient.chart, // 기존 차트로 병합
                  rrm: entity.rrm || existingPatient.rrm,
                  address: entity.address || existingPatient.address,
                  memo: entity.memo || existingPatient.memo,
                  rowNum: entity.rowNum,
                  fileName: existingPatient.fileName,
                };
                dataMap.set(newEntity.chart, newEntity);
                excelDataMap.set(key, dataMap);
                Logger.log(
                  `이름과 전화번호가 같지만 차트 명이 없는 경우 (기존 chart, 현재 null): ${newEntity.name}, ${newEntity.phone}, ${newEntity.chart}`,
                  'FileService',
                );
              } else {
                // 이름과 전화번호가 같지만 차트 명이 다른 경우
                // 기존 chart1 & 현재 chart2 => insert
                Logger.log(
                  `이름과 전화번호가 같지만 차트 명이 다른 경우 (기존 chart1, 현재 chart2): ${entity.name}, ${entity.phone}, ${entity.chart}`,
                  'FileService',
                );
                dataMap.set(entity.chart, entity);
                Logger.log(
                  `새로운 차트 명이 추가됨: ${entity.chart}, ${dataMap.size}개의 차트 명`,
                  'FileService',
                );
                excelDataMap.set(key, dataMap);
              }
            }
          }
        } else {
          // 이전 행 중에 같은 이름과 전화번호가 없는 경우
          Logger.log(
            `이름과 전화번호가 같은 환자 데이터가 없는 경우: ${entity.name}, ${entity.phone}`,
            'FileService',
          );
          const newMap = new Map<string, Patient>();
          newMap.set(entity.chart, entity);
          excelDataMap.set(key, newMap);
        }
      }

      const elapsedTime = Date.now() - time;
      Logger.log(
        `데이터 처리 완료 - 유효한 행: ${validEntities.length}, 건너뛴 행: ${skippedRows}, 소요 시간: ${elapsedTime}ms`,
        'FileService',
      );

      Logger.log(
        `SharedMap에 저장된 환자 데이터 처리 시작 - 총 ${excelDataMap.size} 키`,
        'FileService',
      );

      const processedData: Patient[] = Array.from(
        excelDataMap.values(),
      ).flatMap((map) => Array.from(map.values()));

      for (const patient of processedData) {
        const key = patient.name + '|' + patient.phone;
        if (await this.sharedMapService.has(key)) {
          // 이름과 전화번호가 같은 환자 데이터가 이미 존재하는 경우
          const existingMap = (await this.sharedMapService.get(key)) as Map<
            string,
            Patient
          >;
          if (existingMap.has(patient.chart)) {
            // 이름과 전화번호가 같고 동일한 차트 명이 있는 경우
            const existingPatient = existingMap.get(patient.chart) as Patient;
            const checkChange =
              existingPatient.rrm !== patient.rrm ||
              existingPatient.address !== patient.address ||
              existingPatient.memo !== patient.memo;
            if (checkChange) {
              const newEntity: Patient = {
                ...existingPatient,
                name: patient.name || existingPatient.name,
                phone: patient.phone || existingPatient.phone,
                chart: patient.chart || existingPatient.chart,
                rrm: patient.rrm || existingPatient.rrm,
                address: patient.address || existingPatient.address,
                memo: patient.memo || existingPatient.memo,
                rowNum: patient.rowNum,
                fileName: patient.fileName,
              };
              toUpdateMap.set(key, newEntity);
              await this.sharedMapService.set(
                key,
                existingMap.set(patient.chart, newEntity),
              );
            }
          } else {
            // 이름과 전화번호가 같지만 동일한 차트 명이 없는 경우
            if (patient.chart) {
              if (existingMap.has('')) {
                // 기존 null & 현재 chart => 병합, delete, insert
                const existingPatient = existingMap.get('') as Patient;
                const newEntity: Patient = {
                  ...existingPatient,
                  name: patient.name || existingPatient.name,
                  phone: patient.phone || existingPatient.phone,
                  chart: existingPatient.chart,
                  rrm: patient.rrm || existingPatient.rrm,
                  address: patient.address || existingPatient.address,
                  memo: patient.memo || existingPatient.memo,
                  rowNum: patient.rowNum,
                  fileName: patient.fileName,
                };
                toDeleteMap.set(key, newEntity);
                existingMap.delete('');
                existingMap.set(patient.chart, newEntity);
              } else {
                // 기존 chart1 & 현재 chart2 => insert
                // 이름과 전화번호가 같지만 차트 명이 다른 경우
                if (toInsertMap.has(key)) toInsertMap.get(key)?.push(patient);
                else toInsertMap.set(key, [patient]);
                existingMap.set(patient.chart, patient);
              }
            } else {
              // 기존 chart & 현재 null => 가장 최근 pop, 병합, update
              // 이름과 전화번호가 같은 데이터 중 가장 최근의 데이터를 가져옴
              const valuesArray = [...existingMap.values()];
              const existingPatient = valuesArray.pop() as Patient;
              const newEntity: Patient = {
                ...existingPatient,
                name: patient.name || existingPatient.name,
                phone: patient.phone || existingPatient.phone,
                chart: patient.chart || existingPatient.chart,
                rrm: patient.rrm || existingPatient.rrm,
                address: patient.address || existingPatient.address,
                memo: patient.memo || existingPatient.memo,
                rowNum: patient.rowNum,
                fileName: patient.fileName,
              };
              toUpdateMap.set(key, newEntity);
              existingMap.set(newEntity.chart, newEntity);
            }

            await this.sharedMapService.set(key, existingMap);
          }
        } else {
          await this.sharedMapService.set(
            key,
            new Map([[patient.chart, patient]]),
          );
          toInsertMap.set(key, [patient]);
        }
      }

      await this.patientService.updatePatients(
        Array.from(toUpdateMap.values()),
      );
      await this.patientService.insertPatients(
        Array.from(toInsertMap.values()).flat(),
      );
      await this.patientService.deletePatients(
        Array.from(toDeleteMap.values()),
      );

      return {
        totalRows,
        processedRows: totalRows - skippedRows,
        skippedRows,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `Excel 파일 처리 중 오류가 발생했습니다: ${errorMessage}`,
      );
    } finally {
      Logger.log(`총 소요 시간: ${Date.now() - time}ms`, 'FileService');
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }

  async findPatients(query: PatientQueryDto): Promise<PatientListResponseDto> {
    return this.patientService.findPatients(query);
  }
}
