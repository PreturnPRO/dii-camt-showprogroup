import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, MapPin } from 'lucide-react';
import type { Course, Schedule } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TimetableProps {
  courses: Course[];
  semester?: number | string;
  academicYear?: string | number;
  onCourseClick?: (course: Course) => void;
}

const DAYS = [
  { en: 'monday', th: 'จันทร์', short: 'จ.' },
  { en: 'tuesday', th: 'อังคาร', short: 'อ.' },
  { en: 'wednesday', th: 'พุธ', short: 'พ.' },
  { en: 'thursday', th: 'พฤหัสบดี', short: 'พฤ.' },
  { en: 'friday', th: 'ศุกร์', short: 'ศ.' },
  { en: 'saturday', th: 'เสาร์', short: 'ส.' },
  { en: 'sunday', th: 'อาทิตย์', short: 'อา.' },
];

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00'
];

export function Timetable({ courses, onCourseClick }: TimetableProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const handleCourseClick = (course: Course) => {
    if (onCourseClick) {
      onCourseClick(course);
    } else {
      navigate('/courses');
    }
  };

  // Process schedule data supporting both course.schedule and course.sections[0].schedule
  const schedulesByDay = useMemo(() => {
    const result: Record<string, { course: Course; schedule: Schedule }[]> = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    };

    courses.forEach(course => {
      const schedules = (course.schedule || course.sections?.[0]?.schedule || []) as Schedule[];
      schedules.forEach(schedule => {
        const day = (schedule.day || '').toLowerCase();
        if (result[day]) {
          result[day].push({ course, schedule });
        }
      });
    });

    return result;
  }, [courses]);

  return (
    <div className="w-full">
      {/* Desktop Weekly Grid View */}
      <div className="hidden lg:block overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900/60">
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr className="h-14 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300">
              <th className="w-20 sm:w-24 p-2 text-center text-sm sm:text-base font-mono font-medium border-r border-slate-200/60 dark:border-slate-800">
                <Clock className="w-4 h-4 mx-auto text-slate-400" />
              </th>
              {DAYS.map(day => {
                const currentDayIndex = new Date().getDay(); // 0 is Sunday, 1 is Monday...
                const dayIndexMap: Record<string, number> = {
                  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
                };
                const isToday = dayIndexMap[day.en] === currentDayIndex;

                return (
                  <th
                    key={day.en}
                    className={cn(
                      "w-[13.14%] p-2 text-center border-r last:border-r-0 border-slate-200/50 dark:border-slate-800/80 transition-colors",
                      isToday && "bg-blue-50/50 dark:bg-blue-950/30"
                    )}
                  >
                    <span className={cn(
                      "text-sm sm:text-base font-bold block tracking-tight leading-tight",
                      isToday ? "text-blue-600 dark:text-blue-400" : "text-slate-800 dark:text-slate-200"
                    )}>
                      {language === 'en' ? day.en.charAt(0).toUpperCase() + day.en.slice(1) : day.th}
                    </span>
                    <span className="text-xs sm:text-sm font-mono text-slate-400 font-normal">{day.short}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/70 dark:divide-slate-800/40">
            {TIME_SLOTS.map((time) => (
              <tr key={time} className="h-16 hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-colors">
                <td className="p-2 text-center text-sm sm:text-base font-mono font-medium text-slate-500 dark:text-slate-400 bg-slate-50/40 dark:bg-slate-950/20 border-r border-slate-200/50 dark:border-slate-800/80 select-none">
                  {time}
                </td>
                {DAYS.map(day => {
                  const daySchedules = schedulesByDay[day.en];
                  const classAtThisTime = daySchedules.find(({ schedule }) => {
                    return schedule.startTime <= time && schedule.endTime > time;
                  });

                  if (classAtThisTime) {
                    const { course, schedule } = classAtThisTime;
                    const isFirstSlot = schedule.startTime === time;

                    if (isFirstSlot) {
                      // Calculate exact number of 1-hour slots
                      const startHour = parseInt(schedule.startTime.split(':')[0], 10);
                      const endHour = parseInt(schedule.endTime.split(':')[0], 10);
                      const rowSpan = Math.max(1, endHour - startHour);

                      return (
                        <td
                          key={day.en}
                          rowSpan={rowSpan}
                          onClick={() => handleCourseClick(course)}
                          className="p-2.5 border-r border-slate-200/60 dark:border-slate-800/70 bg-blue-50/70 dark:bg-blue-950/40 border-l-4 border-l-blue-600 rounded-r-lg transition-all duration-150 hover:bg-blue-100/70 dark:hover:bg-blue-900/50 hover:shadow-md cursor-pointer align-top shadow-xs group"
                          title={`${course.code} - ${language === 'en' ? course.name : course.nameThai}`}
                        >
                          <div className="space-y-1.5 overflow-hidden">
                            <div className="flex flex-wrap items-center justify-between gap-1.5">
                              <span className="font-mono font-bold text-base text-blue-700 dark:text-blue-300 tracking-tight group-hover:text-blue-800 dark:group-hover:text-blue-200">
                                {course.code}
                              </span>
                              <span className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400">
                                {schedule.startTime}–{schedule.endTime}
                              </span>
                            </div>
                            <div className="text-base font-medium text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {language === 'en' ? course.name : course.nameThai}
                            </div>
                            <div className="flex items-center gap-1.5 text-sm font-mono text-slate-600 dark:text-slate-400 pt-0.5">
                              <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                              <span className="truncate font-medium">{schedule.room}</span>
                            </div>
                          </div>
                        </td>
                      );
                    }
                    return null;
                  }

                  return (
                    <td key={day.en} className="p-2 border-r last:border-r-0 border-slate-100/60 dark:border-slate-800/30">
                      {/* Empty cell */}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile List View */}
      <div className="lg:hidden space-y-3.5">
        {DAYS.map(day => {
          const daySchedules = schedulesByDay[day.en];
          if (daySchedules.length === 0) return null;

          return (
            <div key={day.en} className="border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900/60 shadow-xs">
              <h4 className="font-bold text-base text-slate-900 dark:text-slate-100 mb-3">{language === 'en' ? day.en.toUpperCase() : day.th}</h4>
              <div className="space-y-3">
                {daySchedules.map(({ course, schedule }, index) => (
                  <div
                    key={index}
                    onClick={() => handleCourseClick(course)}
                    className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 rounded-xl p-4 space-y-2 cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-xs transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-base text-slate-900 dark:text-slate-100 font-mono">{course.code}</span>
                        <div className="text-base font-medium text-slate-800 dark:text-slate-200 mt-0.5">{language === 'en' ? course.name : course.nameThai}</div>
                      </div>
                      <Badge variant="outline" className="text-sm font-mono font-semibold shrink-0 px-2.5 py-0.5">{course.credits} Cr</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm font-mono font-medium text-slate-600 dark:text-slate-400 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <span>{schedule.startTime} - {schedule.endTime}</span>
                      </div>
                      {schedule.room && (
                        <>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            {schedule.room}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
