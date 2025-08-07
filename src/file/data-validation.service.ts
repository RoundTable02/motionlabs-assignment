import { Injectable } from '@nestjs/common';
import { ExcelRowData } from './file.model';
import { Patient } from './patient.entity';

@Injectable()
export class DataValidationService {
  validateAndTransform(
    jsonData: ExcelRowData[],
    filePath: string,
  ): {
    validEntities: Patient[];
    skippedRows: number;
  } {
    const validEntities: Patient[] = [];
    let skippedRows = 0;

    for (const [index, row] of jsonData.entries()) {
      if (this.isValidRow(row)) {
        const entity: Patient = {
          name: row.이름 || '',
          phone: row.전화번호?.replaceAll('-', '') || '',
          chart: row.차트번호 || '',
          rrm: row.주민등록번호 || '',
          address: row.주소 || '',
          memo: row.메모 || '',
          rowNum: index + 2,
          fileName: filePath,
        } as Patient;
        validEntities.push(entity);
      } else {
        skippedRows++;
      }
    }

    return { validEntities, skippedRows };
  }

  private isValidRow(row: ExcelRowData): boolean {
    // 이름 검증: 1~255 문자열 (필수)
    if (!row.이름 || row.이름.trim().length === 0 || row.이름.length > 255) {
      return false;
    }

    // 전화번호 검증 (필수)
    if (!row.전화번호 || !this.isValidPhoneNumber(row.전화번호)) {
      return false;
    }

    // 차트번호 검증: 0~255 문자열 (선택사항)
    if (row.차트번호 && row.차트번호.length > 255) {
      return false;
    }

    // 주소 검증: 0~255 문자열 (선택사항)
    if (row.주소 && row.주소.length > 255) {
      return false;
    }

    // 메모 검증: 0~255 문자열 (선택사항)
    if (row.메모 && row.메모.length > 255) {
      return false;
    }

    // 주민등록번호 검증 (선택사항)
    if (row.주민등록번호 && !this.isValidRRN(row.주민등록번호)) {
      return false;
    }

    return true;
  }

  private isValidPhoneNumber(phone: string): boolean {
    // 11자: 하이픈 없는 한국 휴대폰 번호 (01000000000)
    const phoneWithoutHyphen = /^010\d{8}$/;

    // 13자: 하이픈 포함 한국 휴대폰 번호 (010-0000-0000)
    const phoneWithHyphen = /^010-\d{4}-\d{4}$/;

    return phoneWithoutHyphen.test(phone) || phoneWithHyphen.test(phone);
  }

  private isValidRRN(rrn: string): boolean {
    // 6자: 생년월일 (900101)
    if (rrn.length === 6) {
      return /^\d{6}$/.test(rrn);
    }

    // 7자: 생년월일 + 성별 식별값 (9001011)
    if (rrn.length === 7) {
      return /^\d{7}$/.test(rrn);
    }

    // 8자: 생년월일 + 하이픈 + 성별 식별값 (900101-1)
    if (rrn.length === 8) {
      return /^\d{6}-\d{1}$/.test(rrn);
    }

    // 9자 이상: 전체 또는 마스킹된 형태 (900101-1111111, 900101-1*****)
    if (rrn.length >= 9) {
      // 하이픈이 7번째 자리에 있어야 함
      if (rrn.charAt(6) !== '-') {
        return false;
      }

      // 앞 6자리는 숫자여야 함
      if (!/^\d{6}/.test(rrn)) {
        return false;
      }

      // 하이픈 뒤 첫 번째 자리는 숫자여야 함 (성별 식별값)
      if (!/^\d$/.test(rrn.charAt(7))) {
        return false;
      }

      // 나머지 부분은 숫자 또는 *로 구성
      const remainingPart = rrn.substring(8);
      return /^[\d*]*$/.test(remainingPart);
    }

    return false;
  }
}
