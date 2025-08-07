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
    const caseClauses = fields
      .map((field) => {
        const cases = toUpdateList
          .map(() => `WHEN name = ? AND phone = ? AND chart = ? THEN ?`)
          .join(' ');
        return `${field} = CASE ${cases} ELSE ${field} END`;
      })
      .join(', ');

    const whereConditions = toUpdateList
      .map(() => `(name = ? AND phone = ? AND chart = ?)`)
      .join(' OR ');

    const params = fields
      .flatMap((field) =>
        toUpdateList.flatMap((u) => [u.name, u.phone, u.chart, u[field]]),
      )
      .concat(toUpdateList.flatMap((u) => [u.name, u.phone, u.chart]));

    const query = `UPDATE patient SET ${caseClauses} WHERE ${whereConditions}`;

    await this.patientRepository.query(query, params);
  }

  async insertPatients(toInsertList: Patient[]): Promise<void> {
    if (!toInsertList || toInsertList.length === 0) {
      return;
    }
    Logger.log(`Inserting ${toInsertList.length} patients`, 'PatientService');
    await this.patientRepository.save(toInsertList, { chunk: 1000 });
  }

  async deletePatients(toDeleteList: Patient[]): Promise<void> {
    if (!toDeleteList || toDeleteList.length === 0) {
      return;
    }
    Logger.log(`Deleting ${toDeleteList.length} patients`, 'PatientService');

    const whereClauses = toDeleteList
      .map(() => '(name = ? AND phone = ?)')
      .join(' OR ');
    const params = toDeleteList.flatMap((p) => [p.name, p.phone]);

    const query = `DELETE FROM patient WHERE chart IS NULL AND (${whereClauses})`;

    await this.patientRepository.query(query, params);
  }
}
