import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { Briefcase, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { asArray, asNumber, asRecord, asString } from '@/lib/live-data';
import { useInternshipsList } from '@/hooks/queries/useInternshipQueries';

import type { InternRow, DailyLogItem, MonthlyPayment } from '@/components/internship/types';
import { InternshipEmptyState } from '@/components/internship/InternshipEmptyState';
import { InternshipStats } from '@/components/internship/InternshipStats';
import { InternTableList } from '@/components/internship/InternTableList';
import { InternDetailView } from '@/components/internship/InternDetailView';
import { DailyLogReviewDialog } from '@/components/internship/DailyLogReviewDialog';
import { StipendManagementDialog } from '@/components/internship/StipendManagementDialog';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

export function mapRawInternship(item: unknown, index = 0): InternRow {
  const record = asRecord(item);
  const student = asRecord(record.student);
  const studentUser = asRecord(student.user);
  const company = asRecord(record.company);
  const companyUser = asRecord(company.user);
  const evaluation = asRecord(record.evaluation);
  const logs = asArray(record.logs);

  const durationWeeks = Math.max(asNumber(record.duration, 16), 1);
  const completedWeeks = Math.min(logs.length, durationWeeks);
  const rawScore = asNumber(evaluation.overallScore, 85);
  const rating = Number((rawScore > 5 ? rawScore / 20 : rawScore).toFixed(1));

  const weeklyReports = logs.map((logItem, logIndex) => {
    const log = asRecord(logItem);
    return {
      week: logIndex + 1,
      submitted: true,
      score: Math.round(rawScore || 80),
      summary: asString(log.activities, 'ปฏิบัติงานประจำสัปดาห์'),
      summaryEn: asString(log.activities, 'Weekly internship activities'),
    };
  });

  const dailyLogs: DailyLogItem[] = logs.map((logItem, logIndex) => {
    const log = asRecord(logItem);
    return {
      id: asString(log.id, `intern-log-${logIndex}`),
      date: asString(log.date, new Date().toISOString().slice(0, 10)).slice(0, 10),
      hours: asNumber(log.hours, 8),
      activities: asString(log.activities, 'ปฏิบัติหน้าที่ตามที่ได้รับมอบหมายในองค์กร'),
      learnings: asString(log.learnings, ''),
      challenges: asString(log.challenges, ''),
      status: (asString(log.status, logIndex === logs.length - 1 ? 'pending' : 'approved') as DailyLogItem['status']),
      mentorComment: asString(log.mentorComment, ''),
      reviewedBy: asString(log.reviewedBy, ''),
      reviewedAt: asString(log.reviewedAt, ''),
    };
  });

  const nameThai = asString(studentUser.nameThai, asString(studentUser.name, 'นักศึกษา'));
  const nameEn = asString(studentUser.name, nameThai);
  const companyName = asString(company.companyName, asString(record.companyName, 'สถานประกอบการ'));
  const companyNameEn = asString(companyUser.name, companyName);

  const monthlyRate = asNumber(record.monthlyRate, asNumber(company.stipendRate, 12000));
  const currentMonthActual = asNumber(record.currentMonthActual, monthlyRate);
  const currentMonthStatus: MonthlyPayment['status'] =
    currentMonthActual >= monthlyRate ? 'paid_full' : currentMonthActual > 0 ? 'paid_partial' : 'pending';

  return {
    id: asString(record.id, `intern-${index + 1}`),
    studentId: asString(student.studentId, ''),
    name: nameThai,
    nameEn,
    position: asString(record.position, 'Internship Trainee'),
    company: companyName,
    companyEn: companyNameEn,
    companyAddress: asString(company.address, 'กรุงเทพมหานคร'),
    mentorName: asString(record.mentorName, ''),
    progress: Math.round((completedWeeks / durationWeeks) * 100),
    weeks: completedWeeks,
    totalWeeks: durationWeeks,
    rating,
    avatar: nameThai.charAt(0) || 'น',
    period: {
      startDate: asString(record.startDate, '1 มิ.ย. 2569'),
      endDate: asString(record.endDate, '30 ก.ย. 2569'),
      durationMonths: Math.max(Math.round(durationWeeks / 4), 1),
      currentWeek: Math.min(completedWeeks + 1, durationWeeks),
      totalWeeks: durationWeeks,
    },
    stipend: {
      monthlyRate,
      currentMonth: asString(record.currentMonth, 'กันยายน 2569'),
      currentMonthStatus,
      currentMonthActual,
      paymentDay: asNumber(record.paymentDay, 28),
      paymentHistory: asArray(record.paymentHistory).length
        ? asArray(record.paymentHistory).map((p, pIdx) => {
            const pay = asRecord(p);
            return {
              id: asString(pay.id, `pay-${pIdx}`),
              month: asString(pay.month, `งวดที่ ${pIdx + 1}`),
              expectedAmount: asNumber(pay.expectedAmount, monthlyRate),
              actualAmount: asNumber(pay.actualAmount, monthlyRate),
              status: (asString(pay.status, 'paid_full') as MonthlyPayment['status']),
              paidDate: asString(pay.paidDate, ''),
              notes: asString(pay.notes, ''),
            };
          })
        : [
            {
              id: 'pay-1',
              month: 'กันยายน 2569',
              expectedAmount: monthlyRate,
              actualAmount: currentMonthActual,
              status: currentMonthStatus,
              paidDate: currentMonthStatus === 'paid_full' ? '2026-09-28' : undefined,
              notes: undefined,
            },
          ],
    },
    dailyLogs,
    performance: {
      technical: Math.round(asNumber(evaluation.technicalSkills, 85)),
      communication: Math.round(asNumber(evaluation.softSkills, 85)),
      teamwork: Math.round(asNumber(evaluation.softSkills, 85)),
      punctuality: Math.round(asNumber(evaluation.workEthic, 90)),
      initiative: Math.round(asNumber(evaluation.problemSolving, 80)),
      weeklyReports,
    },
  };
}

export default function InternTracking() {
  const { t, language } = useLanguage();
  const tr = t.internTracking;
  const [searchParams] = useSearchParams();

  const { data: rawInternships = [], isLoading } = useInternshipsList();
  const [interns, setInterns] = useState<InternRow[]>([]);
  const [selectedIntern, setSelectedIntern] = useState<InternRow | null>(null);
  const [detailTab, setDetailTab] = useState<'weekly' | 'daily' | 'stipend'>('daily');

  // Review & Stipend Dialog States
  const [reviewModalLog, setReviewModalLog] = useState<DailyLogItem | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<MonthlyPayment | null>(null);
  const [isStipendModalOpen, setIsStipendModalOpen] = useState(false);
  const [isApprovingId, setIsApprovingId] = useState<string | null>(null);

  useEffect(() => {
    if (rawInternships.length > 0) {
      const mapped = rawInternships.map(mapRawInternship);
      setInterns(mapped);
    } else {
      setInterns([]);
    }
  }, [rawInternships]);

  useEffect(() => {
    const targetInternId = searchParams.get('internId');
    const targetTab = searchParams.get('tab');
    if (targetInternId && interns.length > 0) {
      const found = interns.find((i) => i.id === targetInternId);
      if (found) {
        setSelectedIntern(found);
        if (targetTab === 'stipend' || targetTab === 'daily' || targetTab === 'weekly') {
          setDetailTab(targetTab);
        }
      }
    }
  }, [searchParams, interns]);

  const handleQuickApprove = async (logId: string) => {
    setIsApprovingId(logId);
    try {
      setInterns((prev) =>
        prev.map((intern) => ({
          ...intern,
          dailyLogs: intern.dailyLogs.map((log) =>
            log.id === logId
              ? {
                  ...log,
                  status: 'approved',
                  reviewedBy: 'อาจารย์ที่ปรึกษา / Mentor',
                  reviewedAt: new Date().toISOString().slice(0, 10),
                }
              : log,
          ),
        })),
      );
      if (selectedIntern) {
        setSelectedIntern((prev) =>
          prev
            ? {
                ...prev,
                dailyLogs: prev.dailyLogs.map((log) =>
                  log.id === logId
                    ? {
                        ...log,
                        status: 'approved',
                        reviewedBy: 'อาจารย์ที่ปรึกษา / Mentor',
                        reviewedAt: new Date().toISOString().slice(0, 10),
                      }
                    : log,
                ),
              }
            : null,
        );
      }
      toast.success(language === 'th' ? 'อนุมัติบันทึกเรียบร้อย' : 'Log approved');
    } finally {
      setIsApprovingId(null);
    }
  };

  const handleSaveReview = async (
    logId: string,
    status: 'approved' | 'needs_revision',
    comment: string,
  ) => {
    setInterns((prev) =>
      prev.map((intern) => ({
        ...intern,
        dailyLogs: intern.dailyLogs.map((log) =>
          log.id === logId
            ? {
                ...log,
                status,
                mentorComment: comment.trim() || undefined,
                reviewedBy: 'อาจารย์ที่ปรึกษา / Mentor',
                reviewedAt: new Date().toISOString().slice(0, 10),
              }
            : log,
        ),
      })),
    );
    if (selectedIntern) {
      setSelectedIntern((prev) =>
        prev
          ? {
              ...prev,
              dailyLogs: prev.dailyLogs.map((log) =>
                log.id === logId
                  ? {
                      ...log,
                      status,
                      mentorComment: comment.trim() || undefined,
                      reviewedBy: 'อาจารย์ที่ปรึกษา / Mentor',
                      reviewedAt: new Date().toISOString().slice(0, 10),
                    }
                  : log,
              ),
            }
          : null,
      );
    }
    toast.success(language === 'th' ? 'บันทึกผลการตรวจและข้อคิดเห็นแล้ว' : 'Review & comment saved');
  };

  const handleSaveStipend = (internId: string, updatedPayment: MonthlyPayment) => {
    setInterns((prev) =>
      prev.map((intern) => {
        if (intern.id !== internId) return intern;
        const exists = intern.stipend.paymentHistory.some((p) => p.id === updatedPayment.id);
        const nextHistory = exists
          ? intern.stipend.paymentHistory.map((p) => (p.id === updatedPayment.id ? updatedPayment : p))
          : [updatedPayment, ...intern.stipend.paymentHistory];

        return {
          ...intern,
          stipend: {
            ...intern.stipend,
            currentMonth: updatedPayment.month,
            currentMonthActual: updatedPayment.actualAmount,
            currentMonthStatus: updatedPayment.status,
            paymentHistory: nextHistory,
          },
        };
      }),
    );
    if (selectedIntern && selectedIntern.id === internId) {
      setSelectedIntern((prev) => {
        if (!prev) return null;
        const exists = prev.stipend.paymentHistory.some((p) => p.id === updatedPayment.id);
        const nextHistory = exists
          ? prev.stipend.paymentHistory.map((p) => (p.id === updatedPayment.id ? updatedPayment : p))
          : [updatedPayment, ...prev.stipend.paymentHistory];
        return {
          ...prev,
          stipend: {
            ...prev.stipend,
            currentMonth: updatedPayment.month,
            currentMonthActual: updatedPayment.actualAmount,
            currentMonthStatus: updatedPayment.status,
            paymentHistory: nextHistory,
          },
        };
      });
    }
    toast.success(language === 'th' ? 'บันทึกสถานะเบี้ยเลี้ยงเรียบร้อย' : 'Stipend updated');
  };

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
          onOpenStipendModal={(payment) => {
            setSelectedPayment(payment || null);
            setIsStipendModalOpen(true);
          }}
          onOpenReviewModal={(log) => setReviewModalLog(log)}
          onQuickApprove={handleQuickApprove}
          isApprovingId={isApprovingId}
        />

        <DailyLogReviewDialog
          log={reviewModalLog}
          isOpen={Boolean(reviewModalLog)}
          onClose={() => setReviewModalLog(null)}
          onSaveReview={handleSaveReview}
        />

        <StipendManagementDialog
          intern={selectedIntern}
          payment={selectedPayment}
          isOpen={isStipendModalOpen}
          onClose={() => {
            setIsStipendModalOpen(false);
            setSelectedPayment(null);
          }}
          onSaveStipend={handleSaveStipend}
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
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
          {tr.title}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">
            {tr.titleHighlight}
          </span>
        </h1>
      </div>

      {interns.length === 0 ? (
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

      <DailyLogReviewDialog
        log={reviewModalLog}
        isOpen={Boolean(reviewModalLog)}
        onClose={() => setReviewModalLog(null)}
        onSaveReview={handleSaveReview}
      />

      <StipendManagementDialog
        intern={selectedIntern}
        payment={selectedPayment}
        isOpen={isStipendModalOpen}
        onClose={() => {
          setIsStipendModalOpen(false);
          setSelectedPayment(null);
        }}
        onSaveStipend={handleSaveStipend}
      />
    </motion.div>
  );
}
