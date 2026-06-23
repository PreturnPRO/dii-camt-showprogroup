import assert from 'node:assert/strict';
import {
  companyImportFields,
  guessColumnMapping,
  mapRows,
  normalizeColumnName,
  studentImportFields,
  validateMappedRows,
} from './import-mapping';

assert.equal(normalizeColumnName('Company_ID'), 'company id');

const companyMapping = guessColumnMapping(
  ['Company_ID', 'ชื่อบริษัท', 'เบอร์มือถือ', 'Industry', 'Size'],
  companyImportFields,
);

assert.equal(companyMapping.companyId, 'Company_ID');
assert.equal(companyMapping.companyName, 'ชื่อบริษัท');
assert.equal(companyMapping.phone, 'เบอร์มือถือ');

const mappedCompanies = mapRows(
  [
    {
      Company_ID: 'CMP-100',
      ชื่อบริษัท: 'Acme Co.',
      เบอร์มือถือ: '0812345678',
      Industry: 'Technology',
      Size: '',
    },
  ],
  companyImportFields,
  companyMapping,
);

assert.equal(mappedCompanies[0].values.companyId, 'CMP-100');
assert.equal(mappedCompanies[0].values.size, 'small');

const companyValidation = validateMappedRows(mappedCompanies, companyImportFields);
assert.equal(companyValidation.issues.length, 0);
assert.equal(companyValidation.validRows.length, 1);

const studentMapping = guessColumnMapping(
  ['student_id', 'name', 'year', 'ปีการศึกษา'],
  studentImportFields,
);
const mappedStudents = mapRows(
  [{ student_id: '66010001', name: 'Ada Lovelace', year: '2', ปีการศึกษา: '2569' }],
  studentImportFields,
  studentMapping,
);
const studentValidation = validateMappedRows(mappedStudents, studentImportFields);

assert.equal(mappedStudents[0].values.program, 'bachelor');
assert.equal(studentValidation.issues.length, 0);

const invalidStudents = mapRows([{ name: 'No ID' }], studentImportFields, studentMapping);
const invalidValidation = validateMappedRows(invalidStudents, studentImportFields);

assert.equal(invalidValidation.validRows.length, 0);
assert.equal(invalidValidation.issues.some((issue) => issue.fieldKey === 'studentId'), true);

console.log('import-mapping tests passed');
