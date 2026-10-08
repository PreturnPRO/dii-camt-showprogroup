import React from 'react';
import { Clock, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { asArray, asRecord, asString } from '@/lib/live-data';

type Slot = { day: string; startTime: string; endTime: string; location: string };

const DAYS: Array<{ value: string; label: string }> = [
  { value: 'monday', label: 'จันทร์' },
  { value: 'tuesday', label: 'อังคาร' },
  { value: 'wednesday', label: 'พุธ' },
  { value: 'thursday', label: 'พฤหัสบดี' },
  { value: 'friday', label: 'ศุกร์' },
  { value: 'saturday', label: 'เสาร์' },
  { value: 'sunday', label: 'อาทิตย์' },
];

/** A lecturer's weekly office hours; each row is one bookable slot (M1). */
export function OfficeHoursEditor({ userId }: { userId: string }) {
  const [slots, setSlots] = React.useState<Slot[] | null>(null);
  const [loadFailed, setLoadFailed] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!userId) return;
    let mounted = true;
    api.offices.slots(userId)
      .then((response) => {
        if (!mounted) return;
        setSlots(asArray(asRecord(response).officeHours).map((item) => {
          const slot = asRecord(item);
          return { day: asString(slot.day, 'monday'), startTime: asString(slot.startTime), endTime: asString(slot.endTime), location: asString(slot.location) };
        }));
      })
      .catch(() => { if (mounted) setLoadFailed(true); });
    return () => { mounted = false; };
  }, [userId]);

  const update = (index: number, patch: Partial<Slot>) =>
    setSlots((current) => (current ?? []).map((slot, i) => (i === index ? { ...slot, ...patch } : slot)));

  const invalid = (slots ?? []).some((slot) => !slot.startTime || !slot.endTime || slot.startTime >= slot.endTime || !slot.location.trim());
  // the server refuses overlapping rows on one day (one lecturer cannot be booked twice at once)
  const overlapping = (slots ?? []).some((a, i) => (slots ?? []).some((b, j) => i !== j && a.day === b.day && a.startTime < b.endTime && b.startTime < a.endTime));

  const save = async () => {
    if (!slots || invalid || overlapping) return;
    setSaving(true);
    try {
      await api.offices.replace({ officeHours: slots.map((slot) => ({ ...slot, location: slot.location.trim() })) });
      toast.success('บันทึก office hours แล้ว นักศึกษาจองตามช่วงเวลานี้ได้');
    } catch (error) {
      toast.error('บันทึก office hours ไม่สำเร็จ ตรวจเวลาและสถานที่ของแต่ละแถวแล้วลองใหม่');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm" data-testid="office-hours-editor">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" />Office hours ของฉัน</CardTitle>
        <CardDescription>แต่ละแถวคือช่วงเวลาที่นักศึกษาจองได้ 1 คนต่อครั้ง ทุกสัปดาห์</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loadFailed ? (
          <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">โหลด office hours ไม่สำเร็จ กรุณารีเฟรชหน้า</p>
        ) : slots === null ? (
          <p role="status" className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />กำลังโหลด...</p>
        ) : (
          <>
            {slots.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">ยังไม่มี office hours — นักศึกษาจะยังจองนัดกับคุณไม่ได้</p>}
            {slots.map((slot, index) => (
              <div key={index} data-testid="office-hour-row" className="grid grid-cols-2 gap-2 sm:grid-cols-[9rem_7rem_7rem_1fr_auto] sm:items-center">
                <Select value={slot.day} onValueChange={(day) => update(index, { day })}>
                  <SelectTrigger aria-label="วัน"><SelectValue /></SelectTrigger>
                  <SelectContent>{DAYS.map((day) => <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="time" aria-label="เริ่ม" value={slot.startTime} onChange={(event) => update(index, { startTime: event.target.value })} />
                <Input type="time" aria-label="สิ้นสุด" value={slot.endTime} onChange={(event) => update(index, { endTime: event.target.value })} />
                <Input aria-label="สถานที่" placeholder="เช่น CAMT 301" value={slot.location} onChange={(event) => update(index, { location: event.target.value })} />
                <Button type="button" variant="ghost" size="icon" aria-label="ลบช่วงเวลานี้" onClick={() => setSlots((current) => (current ?? []).filter((_, i) => i !== index))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {invalid && <p className="text-xs text-rose-600 dark:text-rose-400">ทุกแถวต้องมีสถานที่ และเวลาสิ้นสุดต้องหลังเวลาเริ่ม</p>}
            {overlapping && <p className="text-xs text-rose-600 dark:text-rose-400">ช่วงเวลาในวันเดียวกันซ้อนกันอยู่ — แก้ให้ไม่ทับกันก่อนบันทึก</p>}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setSlots((current) => [...(current ?? []), { day: 'monday', startTime: '13:00', endTime: '13:30', location: '' }])}>
                <Plus className="mr-1.5 h-4 w-4" />เพิ่มช่วงเวลา
              </Button>
              <Button type="button" size="sm" disabled={saving || invalid || overlapping} onClick={save}>
                {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}บันทึก office hours
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
