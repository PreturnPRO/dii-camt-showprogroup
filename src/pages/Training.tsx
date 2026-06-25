import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Swords, Shield, Star, Trophy, Target, Flame, Users, User, Calendar, Clock, CheckCircle2,
  Lock, ChevronRight, Sparkles, Zap, Award, BookOpen, Building2, GraduationCap, Flag,
  Timer, ArrowRight, Heart, Crown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { asArray, asDate, asNumber, asRecord, asString } from '@/lib/live-data';
import { toast } from 'sonner';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Mock quest data
const mockQuests = [
  {
    id: 'q1', type: 'solo', status: 'in-progress', title: 'UI/UX Design Basics',
    titleEn: 'UI/UX Design Basics',
    description: 'เรียนรู้หลักการออกแบบ UI/UX พื้นฐาน สร้าง Wireframe และ Mockup',
    descriptionEn: 'Learn basic UI/UX design principles, create Wireframes and Mockups',
    assignedBy: 'บริษัท TechCorp', assignedByEn: 'TechCorp Inc.',
    assignerType: 'company', xp: 150, coins: 50,
    deadline: '2026-02-28', progress: 65,
    difficulty: 'normal', category: 'design',
    tasks: [
      { id: 't1', title: 'ศึกษา Design Principles', titleEn: 'Study Design Principles', done: true },
      { id: 't2', title: 'สร้าง Wireframe 3 หน้า', titleEn: 'Create 3-page Wireframe', done: true },
      { id: 't3', title: 'สร้าง Hi-Fi Mockup', titleEn: 'Create Hi-Fi Mockup', done: false },
      { id: 't4', title: 'ส่ง Presentation', titleEn: 'Submit Presentation', done: false },
    ]
  },
  {
    id: 'q2', type: 'group', status: 'in-progress', title: 'Database Optimization Challenge',
    titleEn: 'Database Optimization Challenge',
    description: 'ทีม 4 คน ร่วมกันปรับปรุงประสิทธิภาพฐานข้อมูล',
    descriptionEn: 'Team of 4, collaborate to optimize database performance',
    assignedBy: 'อ.ดร.สมศรี ใจดี', assignedByEn: 'Dr. Somsri Jaidee',
    assignerType: 'lecturer', xp: 300, coins: 100,
    deadline: '2026-03-15', progress: 30,
    difficulty: 'hard', category: 'backend',
    groupSize: 4, groupMembers: ['สมชาย', 'สมหญิง', 'วิชัย', 'นภา'],
    tasks: [
      { id: 't1', title: 'วิเคราะห์ Query ที่ช้า', titleEn: 'Analyze slow queries', done: true },
      { id: 't2', title: 'ออกแบบ Index Strategy', titleEn: 'Design Index Strategy', done: false },
      { id: 't3', title: 'Implement & Benchmark', titleEn: 'Implement & Benchmark', done: false },
      { id: 't4', title: 'เขียนรายงาน', titleEn: 'Write Report', done: false },
    ]
  },
  {
    id: 'q3', type: 'event', status: 'upcoming', title: 'Hackathon: AI for Education',
    titleEn: 'Hackathon: AI for Education',
    description: 'แข่งขัน Hackathon 48 ชั่วโมง สร้าง AI Solution สำหรับการศึกษา',
    descriptionEn: '48-hour Hackathon competition, build AI Solutions for Education',
    assignedBy: 'DII CAMT', assignedByEn: 'DII CAMT',
    assignerType: 'lecturer', xp: 500, coins: 200,
    deadline: '2026-03-20', progress: 0,
    difficulty: 'legendary', category: 'ai',
    tasks: []
  },
  {
    id: 'q4', type: 'meeting', status: 'completed', title: 'Weekly Standup - Sprint Review',
    titleEn: 'Weekly Standup - Sprint Review',
    description: 'ประชุมทบทวน Sprint พร้อมนำเสนอความคืบหน้า',
    descriptionEn: 'Sprint review meeting with progress presentation',
    assignedBy: 'บริษัท TechCorp', assignedByEn: 'TechCorp Inc.',
    assignerType: 'company', xp: 50, coins: 20,
    deadline: '2026-02-07', progress: 100,
    difficulty: 'easy', category: 'meeting',
    tasks: [
      { id: 't1', title: 'เตรียม Slide', titleEn: 'Prepare Slides', done: true },
      { id: 't2', title: 'นำเสนอ 10 นาที', titleEn: 'Present for 10 minutes', done: true },
    ]
  },
  {
    id: 'q5', type: 'challenge', status: 'available', title: 'Algorithm Master: Dynamic Programming',
    titleEn: 'Algorithm Master: Dynamic Programming',
    description: 'แก้โจทย์ Dynamic Programming 5 ข้อ ภายใน 3 วัน',
    descriptionEn: 'Solve 5 Dynamic Programming problems within 3 days',
    assignedBy: 'อ.ดร.วิชัย เก่งกล้า', assignedByEn: 'Dr. Wichai Kengkla',
    assignerType: 'lecturer', xp: 250, coins: 80,
    deadline: '2026-02-14', progress: 0,
    difficulty: 'hard', category: 'algorithm',
    tasks: [
      { id: 't1', title: 'Fibonacci Variants', titleEn: 'Fibonacci Variants', done: false },
      { id: 't2', title: 'Knapsack Problem', titleEn: 'Knapsack Problem', done: false },
      { id: 't3', title: 'Longest Common Subsequence', titleEn: 'Longest Common Subsequence', done: false },
      { id: 't4', title: 'Matrix Chain Multiplication', titleEn: 'Matrix Chain Multiplication', done: false },
      { id: 't5', title: 'Edit Distance', titleEn: 'Edit Distance', done: false },
    ]
  },
  {
    id: 'q6', type: 'solo', status: 'completed', title: 'Git & Version Control Mastery',
    titleEn: 'Git & Version Control Mastery',
    description: 'เรียนรู้การใช้ Git อย่างเชี่ยวชาญ',
    descriptionEn: 'Master Git version control',
    assignedBy: 'อ.ดร.สมศรี ใจดี', assignedByEn: 'Dr. Somsri Jaidee',
    assignerType: 'lecturer', xp: 100, coins: 30,
    deadline: '2026-01-30', progress: 100,
    difficulty: 'easy', category: 'devops',
    tasks: [
      { id: 't1', title: 'Basic Commands', titleEn: 'Basic Commands', done: true },
      { id: 't2', title: 'Branching & Merging', titleEn: 'Branching & Merging', done: true },
      { id: 't3', title: 'Conflict Resolution', titleEn: 'Conflict Resolution', done: true },
    ]
  },
];

// Player stats
const playerStats = {
  level: 12,
  currentXP: 2450,
  nextLevelXP: 3000,
  totalXP: 8450,
  coins: 680,
  questsCompleted: 24,
  streak: 7,
  rank: 'Silver II',
  badges: [
    { id: 'b1', name: 'First Quest', nameEn: 'First Quest', icon: '🎯', earned: true },
    { id: 'b2', name: 'Team Player', nameEn: 'Team Player', icon: '🤝', earned: true },
    { id: 'b3', name: 'Speed Runner', nameEn: 'Speed Runner', icon: '⚡', earned: true },
    { id: 'b4', name: 'Perfect Score', nameEn: 'Perfect Score', icon: '💯', earned: true },
    { id: 'b5', name: 'Night Owl', nameEn: 'Night Owl', icon: '🦉', earned: false },
    { id: 'b6', name: 'Legendary', nameEn: 'Legendary', icon: '👑', earned: false },
  ]
};

type QuestRow = {
  id: string;
  type: string;
  status: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  assignedBy: string;
  assignedByEn: string;
  assignerType: string;
  xp: number;
  coins: number;
  deadline: string;
  progress: number;
  difficulty: string;
  category: string;
  groupSize?: number;
  groupMembers?: string[];
  tasks: Array<{ id: string; title: string; titleEn: string; done: boolean }>;
};

type PlayerStats = typeof playerStats;

export default function Training() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [quests, setQuests] = useState<QuestRow[]>(mockQuests);
  const [stats, setStats] = useState<PlayerStats>(playerStats);
  const [selectedQuest, setSelectedQuest] = useState<QuestRow | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const tr = t.training;

  const loadLiveData = React.useCallback(async () => {
    const [questsResponse, statsResponse] = await Promise.allSettled([
      api.quests.list(),
      api.player.stats(),
    ]);

    if (questsResponse.status === 'fulfilled') {
      const mapped = questsResponse.value.quests.map((item, index) => {
        const quest = asRecord(item);
        const fallback = mockQuests[index % mockQuests.length];
        const enrollments = asArray(quest.enrollments);
        const enrollment = asRecord(enrollments[0]);
        const completedTasks = asArray<string>(enrollment.completedTasks);
        const tasks = asArray(quest.tasks).map((taskItem, taskIndex) => {
          const task = asRecord(taskItem);
          const id = asString(task.id, `t${taskIndex + 1}`);
          return {
            id,
            title: asString(task.title, fallback.tasks[taskIndex]?.title ?? `Task ${taskIndex + 1}`),
            titleEn: asString(task.titleEn, fallback.tasks[taskIndex]?.titleEn ?? `Task ${taskIndex + 1}`),
            done: completedTasks.includes(id),
          };
        });
        const status = asString(enrollment.status, asDate(quest.deadline) > new Date() ? 'available' : 'completed').replace('_', '-');
        const fallbackGroupSize = 'groupSize' in fallback ? fallback.groupSize : 0;
        return {
          id: asString(quest.id, fallback.id),
          type: asString(quest.type, fallback.type) as QuestRow['type'],
          status: status as QuestRow['status'],
          title: asString(quest.title, fallback.title),
          titleEn: asString(quest.titleEn, fallback.titleEn),
          description: asString(quest.description, fallback.description),
          descriptionEn: asString(quest.descriptionEn, fallback.descriptionEn),
          assignedBy: asString(quest.assignerNameThai, fallback.assignedBy),
          assignedByEn: asString(quest.assignerName, fallback.assignedByEn),
          assignerType: asString(quest.assignerType, fallback.assignerType) as QuestRow['assignerType'],
          xp: asNumber(quest.xp, fallback.xp),
          coins: asNumber(quest.coins, fallback.coins),
          deadline: asDate(quest.deadline, new Date(fallback.deadline)).toISOString().split('T')[0],
          progress: asNumber(enrollment.progress, status === 'completed' ? 100 : fallback.progress),
          difficulty: asString(quest.difficulty, fallback.difficulty) as QuestRow['difficulty'],
          category: asString(quest.category, fallback.category),
          tasks,
          groupSize: fallbackGroupSize ? asNumber(quest.groupSize, fallbackGroupSize) : undefined,
          groupMembers: 'groupMembers' in fallback ? fallback.groupMembers : undefined,
        } as QuestRow;
      });
      if (mapped.length) setQuests(mapped);
    }

    if (statsResponse.status === 'fulfilled') {
      const liveStats = asRecord(statsResponse.value.stats);
      const badges = asArray(liveStats.badges);
      setStats((current) => ({
        ...current,
        level: asNumber(liveStats.level, current.level),
        currentXP: asNumber(liveStats.xp, current.currentXP),
        totalXP: asNumber(liveStats.xp, current.totalXP),
        coins: asNumber(liveStats.coins, current.coins),
        questsCompleted: asArray(liveStats.quests).filter((quest) => asRecord(quest).status === 'completed').length || current.questsCompleted,
        badges: badges.length
          ? badges.map((badge, index) => {
              const source = asRecord(badge);
              return {
                id: asString(source.id, `badge-${index}`),
                name: asString(source.name, current.badges[index]?.name ?? 'Badge'),
                nameEn: asString(source.nameEn, current.badges[index]?.nameEn ?? asString(source.name, 'Badge')),
                icon: asString(source.icon, current.badges[index]?.icon ?? '*'),
                earned: true,
              };
            })
          : current.badges,
      }));
    }
  }, []);

  React.useEffect(() => {
    void loadLiveData();
  }, [loadLiveData]);

  const getDifficultyConfig = (diff: string) => {
    switch (diff) {
      case 'easy': return { label: tr.easy, color: 'bg-emerald-100 text-emerald-700 border-emerald-200', glow: 'shadow-emerald-200' };
      case 'normal': return { label: tr.normal, color: 'bg-blue-100 text-blue-700 border-blue-200', glow: 'shadow-blue-200' };
      case 'hard': return { label: tr.hard, color: 'bg-orange-100 text-orange-700 border-orange-200', glow: 'shadow-orange-200' };
      case 'legendary': return { label: tr.legendary, color: 'bg-purple-100 text-purple-700 border-purple-200 animate-pulse', glow: 'shadow-purple-300' };
      default: return { label: diff, color: 'bg-gray-100 text-gray-700', glow: '' };
    }
  };

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'solo': return { label: tr.solo, icon: User, color: 'text-blue-600' };
      case 'group': return { label: tr.group, icon: Users, color: 'text-purple-600' };
      case 'event': return { label: tr.event, icon: Calendar, color: 'text-amber-600' };
      case 'meeting': return { label: tr.meeting, icon: Clock, color: 'text-teal-600' };
      case 'challenge': return { label: tr.challenge, icon: Target, color: 'text-red-600' };
      default: return { label: type, icon: Flag, color: 'text-gray-600' };
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'in-progress': return { label: tr.inProgress, color: 'bg-blue-500' };
      case 'completed': return { label: tr.completed, color: 'bg-emerald-500' };
      case 'available': return { label: tr.available, color: 'bg-amber-500' };
      case 'upcoming': return { label: tr.upcoming, color: 'bg-purple-500' };
      default: return { label: status, color: 'bg-gray-500' };
    }
  };

  const handleAcceptQuest = async (quest: QuestRow) => {
    try {
      await api.quests.accept(quest.id);
      toast.success(tr.acceptQuest);
      await loadLiveData();
      setSelectedQuest(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tr.noQuests);
    }
  };

  const handleSubmitQuest = async (quest: QuestRow) => {
    const nextTask = quest.tasks.find((task) => !task.done);
    if (!nextTask) {
      setSelectedQuest(null);
      return;
    }

    try {
      await api.quests.completeTask({ questId: quest.id, taskId: nextTask.id });
      toast.success(tr.submitQuest);
      await loadLiveData();
      setSelectedQuest(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tr.noQuests);
    }
  };

  const xpProgress = (stats.currentXP / stats.nextLevelXP) * 100;

  const filteredQuests = activeTab === 'all' ? quests :
    activeTab === 'active' ? quests.filter(q => q.status === 'in-progress') :
    activeTab === 'available' ? quests.filter(q => q.status === 'available' || q.status === 'upcoming') :
    quests.filter(q => q.status === 'completed');

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-10">
      {/* Hero - Player Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Player Card */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-2 p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 text-white relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:20px_20px]" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full blur-[60px]" />

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Swords className="w-5 h-5 text-indigo-400" />
                  <span className="text-indigo-300 font-medium text-sm">{tr.subtitle}</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-1">
                  {tr.title} <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">{tr.titleHighlight}</span>
                </h1>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10 dark:bg-slate-900/50">
                <Crown className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-amber-300">{stats.rank}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 dark:bg-slate-900/50">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs text-slate-400">{tr.level}</span>
                </div>
                <div className="text-2xl font-bold">{stats.level}</div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 dark:bg-slate-900/50">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-slate-400">XP</span>
                </div>
                <div className="text-2xl font-bold">{stats.totalXP.toLocaleString()}</div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 dark:bg-slate-900/50">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-slate-400">{tr.questsDone}</span>
                </div>
                <div className="text-2xl font-bold">{stats.questsCompleted}</div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 dark:bg-slate-900/50">
                <div className="flex items-center gap-2 mb-1">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-xs text-slate-400">{tr.streak}</span>
                </div>
                <div className="text-2xl font-bold">{stats.streak} {tr.days}</div>
              </div>
            </div>

            {/* XP Bar */}
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-slate-400">{tr.level} {stats.level}</span>
                <span className="text-indigo-300">{stats.currentXP} / {stats.nextLevelXP} XP</span>
              </div>
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden dark:bg-slate-900/50">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${xpProgress}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Badges Card */}
        <motion.div variants={itemVariants} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/50">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-lg">{tr.badges}</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {stats.badges.map(badge => (
              <div
                key={badge.id}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                  badge.earned
                    ? 'bg-amber-50 border border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30'
                    : 'bg-slate-50 border border-slate-100 dark:border-slate-800 opacity-40 grayscale'
                } dark:bg-slate-900/50`}
              >
                <span className="text-2xl">{badge.icon}</span>
                <span className="text-xs font-medium text-center text-slate-600 dark:text-slate-300">
                  {language === 'th' ? badge.name : badge.nameEn}
                </span>
                {!badge.earned && <Lock className="w-3 h-3 text-slate-400" />}
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-xl border border-amber-100 dark:border-amber-900/30">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-amber-700">
                {stats.badges.filter(b => b.earned).length}/{stats.badges.length} {tr.badgesEarned}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quests */}
      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="bg-slate-100 dark:bg-slate-800">
              <TabsTrigger value="all">{tr.allQuests}</TabsTrigger>
              <TabsTrigger value="active">🔥 {tr.activeQuests}</TabsTrigger>
              <TabsTrigger value="available">📋 {tr.availableQuests}</TabsTrigger>
              <TabsTrigger value="completed">✅ {tr.completedQuests}</TabsTrigger>
            </TabsList>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {filteredQuests.map((quest, i) => {
                const diff = getDifficultyConfig(quest.difficulty);
                const typeConf = getTypeConfig(quest.type);
                const statusConf = getStatusConfig(quest.status);
                const TypeIcon = typeConf.icon;

                return (
                  <motion.div
                    key={quest.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ y: -4 }}
                    onClick={() => setSelectedQuest(quest)}
                    className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-lg ${diff.glow} cursor-pointer transition-all hover:shadow-xl group relative overflow-hidden`}
                  >
                    {quest.difficulty === 'legendary' && (
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-amber-500/5 animate-gradient-x" />
                    )}
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 ${typeConf.color}`}>
                            <TypeIcon className="w-4 h-4" />
                          </div>
                          <Badge variant="outline" className={diff.color}>{diff.label}</Badge>
                          {quest.type === 'group' && (
                            <Badge variant="outline" className="text-purple-600 border-purple-200 dark:text-slate-300">
                              <Users className="w-3 h-3 mr-1" />
                              {'groupSize' in quest ? quest.groupSize : ''}
                            </Badge>
                          )}
                        </div>
                        <div className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${statusConf.color}`}>
                          {statusConf.label}
                        </div>
                      </div>

                      <h3 className="font-bold text-lg mb-1 group-hover:text-indigo-600 transition-colors dark:text-slate-300">
                        {language === 'th' ? quest.title : quest.titleEn}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">
                        {language === 'th' ? quest.description : quest.descriptionEn}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
                        {quest.assignerType === 'company' ? <Building2 className="w-3.5 h-3.5" /> : <GraduationCap className="w-3.5 h-3.5" />}
                        <span>{language === 'th' ? quest.assignedBy : quest.assignedByEn}</span>
                        <span>•</span>
                        <Timer className="w-3.5 h-3.5" />
                        <span>{new Date(quest.deadline).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>

                      {quest.status !== 'upcoming' && quest.status !== 'available' && (
                        <div className="mb-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-500 dark:text-slate-400">{tr.progress}</span>
                            <span className="font-medium">{quest.progress}%</span>
                          </div>
                          <Progress value={quest.progress} className="h-2" />
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-sm">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-slate-400" />
                            <span className="font-semibold text-indigo-600 dark:text-slate-300">{quest.xp} XP</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            <Star className="w-3.5 h-3.5 text-amber-500" />
                            <span className="font-semibold text-amber-600">{quest.coins}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors dark:text-slate-400" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {filteredQuests.length === 0 && (
                <div className="col-span-2 text-center py-16 text-slate-400">
                  <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>{tr.noQuests}</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </motion.div>

      {/* Quest Detail Dialog */}
      <Dialog open={!!selectedQuest} onOpenChange={() => setSelectedQuest(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          {selectedQuest && (() => {
            const diff = getDifficultyConfig(selectedQuest.difficulty);
            const typeConf = getTypeConfig(selectedQuest.type);
            const TypeIcon = typeConf.icon;
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-2 rounded-lg bg-slate-50 dark:bg-slate-950 ${typeConf.color}`}>
                      <TypeIcon className="w-5 h-5" />
                    </div>
                    <Badge variant="outline" className={diff.color}>{diff.label}</Badge>
                    <Badge variant="outline">{typeConf.label}</Badge>
                  </div>
                  <DialogTitle className="text-xl">
                    {language === 'th' ? selectedQuest.title : selectedQuest.titleEn}
                  </DialogTitle>
                  <DialogDescription>
                    {language === 'th' ? selectedQuest.description : selectedQuest.descriptionEn}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                  {/* Rewards */}
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                    <div className="text-center">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{tr.rewards}</div>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 font-bold text-indigo-600 dark:text-slate-300">
                          <Sparkles className="w-4 h-4" />{selectedQuest.xp} XP
                        </span>
                        <span className="flex items-center gap-1 font-bold text-amber-600">
                          <Star className="w-4 h-4" />{selectedQuest.coins} coins
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{tr.assignedByLabel}</div>
                      <div className="font-medium text-sm flex items-center gap-1.5">
                        {selectedQuest.assignerType === 'company' ? <Building2 className="w-4 h-4 text-blue-500 dark:text-slate-400" /> : <GraduationCap className="w-4 h-4 text-purple-500 dark:text-slate-400" />}
                        {language === 'th' ? selectedQuest.assignedBy : selectedQuest.assignedByEn}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{tr.deadlineLabel}</div>
                      <div className="font-medium text-sm">
                        {new Date(selectedQuest.deadline).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                  </div>

                  {/* Tasks */}
                  {selectedQuest.tasks.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Target className="w-4 h-4" /> {tr.taskList}
                        <span className="text-sm text-slate-400">
                          ({selectedQuest.tasks.filter(t => t.done).length}/{selectedQuest.tasks.length})
                        </span>
                      </h4>
                      <div className="space-y-2">
                        {selectedQuest.tasks.map((task) => (
                          <div
                            key={task.id}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                              task.done ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30' : 'bg-white border-slate-100 dark:border-slate-800'
                            } dark:bg-slate-900/50`}
                          >
                            <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${task.done ? 'text-emerald-500' : 'text-slate-300'}`} />
                            <span className={`text-sm ${task.done ? 'line-through text-slate-400' : 'text-slate-700'} dark:text-slate-200`}>
                              {language === 'th' ? task.title : task.titleEn}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-3 pt-2">
                    {selectedQuest.status === 'available' && (
                      <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={() => handleAcceptQuest(selectedQuest)}>
                        <Swords className="w-4 h-4 mr-2" />{tr.acceptQuest}
                      </Button>
                    )}
                    {selectedQuest.status === 'in-progress' && (
                      <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleSubmitQuest(selectedQuest)}>
                        <CheckCircle2 className="w-4 h-4 mr-2" />{tr.submitQuest}
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => setSelectedQuest(null)}>
                      {t.common.close}
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
