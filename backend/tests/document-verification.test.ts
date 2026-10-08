import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { loginAs } from './helpers/auth';

describe('issued document verification', () => {
  it('assigns a unique reference and verifies a PDF without leaking student data', async () => {
    const token = await loginAs('alice@student.showpro.local');
    const student = await prisma.studentProfile.findUniqueOrThrow({ where: { studentId: '65010001' } });
    const before = await prisma.issuedDocument.count();
    const pdf = await request(app).get('/api/documents/transcript').set('Authorization', `Bearer ${token}`);
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toMatch(/application\/pdf/);

    const issued = await prisma.issuedDocument.findFirstOrThrow({ where: { subjectId: student.id, kind: 'transcript' }, orderBy: { id: 'desc' } });
    expect(await prisma.issuedDocument.count()).toBe(before + 1);
    const verified = await request(app).get(`/api/documents/verify/${issued.token}`);
    expect(verified.status).toBe(200);
    expect(verified.body.document).toMatchObject({
      reference: `SHOWPRO-${new Date(issued.issuedAt.getTime() + 7 * 3600_000).getUTCFullYear()}-${String(issued.id).padStart(6, '0')}`,
      kind: 'transcript', valid: true,
    });
    expect(JSON.stringify(verified.body)).not.toContain(student.studentId);
    expect(JSON.stringify(verified.body)).not.toContain('Alice');
    expect((await request(app).get('/api/documents/verify/not-a-real-token')).status).toBe(404);
  });
});

describe('verify page details and revocation', () => {
  const issueTranscript = async () => {
    const token = await loginAs('alice@student.showpro.local');
    await request(app).get('/api/documents/transcript').set('Authorization', `Bearer ${token}`).expect(200);
    const student = await prisma.studentProfile.findUniqueOrThrow({ where: { studentId: '65010001' } });
    return prisma.issuedDocument.findFirstOrThrow({ where: { subjectId: student.id, kind: 'transcript' }, orderBy: { id: 'desc' } });
  };
  const referenceOf = (issued: { id: number; issuedAt: Date }) =>
    `SHOWPRO-${new Date(issued.issuedAt.getTime() + 7 * 3600_000).getUTCFullYear()}-${String(issued.id).padStart(6, '0')}`;

  it('shows only the last three digits of the student ID so a reader can match it to the paper', async () => {
    const issued = await issueTranscript();
    const res = await request(app).get(`/api/documents/verify/${issued.token}`);
    expect(res.body.document.studentIdMasked).toBe('•••••001');
    expect(res.body.document.reference).toBe(referenceOf(issued));
  });

  it('staff can revoke by reference; the verify page then says revoked; others cannot', async () => {
    const issued = await issueTranscript();
    const reference = referenceOf(issued);
    const asStudent = await request(app).post('/api/documents/revoke').set('Authorization', `Bearer ${await loginAs('alice@student.showpro.local')}`).send({ reference });
    expect(asStudent.status).toBe(403);
    const asLecturer = await request(app).post('/api/documents/revoke').set('Authorization', `Bearer ${await loginAs('narin@showpro.local')}`).send({ reference });
    expect(asLecturer.status).toBe(403);

    const staff = `Bearer ${await loginAs('staff@showpro.local')}`;
    expect((await request(app).post('/api/documents/revoke').set('Authorization', staff).send({ reference: 'SHOWPRO-2026-999999' })).status).toBe(404);
    expect((await request(app).post('/api/documents/revoke').set('Authorization', staff).send({ reference: 'not a reference' })).status).toBe(400);
    expect((await request(app).post('/api/documents/revoke').set('Authorization', staff).send({ reference: 'SHOWPRO-2026-99999999999' })).status).toBe(400);
    // fits the pattern but is past the database's integer range: still "not found", never a 500
    expect((await request(app).post('/api/documents/revoke').set('Authorization', staff).send({ reference: 'SHOWPRO-2026-9999999999' })).status).toBe(404);
    const wrongYear = reference.replace(/SHOWPRO-(\d{4})/, (_m, y) => `SHOWPRO-${Number(y) - 1}`);
    expect((await request(app).post('/api/documents/revoke').set('Authorization', staff).send({ reference: wrongYear })).status).toBe(404);
    const ok = await request(app).post('/api/documents/revoke').set('Authorization', staff).send({ reference });
    expect(ok.status).toBe(200);
    expect(ok.body.document).toMatchObject({ reference, valid: false });

    const verified = await request(app).get(`/api/documents/verify/${issued.token}`);
    expect(verified.body.document.valid).toBe(false);
  });
});
