import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, LayoutDashboard, Calendar, BookOpen, GraduationCap,
  Trophy, FileText, Briefcase, ClipboardList, MessageSquare,
  Users, Building2, DollarSign, UserCog, Clock, BarChart3,
  Shield, Bell, Target, Search, Building, Settings,
  LogOut, QrCode, CheckSquare, ChevronRight, User,
  CreditCard, HelpCircle, FileCheck
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  icon: React.ElementType;
  label: string;
  labelEn: string;
  href: string;
}

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const { user, logout } = useAuth();
  const { language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const role = (user?.role || 'student') as UserRole;

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  // ── Student-specific role label ──
  const roleLabelMap: Record<string, { th: string; en: string }> = {
    student: { th: 'นักศึกษา', en: 'Student' },
    lecturer: { th: 'อาจารย์', en: 'Lecturer' },
    company: { th: 'สถานประกอบการ', en: 'Company' },
  };
  const roleLabel = roleLabelMap[role]?.[language] || role;

  // ── Navigation structure per role ──
  const getNavStructure = (userRole: UserRole) => {
    switch (userRole) {
      case 'student':
        return {
          primary: [
            { icon: LayoutDashboard, label: 'แดชบอร์ด', labelEn: 'Dashboard', href: '/dashboard' },
            { icon: Calendar, label: 'ตารางเรียน', labelEn: 'Schedule', href: '/schedule' },
            { icon: BookOpen, label: 'วิชาเรียน', labelEn: 'Courses', href: '/courses' },
            { icon: GraduationCap, label: 'ผลการเรียน', labelEn: 'Grades', href: '/grades' },
          ],
          services: [
            { icon: FileCheck, label: 'ลงทะเบียนเรียน', labelEn: 'Enrollment', href: '/enrollment' },
            { icon: Bell, label: 'การแจ้งเตือน', labelEn: 'Notifications', href: '/notifications' },
          ],
          extras: [
            { icon: Trophy, label: 'กิจกรรมและชั่วโมง', labelEn: 'Activities', href: '/activities' },
            { icon: FileText, label: 'แฟ้มสะสมผลงาน', labelEn: 'Portfolio', href: '/portfolio' },
            { icon: Briefcase, label: 'ตำแหน่งฝึกงาน/สหกิจ', labelEn: 'Internships', href: '/internships' },
            { icon: QrCode, label: 'สแกน QR เช็คชื่อ', labelEn: 'QR Check-in', href: '/student/checkin' },
            { icon: Users, label: 'อาจารย์ที่ปรึกษา', labelEn: 'Advisor', href: '/students' },
          ],
        };
      case 'lecturer':
        return {
          primary: [
            { icon: LayoutDashboard, label: 'แดชบอร์ด', labelEn: 'Dashboard', href: '/dashboard' },
            { icon: Calendar, label: 'ตารางสอน', labelEn: 'Schedule', href: '/schedule' },
            { icon: BookOpen, label: 'จัดการวิชา', labelEn: 'Courses', href: '/courses' },
            { icon: Users, label: 'นักศึกษา', labelEn: 'Students', href: '/students' },
          ],
          services: [
            { icon: ClipboardList, label: 'เช็คชื่อและพฤติกรรม', labelEn: 'Attendance', href: '/attendance' },
            { icon: GraduationCap, label: 'บันทึกคะแนนและเกรด', labelEn: 'Grading', href: '/grades' },
            { icon: FileText, label: 'นัดหมาย', labelEn: 'Appointments', href: '/appointments' },
            { icon: Bell, label: 'การแจ้งเตือน', labelEn: 'Notifications', href: '/notifications' },
          ],
          extras: [],
        };
      case 'company':
        return {
          primary: [
            { icon: LayoutDashboard, label: 'แดชบอร์ด', labelEn: 'Dashboard', href: '/dashboard' },
            { icon: Briefcase, label: 'ประกาศตำแหน่งงาน', labelEn: 'Job Postings', href: '/job-postings' },
            { icon: Target, label: 'ระบุ Requirement', labelEn: 'Skills Req.', href: '/skills-requirement' },
            { icon: Users, label: 'ผู้สมัคร', labelEn: 'Applicants', href: '/applicants' },
          ],
          services: [
            { icon: Search, label: 'ค้นหาโปรไฟล์นักศึกษา', labelEn: 'Search Students', href: '/student-profiles' },
            { icon: UserCog, label: 'ติดตามการฝึกงาน', labelEn: 'Intern Tracking', href: '/intern-tracking' },
            { icon: Building2, label: 'ความร่วมมือ MOU', labelEn: 'MOU', href: '/cooperation' },
            { icon: Bell, label: 'การแจ้งเตือน', labelEn: 'Notifications', href: '/notifications' },
          ],
          extras: [],
        };
      case 'staff':
      case 'admin':
        return {
          primary: [
            { icon: LayoutDashboard, label: 'แดชบอร์ด', labelEn: 'Dashboard', href: '/dashboard' },
            { icon: Users, label: 'ผู้ใช้งาน', labelEn: 'Users', href: '/users' },
            { icon: BookOpen, label: 'หลักสูตร/วิชา', labelEn: 'Courses', href: '/courses' },
            { icon: ClipboardList, label: 'คำร้อง', labelEn: 'Requests', href: '/requests' },
          ],
          services: [
            { icon: UserCog, label: 'ติดตามการฝึกงาน', labelEn: 'Intern Tracking', href: '/intern-tracking' },
            { icon: FileText, label: 'ออกเอกสาร', labelEn: 'Documents', href: '/documents' },
            { icon: Building2, label: 'เครือข่ายความร่วมมือ', labelEn: 'Network', href: '/network' },
            { icon: Bell, label: 'การแจ้งเตือน', labelEn: 'Notifications', href: '/notifications' },
          ],
          extras: [
            { icon: Calendar, label: 'ตารางสอนและห้อง', labelEn: 'Schedule Management', href: '/schedule-management' },
            { icon: Trophy, label: 'จัดการกิจกรรม', labelEn: 'Activities Management', href: '/activities-management' },
          ],
        };
      default:
        return { primary: [], services: [], extras: [] };
    }
  };

  const navStructure = getNavStructure(role);

  // System items (shared across roles)
  const systemItems: NavItem[] = [
    { icon: Settings, label: 'ตั้งค่า', labelEn: 'Settings', href: '/settings' },
    { icon: HelpCircle, label: 'ช่วยเหลือ', labelEn: 'Help', href: '/help' },
  ];

  // ── Render a single nav item ──
  const renderNavItem = (item: NavItem) => {
    const isActive = location.pathname === item.href;
    return (
      <Link
        key={item.href}
        to={item.href}
        onClick={onClose}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl min-h-[44px] transition-all active:scale-[0.98]',
          isActive
            ? 'bg-blue-500/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
        )}
      >
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
          isActive
            ? 'bg-blue-500/15 dark:bg-blue-500/20'
            : 'bg-slate-100 dark:bg-white/5'
        )}>
          <item.icon className={cn('w-[18px] h-[18px]', isActive ? 'stroke-[2.2px]' : 'stroke-[1.8px]')} />
        </div>
        <span className={cn(
          'text-[13px] flex-1 truncate',
          isActive ? 'font-bold' : 'font-medium'
        )}>
          {language === 'th' ? item.label : item.labelEn}
        </span>
        {isActive && (
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 shrink-0" />
        )}
      </Link>
    );
  };

  // ── Section divider with label ──
  const renderSectionLabel = (thLabel: string, enLabel: string) => (
    <div className="px-3 pt-4 pb-1.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
        {language === 'th' ? thLabel : enLabel}
      </span>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 dark:bg-black/60"
          />

          {/* Drawer panel — slides in from left */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative z-10 w-[80%] max-w-[320px] h-full bg-white dark:bg-[#0b1121] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* ── Drawer Header ── */}
            <div className="px-4 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800/60">
              {/* Top row: Brand + Close */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-600/20 p-1 shrink-0">
                    <img src="/showpro_logo.png" alt="Xchange" className="w-full h-full object-contain" />
                  </div>
                  <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                    Xchange
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors active:scale-90 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Student Identity Card */}
              <div className="flex items-center gap-3">
                <Avatar className="w-11 h-11 ring-2 ring-blue-500/20 shrink-0">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate leading-tight">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate leading-tight mt-0.5">
                    {(user as any)?.studentId || user?.email || 'DII-CAMT'}
                  </p>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                    {roleLabel} • Digital Industry Integration
                  </p>
                </div>
              </div>
            </div>

            {/* ── Scrollable Navigation ── */}
            <div className="flex-1 overflow-y-auto overscroll-contain py-2 px-2">
              {/* Primary Navigation */}
              {renderSectionLabel('เมนูหลัก', 'Primary')}
              <div className="space-y-0.5">
                {navStructure.primary.map(renderNavItem)}
              </div>

              {/* Divider */}
              <div className="mx-3 my-2 border-t border-slate-100 dark:border-slate-800/50" />

              {/* Additional Services */}
              {renderSectionLabel('บริการเพิ่มเติม', 'Additional Services')}
              <div className="space-y-0.5">
                {navStructure.services.map(renderNavItem)}
              </div>

              {/* Extra items (student-only: activities, portfolio, etc.) */}
              {navStructure.extras.length > 0 && (
                <>
                  <div className="mx-3 my-2 border-t border-slate-100 dark:border-slate-800/50" />
                  {renderSectionLabel('กิจกรรมและโปรไฟล์', 'Activities & Profile')}
                  <div className="space-y-0.5">
                    {navStructure.extras.map(renderNavItem)}
                  </div>
                </>
              )}

              {/* Divider */}
              <div className="mx-3 my-2 border-t border-slate-100 dark:border-slate-800/50" />

              {/* System */}
              {renderSectionLabel('ระบบ', 'System')}
              <div className="space-y-0.5">
                {systemItems.map(renderNavItem)}
              </div>
            </div>

            {/* ── Drawer Footer: Logout ── */}
            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800/60">
              <button
                onClick={() => {
                  onClose();
                  logout();
                }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl min-h-[44px] text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all active:scale-[0.98] cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center shrink-0">
                  <LogOut className="w-[18px] h-[18px] stroke-[1.8px]" />
                </div>
                <span className="text-[13px] font-semibold">
                  {language === 'th' ? 'ออกจากระบบ' : 'Log Out'}
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
