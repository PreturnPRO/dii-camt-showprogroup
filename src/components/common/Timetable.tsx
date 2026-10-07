import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DAY_LABELS, formatHours, formatMinutes, placeSlots, studyDays, visibleRange, weeklyMinutes, type Term, type TimetableEntry } from '@/lib/timetable';

interface TimetableProps {
  entries: TimetableEntry[];
  term: Term | null;
}

const ROW_PX = 28; // one row = 30 minutes

export function Timetable({ entries, term }: TimetableProps) {
  const { language } = useLanguage();
  const isTH = language !== 'en';
  const placed = React.useMemo(() => placeSlots(entries), [entries]);
  const range = visibleRange(placed);
  const days = studyDays(placed).length > 0 && studyDays(placed).some((d) => d === 'saturday' || d === 'sunday')
    ? (['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const)
    : (['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const);
  const rows = (range.end - range.start) / 30;
  const hours = Array.from({ length: (range.end - range.start) / 60 }, (_, i) => range.start + i * 60);
  const uniqueCourses = new Map(entries.map((e) => [e.course.id, e.course]));
  const credits = Array.from(uniqueCourses.values()).reduce((sum, c) => sum + c.credits, 0);
  const weeklyHours = formatHours(weeklyMinutes(placed));

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-xl font-semibold">
            {term ? (isTH ? `ตารางประจำสัปดาห์ เทอม ${term.semester}/${term.academicYear}` : `Weekly timetable, term ${term.semester}/${term.academicYear}`) : (isTH ? 'ตารางประจำสัปดาห์' : 'Weekly timetable')}
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="secondary">{credits} {isTH ? 'หน่วยกิต' : 'credits'}</Badge>
            <Badge variant="secondary">{isTH ? `${weeklyHours} ชม./สัปดาห์` : `${weeklyHours} h/week`}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {placed.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">{isTH ? 'ไม่มีคาบเรียนในเทอมนี้' : 'No classes this term'}</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid min-w-[720px]" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}>
              <div />
              {days.map((day) => (
                <div key={day} className="border-b border-slate-200 p-2 text-center text-sm font-semibold dark:border-slate-700">
                  {isTH ? DAY_LABELS[day].th : DAY_LABELS[day].en}
                </div>
              ))}
              <div className="relative" style={{ height: rows * ROW_PX }}>
                {hours.map((h) => (
                  <div key={h} className="absolute right-2 text-xs text-slate-500 dark:text-slate-400" style={{ top: ((h - range.start) / 30) * ROW_PX - 7 }}>
                    {formatMinutes(h)}
                  </div>
                ))}
              </div>
              {days.map((day) => (
                <div key={day} className="relative border-l border-slate-100 dark:border-slate-800" style={{ height: rows * ROW_PX }}>
                  {hours.map((h) => (
                    <div key={h} className="absolute inset-x-0 border-t border-slate-100 dark:border-slate-800" style={{ top: ((h - range.start) / 30) * ROW_PX }} />
                  ))}
                  {placed.filter((p) => p.day === day).map((p) => (
                    <div
                      key={p.key}
                      data-testid="timetable-slot"
                      data-course={p.course.code}
                      data-day={p.day}
                      data-start={formatMinutes(p.start)}
                      data-lane={p.lane}
                      className="absolute overflow-hidden rounded-lg border border-blue-200 bg-blue-50 p-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                      style={{
                        top: ((p.start - range.start) / 30) * ROW_PX,
                        height: ((p.end - p.start) / 30) * ROW_PX - 2,
                        left: `calc(${(p.lane / p.lanes) * 100}% + 2px)`,
                        width: `calc(${100 / p.lanes}% - 4px)`,
                      }}
                    >
                      <div className="font-semibold text-blue-900 dark:text-slate-200">{p.course.code}{p.section ? ` (${isTH ? 'ตอน' : 'sec'} ${p.section.sectionNumber})` : ''}</div>
                      <div className="text-slate-600 dark:text-slate-300">{formatMinutes(p.start)}–{formatMinutes(p.end)}</div>
                      <div className="line-clamp-1 text-slate-700 dark:text-slate-300">{isTH ? p.course.nameThai || p.course.name : p.course.name}</div>
                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300"><MapPin className="h-3 w-3" />{p.slot.room || p.section?.room || (isTH ? 'ไม่ระบุห้อง' : 'No room')}</div>
                      {p.course.lecturerName && <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300"><User className="h-3 w-3" /><span className="truncate">{p.course.lecturerName}</span></div>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
