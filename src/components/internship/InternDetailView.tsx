import React from 'react';
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
import type { InternRow, DailyLogItem, MonthlyPayment } from './types';

interface InternDetailViewProps {
  intern: InternRow;
  detailTab: 'weekly' | 'daily' | 'stipend';
  onTabChange: (tab: 'weekly' | 'daily' | 'stipend') => void;
  onBack: () => void;
  onOpenStipendModal: (payment?: MonthlyPayment) => void;
  onOpenReviewModal: (log: DailyLogItem) => void;
  onQuickApprove: (logId: string) => Promise<void>;
  isApprovingId: string | null;
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
  onOpenStipendModal,
  onOpenReviewModal,
  onQuickApprove,
  isApprovingId,
}: InternDetailViewProps) {
  const { t, language } = useLanguage();
  const tr = t.internTracking;

  const perf = intern.performance;
  const submittedReports = perf.weeklyReports.filter((r) => r.submitted);
  const avgScore = Math.round(
    submittedReports.reduce((s, r) => s + r.score, 0) / Math.max(submittedReports.length, 1),
  );
  const totalExpected = intern.stipend.paymentHistory.reduce((sum, p) => sum + p.expectedAmount, 0);
  const totalReceived = intern.stipend.paymentHistory.reduce((sum, p) => sum + p.actualAmount, 0);
  const currentMonthMissing = Math.max(0, intern.stipend.monthlyRate - intern.stipend.currentMonthActual);
  const isPaidFull = intern.stipend.currentMonthStatus === 'paid_full';
  const isPaidPartial = intern.stipend.currentMonthStatus === 'paid_partial';

  const getScoreColor = (score: number) => {
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

  const getScoreBg = (score: number) => {
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

      {/* Top Student & Company Banner */}
      <motion.div
        variants={itemVariants}
        className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 text-white relative overflow-hidden shadow-lg"
      >
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:20px_20px]" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start md:items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl font-bold border border-white/20 shadow-md shrink-0">
              {intern.avatar}
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">
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
                    {intern.period.endDate} ({intern.period.durationMonths} {language === 'th' ? 'เดือน' : 'months'})
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

          {/* Right: Stipend Status & Rating */}
          <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 border-white/20 pt-4 md:pt-0 gap-3">
            <div className="text-left md:text-right">
              <div className="text-xs text-white/80 uppercase tracking-wider font-semibold">
                {language === 'th' ? 'เงินเดือน/เบี้ยเลี้ยงเดือนนี้' : 'Current Month Stipend'}
              </div>
              <div className="mt-1.5">
                {isPaidFull ? (
                  <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3 py-1 shadow-sm gap-1.5 border border-emerald-400/40">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {language === 'th'
                      ? `ได้รับครบแล้ว (฿${intern.stipend.currentMonthActual.toLocaleString()})`
                      : `Paid in Full (฿${intern.stipend.currentMonthActual.toLocaleString()})`}
                  </Badge>
                ) : isPaidPartial ? (
                  <Badge className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-3 py-1 shadow-sm gap-1.5 border border-rose-400/40 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {language === 'th'
                      ? `ได้รับไม่ครบ ขาด ฿${currentMonthMissing.toLocaleString()}`
                      : `Partial: Missing ฿${currentMonthMissing.toLocaleString()}`}
                  </Badge>
                ) : (
                  <Badge className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-3 py-1 shadow-sm gap-1.5 border border-amber-400/40">
                    <Clock className="w-3.5 h-3.5" />
                    {language === 'th'
                      ? `รอการโอน (รอบวันที่ ${intern.stipend.paymentDay})`
                      : `Pending (Cycle ${intern.stipend.paymentDay}th)`}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-white/80 mt-1 font-mono">
                {intern.stipend.currentMonth} • ฿{intern.stipend.monthlyRate.toLocaleString()}/
                {language === 'th' ? 'เดือน' : 'mo'}
              </p>
            </div>

            <div className="text-right flex items-center gap-2">
              <div className="text-xs text-white/80">{tr.overallScore}:</div>
              <div className="text-xl font-bold font-mono">{avgScore}</div>
              <Badge className="bg-white/20 text-white border-white/20 text-[11px]">
                {getScoreLabel(avgScore)}
              </Badge>
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
          <Card key={i} className={`border ${getScoreBg(metric.value)}`}>
            <CardContent className="p-4 text-center">
              <metric.icon className={`w-5 h-5 mx-auto mb-2 ${getScoreColor(metric.value)}`} />
              <div className={`text-2xl font-bold ${getScoreColor(metric.value)}`}>{metric.value}%</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{metric.label}</div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Tabs: Daily Logs, Weekly Reports, Stipend Tracking */}
      <motion.div variants={itemVariants} className="space-y-4">
        <Tabs value={detailTab} onValueChange={(v) => onTabChange(v as 'weekly' | 'daily' | 'stipend')} className="w-full">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 h-auto rounded-xl border border-slate-200/70 dark:border-slate-700/60 inline-flex shadow-xs">
              <TabsTrigger
                value="daily"
                className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:dark:bg-slate-900 data-[state=active]:dark:text-orange-400 data-[state=active]:shadow-xs transition-all text-slate-600 dark:text-slate-400 cursor-pointer select-none gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 inline-block" />
                {language === 'th' ? 'ตรวจไดอารี่บันทึกรายวัน' : 'Daily Logs & Review'}
                {intern.dailyLogs.filter((l) => l.status === 'pending').length > 0 && (
                  <Badge className="ml-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] px-1.5 py-0 rounded-full font-mono">
                    {intern.dailyLogs.filter((l) => l.status === 'pending').length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="weekly"
                className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:dark:bg-slate-900 data-[state=active]:dark:text-orange-400 data-[state=active]:shadow-xs transition-all text-slate-600 dark:text-slate-400 cursor-pointer select-none gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 inline-block" />
                {language === 'th' ? 'รายงานรายสัปดาห์' : 'Weekly Reports'}
              </TabsTrigger>
              <TabsTrigger
                value="stipend"
                className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:dark:bg-slate-900 data-[state=active]:dark:text-orange-400 data-[state=active]:shadow-xs transition-all text-slate-600 dark:text-slate-400 cursor-pointer select-none gap-1.5"
              >
                <CreditCard className="w-3.5 h-3.5 inline-block" />
                {language === 'th' ? 'เบี้ยเลี้ยงและการจ่ายเงิน' : 'Stipend & Salary Tracking'}
                {isPaidPartial && (
                  <Badge className="ml-1 bg-rose-500 hover:bg-rose-600 text-white text-[10px] px-1.5 py-0 rounded-full font-mono">
                    !
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onOpenStipendModal()}
                className="rounded-xl text-xs h-9 px-3.5 border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-300 gap-1.5 shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                {language === 'th' ? 'อัปเดตสถานะเบี้ยเลี้ยง (Staff)' : 'Update Stipend (Staff)'}
              </Button>
            </div>
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
                          <div className={`text-lg font-bold font-mono ${getScoreColor(report.score)}`}>
                            {report.score}
                          </div>
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
                          <span className="text-xs text-slate-400 ml-2 font-mono">{log.date}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs border-slate-200 dark:border-slate-700">
                          <Clock className="w-3 h-3 mr-1 text-slate-400" />
                          {log.hours} {language === 'th' ? 'ชม.' : 'hrs'}
                        </Badge>

                        {log.status === 'approved' ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {language === 'th' ? 'อนุมัติแล้ว' : 'Approved'}
                          </Badge>
                        ) : log.status === 'needs_revision' ? (
                          <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {language === 'th' ? 'ขอให้แก้ไข' : 'Needs Revision'}
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs gap-1">
                            <Clock className="w-3 h-3" />
                            {language === 'th' ? 'รอตรวจ' : 'Pending'}
                          </Badge>
                        )}
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

                    {log.mentorComment && (
                      <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-900/50 text-xs space-y-1.5">
                        <div className="flex items-center justify-between font-semibold text-blue-700 dark:text-blue-300">
                          <span className="flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5" />
                            {language === 'th' ? 'ข้อคิดเห็นจาก Mentor / อาจารย์:' : 'Mentor Feedback:'}
                          </span>
                          {log.reviewedAt && (
                            <span className="font-normal text-[11px] text-blue-500">{log.reviewedAt}</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 italic">
                          "{log.mentorComment}"
                        </p>
                        {log.reviewedBy && (
                          <p className="text-[11px] text-slate-400 text-right">- {log.reviewedBy}</p>
                        )}
                      </div>
                    )}

                    <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800/80">
                      {log.status !== 'approved' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onQuickApprove(log.id)}
                          disabled={isApprovingId === log.id}
                          className="rounded-xl text-xs h-9 px-3 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 gap-1.5 flex items-center"
                        >
                          {isApprovingId === log.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          {language === 'th' ? 'อนุมัติทันที' : 'Quick Approve'}
                        </Button>
                      )}

                      <Button
                        size="sm"
                        onClick={() => onOpenReviewModal(log)}
                        className="rounded-xl text-xs h-9 px-3.5 bg-orange-600 hover:bg-orange-700 text-white gap-1.5 font-medium shadow-xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        {language === 'th' ? 'ตรวจ / ให้ความเห็น' : 'Review & Comment'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* TAB 3: Stipend & Salary Tracking */}
          <TabsContent value="stipend" className="mt-0 space-y-5">
            {isPaidPartial ? (
              <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 border border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/60 flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-rose-800 dark:text-rose-200">
                    {language === 'th'
                      ? 'แจ้งเตือน: นักศึกษาได้รับเงินเดือน/เบี้ยเลี้ยงงวดล่าสุดไม่ครบถ้วน'
                      : 'Alert: Student Received Incomplete Stipend Payment'}
                  </h4>
                  <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                    {language === 'th'
                      ? `รอบเดือน ${intern.stipend.currentMonth} ยอดตามสัญญา ฿${intern.stipend.monthlyRate.toLocaleString()} แต่นักศึกษาได้รับเงินจริงเพียง ฿${intern.stipend.currentMonthActual.toLocaleString()} (ยังขาดอีก ฿${currentMonthMissing.toLocaleString()})`
                      : `Contract rate: ฿${intern.stipend.monthlyRate.toLocaleString()} but student received only ฿${intern.stipend.currentMonthActual.toLocaleString()} for ${intern.stipend.currentMonth} (Missing ฿${currentMonthMissing.toLocaleString()})`}
                  </p>
                </div>
              </div>
            ) : isPaidFull ? (
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/60 flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-emerald-800 dark:text-emerald-200">
                    {language === 'th'
                      ? 'สถานะปกติ: ได้รับเงินเดือน/เบี้ยเลี้ยงครบถ้วนเรียบร้อยแล้ว'
                      : 'Status Normal: Full Stipend Paid on Schedule'}
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                    {language === 'th'
                      ? `รอบเดือน ${intern.stipend.currentMonth} นักศึกษาได้รับเงินครบ 100% ตามข้อตกลง จำนวน ฿${intern.stipend.currentMonthActual.toLocaleString()} โอนเข้าบัญชีเรียบร้อย`
                      : `Student received full payment of ฿${intern.stipend.currentMonthActual.toLocaleString()} for ${intern.stipend.currentMonth}.`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/60 flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-amber-800 dark:text-amber-200">
                    {language === 'th'
                      ? 'สถานะ: รอถึงรอบกำหนดจ่ายประจำเดือน'
                      : 'Status: Pending Monthly Payment Cycle'}
                  </h4>
                  <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                    {language === 'th'
                      ? `รอบเดือน ${intern.stipend.currentMonth} มีกำหนดโอนทุกวันที่ ${intern.stipend.paymentDay} ของเดือน ยอดที่ต้องได้รับ ฿${intern.stipend.monthlyRate.toLocaleString()}`
                      : `Payment for ${intern.stipend.currentMonth} is scheduled on day ${intern.stipend.paymentDay} of the month for ฿${intern.stipend.monthlyRate.toLocaleString()}.`}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0c1222]">
                <CardContent className="p-4 space-y-1">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="text-xs font-medium">
                      {language === 'th' ? 'อัตราเบี้ยเลี้ยงตามสัญญา' : 'Contract Monthly Rate'}
                    </span>
                    <DollarSign className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                    ฿{intern.stipend.monthlyRate.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {language === 'th'
                      ? `รอบจ่ายทุกวันที่ ${intern.stipend.paymentDay} ของเดือน`
                      : `Cycle day ${intern.stipend.paymentDay}th monthly`}
                  </p>
                </CardContent>
              </Card>

              <Card
                className={`rounded-2xl border ${
                  isPaidFull
                    ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/20'
                    : isPaidPartial
                    ? 'border-rose-200 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/20'
                    : 'border-amber-200 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/20'
                }`}
              >
                <CardContent className="p-4 space-y-1">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="text-xs font-medium">
                      {language === 'th' ? 'ได้เงินครบไหม (เดือนนี้)?' : 'Current Month Status'}
                    </span>
                    <CreditCard className="w-4 h-4 text-orange-500" />
                  </div>
                  <div
                    className={`text-xl font-bold font-mono ${
                      isPaidFull
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : isPaidPartial
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {isPaidFull
                      ? language === 'th'
                        ? 'ได้รับครบ 100%'
                        : 'Paid in Full'
                      : isPaidPartial
                      ? language === 'th'
                        ? `ขาด ฿${currentMonthMissing.toLocaleString()}`
                        : `Missing ฿${currentMonthMissing.toLocaleString()}`
                      : language === 'th'
                      ? 'รอการโอน'
                      : 'Pending'}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {language === 'th'
                      ? `งวด: ${intern.stipend.currentMonth}`
                      : `Cycle: ${intern.stipend.currentMonth}`}
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0c1222]">
                <CardContent className="p-4 space-y-1">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="text-xs font-medium">
                      {language === 'th' ? 'ยอดที่ได้รับแล้วสะสม' : 'Total Stipend Received'}
                    </span>
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    ฿{totalReceived.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {language === 'th'
                      ? `จากยอดสัญญาประเมิน ฿${totalExpected.toLocaleString()}`
                      : `Of total expected ฿${totalExpected.toLocaleString()}`}
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0c1222]">
                <CardContent className="p-4 space-y-1">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="text-xs font-medium">
                      {language === 'th' ? 'สถานประกอบการที่ฝึก' : 'Host Company'}
                    </span>
                    <Building2 className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {language === 'th' ? intern.company : intern.companyEn}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    {intern.companyAddress || 'กรุงเทพฯ'}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0c1222]">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-orange-500" />
                    {language === 'th' ? 'ประวัติและรายการเบี้ยเลี้ยงรายเดือน' : 'Monthly Stipend Payment History'}
                  </CardTitle>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {intern.stipend.paymentHistory.length} {language === 'th' ? 'งวด' : 'cycles'}
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-y border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 text-slate-500">
                        <th className="py-3 px-4 font-semibold">{language === 'th' ? 'รอบเดือน' : 'Month'}</th>
                        <th className="py-3 px-4 font-semibold">{language === 'th' ? 'ยอดสัญญา' : 'Expected'}</th>
                        <th className="py-3 px-4 font-semibold">{language === 'th' ? 'ได้รับจริง' : 'Actual Paid'}</th>
                        <th className="py-3 px-4 font-semibold">{language === 'th' ? 'สถานะ' : 'Status'}</th>
                        <th className="py-3 px-4 font-semibold">{language === 'th' ? 'วันที่โอน' : 'Paid Date'}</th>
                        <th className="py-3 px-4 font-semibold">{language === 'th' ? 'หมายเหตุ' : 'Notes'}</th>
                        <th className="py-3 px-4 font-semibold text-right">{language === 'th' ? 'จัดการ' : 'Action'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {intern.stipend.paymentHistory.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 font-semibold">{item.month}</td>
                          <td className="py-3 px-4 font-mono">฿{item.expectedAmount.toLocaleString()}</td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                            ฿{item.actualAmount.toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            {item.status === 'paid_full' ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                {language === 'th' ? 'ครบถ้วน' : 'Full'}
                              </Badge>
                            ) : item.status === 'paid_partial' ? (
                              <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[11px] gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {language === 'th' ? 'ไม่ครบ' : 'Partial'}
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[11px] gap-1">
                                <Clock className="w-3 h-3" />
                                {language === 'th' ? 'รอโอน' : 'Pending'}
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500">{item.paidDate || '-'}</td>
                          <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{item.notes || '-'}</td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onOpenStipendModal(item)}
                              className="h-7 px-2 text-xs text-orange-600 hover:text-orange-700"
                            >
                              <Edit3 className="w-3 h-3 mr-1" />
                              {language === 'th' ? 'แก้ไข' : 'Edit'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
