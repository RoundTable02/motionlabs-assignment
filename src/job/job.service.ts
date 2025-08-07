import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as Database from 'better-sqlite3';

@Injectable()
export class JobService implements OnModuleInit {
  private db: Database.Database;
  private readonly logger = new Logger(JobService.name);

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

  addJob(filePath: string): Database.RunResult {
    const stmt = this.db.prepare('INSERT INTO jobs (filePath) VALUES (?)');
    const result = stmt.run(filePath);
    this.logger.log(
      `New job added with ID: ${result.lastInsertRowid} for file: ${filePath}`,
    );
    return result;
  }
}
