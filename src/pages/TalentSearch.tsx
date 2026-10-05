import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, X, Heart, Send, Eye, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { asArray, asNumber, asRecord, asString } from '@/lib/live-data';
import { getFavorites, toggleFavorite } from '@/lib/company-favorites';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

type Track = { id: string; name: string; nameThai: string };

type TalentRow = {
  id: string;
  userId: string;
  nameThai: string;
  name: string;
  email: string;
  major: string;
  year: number;
  gpax: number;
  skills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  careerGoal: { id: string; name: string; nameThai: string } | null;
  portfolio: { summary: string; githubUrl?: string; linkedinUrl?: string; projectCount: number } | null;
};

export default function TalentSearch() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const jobId = searchParams.get('jobId') || '';

  const companyId = (user?.raw as any)?.companyProfile?.id as string | undefined;

  const [tracks, setTracks] = useState<Track[]>([]);
  const [results, setResults] = useState<TalentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [jobTitle, setJobTitle] = useState('');

  const [nameQuery, setNameQuery] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [trackFilter, setTrackFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [minGpax, setMinGpax] = useState('');

  const [favorites, setFavorites] = useState(() => (companyId ? getFavorites(companyId) : []));
  const [profileStudent, setProfileStudent] = useState<TalentRow | null>(null);

  const copy = language === 'th'
    ? {
        title: 'ค้นหานักศึกษา',
        subtitle: 'เห็นเฉพาะผู้ยินยอมเปิดโปรไฟล์ · นักศึกษาไม่รู้จนกว่าคุณจะ "ทักไปคุย" เอง',
        clearFilter: (title: string) => `จากประกาศ: ${title}`,
        searchPlaceholder: '🔍 ค้นหาชื่อนักศึกษา',
        skillsPlaceholder: 'ทักษะ (คั่นด้วย , เช่น React, TypeScript)',
        trackAll: 'เป้าหมายอาชีพทั้งหมด',
        yearAll: 'ชั้นปีทั้งหมด',
        minGpaxPlaceholder: 'GPA ขั้นต่ำ',
        resultCount: (n: number) => `${n} นักศึกษา (เปิดโปรไฟล์)`,
        privacy: 'นักศึกษาไม่รู้ว่าถูกค้น/บันทึกไว้ — รู้ว่ามีบริษัทสนใจก็ต่อเมื่อคุณ "ทักไปคุย" เท่านั้น · กด ❤ ก็เช่นกัน เป็นแค่รายการส่วนตัวของคุณ ไม่มีการแจ้งเตือนไปถึงนักศึกษา',
        matchedOf: (m: number, t: number) => `✓ ตรง ${m}/${t} ทักษะที่สนใจ`,
        goalLabel: (name: string) => `🎯 เป้าหมาย: ${name}`,
        openProfile: '🔓 เปิดโปรไฟล์',
        viewProfile: 'ดูโปรไฟล์',
        reachOut: 'ทักไปคุย',
        noResults: 'ยังไม่มีนักศึกษาเปิดโปรไฟล์ตรงเงื่อนไขนี้',
        clearFilters: 'ลดเงื่อนไข',
        loading: 'กำลังค้นหา...',
        gpaYearMajor: (gpa: number, year: number, major: string) => `GPA ${gpa.toFixed(2)} · ปี ${year} · ${major}`,
        favAdded: 'เพิ่มในรายการที่ถูกใจแล้ว',
        favRemoved: 'ลบออกจากรายการที่ถูกใจแล้ว',
        githubLink: 'GitHub',
        linkedinLink: 'LinkedIn',
        noSummary: 'ยังไม่มีคำอธิบายตัวเอง',
      }
    : {
        title: 'Search Students',
        subtitle: 'Only shows students who consented to an open profile — they only know a company is interested once you reach out.',
        clearFilter: (title: string) => `From posting: ${title}`,
        searchPlaceholder: '🔍 Search student name',
        skillsPlaceholder: 'Skills (comma-separated, e.g. React, TypeScript)',
        trackAll: 'All career goals',
        yearAll: 'All years',
        minGpaxPlaceholder: 'Minimum GPA',
        resultCount: (n: number) => `${n} students (open profile)`,
        privacy: "Students don't know they were searched or bookmarked — they only find out a company is interested once you reach out. Hearting a card is just a private list of yours, no notification is sent either.",
        matchedOf: (m: number, t: number) => `✓ ${m}/${t} skills matched`,
        goalLabel: (name: string) => `🎯 Goal: ${name}`,
        openProfile: '🔓 Open profile',
        viewProfile: 'View profile',
        reachOut: 'Reach out',
        noResults: 'No students with an open profile match this filter.',
        clearFilters: 'Loosen filters',
        loading: 'Searching...',
        gpaYearMajor: (gpa: number, year: number, major: string) => `GPA ${gpa.toFixed(2)} · Year ${year} · ${major}`,
        favAdded: 'Added to favorites.',
        favRemoved: 'Removed from favorites.',
        githubLink: 'GitHub',
        linkedinLink: 'LinkedIn',
        noSummary: 'No summary yet.',
      };

  React.useEffect(() => {
    api.careerTracks.list().then((res) => {
      setTracks(res.tracks.map((item) => {
        const t = asRecord(item);
        return { id: asString(t.id), name: asString(t.name), nameThai: asString(t.nameThai, asString(t.name)) };
      }));
    }).catch(() => undefined);
  }, []);

  // If arriving from a Job Posting's "find matching students" link, pull that
  // job's title + skills once to prefill the search (jobId stays in the URL
  // as the source of truth, we just resolve its title/skills locally).
  React.useEffect(() => {
    if (!jobId) return;
    api.jobs.list().then((res) => {
      const job = res.jobs.map((j) => asRecord(j)).find((j) => asString(j.id) === jobId);
      if (job) {
        setJobTitle(asString(job.title));
        const skills = [...asArray<string>(job.requirements), ...asArray<string>(job.preferredSkills)];
        if (skills.length) setSkillsInput(skills.join(', '));
      }
    }).catch(() => undefined);
  }, [jobId]);

  const runSearch = React.useCallback(() => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (jobId) params.set('jobId', jobId);
    if (nameQuery.trim()) params.set('q', nameQuery.trim());
    const skillList = skillsInput.split(',').map((s) => s.trim()).filter(Boolean);
    if (skillList.length) params.set('skills', skillList.join(','));
    if (trackFilter !== 'all') params.set('careerTrackId', trackFilter);
    if (yearFilter !== 'all') params.set('year', yearFilter);
    if (minGpax.trim()) params.set('minGpax', minGpax.trim());

    api.talent.search(`?${params.toString()}`)
      .then((res) => {
        setResults(res.talents.map((item) => {
          const t = asRecord(item);
          const goal = asRecord(t.careerGoal);
          const portfolio = asRecord(t.portfolio);
          return {
            id: asString(t.id),
            userId: asString(t.userId),
            nameThai: asString(t.nameThai, asString(t.name, '-')),
            name: asString(t.name),
            email: asString(t.email),
            major: asString(t.major),
            year: asNumber(t.year, 1),
            gpax: asNumber(t.gpax, 0),
            skills: asArray<string>(t.skills),
            matchedSkills: asArray<string>(t.matchedSkills),
            missingSkills: asArray<string>(t.missingSkills),
            careerGoal: t.careerGoal ? { id: asString(goal.id), name: asString(goal.name), nameThai: asString(goal.nameThai) } : null,
            portfolio: t.portfolio
              ? {
                  summary: asString(portfolio.summary),
                  githubUrl: asString(portfolio.githubUrl) || undefined,
                  linkedinUrl: asString(portfolio.linkedinUrl) || undefined,
                  projectCount: asNumber(portfolio.projectCount, 0),
                }
              : null,
          };
        }));
      })
      .catch(() => undefined)
      .finally(() => setIsLoading(false));
  }, [jobId, nameQuery, skillsInput, trackFilter, yearFilter, minGpax]);

  React.useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, trackFilter, yearFilter]);

  const clearJobFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('jobId');
    setSearchParams(next);
    setJobTitle('');
    setSkillsInput('');
  };

  const clearAllFilters = () => {
    setNameQuery('');
    setSkillsInput('');
    setTrackFilter('all');
    setYearFilter('all');
    setMinGpax('');
    clearJobFilter();
  };

  const isFavorite = (studentId: string) => favorites.some((f) => f.id === studentId);

  const handleToggleFavorite = (student: TalentRow) => {
    if (!companyId) return;
    const wasFavorite = isFavorite(student.id);
    const next = toggleFavorite(companyId, {
      id: student.id,
      nameThai: student.nameThai,
      meta: copy.gpaYearMajor(student.gpax, student.year, student.major),
      addedAt: new Date().toISOString(),
    });
    setFavorites(next);
    toast.success(wasFavorite ? copy.favRemoved : copy.favAdded);
  };

  const reachOut = (student: TalentRow) => {
    navigate('/messages', {
      state: {
        recipient: {
          id: student.userId,
          email: student.email,
          name: student.name,
          nameThai: student.nameThai,
          role: 'student',
        },
      },
    });
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6 pb-10">
      <div>
        <motion.h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight" variants={itemVariants}>
          {copy.title}
        </motion.h1>
        <motion.p className="mt-2 text-sm text-slate-500 dark:text-slate-400" variants={itemVariants}>
          {copy.subtitle}
        </motion.p>
      </div>

      {jobId && jobTitle && (
        <motion.div variants={itemVariants}>
          <Badge variant="outline" className="pl-3 pr-1 py-1.5 text-sm gap-2 inline-flex items-center">
            {copy.clearFilter(jobTitle)}
            <button onClick={clearJobFilter} className="rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 p-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </Badge>
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="space-y-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder={copy.searchPlaceholder}
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <Input
            className="w-64"
            placeholder={copy.skillsPlaceholder}
            value={skillsInput}
            onChange={(e) => setSkillsInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            onBlur={runSearch}
          />
          <Select value={trackFilter} onValueChange={setTrackFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.trackAll}</SelectItem>
              {tracks.map((track) => (
                <SelectItem key={track.id} value={track.id}>{language === 'th' ? track.nameThai : track.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.yearAll}</SelectItem>
              {[1, 2, 3, 4].map((y) => (
                <SelectItem key={y} value={String(y)}>{language === 'th' ? `ชั้นปี ${y}` : `Year ${y}`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="w-36"
            type="number"
            step="0.1"
            placeholder={copy.minGpaxPlaceholder}
            value={minGpax}
            onChange={(e) => setMinGpax(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            onBlur={runSearch}
          />
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{copy.resultCount(results.length)}</span>
      </motion.div>

      <motion.div variants={itemVariants} className="flex items-start gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3 text-xs text-slate-500 dark:text-slate-400">
        <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>{copy.privacy}</span>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {results.map((student) => (
          <motion.div key={student.id} variants={itemVariants}>
            <Card className="relative bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm h-full">
              <button
                onClick={() => handleToggleFavorite(student)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                aria-label="favorite"
              >
                <Heart className={`w-4 h-4 ${isFavorite(student.id) ? 'fill-rose-500' : ''}`} />
              </button>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold shrink-0">
                    {student.nameThai.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{student.nameThai}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {copy.gpaYearMajor(student.gpax, student.year, student.major)}
                    </div>
                  </div>
                </div>

                {student.careerGoal && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700">
                    {copy.goalLabel(language === 'th' ? student.careerGoal.nameThai : student.careerGoal.name)}
                  </Badge>
                )}

                {(student.matchedSkills.length > 0 || student.missingSkills.length > 0) && (
                  <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                    {copy.matchedOf(student.matchedSkills.length, student.matchedSkills.length + student.missingSkills.length)}
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5">
                  {student.matchedSkills.map((s) => <Badge key={s} className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">✓ {s}</Badge>)}
                  {student.missingSkills.map((s) => <Badge key={s} variant="outline" className="text-slate-400 border-slate-300">✗ {s}</Badge>)}
                </div>

                <div className="text-xs text-slate-400">{copy.openProfile}</div>

                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setProfileStudent(student)}>
                    <Eye className="w-3.5 h-3.5 mr-1.5" /> {copy.viewProfile}
                  </Button>
                  <Button size="sm" className="flex-1" onClick={() => reachOut(student)}>
                    <Send className="w-3.5 h-3.5 mr-1.5" /> {copy.reachOut}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {isLoading && <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">{copy.loading}</div>}
      {!isLoading && results.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">{copy.noResults}</p>
          <Button variant="outline" size="sm" onClick={clearAllFilters}>{copy.clearFilters}</Button>
        </div>
      )}

      <Dialog open={Boolean(profileStudent)} onOpenChange={(open) => !open && setProfileStudent(null)}>
        <DialogContent className="sm:max-w-[540px]">
          {profileStudent && (
            <>
              <DialogHeader>
                <DialogTitle>{profileStudent.nameThai}</DialogTitle>
                <DialogDescription>{copy.gpaYearMajor(profileStudent.gpax, profileStudent.year, profileStudent.major)}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-300">{profileStudent.portfolio?.summary || copy.noSummary}</p>
                <div className="flex flex-wrap gap-1.5">
                  {profileStudent.skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
                </div>
                <div className="flex gap-3 text-sm">
                  {profileStudent.portfolio?.githubUrl && (
                    <a href={profileStudent.portfolio.githubUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{copy.githubLink}</a>
                  )}
                  {profileStudent.portfolio?.linkedinUrl && (
                    <a href={profileStudent.portfolio.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{copy.linkedinLink}</a>
                  )}
                </div>
                <Button size="sm" onClick={() => reachOut(profileStudent)}>
                  <Send className="w-3.5 h-3.5 mr-1.5" /> {copy.reachOut}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
