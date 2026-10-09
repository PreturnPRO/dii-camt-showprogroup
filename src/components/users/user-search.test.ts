import { describe, expect, it } from 'vitest';
import { userMatches } from './user-search';

const u = { name: 'สมชาย หนึ่ง', nameThai: 'สมชาย หนึ่ง', nameEn: 'Somchai One', email: 's@example.com', identifier: 'AGT7S943681' };

// G6 (staff ST-M3): the Users search found neither the student ID nor the English name
describe('userMatches', () => {
  it('finds by student ID, English name, Thai name, email or role, ignoring case and spaces around', () => {
    expect(userMatches(u, 'agt7s943681', 'นักศึกษา')).toBe(true);
    expect(userMatches(u, ' Somchai ', 'นักศึกษา')).toBe(true);
    expect(userMatches(u, 'สมชาย', 'นักศึกษา')).toBe(true);
    expect(userMatches(u, 'example', 'นักศึกษา')).toBe(true);
    expect(userMatches(u, 'นักศึกษา', 'นักศึกษา')).toBe(true);
    expect(userMatches(u, 'nobody', 'นักศึกษา')).toBe(false);
  });
});
