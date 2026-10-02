import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  MessageSquare,
  Menu,
  Trophy,
  Briefcase,
  Users,
  FileText,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { UserRole } from '@/types';

interface MobileBottomNavProps {
  onMenuToggle: () => void;
}

export function MobileBottomNav({ onMenuToggle }: MobileBottomNavProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  if (!user) return null;

  // Quick access links for bottom bar per role (max 4 main tabs + 1 "More/Menu" tab)
  const getQuickLinks = (role: UserRole) => {
    switch (role) {
      case 'student':
        return [
          { icon: LayoutDashboard, label: t.nav?.dashboard || 'หน้าหลัก', href: '/dashboard' },
          { icon: Calendar, label: t.nav?.schedule || 'ตารางเรียน', href: '/schedule' },
          { icon: BookOpen, label: t.nav?.courses || 'รายวิชา', href: '/courses' },
          { icon: Trophy, label: t.nav?.activities || 'กิจกรรม', href: '/activities' },
        ];
      case 'lecturer':
        return [
          { icon: LayoutDashboard, label: t.nav?.dashboard || 'หน้าหลัก', href: '/dashboard' },
          { icon: Calendar, label: t.nav?.teachingSchedule || 'ตารางสอน', href: '/schedule' },
          { icon: BookOpen, label: t.nav?.courseManagement || 'รายวิชา', href: '/courses' },
          { icon: MessageSquare, label: t.nav?.messages || 'ข้อความ', href: '/messages' },
        ];
      case 'staff':
      case 'admin':
        return [
          { icon: LayoutDashboard, label: t.nav?.dashboard || 'หน้าหลัก', href: '/dashboard' },
          { icon: Users, label: t.nav?.users || 'ผู้ใช้งาน', href: '/users' },
          { icon: Calendar, label: t.nav?.schedule || 'ตารางงาน', href: '/schedule-management' },
          { icon: FileText, label: t.nav?.documentsRequests || 'เอกสาร', href: '/documents' },
        ];
      case 'company':
        return [
          { icon: LayoutDashboard, label: t.nav?.dashboard || 'หน้าหลัก', href: '/dashboard' },
          { icon: Briefcase, label: t.nav?.jobPostings || 'งาน/ฝึกงาน', href: '/job-postings' },
          { icon: Users, label: t.nav?.applicants || 'ผู้สมัคร', href: '/applicants' },
          { icon: MessageSquare, label: t.nav?.messages || 'ข้อความ', href: '/messages' },
        ];
      default:
        return [
          { icon: LayoutDashboard, label: t.nav?.dashboard || 'หน้าหลัก', href: '/dashboard' },
        ];
    }
  };

  const quickLinks = getQuickLinks(user.role);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 px-2 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]"
      aria-label="Mobile Navigation"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {quickLinks.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 min-w-[56px]",
                isActive
                  ? "text-blue-600 dark:text-blue-400 font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium"
              )}
            >
              <div className={cn(
                "relative p-1 rounded-xl transition-all duration-200",
                isActive && "bg-blue-50 dark:bg-blue-950/60 scale-110"
              )}>
                <Icon className="w-5 h-5" />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[64px]">
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Profile / Menu trigger */}
        <button
          type="button"
          onClick={onMenuToggle}
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 min-w-[56px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium"
        >
          <div className="p-1 rounded-xl">
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[64px]">
            {(t.header as any)?.menu || 'เมนูเพิ่มเติม'}
          </span>
        </button>
      </div>
    </nav>
  );
}
