import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { ExcelRowData } from './file.model';

@Injectable()
export class ExcelParsingService {
  parse(filePath: string): ExcelRowData[] {
    if (!fs.existsSync(filePath)) {
      throw new Error('파일을 찾을 수 없습니다.');
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('Excel 파일에 시트가 없습니다.');
    }

    const worksheet = workbook.Sheets[sheetName];
    const jsonData: ExcelRowData[] = XLSX.utils.sheet_to_json(worksheet);
    if (jsonData.length === 0) {
      throw new Error('Excel 파일에 데이터가 없습니다.');
    }

    return jsonData;
  }
}
