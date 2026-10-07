// Outcome of a bulk action run as one request per item: who actually changed, and what to tell the user.
export type BulkSplit = { succeeded: string[]; failed: string[] };

export const splitSettled = (ids: string[], results: PromiseSettledResult<unknown>[]): BulkSplit => {
  if (ids.length !== results.length) throw new Error('splitSettled: ids and results differ in length');
  const split: BulkSplit = { succeeded: [], failed: [] };
  ids.forEach((id, i) => (results[i].status === 'fulfilled' ? split.succeeded : split.failed).push(id));
  return split;
};

export const bulkMessage = ({ succeeded, failed }: BulkSplit, lang: 'th' | 'en') => {
  const total = succeeded.length + failed.length;
  if (failed.length === 0) {
    return { kind: 'success' as const, text: lang === 'th' ? `ปรับสถานะแล้ว ${total} รายการ` : `Updated ${total} applications.` };
  }
  if (succeeded.length === 0) {
    return { kind: 'error' as const, text: lang === 'th' ? 'ปรับสถานะไม่สำเร็จ' : 'Could not update status.' };
  }
  return {
    kind: 'warning' as const,
    text: lang === 'th'
      ? `สำเร็จ ${succeeded.length} จาก ${total} รายการ — ไม่สำเร็จ ${failed.length} รายการ`
      : `Updated ${succeeded.length} of ${total} — ${failed.length} failed.`,
  };
};
