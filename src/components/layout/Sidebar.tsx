import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  FileText,
  Users,
  Building2,
  Trophy,
  MessageSquare,
  Settings,
  GraduationCap,
  ClipboardList,
  BarChart3,
  Briefcase,
  UserCog,
  Shield,
  Bell,
  X,
  DollarSign,
  Search,
  Clock,
  Building,
  Swords,
  Target,
  Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const getNavItems = (role: UserRole, nav: Record<string, string>): NavItem[] => {
  const commonItems: NavItem[] = [
    { icon: LayoutDashboard, label: nav.dashboard, href: '/dashboard' },
  ];

  switch (role) {
    case 'student':
      return [
        ...commonItems,
        { icon: BookOpen, label: nav.courses, href: '/courses' },
        { icon: Calendar, label: nav.schedule, href: '/schedule' },
        { icon: GraduationCap, label: nav.grades, href: '/grades' },
        { icon: Trophy, label: nav.activities, href: '/activities' },
        { icon: FileText, label: nav.portfolio, href: '/portfolio' },
        { icon: Briefcase, label: nav.internships, href: '/internships' },
        { icon: Clock, label: nav.applicationHistory || 'ประวัติการสมัคร', href: '/application-history' },
        { icon: ClipboardList, label: nav.requests, href: '/requests' },
        // { icon: Swords, label: nav.training, href: '/training' }, // ปิดชั่วคราว
        { icon: MessageSquare, label: nav.messages, href: '/messages' },
        { icon: Settings, label: nav.settings, href: '/settings' },
      ];
    case 'lecturer':
      return [
        ...commonItems,
        { icon: Calendar, label: nav.teachingSchedule, href: '/schedule' },
        { icon: Users, label: nav.adviseeStudents, href: '/students' },
        { icon: BookOpen, label: nav.courseManagement, href: '/courses' },
        { icon: ClipboardList, label: nav.attendanceBehavior, href: '/attendance' },
        { icon: GraduationCap, label: nav.grading, href: '/grades' },
        { icon: FileText, label: nav.appointments, href: '/appointments' },
        { icon: MessageSquare, label: nav.messages, href: '/messages' },
        { icon: Settings, label: nav.settings, href: '/settings' },
      ];
    case 'staff':
      return [
        ...commonItems,
        { icon: Users, label: nav.users, href: '/users' },
        { icon: GraduationCap, label: nav.studentDatabase, href: '/students' },
        { icon: BookOpen, label: nav.curriculumCourses, href: '/courses' },
        { icon: ClipboardList, label: nav.requests, href: '/requests' },
        { icon: MessageSquare, label: nav.messages, href: '/messages' },
        { icon: DollarSign, label: nav.budgetProcurement, href: '/budget' },
        { icon: Building2, label: nav.cooperationNetwork, href: '/network' },
        { icon: FileText, label: nav.issueDocuments, href: '/documents' },
        { icon: UserCog, label: nav.personnelManagement, href: '/personnel' },
        { icon: Calendar, label: nav.scheduleRoomManagement, href: '/schedule-management' },
        { icon: Trophy, label: nav.activityManagement, href: '/activities-management' },
        { icon: Clock, label: nav.workloadTracking, href: '/workload-tracking' },
        { icon: BarChart3, label: nav.reportsStats, href: '/reports' },
        { icon: Shield, label: nav.audit, href: '/audit' },
        { icon: Bell, label: nav.announcementManagement, href: '/notifications' },
        { icon: Settings, label: nav.settings, href: '/settings' },
      ];
    case 'company':
      return [
        ...commonItems,
        { icon: Briefcase, label: nav.jobPostings, href: '/job-postings' },
        { icon: Target, label: nav.skillsRequirement, href: '/skills-requirement' },
        { icon: Search, label: nav.searchStudents, href: '/student-profiles' },
        { icon: Users, label: nav.applicants, href: '/applicants' },
        { icon: UserCog, label: nav.internTracking, href: '/intern-tracking' },
        { icon: Settings, label: nav.settings, href: '/settings' },
      ];
    case 'admin':
      return [
        ...commonItems,
        { icon: Shield, label: nav.systemOverview, href: '/dashboard' },
        { icon: Users, label: nav.userManagement, href: '/users' },
        { icon: BookOpen, label: nav.curriculumCourses, href: '/courses' },
        { icon: Calendar, label: nav.teachingScheduleAdmin, href: '/schedule-management' },
        { icon: DollarSign, label: nav.budgetProcurement, href: '/budget' },
        { icon: UserCog, label: nav.personnelManagement, href: '/personnel' },
        { icon: FileText, label: nav.documentsRequests, href: '/documents' },
        { icon: Building2, label: nav.cooperationNetwork, href: '/network' },
        { icon: Trophy, label: nav.activityAdmin, href: '/activities-management' },
        { icon: Bot, label: nav.automation || 'Automation', href: '/automation' },
        { icon: Briefcase, label: nav.jobsInternships, href: '/job-postings' },
        { icon: Search, label: nav.studentDatabase, href: '/student-profiles' },
        { icon: Building, label: nav.partnerCompanies, href: '/cooperation' },
        { icon: Bell, label: nav.announcementsNotifications, href: '/notifications' },
        { icon: BarChart3, label: nav.reportsStats, href: '/reports' },
        { icon: Shield, label: nav.auditLogs, href: '/audit' },
        { icon: Settings, label: nav.systemSettingsAdmin, href: '/settings' },
      ];
    default:
      return commonItems;
  }
};

const getRoleAccent = (role: UserRole) => {
  switch (role) {
    case 'student':  return { dot: 'bg-blue-500',   active: 'bg-blue-600 text-white',   init: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' };
    case 'lecturer': return { dot: 'bg-emerald-500', active: 'bg-emerald-600 text-white', init: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' };
    case 'staff':    return { dot: 'bg-purple-500',  active: 'bg-purple-600 text-white',  init: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' };
    case 'company':  return { dot: 'bg-amber-500',   active: 'bg-amber-600 text-white',   init: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' };
    case 'admin':    return { dot: 'bg-red-500',     active: 'bg-red-600 text-white',     init: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' };
    default:         return { dot: 'bg-slate-500',   active: 'bg-slate-700 text-white',   init: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' };
  }
};

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();

  if (!user) return null;

  const navItems = getNavItems(user.role, t.nav as unknown as Record<string, string>);
  const accent = getRoleAccent(user.role);
  const initials = user.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || '??';

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 h-[100dvh] w-64 shrink-0 self-start flex flex-col",
          "bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800",
          "transition-transform duration-300 md:sticky md:inset-auto md:top-0 md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 bg-slate-900 dark:bg-white rounded-md flex items-center justify-center shrink-0">
              <span className="text-[9px] font-bold text-white dark:text-slate-900">SP</span>
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900 dark:text-white leading-tight">ShowPro</div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight capitalize">{user.role}</div>
            </div>
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden w-8 h-8 text-slate-400 hover:text-slate-900 dark:hover:text-white" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 min-h-0 py-3 px-3">
          <nav className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                    isActive
                      ? `${accent.active}`
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="font-medium truncate">{item.label}</span>
                  {item.badge && (
                    <span className={cn(
                      "ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                      isActive ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    )}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* User Profile */}
        <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 p-3">
          <div className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0", accent.init)}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{user.name}</div>
              <div className="flex items-center gap-1.5">
                <div className={cn("w-1.5 h-1.5 rounded-full", accent.dot)} />
                <div className="text-xs text-slate-400 dark:text-slate-500 capitalize">{user.role}</div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
