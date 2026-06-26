export type ImportFieldType = 'text' | 'email' | 'phone' | 'number' | 'password';

export interface ImportField {
  key: string;
  label: string;
  required?: boolean;
  type?: ImportFieldType;
  aliases?: string[];
  defaultValue?: string | number;
}

export type ParsedImportRow = Record<string, unknown>;
export type ColumnMapping = Record<string, string>;

export interface MappedImportRow {
  rowNumber: number;
  values: Record<string, string>;
}

export interface ImportValidationIssue {
  rowNumber: number;
  fieldKey: string;
  message: string;
}

export const companyImportFields: ImportField[] = [
  { key: 'companyId', label: 'รหัสบริษัท', required: true, aliases: ['company id', 'company_code', 'รหัสบริษัท'] },
  { key: 'companyName', label: 'ชื่อบริษัท', required: true, aliases: ['company name', 'name', 'ชื่อบริษัท'] },
  { key: 'companyNameThai', label: 'ชื่อบริษัทภาษาไทย', aliases: ['thai name', 'ชื่อบริษัทไทย', 'ชื่อบริษัทภาษาไทย'] },
  { key: 'phone', label: 'เบอร์มือถือเข้าสู่ระบบ', required: true, type: 'phone', aliases: ['phone', 'mobile', 'tel', 'เบอร์มือถือ', 'เบอร์โทร'] },
  { key: 'email', label: 'อีเมล', type: 'email', aliases: ['email', 'อีเมล'] },
  { key: 'password', label: 'รหัสผ่านเริ่มต้น', type: 'password', aliases: ['password', 'รหัสผ่าน'] },
  { key: 'industry', label: 'อุตสาหกรรม', required: true, aliases: ['industry', 'business type', 'อุตสาหกรรม'] },
  { key: 'size', label: 'ขนาดบริษัท', required: true, aliases: ['size', 'company size', 'ขนาดบริษัท'], defaultValue: 'small' },
  { key: 'website', label: 'เว็บไซต์', aliases: ['website', 'web', 'เว็บไซต์'] },
  { key: 'address', label: 'ที่อยู่', aliases: ['address', 'ที่อยู่'] },
  { key: 'contactPersonName', label: 'ผู้ประสานงาน', aliases: ['contact person', 'contact name', 'ผู้ประสานงาน'] },
  { key: 'contactPersonRole', label: 'ตำแหน่งผู้ประสานงาน', aliases: ['contact role', 'ตำแหน่งผู้ประสานงาน'] },
  { key: 'contactPersonEmail', label: 'อีเมลผู้ประสานงาน', type: 'email', aliases: ['contact email', 'อีเมลผู้ประสานงาน'] },
  { key: 'contactPersonPhone', label: 'เบอร์ผู้ประสานงาน', type: 'phone', aliases: ['contact phone', 'เบอร์ผู้ประสานงาน'] },
  { key: 'productsServices', label: 'สินค้า/บริการ', aliases: ['products', 'services', 'สินค้า', 'บริการ'] },
  { key: 'socialMedia', label: 'Social Media', aliases: ['social', 'facebook', 'line'] },
];

export const studentImportFields: ImportField[] = [
  { key: 'studentId', label: 'รหัสนักศึกษา', required: true, aliases: ['student id', 'student_id', 'รหัสนักศึกษา'] },
  { key: 'name', label: 'ชื่ออังกฤษ', required: true, aliases: ['name', 'english name', 'ชื่ออังกฤษ'] },
  { key: 'nameThai', label: 'ชื่อไทย', aliases: ['thai name', 'ชื่อไทย', 'ชื่อ-สกุล'] },
  { key: 'email', label: 'อีเมล', type: 'email', aliases: ['email', 'อีเมล'] },
  { key: 'phone', label: 'เบอร์มือถือ', type: 'phone', aliases: ['phone', 'mobile', 'เบอร์มือถือ', 'เบอร์โทร'] },
  { key: 'password', label: 'รหัสผ่านเริ่มต้น', type: 'password', aliases: ['password', 'รหัสผ่าน'] },
  { key: 'major', label: 'สาขา', required: true, aliases: ['major', 'department', 'สาขา'], defaultValue: 'Digital Industry Integration' },
  { key: 'program', label: 'หลักสูตร', required: true, aliases: ['program', 'หลักสูตร'], defaultValue: 'bachelor' },
  { key: 'year', label: 'ชั้นปี', required: true, type: 'number', aliases: ['year', 'ชั้นปี'] },
  { key: 'semester', label: 'เทอม', required: true, type: 'number', aliases: ['semester', 'term', 'เทอม'], defaultValue: 1 },
  { key: 'academicYear', label: 'ปีการศึกษา', required: true, aliases: ['academic year', 'ปีการศึกษา'] },
  { key: 'gpa', label: 'GPA', type: 'number', aliases: ['gpa'] },
  { key: 'gpax', label: 'GPAX', type: 'number', aliases: ['gpax'] },
  { key: 'academicStatus', label: 'สถานะ', aliases: ['status', 'สถานะ'], defaultValue: 'normal' },
];

export const normalizeColumnName = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[_-]+/g, ' ');

export const guessColumnMapping = (columns: string[], fields: ImportField[]): ColumnMapping => {
  const normalizedColumns = columns.map((column) => ({
    original: column,
    normalized: normalizeColumnName(column),
  }));

  return fields.reduce<ColumnMapping>((mapping, field) => {
    const candidates = [field.key, field.label, ...(field.aliases ?? [])].map(normalizeColumnName);
    const exact = normalizedColumns.find((column) => candidates.includes(column.normalized));
    const fuzzy =
      exact ??
      normalizedColumns.find((column) =>
        candidates.some((candidate) => candidate && column.normalized.includes(candidate)),
      );

    if (fuzzy) {
      mapping[field.key] = fuzzy.original;
    }

    return mapping;
  }, {});
};

const cleanCellValue = (value: unknown) => String(value ?? '').trim();

export const mapRows = (
  rows: ParsedImportRow[],
  fields: ImportField[],
  mapping: ColumnMapping,
): MappedImportRow[] =>
  rows.map((row, index) => ({
    rowNumber: index + 2,
    values: fields.reduce<Record<string, string>>((values, field) => {
      const sourceColumn = mapping[field.key];
      const value = sourceColumn ? cleanCellValue(row[sourceColumn]) : '';
      values[field.key] = value || cleanCellValue(field.defaultValue);
      return values;
    }, {}),
  }));

export const validateMappedRows = (rows: MappedImportRow[], fields: ImportField[]) => {
  const requiredFields = fields.filter((field) => field.required);
  const issues: ImportValidationIssue[] = [];

  for (const row of rows) {
    for (const field of requiredFields) {
      if (!row.values[field.key]) {
        issues.push({
          rowNumber: row.rowNumber,
          fieldKey: field.key,
          message: `${field.label} is required`,
        });
      }
    }
  }

  return {
    validRows: rows.filter(
      (row) => !issues.some((issue) => issue.rowNumber === row.rowNumber),
    ),
    issues,
  };
};

export const buildSafeIdentifier = (value: string, fallback: string) => {
  const normalized = value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return normalized || fallback.toLowerCase();
};
