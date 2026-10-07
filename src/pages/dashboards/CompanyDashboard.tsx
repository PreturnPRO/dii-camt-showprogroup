import React, { useState } from 'react';
import { gpaBandLabel, gpaBandOf } from '@/lib/gpa-band';
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
    gpaBand: string;
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
        today: todayLabel,
        newApplicantsToday: 'ผู้สมัครใหม่วันนี้',
        clickToApplicants: 'คลิก → ผู้สมัคร',
        openPositions: 'ตำแหน่งเปิดรับ',
        fromPostings: (n: number) => `จาก ${n} ประกาศ`,
        internshipSeats: 'ที่นั่งฝึกงานที่รับแล้ว',
        seatsRemaining: (remaining: number, total: number) => `เปิดอีก ${remaining} · จาก ${total}`,
        awaitingAction: 'รอคุณดำเนินการ',
        newApplicantsPending: 'ผู้สมัครใหม่รอรีวิว',
        review: 'รีวิว',
        pipeline: 'สถานะผู้สมัคร (pipeline)',
        total: (n: number) => `รวม ${n} คน`,
        noPending: 'ยังไม่มีผู้สมัครรอรีวิว',
        noApplications: 'ยังไม่มีผู้สมัคร',
        gpaYear: (band: string, year: number) => `GPA ${gpaBandLabel(band, 'th')} · ชั้นปี ${year}`,
        favorites: 'รายการที่ถูกใจ',
        favoritesCount: (n: number) => `${n} คน`,
        noFavorites: 'ยังไม่มีนักศึกษาที่ถูกใจ',
        noFavoritesHint: 'ไปที่แท็บ "ค้นหา Talent" แล้วกด ❤ บนการ์ดที่สนใจ จะมาโผล่ตรงนี้ทันที',
        goToTalent: 'ไปค้นหา Talent →',
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
        gpaYear: (band: string, year: number) => `GPA ${gpaBandLabel(band, 'en')} · Year ${year}`,
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
                gpaBand: gpaBandOf(student),
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

  const newApplicantsToday = applications.filter((a) => isSameCalendarDay(a.appliedAt, today)).length;

  const openJobs = companyJobPostings.filter((job) => job.status === 'open');

  const internshipJobs = companyJobPostings.filter((job) => job.type === 'internship' && job.status !== 'closed');
  const internshipSeatsTotal = internshipJobs.reduce((sum, job) => sum + (job.positions || 0), 0);
  const internshipJobIds = new Set(internshipJobs.map((job) => job.id));
  const internshipSeatsFilled = applications.filter(
    (a) => a.status === 'accepted' && internshipJobIds.has(a.jobPostingId),
  ).length;
  const internshipSeatsRemaining = Math.max(0, internshipSeatsTotal - internshipSeatsFilled);

  const pendingApplicants = applications
    .filter((a) => a.status === 'pending')
    .sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime())
    .slice(0, 3);

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
            className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white leading-snug"
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
        <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 rounded-3xl shadow-sm">
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
          onClick={() => navigate('/applicants')}
          className="bg-orange-600 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden cursor-pointer"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-white/20">
                <UserPlus className="w-6 h-6" />
              </div>
              <span className="font-medium text-white/90">{copy.newApplicantsToday}</span>
            </div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-snug">{newApplicantsToday}</div>
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
            <div className="text-4xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors leading-snug">{openJobs.length}</div>
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
            <div className="text-4xl font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors leading-snug">{internshipSeatsFilled}</div>
            <div className="mt-3 text-sm text-slate-400">{copy.seatsRemaining(internshipSeatsRemaining, internshipSeatsTotal)}</div>
          </div>
        </motion.div>
      </div>

      {/* Awaiting action + pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={itemVariants}>
          <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 rounded-3xl shadow-sm h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-orange-500" />
                <CardTitle>{copy.awaitingAction}</CardTitle>
                <Badge variant="outline" className="ml-auto bg-orange-50 text-orange-600 border-none dark:bg-orange-950/40 dark:text-orange-300">
                  {pendingApplicants.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div>
                <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">{copy.newApplicantsPending}</h4>
                <div className="space-y-2">
                  {pendingApplicants.map((applicant) => (
                    <div key={applicant.id} className="flex items-center justify-between gap-3 p-3 border border-slate-100 dark:border-slate-800 rounded-xl">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                          <span className="text-sm font-bold text-white">{(applicant.student?.nameThai || '-').charAt(0)}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{applicant.student?.nameThai}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {applicant.jobTitle} · {copy.gpaYear(applicant.student?.gpaBand ?? 'not_disclosed', applicant.student?.year ?? 1)}
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

        <motion.div variants={itemVariants}>
          <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 rounded-3xl shadow-sm h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-500" />
                <CardTitle>{copy.pipeline}</CardTitle>
                <Badge variant="outline" className="ml-auto bg-orange-50 text-orange-600 border-none dark:bg-orange-950/40 dark:text-orange-300">
                  {copy.total(applications.length)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {pipelineCounts.map((row) => (
                <div key={row.status} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">{row.label}</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{row.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="bg-orange-600 h-full rounded-full"
                      style={{ width: `${(row.count / pipelineMax) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {applications.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                  {copy.noApplications}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
