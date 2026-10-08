import { describe, expect, it } from 'vitest';
import { buildTranscriptPdf } from '../src/services/pdf.service';

describe('issued PDF verification', () => {
  it('embeds a QR image when verification details are supplied', async () => {
    const pdf = await buildTranscriptPdf(
      { name: 'Test Student', studentId: '65000001', gpax: 3.5, earnedCredits: 90, requiredCredits: 120 },
      [],
      { reference: 'SHOWPRO-2026-000001', issuedAt: new Date('2026-10-08T00:00:00Z'), url: 'https://example.com/verify/sample-token' },
    );
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(pdf.toString('latin1')).toContain('/Subtype /Image');
    expect(pdf.length).toBeGreaterThan(2000);
  });
});
