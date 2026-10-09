import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, LogOut, QrCode } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useReturnFocus } from '@/components/ui/return-focus';
import { cn } from '@/lib/utils';
import { getNavItems, isNavActive, type NavItem } from '../nav-items';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const { user, logout } = useAuth();
  const { language, t } = useLanguage();
  const location = useLocation();
  const returnFocus = useReturnFocus(undefined, () => document.querySelector<HTMLElement>('[data-mobile-menu-button]'));

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  // the shared role names (t.roles); an unknown role is '-', never a guessed 'Student'
  const roleLabel = (t.roles as Record<string, string>)[user?.role ?? ''] ?? '-';

  // the same pages as the desktop sidebar (G5, UX-H2), plus the phone-only QR check-in for students
  const navItems: NavItem[] = user
    ? [
        ...getNavItems(user.role, t.nav as unknown as Record<string, string>),
        ...(user.role === 'student'
          ? [{ icon: QrCode, label: language === 'th' ? 'สแกน QR เช็คชื่อ' : 'QR Check-in', href: '/student/checkin' }]
          : []),
      ]
    : [];

  // ── Render a single nav item ──
  const renderNavItem = (item: NavItem) => {
    const isActive = isNavActive(location.pathname, item.href);
    return (
      <Link
        key={item.href + item.label}
        to={item.href}
        aria-current={isActive ? 'page' : undefined}
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
          {item.label}
        </span>
        {isActive && (
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 shrink-0" />
        )}
      </Link>
    );
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 dark:bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        {/* a real dialog (UX-M3): focus moves in and stays, Esc closes, focus returns to the menu button */}
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onCloseAutoFocus={returnFocus.onCloseAutoFocus}
          className="fixed inset-y-0 left-0 z-50 w-[80%] max-w-[320px] h-full bg-white dark:bg-[#0b1121] flex flex-col shadow-2xl overflow-hidden focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left data-[state=closed]:duration-200 data-[state=open]:duration-300"
        >
          <returnFocus.Capture />
            {/* ── Drawer Header ── */}
            <div className="px-4 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800/60">
              {/* Top row: Brand + Close */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md p-1 shrink-0">
                    <img src="/showpro_logo.png" alt="Xchange" className="w-full h-full object-contain" />
                  </div>
                  <DialogPrimitive.Title className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                    <span className="sr-only">{language === 'th' ? 'เมนู ' : 'Menu '}</span>Xchange
                  </DialogPrimitive.Title>
                </div>
                <DialogPrimitive.Close
                  aria-label={language === 'th' ? 'ปิดเมนู' : 'Close menu'}
                  className="w-11 h-11 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors active:scale-90 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </DialogPrimitive.Close>
              </div>

              {/* Student Identity Card */}
              <div className="flex items-center gap-3">
                <Avatar className="w-11 h-11 ring-2 ring-blue-500/20 shrink-0">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback className="bg-blue-600 text-sm font-bold text-white">
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

            {/* ── Navigation ── */}
            <nav className="flex-1 overflow-y-auto overscroll-contain py-2 px-2" aria-label={language === 'th' ? 'เมนูหลัก' : 'Main menu'}>
              <div className="space-y-0.5">
                {navItems.map(renderNavItem)}
              </div>
            </nav>

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
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
