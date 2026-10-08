import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, CheckCircle2, AlertCircle, MessageSquare,
  Plus, Search, Building, UserCheck, Sparkles, Filter,
  BookOpen, ChevronRight, Check, X, Award, Briefcase, Loader2, Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { api, ApiError } from '@/lib/api';
import { asArray, asNumber, asRecord, asString } from '@/lib/live-data';
import type { InternshipLog } from '@/types';

export interface DailyDiaryEntry {
  id: string;
  date: string;
  hours: number;
  activities: string;
  learnings: string;
  challenges: string;
  reviewStatus: string;
  reviewComment: string;
}

// Every entry and review comes from the student's internship record; no placeholder review is shown.
export function InternshipDiary() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();

  const [logs, setLogs] = useState<DailyDiaryEntry[]>([]);
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formHours, setFormHours] = useState<number>(8);
  const [formActivities, setFormActivities] = useState('');
  const [formLearnings, setFormLearnings] = useState('');
  const [formChallenges, setFormChallenges] = useState('');
  // null = writing a new entry; otherwise the id of the entry being corrected
  const [editingId, setEditingId] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormActivities('');
    setFormLearnings('');
    setFormChallenges('');
    setFormHours(8);
  };

  const openNewEntry = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEdit = (entry: DailyDiaryEntry) => {
    setEditingId(entry.id);
    setFormDate(entry.date);
    setFormHours(entry.hours);
    setFormActivities(entry.activities);
    setFormLearnings(entry.learnings);
    setFormChallenges(entry.challenges);
    setIsDialogOpen(true);
  };

  const [reloadKey, setReloadKey] = useState(0);

  // Fetch from API on mount, and again when an edit is refused because the entry changed on the server
  useEffect(() => {
    let mounted = true;
    api.internship.get()
      .then((res) => {
        if (!mounted) return;
        setLoadError(false);
        const internship = res.internship ? asRecord(res.internship) : null;
        setRecord(internship);
        setLogs(asArray(internship?.logs).map((item, index) => {
          const row = asRecord(item);
          return {
            id: asString(row.id, `api-log-${index}`),
            date: asString(row.date).slice(0, 10),
            hours: asNumber(row.hours, 0),
            activities: asString(row.activities, ''),
            learnings: asString(row.learnings, ''),
            challenges: asString(row.challenges, ''),
            reviewStatus: asString(row.reviewStatus, 'pending'),
            reviewComment: asString(row.reviewComment, ''),
          };
        }));
      })
      .catch((err) => {
        console.warn('Unable to load internship logs', err);
        if (mounted) setLoadError(true);
      })
      .finally(() => { if (mounted) setIsLoading(false); });

    return () => {
      mounted = false;
    };
  }, [reloadKey]);

  const handleCreateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formActivities.trim()) {
      toast({
        title: language === 'th' ? 'กรุณากรอกงานที่ทำ' : 'Please specify activities',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const payload = {
      date: formDate,
      hours: Number(formHours) || 8,
      activities: formActivities.trim(),
      learnings: formLearnings.trim(),
      challenges: formChallenges.trim(),
    };
    if (editingId) {
      try {
        await api.internship.updateLog(editingId, payload);
        // the server puts an edited entry back in the review queue and drops the old comment
        setLogs((current) => current.map((entry) => entry.id === editingId
          ? { ...entry, ...payload, reviewStatus: 'pending', reviewComment: '' }
          : entry));
        setIsDialogOpen(false);
        resetForm();
        toast({ title: language === 'th' ? 'แก้ไขบันทึกแล้ว ส่งให้ตรวจอีกครั้ง' : 'Entry updated and sent for review again' });
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          // approved meanwhile, or the internship was closed: show the server's version instead of a stale Edit button
          setIsDialogOpen(false);
          resetForm();
          setReloadKey((key) => key + 1);
          toast({
            title: language === 'th' ? 'แก้ไขบันทึกนี้ไม่ได้แล้ว' : 'This entry can no longer be edited',
            description: language === 'th' ? 'บันทึกถูกอนุมัติหรือการฝึกงานจบแล้ว โหลดข้อมูลล่าสุดให้แล้ว' : 'It was approved or the internship has ended. The latest version is loaded.',
            variant: 'destructive',
          });
          return;
        }
        toast({
          title: language === 'th' ? 'แก้ไขไม่สำเร็จ' : 'Could not update the entry',
          description: error instanceof Error ? error.message : undefined,
          variant: 'destructive',
        });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
    try {
      const response = await api.internship.createLog(payload);
      const saved = asRecord(asRecord(response).log);
      setLogs((current) => [{
        id: asString(saved.id, `log-${Date.now()}`),
        date: asString(saved.date, formDate).slice(0, 10),
        hours: asNumber(saved.hours, Number(formHours) || 8),
        activities: asString(saved.activities, formActivities.trim()),
        learnings: asString(saved.learnings, formLearnings.trim()),
        challenges: asString(saved.challenges, formChallenges.trim()),
        reviewStatus: 'pending',
        reviewComment: '',
      }, ...current]);
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: language === 'th' ? 'บันทึกไดอารี่ประจำวันแล้ว' : 'Diary entry logged successfully',
        description: `${formDate} (${formHours} ${language === 'th' ? 'ชั่วโมง' : 'hours'})`,
      });
    } catch (error) {
      // nothing was saved: keep the dialog and the text so the student can retry
      toast({
        title: language === 'th' ? 'บันทึกไม่สำเร็จ' : 'Could not save the entry',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // a completed or cancelled internship's diary is closed; the server refuses new or edited entries
  const internshipStatus = asString(record?.status, 'not_started');
  const diaryClosed = internshipStatus === 'completed' || internshipStatus === 'cancelled';

  // Calculations
  const totalHours = logs.reduce((sum, l) => sum + l.hours, 0);
  const companyName = asString(record?.companyName, asString(asRecord(record?.company).companyName, '-'));
  const supervisor = asString(record?.supervisor, '');

  const filteredLogs = logs.filter((item) => {
    const matchesSearch =
      item.activities.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.learnings.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.challenges.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.date.includes(searchQuery);

    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner: Internship Status & Action */}
      <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold leading-snug">
              {language === 'th' ? 'ไดอารี่บันทึกการฝึกงาน' : 'Internship Daily Diary'}
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-blue-100">
              <span className="flex items-center gap-1.5">
                <Building className="w-4 h-4 text-blue-200" />
                {companyName}
              </span>
              {supervisor && (
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-blue-200" />
                  {language === 'th' ? `พี่เลี้ยง: ${supervisor}` : `Supervisor: ${supervisor}`}
                </span>
              )}
            </div>
          </div>

          {diaryClosed ? (
            <p data-testid="diary-closed" className="max-w-xs rounded-2xl bg-white/15 px-4 py-3 text-sm text-white">
              {internshipStatus === 'completed'
                ? (language === 'th' ? 'การฝึกงานบันทึกว่าจบแล้ว ไดอารี่ปิดแล้ว เพิ่มหรือแก้บันทึกไม่ได้' : 'This internship is marked completed; the diary is closed.')
                : (language === 'th' ? 'การฝึกงานถูกยกเลิก ไดอารี่ปิดแล้ว' : 'This internship was cancelled; the diary is closed.')}
            </p>
          ) : <Button
            size="lg"
            onClick={openNewEntry}
            disabled={isLoading}
            className="rounded-2xl bg-white text-blue-700 hover:bg-blue-50 font-bold shadow-md hover:shadow-lg transition-all h-12 px-6 gap-2 shrink-0"
          >
            <Plus className="w-5 h-5 text-blue-700" />
            {language === 'th' ? 'บันทึกการทำงานวันนี้' : 'Log Daily Entry'}
          </Button>}
        </div>

      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3.5">
        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0c1222] shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/15">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {language === 'th' ? 'ชั่วโมงสะสม' : 'Total Hours'}
              </p>
              <h4 className="text-xl font-extrabold font-mono text-slate-900 dark:text-slate-50">{totalHours}</h4>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0c1222] shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/15">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {language === 'th' ? 'วันที่บันทึกแล้ว' : 'Days Logged'}
              </p>
              <h4 className="text-xl font-extrabold font-mono text-slate-900 dark:text-slate-50">{logs.length}</h4>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder={language === 'th' ? 'ค้นหาตามงานที่ทำ, ทักษะที่ได้, หรือวันที่...' : 'Search activities, learnings, or date...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm"
          />
        </div>
      </div>

      {loadError && (
        <div role="alert" data-testid="diary-load-error" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
          {language === 'th' ? 'โหลดบันทึกการฝึกงานไม่สำเร็จ' : 'Could not load internship logs'}
        </div>
      )}

      {isLoading && <div role="status" className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900"><Loader2 className="h-5 w-5 animate-spin" />{language === 'th' ? 'กำลังโหลดบันทึก...' : 'Loading diary...'}</div>}

      {/* Logs List */}
      {!isLoading && !loadError && <div className="space-y-4">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30">
            <BookOpen className="w-10 h-10 mx-auto text-slate-400 mb-3 opacity-60" />
            <h3 className="font-bold text-slate-700 dark:text-slate-300 text-base">
              {language === 'th' ? 'ไม่พบบันทึกไดอารี่' : 'No diary entries found'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {language === 'th'
                ? 'คุณสามารถกดปุ่ม "บันทึกการทำงานวันนี้" ด้านบน เพื่อเริ่มจดบันทึกไดอารี่ฝึกงาน'
                : 'Click "Log Daily Entry" button above to record your daily internship activity.'}
            </p>
          </div>
        ) : (
          filteredLogs.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0c1222] shadow-xs hover:border-blue-300 dark:hover:border-blue-800/60 transition-all space-y-3"
            >
              {/* Header: Date, Hours, Status */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/70 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {new Date(entry.date).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
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
                    {entry.hours} {language === 'th' ? 'ชม.' : 'hrs'}
                  </Badge>

                </div>
              </div>

              {/* Tasks / Activities */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {language === 'th' ? 'งานและกิจกรรมที่ปฏิบัติ:' : 'Activities & Tasks:'}
                </span>
                <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {entry.activities}
                </p>
              </div>

              {/* Learnings & Challenges Sub-grid */}
              {(entry.learnings || entry.challenges) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {entry.learnings && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        {language === 'th' ? 'สิ่งที่ได้เรียนรู้ / ทักษะใหม่' : 'Key Learnings & Skills'}
                      </span>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        {entry.learnings}
                      </p>
                    </div>
                  )}

                  {entry.challenges && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                      <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {language === 'th' ? 'ปัญหา อุปสรรค & วิธีแก้' : 'Challenges & Solutions'}
                      </span>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        {entry.challenges}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                <Badge variant="outline" className={entry.reviewStatus === 'approved' ? 'border-emerald-300 text-emerald-700 dark:text-emerald-400' : entry.reviewStatus === 'changes_requested' ? 'border-amber-300 text-amber-700 dark:text-amber-400' : 'border-slate-300 text-slate-600 dark:text-slate-300'}>
                  {entry.reviewStatus === 'approved' ? (language === 'th' ? 'อนุมัติแล้ว' : 'Approved') : entry.reviewStatus === 'changes_requested' ? (language === 'th' ? 'ขอให้แก้ไข' : 'Changes requested') : (language === 'th' ? 'รอตรวจ' : 'Pending review')}
                </Badge>
                {entry.reviewComment && <span className="text-slate-600 dark:text-slate-300">{language === 'th' ? 'ความเห็นผู้ตรวจ: ' : 'Reviewer comment: '}{entry.reviewComment}</span>}
                {/* an approved entry is final; anything else the student may still correct */}
                {entry.reviewStatus !== 'approved' && !diaryClosed && (
                  <Button type="button" size="sm" variant="outline" onClick={() => openEdit(entry)} className="ml-auto h-8 gap-1.5 rounded-lg text-xs" data-testid="diary-edit">
                    <Pencil className="h-3.5 w-3.5" />
                    {language === 'th' ? 'แก้ไข' : 'Edit'}
                  </Button>
                )}
              </div>

            </motion.div>
          ))
        )}
      </div>}

      {/* Add Daily Log Dialog Form */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[560px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <form onSubmit={handleCreateLog}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <Calendar className="w-5 h-5 text-blue-600" />
                {editingId
                  ? (language === 'th' ? 'แก้ไขบันทึกการฝึกงาน' : 'Edit diary entry')
                  : (language === 'th' ? 'บันทึกไดอารี่การฝึกงานรายวัน' : 'Log Daily Internship Diary')}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'th'
                  ? 'บันทึกกิจกรรมประจำวัน ชั่วโมงการทำงาน และทักษะที่ได้เรียนรู้เพื่อให้ Mentor ตรวจสอบ'
                  : 'Record daily activities, hours, and learnings for supervisor review.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Date & Hours Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="logDate" className="text-xs font-semibold">
                    {language === 'th' ? 'วันที่ปฏิบัติงาน *' : 'Work Date *'}
                  </Label>
                  <Input
                    id="logDate"
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="rounded-xl h-10 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="logHours" className="text-xs font-semibold">
                    {language === 'th' ? 'จำนวนชั่วโมง *' : 'Hours Worked *'}
                  </Label>
                  <Input
                    id="logHours"
                    type="number"
                    min={1}
                    max={16}
                    required
                    value={formHours}
                    onChange={(e) => setFormHours(Number(e.target.value))}
                    className="rounded-xl h-10 text-xs"
                  />
                </div>
              </div>

              {/* Activities */}
              <div className="space-y-1.5">
                <Label htmlFor="logActivities" className="text-xs font-semibold">
                  {language === 'th' ? 'งานและกิจกรรมที่ปฏิบัติในวันนี้ *' : 'Activities & Tasks Done Today *'}
                </Label>
                <Textarea
                  id="logActivities"
                  rows={3}
                  required
                  placeholder={language === 'th' ? 'ระบุรายละเอียดงานที่ได้รับมอบหมาย สิ่งที่ทำเสร็จในวันนี้...' : 'Describe tasks assigned and completed today...'}
                  value={formActivities}
                  onChange={(e) => setFormActivities(e.target.value)}
                  className="rounded-xl text-xs leading-relaxed"
                />
              </div>

              {/* Learnings */}
              <div className="space-y-1.5">
                <Label htmlFor="logLearnings" className="text-xs font-semibold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  {language === 'th' ? 'ทักษะและความรู้ใหม่ที่ได้รับ' : 'Skills & Knowledge Gained'}
                </Label>
                <Textarea
                  id="logLearnings"
                  rows={2}
                  placeholder={language === 'th' ? 'สิ่งที่ได้เรียนรู้ใหม่ เช่น การใช้เครื่องมือ วิธีการแก้ปัญหา...' : 'New skills, tools, or techniques learned...'}
                  value={formLearnings}
                  onChange={(e) => setFormLearnings(e.target.value)}
                  className="rounded-xl text-xs leading-relaxed"
                />
              </div>

              {/* Challenges */}
              <div className="space-y-1.5">
                <Label htmlFor="logChallenges" className="text-xs font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  {language === 'th' ? 'ปัญหา อุปสรรค และวิธีแก้ไข' : 'Challenges & How You Solved Them'}
                </Label>
                <Textarea
                  id="logChallenges"
                  rows={2}
                  placeholder={language === 'th' ? 'ข้อติดขัดที่พบและวิธีการแก้ปัญหา หรือต้องการคำแนะนำในจุดใด...' : 'Obstacles encountered and steps taken to resolve them...'}
                  value={formChallenges}
                  onChange={(e) => setFormChallenges(e.target.value)}
                  className="rounded-xl text-xs leading-relaxed"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="rounded-xl"
              >
                {language === 'th' ? 'ยกเลิก' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    {language === 'th' ? 'กำลังบันทึก...' : 'Saving...'}
                  </>
                ) : (
                  language === 'th' ? 'บันทึกไดอารี่' : 'Save Entry'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
