import { describe, expect, it } from 'vitest';
import { solidBg } from './flat-color';

describe('solidBg (design.md: no gradient fills)', () => {
  it('uses the first stop as one solid 600 shade', () => {
    expect(solidBg('from-blue-500 to-indigo-600')).toBe('bg-blue-600');
    expect(solidBg('from-emerald-400 via-teal-500 to-cyan-600')).toBe('bg-emerald-600');
  });
  it('keeps a dark neutral as-is', () => {
    expect(solidBg('from-slate-700 to-slate-900')).toBe('bg-slate-800');
  });
  it('falls back to the primary blue when there is no stop', () => {
    expect(solidBg('')).toBe('bg-blue-600');
  });
});
