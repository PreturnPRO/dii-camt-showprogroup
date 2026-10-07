// a cell a spreadsheet would run as a formula (=, +, -, @, tab, CR) gets a leading ' so it is shown as text
const FORMULA_START = /^[=+\-@\t\r]/;

export const csvCell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value);
  const text = String(value);
  const safe = FORMULA_START.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

export const csvRow = (cells: unknown[]) => cells.map(csvCell).join(",");
