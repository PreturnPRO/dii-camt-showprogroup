import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, MapPin, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ClassMoveView } from '@/lib/api';
import { thaiToday } from '@/lib/thai-date';
import {
  addDays, DAY_KEYS, DAY_LABELS, formatMinutes, visibleRange, weekOccurrences, weekOf,
  type Occurrence, type Term, type TimetableEntry,
} from '@/lib/timetable';

interface WeeklyTimetableProps {
  entries: TimetableEntry[];
  term: Term | null;
  weekStart: string;
  moves: ClassMoveView[];
  showWeekNav?: boolean;
  onWeekChange?: (weekStart: string) => void;
  /** called for regular classes that are still ahead; a moved class is changed by staff only */
  onSlotClick?: (occurrence: Occurrence) => void;
  /** extra label on a class, keyed by `${sectionId}|${date}|${HH:MM}` */
  badges?: Record<string, React.ReactNode>;
}

const ROW_PX = 28; // one row = 30 minutes

/** identifies a class by where it normally is: section, original day and start */
export const occurrenceKey = (o: Occurrence) =>
  o.kind === 'moved-in' && o.move
    ? `${o.section?.id ?? ''}|${o.move.originalDate}|${o.move.originalStart}`
    : `${o.section?.id ?? ''}|${o.date}|${formatMinutes(o.start)}`;

const shortDate = (day: string, isTH: boolean) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString(isTH ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export function WeeklyTimetable({ entries, term, weekStart, moves, showWeekNav, onWeekChange, onSlotClick, badges }: WeeklyTimetableProps) {
  const { language } = useLanguage();
  const isTH = language !== 'en';
  const today = thaiToday();
  const occurrences = React.useMemo(() => weekOccurrences(entries, weekStart, moves), [entries, weekStart, moves]);
  const range = visibleRange(occurrences);
  const hasWeekend = occurrences.some((o) => o.day === 'saturday' || o.day === 'sunday');
  const days = DAY_KEYS.slice(0, hasWeekend ? 7 : 5);
  const rows = (range.end - range.start) / 30;
  const hours = Array.from({ length: (range.end - range.start) / 60 }, (_, i) => range.start + i * 60);
  const dateOf = (i: number) => addDays(weekStart, i);
  const label = (day: string) => {
    const d = new Date(`${day}T00:00:00Z`);
    const key = DAY_KEYS[(d.getUTCDay() + 6) % 7];
    return `${isTH ? DAY_LABELS[key].short : DAY_LABELS[key].en.slice(0, 3)} ${shortDate(day, isTH)}`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-xl font-semibold">
            {term ? (isTH ? `ตารางเรียน เทอม ${term.semester}/${term.academicYear}` : `Timetable, term ${term.semester}/${term.academicYear}`) : (isTH ? 'ตารางเรียน' : 'Timetable')}
          </CardTitle>
          <div className="flex items-center gap-2">
            {showWeekNav && (
              <Button variant="ghost" size="icon" data-testid="week-prev" onClick={() => onWeekChange?.(addDays(weekStart, -7))}><ChevronLeft className="h-4 w-4" /></Button>
            )}
            <Badge variant="secondary" data-testid="week-range">{shortDate(weekStart, isTH)} – {shortDate(addDays(weekStart, 6), isTH)}</Badge>
            {showWeekNav && (
              <>
                <Button variant="ghost" size="icon" data-testid="week-next" onClick={() => onWeekChange?.(addDays(weekStart, 7))}><ChevronRight className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" data-testid="week-today" onClick={() => onWeekChange?.(weekOf(today))}>{isTH ? 'สัปดาห์นี้' : 'This week'}</Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {occurrences.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">{isTH ? 'ไม่มีคาบเรียนในสัปดาห์นี้' : 'No classes this week'}</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid min-w-[720px]" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}>
              <div />
              {days.map((day, i) => (
                <div key={day} className={cn('border-b border-slate-200 p-2 text-center text-sm font-semibold dark:border-slate-700', dateOf(i) === today && 'text-blue-600 dark:text-blue-400')}>
                  {isTH ? DAY_LABELS[day].th : DAY_LABELS[day].en} {shortDate(dateOf(i), isTH)}
                </div>
              ))}
              <div className="relative" style={{ height: rows * ROW_PX }}>
                {hours.map((h) => (
                  <div key={h} className="absolute right-2 text-xs text-slate-500 dark:text-slate-400" style={{ top: ((h - range.start) / 30) * ROW_PX - 7 }}>{formatMinutes(h)}</div>
                ))}
              </div>
              {days.map((day) => (
                <div key={day} className="relative border-l border-slate-100 dark:border-slate-800" style={{ height: rows * ROW_PX }}>
                  {hours.map((h) => (
                    <div key={h} className="absolute inset-x-0 border-t border-slate-100 dark:border-slate-800" style={{ top: ((h - range.start) / 30) * ROW_PX }} />
                  ))}
                  {occurrences.filter((o) => o.day === day).map((o) => {
                    const clickable = !!onSlotClick && o.kind === 'regular' && o.date > today;
                    const badge = badges?.[occurrenceKey(o)];
                    return (
                      <div
                        key={o.key}
                        data-testid="timetable-slot"
                        data-course={o.course.code}
                        data-day={o.day}
                        data-date={o.date}
                        data-start={formatMinutes(o.start)}
                        data-kind={o.kind}
                        onClick={clickable ? () => onSlotClick?.(o) : undefined}
                        className={cn(
                          'absolute overflow-hidden rounded-lg border p-1.5 text-xs',
                          o.kind === 'moved-out' && 'z-0 border-dashed border-slate-300 bg-slate-50 opacity-50 dark:border-slate-600 dark:bg-slate-900',
                          o.kind === 'regular' && 'z-10 border-blue-200 bg-blue-50 dark:border-slate-700 dark:bg-slate-800',
                          o.kind === 'moved-in' && 'z-10 border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-slate-800',
                          clickable && 'cursor-pointer hover:shadow-md',
                        )}
                        style={{
                          top: ((o.start - range.start) / 30) * ROW_PX,
                          height: ((o.end - o.start) / 30) * ROW_PX - 2,
                          left: o.kind === 'moved-out' ? 2 : `calc(${(o.lane / o.lanes) * 100}% + 2px)`,
                          width: o.kind === 'moved-out' ? 'calc(100% - 4px)' : `calc(${100 / o.lanes}% - 4px)`,
                        }}
                      >
                        <div className="font-semibold text-slate-900 dark:text-slate-200">{o.course.code}{o.section ? ` (${isTH ? 'ตอน' : 'sec'} ${o.section.sectionNumber})` : ''}</div>
                        <div className="text-slate-600 dark:text-slate-300">{formatMinutes(o.start)}–{formatMinutes(o.end)}</div>
                        {o.kind === 'moved-out' && o.move && (
                          <div className="font-medium text-slate-700 dark:text-slate-300">{isTH ? 'ย้ายไป' : 'Moved to'} {label(o.move.newDate)} {o.move.newStart}</div>
                        )}
                        {o.kind === 'moved-in' && o.move && (
                          <div className="font-medium text-orange-700 dark:text-orange-300">{isTH ? 'ย้ายมาจาก' : 'Moved from'} {label(o.move.originalDate)} {o.move.originalStart}</div>
                        )}
                        {o.kind !== 'moved-out' && (
                          <>
                            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300"><MapPin className="h-3 w-3" />{o.slot.room || o.section?.room || (isTH ? 'ไม่ระบุห้อง' : 'No room')}</div>
                            {o.course.lecturerName && <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300"><User className="h-3 w-3" /><span className="truncate">{o.course.lecturerName}</span></div>}
                          </>
                        )}
                        {badge}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
