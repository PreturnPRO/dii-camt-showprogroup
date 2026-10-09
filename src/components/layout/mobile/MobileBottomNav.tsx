import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, BookOpen, GraduationCap,
  Briefcase, Users, Target, ClipboardList
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';

interface BottomTab {
  icon: React.ElementType;
  label: string;
  labelEn: string;
  href: string;
}

export function MobileBottomNav() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const location = useLocation();

  const role = (user?.role || 'student') as UserRole;

  const getTabsForRole = (userRole: UserRole): BottomTab[] => {
    switch (userRole) {
      case 'company':
        return [
          { icon: LayoutDashboard, label: 'แดชบอร์ด', labelEn: 'Dashboard', href: '/dashboard' },
          { icon: Briefcase, label: 'รับสมัคร', labelEn: 'Jobs', href: '/job-postings' },
          { icon: Target, label: 'Requirement', labelEn: 'Skills', href: '/skills-requirement' },
          { icon: Users, label: 'ผู้สมัคร', labelEn: 'Applicants', href: '/applicants' },
        ];
      case 'lecturer':
        return [
          { icon: LayoutDashboard, label: 'แดชบอร์ด', labelEn: 'Dashboard', href: '/dashboard' },
          { icon: Calendar, label: 'ตารางสอน', labelEn: 'Schedule', href: '/schedule' },
          { icon: BookOpen, label: 'จัดการวิชา', labelEn: 'Courses', href: '/courses' },
          { icon: Users, label: 'นักศึกษา', labelEn: 'Students', href: '/students' },
        ];
      // staff/admin tabs: the student tabs include /schedule, which staff may not open
      case 'staff':
      case 'admin':
        return [
          { icon: LayoutDashboard, label: 'แดชบอร์ด', labelEn: 'Dashboard', href: '/dashboard' },
          { icon: Users, label: 'ผู้ใช้งาน', labelEn: 'Users', href: '/users' },
          { icon: BookOpen, label: 'หลักสูตร/วิชา', labelEn: 'Courses', href: '/courses' },
          { icon: ClipboardList, label: 'คำร้อง', labelEn: 'Requests', href: '/requests' },
        ];
      case 'student':
      default:
        return [
          { icon: LayoutDashboard, label: 'แดชบอร์ด', labelEn: 'Dashboard', href: '/dashboard' },
          { icon: Calendar, label: 'ตารางเรียน', labelEn: 'Schedule', href: '/schedule' },
          { icon: BookOpen, label: 'วิชาเรียน', labelEn: 'Courses', href: '/courses' },
          { icon: GraduationCap, label: 'ผลการเรียน', labelEn: 'Grades', href: '/grades' },
        ];
    }
  };

  const primaryTabs = getTabsForRole(role);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#070d19] border-t border-slate-200/80 dark:border-slate-800/80 select-none shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom,0px)]">
      <div className="flex items-center justify-around h-14 px-1">
        {primaryTabs.map((tab) => {
          const isActive = location.pathname === tab.href;
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 min-h-[44px] py-1 rounded-xl transition-all active:scale-95',
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              )}
            >
              <div
                className={cn(
                  'w-10 h-7 rounded-full flex items-center justify-center transition-all',
                  isActive && 'bg-blue-100/80 dark:bg-blue-950/60'
                )}
              >
                <tab.icon className={cn('w-[20px] h-[20px]', isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]')} />
              </div>
              <span className={cn(
                'text-[10px] mt-0.5 tracking-tight leading-tight',
                isActive ? 'font-bold' : 'font-medium'
              )}>
                {language === 'th' ? tab.label : tab.labelEn}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
