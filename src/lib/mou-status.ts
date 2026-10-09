import { asString } from '@/lib/live-data';

type Cooperation = { companyId?: unknown; type?: unknown; status?: unknown; expiryDate?: unknown };

/** a company's MOU state from its cooperation records: in force, expired, or none at all */
export const mouStatus = (companyId: string, records: Cooperation[], now: Date = new Date()) => {
  const mous = records.filter((r) => asString(r.companyId) === companyId && asString(r.type).toLowerCase() === 'mou' && asString(r.status) === 'active');
  if (mous.length === 0) return { state: 'none' as const, expiry: null };
  const expiryOf = (r: Cooperation) => (r.expiryDate ? String(r.expiryDate).slice(0, 10) : null);
  const inForce = mous.find((r) => !expiryOf(r) || new Date(`${expiryOf(r)}T23:59:59+07:00`) >= now);
  if (inForce) return { state: 'active' as const, expiry: expiryOf(inForce) };
  return { state: 'expired' as const, expiry: mous.map(expiryOf).sort().at(-1) ?? null };
};
