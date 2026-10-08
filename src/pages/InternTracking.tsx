import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { Briefcase, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { asArray, asNumber, asRecord, asString } from '@/lib/live-data';
import { useInternshipsList } from '@/hooks/queries/useInternshipQueries';

import type { InternRow, DailyLogItem } from '@/components/internship/types';
import { InternshipEmptyState } from '@/components/internship/InternshipEmptyState';
import { InternshipStats } from '@/components/internship/InternshipStats';
import { InternTableList } from '@/components/internship/InternTableList';
import { InternDetailView } from '@/components/internship/InternDetailView';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

// every value comes from the internship record; nothing is invented when a field is missing (audit F9).
// The backend stores no stipend, mentor review, log status or per-week score, so none is shown.
export function mapRawInternship(item: unknown, index = 0): InternRow {
  const record = asRecord(item);
  const student = asRecord(record.student);
  const studentUser = asRecord(student.user);
  const company = asRecord(record.company);
  const companyUser = asRecord(company.user);
  const evaluation = record.evaluation ? asRecord(record.evaluation) : null;
  const logs = asArray(record.logs);

  const durationWeeks = Math.max(asNumber(record.duration, 0), logs.length, 1);
  const completedWeeks = Math.min(logs.length, durationWeeks);
  // evaluation scores are stored as-is (0–5 in the seed); round only when displaying
  const optionalScore = (value: unknown) => (value === null || value === undefined ? null : asNumber(value, 0));
  const rawScore = evaluation ? optionalScore(evaluation.overallScore) : null;
  const rating = rawScore === null ? null : Number((rawScore > 5 ? rawScore / 20 : rawScore).toFixed(1));

  const weeklyReports = logs.map((logItem, logIndex) => {
    const log = asRecord(logItem);
    return {
      week: logIndex + 1,
      submitted: true,
      score: null,
      summary: asString(log.activities, '-'),
      summaryEn: asString(log.activities, '-'),
    };
  });

  const dailyLogs: DailyLogItem[] = logs.map((logItem, logIndex) => {
    const log = asRecord(logItem);
    return {
      id: asString(log.id, `intern-log-${logIndex}`),
      date: asString(log.date).slice(0, 10) || '-',
      hours: asNumber(log.hours, 0),
      activities: asString(log.activities, '-'),
      learnings: asString(log.learnings, ''),
      challenges: asString(log.challenges, ''),
    };
  });

  const nameThai = asString(studentUser.nameThai, asString(studentUser.name, '-'));
  const companyName = asString(company.companyName, asString(record.companyName, '-'));
  const durationRaw = asNumber(record.duration, 0);

  return {
    id: asString(record.id, `intern-${index + 1}`),
    studentId: asString(student.studentId, ''),
    name: nameThai,
    nameEn: asString(studentUser.name, nameThai),
    position: asString(record.position, '-'),
    company: companyName,
    companyEn: asString(companyUser.name, companyName),
    companyId: asString(record.companyId, asString(company.id, '')) || undefined,
    companyAddress: asString(company.address, '') || undefined,
    mentorName: asString(record.supervisor, '') || undefined,
    progress: Math.round((completedWeeks / durationWeeks) * 100),
    weeks: completedWeeks,
    totalWeeks: durationWeeks,
    rating,
    avatar: nameThai.charAt(0) || '?',
    period: {
      startDate: asString(record.startMonth, '-'),
      endDate: asString(record.endMonth, '-'),
      durationMonths: durationRaw > 0 ? Math.max(Math.round(durationRaw / 4), 1) : null,
      currentWeek: completedWeeks,
      totalWeeks: durationWeeks,
    },
    dailyLogs,
    performance: {
      technical: evaluation ? optionalScore(evaluation.technicalSkills) : null,
      communication: evaluation ? optionalScore(evaluation.softSkills) : null,
      teamwork: evaluation ? optionalScore(evaluation.softSkills) : null,
      punctuality: evaluation ? optionalScore(evaluation.workEthic) : null,
      initiative: evaluation ? optionalScore(evaluation.problemSolving) : null,
      weeklyReports,
    },
  };
}

export default function InternTracking() {
  const { t, language } = useLanguage();
  const tr = t.internTracking;
  const [searchParams] = useSearchParams();

  const { data: rawInternships, isLoading, isError } = useInternshipsList();
  // derived, not copied into state: a fresh [] default on every render used to loop setState forever
  const interns = useMemo<InternRow[]>(() => (rawInternships ?? []).map(mapRawInternship), [rawInternships]);
  const [selectedIntern, setSelectedIntern] = useState<InternRow | null>(null);
  const [detailTab, setDetailTab] = useState<'weekly' | 'daily'>('daily');


  useEffect(() => {
    const targetInternId = searchParams.get('internId');
    const targetTab = searchParams.get('tab');
    if (targetInternId && interns.length > 0) {
      const found = interns.find((i) => i.id === targetInternId);
      if (found) {
        setSelectedIntern(found);
        if (targetTab === 'daily' || targetTab === 'weekly') {
          setDetailTab(targetTab);
        }
      }
    }
  }, [searchParams, interns]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-3" />
        <span className="text-sm font-medium">
          {language === 'th' ? 'กำลังโหลดข้อมูลการฝึกงาน...' : 'Loading internship records...'}
        </span>
      </div>
    );
  }

  if (selectedIntern) {
    return (
      <>
        <InternDetailView
          intern={selectedIntern}
          detailTab={detailTab}
          onTabChange={setDetailTab}
          onBack={() => setSelectedIntern(null)}
        />
      </>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-10">
      <div>
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2">
          <Briefcase className="w-4 h-4 text-orange-500 dark:text-slate-400" />
          <span>{tr.subtitle}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white leading-snug">
          {tr.title}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">
            {tr.titleHighlight}
          </span>
        </h1>
      </div>

      {isError ? (
        <div data-testid="interns-load-error" role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm font-medium text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {language === 'th' ? 'โหลดรายชื่อนักศึกษาฝึกงานไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง' : 'Could not load interns. Please refresh.'}
        </div>
      ) : interns.length === 0 ? (
        <InternshipEmptyState />
      ) : (
        <>
          <InternshipStats interns={interns} />
          <InternTableList
            interns={interns}
            onSelectIntern={(intern, tab) => {
              setSelectedIntern(intern);
              if (tab) setDetailTab(tab);
            }}
          />
        </>
      )}

    </motion.div>
  );
}
