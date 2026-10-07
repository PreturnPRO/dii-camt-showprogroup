/** "YYYY-MM-DD" of the Thai calendar day; attendance days are always Thai days */
export const thaiToday = (now: Date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
