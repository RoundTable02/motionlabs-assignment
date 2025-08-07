import { parentPort } from 'worker_threads';
import { Patient } from './patient.entity';

function processEntities(
  validEntities: Patient[],
): Map<string, Map<string, Patient>> {
  const excelDataMap = new Map<string, Map<string, Patient>>();

  for (const entity of validEntities) {
    const key = entity.name + '|' + entity.phone;
    if (excelDataMap.has(key)) {
      const dataMap = excelDataMap.get(key) as Map<string, Patient>;
      if (dataMap.has(entity.chart)) {
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
      } else {
        if (dataMap.has('')) {
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
        } else {
          if (!entity.chart) {
            const valuesArray = [...dataMap.values()];
            const existingPatient = valuesArray.pop() as Patient;
            const newEntity: Patient = {
              ...existingPatient,
              name: entity.name || existingPatient.name,
              phone: entity.phone || existingPatient.phone,
              chart: existingPatient.chart,
              rrm: entity.rrm || existingPatient.rrm,
              address: entity.address || existingPatient.address,
              memo: entity.memo || existingPatient.memo,
              rowNum: entity.rowNum,
              fileName: existingPatient.fileName,
            };
            dataMap.set(newEntity.chart, newEntity);
            excelDataMap.set(key, dataMap);
          } else {
            dataMap.set(entity.chart, entity);
            excelDataMap.set(key, dataMap);
          }
        }
      }
    } else {
      const newMap = new Map<string, Patient>();
      newMap.set(entity.chart, entity);
      excelDataMap.set(key, newMap);
    }
  }
  return excelDataMap;
}

parentPort?.on('message', (data: { validEntities: Patient[] }) => {
  if (data.validEntities) {
    const result = processEntities(data.validEntities);
    parentPort?.postMessage(result);
  }
});
