import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';

// Accounts created by staff/admin start with a temporary password; block the app until the user sets their own.
export function ForcePasswordChangeDialog() {
  const { user, updateProfile, logout } = useAuth();
  const [form, setForm] = React.useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = React.useState(false);
  const open = Boolean(user?.mustChangePassword);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.next.length < 8) {
      toast.error('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร');
      return;
    }
    if (form.next !== form.confirm) {
      toast.error('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ currentPassword: form.current, newPassword: form.next });
      toast.success('ตั้งรหัสผ่านใหม่แล้ว');
      setForm({ current: '', next: '', confirm: '' });
    } catch {
      toast.error('รหัสผ่านชั่วคราวไม่ถูกต้อง');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
        className="[&>button]:hidden"
      >
        <DialogHeader>
          <DialogTitle className="leading-snug">ตั้งรหัสผ่านใหม่</DialogTitle>
          <DialogDescription className="leading-relaxed">
            บัญชีนี้ใช้รหัสผ่านชั่วคราว ตั้งรหัสผ่านของคุณเองก่อนใช้งานต่อ
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="fpc-current">รหัสผ่านชั่วคราว</Label>
            <Input id="fpc-current" type="password" autoComplete="current-password" value={form.current} onChange={(event) => setForm({ ...form, current: event.target.value })} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="fpc-next">รหัสผ่านใหม่</Label>
            <Input id="fpc-next" type="password" autoComplete="new-password" value={form.next} onChange={(event) => setForm({ ...form, next: event.target.value })} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="fpc-confirm">ยืนยันรหัสผ่านใหม่</Label>
            <Input id="fpc-confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={(event) => setForm({ ...form, confirm: event.target.value })} required />
          </div>
          <Button type="submit" disabled={saving}>บันทึกรหัสผ่าน</Button>
          <Button type="button" variant="ghost" onClick={() => void logout()}>ออกจากระบบ</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
