import React from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, ApiError } from '@/lib/api';
import { asArray, asRecord, asString } from '@/lib/live-data';
import { thaiToday } from '@/lib/thai-date';
import { addDays, DAY_LABELS, formatMinutes, moveSource, type Occurrence } from '@/lib/timetable';

type Clash = { start: number; end: number; label: string };
type CheckResult = { roomClashes: Clash[]; lecturerClashes: Clash[]; studentClashes: Array<{ courseCode: string; count: number }>; newEnd: string; room: string };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  occurrence: Occurrence | null;
  mode: 'move' | 'request';
  initialDate?: string;
  initialStart?: string;
  onDone: () => void;
}

const START_TIMES = Array.from({ length: 30 }, (_, i) => formatMinutes(7 * 60 + i * 30)); // 07:00–21:30

export function ClassMoveDialog({ open, onOpenChange, occurrence, mode, initialDate, initialStart, onDone }: Props) {
  const { language } = useLanguage();
  const isTH = language !== 'en';
  const [date, setDate] = React.useState('');
  const [start, setStart] = React.useState('');
  const [facilityId, setFacilityId] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [rooms, setRooms] = React.useState<Array<{ id: string; label: string }>>([]);
  const [check, setCheck] = React.useState<CheckResult | null>(null);
  const [checkError, setCheckError] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open || !occurrence) return;
    setDate(initialDate ?? '');
    setStart(initialStart ?? formatMinutes(occurrence.start));
    setReason('');
    setCheck(null);
    setFacilityId('');
    api.facilities.list().then((r) => setRooms(asArray(r.facilities)
      .map((f) => asRecord(f))
      .filter((f) => f.isActive !== false)
      .map((f) => ({ id: asString(f.id), label: `${asString(f.code)} ${asString(f.building)}-${asString(f.room)}` })))).catch(() => setRooms([]));
  }, [open, occurrence, initialDate, initialStart]);

  const source = occurrence ? moveSource(occurrence) : null;
  const body = occurrence && source && date && start ? {
    sectionId: occurrence.section?.id, originalDate: source.date, originalStart: source.start,
    newDate: date, newStart: start, ...(facilityId ? { facilityId } : {}),
  } : null;

  React.useEffect(() => {
    if (!open || !body) return;
    let alive = true;
    api.classMoves.check(body)
      .then((r) => { if (alive) { setCheck(r as unknown as CheckResult); setCheckError(''); } })
      .catch((e) => {
        if (!alive) return;
        setCheck(null);
        // the course has no room in the system and "usual room" was kept
        const roomRequired = e instanceof ApiError && asRecord(asRecord(e.details).details).code === 'ROOM_REQUIRED';
        setCheckError(roomRequired
          ? (isTH ? 'วิชานี้ยังไม่มีห้องในระบบ เลือกห้องใหม่ก่อนส่ง' : 'This course has no room in the system — choose a room first')
          : e instanceof Error ? e.message : 'check failed');
      });
    return () => { alive = false; };
  }, [open, JSON.stringify(body)]);

  const blocked = !!check && (check.roomClashes.length > 0 || check.lecturerClashes.length > 0);
  const canSubmit = !!body && !!check && !blocked && reason.trim().length > 0 && !saving;
  const range = (c: Clash) => `${c.label} ${formatMinutes(c.start)}–${formatMinutes(c.end)}`;

  const submit = async () => {
    if (!body) return;
    setSaving(true);
    try {
      await api.classMoves.create({ ...body, reason });
      toast.success(mode === 'move' ? (isTH ? 'ย้ายคาบแล้ว' : 'Class moved') : (isTH ? 'ส่งคำขอแล้ว รอ staff อนุมัติ' : 'Request sent'));
      onOpenChange(false);
      onDone();
    } catch (error) {
      // keep the dialog and what was typed; say why
      toast.error(isTH ? 'บันทึกไม่สำเร็จ' : 'Could not save', { description: error instanceof Error ? error.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  if (!occurrence) return null;
  const dayName = DAY_LABELS[occurrence.day];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'move' ? (isTH ? 'ย้ายคาบเฉพาะครั้ง' : 'Move one class') : (isTH ? 'ขอย้ายคาบ' : 'Ask to move a class')}</DialogTitle>
          <DialogDescription>
            {occurrence.course.code}{occurrence.section ? ` ${isTH ? 'ตอน' : 'sec'} ${occurrence.section.sectionNumber}` : ''} · {isTH ? dayName.th : dayName.en} {occurrence.date} {formatMinutes(occurrence.start)}–{formatMinutes(occurrence.end)} · {occurrence.slot.room || occurrence.section?.room || '-'}
            {occurrence.kind === 'moved-in' && occurrence.move && ` · ${isTH ? 'ย้ายมาจาก' : 'moved from'} ${occurrence.move.originalDate} ${occurrence.move.originalStart}`}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Label>{isTH ? 'วันใหม่' : 'New day'}<Input data-testid="move-date" type="date" min={addDays(thaiToday(), 1)} value={date} onChange={(e) => setDate(e.target.value)} /></Label>
          <Label>{isTH ? 'เวลาเริ่ม' : 'Start'}
            <select data-testid="move-start" className="mt-1 w-full rounded-md border p-2 dark:bg-slate-900" value={start} onChange={(e) => setStart(e.target.value)}>
              {START_TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Label>
          <Label>{isTH ? 'ห้อง' : 'Room'}
            <select data-testid="move-room" className="mt-1 w-full rounded-md border p-2 dark:bg-slate-900" value={facilityId} onChange={(e) => setFacilityId(e.target.value)}>
              <option value="">{isTH ? 'ห้องเดิม' : 'Usual room'}</option>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </Label>
          <Label>{isTH ? 'เหตุผล' : 'Reason'}<Textarea data-testid="move-reason" value={reason} onChange={(e) => setReason(e.target.value)} /></Label>
          {check && <p className="text-sm text-slate-600 dark:text-slate-300">{isTH ? `จบ ${check.newEnd} · ห้อง ${check.room}` : `Ends ${check.newEnd} · room ${check.room}`}</p>}
          {checkError && <p data-testid="move-clash-block" className="text-sm text-red-600">🔴 {checkError}</p>}
          {check?.roomClashes.map((c) => <p key={`r${c.label}${c.start}`} data-testid="move-clash-block" className="text-sm text-red-600">🔴 {isTH ? `ห้องไม่ว่าง (${range(c)})` : `Room busy (${range(c)})`}</p>)}
          {check?.lecturerClashes.map((c) => <p key={`l${c.label}${c.start}`} data-testid="move-clash-block" className="text-sm text-red-600">🔴 {isTH ? `อาจารย์มีคาบ ${range(c)}` : `Lecturer teaches ${range(c)}`}</p>)}
          {check?.studentClashes.map((c) => <p key={`s${c.courseCode}`} data-testid="move-clash-warn" className="text-sm text-amber-600">🟡 {isTH ? `นักศึกษา ${c.count} คนชนกับ ${c.courseCode}` : `${c.count} students also have ${c.courseCode}`}</p>)}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{isTH ? 'ยกเลิก' : 'Cancel'}</Button>
          <Button data-testid="move-submit" disabled={!canSubmit} onClick={submit}>{mode === 'move' ? (isTH ? 'ย้ายคาบ' : 'Move') : (isTH ? 'ส่งคำขอ' : 'Send request')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
