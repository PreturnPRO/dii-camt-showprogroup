import { describe, expect, it } from 'vitest';
import { recipientLabel, recipientMeta } from './recipient-label';

describe('recipientLabel', () => {
  it('shows the email when the viewer is allowed to see it', () => {
    expect(recipientLabel({ name: 'Bob', nameThai: 'บ๊อบ', email: 'bob@x.th' })).toBe('บ๊อบ <bob@x.th>');
  });
  it('shows only the name when the email was withheld', () => {
    expect(recipientLabel({ name: 'Bob', nameThai: 'บ๊อบ', email: '' })).toBe('บ๊อบ');
  });
});

describe('recipientMeta', () => {
  it('drops the empty email instead of rendering " · student"', () => {
    expect(recipientMeta({ email: '', role: 'student' })).toBe('student');
    expect(recipientMeta({ email: 'a@b.c', role: 'staff' })).toBe('a@b.c · staff');
  });
});
