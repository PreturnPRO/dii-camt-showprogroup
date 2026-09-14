import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { Course } from '@/types';
import { MapPin, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface MonthCalendarProps {
  courses: Course[];
  currentDate: Date;
  onSelectDate?: (date: Date) => void;
  onSwitchToWeek?: (date: Date) => void;
}

const DAYS_HEADER = [
  { en: 'Mon', th: 'จันทร์', key: 'monday', idx: 1 },
  { en: 'Tue', th: 'อังคาร', key: 'tuesday', idx: 2 },
  { en: 'Wed', th: 'พุธ', key: 'wednesday', idx: 3 },
  { en: 'Thu', th: 'พฤหัสบดี', key: 'thursday', idx: 4 },
  { en: 'Fri', th: 'ศุกร์', key: 'friday', idx: 5 },
  { en: 'Sat', th: 'เสาร์', key: 'saturday', idx: 6 },
  { en: 'Sun', th: 'อาทิตย์', key: 'sunday', idx: 0 },
];

export function MonthCalendar({ courses, currentDate, onSelectDate, onSwitchToWeek }: MonthCalendarProps) {
  const { language } = useLanguage();
  const isTH = language !== 'en';

  const [selectedDayEvents, setSelectedDayEvents] = React.useState<{
    date: Date;
    events: Array<{ course: Course; slot: NonNullable<Course['schedule']>[number] }>;
  } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of this month
  const firstDayOfMonth = new Date(year, month, 1);
  // Total days in this month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Day of week of 1st day (0 = Sun, 1 = Mon ... 6 = Sat)
  // We want Monday = 0, Tuesday = 1 ... Sunday = 6
  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;

  // Days from previous month to pad front
  const prevMonthDays = new Date(year, month, 0).getDate();

  // Build 35 or 42 grid cells
  const totalSlots = Math.ceil((startDayOfWeek + daysInMonth) / 7) * 7;

  // Map courses by weekday (monday, tuesday, etc.)
  const coursesByDay = React.useMemo(() => {
    const map: Record<string, Array<{ course: Course; slot: NonNullable<Course['schedule']>[number] }>> = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    };
    courses.forEach(c => {
      (c.schedule || []).forEach(slot => {
        const dayKey = slot.day.toLowerCase();
        if (map[dayKey]) {
          map[dayKey].push({ course: c, slot });
        }
      });
    });
    // Sort each day chronologically by startTime
    Object.keys(map).forEach(k => {
      map[k].sort((a, b) => a.slot.startTime.localeCompare(b.slot.startTime));
    });
    return map;
  }, [courses]);

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  // Render cells
  const cells = [];
  for (let i = 0; i < totalSlots; i++) {
    const dayNum = i - startDayOfWeek + 1;
    const isPrevMonth = dayNum <= 0;
    const isNextMonth = dayNum > daysInMonth;
    const isThisMonth = !isPrevMonth && !isNextMonth;

    let displayDay = dayNum;
    let cellDate = new Date(year, month, dayNum);

    if (isPrevMonth) {
      displayDay = prevMonthDays + dayNum;
      cellDate = new Date(year, month - 1, displayDay);
    } else if (isNextMonth) {
      displayDay = dayNum - daysInMonth;
      cellDate = new Date(year, month + 1, displayDay);
    }

    const isToday =
      isCurrentMonth &&
      isThisMonth &&
      today.getDate() === dayNum;

    // Weekday key for courses
    const dayOfWeek = cellDate.getDay(); // 0 = Sunday, 1 = Monday
    const dayKeyMap: Record<number, string> = {
      0: 'sunday',
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday',
      6: 'saturday',
    };
    const dayKey = dayKeyMap[dayOfWeek];
    const dayEvents = isThisMonth ? (coursesByDay[dayKey] || []) : [];

    cells.push({
      key: `cell-${i}`,
      displayDay,
      cellDate,
      isThisMonth,
      isToday,
      events: dayEvents,
    });
  }

  const handleCellClick = (cell: typeof cells[0]) => {
    if (!cell.isThisMonth) return;
    if (onSelectDate) onSelectDate(cell.cellDate);
    if (cell.events.length > 0) {
      setSelectedDayEvents({
        date: cell.cellDate,
        events: cell.events,
      });
    }
  };

  return (
    <div className="w-full select-none">
      {/* 7-column header */}
      <div className="grid grid-cols-7 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 rounded-t-xl">
        {DAYS_HEADER.map((d) => (
          <div
            key={d.key}
            className="py-2.5 px-2 text-center border-r last:border-r-0 border-slate-200/60 dark:border-slate-800/80"
          >
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 block">
              {isTH ? d.th : d.en}
            </span>
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 border-l border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded-b-xl overflow-hidden">
        {cells.map((cell) => {
          const visibleEvents = cell.events.slice(0, 3);
          const hiddenCount = cell.events.length - visibleEvents.length;

          return (
            <div
              key={cell.key}
              onClick={() => handleCellClick(cell)}
              className={cn(
                "min-h-[105px] sm:min-h-[120px] p-1.5 sm:p-2 border-r border-b border-slate-200/70 dark:border-slate-800/80 flex flex-col justify-between transition-colors",
                cell.isThisMonth ? "bg-white dark:bg-slate-900/50 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 cursor-pointer" : "bg-slate-50/40 dark:bg-slate-950/30 text-slate-300 dark:text-slate-700 pointer-events-none",
                cell.isToday && "bg-blue-50/30 dark:bg-blue-950/20"
              )}
            >
              {/* Date Header */}
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-xs font-mono font-medium inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors",
                    cell.isToday
                      ? "bg-blue-600 text-white font-bold shadow-xs"
                      : cell.isThisMonth
                      ? "text-slate-700 dark:text-slate-300"
                      : "text-slate-300 dark:text-slate-700"
                  )}
                >
                  {cell.displayDay}
                </span>

                {cell.isThisMonth && cell.events.length > 0 && (
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 hidden sm:inline-block">
                    {cell.events.length} {isTH ? 'วิชา' : 'classes'}
                  </span>
                )}
              </div>

              {/* Event Chips */}
              <div className="flex-1 my-1 space-y-1 overflow-hidden">
                {visibleEvents.map(({ course, slot }, idx) => (
                  <div
                    key={`${course.code}-${idx}`}
                    title={`${course.code} ${isTH ? course.nameThai : course.name} (${slot.startTime}–${slot.endTime}) @ ${slot.room}`}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-800/50 text-[10px] font-mono text-blue-700 dark:text-blue-300 truncate transition-transform hover:scale-[1.02]"
                  >
                    <span className="font-semibold text-blue-600 dark:text-blue-400 shrink-0">
                      {slot.startTime}
                    </span>
                    <span className="truncate font-medium">{course.code}</span>
                  </div>
                ))}

                {hiddenCount > 0 && (
                  <div className="text-[10px] font-mono font-medium text-blue-600 dark:text-blue-400 pl-1">
                    +{hiddenCount} {isTH ? 'เพิ่มเติม' : 'more'}
                  </div>
                )}
              </div>

              {/* Subtle bottom indicator */}
              <div className="h-0.5 w-full rounded-full" />
            </div>
          );
        })}
      </div>

      {/* Modal Dialog for Date Details */}
      <Dialog open={!!selectedDayEvents} onOpenChange={(open) => !open && setSelectedDayEvents(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              {selectedDayEvents?.date.toLocaleDateString(isTH ? 'th-TH' : 'en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              {isTH
                ? `ตารางเรียนที่มีในวันนี้ (${selectedDayEvents?.events.length || 0} วิชา)`
                : `Scheduled classes on this day (${selectedDayEvents?.events.length || 0} classes)`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 mt-3 max-h-[60vh] overflow-y-auto pr-1">
            {selectedDayEvents?.events.map(({ course, slot }, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                    {course.code}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-800">
                    {slot.startTime} – {slot.endTime}
                  </span>
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                  {isTH ? course.nameThai : course.name}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/40">
                  <span className="flex items-center gap-1 font-mono">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {slot.room}
                  </span>
                  <span>•</span>
                  <span>{course.credits} {isTH ? 'หน่วยกิต' : 'credits'}</span>
                  <span>•</span>
                  <span className="truncate">{course.lecturerName}</span>
                </div>
              </div>
            ))}
          </div>

          {onSwitchToWeek && selectedDayEvents && (
            <div className="mt-2 pt-2 flex justify-end">
              <button
                onClick={() => {
                  const targetDate = selectedDayEvents.date;
                  setSelectedDayEvents(null);
                  onSwitchToWeek(targetDate);
                }}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                {isTH ? 'ดูตารางแบบรายสัปดาห์สำหรับสัปดาห์นี้ →' : 'Switch to Week View for this week →'}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
