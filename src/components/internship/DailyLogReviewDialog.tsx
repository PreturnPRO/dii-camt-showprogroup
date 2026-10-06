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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { DailyLogItem } from './types';

interface DailyLogReviewDialogProps {
  log: DailyLogItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveReview: (logId: string, status: 'approved' | 'needs_revision', comment: string) => Promise<void>;
}

export function DailyLogReviewDialog({
  log,
  isOpen,
  onClose,
  onSaveReview,
}: DailyLogReviewDialogProps) {
  const { language } = useLanguage();
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'needs_revision'>('approved');
  const [reviewComment, setReviewComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (log) {
      setReviewStatus(log.status === 'needs_revision' ? 'needs_revision' : 'approved');
      setReviewComment(log.mentorComment || '');
    }
  }, [log]);

  if (!log) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveReview(log.id, reviewStatus, reviewComment);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <CheckCircle2 className="w-5 h-5 text-orange-600" />
            {language === 'th' ? 'ตรวจสอบบันทึกการทำงานรายวัน' : 'Review Student Daily Log'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {log.date && `${language === 'th' ? 'วันที่บันทึก:' : 'Date:'} ${log.date} (${log.hours} ${language === 'th' ? 'ชั่วโมง' : 'hours'})`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
            <span className="font-semibold block mb-1 text-slate-900 dark:text-slate-100">
              {language === 'th' ? 'งานที่นักศึกษาปฏิบัติในวันนี้:' : 'Student Activities:'}
            </span>
            <p className="line-clamp-3 leading-relaxed">{log.activities}</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              {language === 'th' ? 'ผลการตรวจสอบ *' : 'Review Status *'}
            </Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={reviewStatus === 'approved' ? 'default' : 'outline'}
                onClick={() => setReviewStatus('approved')}
                className={`flex-1 rounded-xl text-xs gap-1.5 ${
                  reviewStatus === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                {language === 'th' ? 'อนุมัติ (Approved)' : 'Approve'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={reviewStatus === 'needs_revision' ? 'default' : 'outline'}
                onClick={() => setReviewStatus('needs_revision')}
                className={`flex-1 rounded-xl text-xs gap-1.5 ${
                  reviewStatus === 'needs_revision' ? 'bg-rose-600 hover:bg-rose-700 text-white' : ''
                }`}
              >
                <AlertCircle className="w-4 h-4" />
                {language === 'th' ? 'ขอให้แก้ไข (Needs Revision)' : 'Needs Revision'}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              {language === 'th' ? 'ข้อเสนอแนะ / ความคิดเห็นจาก Mentor' : 'Mentor Comment / Feedback'}
            </Label>
            <Textarea
              rows={3}
              placeholder={
                language === 'th'
                  ? 'พิมพ์คำแนะนำ ข้อเสนอแนะ หรือสิ่งที่นักศึกษาควรปรับปรุง...'
                  : 'Provide feedback or suggestions for the student...'
              }
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
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
            disabled={isSaving}
            className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold flex items-center gap-1.5"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                {language === 'th' ? 'กำลังบันทึก...' : 'Saving...'}
              </>
            ) : (
              language === 'th' ? 'บันทึกผลการตรวจ' : 'Save Review'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
