import React from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Sparkles, Users, UserCog, Building } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { UserRow } from './types';

interface UserStatsCardsProps {
  users: UserRow[];
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function UserStatsCards({ users }: UserStatsCardsProps) {
  const { t } = useLanguage();

  const studentCount = users.filter((u) => u.type === 'student').length;
  const lecturerCount = users.filter((u) => u.type === 'lecturer').length;
  const staffCount = users.filter((u) => u.type === 'staff').length;
  const companyCount = users.filter((u) => u.type === 'company').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <motion.div
        variants={itemVariants}
        whileHover={{ y: -5 }}
        className="p-6 rounded-3xl bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-sm relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm">
              <GraduationCap className="w-6 h-6" />
            </div>
            <span className="text-xs text-slate-100 font-medium">{t.users.studentsLabel}</span>
          </div>
          <div className="text-5xl font-bold tracking-tight">{studentCount}</div>
          <div className="mt-3 text-sm text-purple-100 flex items-center gap-1">
            <Sparkles className="w-4 h-4" />
            {t.users.inSystem}
          </div>
        </div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        whileHover={{ y: -5 }}
        className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/50 relative overflow-hidden group"
      >
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
              <Users className="w-6 h-6" />
            </div>
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {t.users.lecturersLabel}
            </span>
          </div>
          <div className="text-4xl font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
            {lecturerCount}
          </div>
          <div className="mt-3 text-sm text-slate-400">{t.users.teachingStaff}</div>
        </div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        whileHover={{ y: -5 }}
        className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/50 relative overflow-hidden group"
      >
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
              <UserCog className="w-6 h-6" />
            </div>
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {t.users.staffLabel}
            </span>
          </div>
          <div className="text-4xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
            {staffCount}
          </div>
          <div className="mt-3 text-sm text-slate-400">{t.users.supportStaff}</div>
        </div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        whileHover={{ y: -5 }}
        className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/50 relative overflow-hidden group"
      >
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors">
              <Building className="w-6 h-6" />
            </div>
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {t.users.companiesLabel}
            </span>
          </div>
          <div className="text-4xl font-bold text-slate-900 dark:text-white group-hover:text-orange-600 transition-colors">
            {companyCount}
          </div>
          <div className="mt-3 text-sm text-slate-400">{t.users.businessPartners}</div>
        </div>
      </motion.div>
    </div>
  );
}
