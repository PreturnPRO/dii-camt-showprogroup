import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar, BookOpen, GraduationCap, Trophy, QrCode,
  Clock, MapPin, ChevronRight, Sparkles, User, AlertCircle,
  Briefcase, CheckCircle2, ArrowUpRight, Flame, Users, Bell,
  Target, PlusCircle, Search, Building2, Send, Bookmark, DollarSign,
  TrendingUp, Award, UserCheck, ShieldCheck, Check
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { api } from '@/lib/api';
import { asArray, asNumber, asRecord, asString } from '@/lib/live-data';
import { mapCompany, mapCourse, mapGrade, mapJob, mapStudent, mapStudentStatsToStudent } from '@/lib/live-mappers';
import type { Company, Course, Grade, JobPosting, Student } from '@/types';
import AdminDashboard from '../AdminDashboard';
import StaffDashboard from '../StaffDashboard';

// =============================================================================
// 1. MOBILE COMPANY DASHBOARD (เน้นพิเศษสำหรับสถานประกอบการ)
// =============================================================================
function MobileCompanyDashboard() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [company, setCompany] = React.useState<Company | null>(null);
  const [jobs, setJobs] = React.useState<JobPosting[]>([]);
  const [matchedTalents, setMatchedTalents] = React.useState<Student[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    Promise.allSettled([
      api.auth.me(),
      api.jobs.list(),
      api.talent.search(),
      api.students.profiles(),
    ])
      .then(([authRes, jobsRes, talentsRes, profilesRes]) => {
        if (!mounted) return;

        if (authRes.status === 'fulfilled') {
          const profile = asRecord(authRes.value.user?.companyProfile);
          const profileUser = asRecord(authRes.value.user);
          setCompany(
            mapCompany({
              ...profile,
              companyName: asString(profile.companyName, asString(profileUser.name, user?.name || 'Company')),
              companyNameThai: asString(profile.companyNameThai, asString(profileUser.nameThai, asString(profileUser.name, user?.name || 'Company'))),
              industry: asString(profile.industry, 'Technology & Digital Industry'),
              size: asString(profile.size, 'medium'),
              internshipSlots: asNumber(profile.internshipSlots, 6),
              currentInterns: asNumber(profile.currentInterns, 2),
              user: authRes.value.user,
            })
          );
        }

        if (jobsRes.status === 'fulfilled') {
          setJobs(jobsRes.value.jobs.map(mapJob));
        }

        if (talentsRes.status === 'fulfilled') {
          const rawVal = talentsRes.value as Record<string, unknown>;
          const list = asArray(rawVal.talents || rawVal.students);
          setMatchedTalents(list.map((s: any) => mapStudent(s)).slice(0, 4));
        } else if (profilesRes.status === 'fulfilled') {
          setMatchedTalents(profilesRes.value.profiles.map(mapStudent).slice(0, 4));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [user]);

  // Aggregate stats
  const totalApplicants = jobs.reduce((sum, job) => sum + (job.applicants?.length || 0), 0);
  const activeJobsCount = jobs.filter((j) => j.status === 'open' || !j.status).length;
  const companyName = language === 'th'
    ? (company?.companyNameThai || company?.companyName || user?.name || 'สถานประกอบการ')
    : (company?.companyName || company?.companyNameThai || user?.name || 'Partner Company');

  // Collect all recent applicants from jobs
  const allApplicants: Array<{
    id: string;
    studentName: string;
    jobTitle: string;
    jobId: string;
    appliedAt: string;
    status: string;
  }> = [];

  jobs.forEach((job) => {
    job.applicants?.forEach((app: any) => {
      allApplicants.push({
        id: app.id || `${job.id}-${app.studentId}`,
        studentName: app.studentName || app.name || 'นักศึกษาผู้สมัคร',
        jobTitle: job.title,
        jobId: job.id,
        appliedAt: app.appliedDate ? new Date(app.appliedDate).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US') : 'วันนี้',
        status: app.status || 'pending',
      });
    });
  });

  return (
    <div className="space-y-4 pb-4">
      {/* 1. Company Welcome Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white p-5 shadow-xl shadow-indigo-950/30 border border-slate-800/80"
      >
        {/* Glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] text-emerald-300 font-bold tracking-wide">
                  {language === 'th' ? 'สถานะ: พันธมิตรทางการ (CAMT Partner)' : 'Verified Partner'}
                </span>
              </div>
              <h2 className="text-xl font-black tracking-tight text-white line-clamp-1">
                {companyName}
              </h2>
              <p className="text-xs text-slate-300 font-medium line-clamp-1">
                {company?.industry || 'Digital Industry & Software Development'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shrink-0">
              <Building2 className="w-5 h-5 text-indigo-300" />
            </div>
          </div>

          {/* 4-Stat Metrics Grid (Company KPI) */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div className="p-3 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
              <div className="flex items-center justify-between text-slate-300 text-[11px]">
                <span>ตำแหน่งเปิดรับ</span>
                <Briefcase className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="text-2xl font-black tracking-tight text-white mt-0.5">
                {activeJobsCount}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {language === 'th' ? 'ประกาศงานที่เปิดอยู่' : 'Active postings'}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
              <div className="flex items-center justify-between text-slate-300 text-[11px]">
                <span>ผู้สมัครทั้งหมด</span>
                <Users className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-2xl font-black tracking-tight text-emerald-400 mt-0.5">
                {totalApplicants}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {language === 'th' ? 'จากนักศึกษา CAMT DII' : 'Total applications'}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
              <div className="flex items-center justify-between text-slate-300 text-[11px]">
                <span>โควตารับนักศึกษา</span>
                <Award className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-2xl font-black tracking-tight text-white mt-0.5">
                {company?.internshipSlots || 6}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {language === 'th' ? 'โควตาสหกิจ/ฝึกงาน' : 'Internship slots'}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
              <div className="flex items-center justify-between text-slate-300 text-[11px]">
                <span>AI Matching</span>
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="text-2xl font-black tracking-tight text-purple-300 mt-0.5">
                {matchedTalents.length || 8}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {language === 'th' ? 'นักศึกษาทักษะตรง' : 'Matched students'}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. Company Quick Touch Shortcuts (4 Grid) */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={() => navigate('/job-postings')}
          className="flex flex-col items-center p-3 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 shadow-xs active:scale-95 transition-all text-center cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1.5">
            <PlusCircle className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
            {language === 'th' ? 'ประกาศงาน' : 'Post Job'}
          </span>
        </button>

        <button
          onClick={() => navigate('/skills-requirement')}
          className="flex flex-col items-center p-3 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 shadow-xs active:scale-95 transition-all text-center cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-1.5">
            <Target className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
            {language === 'th' ? 'ระบุทักษะ' : 'Skills'}
          </span>
        </button>

        <button
          onClick={() => navigate('/student-profiles')}
          className="flex flex-col items-center p-3 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 shadow-xs active:scale-95 transition-all text-center cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-1.5">
            <Search className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
            {language === 'th' ? 'ค้นหาเด็ก' : 'Students'}
          </span>
        </button>

        <button
          onClick={() => navigate('/applicants')}
          className="flex flex-col items-center p-3 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 shadow-xs active:scale-95 transition-all text-center cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1.5 relative">
            <Users className="w-5 h-5" />
            {totalApplicants > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center">
                {totalApplicants}
              </span>
            )}
          </div>
          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
            {language === 'th' ? 'ผู้สมัคร' : 'Applicants'}
          </span>
        </button>
      </div>

      {/* 3. ผู้สมัครล่าสุด (Recent Applicants) */}
      <div className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              {language === 'th' ? 'ผู้สมัครงานล่าสุด' : 'Recent Applicants'}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/applicants')}
            className="h-7 text-xs text-emerald-600 dark:text-emerald-400 font-semibold px-2 cursor-pointer"
          >
            {language === 'th' ? 'ดูทั้งหมด' : 'View All'} <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </Button>
        </div>

        {allApplicants.length > 0 ? (
          <div className="space-y-2.5">
            {allApplicants.slice(0, 3).map((app, idx) => (
              <div
                key={idx}
                onClick={() => navigate('/applicants')}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 active:scale-[0.99] transition-transform cursor-pointer"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {app.studentName}
                    </span>
                    <Badge variant="secondary" className="text-[10px] bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-0">
                      {app.appliedAt}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    สมัครตำแหน่ง: <span className="font-semibold text-slate-700 dark:text-slate-300">{app.jobTitle}</span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold shrink-0 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60"
                >
                  {language === 'th' ? 'รอพิจารณา' : 'Pending'}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-5 text-center rounded-2xl bg-slate-50/60 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800">
            <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2">
              <Users className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {language === 'th' ? 'ยังไม่มีผู้สมัครใหม่ในขณะนี้' : 'No new applicants yet'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {language === 'th' ? 'เมื่อมีนักศึกษากดสมัคร ระบบจะแจ้งเตือนที่นี่ทันที' : 'Applicants will appear here when submitted'}
            </p>
          </div>
        )}
      </div>

      {/* 4. ตำแหน่งงานที่กำลังเปิดรับ (Active Job Postings) */}
      <div className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              {language === 'th' ? 'ตำแหน่งงานที่เปิดรับ' : 'Active Job Postings'}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/job-postings')}
            className="h-7 text-xs text-blue-600 dark:text-blue-400 font-semibold px-2 cursor-pointer"
          >
            {language === 'th' ? 'จัดการ' : 'Manage'} <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </Button>
        </div>

        <div className="space-y-2">
          {jobs.length > 0 ? (
            jobs.slice(0, 3).map((job, idx) => (
              <div
                key={`${job.id}-${idx}`}
                onClick={() => navigate('/job-postings')}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between active:scale-[0.99] transition-transform cursor-pointer"
              >
                <div className="space-y-0.5 min-w-0 pr-2">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {job.title}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <span>{job.type === 'internship' ? 'ฝึกงาน' : job.type === 'full-time' ? 'งานประจำ' : 'พาร์ทไทม์'}</span>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{job.salary || 'มีเบี้ยเลี้ยง'}</span>
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px] font-mono shrink-0">
                  {job.applicants?.length || 0} ผู้สมัคร
                </Badge>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-xs text-slate-400">
              {language === 'th' ? 'ยังไม่มีประกาศงาน คลิกปุ่ม "ประกาศงาน" ด้านบนเพื่อเริ่มรับสมัคร' : 'No job postings yet'}
            </div>
          )}
        </div>
      </div>

      {/* 5. AI Talent Matching Preview */}
      <div className="bg-gradient-to-br from-indigo-50/70 to-purple-50/70 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-3xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-indigo-100/80 dark:border-indigo-900/40">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-sm text-indigo-950 dark:text-indigo-200">
              {language === 'th' ? 'AI แนะนำนักศึกษาทักษะตรง' : 'AI Matched Talents'}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/student-profiles')}
            className="h-7 text-xs text-indigo-600 dark:text-indigo-400 font-semibold px-2 cursor-pointer"
          >
            {language === 'th' ? 'ค้นหาเพิ่ม' : 'Explore'} <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </Button>
        </div>

        <div className="space-y-2">
          {matchedTalents.length > 0 ? (
            matchedTalents.slice(0, 2).map((st, i) => (
              <div
                key={st.id || i}
                onClick={() => navigate('/student-profiles')}
                className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between gap-3 active:scale-[0.99] transition-transform cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {st.name?.slice(0, 2) || 'ST'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {st.name}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      GPA {st.gpa?.toFixed(2) || '3.75'} • Digital Industry Integration
                    </div>
                  </div>
                </div>
                <Badge className="text-[10px] font-bold bg-indigo-600 text-white shrink-0">
                  {95 - i * 3}% Match
                </Badge>
              </div>
            ))
          ) : (
            <div className="p-3 text-center text-xs text-indigo-700 dark:text-indigo-300 font-medium">
              กำลังจับคู่นักศึกษากับ Requirement ของบริษัท...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// 2. MOBILE STUDENT DASHBOARD — Redesigned: Clean, Modern University Portal
// =============================================================================
function MobileStudentDashboard() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [student, setStudent] = React.useState<Student | null>(null);
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [grades, setGrades] = React.useState<Grade[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    Promise.allSettled([
      api.students.profile(),
      api.students.stats(),
      api.grades.transcript(),
      api.enrollments.list(),
    ])
      .then(([profileRes, statsRes, transcriptRes, enrollmentsRes]) => {
        if (!mounted) return;

        let nextStudent: Student | null = null;
        if (profileRes.status === 'fulfilled') {
          nextStudent = mapStudent(profileRes.value.profile);
        }
        if (statsRes.status === 'fulfilled' && nextStudent) {
          nextStudent = mapStudentStatsToStudent(nextStudent, statsRes.value.stats);
        }
        if (nextStudent) setStudent(nextStudent);

        if (transcriptRes.status === 'fulfilled') {
          setGrades(transcriptRes.value.transcript.map(mapGrade));
        }
        if (enrollmentsRes.status === 'fulfilled') {
          setCourses(
            enrollmentsRes.value.enrollments.map((item: any, i: number) => {
              const rec = asRecord(item);
              return mapCourse(rec.course, i);
            })
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [user]);

  // ── Determine current day ──
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayNameThai = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  const now = new Date();
  const currentDayIndex = now.getDay();
  const currentDayEn = dayNames[currentDayIndex];
  const currentDayTh = dayNameThai[currentDayIndex];
  const currentHHMM = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  // ── Today's classes ──
  const todaysClasses: Array<{ course: Course; startTime: string; endTime: string; room?: string; building?: string; type?: string }> = [];
  courses.forEach((course) => {
    course.schedule?.forEach((s) => {
      if (s.day?.toLowerCase() === currentDayEn) {
        todaysClasses.push({
          course,
          startTime: s.startTime || '??:??',
          endTime: s.endTime || '??:??',
          room: s.room || course.room || 'TBA',
          building: s.building || '',
          type: s.type || 'lecture',
        });
      }
    });
  });
  todaysClasses.sort((a, b) => a.startTime.localeCompare(b.startTime));

  // ── Academic data ──
  const gpa = student?.gpa || (grades.length ? 3.82 : 3.82);
  const totalCredits = student?.totalCredits || 68;
  const requiredCredits = student?.requiredCredits || 130;
  const progressPercent = Math.min(100, Math.round((totalCredits / requiredCredits) * 100));

  // ── Accent colors for timeline items ──
  const accentPalette = [
    { bg: 'bg-blue-500', bgSoft: 'bg-blue-500/10 dark:bg-blue-400/10', text: 'text-blue-600 dark:text-blue-400', ring: 'ring-blue-500/30' },
    { bg: 'bg-violet-500', bgSoft: 'bg-violet-500/10 dark:bg-violet-400/10', text: 'text-violet-600 dark:text-violet-400', ring: 'ring-violet-500/30' },
    { bg: 'bg-emerald-500', bgSoft: 'bg-emerald-500/10 dark:bg-emerald-400/10', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-500/30' },
    { bg: 'bg-amber-500', bgSoft: 'bg-amber-500/10 dark:bg-amber-400/10', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-500/30' },
    { bg: 'bg-rose-500', bgSoft: 'bg-rose-500/10 dark:bg-rose-400/10', text: 'text-rose-600 dark:text-rose-400', ring: 'ring-rose-500/30' },
  ];

  // ── Greeting helper ──
  const hour = now.getHours();
  const greeting = language === 'th'
    ? (hour < 12 ? 'สวัสดีตอนเช้า' : hour < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น')
    : (hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening');

  // ── Type icon ──
  const classTypeLabel = (t?: string) => {
    if (t === 'lab') return language === 'th' ? 'ปฏิบัติ' : 'Lab';
    if (t === 'tutorial') return language === 'th' ? 'บรรยาย/ฝึก' : 'Tutorial';
    return language === 'th' ? 'บรรยาย' : 'Lecture';
  };

  return (
    <div className="space-y-5 pb-6">

      {/* ================================================================
          SECTION 1 — Compact Profile & Academic Status
          ================================================================ */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-3"
      >
        {/* Greeting row */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {language === 'th'
                ? `วัน${currentDayTh} • ${now.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}`
                : now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
            <h1 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              {greeting}, {user?.name?.split(' ')[0] || (language === 'th' ? 'นักศึกษา' : 'Student')}
            </h1>
          </div>
          <div
            onClick={() => navigate('/settings')}
            className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-lg shadow-blue-600/20 cursor-pointer active:scale-90 transition-transform"
          >
            {user?.name ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'U'}
          </div>
        </div>

        {/* 2-Column Stats Row */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* GPA Card */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0d1424] border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {language === 'th' ? 'GPA สะสม' : 'Cum. GPA'}
              </span>
              <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
              </div>
            </div>
            <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-none">
              {gpa.toFixed(2)}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
              {gpa >= 3.5 ? (language === 'th' ? 'เกียรตินิยม' : 'Dean\'s list') : (language === 'th' ? 'สถานะปกติ' : 'Good standing')}
            </p>
          </div>

          {/* Credits Progress Card */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0d1424] border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {language === 'th' ? 'หน่วยกิต' : 'Credits'}
              </span>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">{progressPercent}%</span>
            </div>
            <div className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
              {totalCredits}<span className="text-sm font-normal text-slate-400 dark:text-slate-500">/{requiredCredits}</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full"
              />
            </div>
          </div>
        </div>
      </motion.section>

      {/* ================================================================
          SECTION 2 — Quick Actions (4-icon row)
          ================================================================ */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
      >
        <div className="grid grid-cols-4 gap-2">
          {([
            { icon: Calendar, label: language === 'th' ? 'ตารางเรียน' : 'Schedule', href: '/schedule', color: 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400' },
            { icon: GraduationCap, label: language === 'th' ? 'ดูเกรด' : 'Grades', href: '/grades', color: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400' },
            { icon: QrCode, label: language === 'th' ? 'เช็คชื่อ' : 'Check-in', href: '/student/checkin', color: 'bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400' },
            { icon: Trophy, label: language === 'th' ? 'ผลงาน' : 'Portfolio', href: '/portfolio', color: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400' },
          ] as const).map(({ icon: Icon, label, href, color }) => (
            <button
              key={href}
              onClick={() => navigate(href)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white dark:bg-[#0d1424] border border-slate-200/70 dark:border-slate-800/70 active:scale-[0.93] transition-all cursor-pointer shadow-sm"
            >
              <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300 leading-tight text-center">
                {label}
              </span>
            </button>
          ))}
        </div>
      </motion.section>

      {/* ================================================================
          SECTION 3 — Today's Schedule (Timeline Style)
          ================================================================ */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="bg-white dark:bg-[#0d1424] border border-slate-200/70 dark:border-slate-800/70 rounded-2xl shadow-sm overflow-hidden"
      >
        {/* Section Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                {language === 'th' ? 'ตารางเรียนวันนี้' : "Today's Schedule"}
              </h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                {todaysClasses.length > 0
                  ? (language === 'th' ? `${todaysClasses.length} วิชา • ${currentDayTh}` : `${todaysClasses.length} classes • ${dayNames[currentDayIndex].charAt(0).toUpperCase() + dayNames[currentDayIndex].slice(1)}`)
                  : (language === 'th' ? `ไม่มีวิชาเรียน • ${currentDayTh}` : `No classes • ${dayNames[currentDayIndex].charAt(0).toUpperCase() + dayNames[currentDayIndex].slice(1)}`)}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/schedule')}
            className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-0.5 active:scale-95 transition-transform cursor-pointer"
          >
            {language === 'th' ? 'ดูทั้งหมด' : 'View all'}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Timeline Content */}
        <div className="px-4 pb-4">
          {todaysClasses.length > 0 ? (
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-[22px] top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-800" />

              <div className="space-y-3">
                {todaysClasses.map((item, idx) => {
                  const accent = accentPalette[idx % accentPalette.length];
                  const isPast = item.endTime < currentHHMM;
                  const isCurrent = item.startTime <= currentHHMM && item.endTime >= currentHHMM;

                  return (
                    <div key={idx} className="flex gap-3 items-start relative">
                      {/* Timeline dot */}
                      <div className="relative z-10 flex flex-col items-center pt-1.5 shrink-0 w-[45px]">
                        <div className={`w-3 h-3 rounded-full ${isCurrent ? `${accent.bg} ring-4 ${accent.ring} animate-pulse` : isPast ? 'bg-slate-300 dark:bg-slate-700' : accent.bg} transition-colors`} />
                      </div>

                      {/* Class card */}
                      <div className={`flex-1 p-3 rounded-xl border transition-all ${
                        isCurrent
                          ? `${accent.bgSoft} border-current/20 dark:border-current/10 shadow-sm`
                          : isPast
                            ? 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800/50 opacity-60'
                            : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800/60'
                      }`}>
                        {/* Time row */}
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-[11px] font-bold font-mono ${isCurrent ? accent.text : 'text-slate-500 dark:text-slate-400'}`}>
                            {item.startTime} – {item.endTime}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {isCurrent && (
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-blue-600 text-white tracking-wide">
                                {language === 'th' ? 'ตอนนี้' : 'NOW'}
                              </span>
                            )}
                            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded-md">
                              {classTypeLabel(item.type)}
                            </span>
                          </div>
                        </div>

                        {/* Course name */}
                        <h3 className={`text-[13px] font-bold leading-snug mb-1 ${isPast ? 'text-slate-500 dark:text-slate-400 line-through decoration-slate-300 dark:decoration-slate-700' : 'text-slate-900 dark:text-white'}`}>
                          {language === 'th' ? item.course.nameThai || item.course.name : item.course.name}
                        </h3>

                        {/* Meta row */}
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className={`font-mono font-semibold px-1.5 py-0.5 rounded-md ${accent.bgSoft} ${accent.text} text-[10px]`}>
                            {item.course.code}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {item.room}{item.building ? ` • ${item.building}` : ''}
                          </span>
                          {item.course.lecturerName && (
                            <span className="flex items-center gap-1 truncate max-w-[100px]">
                              <User className="w-3 h-3" />
                              {item.course.lecturerName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Empty state */
            <div className="py-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {language === 'th' ? 'วันนี้ไม่มีคลาสเรียน' : 'No classes today'}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[220px] mx-auto">
                {language === 'th' ? 'พักผ่อน ทบทวนบทเรียน หรือทำ Portfolio เพิ่มเติม' : 'Rest up, review notes, or work on your portfolio'}
              </p>
            </div>
          )}
        </div>
      </motion.section>

      {/* ================================================================
          SECTION 4 — Enrolled Courses (Compact List)
          ================================================================ */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="bg-white dark:bg-[#0d1424] border border-slate-200/70 dark:border-slate-800/70 rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {language === 'th' ? 'วิชาเทอมนี้' : 'This Semester'}
            </h2>
          </div>
          <button
            onClick={() => navigate('/courses')}
            className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 flex items-center gap-0.5 active:scale-95 transition-transform cursor-pointer"
          >
            {language === 'th' ? `ทั้งหมด ${courses.length} วิชา` : `All ${courses.length}`}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-4 pb-4 space-y-2">
          {courses.length > 0 ? courses.slice(0, 4).map((c, ci) => {
            const accent = accentPalette[ci % accentPalette.length];
            return (
              <div
                key={`${c.id}-${ci}`}
                onClick={() => navigate('/courses')}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/50 active:scale-[0.98] transition-transform cursor-pointer"
              >
                {/* Colored accent bar */}
                <div className={`w-1 h-10 rounded-full ${accent.bg} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-bold font-mono ${accent.text}`}>{c.code}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">{c.credits} {language === 'th' ? 'หน่วยกิต' : 'credits'}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">
                    {language === 'th' ? c.nameThai || c.name : c.name}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                    {c.lecturerName || 'DII Faculty'}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
              </div>
            );
          }) : (
            <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
              {language === 'th' ? 'ยังไม่มีข้อมูลวิชาเรียนเทอมนี้' : 'No courses enrolled yet'}
            </div>
          )}
        </div>
      </motion.section>

      {/* ================================================================
          SECTION 5 — Academic Advisor
          ================================================================ */}
      <motion.section
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        onClick={() => navigate('/students')}
        className="bg-white dark:bg-[#0d1424] border border-slate-200/70 dark:border-slate-800/70 rounded-2xl shadow-sm overflow-hidden p-4 cursor-pointer active:scale-[0.99] transition-transform"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-blue-600/15 shrink-0">
              {(student?.advisorName || 'นร').slice(0, 2)}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {language === 'th' ? 'อาจารย์ที่ปรึกษา' : 'Academic Advisor'}
              </p>
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {student?.advisorName || 'ผศ.ดร. นรินทร์ พิชยกุล'}
              </p>
              <p className="text-[10px] text-blue-600 dark:text-blue-400">
                CAMT Building • DII
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              navigate('/students');
            }}
            className="h-8 rounded-xl text-[11px] font-semibold px-3 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs cursor-pointer active:scale-95 transition-transform"
          >
            {language === 'th' ? 'ดูข้อมูล' : 'Details'}
          </Button>
        </div>
      </motion.section>
    </div>
  );
}

// =============================================================================
// 3. MOBILE LECTURER DASHBOARD (สำหรับอาจารย์ผู้สอน)
// =============================================================================
function MobileLecturerDashboard() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="space-y-4 pb-4">
      {/* Lecturer Welcome Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl bg-gradient-to-br from-indigo-700 via-purple-700 to-purple-900 text-white p-5 shadow-xl shadow-indigo-600/20"
      >
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Badge className="bg-white/20 text-white border-0 text-[10px]">
              {language === 'th' ? 'อาจารย์ประจำสาขา' : 'Faculty Instructor'}
            </Badge>
            <h2 className="text-xl font-black tracking-tight text-white mt-1">
              {user?.name || 'อาจารย์'}
            </h2>
            <p className="text-xs text-indigo-100/80">
              Digital Industry Integration (DII) • CAMT
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white">
            <GraduationCap className="w-5 h-5 text-indigo-200" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/15 text-center">
          <div className="p-2 rounded-xl bg-white/10">
            <div className="text-[10px] text-indigo-200">วิชาที่สอน</div>
            <div className="text-lg font-black text-white">3</div>
          </div>
          <div className="p-2 rounded-xl bg-white/10">
            <div className="text-[10px] text-indigo-200">นศ. ที่ปรึกษา</div>
            <div className="text-lg font-black text-white">18</div>
          </div>
          <div className="p-2 rounded-xl bg-white/10">
            <div className="text-[10px] text-indigo-200">นัดหมาย</div>
            <div className="text-lg font-black text-white">2</div>
          </div>
        </div>
      </motion.div>

      {/* Lecturer Quick Shortcuts */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={() => navigate('/schedule')}
          className="flex flex-col items-center p-3 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 shadow-xs active:scale-95 transition-all text-center cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-1.5">
            <Calendar className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
            {language === 'th' ? 'ตารางสอน' : 'Schedule'}
          </span>
        </button>

        <button
          onClick={() => navigate('/courses')}
          className="flex flex-col items-center p-3 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 shadow-xs active:scale-95 transition-all text-center cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-1.5">
            <BookOpen className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
            {language === 'th' ? 'จัดการวิชา' : 'Courses'}
          </span>
        </button>

        <button
          onClick={() => navigate('/attendance')}
          className="flex flex-col items-center p-3 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 shadow-xs active:scale-95 transition-all text-center cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-1.5">
            <QrCode className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
            {language === 'th' ? 'เช็คชื่อ' : 'Attendance'}
          </span>
        </button>

        <button
          onClick={() => navigate('/students')}
          className="flex flex-col items-center p-3 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 shadow-xs active:scale-95 transition-all text-center cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1.5">
            <Users className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
            {language === 'th' ? 'นักศึกษา' : 'Students'}
          </span>
        </button>
      </div>

      {/* Teaching Schedule */}
      <div className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            {language === 'th' ? 'ตารางสอนสัปดาห์นี้' : 'Teaching Schedule'}
          </h3>
          <Button variant="ghost" size="sm" onClick={() => navigate('/schedule')} className="h-7 text-xs text-indigo-600 dark:text-indigo-400 font-semibold px-2 cursor-pointer">
            {language === 'th' ? 'ตารางเต็ม' : 'Full'} <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </Button>
        </div>
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
              DII201
            </span>
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Web Application Development
            </div>
            <div className="text-[11px] text-slate-400">
              ห้อง CAMT-412 • 09:00 - 12:00
            </div>
          </div>
          <Badge className="bg-indigo-600 text-white text-[10px]">
            45 นศ.
          </Badge>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN MOBILE DASHBOARD EXPORT: ROUTES ACCORDING TO USER ROLE
// =============================================================================
export function MobileDashboard() {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case 'company':
      return <MobileCompanyDashboard />;
    case 'lecturer':
      return <MobileLecturerDashboard />;
    case 'student':
      return <MobileStudentDashboard />;
    case 'admin':
      return <AdminDashboard />;
    case 'staff':
      return <StaffDashboard />;
    default:
      return null;
  }
}
