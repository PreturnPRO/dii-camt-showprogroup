export type TabularRow = Record<string, string>;

const csvRows = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== '')) rows.push(row);
  return rows;
};

const rowsToRecords = (matrix: string[][]): TabularRow[] => {
  const [headerRow = [], ...dataRows] = matrix;
  const headers = headerRow.map((header) => header.trim());
  return dataRows.map((cells) => Object.fromEntries(
    headers.flatMap((header, index) => header ? [[header, cells[index] ?? '']] : []),
  ));
};

export const readTabularFile = async (file: File): Promise<TabularRow[]> => {
  const extension = file.name.toLowerCase().split('.').pop();
  if (extension === 'csv') return rowsToRecords(csvRows(await file.text()));
  if (extension !== 'xlsx') throw new Error('Choose a .csv or .xlsx file. Legacy .xls files are not supported.');

  const { readSheet } = await import('read-excel-file/browser');
  const rows = await readSheet(file);
  return rowsToRecords(rows.map((row) =>
    row.map((value) => {
      if (value === null || value === undefined) return '';
      if (value instanceof Date) return value.toISOString();
      return String(value);
    }),
  ));
};
