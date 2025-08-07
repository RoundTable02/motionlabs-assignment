export class UploadResponseDto {
  totalRows: number;
  processedRows: number;
  skippedRows: number;
}

export class PatientQueryDto {
  page?: number = 1;
  limit?: number = 10;
  name?: string;
  phone?: string;
  chart?: string;
}

export class PatientListResponseDto {
  total: number;
  page: number;
  count: number;
  data: any[];
}
