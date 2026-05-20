import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  Folder,
  X,
  DollarSign,
  Search,
  Clock,
  Building,
  Command,
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
        // { icon: BookOpen, label: nav.courses, href: '/courses' }, // ถูกตัดออกตาม Request
        // { icon: Calendar, label: nav.schedule, href: '/schedule' }, // ถูกตัดออกตาม Request
        { icon: GraduationCap, label: nav.grades, href: '/grades' },
        { icon: Trophy, label: nav.activities, href: '/activities' },
        { icon: FileText, label: nav.portfolio, href: '/portfolio' },
        { icon: Briefcase, label: nav.internships, href: '/internships' },
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
        { icon: Building2, label: nav.cooperationMOU, href: '/cooperation' },
        { icon: DollarSign, label: nav.subscriptionPackage, href: '/subscription' },
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

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();

  if (!user) return null;

  const navItems = getNavItems(user.role, t.nav as unknown as Record<string, string>);

  const getRoleGradient = (role: UserRole) => {
    switch (role) {
      case 'student': return 'from-blue-500 to-indigo-600';
      case 'lecturer': return 'from-emerald-500 to-teal-600';
      case 'staff': return 'from-purple-500 to-fuchsia-600';
      case 'company': return 'from-orange-500 to-amber-600';
      case 'admin': return 'from-red-500 to-rose-600';
      default: return 'from-blue-500 to-indigo-600';
    }
  };

  const getRoleActiveScheme = (role: UserRole) => {
    switch (role) {
      case 'student': return {
        bg: 'bg-blue-600',
        shadow: 'shadow-blue-500/25',
        gradient: 'from-blue-600 to-indigo-600',
        textHover: 'group-hover:text-blue-400'
      };
      case 'lecturer': return {
        bg: 'bg-emerald-600',
        shadow: 'shadow-emerald-500/25',
        gradient: 'from-emerald-600 to-teal-600',
        textHover: 'group-hover:text-emerald-400'
      };
      case 'staff': return {
        bg: 'bg-purple-600',
        shadow: 'shadow-purple-500/25',
        gradient: 'from-purple-600 to-fuchsia-600',
        textHover: 'group-hover:text-purple-400'
      };
      case 'company': return {
        bg: 'bg-orange-600',
        shadow: 'shadow-orange-500/25',
        gradient: 'from-orange-600 to-amber-600',
        textHover: 'group-hover:text-orange-400'
      };
      case 'admin': return {
        bg: 'bg-red-600',
        shadow: 'shadow-red-500/25',
        gradient: 'from-red-600 to-rose-600',
        textHover: 'group-hover:text-red-400'
      };
      default: return {
        bg: 'bg-blue-600',
        shadow: 'shadow-blue-500/25',
        gradient: 'from-blue-600 to-indigo-600',
        textHover: 'group-hover:text-blue-400'
      };
    }
  };

  const activeScheme = getRoleActiveScheme(user.role);

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Premium Dark Glass */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 h-[100dvh] min-h-[100dvh] max-h-[100dvh] w-72 shrink-0 self-start bg-slate-900 text-white shadow-2xl transition-transform duration-300 md:sticky md:inset-auto md:top-0 md:translate-x-0 border-r border-white/5 flex flex-col overflow-hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 opacity-20 dark:bg-slate-900/50" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2 opacity-20 dark:bg-slate-900/50" />
        </div>

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between p-6 border-b border-white/5 shrink-0">
          <Link to="/dashboard" className="flex items-center gap-4 group">
            <div className={cn("w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300 relative overflow-hidden", getRoleGradient(user.role))}>
              <div className="absolute inset-0 bg-white/10 blur-xl dark:bg-slate-900/50"></div>
              <Command className="w-6 h-6 text-white relative z-10" />
            </div>
            <div>
              <h2 className={`font-bold text-lg tracking-tight transition-colors ${activeScheme.textHover}`}>ShowPro</h2>
              <p className="text-xs text-slate-400 font-medium tracking-wide">Ecosystem v2.0</p>
            </div>
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden text-slate-400 hover:text-white" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="relative z-10 flex-1 min-h-0 py-6 px-4">
          <nav className="space-y-1.5 pb-3">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onClose}
                  className={cn(
                    "relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group overflow-hidden",
                    isActive
                      ? `${activeScheme.bg} text-white shadow-lg ${activeScheme.shadow}`
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className={`absolute inset-0 bg-gradient-to-r ${activeScheme.gradient} opacity-100`}
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}

                  <span className="relative z-10 flex items-center gap-3">
                    <item.icon className={cn("h-5 w-5 transition-transform duration-300", isActive ? "scale-110" : "group-hover:scale-110")} />
                    <span className="font-medium tracking-wide">{item.label}</span>
                  </span>

                  {item.badge && (
                    <span className={cn(
                      "relative z-10 ml-auto px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full",
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-800 text-slate-300 group-hover:bg-slate-700"
                    )}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* User Profile Mini - Fixed at Bottom */}
        <div className="relative z-10 p-4 border-t border-white/5 bg-slate-900/50 backdrop-blur-md shrink-0 mt-auto">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-full bg-gradient-to-tr border-2 border-slate-700 shadow-md", getRoleGradient(user.role))} />
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-bold text-white truncate group-hover:text-blue-400 transition-colors`}>{user.name}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className={cn("w-2 h-2 rounded-full animate-pulse", activeScheme.bg)} />
                  <div className="text-xs text-slate-400 truncate capitalize">{user.role} Account</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
