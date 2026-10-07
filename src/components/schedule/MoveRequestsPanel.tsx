import React from 'react';
import { toast } from 'sonner';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, type ClassMoveView, type MoveCheck } from '@/lib/api';
import { formatMinutes } from '@/lib/timetable';

interface Props {
  /** called after a request is approved or rejected, so the timetable can reload */
  onDecided: () => void;
}

/** lecturers' class move requests waiting for staff, each with a fresh clash check */
export function MoveRequestsPanel({ onDecided }: Props) {
  const { language } = useLanguage();
  const isTH = language !== 'en';
  const [requests, setRequests] = React.useState<ClassMoveView[]>([]);
  const [checks, setChecks] = React.useState<Record<string, MoveCheck | string>>({});
  const [rejecting, setRejecting] = React.useState<ClassMoveView | null>(null);
  const [note, setNote] = React.useState('');

  const load = React.useCallback(async () => {
    try {
      const { moves } = await api.classMoves.pending();
      setRequests(moves);
      const results = await Promise.all(moves.map(async (m) => {
        try {
          const check = await api.classMoves.check({
            sectionId: m.sectionId, originalDate: m.originalDate, originalStart: m.originalStart,
            newDate: m.newDate, newStart: m.newStart, ...(m.facilityId ? { facilityId: m.facilityId } : {}),
          });
          return [m.id, check as unknown as MoveCheck] as const;
        } catch (error) {
          return [m.id, error instanceof Error ? error.message : 'check failed'] as const;
        }
      }));
      setChecks(Object.fromEntries(results));
    } catch {
      setRequests([]);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const decide = async (action: () => Promise<unknown>, done: string) => {
    try {
      await action();
      toast.success(done);
      await load();
      onDecided();
    } catch (error) {
      toast.error(isTH ? 'ทำรายการไม่สำเร็จ' : 'Could not complete', { description: error instanceof Error ? error.message : undefined });
    }
  };

  const range = (c: { start: number; end: number; label: string }) => `${c.label} ${formatMinutes(c.start)}–${formatMinutes(c.end)}`;

  return (
    <div data-testid="schedule-requests" className="bg-amber-50/80 border border-amber-200 rounded-3xl p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
      <h3 className="text-lg font-bold text-amber-800 dark:text-slate-200 flex items-center gap-2 mb-4">
        <Bell className="w-5 h-5" /> {isTH ? `คำขอย้ายคาบจากอาจารย์ (${requests.length})` : `Class move requests (${requests.length})`}
      </h3>
      {requests.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{isTH ? 'ไม่มีคำขอย้ายคาบ' : 'No class move requests'}</p>
      ) : (
        <div className="space-y-3">
          {requests.map((m) => {
            const check = checks[m.id];
            const blocked = typeof check === 'string' || (!!check && (check.roomClashes.length > 0 || check.lecturerClashes.length > 0));
            return (
              <div key={m.id} data-testid="move-request" className="bg-white p-4 rounded-2xl border border-amber-100 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1 text-sm">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{m.courseCode} {isTH ? 'ตอน' : 'sec'} {m.sectionNumber} · {m.courseName}</div>
                    <div className="text-slate-600 dark:text-slate-300">{m.originalDate} {m.originalStart}–{m.originalEnd} → {m.newDate} {m.newStart}–{m.newEnd} · {isTH ? 'ห้อง' : 'room'} {m.room ?? '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">{isTH ? 'เหตุผล' : 'Reason'}: {m.reason}</div>
                    {typeof check === 'string' && <div className="text-red-600">🔴 {check}</div>}
                    {check && typeof check !== 'string' && (
                      <>
                        {check.roomClashes.map((c) => <div key={`r${c.label}${c.start}`} className="text-red-600">🔴 {isTH ? `ห้องไม่ว่าง (${range(c)})` : `Room busy (${range(c)})`}</div>)}
                        {check.lecturerClashes.map((c) => <div key={`l${c.label}${c.start}`} className="text-red-600">🔴 {isTH ? `อาจารย์มีคาบ ${range(c)}` : `Lecturer teaches ${range(c)}`}</div>)}
                        {check.studentClashes.map((c) => <div key={`s${c.courseCode}`} className="text-amber-600">🟡 {isTH ? `นักศึกษา ${c.count} คนชนกับ ${c.courseCode}` : `${c.count} students also have ${c.courseCode}`}</div>)}
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => { setRejecting(m); setNote(''); }}>{isTH ? 'ปฏิเสธ' : 'Reject'}</Button>
                    <Button size="sm" className="rounded-xl bg-emerald-600 hover:bg-emerald-700" disabled={blocked || !check}
                      onClick={() => decide(() => api.classMoves.approve(m.id), isTH ? 'อนุมัติแล้ว' : 'Approved')}>
                      {isTH ? 'อนุมัติ' : 'Approve'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Dialog open={!!rejecting} onOpenChange={(open) => { if (!open) setRejecting(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isTH ? `ไม่อนุมัติคำขอ ${rejecting?.courseCode ?? ''}` : `Reject ${rejecting?.courseCode ?? ''}`}</DialogTitle></DialogHeader>
          <Textarea data-testid="reject-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={isTH ? 'เหตุผล (จะส่งถึงอาจารย์)' : 'Reason (sent to the lecturer)'} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>{isTH ? 'ยกเลิก' : 'Cancel'}</Button>
            <Button disabled={!note.trim()} onClick={() => {
              const target = rejecting;
              setRejecting(null);
              if (target) void decide(() => api.classMoves.reject(target.id, note.trim()), isTH ? 'ปฏิเสธแล้ว' : 'Rejected');
            }}>{isTH ? 'ยืนยันไม่อนุมัติ' : 'Reject'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
