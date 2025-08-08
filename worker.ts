import { DataSource } from 'typeorm';
import { Patient } from './src/file/patient.entity';
import { PatientService } from './src/file/patient.service';
import { FileService } from './src/file/file.service';
import { ExcelParsingService } from './src/file/excel-parsing.service';
import { DataValidationService } from './src/file/data-validation.service';
import { SharedMapService } from './src/file/shared-map.service';
import Database from 'better-sqlite3';
import * as dotenv from 'dotenv';

dotenv.config();

const db = new Database('jobs.sqlite');

async function initialize(): Promise<{ fileService: FileService }> {
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST,
    port: +(process.env.DB_PORT || 3306),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [Patient],
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('Data Source has been initialized!');

  const patientRepository = dataSource.getRepository(Patient);
  const patientService = new PatientService(patientRepository);
  const excelParsingService = new ExcelParsingService();
  const dataValidationService = new DataValidationService();
  const sharedMapService = SharedMapService.getInstance(); // 싱글톤 사용

  const fileService = new FileService(
    excelParsingService,
    dataValidationService,
    patientService,
    sharedMapService,
  );

  return { fileService };
}

async function processFile(
  fileService: FileService,
  filePath: string,
): Promise<string> {
  console.log(`Processing file: ${filePath}`);
  try {
    await fileService.processUpload(filePath);
    console.log(`Finished processing file: ${filePath}`);
    return 'completed';
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return 'failed';
  }
}

async function main() {
  const { fileService } = await initialize();
  console.log('Worker started. Waiting for jobs...');

  function fetchAndProcessJob() {
    const selectStmt = db.prepare(
      "SELECT id, filePath FROM jobs WHERE status = 'pending' ORDER BY id ASC LIMIT 1",
    );
    const updateStmt = db.prepare(
      "UPDATE jobs SET status = 'processing' WHERE id = ?",
    );

    const job = db.transaction(() => {
      const jobData = selectStmt.get() as
        | { id: number; filePath: string }
        | undefined;
      if (jobData) {
        updateStmt.run(jobData.id);
      }
      return jobData;
    })();

    if (job) {
      void processFile(fileService, job.filePath)
        .then((status) => {
          const stmt = db.prepare('UPDATE jobs SET status = ? WHERE id = ?');
          stmt.run(status, job.id);
          console.log(`Job ${job.id} finished with status: ${status}.`);
        })
        .catch((error) => {
          console.error(`Unexpected error processing job ${job.id}:`, error);
          const stmt = db.prepare('UPDATE jobs SET status = ? WHERE id = ?');
          stmt.run('failed', job.id);
        })
        .finally(() => {
          fetchAndProcessJob();
        });
    } else {
      setTimeout(fetchAndProcessJob, 5000);
    }
  }

  fetchAndProcessJob();
}

main().catch((err) => {
  console.error('Worker initialization failed:', err);
  process.exit(1);
});
