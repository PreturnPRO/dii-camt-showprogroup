import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Schedule, Course } from '@/types';
import { Clock, MapPin, User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface TimetableProps {
  courses: Course[];
  semester: number;
  academicYear: string;
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
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
];

export function Timetable({ courses, semester, academicYear }: TimetableProps) {
  const { t, language } = useLanguage();

  // Group schedules by day
  const schedulesByDay = React.useMemo(() => {
    const byDay: Record<string, Array<{ course: Course; schedule: Schedule }>> = {};
    
    DAYS.forEach(day => {
      byDay[day.en] = [];
    });
    
    courses.forEach(course => {
      course.sections?.[0]?.schedule?.forEach(schedule => {
        byDay[schedule.day].push({ course, schedule });
      });
    });
    
    return byDay;
  }, [courses]);

  const totalCredits = courses.reduce((sum, course) => sum + course.credits, 0);

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
          {language === 'en' ? `Schedule Semester ${semester}/${academicYear}` : `ตารางเรียน เทอม ${semester}/${academicYear}`}
        </h3>
        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
          {totalCredits} {language === 'en' ? 'Credits' : 'หน่วยกิต'}
        </span>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900/40 shadow-sm">
        <table className="w-full table-fixed border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/70 h-11">
              <th className="w-[8%] p-2 text-[11px] font-mono text-slate-400 font-medium text-center border-r border-slate-200/50 dark:border-slate-800/80">
                {language === 'en' ? 'Time' : 'เวลา'}
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
                      isToday && "bg-blue-50/40 dark:bg-blue-950/20"
                    )}
                  >
                    <span className={cn(
                      "text-xs font-semibold block tracking-tight",
                      isToday ? "text-blue-600 dark:text-blue-400 font-bold" : "text-slate-700 dark:text-slate-200"
                    )}>
                      {language === 'en' ? day.en.charAt(0).toUpperCase() + day.en.slice(1) : day.th}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 font-normal">{day.short}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/70 dark:divide-slate-800/40">
            {TIME_SLOTS.map((time) => (
              <tr key={time} className="h-11 hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-colors">
                <td className="p-2 text-center text-[11px] font-mono text-slate-400/90 bg-slate-50/30 dark:bg-slate-950/20 border-r border-slate-200/50 dark:border-slate-800/80 select-none">
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
                          className="p-2 border-r border-slate-200/50 dark:border-slate-800/60 bg-blue-50/60 dark:bg-blue-950/30 border-l-2 border-l-blue-500 rounded-r-md transition-all duration-150 hover:bg-blue-50/80 dark:hover:bg-blue-950/50 cursor-default align-top"
                        >
                          <div className="space-y-1 overflow-hidden">
                            <div className="flex flex-wrap items-center justify-between gap-1">
                              <span className="font-mono font-bold text-[11px] text-blue-700 dark:text-blue-300 tracking-tight">
                                {course.code}
<<<<<<< Updated upstream
                              </div>
                              <div className="text-xs text-gray-700 dark:text-slate-300 line-clamp-2">
                                {language === 'en' ? course.name : course.nameThai}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-slate-300">
                                <MapPin className="w-3 h-3" />
                                {schedule.room || course.sections?.[0]?.room || (language === 'en' ? 'TBA' : 'ไม่ระบุ')}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-slate-300">
                                <User className="w-3 h-3" />
                                <span className="truncate">{course.lecturerName || (language === 'en' ? 'TBA' : 'ไม่ระบุ')}</span>
                              </div>
=======
                              </span>
                              <span className="text-[9.5px] font-mono text-blue-600/75 dark:text-blue-400/70">
                                {schedule.startTime}–{schedule.endTime}
                              </span>
>>>>>>> Stashed changes
                            </div>
                            <div className="text-[11px] font-medium text-slate-800 dark:text-slate-200 line-clamp-2 leading-tight">
                              {language === 'en' ? course.name : course.nameThai}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500 dark:text-slate-400 pt-0.5">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{schedule.room}</span>
                            </div>
                          </div>
                        </td>
                      );
                    }
                    return null;
                  }

<<<<<<< Updated upstream
                    return (
                      <td key={day.en} className="border border-gray-200 p-3 bg-white dark:bg-slate-900 dark:border-slate-700">
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
        <div className="lg:hidden space-y-4">
          {DAYS.map(day => {
            const daySchedules = schedulesByDay[day.en];
            if (daySchedules.length === 0) return null;

            return (
              <div key={day.en} className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3 text-primary">{language === 'en' ? day.en.charAt(0).toUpperCase() + day.en.slice(1) : day.th}</h3>
                <div className="space-y-3">
                  {daySchedules.map(({ course, schedule }, index) => (
                    <div key={index} className="bg-blue-50 rounded-lg p-3 space-y-2 dark:bg-slate-800">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-blue-900 dark:text-slate-200">
                            {course.code}
                          </div>
                          <div className="text-sm text-gray-700 dark:text-slate-300">
                            {language === 'en' ? course.name : course.nameThai}
                          </div>
                        </div>
                        <Badge variant="secondary">{course.credits} {language === 'en' ? 'Credits' : 'หน่วยกิต'}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                        <Clock className="w-4 h-4" />
                        {schedule.startTime} - {schedule.endTime}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                        <MapPin className="w-4 h-4" />
                        {schedule.room || course.sections?.[0]?.room || (language === 'en' ? 'TBA' : 'ไม่ระบุ')} {schedule.building}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                        <User className="w-4 h-4" />
                        {course.lecturerName || (language === 'en' ? 'TBA' : 'ไม่ระบุ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Course List */}
        <div className="mt-6 space-y-2">
          <h3 className="font-semibold text-lg">{language === 'en' ? 'All Courses' : 'รายวิชาทั้งหมด'}</h3>
          <div className="grid gap-2">
            {courses.map(course => (
              <div key={course.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg dark:bg-slate-800">
                <div>
                  <span className="font-semibold">{course.code}</span>
                  <span className="ml-2 text-sm text-gray-600 dark:text-slate-300">{language === 'en' ? course.name : course.nameThai}</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-slate-300">
                  {course.credits} {language === 'en' ? 'Credits' : 'หน่วยกิต'}
                </div>
              </div>
=======
                  return (
                    <td key={day.en} className="p-2 border-r last:border-r-0 border-slate-100/60 dark:border-slate-800/30">
                      {/* Empty cell */}
                    </td>
                  );
                })}
              </tr>
>>>>>>> Stashed changes
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile List View */}
      <div className="lg:hidden space-y-3">
        {DAYS.map(day => {
          const daySchedules = schedulesByDay[day.en];
          if (daySchedules.length === 0) return null;

          return (
            <div key={day.en} className="border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4 bg-white dark:bg-slate-900/60">
              <h4 className="font-semibold text-xs text-slate-700 dark:text-slate-300 mb-3">{language === 'en' ? day.en.toUpperCase() : day.th}</h4>
              <div className="space-y-2">
                {daySchedules.map(({ course, schedule }, index) => (
                  <div key={index} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-lg p-3 space-y-1.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">{course.code}</span>
                        <div className="text-xs text-slate-600 dark:text-slate-300">{language === 'en' ? course.name : course.nameThai}</div>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono">{course.credits} Cr</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                      <Clock className="w-3.5 h-3.5" />
                      {schedule.startTime} - {schedule.endTime}
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
