import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindManyOptions, FindOptionsWhere } from 'typeorm';
import { Patient } from './patient.entity';
import { PatientQueryDto, PatientListResponseDto } from './upload.dto';

@Injectable()
export class PatientService {
  constructor(
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
  ) {}

  async findPatients(query: PatientQueryDto): Promise<PatientListResponseDto> {
    const { page = 1, limit = 10, name, phone, chart } = query;
    const skip = (page - 1) * limit;

    const whereConditions: FindOptionsWhere<Patient> = {};

    if (name) {
      whereConditions.name = Like(`%${name}%`);
    }

    if (phone) {
      whereConditions.phone = Like(`%${phone.replace(/-/g, '')}%`);
    }

    if (chart) {
      whereConditions.chart = Like(`%${chart}%`);
    }

    const findOptions: FindManyOptions<Patient> = {
      where: whereConditions,
      skip,
      take: limit,
      order: {
        id: 'DESC',
      },
    };

    const [patients, total] =
      await this.patientRepository.findAndCount(findOptions);

    return {
      total,
      page,
      count: patients.length,
      data: patients,
    };
  }

  async getAllPatients(): Promise<Patient[]> {
    return this.patientRepository.find();
  }

  async updatePatients(toUpdateList: Patient[]): Promise<void> {
    if (!toUpdateList || toUpdateList.length === 0) {
      return;
    }
    Logger.log(`Updating ${toUpdateList.length} patients`, 'PatientService');

    const fields = ['rrm', 'address', 'memo'] as const;

    for (const field of fields) {
      const recordsToUpdate = toUpdateList.filter(
        (u) => u[field] !== undefined && u[field] !== null,
      );

      if (recordsToUpdate.length === 0) continue;

      const caseClause = recordsToUpdate
        .map(() => `WHEN name = ? AND phone = ? AND chart = ? THEN ?`)
        .join(' ');

      const whereConditions = toUpdateList
        .map(() => `(name = ? AND phone = ? AND chart = ?)`)
        .join(' OR ');

      // 매개변수 순서: CASE 절의 조건과 값들, WHERE 절의 조건들
      const caseParams = recordsToUpdate.flatMap((u) => [
        u.name,
        u.phone,
        u.chart,
        u[field],
      ]);
      const whereParams = toUpdateList.flatMap((u) => [
        u.name,
        u.phone,
        u.chart,
      ]);

      const query = `UPDATE patient SET ${field} = CASE ${caseClause} ELSE ${field} END WHERE ${whereConditions}`;

      await this.patientRepository.query(query, [
        ...caseParams,
        ...whereParams,
      ]);
    }
  }

  async insertPatients(toInsertList: Patient[]): Promise<void> {
    Logger.log(`Inserting ${toInsertList.length} patients`, 'PatientService');
    await this.patientRepository.save(toInsertList, { chunk: 1000 });
  }

  async deletePatients(toDeleteList: Patient[]): Promise<void> {
    if (!toDeleteList || toDeleteList.length === 0) {
      return;
    }
    Logger.log(`Deleting ${toDeleteList.length} patients`, 'PatientService');

    // 매개변수를 사용하여 SQL 인젝션 방지
    const whereConditions = toDeleteList
      .map(() => `(name = ? AND phone = ? AND chart IS NULL)`)
      .join(' OR ');

    const params = toDeleteList.flatMap((patient) => [
      patient.name,
      patient.phone,
    ]);

    const query = `DELETE FROM patient WHERE ${whereConditions}`;

    await this.patientRepository.query(query, params);
  }
}
