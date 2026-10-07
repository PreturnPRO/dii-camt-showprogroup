import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface RescheduleDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    courseCode: string;
    fromLabel: string;
    toLabel: string;
}

/** only permanent moves exist until per-date changes are built (F3b) */
export function RescheduleDialog({ open, onOpenChange, onConfirm, courseCode, fromLabel, toLabel }: RescheduleDialogProps) {
    const { language } = useLanguage();
    const isTH = language !== 'en';
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isTH ? `ย้ายคาบ ${courseCode}` : `Move ${courseCode}`}</DialogTitle>
                    <DialogDescription>
                        {isTH
                            ? `${fromLabel} → ${toLabel} · มีผลทุกสัปดาห์ของเทอม นักศึกษาที่ลงตอนนี้จะเห็นเวลาใหม่ทันที`
                            : `${fromLabel} → ${toLabel} · applies every week of the term; enrolled students see the new time right away`}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>{isTH ? 'ยกเลิก' : 'Cancel'}</Button>
                    <Button onClick={onConfirm}>{isTH ? 'ยืนยันย้าย' : 'Confirm'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
