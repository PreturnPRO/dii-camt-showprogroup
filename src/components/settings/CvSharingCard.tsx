import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { asRecord, asString } from '@/lib/live-data';

/**
 * A student's CV link and their data-sharing consent. Sharing is what lets companies find them in
 * Talent Search and open their profile and CV (allowDataSharing on the server); it is off until they turn it on.
 */
export function CvSharingCard() {
  const { language } = useLanguage();
  const th = language === 'th';
  const [cvUrl, setCvUrl] = useState('');
  const [sharing, setSharing] = useState(false);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.students.profile()
      .then((res) => {
        const profile = asRecord(res.profile);
        setCvUrl(asString(profile.cvUrl));
        setSharing(asRecord(profile.consent).allowDataSharing === true);
        setState('ready');
      })
      .catch(() => setState('failed'));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.students.updateProfile({ cvUrl: cvUrl.trim(), consent: { allowDataSharing: sharing } });
      toast.success(th ? 'บันทึก CV และการแชร์แล้ว' : 'CV and sharing saved');
    } catch (error) {
      toast.error(th ? 'บันทึกไม่สำเร็จ ตรวจว่าลิงก์ขึ้นต้นด้วย https://' : 'Could not save; check the link starts with https://', {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section data-testid="cv-sharing" className="mt-8 rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
      <h3 className="mb-1 text-lg font-bold text-slate-900 dark:text-white">{th ? 'CV และการแชร์ข้อมูลกับบริษัท' : 'CV and sharing with companies'}</h3>
      <p className="mb-4 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
        {th
          ? 'บริษัทจะเปิด CV ได้ก็ต่อเมื่อคุณเปิดการแชร์ด้านล่าง อีเมลของคุณจะไม่ถูกแสดงให้บริษัทเห็น'
          : 'Companies can open your CV only when sharing is on. Your email is never shown to them.'}
      </p>
      {state === 'failed' ? (
        <p role="alert" className="text-sm text-rose-600">{th ? 'โหลดข้อมูลไม่สำเร็จ ลองรีเฟรชหน้า' : 'Could not load; refresh the page'}</p>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cv-url" className="text-xs font-semibold">{th ? 'ลิงก์ CV (เช่น Google Drive, PDF)' : 'CV link (e.g. Google Drive, PDF)'}</Label>
            <Input id="cv-url" type="url" value={cvUrl} disabled={state === 'loading'} onChange={(e) => setCvUrl(e.target.value)} placeholder="https://" />
          </div>
          <div className="flex items-start gap-3">
            <Switch id="cv-share" checked={sharing} disabled={state === 'loading'} onCheckedChange={setSharing} />
            <Label htmlFor="cv-share" className="text-sm font-normal leading-relaxed">
              {th
                ? 'แชร์ข้อมูลกับบริษัท: บริษัทค้นหาฉันใน Talent Search ได้ และเปิดโปรไฟล์กับ CV ของฉันได้'
                : 'Share with companies: they can find me in Talent Search and open my profile and CV'}
            </Label>
          </div>
          <Button onClick={() => void save()} disabled={saving || state !== 'ready'}>
            {saving ? (th ? 'กำลังบันทึก...' : 'Saving...') : (th ? 'บันทึก CV และการแชร์' : 'Save CV and sharing')}
          </Button>
        </div>
      )}
    </section>
  );
}
