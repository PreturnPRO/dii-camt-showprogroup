import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, UserPlus, GraduationCap, Heart, Send, Building, ClipboardList, TrendingUp } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { asArray, asDate, asNumber, asRecord, asString } from '@/lib/live-data';
import { mapCompany, mapJob } from '@/lib/live-mappers';
import { getFavorites, type FavoriteStudent } from '@/lib/company-favorites';
import { TargetTrackHero } from '@/components/dashboard/TargetTrackHero';
import type { Application, Company, JobPosting } from '@/types';

type ApplicantRow = Application & {
  jobTitle: string;
  student?: {
    id: string;
    nameThai: string;
    name: string;
    gpa: number;
    year: number;
  };
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const PIPELINE_STAGES: Application['status'][] = [
  'pending',
  'accepted',
];

const isSameCalendarDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export default function CompanyDashboard() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [companyJobPostings, setCompanyJobPostings] = useState<JobPosting[]>([]);
  const [applications, setApplications] = useState<ApplicantRow[]>([]);
  const [favorites, setFavorites] = useState<FavoriteStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const companyName = language === 'th'
    ? (company?.companyNameThai || company?.companyName || user?.name || '')
    : (company?.companyName || company?.companyNameThai || user?.name || '');

  const today = new Date();
  const todayLabel = today.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const copy = language === 'th'
    ? {
<<<<<<< Updated upstream
        submitRequirement: 'ส่ง Requirement',
        submitRequirementTitle: 'ส่งคำขอ Requirement ใหม่',
        submitRequirementDesc: 'ระบุตำแหน่งงาน ทักษะ และรายละเอียดต่างๆ เพื่อให้ AI สามารถจับคู่คุณกับนักเรียนได้',
        role: 'ตำแหน่งงาน',
        skills: 'ทักษะสำคัญ',
        details: 'รายละเอียด',
        submitToAi: 'ส่งไปยัง AI Matching',
        liveAlerts: 'การแจ้งเตือนการจ้างงานแบบเรียลไทม์',
        new: 'ใหม่',
        viewDetails: 'ดูรายละเอียด',
        requirements: 'Requirements & AI Matches',
        followed: 'ติดตาม Talent',
        activeRequirements: 'Requirement ที่เปิดอยู่',
        total: 'ทั้งหมด',
        postedCriteria: 'เงื่อนไขที่ประกาศไว้สำหรับจับคู่นักศึกษา',
        matches: 'Matches',
        aiTalentMatching: 'AI Talent Matching',
        bestMatches: 'นักศึกษาที่เหมาะกับ Requirement ของคุณที่สุด',
        exclusiveAccess: 'สิทธิ์เข้าถึงพิเศษ',
        fastTrackOffer: 'ส่งข้อเสนอแบบ Fast-track',
        follow: 'ติดตาม',
        viewProfile: 'ดูโปรไฟล์',
        trackedProgress: 'ติดตามความคืบหน้าของนักศึกษาที่สนใจ',
        followedDate: 'ติดตามเมื่อ',
        currentGpa: 'GPA ปัจจุบัน',
        profileOverview: 'ดูภาพรวมโปรไฟล์',
        noJobs: 'ยังไม่มีประกาศงานจาก API',
        noStudents: 'ยังไม่มีนักศึกษาที่เปิดสิทธิ์ให้ดู',
        noRequirements: 'ยังไม่มี Requirement',
        noMatches: 'ยังไม่มีผลจับคู่จาก AI',
        noFollowed: 'ยังไม่มี Talent ที่ติดตาม',
        noAlerts: 'ยังไม่มีแจ้งเตือนการสรรหา',
=======
        submitRequirement: 'เธชเนเธ Requirement เนเธซเธกเน',
        submitRequirementTitle: 'เธชเนเธ Requirement เนเธซเธกเน',
        submitRequirementDesc: 'เธฃเธฐเธเธธเธเธ—เธเธฒเธ— เธ—เธฑเธเธฉเธฐ เนเธฅเธฐเธฃเธฒเธขเธฅเธฐเน€เธญเธตเธขเธ”เธเธฒเธเน€เธเธทเนเธญเนเธซเนเธฃเธฐเธเธเธเนเธงเธขเธเธฑเธเธเธนเนเธเธฑเธเธเธฑเธเธจเธถเธเธฉเธฒ',
        role: 'เนเธเธฃเน€เธเธเธ•เน/เธ•เธณเนเธซเธเนเธ',
        skills: 'เธ—เธฑเธเธฉเธฐเธซเธฅเธฑเธ',
        details: 'เธฃเธฒเธขเธฅเธฐเน€เธญเธตเธขเธ”',
        submitToAi: 'เธชเนเธเนเธซเน AI Matching',
        liveAlerts: 'เนเธเนเธเน€เธ•เธทเธญเธเธเธฒเธฃเธชเธฃเธฃเธซเธฒ',
        new: 'เนเธซเธกเน',
        viewDetails: 'เธ”เธนเธฃเธฒเธขเธฅเธฐเน€เธญเธตเธขเธ”',
        requirements: 'Requirements เนเธฅเธฐ AI Matches',
        followed: 'Talent เธ—เธตเนเธ•เธดเธ”เธ•เธฒเธก',
        activeRequirements: 'Requirements เธ—เธตเนเน€เธเธดเธ”เธญเธขเธนเน',
        total: 'เธ—เธฑเนเธเธซเธกเธ”',
        postedCriteria: 'เน€เธเธทเนเธญเธเนเธเธ—เธตเนเธเธฃเธฐเธเธฒเธจเนเธงเนเธชเธณเธซเธฃเธฑเธเธเธฑเธเธเธนเนเธเธฑเธเธจเธถเธเธฉเธฒ',
        matches: 'Matches',
        aiTalentMatching: 'AI Talent Matching',
        bestMatches: 'เธเธฑเธเธจเธถเธเธฉเธฒเธ—เธตเนเน€เธซเธกเธฒเธฐเธเธฑเธ Requirement เธเธญเธเธเธธเธ“เธ—เธตเนเธชเธธเธ”',
        exclusiveAccess: 'เธชเธดเธ—เธเธดเนเน€เธเนเธฒเธ–เธถเธเธเธดเน€เธจเธฉ',
        fastTrackOffer: 'เธชเนเธเธเนเธญเน€เธชเธเธญเน€เธฃเนเธง',
        follow: 'เธ•เธดเธ”เธ•เธฒเธก',
        viewProfile: 'เธ”เธนเนเธเธฃเนเธเธฅเน',
        trackedProgress: 'เธ•เธดเธ”เธ•เธฒเธกเธเธงเธฒเธกเธเธทเธเธซเธเนเธฒเธเธญเธเธเธฑเธเธจเธถเธเธฉเธฒเธ—เธตเนเธชเธเนเธ',
        followedDate: 'เธ•เธดเธ”เธ•เธฒเธกเน€เธกเธทเนเธญ',
        currentGpa: 'GPA เธเธฑเธเธเธธเธเธฑเธ',
        profileOverview: 'เธ”เธนเนเธเธฃเนเธเธฅเน',
        noJobs: 'เธขเธฑเธเนเธกเนเธกเธตเธเธฃเธฐเธเธฒเธจเธเธฒเธเธเธฒเธ API',
        noStudents: 'เธขเธฑเธเนเธกเนเธกเธตเธเธฑเธเธจเธถเธเธฉเธฒเธ—เธตเนเน€เธเธดเธ”เธชเธดเธ—เธเธดเนเนเธซเนเธ”เธน',
        noRequirements: 'เธขเธฑเธเนเธกเนเธกเธต Requirement',
        noMatches: 'เธขเธฑเธเนเธกเนเธกเธตเธเธฅเธเธฑเธเธเธนเนเธเธฒเธ AI',
        noFollowed: 'เธขเธฑเธเนเธกเนเธกเธต Talent เธ—เธตเนเธ•เธดเธ”เธ•เธฒเธก',
        noAlerts: 'เธขเธฑเธเนเธกเนเธกเธตเนเธเนเธเน€เธ•เธทเธญเธเธเธฒเธฃเธชเธฃเธฃเธซเธฒ',
>>>>>>> Stashed changes
      }
    : {
        today: todayLabel,
        newApplicantsToday: 'New applicants today',
        clickToApplicants: 'Click → Applicants',
        openPositions: 'Open positions',
        fromPostings: (n: number) => `from ${n} postings`,
        internshipSeats: 'Internship seats filled',
        seatsRemaining: (remaining: number, total: number) => `${remaining} left · of ${total}`,
        awaitingAction: 'Awaiting your action',
        newApplicantsPending: 'New applicants pending review',
        review: 'Review',
        pipeline: 'Applicant pipeline',
        total: (n: number) => `Total ${n}`,
        noPending: 'No applicants pending review yet.',
        noApplications: 'No applicants yet.',
        gpaYear: (gpa: number, year: number) => `GPA ${gpa.toFixed(2)} · Year ${year}`,
        favorites: 'Favorites',
        favoritesCount: (n: number) => `${n}`,
        noFavorites: 'No favorited students yet.',
        noFavoritesHint: 'Go to the "Talent Search" tab and tap ❤ on a card you like — it will show up here.',
        goToTalent: 'Go to Talent Search →',
      };

  React.useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    Promise.allSettled([api.auth.me(), api.jobs.list(), api.applications.list()])
      .then(([profileResponse, jobsResponse, applicationsResponse]) => {
        if (!isMounted) return;

        if (profileResponse.status === 'fulfilled') {
          const profile = asRecord(profileResponse.value.user.companyProfile);
          const profileUser = asRecord(profileResponse.value.user);
          const companyId = asString(profile.id);
          setCompany(mapCompany({
            ...profile,
            companyName: asString(profile.companyName, asString(profileUser.name, user?.name || '-')),
            companyNameThai: asString(profile.companyNameThai, asString(profileUser.nameThai, asString(profileUser.name, user?.name || '-'))),
            industry: asString(profile.industry, '-'),
            size: asString(profile.size, 'medium'),
            internshipSlots: asNumber(profile.internshipSlots, 0),
            currentInterns: asNumber(profile.currentInterns, 0),
            studentViewConsent: asArray(profile.studentViewConsent),
            user: profileResponse.value.user,
          }));
          if (companyId) setFavorites(getFavorites(companyId));
        }

        if (jobsResponse.status === 'fulfilled') {
          // The backend already scopes /jobs to this company's own postings
          // for the COMPANY role, so no client-side companyId filter is needed.
          const mappedJobs = jobsResponse.value.jobs
            .map(mapJob)
            .filter((job) => job.type !== 'skill_requirement');
          setCompanyJobPostings(mappedJobs);
        }

        if (applicationsResponse.status === 'fulfilled') {
          const mapped = applicationsResponse.value.applications.map((item, index) => {
            const application = asRecord(item);
            const student = asRecord(application.student);
            const studentUser = asRecord(student.user);
            const job = asRecord(application.jobPosting);
            return {
              id: asString(application.id, `APP${index + 1}`),
              jobPostingId: asString(application.jobPostingId, asString(job.id)),
              studentId: asString(application.studentId, asString(student.id)),
              status: asString(application.status, 'pending') as Application['status'],
              appliedAt: asDate(application.appliedAt),
              coverLetter: asString(application.coverLetter),
              resumeUrl: asString(application.resumeUrl),
              notes: asString(application.notes),
              jobTitle: asString(job.title, '-'),
              student: {
                id: asString(student.id),
                nameThai: asString(studentUser.nameThai, asString(studentUser.name, '-')),
                name: asString(studentUser.name, '-'),
                gpa: asNumber(student.gpa, 0),
                year: asNumber(student.year, 1),
              },
            };
          });
          setApplications(mapped);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [language, user?.id, user?.name]);

  const handleSubmitRequirement = async () => {
    const skills = requirementForm.skills.split(',').map(skill => skill.trim()).filter(Boolean);
    if (!requirementForm.title.trim() || !requirementForm.description.trim()) {
      toast.error(language === 'th' ? 'กรุณากรอกตำแหน่งและรายละเอียด' : 'Please enter a role and details.');
      return;
    }

    setIsSubmittingRequirement(true);
    try {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 30);
      const response = await api.jobs.create({
        title: requirementForm.title.trim(),
        type: 'internship',
        positions: 1,
        description: requirementForm.description.trim(),
        responsibilities: [],
        requirements: skills,
        preferredSkills: skills,
        salary: '',
        benefits: [],
        location: company?.address || 'Hybrid',
        workType: 'hybrid',
        deadline: deadline.toISOString(),
        status: 'open',
      });
      const createdJob = mapJob(response.job);
      setCompanyJobPostings(current => [createdJob, ...current]);
      setRequirements(current => [{
        id: createdJob.id,
        title: createdJob.title,
        skills: [...createdJob.preferredSkills, ...createdJob.requirements].filter(Boolean).slice(0, 5),
        type: createdJob.type,
        status: createdJob.status,
        matchCount: createdJob.applicants.length,
      }, ...current]);
      setRequirementForm({ title: '', skills: '', description: '' });
      setIsRequirementOpen(false);
      toast.success(language === 'th' ? 'ส่ง Requirement แล้ว' : 'Requirement submitted.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (language === 'th' ? 'ส่ง Requirement ไม่สำเร็จ' : 'Unable to submit requirement.'));
    } finally {
      setIsSubmittingRequirement(false);
    }
  };

  const pipelineCounts = PIPELINE_STAGES.map((status) => ({
    status,
    label: t.applicants[
      `status${status.charAt(0).toUpperCase()}${status.slice(1)}` as keyof typeof t.applicants
    ] as string,
    count: applications.filter((a) => a.status === status).length,
  }));
  const pipelineMax = Math.max(1, ...pipelineCounts.map((row) => row.count));

  if (isLoading) {
    return (
      <div className="space-y-8 pb-10">
        <div className="h-28 rounded-3xl bg-slate-100 dark:bg-slate-900 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-40 rounded-3xl bg-slate-100 dark:bg-slate-900 animate-pulse" />)}
        </div>
        <div className="h-96 rounded-3xl bg-slate-100 dark:bg-slate-900 animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2"
          >
            <Building className="w-4 h-4 text-orange-500 dark:text-slate-400" />
            <span>{copy.today}</span>
          </motion.div>
          <motion.h1
            className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {t.companyDashboard.hello} <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">{companyName || '-'}</span>
          </motion.h1>
        </div>

        <motion.div variants={itemVariants}>
          <Link to="/job-postings">
            <Button className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20">
              <Send className="w-4 h-4 mr-2" />{t.companyDashboard.postJob}
            </Button>
          </Link>
        </motion.div>
      </div>

      {/* Target Track hero */}
      <motion.div variants={itemVariants}>
        <TargetTrackHero />
      </motion.div>

      {/* Favorites strip */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-500 fill-rose-500/20" />
              <CardTitle>{copy.favorites}</CardTitle>
              <Badge variant="outline" className="ml-auto bg-rose-50 text-rose-600 border-none dark:bg-rose-950/40 dark:text-rose-300">
                {copy.favoritesCount(favorites.length)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {favorites.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {favorites.map((student) => (
                  <div key={student.id} className="shrink-0 w-40 p-3 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-400 to-orange-400 flex items-center justify-center">
                      <span className="text-sm font-bold text-white">{student.nameThai.charAt(0)}</span>
                    </div>
                    <div className="text-sm font-medium truncate">{student.nameThai}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{student.meta}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center space-y-3">
                <div className="text-sm text-slate-500 dark:text-slate-400">{copy.noFavorites}</div>
                <div className="text-xs text-slate-400 dark:text-slate-500">{copy.noFavoritesHint}</div>
                <Button size="sm" variant="outline" onClick={() => navigate('/talent-search')}>{copy.goToTalent}</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Stat tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -5 }}
          onClick={() => navigate('/job-postings')}
          className="p-6 rounded-3xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-xl shadow-orange-500/20 relative overflow-hidden cursor-pointer"
=======
          className="p-6 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden cursor-pointer"
>>>>>>> Stashed changes
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white dark:bg-slate-900/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/20 backdrop-blur-sm">
                <UserPlus className="w-6 h-6" />
              </div>
              <span className="font-medium text-white/90">{t.companyDashboard.jobPositions}</span>
            </div>
            <div className="text-5xl font-bold tracking-tight">{newApplicantsToday}</div>
            <div className="mt-3 text-sm text-orange-100">{copy.clickToApplicants}</div>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          whileHover={{ y: -5 }}
          onClick={() => navigate('/job-postings')}
          className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/50 relative overflow-hidden group cursor-pointer"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                <Briefcase className="w-6 h-6" />
              </div>
              <span className="font-medium text-slate-600 dark:text-slate-400">{copy.openPositions}</span>
            </div>
            <div className="text-4xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{openJobs.length}</div>
            <div className="mt-3 text-sm text-slate-400">{copy.fromPostings(companyJobPostings.length)}</div>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          whileHover={{ y: -5 }}
          onClick={() => navigate('/intern-tracking')}
          className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/50 relative overflow-hidden group cursor-pointer"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                <GraduationCap className="w-6 h-6" />
              </div>
              <span className="font-medium text-slate-600 dark:text-slate-400">{copy.internshipSeats}</span>
            </div>
            <div className="text-4xl font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">{internshipSeatsFilled}</div>
            <div className="mt-3 text-sm text-slate-400">{copy.seatsRemaining(internshipSeatsRemaining, internshipSeatsTotal)}</div>
          </div>
        </motion.div>
      </div>

      {/* Awaiting action + pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={itemVariants}>
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-orange-500" />
                <CardTitle>{copy.awaitingAction}</CardTitle>
                <Badge variant="outline" className="ml-auto bg-orange-50 text-orange-600 border-none dark:bg-orange-950/40 dark:text-orange-300">
                  {pendingApplicants.length}
                </Badge>
              </div>
            </div>
          ))}
          {notifications.length === 0 && (
            <div className="md:col-span-3 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
              {copy.noAlerts}
            </div>
          )}
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Tabs defaultValue="requirements" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-2 p-1">
            <TabsTrigger value="jobs">{t.companyDashboard.ourJobs}</TabsTrigger>
            <TabsTrigger value="requirements">{copy.requirements}</TabsTrigger>
            <TabsTrigger value="students">{t.companyDashboard.accessibleStudentsTab}</TabsTrigger>
            <TabsTrigger value="followed">{copy.followed}</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs">
            <Card className="bg-white/6 dark:bg-slate-900/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.companyDashboard.ourJobs}</CardTitle>
                <CardDescription>{companyJobPostings.length} {t.companyDashboard.positions}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {companyJobPostings.map(job => (
                  <div key={job.id} className="border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{job.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{job.type === 'internship' ? t.companyDashboard.internship : t.companyDashboard.fullTime} • {job.location}</p>
                      </div>
                      <Badge variant={job.status === 'open' ? 'default' : 'secondary'}>{job.status === 'open' ? t.companyDashboard.open : t.companyDashboard.closed}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div><div className="text-xs text-gray-600 dark:text-gray-400">{t.common.position}</div><div className="font-semibold">{job.positions} {t.companyDashboard.positionsCount}</div></div>
                      <div><div className="text-xs text-gray-600 dark:text-gray-400">{t.companyDashboard.applicantsLabel}</div><div className="font-semibold">{job.applicants.length} {t.common.person}</div></div>
                      <div><div className="text-xs text-gray-600 dark:text-gray-400">{t.companyDashboard.closeDate}</div><div className="font-semibold">{new Date(job.deadline).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { month: 'short', day: 'numeric' })}</div></div>
                    </div>
                    <Button size="sm" variant="outline" className="w-full" onClick={() => navigate('/applicants')}>{t.companyDashboard.viewApplicants}</Button>
                  </div>
                ))}
                {companyJobPostings.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                    {copy.noJobs}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students">
            <Card className="bg-white/6 dark:bg-slate-900/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.companyDashboard.accessibleStudentsTab}</CardTitle>
                <CardDescription>{accessibleStudents.length} {t.common.person} ({t.companyDashboard.byConsent})</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {accessibleStudents.map(student => (
                  <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                        <span className="text-lg font-bold text-white">{student.nameThai.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="font-semibold">{student.nameThai}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{t.companyDashboard.year} {student.year} • GPA {student.gpa.toFixed(2)}</div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => navigate('/student-profiles')}>{t.companyDashboard.viewProfile}</Button>
                  </div>
                ))}
                {accessibleStudents.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                    {copy.noStudents}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="requirements">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-4 lg:col-span-1">
                <Card className="bg-white/6 dark:bg-slate-900/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm h-full">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>{copy.activeRequirements}</CardTitle>
                      <Badge variant="outline" className="bg-orange-50 text-orange-600 border-none px-2 dark:bg-orange-950/40 dark:text-orange-300">{requirements.length} {copy.total}</Badge>
                    </div>
                    <CardDescription>{copy.postedCriteria}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {requirements.map(req => (
                      <div key={req.id} className="p-4 border rounded-xl hover:bg-slate-50 dark:bg-slate-900 transition-colors cursor-pointer group dark:hover:bg-slate-800">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-orange-600 transition-colors">{req.title}</h4>
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-200">{req.status}</Badge>
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{applicant.student?.nameThai}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {applicant.jobTitle} · {copy.gpaYear(applicant.student?.gpa ?? 0, applicant.student?.year ?? 1)}
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="shrink-0" onClick={() => navigate('/applicants')}>{copy.review}</Button>
                    </div>
                  ))}
                  {pendingApplicants.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                      {copy.noPending}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

              <div className="lg:col-span-2">
                <Card className="bg-white/6 dark:bg-slate-900/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm h-full">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-orange-500 dark:text-slate-400" />
                      <CardTitle>{copy.aiTalentMatching}</CardTitle>
                    </div>
                    <CardDescription>{copy.bestMatches}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {aiMatchedStudents.map(student => (
                      <div key={student.id} className="flex flex-col sm:flex-row gap-4 p-4 border rounded-xl items-center sm:items-start bg-gradient-to-r from-transparent to-orange-50/30 dark:to-orange-950/20">
                        <div className="relative">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg">
                            <span className="text-xl font-bold text-white">{student.nameThai.charAt(0)}</span>
                          </div>
                          <div className="absolute -bottom-2 -right-2 bg-white dark:bg-slate-900 rounded-full p-1 shadow">
                            <Badge className="bg-orange-500 hover:bg-orange-600 border-none text-xs">{student.matchScore}%</Badge>
                          </div>
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                          <div className="flex flex-col sm:flex-row items-center sm:justify-start gap-2 mb-1">
                            <h4 className="font-semibold text-lg text-slate-800 dark:text-white">{student.nameThai}</h4>
                            {student.exclusiveAccess && <Badge variant="outline" className="bg-amber-100/50 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700 text-[10px] shadow-sm py-0"><Flame className="w-3 h-3 mr-1 text-orange-500" /> {copy.exclusiveAccess}</Badge>}
                          </div>
                          <p className="text-sm border-b pb-2 mb-2 text-slate-500 dark:text-slate-400">{t.companyDashboard.year} {student.year} • GPA {student.gpa.toFixed(2)} • {student.major}</p>
                          <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-green-600 dark:text-green-500 mt-2 font-medium">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{copy.skills}: {student.matchedSkills.length ? student.matchedSkills.join(', ') : '-'}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                          {student.exclusiveAccess ? (
                             <Button size="sm" onClick={() => navigate('/messages')} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/30 group border-0">
                               <Send className="w-3.5 h-3.5 mr-1.5 group-hover:scale-110 transition-transform" /> {copy.fastTrackOffer}
                             </Button>
                          ) : (
                             <Button
                               size="sm"
                               onClick={() => {
                                 setFollowedStudents(current => current.some(item => item.id === student.id) ? current : [{ ...student, followDate: new Date().toISOString().slice(0, 10), thresholdMet: student.gpa >= 3.5 }, ...current]);
                                 toast.success(language === 'th' ? 'เพิ่มในรายการติดตามแล้ว' : 'Talent followed.');
                               }}
                               className="bg-slate-900 dark:bg-slate-800 group hover:bg-slate-800 dark:hover:bg-slate-700"
                             >
                               <Bookmark className="w-3.5 h-3.5 mr-1.5 group-hover:fill-current" /> {copy.follow}
                             </Button>
                          )}
                          <Button size="sm" variant="outline" className="dark:border-slate-700 dark:text-slate-300" onClick={() => navigate('/student-profiles')}>
                            {copy.viewProfile}
                          </Button>
                        </div>
                      </div>
                    ))}
                    {aiMatchedStudents.length === 0 && (
                      <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                        {copy.noMatches}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="followed">
            <Card className="bg-white/6 dark:bg-slate-900/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-blue-500 fill-blue-500/20 dark:text-slate-400" />
                  <CardTitle>{copy.followed}</CardTitle>
                </div>
                <CardDescription>{copy.trackedProgress}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {followedStudents.map(student => (
                    <div key={student.id} className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <span className="text-lg font-bold text-slate-700 dark:text-slate-300">{student.nameThai.charAt(0)}</span>
                        </div>
                        <div>
                          <div className="font-semibold">{student.nameThai}</div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">{t.companyDashboard.year} {student.year}</div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm border-t pt-3 mt-3 border-slate-100 dark:border-slate-800">
                        <span className="text-slate-400">{copy.followedDate}</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{student.followDate}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm mt-2">
                        <span className="text-slate-400">{copy.currentGpa}</span>
                        <div className="flex items-center gap-1 font-medium text-emerald-600 dark:text-slate-300">
                          <TrendingUp className="w-3.5 h-3.5" />
                          {student.gpa.toFixed(2)}
                        </div>
                      </div>
                      <Button className="w-full mt-4" variant="secondary" size="sm" onClick={() => navigate('/student-profiles')}>{copy.profileOverview}</Button>
                    </div>
                  ))}
                  {followedStudents.length === 0 && (
                    <div className="md:col-span-2 lg:col-span-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                      {copy.noFollowed}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </motion.div>
    </motion.div>
  );
}
