import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as Database from 'better-sqlite3';
import { DataValidationService } from 'src/file/data-validation.service';
import { ExcelParsingService } from 'src/file/excel-parsing.service';

@Injectable()
export class JobService implements OnModuleInit {
  private db: Database.Database;
  private readonly logger = new Logger(JobService.name);

  constructor(
    private readonly excelParsingService: ExcelParsingService,
    private readonly dataValidationService: DataValidationService,
  ) {}

  onModuleInit() {
    this.db = new Database.default('jobs.sqlite');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filePath TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    this.logger.log('Job database and table initialized.');
  }

  addJob(filePath: string) {
    const jsonData = this.excelParsingService.parse(filePath);
    const totalRows = jsonData.length;

    const skippedRows = jsonData.reduce(
      (count, row) =>
        count + (this.dataValidationService.isValidRow(row) ? 0 : 1),
      0,
    );
    const stmt = this.db.prepare('INSERT INTO jobs (filePath) VALUES (?)');
    const result = stmt.run(filePath);
    this.logger.log(
      `New job added with ID: ${result.lastInsertRowid} for file: ${filePath}`,
    );
    return {
      totalRows,
      processedRows: totalRows - skippedRows,
      skippedRows,
    };
  }
}
