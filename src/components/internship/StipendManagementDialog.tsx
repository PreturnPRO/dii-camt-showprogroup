import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CreditCard, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { InternRow, MonthlyPayment } from './types';

interface StipendManagementDialogProps {
  intern: InternRow | null;
  payment?: MonthlyPayment | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveStipend: (internId: string, updatedPayment: MonthlyPayment) => void;
}

export function StipendManagementDialog({
  intern,
  payment,
  isOpen,
  onClose,
  onSaveStipend,
}: StipendManagementDialogProps) {
  const { language } = useLanguage();

  const [month, setMonth] = useState('กันยายน 2569');
  const [expectedAmount, setExpectedAmount] = useState<number>(12000);
  const [actualAmount, setActualAmount] = useState<number>(12000);
  const [status, setStatus] = useState<MonthlyPayment['status']>('paid_full');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (payment) {
      setMonth(payment.month);
      setExpectedAmount(payment.expectedAmount);
      setActualAmount(payment.actualAmount);
      setStatus(payment.status);
      setNotes(payment.notes || '');
    } else if (intern) {
      setMonth(intern.stipend.currentMonth);
      setExpectedAmount(intern.stipend.monthlyRate);
      setActualAmount(intern.stipend.currentMonthActual);
      setStatus(intern.stipend.currentMonthStatus);
      setNotes('');
    }
  }, [payment, intern]);

  if (!intern) return null;

  const handleSave = () => {
    const updated: MonthlyPayment = {
      id: payment?.id || `payment-${Date.now()}`,
      month,
      expectedAmount,
      actualAmount,
      status,
      paidDate: status === 'paid_full' ? new Date().toISOString().slice(0, 10) : payment?.paidDate,
      notes: notes.trim() || undefined,
    };
    onSaveStipend(intern.id, updated);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <CreditCard className="w-5 h-5 text-orange-600" />
            {language === 'th'
              ? 'บันทึก / อัปเดตสถานะเบี้ยเลี้ยงนักศึกษา (Staff)'
              : 'Update Student Stipend Status (Staff)'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {language === 'th' ? 'นักศึกษา:' : 'Student:'} {intern.name} ({intern.company})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{language === 'th' ? 'รอบเดือน *' : 'Month Cycle *'}</Label>
            <Input
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              placeholder="เช่น กันยายน 2569"
              className="rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                {language === 'th' ? 'ยอดตามสัญญา (บาท) *' : 'Expected Amount (THB) *'}
              </Label>
              <Input
                type="number"
                value={expectedAmount}
                onChange={(e) => setExpectedAmount(Number(e.target.value) || 0)}
                className="rounded-xl text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                {language === 'th' ? 'ยอดที่จ่ายจริง (บาท) *' : 'Actual Paid (THB) *'}
              </Label>
              <Input
                type="number"
                value={actualAmount}
                onChange={(e) => setActualAmount(Number(e.target.value) || 0)}
                className="rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border text-xs flex justify-between items-center">
            <span className="text-slate-500">{language === 'th' ? 'ผลต่างยอดเงิน:' : 'Difference:'}</span>
            <span
              className={`font-mono font-bold ${
                actualAmount >= expectedAmount ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {actualAmount >= expectedAmount
                ? language === 'th'
                  ? 'ครบถ้วน 100%'
                  : '100% Paid'
                : language === 'th'
                ? `ขาด ฿${(expectedAmount - actualAmount).toLocaleString()}`
                : `Missing ฿${(expectedAmount - actualAmount).toLocaleString()}`}
            </span>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              {language === 'th' ? 'สถานะการจ่ายเงิน *' : 'Payment Status *'}
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                size="sm"
                variant={status === 'paid_full' ? 'default' : 'outline'}
                onClick={() => setStatus('paid_full')}
                className={`rounded-xl text-[11px] gap-1 ${
                  status === 'paid_full' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {language === 'th' ? 'จ่ายครบแล้ว' : 'Paid Full'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={status === 'paid_partial' ? 'default' : 'outline'}
                onClick={() => setStatus('paid_partial')}
                className={`rounded-xl text-[11px] gap-1 ${
                  status === 'paid_partial' ? 'bg-rose-600 hover:bg-rose-700 text-white' : ''
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                {language === 'th' ? 'จ่ายไม่ครบ' : 'Partial'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={status === 'pending' ? 'default' : 'outline'}
                onClick={() => setStatus('pending')}
                className={`rounded-xl text-[11px] gap-1 ${
                  status === 'pending' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                {language === 'th' ? 'รอการโอน' : 'Pending'}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              {language === 'th' ? 'หมายเหตุ / รายละเอียดการประสานงาน' : 'Notes / Remarks'}
            </Label>
            <Textarea
              rows={2}
              placeholder={
                language === 'th'
                  ? 'เช่น โอนผ่าน SCB ครบถ้วน หรือ ประสานงานบัญชีจะโอนส่วนที่เหลือในวันที่...'
                  : 'Notes regarding payment...'
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-xl text-xs leading-relaxed"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="rounded-xl text-xs">
            {language === 'th' ? 'ยกเลิก' : 'Cancel'}
          </Button>
          <Button
            onClick={handleSave}
            className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold"
          >
            {language === 'th' ? 'บันทึกสถานะ' : 'Save Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
