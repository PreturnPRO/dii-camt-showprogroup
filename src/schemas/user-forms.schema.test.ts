import { describe, expect, it } from 'vitest';
import { studentUserSchemaFor } from './user-forms.schema';

const values = (studentId: string) => ({
  name: 'Somchai', nameThai: 'สมชาย', email: 'somchai@example.com', phone: '', status: 'active',
  studentId, major: 'DII', program: 'bachelor', year: 2, semester: 1, academicYear: '2569', advisorId: '',
});

// G6 (staff ST-M1): an imported ID in another format must not block saving other fields
describe('studentUserSchemaFor', () => {
  it('keeps an unchanged old ID, but a new ID must be 8-9 digits', () => {
    const editing = studentUserSchemaFor('AGT7S943682');
    expect(editing.safeParse(values('AGT7S943682')).success).toBe(true);
    expect(editing.safeParse(values('AB12')).success).toBe(false);
    expect(editing.safeParse(values('652110001')).success).toBe(true);
    expect(studentUserSchemaFor().safeParse(values('AGT7S943682')).success).toBe(false);
  });
});
