/** Links typed by users are opened only when they are plain web links (audit S5). */
export const safeExternalUrl = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return undefined;
  try {
    new URL(trimmed);
    return trimmed;
  } catch {
    return undefined;
  }
};

export const openExternal = (value: unknown) => {
  const url = safeExternalUrl(value);
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
};

export const safeInternalPath = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return undefined;
  return value;
};
