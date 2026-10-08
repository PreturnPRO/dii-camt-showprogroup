import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Building2,
  MapPin,
  UserCheck,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Target,
  Users,
  TrendingUp,
  FileText,
  CreditCard,
  Edit3,
  Sparkles,
  AlertCircle,
  MessageSquare,
  Check,
  Loader2,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { api, ApiError } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { InternRow } from './types';

interface InternDetailViewProps {
  intern: InternRow;
  detailTab: 'weekly' | 'daily';
  onTabChange: (tab: 'weekly' | 'daily') => void;
  onBack: () => void;
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function InternDetailView({
  intern,
  detailTab,
  onTabChange,
  onBack,
}: InternDetailViewProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, string>>({});
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const canReview = ['lecturer', 'company', 'staff', 'admin'].includes(user?.role ?? '');
  const canSetStatus = ['staff', 'admin'].includes(user?.role ?? '');
  // shown from the refetched row; the local value only bridges the moment between saving and the refetch
  const [savedStatus, setSavedStatus] = useState<string | null>(null);
  const status = savedStatus ?? intern.status;
  useEffect(() => { setSavedStatus(null); }, [intern.status]);
  const diaryClosed = status === 'completed' || status === 'cancelled';
  const [savingStatus, setSavingStatus] = useState(false);
  // leaving "completed" revokes the completion certificates already issued, so staff confirm it first
  const [pendingStatus, setPendingStatus] = useState<'in_progress' | 'cancelled' | null>(null);
  const requestStatus = (next: 'in_progress' | 'completed' | 'cancelled') => {
    if (status === 'completed' && next !== 'completed') setPendingStatus(next);
    else void changeStatus(next);
  };
  const th = language === 'th';
  const STATUS_LABELS: Record<string, string> = {
    not_started: th ? 'ยังไม่เริ่ม' : 'Not started',
    in_progress: th ? 'กำลังฝึกงาน' : 'In progress',
    completed: th ? 'ฝึกงานจบแล้ว' : 'Completed',
    cancelled: th ? 'ยกเลิก' : 'Cancelled',
  };

  const changeStatus = async (next: 'in_progress' | 'completed' | 'cancelled') => {
    setSavingStatus(true);
    try {
      const result = await api.internship.setStatus(intern.id, next);
      setSavedStatus(next);
      await queryClient.invalidateQueries({ queryKey: queryKeys.internships.all() });
      const revoked = Number((result as { revokedCertificates?: number }).revokedCertificates ?? 0);
      toast.success(revoked > 0
        ? (th ? `บันทึกสถานะแล้ว · เพิกถอนใบรับรองฝึกงาน ${revoked} ฉบับ` : `Status saved · ${revoked} completion certificate(s) revoked`)
        : (th ? 'บันทึกสถานะแล้ว' : 'Status saved'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (th ? 'บันทึกสถานะไม่สำเร็จ' : 'Could not save the status'));
    } finally {
      setSavingStatus(false);
      setPendingStatus(null);
    }
  };

  const reviewLog = async (log: { id: string; updatedAt: string }, status: 'approved' | 'changes_requested') => {
    const { id } = log;
    const comment = reviewDrafts[id]?.trim() ?? '';
    if (status === 'changes_requested' && !comment) {
      toast.error(language === 'th' ? 'กรุณาเขียนความเห็นก่อนขอแก้ไข' : 'Add a comment before requesting changes');
      return;
    }
    setReviewingId(id);
    try {
      await api.internship.reviewLog(id, { status, comment, updatedAt: log.updatedAt });
      await queryClient.invalidateQueries({ queryKey: queryKeys.internships.all() });
      setReviewDrafts((current) => { const next = { ...current }; delete next[id]; return next; });
      toast.success(language === 'th' ? 'บันทึกผลตรวจแล้ว' : 'Review saved');
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        // the student edited the entry after this page loaded: show the new text instead of approving the old one
        await queryClient.invalidateQueries({ queryKey: queryKeys.internships.all() });
        toast.error(language === 'th' ? 'บันทึกนี้เปลี่ยนไปหลังจากคุณเปิดหน้า โหลดเนื้อหาล่าสุดแล้ว กรุณาอ่านอีกครั้งก่อนตรวจ' : 'This entry changed after you opened it. The latest version is loaded — please read it before reviewing.');
        return;
      }
      toast.error(error instanceof Error ? error.message : (language === 'th' ? 'บันทึกผลตรวจไม่สำเร็จ' : 'Could not save review'));
    } finally {
      setReviewingId(null);
    }
  };
  const tr = t.internTracking;

  const perf = intern.performance;
  // evaluation scores are on a 0–5 scale; null = the company has not evaluated yet
  const pct = (score: number | null) => (score === null ? null : score * 20);

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-slate-400';
    if (score >= 90) return 'text-emerald-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return tr.excellent;
    if (score >= 75) return tr.good;
    if (score >= 60) return tr.fair;
    return tr.needsImprovement;
  };

  const getScoreBg = (score: number | null) => {
    if (score === null) return 'bg-slate-50 border-slate-100 dark:bg-slate-900/40 dark:border-slate-800';
    if (score >= 90) return 'bg-emerald-50 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900';
    if (score >= 75) return 'bg-blue-50 border-blue-100 dark:bg-blue-950/30 dark:border-blue-900';
    if (score >= 60) return 'bg-amber-50 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900';
    return 'bg-red-50 border-red-100 dark:bg-red-950/30 dark:border-red-900';
  };

  return (
    <div className="space-y-6 pb-10">
      <motion.div variants={itemVariants}>
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> {tr.backToList}
        </Button>
      </motion.div>

      {/* Internship status: the first diary entry starts it; staff mark it completed (which unlocks the certificate) or cancelled */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900" data-testid="intern-status">
        <span className="text-sm text-slate-600 dark:text-slate-300">{th ? 'สถานะการฝึกงาน:' : 'Internship status:'}</span>
        <Badge variant="outline" data-testid="intern-status-label" className={status === 'completed' ? 'border-emerald-300 text-emerald-700 dark:text-emerald-400' : status === 'cancelled' ? 'border-rose-300 text-rose-700 dark:text-rose-400' : 'border-slate-300 text-slate-700 dark:text-slate-300'}>
          {STATUS_LABELS[status] ?? status}
        </Badge>
        {canSetStatus && (
          <div className="ml-auto flex flex-wrap gap-2">
            {status !== 'completed' && (
              <Button size="sm" disabled={savingStatus} onClick={() => requestStatus('completed')} className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700">
                {savingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {th ? 'บันทึกว่าฝึกงานจบแล้ว' : 'Mark completed'}
              </Button>
            )}
            {status !== 'in_progress' && (
              <Button size="sm" variant="outline" disabled={savingStatus} onClick={() => requestStatus('in_progress')}>
                {status === 'not_started'
                  ? (th ? 'บันทึกว่าเริ่มฝึกงาน' : 'Mark in progress')
                  : (th ? 'กลับเป็นกำลังฝึกงาน' : 'Back to in progress')}
              </Button>
            )}
            {status !== 'cancelled' && (
              <Button size="sm" variant="outline" disabled={savingStatus} onClick={() => requestStatus('cancelled')} className="border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40">
                {th ? 'ยกเลิกการฝึกงาน' : 'Cancel internship'}
              </Button>
            )}
          </div>
        )}
      </motion.div>

      <AlertDialog open={pendingStatus !== null} onOpenChange={(open) => { if (!open) setPendingStatus(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingStatus === 'cancelled' ? (th ? 'ยกเลิกการฝึกงานที่บันทึกว่าจบแล้ว?' : 'Cancel a completed internship?') : (th ? 'เปลี่ยนกลับเป็นกำลังฝึกงาน?' : 'Move back to in progress?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {th
                ? 'ใบรับรองการฝึกงานทุกฉบับที่ออกให้นักศึกษาคนนี้แล้วจะถูกเพิกถอน ผู้ที่สแกน QR จะเห็นว่าถูกเพิกถอน และย้อนกลับไม่ได้ ถ้าบันทึกว่าจบอีกครั้งต้องออกใบใหม่'
                : 'Every completion certificate already issued to this student will be revoked. Anyone scanning its QR will see it is revoked; this cannot be undone. Marking completed again needs a new certificate.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={savingStatus}>{th ? 'ยกเลิก' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction disabled={savingStatus} onClick={(event) => { event.preventDefault(); if (pendingStatus) void changeStatus(pendingStatus); }} className="bg-rose-600 text-white hover:bg-rose-700">
              {th ? 'ยืนยันและเพิกถอน' : 'Confirm and revoke'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Top Student & Company Banner */}
      <motion.div
        variants={itemVariants}
        className="bg-orange-600 p-6 sm:p-7 rounded-3xl text-white relative overflow-hidden shadow-lg"
      >
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:20px_20px]" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start md:items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-bold border border-white/20 shadow-md shrink-0 leading-snug">
              {intern.avatar}
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-white leading-snug">
                  {language === 'th' ? intern.name : intern.nameEn}
                </h1>
                <Badge className="bg-white/25 hover:bg-white/30 text-white border-white/30 text-xs px-2.5 py-0.5">
                  {intern.position}
                </Badge>
              </div>

              {/* Company & Mentor */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-white/90">
                <span className="flex items-center gap-1.5 font-medium">
                  <Building2 className="w-4 h-4 text-white/90" />
                  <span>{language === 'th' ? intern.company : intern.companyEn}</span>
                </span>
                {intern.companyAddress && (
                  <span className="flex items-center gap-1 text-white/80 text-xs">
                    <MapPin className="w-3.5 h-3.5 text-white/70" />
                    {intern.companyAddress}
                  </span>
                )}
                {intern.mentorName && (
                  <span className="flex items-center gap-1 text-white/80 text-xs">
                    <UserCheck className="w-3.5 h-3.5 text-white/70" />
                    {intern.mentorName}
                  </span>
                )}
              </div>

              {/* Internship Period */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/85 pt-1">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-white/75" />
                  <span>
                    {language === 'th' ? 'ระยะเวลาฝึกงาน:' : 'Internship Period:'} {intern.period.startDate} ถึง{' '}
                    {intern.period.endDate}{intern.period.durationMonths !== null && ` (${intern.period.durationMonths} ${language === 'th' ? 'เดือน' : 'months'})`}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-white/75" />
                  <span>
                    {language === 'th' ? 'สัปดาห์ที่' : 'Week'} {intern.period.currentWeek}/
                    {intern.period.totalWeeks} ({intern.progress}%)
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Right: company evaluation */}
          <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 border-white/20 pt-4 md:pt-0 gap-3">
            <div className="text-right flex items-center gap-2">
              <div className="text-xs text-white/80">{tr.overallScore}:</div>
              <div className="text-xl font-bold font-mono" data-testid="intern-rating">{intern.rating === null ? '-' : `${intern.rating.toFixed(1)}/5`}</div>
              {intern.rating !== null && (
                <Badge className="bg-white/20 text-white border-white/20 text-[11px]">
                  {getScoreLabel(intern.rating * 20)}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Evaluation Metric Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: tr.technicalSkills, value: perf.technical, icon: Target },
          { label: tr.communication, value: perf.communication, icon: Users },
          { label: tr.teamwork, value: perf.teamwork, icon: Users },
          { label: tr.punctuality, value: perf.punctuality, icon: Clock },
          { label: tr.initiative, value: perf.initiative, icon: TrendingUp },
        ].map((metric, i) => (
          <Card key={i} className={`border ${getScoreBg(pct(metric.value))}`}>
            <CardContent className="p-4 text-center">
              <metric.icon className={`w-5 h-5 mx-auto mb-2 ${getScoreColor(pct(metric.value))}`} />
              <div className={`text-2xl font-bold ${getScoreColor(pct(metric.value))} leading-snug`}>{metric.value === null ? '-' : `${metric.value.toFixed(1)}/5`}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{metric.label}</div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Tabs: Daily Logs, Weekly Reports */}
      <motion.div variants={itemVariants} className="space-y-4">
        <Tabs value={detailTab} onValueChange={(v) => onTabChange(v as 'weekly' | 'daily')} className="w-full">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 h-auto rounded-xl border border-slate-200/70 dark:border-slate-700/60 inline-flex shadow-xs">
              <TabsTrigger
                value="daily"
                className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:dark:bg-slate-900 data-[state=active]:dark:text-orange-400 data-[state=active]:shadow-xs transition-all text-slate-600 dark:text-slate-400 cursor-pointer select-none gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 inline-block" />
                {language === 'th' ? 'บันทึกรายวัน' : 'Daily Logs'}
              </TabsTrigger>
              <TabsTrigger
                value="weekly"
                className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:dark:bg-slate-900 data-[state=active]:dark:text-orange-400 data-[state=active]:shadow-xs transition-all text-slate-600 dark:text-slate-400 cursor-pointer select-none gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 inline-block" />
                {language === 'th' ? 'รายงานรายสัปดาห์' : 'Weekly Reports'}
              </TabsTrigger>
            </TabsList>

          </div>

          {/* TAB 1: Weekly Reports */}
          <TabsContent value="weekly" className="mt-0">
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4 text-orange-500 dark:text-slate-400" /> {tr.weeklyReport}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {perf.weeklyReports.map((report) => (
                  <div
                    key={report.week}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                      report.submitted
                        ? 'bg-white border-slate-100 dark:bg-slate-900/50 dark:border-slate-800'
                        : 'bg-slate-50 border-slate-100 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center font-bold text-orange-600 dark:text-orange-400">
                      W{report.week}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-slate-900 dark:text-slate-100">
                        {tr.weekLabel} {report.week}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {language === 'th' ? report.summary : report.summaryEn}
                      </div>
                    </div>
                    <div className="text-right">
                      {report.submitted ? (
                        <>
                          {report.score !== null && (
                            <div className={`text-lg font-bold font-mono ${getScoreColor(report.score)}`}>
                              {report.score}
                            </div>
                          )}
                          <Badge
                            variant="outline"
                            className="text-emerald-600 border-emerald-200 text-xs dark:text-emerald-400"
                          >
                            {tr.submitted}
                          </Badge>
                        </>
                      ) : (
                        <Badge variant="outline" className="text-slate-400 border-slate-200 dark:border-slate-700 text-xs">
                          {tr.pending}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Daily Logs */}
          <TabsContent value="daily" className="mt-0 space-y-3.5">
            {intern.dailyLogs.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed text-slate-400">
                {language === 'th' ? 'ยังไม่มีบันทึกไดอารี่จากนักศึกษา' : 'No daily logs recorded yet'}
              </div>
            ) : (
              intern.dailyLogs.map((log) => (
                <Card
                  key={log.id}
                  className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0c1222] shadow-xs"
                >
                  <CardContent className="p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            {new Date(log.date).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs border-slate-200 dark:border-slate-700">
                          <Clock className="w-3 h-3 mr-1 text-slate-400" />
                          {log.hours} {language === 'th' ? 'ชม.' : 'hrs'}
                        </Badge>

                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {language === 'th' ? 'งานและกิจกรรมที่ปฏิบัติ:' : 'Activities & Tasks:'}
                      </span>
                      <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {log.activities}
                      </p>
                    </div>

                    {(log.learnings || log.challenges) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {log.learnings && (
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5" />
                              {language === 'th' ? 'สิ่งที่ได้เรียนรู้' : 'Learnings'}
                            </span>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{log.learnings}</p>
                          </div>
                        )}
                        {log.challenges && (
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                            <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              {language === 'th' ? 'ปัญหา อุปสรรค' : 'Challenges'}
                            </span>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{log.challenges}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                      <Badge variant="outline" className={
                        log.reviewStatus === 'approved'
                          ? 'border-emerald-300 text-emerald-700 dark:text-emerald-400'
                          : log.reviewStatus === 'changes_requested'
                            ? 'border-amber-300 text-amber-700 dark:text-amber-400'
                            : 'border-slate-300 text-slate-600 dark:text-slate-300'
                      }>
                        {log.reviewStatus === 'approved'
                          ? (language === 'th' ? 'อนุมัติแล้ว' : 'Approved')
                          : log.reviewStatus === 'changes_requested'
                            ? (language === 'th' ? 'ขอให้แก้ไข' : 'Changes requested')
                            : (language === 'th' ? 'รอตรวจ' : 'Pending review')}
                      </Badge>
                      {log.reviewComment && (
                        <span className="text-slate-600 dark:text-slate-300">{language === 'th' ? 'ความเห็น: ' : 'Comment: '}{log.reviewComment}</span>
                      )}
                    </div>
                    {canReview && diaryClosed && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">{th ? 'การฝึกงานจบหรือถูกยกเลิกแล้ว ไม่ตรวจบันทึกเพิ่ม' : 'This internship has ended; entries are no longer reviewed.'}</p>
                    )}
                    {canReview && !diaryClosed && (
                      <div className="space-y-2">
                        <Textarea
                          aria-label={language === 'th' ? 'ความเห็นต่อบันทึก' : 'Review comment'}
                          placeholder={language === 'th' ? 'ความเห็นต่อบันทึกวันนี้' : 'Comment on this daily log'}
                          maxLength={2000}
                          value={reviewDrafts[log.id] ?? log.reviewComment}
                          onChange={(event) => setReviewDrafts((current) => ({ ...current, [log.id]: event.target.value }))}
                          className="min-h-20 text-sm"
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" size="sm" disabled={reviewingId !== null} onClick={() => void reviewLog(log, 'approved')}>
                            {reviewingId === log.id && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                            {language === 'th' ? 'อนุมัติ' : 'Approve'}
                          </Button>
                          <Button type="button" size="sm" variant="outline" disabled={reviewingId !== null} onClick={() => void reviewLog(log, 'changes_requested')}>
                            {language === 'th' ? 'ขอให้แก้ไข' : 'Request changes'}
                          </Button>
                        </div>
                      </div>
                    )}

                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

        </Tabs>
      </motion.div>
    </div>
  );
}
