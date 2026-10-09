import { describe, expect, it } from 'vitest';
import { mouStatus } from './mou-status';

const now = new Date('2026-10-09T05:00:00Z');
const mou = (over: Record<string, unknown> = {}) => ({ companyId: 'c1', type: 'mou', status: 'active', expiryDate: null, ...over });

describe('mouStatus', () => {
  it('a company with no MOU record has none (not "Active")', () => {
    expect(mouStatus('c1', [], now).state).toBe('none');
    expect(mouStatus('c1', [mou({ companyId: 'c2' })], now).state).toBe('none');
  });
  it('an active MOU without an expiry, or expiring later, is in force', () => {
    expect(mouStatus('c1', [mou()], now).state).toBe('active');
    expect(mouStatus('c1', [mou({ expiryDate: '2027-01-01' })], now)).toMatchObject({ state: 'active', expiry: '2027-01-01' });
  });
  it('an MOU past its expiry date is expired', () => {
    expect(mouStatus('c1', [mou({ expiryDate: '2026-01-01' })], now).state).toBe('expired');
  });
  it('the type is matched whatever its case (the seed writes "MOU")', () => {
    expect(mouStatus('c1', [mou({ type: 'MOU' })], now).state).toBe('active');
  });
  it('a record that is not an MOU, or not active, does not count', () => {
    expect(mouStatus('c1', [mou({ type: 'agreement' }), mou({ status: 'terminated' })], now).state).toBe('none');
  });
});
