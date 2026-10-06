import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export interface TemporaryCredential {
  label: string;
  email: string;
  temporaryPassword: string;
}

// Accounts created or reset by staff get a random temporary password that is shown only once.
// Keep this dialog open until staff close it, so they can copy and hand the passwords over.
export function TemporaryPasswordsDialog({ items, onClose }: { items: TemporaryCredential[]; onClose: () => void }) {
  const copyAll = async () => {
    const text = items.map((item) => `${item.email}\t${item.temporaryPassword}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success('คัดลอกแล้ว');
    } catch {
      toast.error('คัดลอกไม่ได้ เลือกข้อความแล้วคัดลอกเอง');
    }
  };

  return (
    <Dialog open={items.length > 0} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="leading-snug">รหัสผ่านชั่วคราว ({items.length} บัญชี)</DialogTitle>
          <DialogDescription className="leading-relaxed">
            แสดงครั้งเดียวเท่านั้น ส่งให้เจ้าของบัญชี แล้วเขาจะต้องตั้งรหัสใหม่ตอนเข้าใช้ครั้งแรก
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 text-left text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">บัญชี</th>
                <th className="px-3 py-2 font-medium">อีเมลสำหรับเข้าระบบ</th>
                <th className="px-3 py-2 font-medium">รหัสผ่านชั่วคราว</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.email} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-3 py-2 leading-relaxed">{item.label}</td>
                  <td className="px-3 py-2 break-all">{item.email}</td>
                  <td className="px-3 py-2 font-mono select-all" data-testid="temp-password">{item.temporaryPassword}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={copyAll}>คัดลอกทั้งหมด</Button>
          <Button onClick={onClose}>ปิด</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
