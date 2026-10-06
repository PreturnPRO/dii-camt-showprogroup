type Named = { name?: string; nameThai?: string; email?: string };

/** Students' emails are withheld from students and companies, so the label must not assume one. */
export const recipientLabel = (r: Named) => {
  const name = r.nameThai || r.name || '';
  return r.email ? `${name} <${r.email}>` : name;
};

export const recipientMeta = (r: { email?: string; role?: string }) =>
  [r.email, r.role].filter(Boolean).join(' · ');
