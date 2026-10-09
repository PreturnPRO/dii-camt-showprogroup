import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, ApiError } from '@/lib/api';
import { asArray, asRecord, asString } from '@/lib/live-data';
import { queryKeys } from '@/lib/query-keys';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** a known student (changing the company); without it staff type the student ID */
  studentId?: string;
  studentLabel?: string;
  currentCompanyId?: string;
};

/** Staff tie a company to a student's internship, or change it (owner decision 9/10/69). */
export function BindCompanyDialog({ open, onOpenChange, studentId, studentLabel, currentCompanyId }: Props) {
  const { language } = useLanguage();
  const th = language === 'th';
  const queryClient = useQueryClient();
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [studentCode, setStudentCode] = useState('');
  const [companyId, setCompanyId] = useState(currentCompanyId ?? '');
  const [position, setPosition] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCompanyId(currentCompanyId ?? '');
    setLoadFailed(false);
    api.companies.list()
      .then((res) => setCompanies(asArray(res.companies).map((item) => {
        const c = asRecord(item);
        return { id: asString(c.id), name: asString(c.companyNameThai, asString(c.companyName, '-')) };
      })))
      .catch(() => setLoadFailed(true));
  }, [open, currentCompanyId]);

  const target = studentId ?? studentCode.trim();

  const save = async () => {
    if (!target || !companyId) return;
    setSaving(true);
    try {
      await api.internship.bindCompany(target, { companyId, ...(position.trim() ? { position: position.trim() } : {}) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.internships.all() });
      toast.success(th ? 'บันทึกสถานประกอบการแล้ว นักศึกษาเริ่มบันทึกไดอารี่ได้' : 'Company saved; the student can start the diary');
      setStudentCode('');
      setPosition('');
      onOpenChange(false);
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 0;
      toast.error(
        status === 404
          ? (th ? 'ไม่พบนักศึกษาหรือบริษัทนี้' : 'Student or company not found')
          : status === 409
            ? (th ? 'การฝึกงานนี้จบแล้ว ต้องเปิดใหม่ก่อนเปลี่ยนบริษัท' : 'This internship is completed; reopen it first')
            : (th ? 'บันทึกไม่สำเร็จ' : 'Could not save'),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{currentCompanyId ? (th ? 'เปลี่ยนสถานประกอบการ' : 'Change company') : (th ? 'เพิ่มสถานประกอบการให้นักศึกษา' : 'Add a company to a student')}</DialogTitle>
          <DialogDescription>
            {th
              ? 'ใช้เมื่อนักศึกษาได้ที่ฝึกงานนอกระบบสมัครงาน ถ้าบริษัทตอบรับใบสมัครฝึกงานในระบบ จะผูกให้อัตโนมัติ'
              : 'For placements made outside the job board; accepting an internship application in the system ties the company automatically.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="bind-student">{th ? 'นักศึกษา' : 'Student'}</Label>
            {studentId ? (
              <p className="text-sm font-medium">{studentLabel ?? studentId}</p>
            ) : (
              <Input id="bind-student" data-testid="bind-student" value={studentCode} onChange={(e) => setStudentCode(e.target.value)} placeholder={th ? 'รหัสนักศึกษา' : 'Student ID'} />
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bind-company">{th ? 'บริษัท' : 'Company'}</Label>
            {loadFailed ? (
              <p role="alert" className="text-sm text-rose-600">{th ? 'โหลดรายชื่อบริษัทไม่สำเร็จ' : 'Could not load companies'}</p>
            ) : (
              <select
                id="bind-company"
                data-testid="bind-company"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="">{th ? '— เลือกบริษัท —' : '— choose —'}</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bind-position">{th ? 'ตำแหน่ง (ไม่บังคับ)' : 'Position (optional)'}</Label>
            <Input id="bind-position" value={position} onChange={(e) => setPosition(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>{th ? 'ยกเลิก' : 'Cancel'}</Button>
          <Button data-testid="bind-save" onClick={() => void save()} disabled={saving || !target || !companyId}>
            {saving ? (th ? 'กำลังบันทึก...' : 'Saving...') : (th ? 'บันทึก' : 'Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
