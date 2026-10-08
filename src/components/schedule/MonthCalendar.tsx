import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { formatMinutes, monthGrid, shiftMonth, type Occurrence } from '@/lib/timetable';

interface MonthCalendarProps {
  /** YYYY-MM */
  month: string;
  /** dated classes of the month (see monthOccurrences) */
  byDate: Record<string, Occurrence[]>;
  today: string;
  onMonthChange: (month: string) => void;
  onOpenWeek?: (date: string) => void;
}

const DAYS_HEADER = [
  { en: 'Mon', th: 'จันทร์' },
  { en: 'Tue', th: 'อังคาร' },
  { en: 'Wed', th: 'พุธ' },
  { en: 'Thu', th: 'พฤหัสบดี' },
  { en: 'Fri', th: 'ศุกร์' },
  { en: 'Sat', th: 'เสาร์' },
  { en: 'Sun', th: 'อาทิตย์' },
];

const roomOf = (o: Occurrence) => [o.slot.room || o.section?.room, o.slot.building].filter(Boolean).join(' ') || '-';

export function MonthCalendar({ month, byDate, today, onMonthChange, onOpenWeek }: MonthCalendarProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isTH = language !== 'en';
  const [openDate, setOpenDate] = React.useState<string | null>(null);
  const cells = monthGrid(month);
  const label = new Date(`${month}-01T00:00:00Z`).toLocaleDateString(isTH ? 'th-TH' : 'en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const openEvents = openDate ? byDate[openDate] ?? [] : [];

  return (
    <div data-testid="month-calendar" className="w-full select-none">
      <div className="flex items-center justify-between mb-3">
        <Button data-testid="month-prev" variant="outline" size="icon" className="rounded-xl" aria-label={isTH ? 'เดือนก่อน' : 'Previous month'} onClick={() => onMonthChange(shiftMonth(month, -1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="font-semibold text-slate-800 dark:text-slate-200">{label}</span>
        <Button data-testid="month-next" variant="outline" size="icon" className="rounded-xl" aria-label={isTH ? 'เดือนถัดไป' : 'Next month'} onClick={() => onMonthChange(shiftMonth(month, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-t-xl">
        {DAYS_HEADER.map((d) => (
          <div key={d.en} className="py-2.5 px-2 text-center border-r last:border-r-0 border-slate-200 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 block">{isTH ? d.th : d.en}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 border-l border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-b-xl overflow-hidden">
        {cells.map((cell) => {
          const dayNumber = Number(cell.date.slice(8));
          if (!cell.inMonth) {
            return (
              <div key={cell.date} className="min-h-[105px] sm:min-h-[120px] p-1.5 sm:p-2 border-r border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-600">
                <span className="text-xs font-mono">{dayNumber}</span>
              </div>
            );
          }
          const events = byDate[cell.date] ?? [];
          const visible = events.slice(0, 3);
          const isToday = cell.date === today;
          return (
            <button
              type="button"
              key={cell.date}
              data-testid="month-day"
              data-date={cell.date}
              onClick={() => setOpenDate(cell.date)}
              className={cn(
                'min-h-[105px] sm:min-h-[120px] p-1.5 sm:p-2 border-r border-b border-slate-200 dark:border-slate-800 flex flex-col text-left transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500',
                isToday ? 'bg-blue-50 dark:bg-blue-950' : 'bg-white dark:bg-slate-900',
              )}
            >
              <div className="flex items-center justify-between w-full">
                <span className={cn('text-xs font-mono font-medium inline-flex items-center justify-center w-6 h-6 rounded-full', isToday ? 'bg-blue-600 text-white font-bold' : 'text-slate-700 dark:text-slate-300')}>
                  {dayNumber}
                </span>
                {events.length > 0 && (
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 hidden sm:inline-block">
                    {events.length} {isTH ? 'คาบ' : 'classes'}
                  </span>
                )}
              </div>
              <div className="flex-1 my-1 space-y-1 overflow-hidden w-full">
                {visible.map((o) => (
                  <div
                    key={o.key}
                    data-testid="month-event"
                    data-course={o.course.code}
                    title={`${o.course.code} ${isTH ? o.course.nameThai || o.course.name : o.course.name} (${formatMinutes(o.start)}–${formatMinutes(o.end)}) @ ${roomOf(o)}`}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-[10px] font-mono text-blue-700 dark:text-blue-300 truncate"
                  >
                    <span className="font-semibold shrink-0">{formatMinutes(o.start)}</span>
                    <span className="truncate font-medium">{o.course.code}</span>
                  </div>
                ))}
                {events.length > visible.length && (
                  <div className="text-[10px] font-mono font-medium text-blue-700 dark:text-blue-300 pl-1">
                    +{events.length - visible.length} {isTH ? 'เพิ่มเติม' : 'more'}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <Dialog open={!!openDate} onOpenChange={(open) => !open && setOpenDate(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              {openDate && new Date(`${openDate}T00:00:00Z`).toLocaleDateString(isTH ? 'th-TH' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              {openEvents.length === 0
                ? (isTH ? 'วันนี้ไม่มีคาบเรียน' : 'No classes on this day')
                : (isTH ? `คาบเรียนในวันนี้ ${openEvents.length} คาบ` : `${openEvents.length} classes on this day`)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 mt-3 max-h-[60vh] overflow-y-auto pr-1">
            {openEvents.map((o) => (
              <button
                type="button"
                key={o.key}
                data-testid="month-dialog-class"
                onClick={() => { setOpenDate(null); navigate('/courses'); }}
                className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-pointer"
                title={isTH ? 'ไปหน้ารายวิชา' : 'Go to courses'}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-mono font-bold text-xs text-blue-700 dark:text-blue-300">{o.course.code}</span>
                  <span className="text-[11px] font-mono text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                    {formatMinutes(o.start)} – {formatMinutes(o.end)}
                  </span>
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                  {isTH ? o.course.nameThai || o.course.name : o.course.name}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="flex items-center gap-1 font-mono"><MapPin className="w-3.5 h-3.5" />{roomOf(o)}</span>
                  {o.kind === 'moved-in' && <span className="rounded bg-amber-100 px-1 text-amber-800 dark:bg-amber-900 dark:text-amber-200">{isTH ? 'ย้ายมา' : 'Moved here'}</span>}
                </div>
              </button>
            ))}
          </div>

          {onOpenWeek && openDate && (
            <div className="mt-2 pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => { const d = openDate; setOpenDate(null); onOpenWeek(d); }}
                className="text-xs font-semibold text-blue-700 dark:text-blue-300 hover:underline cursor-pointer"
              >
                {isTH ? 'ดูตารางรายสัปดาห์ของสัปดาห์นี้ →' : 'Open this week →'}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
