import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  X,
  DollarSign,
  Search,
  Clock,
  Building,
  Target,
  Bot,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  LogOut,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const getNavItems = (role: UserRole, nav: Record<string, string>): NavItem[] => {
  const commonItems: NavItem[] = [
    { icon: LayoutDashboard, label: nav.dashboard || 'Dashboard', href: '/dashboard' },
  ];

  switch (role) {
    case 'student':
      return [
        ...commonItems,
        { icon: Calendar, label: nav.schedule || 'Schedule', href: '/schedule' },
        { icon: BookOpen, label: nav.courses || 'Courses', href: '/courses' },
        { icon: GraduationCap, label: nav.grades || 'Grades', href: '/grades' },
        { icon: Trophy, label: nav.activities || 'Activities', href: '/activities' },
        { icon: FileText, label: nav.portfolio || 'Portfolio', href: '/portfolio' },
        { icon: Briefcase, label: nav.internships || 'Internships', href: '/internships' },
        { icon: ClipboardList, label: nav.requests || 'Requests', href: '/requests' },
        { icon: MessageSquare, label: nav.messages || 'Messages', href: '/messages' },
        { icon: Users, label: nav.adviseeStudents || 'Teacher', href: '/students' },
      ];
    case 'lecturer':
      return [
        ...commonItems,
        { icon: Calendar, label: nav.teachingSchedule || 'Teaching Schedule', href: '/schedule' },
        { icon: Users, label: nav.adviseeStudents || 'Advisees', href: '/students' },
        { icon: BookOpen, label: nav.courseManagement || 'Courses', href: '/courses' },
        { icon: ClipboardList, label: nav.attendanceBehavior || 'Attendance', href: '/attendance' },
        { icon: GraduationCap, label: nav.grading || 'Grading', href: '/grades' },
        { icon: FileText, label: nav.appointments || 'Appointments', href: '/appointments' },
        { icon: MessageSquare, label: nav.messages || 'Messages', href: '/messages' },
      ];
    case 'staff':
      return [
        ...commonItems,
        { icon: Users, label: nav.users || 'Users', href: '/users' },
        { icon: GraduationCap, label: nav.studentDatabase || 'Students', href: '/students' },
        { icon: BookOpen, label: nav.curriculumCourses || 'Curriculum', href: '/courses' },
        { icon: ClipboardList, label: nav.requests || 'Requests', href: '/requests' },
        { icon: MessageSquare, label: nav.messages || 'Messages', href: '/messages' },
        { icon: DollarSign, label: nav.budgetProcurement || 'Budget', href: '/budget' },
        { icon: Building2, label: nav.cooperationNetwork || 'Cooperation', href: '/network' },
        { icon: UserCog, label: nav.internTracking || 'Intern Tracking', href: '/intern-tracking' },
        { icon: FileText, label: nav.issueDocuments || 'Documents', href: '/documents' },
        { icon: UserCog, label: nav.personnelManagement || 'Personnel', href: '/personnel' },
        { icon: Calendar, label: nav.scheduleRoomManagement || 'Rooms', href: '/schedule-management' },
        { icon: Trophy, label: nav.activityManagement || 'Activities', href: '/activities-management' },
        { icon: Clock, label: nav.workloadTracking || 'Workload', href: '/workload-tracking' },
        { icon: BarChart3, label: nav.reportsStats || 'Reports', href: '/reports' },
        { icon: Shield, label: nav.audit || 'Audit', href: '/audit' },
        { icon: Bell, label: nav.announcementManagement || 'Announcements', href: '/notifications' },
      ];
    case 'company':
      return [
        ...commonItems,
        { icon: Briefcase, label: nav.jobPostings || 'Job Postings', href: '/job-postings' },
        { icon: Target, label: nav.skillsRequirement || 'Skills', href: '/skills-requirement' },
        { icon: Search, label: nav.searchStudents || 'Search Students', href: '/student-profiles' },
        { icon: Users, label: nav.applicants || 'Applicants', href: '/applicants' },
        { icon: UserCog, label: nav.internTracking || 'Intern Tracking', href: '/intern-tracking' },
        { icon: Building2, label: nav.cooperationMOU || 'MOU', href: '/cooperation' },
        { icon: DollarSign, label: nav.subscriptionPackage || 'Subscription', href: '/subscription' },
      ];
    case 'admin':
      return [
        ...commonItems,
        { icon: Users, label: nav.userManagement || 'User Management', href: '/users' },
        { icon: BookOpen, label: nav.curriculumCourses || 'Curriculum', href: '/courses' },
        { icon: Calendar, label: nav.teachingScheduleAdmin || 'Schedules', href: '/schedule-management' },
        { icon: DollarSign, label: nav.budgetProcurement || 'Budget', href: '/budget' },
        { icon: UserCog, label: nav.personnelManagement || 'Personnel', href: '/personnel' },
        { icon: FileText, label: nav.documentsRequests || 'Documents', href: '/documents' },
        { icon: Building2, label: nav.cooperationNetwork || 'Network', href: '/network' },
        { icon: Trophy, label: nav.activityAdmin || 'Activities', href: '/activities-management' },
        { icon: Bot, label: nav.automation || 'Automation', href: '/automation' },
        { icon: Briefcase, label: nav.jobsInternships || 'Jobs & Interns', href: '/job-postings' },
        { icon: Search, label: nav.studentDatabase || 'Student DB', href: '/student-profiles' },
        { icon: Building, label: nav.partnerCompanies || 'Partners', href: '/cooperation' },
        { icon: Bell, label: nav.announcementsNotifications || 'Notifications', href: '/notifications' },
        { icon: BarChart3, label: nav.reportsStats || 'Reports', href: '/reports' },
        { icon: Shield, label: nav.auditLogs || 'Audit Logs', href: '/audit' },
      ];
    default:
      return commonItems;
  }
};

export function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, switchRole } = useAuth();
  const { t } = useLanguage();
  const demoAccountsEnabled = import.meta.env.VITE_ENABLE_DEMO_ACCOUNTS === 'true';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Handle Esc key to close overlay on both Desktop and Mobile
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!isCollapsed) onToggleCollapse();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCollapsed, isOpen, onToggleCollapse, onClose]);

  if (!user) return null;

  const navItems = getNavItems(user.role, t.nav as unknown as Record<string, string>);

  // Determine whether overlay backdrop should be visible:
  // Desktop: visible when expanded (!isCollapsed)
  // Mobile: visible when open (isOpen)
  const isOverlayActive = !isCollapsed || isOpen;

  return (
    <>
      {/* Semi-transparent Backdrop: Clicking closes the overlay without reflow */}
      <AnimatePresence>
        {isOverlayActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className={cn(
              "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity cursor-pointer",
              // On desktop, only show backdrop when expanded
              isCollapsed && "hidden md:hidden"
            )}
            onClick={() => {
              if (!isCollapsed) onToggleCollapse();
              if (isOpen) onClose();
            }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 h-[100dvh] shrink-0 bg-[#090d16] text-slate-100 flex flex-col overflow-visible border-r border-slate-800/80 transition-all duration-300 ease-in-out",
          // When collapsed: fixed 72px icon column at z-30
          // When expanded: fixed 288px (w-72) overlay at z-50 above backdrop and content
          isCollapsed ? "w-[72px] z-30" : "w-72 z-50 shadow-2xl shadow-black/70",
          // Mobile responsive: slide in/out
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Toggle Collapse/Expand Button (Floating arrow badge centered vertically) */}
        <button
          onClick={onToggleCollapse}
          title={isCollapsed ? "ขยายเมนู (Expand sidebar)" : "ย่อเมนู (Collapse sidebar) [Esc]"}
          className="hidden md:flex absolute top-1/2 -right-3.5 -translate-y-1/2 z-50 w-7 h-7 rounded-full bg-[#0d1527] hover:bg-blue-600 text-slate-300 hover:text-white border border-slate-700/80 shadow-xl items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>

        {/* Mobile Header / Close Button */}
        <div className="md:hidden flex items-center justify-end p-3 border-b border-slate-800/80">
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white h-9 w-9" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation - Smooth Scrollable Menu */}
        <div className="flex-1 min-h-0 py-4 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          <TooltipProvider delayDuration={100}>
            <nav className="px-2.5 space-y-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.href;
                const linkContent = (
                  <Link
                    key={item.href + item.label}
                    to={item.href}
                    onClick={() => {
                      if (!isCollapsed) onToggleCollapse();
                      onClose();
                    }}
                    className={cn(
                      "relative flex items-center h-12 px-3 rounded-xl transition-all duration-150 group overflow-hidden cursor-pointer",
                      isActive
                        ? "bg-blue-600/20 text-white font-semibold border border-blue-500/40 shadow-sm"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeNavIndicator"
                        className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.9)]"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                    <div className="w-7 h-7 flex items-center justify-center shrink-0">
                      <item.icon className={cn(
                        "w-5 h-5 shrink-0 transition-colors duration-150",
                        isActive ? "text-blue-400" : "text-slate-400 group-hover:text-slate-200"
                      )} />
                    </div>
                    {!isCollapsed && (
                      <span className="ml-3 text-base font-medium tracking-tight truncate transition-opacity duration-150">
                        {item.label}
                      </span>
                    )}
                    {!isCollapsed && item.badge && (
                      <span className={cn(
                        "ml-auto px-2 py-0.5 text-xs font-semibold rounded-md shrink-0",
                        isActive
                          ? "bg-blue-500/30 text-blue-300"
                          : "bg-slate-800 text-slate-400"
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );

                if (isCollapsed) {
                  return (
                    <Tooltip key={item.href + item.label}>
                      <TooltipTrigger asChild>
                        {linkContent}
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        sideOffset={14}
                        className="bg-[#0f172a] text-slate-100 border border-slate-700 text-sm px-3 py-1.5 font-medium shadow-2xl rounded-lg z-50"
                      >
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return linkContent;
              })}
            </nav>
          </TooltipProvider>
        </div>

        {/* User Profile - Bottom of Sidebar */}
        {user && (
          <div className="shrink-0 border-t border-slate-800/80 px-2.5 py-3 bg-[#070a12]/60">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="w-full flex items-center gap-3 rounded-xl p-2 hover:bg-slate-800/60 transition-colors duration-150 cursor-pointer"
                >
                  <Avatar className="h-10 w-10 shrink-0 border-2 border-slate-700/80 shadow-md">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-bold">
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="text-base font-semibold text-slate-100 truncate">{user.name}</div>
                        <div className="text-xs text-slate-400 font-mono truncate">{user.email}</div>
                      </div>
                      <ChevronUp className="h-5 w-5 text-slate-400 shrink-0" />
                    </>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side={isCollapsed ? 'right' : 'top'}
                align={isCollapsed ? 'end' : 'start'}
                className="w-72 p-2 rounded-2xl shadow-2xl border border-slate-800 bg-[#0d1322] text-slate-100 mb-2 z-50"
              >
                {/* User Info Card */}
                <div className="p-3 mb-1 bg-[#070b14] rounded-xl border border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 border border-slate-700">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-base">{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <span className="text-base font-bold text-slate-100 block truncate">{user.name}</span>
                      <span className="text-xs text-slate-400 font-mono block truncate">{user.email}</span>
                    </div>
                  </div>
                </div>

                <DropdownMenuItem className="rounded-xl cursor-pointer py-3 px-3.5 text-slate-200 focus:bg-slate-800 focus:text-white" onClick={() => navigate('/personal-dashboard')}>
                  <User className="h-4.5 w-4.5 mr-3 text-slate-400" />
                  <span className="font-medium text-sm sm:text-base">{t.header?.profile || 'My Profile'}</span>
                </DropdownMenuItem>

                <DropdownMenuItem className="rounded-xl cursor-pointer py-3 px-3.5 text-slate-200 focus:bg-slate-800 focus:text-white" onClick={() => navigate('/settings')}>
                  <Settings className="h-4.5 w-4.5 mr-3 text-slate-400" />
                  <span className="font-medium text-sm sm:text-base">{t.header?.systemSettings || 'Settings'}</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1.5 bg-slate-800" />

                {demoAccountsEnabled && (
                  <>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="rounded-xl cursor-pointer py-3 px-3.5 text-slate-200 focus:bg-slate-700 focus:text-slate-50">
                        <Users className="h-4.5 w-4.5 mr-3 text-slate-400" />
                        <span className="font-medium text-sm sm:text-base">{t.header?.switchRole || 'Switch Account'}</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent className="p-2 rounded-xl shadow-lg border border-slate-700/50 bg-slate-800 z-50">
                          {(
                            [
                              { label: 'Student Portal', value: 'student' },
                              { label: 'Lecturer Portal', value: 'lecturer' },
                              { label: 'Staff Portal', value: 'staff' },
                              { label: 'Company Portal', value: 'company' },
                              { label: 'Admin Root', value: 'admin' },
                            ] as const
                          ).map(({ label, value }) => (
                            <DropdownMenuItem
                              key={value}
                              onClick={() => switchRole(value)}
                              className="rounded-lg cursor-pointer py-2.5 px-3.5 font-medium text-sm text-slate-400 focus:bg-blue-900/30 focus:text-blue-400"
                            >
                              {label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator className="my-1.5 bg-slate-700/50" />
                  </>
                )}

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="rounded-xl cursor-pointer py-3 px-3.5 text-red-400 focus:text-red-300 focus:bg-slate-700"
                >
                  <LogOut className="h-4.5 w-4.5 mr-3" />
                  <span className="font-medium text-sm sm:text-base">{t.header?.logout || 'Log Out'}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </aside>
    </>
  );
}
