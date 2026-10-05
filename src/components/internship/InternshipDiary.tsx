import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, CheckCircle2, AlertCircle, MessageSquare,
  Plus, Search, Building, UserCheck, Sparkles, Filter,
  BookOpen, ChevronRight, Check, X, Award, Briefcase, Loader2
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
import { api } from '@/lib/api';
import { asArray, asNumber, asRecord, asString } from '@/lib/live-data';
import type { InternshipLog } from '@/types';

export interface DailyDiaryEntry {
  id: string;
  date: string;
  hours: number;
  activities: string;
  learnings: string;
  challenges: string;
  status: 'pending' | 'approved' | 'needs_revision';
  mentorComment?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

const STORAGE_KEY = 'xchange_student_internship_logs_v1';

const defaultEntries: DailyDiaryEntry[] = [
  {
    id: 'log-1',
    date: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10),
    hours: 8,
    activities: 'ศึกษา Codebase ของระบบ และประชุม Kickoff รับ Requirement โมดูลระบบจัดการผู้ใช้กับทีม Frontend',
    learnings: 'เรียนรู้สถาปัตยกรรม Monorepo และการจัดการ State ด้วย React Context ร่วมกับ TanStack Query',
    challenges: 'การตั้งค่า Environment เครื่อง Local ในช่วงแรกมีปัญหาเรื่อง Node version แก้ไขโดยใช้ NVM',
    status: 'approved',
    mentorComment: 'เริ่มต้นได้ดีมาก เข้าใจโครงสร้างโปรเจกต์ได้เร็ว ขอให้รักษามาตรฐานนี้ไว้ครับ',
    reviewedBy: 'พี่กิตติศักดิ์ (Senior Mentor)',
    reviewedAt: '2026-09-06 17:30',
  },
  {
    id: 'log-2',
    date: new Date(Date.now() - 86400000 * 1).toISOString().slice(0, 10),
    hours: 8,
    activities: 'พัฒนาหน้าจอ UI Component สำหรับแสดงผลตารางงาน และเชื่อมต่อ REST API Endpoint /users/profile',
    learnings: 'ฝึกฝนการเขียน TailwindCSS ร่วมกับ Framer Motion ในการทำ Micro-interactions ที่ลื่นไหล',
    challenges: 'พบข้อผิดพลาดเรื่อง CORS ขณะต่อ API เครื่องจำลอง แก้ไขโดยปรับ Proxy config ใน Vite',
    status: 'approved',
    mentorComment: 'UI ออกมาสวยงามตรงตาม Design System ครับ พรุ่งนี้เริ่มทดสอบ Responsive เพิ่มเติมนะ',
    reviewedBy: 'พี่กิตติศักดิ์ (Senior Mentor)',
    reviewedAt: '2026-09-07 18:15',
  },
  {
    id: 'log-3',
    date: new Date().toISOString().slice(0, 10),
    hours: 8,
    activities: 'ปรับแต่ง Responsive UI หน้าจอมือถือ และเขียน Unit Test สำหรับฟอร์มตรวจสอบข้อมูลเข้าใช้งาน',
    learnings: 'เข้าใจการจำลอง Test Environment ด้วย Vitest และการทดสอบ Form Validation ด้วย Zod',
    challenges: 'ต้องปรับปรุง Touch target บนจอมือถือให้ได้มาตรฐาน 44px ตาม Accessibility Guidelines',
    status: 'pending',
  },
];

export function InternshipDiary() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();

  const [logs, setLogs] = useState<DailyDiaryEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return defaultEntries;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formHours, setFormHours] = useState<number>(8);
  const [formActivities, setFormActivities] = useState('');
  const [formLearnings, setFormLearnings] = useState('');
  const [formChallenges, setFormChallenges] = useState('');

  // Fetch from API on mount
  useEffect(() => {
    let mounted = true;
    api.internship.get()
      .then((res) => {
        if (!mounted) return;
        const record = asRecord(res.internship);
        const apiLogs = asArray(record.logs);
        if (apiLogs.length > 0) {
          const mapped: DailyDiaryEntry[] = apiLogs.map((item, index) => {
            const row = asRecord(item);
            return {
              id: asString(row.id, `api-log-${index}`),
              date: asString(row.date, new Date().toISOString().slice(0, 10)).slice(0, 10),
              hours: asNumber(row.hours, 8),
              activities: asString(row.activities, ''),
              learnings: asString(row.learnings, ''),
              challenges: asString(row.challenges, ''),
              status: (asString(row.status, 'pending') as DailyDiaryEntry['status']) || 'pending',
              mentorComment: asString(row.mentorComment, ''),
              reviewedBy: asString(row.reviewedBy, ''),
              reviewedAt: asString(row.reviewedAt, ''),
            };
          });
          setLogs(mapped);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
        }
      })
      .catch((err) => {
        console.warn('Using local internship diary logs', err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const saveLogs = (newLogs: DailyDiaryEntry[]) => {
    setLogs(newLogs);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newLogs));
    } catch {
      // ignore
    }
  };

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
    const newEntry: DailyDiaryEntry = {
      id: `log-${Date.now()}`,
      date: formDate,
      hours: Number(formHours) || 8,
      activities: formActivities.trim(),
      learnings: formLearnings.trim(),
      challenges: formChallenges.trim(),
      status: 'pending',
    };

    try {
      // Send to API
      await api.internship.createLog({
        date: formDate,
        hours: Number(formHours) || 8,
        activities: formActivities.trim(),
        learnings: formLearnings.trim(),
        challenges: formChallenges.trim(),
      });
    } catch (error) {
      console.warn('API sync warning; log saved to local storage', error);
    } finally {
      const updated = [newEntry, ...logs];
      saveLogs(updated);
      setIsSubmitting(false);
      setIsDialogOpen(false);
      // Reset form
      setFormActivities('');
      setFormLearnings('');
      setFormChallenges('');
      setFormHours(8);
      toast({
        title: language === 'th' ? 'บันทึกไดอารี่ประจำวันแล้ว' : 'Diary entry logged successfully',
        description: `${formDate} (${formHours} ${language === 'th' ? 'ชั่วโมง' : 'hours'})`,
      });
    }
  };

  // Calculations
  const totalHours = logs.reduce((sum, l) => sum + l.hours, 0);
  const targetHours = 300; // standard requirement
  const progressPercent = Math.min(Math.round((totalHours / targetHours) * 100), 100);
  const approvedCount = logs.filter((l) => l.status === 'approved').length;
  const pendingCount = logs.filter((l) => l.status === 'pending').length;

  const filteredLogs = logs.filter((item) => {
    const matchesSearch =
      item.activities.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.learnings.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.challenges.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.date.includes(searchQuery);

    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner: Internship Status & Action */}
      <div className="rounded-3xl p-6 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs px-2.5 py-0.5 backdrop-blur-sm">
                <Briefcase className="w-3 h-3 mr-1" />
                {language === 'th' ? 'สถานะ: กำลังฝึกงาน' : 'Status: In Progress'}
              </Badge>
              <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-400/30 text-xs px-2.5 py-0.5">
                ภาคเรียนที่ 1/2569
              </Badge>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {language === 'th' ? 'ไดอารี่บันทึกการฝึกงาน' : 'Internship Daily Diary'}
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-blue-100">
              <span className="flex items-center gap-1.5">
                <Building className="w-4 h-4 text-blue-200" />
                Tech Innovation Co., Ltd.
              </span>
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-blue-200" />
                {language === 'th' ? 'พี่เลี้ยง: คุณกิตติศักดิ์ พรหมดี' : 'Mentor: Kittisak Promdee'}
              </span>
            </div>
          </div>

          <Button
            size="lg"
            onClick={() => setIsDialogOpen(true)}
            className="rounded-2xl bg-white text-blue-700 hover:bg-blue-50 font-bold shadow-md hover:shadow-lg transition-all h-12 px-6 gap-2 shrink-0"
          >
            <Plus className="w-5 h-5 text-blue-700" />
            {language === 'th' ? 'บันทึกการทำงานวันนี้' : 'Log Daily Entry'}
          </Button>
        </div>

        {/* Hour Progress Bar */}
        <div className="relative z-10 mt-6 pt-5 border-t border-white/15">
          <div className="flex justify-between items-center text-xs sm:text-sm mb-2 font-medium">
            <span>{language === 'th' ? 'ความคืบหน้าชั่วโมงฝึกงานสะสม' : 'Accumulated Internship Hours'}</span>
            <span className="font-mono font-bold text-white text-base">
              {totalHours} / {targetHours} {language === 'th' ? 'ชม.' : 'hrs'} ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-2.5 bg-black/20 rounded-full overflow-hidden p-0.5 backdrop-blur-sm">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-emerald-400 to-cyan-300 rounded-full"
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
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

        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0c1222] shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {language === 'th' ? 'อนุมัติแล้ว' : 'Approved'}
              </p>
              <h4 className="text-xl font-extrabold font-mono text-slate-900 dark:text-slate-50">{approvedCount}</h4>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0c1222] shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/15">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {language === 'th' ? 'รอการตรวจสอบ' : 'Pending Review'}
              </p>
              <h4 className="text-xl font-extrabold font-mono text-slate-900 dark:text-slate-50">{pendingCount}</h4>
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
        <div className="flex gap-2">
          {['all', 'approved', 'pending'].map((status) => (
            <Button
              key={status}
              size="sm"
              variant={filterStatus === status ? 'default' : 'outline'}
              onClick={() => setFilterStatus(status)}
              className="rounded-xl text-xs capitalize"
            >
              {status === 'all'
                ? (language === 'th' ? 'ทั้งหมด' : 'All')
                : status === 'approved'
                ? (language === 'th' ? 'อนุมัติแล้ว' : 'Approved')
                : (language === 'th' ? 'รอตรวจ' : 'Pending')}
            </Button>
          ))}
        </div>
      </div>

      {/* Logs List */}
      <div className="space-y-4">
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
                    <span className="text-xs text-slate-400 ml-2 font-mono">
                      {entry.date}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs border-slate-200 dark:border-slate-700">
                    <Clock className="w-3 h-3 mr-1 text-slate-400" />
                    {entry.hours} {language === 'th' ? 'ชม.' : 'hrs'}
                  </Badge>

                  {entry.status === 'approved' ? (
                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {language === 'th' ? 'อนุมัติแล้ว' : 'Approved'}
                    </Badge>
                  ) : entry.status === 'needs_revision' ? (
                    <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {language === 'th' ? 'ขอให้แก้ไข' : 'Needs Revision'}
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs gap-1">
                      <Clock className="w-3 h-3" />
                      {language === 'th' ? 'รอการตรวจ' : 'Pending Review'}
                    </Badge>
                  )}
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

              {/* Mentor Feedback Section */}
              {entry.mentorComment ? (
                <div className="mt-3 p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-900/50 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      {language === 'th' ? 'ข้อเสนอแนะจาก Mentor / อาจารย์:' : 'Mentor / Supervisor Feedback:'}
                    </span>
                    {entry.reviewedAt && (
                      <span className="text-[11px] text-blue-500 font-normal">
                        {entry.reviewedAt}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 italic">
                    "{entry.mentorComment}"
                  </p>
                  {entry.reviewedBy && (
                    <p className="text-[11px] text-slate-400 text-right">
                      - {entry.reviewedBy}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 italic pt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {language === 'th' ? 'ยังไม่มีข้อคิดเห็นเพิ่มเติมจากพี่เลี้ยง' : 'Awaiting feedback from mentor'}
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Add Daily Log Dialog Form */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[560px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <form onSubmit={handleCreateLog}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <Calendar className="w-5 h-5 text-blue-600" />
                {language === 'th' ? 'บันทึกไดอารี่การฝึกงานรายวัน' : 'Log Daily Internship Diary'}
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
