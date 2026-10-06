const BANDS = ['not_disclosed', 'below 2.50', '2.50-2.99', '3.00-3.49', '3.50+'] as const;

/** Companies get a GPA band from the server; other viewers' exact GPAX is shown in the same band format. */
export const gpaBandOf = (source: { gpaBand?: unknown; gpax?: unknown }): string => {
  if (typeof source.gpaBand === 'string' && source.gpaBand) return source.gpaBand;
  const gpax = typeof source.gpax === 'number' ? source.gpax : 0;
  if (gpax >= 3.5) return '3.50+';
  if (gpax >= 3) return '3.00-3.49';
  if (gpax >= 2.5) return '2.50-2.99';
  if (gpax > 0) return 'below 2.50';
  return 'not_disclosed';
};

export const gpaBandRank = (band: string) => BANDS.indexOf(band as (typeof BANDS)[number]);

export const gpaBandLabel = (band: string, language: string) =>
  band === 'not_disclosed' ? (language === 'th' ? 'ไม่เปิดเผย' : 'not disclosed') : band;
