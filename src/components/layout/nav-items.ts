import type React from 'react';
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  GraduationCap,
  Trophy,
  FileText,
  Briefcase,
  ClipboardList,
  MessageSquare,
  Users,
  Settings,
  Bell,
  BarChart3,
  Shield,
  Building,
  Bot,
  UserCheck,
  Target,
  UserCog,
  Building2,
  Search,
  Clock,
  CalendarClock,
} from 'lucide-react';
import type { UserRole } from '@/types';

/** the pages each role reaches from the menu; the desktop sidebar and the phone drawer both use this list (G5) */
export interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
}

export const getNavItems = (role: UserRole, nav: Record<string, string>): NavItem[] => {
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
        { icon: Clock, label: nav.applicationHistory || 'Application History', href: '/application-history' },
        { icon: ClipboardList, label: nav.requests || 'Requests', href: '/requests' },
        // M1: students book office hours with a lecturer
        { icon: CalendarClock, label: nav.appointments || 'Appointments', href: '/appointments' },
        { icon: MessageSquare, label: nav.messages || 'Messages', href: '/messages' },
        { icon: Settings, label: nav.settings || 'Settings', href: '/settings' },
      ];
    case 'lecturer':
      return [
        ...commonItems,
        { icon: Calendar, label: nav.teachingSchedule || 'Teaching Schedule', href: '/schedule' },
        { icon: Users, label: nav.adviseeStudents || 'Advisees', href: '/advisees' },
        { icon: UserCheck, label: nav.studentsList || 'Students', href: '/students' },
        { icon: BookOpen, label: nav.courseManagement || 'Courses', href: '/courses' },
        { icon: ClipboardList, label: nav.attendanceBehavior || 'Attendance', href: '/attendance' },
        { icon: GraduationCap, label: nav.grading || 'Grading', href: '/grades' },
        { icon: FileText, label: nav.appointments || 'Appointments', href: '/appointments' },
        { icon: UserCog, label: nav.internTracking || 'Intern Tracking', href: '/intern-tracking' },
        { icon: MessageSquare, label: nav.messages || 'Messages', href: '/messages' },
        { icon: Settings, label: nav.settings || 'Settings', href: '/settings' },
      ];
    case 'staff':
      return [
        ...commonItems,
        { icon: Users, label: nav.users || 'Users', href: '/users' },
        // pages staff could already open but only reach by URL (QA L1)
        { icon: BookOpen, label: nav.courseManagement || 'Courses', href: '/courses' },
        { icon: GraduationCap, label: nav.studentsList || 'Students', href: '/students' },
        { icon: ClipboardList, label: nav.grades || 'Grades', href: '/grades' },
        { icon: FileText, label: nav.documentIssue || 'Documents', href: '/documents' },
        { icon: BarChart3, label: nav.reportsStats || 'Reports', href: '/reports' },
        { icon: Bell, label: nav.announcementManagement || 'Announcements', href: '/notifications' },
        { icon: Clock, label: nav.workloadTracking || 'Workload', href: '/workload-tracking' },
        { icon: Calendar, label: nav.scheduleManagement || 'Schedule Mgmt', href: '/schedule-management' },
        { icon: Trophy, label: nav.activityAdmin || 'Activities', href: '/activities-management' },
        { icon: ClipboardList, label: nav.requests || 'Requests', href: '/requests' },
        { icon: UserCog, label: nav.internTracking || 'Intern Tracking', href: '/intern-tracking' },
        { icon: Building2, label: nav.cooperationMOU || 'MOU', href: '/cooperation' },
        { icon: Building, label: nav.cooperationNetwork || 'Network', href: '/network' },
        { icon: MessageSquare, label: nav.messages || 'Messages', href: '/messages' },
        { icon: Settings, label: nav.settings || 'Settings', href: '/settings' },
      ];
    case 'company':
      return [
        ...commonItems,
        { icon: Briefcase, label: nav.jobPostings || 'Job Postings', href: '/job-postings' },
        { icon: Target, label: nav.skillsRequirement || 'Skills', href: '/skills-requirement' },
        { icon: Search, label: nav.searchStudents || 'Search Students', href: '/talent-search' },
        { icon: Users, label: nav.applicants || 'Applicants', href: '/applicants' },
        { icon: UserCog, label: nav.internTracking || 'Intern Tracking', href: '/intern-tracking' },
        { icon: Building2, label: nav.cooperationMOU || 'MOU', href: '/cooperation' },
        { icon: MessageSquare, label: nav.messages || 'Messages', href: '/messages' },
        { icon: Settings, label: nav.settings || 'Settings', href: '/settings' },
      ];
    case 'admin':
      return [
        ...commonItems,
        { icon: Users, label: nav.userManagement || 'User Management', href: '/users' },
        { icon: FileText, label: nav.documentIssue || 'Documents', href: '/documents' },
        { icon: BookOpen, label: nav.courseManagement || 'Courses', href: '/courses' },
        { icon: Calendar, label: nav.scheduleManagement || 'Schedule Mgmt', href: '/schedule-management' },
        { icon: UserCog, label: nav.internTracking || 'Intern Tracking', href: '/intern-tracking' },
        { icon: Building2, label: nav.cooperationNetwork || 'Network', href: '/network' },
        { icon: Trophy, label: nav.activityAdmin || 'Activities', href: '/activities-management' },
        { icon: Bot, label: nav.automation || 'Automation', href: '/automation' },
        { icon: Briefcase, label: nav.jobsInternships || 'Jobs & Interns', href: '/job-postings' },
        { icon: Search, label: nav.studentDatabase || 'Student DB', href: '/talent-search' },
        { icon: Building, label: nav.partnerCompanies || 'Partners', href: '/cooperation' },
        { icon: Bell, label: nav.announcementsNotifications || 'Notifications', href: '/notifications' },
        { icon: BarChart3, label: nav.reportsStats || 'Reports', href: '/reports' },
        { icon: Shield, label: nav.auditLogs || 'Audit Logs', href: '/audit' },
        { icon: Settings, label: nav.systemSettings || 'Settings', href: '/settings' },
      ];
    default:
      return commonItems;
  }
};


/** a menu item is the current page on its own path and below it (/courses/:id), except the dashboard */
export const isNavActive = (pathname: string, href: string) =>
  pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`));
