import { describe, expect, it } from 'vitest';
import { safeExternalUrl, safeInternalPath, loginRedirectTarget } from './safe-url';

describe('safeExternalUrl', () => {
  it('keeps http and https links', () => {
    expect(safeExternalUrl('https://github.com/alice')).toBe('https://github.com/alice');
    expect(safeExternalUrl(' http://example.com ')).toBe('http://example.com');
  });
  it.each(['javascript:alert(1)', '  JavaScript:alert(1)', 'data:text/html,x', 'vbscript:x', '', undefined, null, 42])('drops %s', (value) => {
    expect(safeExternalUrl(value)).toBeUndefined();
  });
});

describe('safeInternalPath', () => {
  it('keeps in-app paths', () => {
    expect(safeInternalPath('/appointments')).toBe('/appointments');
  });
  it.each(['//evil.com', '/\\evil.com', 'https://evil.com', 'javascript:alert(1)', ''])('drops %s', (value) => {
    expect(safeInternalPath(value)).toBeUndefined();
  });
});

describe('loginRedirectTarget', () => {
  it('returns the page the user wanted, with its query', () => {
    expect(loginRedirectTarget({ from: { pathname: '/student/checkin', search: '?token=abc' } })).toBe('/student/checkin?token=abc');
  });
  it('falls back to the dashboard for missing, external or login targets', () => {
    expect(loginRedirectTarget(null)).toBe('/dashboard');
    expect(loginRedirectTarget({ from: { pathname: '//evil.example', search: '' } })).toBe('/dashboard');
    expect(loginRedirectTarget({ from: { pathname: '/login', search: '' } })).toBe('/dashboard');
  });
});
