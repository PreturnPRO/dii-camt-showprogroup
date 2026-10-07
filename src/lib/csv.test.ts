import { describe, expect, it } from 'vitest';
import { csvCell, toCsv } from './csv';

describe('csv export helpers', () => {
  it.each([
    ['=HYPERLINK("http://x")', `"'=HYPERLINK(""http://x"")"`],
    ['+66812345678', `"'+66812345678"`],
    ['-1', `"'-1"`],
    ['@SUM(A1)', `"'@SUM(A1)"`],
    ['สมชาย', '"สมชาย"'],
  ])('%s', (input, out) => {
    expect(csvCell(input)).toBe(out);
  });

  it('numbers stay numbers, empty stays empty', () => {
    expect(csvCell(-2.5)).toBe('-2.5');
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });

  it('joins rows with newlines', () => {
    expect(toCsv([['a', 1], ['=x', 2]])).toBe(`"a",1\n"'=x",2`);
  });
});
