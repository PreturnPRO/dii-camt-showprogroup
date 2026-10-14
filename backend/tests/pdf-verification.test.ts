import QRCode from 'qrcode';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildTranscriptPdf } from '../src/services/pdf.service';

afterEach(() => vi.restoreAllMocks());

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

  it('the QR encodes the verify URL, not the reference number', async () => {
    // test audit T-L3: the image was only checked to exist, so a QR of the wrong text passed
    const toDataURL = vi.spyOn(QRCode, 'toDataURL');
    await buildTranscriptPdf(
      { name: 'Test Student', studentId: '65000001', gpax: 3.5, earnedCredits: 90, requiredCredits: 120 },
      [],
      { reference: 'SHOWPRO-2026-000001', issuedAt: new Date('2026-10-08T00:00:00Z'), url: 'https://example.com/verify/sample-token' },
    );
    expect(toDataURL).toHaveBeenCalledTimes(1);
    expect(toDataURL.mock.calls[0][0]).toBe('https://example.com/verify/sample-token');
  });
});
