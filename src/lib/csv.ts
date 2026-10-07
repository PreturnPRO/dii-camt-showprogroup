// a cell a spreadsheet would run as a formula (=, +, -, @, tab, CR) gets a leading ' so it opens as text;
// names, emails and remarks in exports are typed by users, so every text cell goes through this
const FORMULA_START = /^[=+\-@\t\r]/;

export const csvCell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);
  const text = String(value);
  return `"${(FORMULA_START.test(text) ? `'${text}` : text).replace(/"/g, '""')}"`;
};

export const toCsv = (rows: unknown[][]) => rows.map((row) => row.map(csvCell).join(',')).join('\n');
