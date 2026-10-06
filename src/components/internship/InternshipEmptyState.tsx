import React from 'react';
import { Briefcase } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function InternshipEmptyState() {
  const { language } = useLanguage();

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-[#0c1222] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
      <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-4">
        <Briefcase className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
        {language === 'th' ? 'ยังไม่มีข้อมูลการฝึกงาน' : 'No Internship Records Found'}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mt-1 mb-6">
        {language === 'th'
          ? 'ขณะนี้ยังไม่มีนักศึกษาที่ได้รับการอนุมัติการฝึกงานในระบบ ข้อมูลจะปรากฏเมื่อมีการตอบรับจากสถานประกอบการ'
          : 'There are currently no confirmed student internship records. Data will appear once placements are approved.'}
      </p>
    </div>
  );
}
