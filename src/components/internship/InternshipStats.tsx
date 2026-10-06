import React from 'react';
import { motion } from 'framer-motion';
import { Users, Building2, Clock, CreditCard } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { InternRow } from './types';

interface InternshipStatsProps {
  interns: InternRow[];
}

export function InternshipStats({ interns }: InternshipStatsProps) {
  const { t, language } = useLanguage();
  const tr = t.internTracking;

  const totalInterns = interns.length;
  const companiesCount = new Set(interns.map((i) => i.company)).size;
  const avgWeeks = totalInterns
    ? Math.round(interns.reduce((sum, i) => sum + i.totalWeeks, 0) / totalInterns)
    : 0;
  const paidFullCount = interns.filter((i) => i.stipend.currentMonthStatus === 'paid_full').length;

  const stats = [
    {
      icon: Users,
      label: tr.totalInterns,
      value: String(totalInterns),
      sub: language === 'th' ? 'นักศึกษาฝึกงานทั้งหมด' : 'Total students',
    },
    {
      icon: Building2,
      label: tr.companies,
      value: String(companiesCount),
      sub: language === 'th' ? 'สถานประกอบการที่เข้าร่วม' : 'Active companies',
    },
    {
      icon: Clock,
      label: tr.avgDuration,
      value: `${avgWeeks} ${tr.weeks}`,
      sub: language === 'th' ? 'ระยะเวลาฝึกเฉลี่ย' : 'Average duration',
    },
    {
      icon: CreditCard,
      label: language === 'th' ? 'สถานะเบี้ยเลี้ยงเดือนนี้' : 'Stipend Status',
      value: `${paidFullCount}/${totalInterns}`,
      sub: language === 'th' ? 'ได้รับเงินครบถ้วนแล้ว' : 'Paid in full',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <motion.div
          key={i}
          whileHover={{ scale: 1.02 }}
          className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
              <stat.icon className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{stat.label}</span>
          </div>
          <div className="text-3xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-slate-100">
            {stat.value}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{stat.sub}</div>
        </motion.div>
      ))}
    </div>
  );
}
