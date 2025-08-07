import { Injectable } from '@nestjs/common';
import { Mutex } from 'async-mutex';
import { Patient } from './patient.entity';

@Injectable()
export class SharedMapService {
  private existingPatientsMap = new Map<string, Map<string, Patient>>();
  private mutex = new Mutex();

  async get(key: string): Promise<Map<string, Patient> | undefined> {
    const release = await this.mutex.acquire();
    try {
      return this.existingPatientsMap.get(key);
    } finally {
      release();
    }
  }

  async getAll(): Promise<Map<string, Map<string, Patient>>> {
    const release = await this.mutex.acquire();
    try {
      return this.existingPatientsMap;
    } finally {
      release();
    }
  }

  async set(key: string, value: Map<string, Patient>): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      this.existingPatientsMap.set(key, value);
    } finally {
      release();
    }
  }

  async has(key: string): Promise<boolean> {
    const release = await this.mutex.acquire();
    try {
      return this.existingPatientsMap.has(key);
    } finally {
      release();
    }
  }

  async delete(key: string): Promise<boolean> {
    const release = await this.mutex.acquire();
    try {
      return this.existingPatientsMap.delete(key);
    } finally {
      release();
    }
  }

  async clear(): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      this.existingPatientsMap.clear();
    } finally {
      release();
    }
  }
}
