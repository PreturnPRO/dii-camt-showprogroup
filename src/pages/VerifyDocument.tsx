import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, FileCheck2, Loader2, RotateCw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

type Verification = { reference: string; kind: string; issuedAt: string; valid: boolean; studentIdMasked: string | null };

// only a 404 means "no such document"; an outage or rate limit must not make a genuine document look forged
type State =
  | { phase: 'loading' }
  | { phase: 'found'; document: Verification }
  | { phase: 'not-found' }
  | { phase: 'error' };

const KIND_LABELS: Record<string, { th: string; en: string }> = {
  transcript: { th: 'ใบแสดงผลการเรียน', en: 'Transcript' },
  'internship-certificate': { th: 'ใบรับรองการฝึกงาน', en: 'Internship certificate' },
  'cooperation-summary': { th: 'สรุปความร่วมมือ', en: 'Cooperation summary' },
};

export default function VerifyDocument() {
  const { token } = useParams();
  const { language } = useLanguage();
  const th = language === 'th';
  const [state, setState] = useState<State>({ phase: 'loading' });
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (!token) { setState({ phase: 'not-found' }); return; }
    const controller = new AbortController();
    setState({ phase: 'loading' });
    fetch(`${API_BASE_URL}/documents/verify/${encodeURIComponent(token)}`, { signal: controller.signal })
      .then(async (response) => {
        if (response.status === 404) return setState({ phase: 'not-found' });
        if (!response.ok) return setState({ phase: 'error' });
        const result = await response.json();
        setState(result?.document ? { phase: 'found', document: result.document } : { phase: 'error' });
      })
      .catch((error) => { if (error.name !== 'AbortError') setState({ phase: 'error' }); });
    return () => controller.abort();
  }, [token, attempt]);

  const kindLabel = (kind: string) => KIND_LABELS[kind]?.[th ? 'th' : 'en'] ?? kind;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex items-center gap-3 text-blue-600 dark:text-blue-400"><FileCheck2 className="h-8 w-8" /><span className="text-xl font-bold">ShowPro</span></div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{th ? 'ตรวจสอบเอกสาร' : 'Document verification'}</h1>

        {state.phase === 'loading' && (
          <div role="status" className="mt-8 flex items-center gap-2 text-slate-500 dark:text-slate-400"><Loader2 className="h-5 w-5 animate-spin" />{th ? 'กำลังตรวจสอบ...' : 'Verifying...'}</div>
        )}

        {state.phase === 'found' && (
          <div className="mt-7 space-y-4" data-testid="verify-result">
            <div className={`flex items-center gap-2 font-semibold ${state.document.valid ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {state.document.valid ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
              {state.document.valid ? (th ? 'พบเลขอ้างอิงที่ออกโดย ShowPro' : 'ShowPro reference found') : (th ? 'เอกสารนี้ถูกเพิกถอนแล้ว' : 'This document has been revoked')}
            </div>
            <dl className="space-y-3 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800">
              <div><dt className="text-slate-500 dark:text-slate-400">{th ? 'เลขที่เอกสาร' : 'Reference'}</dt><dd className="font-mono font-semibold text-slate-900 dark:text-white">{state.document.reference}</dd></div>
              <div><dt className="text-slate-500 dark:text-slate-400">{th ? 'ประเภท' : 'Type'}</dt><dd className="text-slate-900 dark:text-white">{kindLabel(state.document.kind)}</dd></div>
              {state.document.studentIdMasked && (
                <div><dt className="text-slate-500 dark:text-slate-400">{th ? 'รหัสนักศึกษา (3 ตัวท้าย)' : 'Student ID (last 3 digits)'}</dt><dd className="font-mono text-slate-900 dark:text-white" data-testid="verify-student-id">{state.document.studentIdMasked}</dd></div>
              )}
              <div><dt className="text-slate-500 dark:text-slate-400">{th ? 'วันที่ออก' : 'Issued'}</dt><dd className="text-slate-900 dark:text-white">{new Date(state.document.issuedAt).toLocaleDateString(th ? 'th-TH' : 'en-US', { timeZone: 'Asia/Bangkok' })}</dd></div>
            </dl>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {th
                ? 'หน้านี้ยืนยันว่า ShowPro ออกเลขที่เอกสารนี้จริง ให้เทียบเลขที่ ประเภท และรหัสนักศึกษา 3 ตัวท้ายกับเอกสารที่ได้รับ หน้านี้ไม่ได้ตรวจเนื้อหาใน PDF'
                : 'This confirms ShowPro issued this reference. Compare the reference, type and last 3 digits of the student ID with the paper you received. It does not check the PDF contents.'}
            </p>
          </div>
        )}

        {state.phase === 'not-found' && (
          <div className="mt-7 flex items-center gap-2 text-rose-600 dark:text-rose-400" data-testid="verify-not-found"><XCircle className="h-6 w-6" />{th ? 'ไม่พบเอกสารหรือรหัสตรวจสอบไม่ถูกต้อง' : 'Document not found or verification code invalid'}</div>
        )}

        {state.phase === 'error' && (
          <div role="alert" className="mt-7 space-y-3" data-testid="verify-error">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400"><AlertTriangle className="h-6 w-6 shrink-0" />{th ? 'ตรวจสอบไม่ได้ในขณะนี้ — ไม่ได้แปลว่าเอกสารปลอม กรุณาลองใหม่' : 'Could not verify right now — this does not mean the document is invalid. Please try again.'}</div>
            <Button variant="outline" onClick={retry} className="gap-2"><RotateCw className="h-4 w-4" />{th ? 'ลองใหม่' : 'Try again'}</Button>
          </div>
        )}

        <Link to="/" className="mt-8 inline-block text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400">{th ? 'กลับหน้าแรก' : 'Back to home'}</Link>
      </section>
    </main>
  );
}
