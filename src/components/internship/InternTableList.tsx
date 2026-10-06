import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Building2,
  MapPin,
  UserCheck,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  CreditCard,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import type { InternRow } from './types';

interface InternTableListProps {
  interns: InternRow[];
  onSelectIntern: (intern: InternRow, tab?: 'weekly' | 'daily' | 'stipend') => void;
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function InternTableList({ interns, onSelectIntern }: InternTableListProps) {
  const { t, language } = useLanguage();
  const tr = t.internTracking;

  const [searchQuery, setSearchQuery] = useState('');
  const [stipendFilter, setStipendFilter] = useState<'all' | 'paid_full' | 'paid_partial' | 'pending'>('all');

  const filteredInterns = interns.filter((intern) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      intern.name.toLowerCase().includes(q) ||
      intern.nameEn.toLowerCase().includes(q) ||
      intern.company.toLowerCase().includes(q) ||
      intern.companyEn.toLowerCase().includes(q) ||
      intern.position.toLowerCase().includes(q) ||
      (intern.mentorName && intern.mentorName.toLowerCase().includes(q));

    const matchesStipend =
      stipendFilter === 'all' || intern.stipend.currentMonthStatus === stipendFilter;

    return matchesQuery && matchesStipend;
  });

  return (
    <div className="space-y-6">
      {/* Search & Stipend Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder={
              language === 'th'
                ? 'ค้นหาชื่อนักศึกษา, บริษัท, ตำแหน่ง, หรือพี่เลี้ยง...'
                : 'Search student, company, position, mentor...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs h-10"
          />
        </div>

        {/* Stipend Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
          {[
            { id: 'all', label: language === 'th' ? 'ทั้งหมด' : 'All', count: interns.length },
            {
              id: 'paid_full',
              label: language === 'th' ? 'ได้รับครบแล้ว' : 'Paid in Full',
              count: interns.filter((i) => i.stipend.currentMonthStatus === 'paid_full').length,
            },
            {
              id: 'paid_partial',
              label: language === 'th' ? 'ได้รับไม่ครบ' : 'Partial Payment',
              count: interns.filter((i) => i.stipend.currentMonthStatus === 'paid_partial').length,
            },
            {
              id: 'pending',
              label: language === 'th' ? 'รอการโอน' : 'Pending',
              count: interns.filter((i) => i.stipend.currentMonthStatus === 'pending').length,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStipendFilter(tab.id as typeof stipendFilter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                stipendFilter === tab.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  stipendFilter === tab.id
                    ? 'bg-slate-100 dark:bg-slate-800 font-bold'
                    : 'bg-slate-200/60 dark:bg-slate-700/60'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Interns Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {filteredInterns.map((intern, idx) => {
          const isFull = intern.stipend.currentMonthStatus === 'paid_full';
          const isPartial = intern.stipend.currentMonthStatus === 'paid_partial';
          const missing = Math.max(0, intern.stipend.monthlyRate - intern.stipend.currentMonthActual);

          return (
            <motion.div
              key={intern.id || idx}
              variants={itemVariants}
              whileHover={{ y: -4 }}
              className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between"
            >
              <div>
                {/* Student Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-xl font-bold shadow-lg shrink-0">
                    {intern.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 truncate">
                      {language === 'th' ? intern.name : intern.nameEn}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{intern.position}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-orange-600 dark:text-orange-400 font-medium truncate">
                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{language === 'th' ? intern.company : intern.companyEn}</span>
                    </div>
                  </div>
                </div>

                {/* Company & Mentor Detail */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 text-xs space-y-1.5 mb-4">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {intern.companyAddress || 'กรุงเทพมหานคร'}
                    </span>
                  </div>
                  {intern.mentorName && (
                    <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 text-[11px]">
                      <UserCheck className="w-3 h-3 text-slate-400" />
                      <span>{intern.mentorName}</span>
                    </div>
                  )}
                </div>

                {/* Internship Duration & Progress */}
                <div className="mb-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>
                        {intern.period.startDate} - {intern.period.endDate}
                      </span>
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                      {tr.weekLabel} {intern.period.currentWeek}/{intern.period.totalWeeks} ({intern.progress}%)
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${intern.progress}%` }}
                      transition={{ delay: 0.3 + idx * 0.1, duration: 0.6 }}
                      className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full"
                    />
                  </div>
                </div>

                {/* Stipend Status Highlight Box */}
                <div
                  className={`p-3.5 rounded-xl border mb-5 transition-all ${
                    isFull
                      ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50'
                      : isPartial
                      ? 'bg-rose-50/70 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/50'
                      : 'bg-amber-50/70 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {language === 'th'
                        ? `เงินเดือนงวด ${intern.stipend.currentMonth}`
                        : `Stipend (${intern.stipend.currentMonth})`}
                    </span>
                    {isFull ? (
                      <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] px-2 py-0 font-medium gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {language === 'th' ? 'ได้รับครบแล้ว' : 'Paid in Full'}
                      </Badge>
                    ) : isPartial ? (
                      <Badge className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] px-2 py-0 font-medium gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {language === 'th' ? 'ได้รับไม่ครบ' : 'Incomplete'}
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] px-2 py-0 font-medium gap-1">
                        <Clock className="w-3 h-3" />
                        {language === 'th' ? 'รอการโอน' : 'Pending'}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                      ฿{intern.stipend.currentMonthActual.toLocaleString()}{' '}
                      <span className="text-xs font-normal text-slate-400">
                        / ฿{intern.stipend.monthlyRate.toLocaleString()}
                      </span>
                    </div>
                    {isPartial && (
                      <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                        {language === 'th'
                          ? `(ขาดอีก ฿${missing.toLocaleString()})`
                          : `(-฿${missing.toLocaleString()})`}
                      </span>
                    )}
                    {isFull && (
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        {language === 'th' ? 'ครบ 100%' : '100%'}
                      </span>
                    )}
                    {!isFull && !isPartial && (
                      <span className="text-[11px] text-amber-600 dark:text-amber-400">
                        {language === 'th'
                          ? `รอบวันที่ ${intern.stipend.paymentDay}`
                          : `Day ${intern.stipend.paymentDay}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <Button
                  variant="outline"
                  className="w-full rounded-xl text-[11px] h-8 px-1"
                  size="sm"
                  onClick={() => onSelectIntern(intern, 'daily')}
                >
                  <Calendar className="w-3 h-3 mr-1 text-orange-500" />
                  {language === 'th' ? 'ไดอารี่' : 'Logs'}
                </Button>
                <Button
                  className="w-full rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-[11px] h-8 px-1 shadow-xs"
                  size="sm"
                  onClick={() => onSelectIntern(intern, 'stipend')}
                >
                  <CreditCard className="w-3 h-3 mr-1" />
                  {language === 'th' ? 'เงินเดือน' : 'Stipend'}
                </Button>
                <Button
                  variant="outline"
                  className="w-full rounded-xl text-[11px] h-8 px-1 border-slate-200 text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:border-slate-700 dark:bg-slate-800"
                  size="sm"
                  onClick={() => onSelectIntern(intern, 'weekly')}
                >
                  <Eye className="w-3 h-3 mr-1 text-blue-500" />
                  {language === 'th' ? 'ประเมิน' : 'Reports'}
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
