import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Menu,
  X,
  Users,
  LogOut,
  Settings,
  ChevronDown,
  User,
  Globe,
  Search,
  Sparkles,
  Moon,
  Sun
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { asArray, asBoolean, asDate, asRecord, asString } from '@/lib/live-data';
import type { Notification, UserRole } from '@/types';

type NotificationRow = Notification;

const mapNotification = (value: unknown, index: number): NotificationRow => {
  const source = asRecord(value);
  return {
    id: asString(source.id, `notification-${index}`),
    recipientId: asString(source.userId, asString(source.recipientId)),
    recipientRole: asString(source.recipientRole, 'student') as NotificationRow['recipientRole'],
    title: asString(source.title, '-'),
    titleThai: asString(source.titleThai, asString(source.title, '-')),
    message: asString(source.message, '-'),
    messageThai: asString(source.messageThai, asString(source.message, '-')),
    type: asString(source.type, 'info') as NotificationRow['type'],
    priority: asString(source.priority, 'medium') as NotificationRow['priority'],
    channels: (asArray(source.channels).length ? asArray(source.channels) : ['in-app']) as NotificationRow['channels'],
    isRead: asBoolean(source.isRead, false),
    readAt: source.readAt ? asDate(source.readAt) : undefined,
    actionUrl: asString(source.actionUrl),
    actionLabel: asString(source.actionLabel),
    createdAt: asDate(source.createdAt),
    expiresAt: source.expiresAt ? asDate(source.expiresAt) : undefined,
  };
};

interface HeaderProps {
  onMenuToggle?: () => void;
  isSidebarOpen?: boolean;
  isSidebarCollapsed?: boolean;
}

export function Header({ onMenuToggle, isSidebarOpen, isSidebarCollapsed }: HeaderProps) {
  const { user, logout, switchRole } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const demoAccountsEnabled = import.meta.env.VITE_ENABLE_DEMO_ACCOUNTS === 'true';
  const [showNotifications, setShowNotifications] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);

  useEffect(() => {
    const handleScroll = (e?: Event) => {
      const target = e?.target as HTMLElement | Document | null;
      const scrollY = (target && target instanceof HTMLElement) 
        ? target.scrollTop 
        : (window.scrollY || document.documentElement.scrollTop || 0);
      setScrolled(scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    api.notifications
      .list()
      .then((response) => {
        if (!mounted) return;
        setNotifications(response.notifications.map(mapNotification));
      })
      .catch((error) => {
        console.warn('Unable to load notifications from API', error);
      });

    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    const onRead = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string; readAt?: Date }>).detail;
      if (!detail?.id) return;
      setNotifications(current => current.map(item => item.id === detail.id ? { ...item, isRead: true, readAt: detail.readAt ?? new Date() } : item));
    };
    const onReadAll = (event: Event) => {
      const detail = (event as CustomEvent<{ readAt?: Date }>).detail;
      const readAt = detail?.readAt ?? new Date();
      setNotifications(current => current.map(item => ({ ...item, isRead: true, readAt })));
    };

    window.addEventListener('showpro:notification-read', onRead);
    window.addEventListener('showpro:notification-read-all', onReadAll);
    return () => {
      window.removeEventListener('showpro:notification-read', onRead);
      window.removeEventListener('showpro:notification-read-all', onReadAll);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleNotificationClick = (notification: NotificationRow) => {
    if (!notification.isRead) {
      setNotifications(current => current.map(item => item.id === notification.id ? { ...item, isRead: true, readAt: new Date() } : item));
      api.notifications.markRead(notification.id).catch((error) => {
        console.warn('Unable to mark notification as read', error);
      });
      window.dispatchEvent(new CustomEvent('showpro:notification-read', { detail: { id: notification.id, readAt: new Date() } }));
    }
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      setShowNotifications(false);
    }
  };

  const handleMarkAllNotifications = () => {
    const readAt = new Date();
    setNotifications(current => current.map(item => ({ ...item, isRead: true, readAt })));
    api.notifications.markAllRead().catch((error) => {
      console.warn('Unable to mark all notifications as read', error);
    });
    window.dispatchEvent(new CustomEvent('showpro:notification-read-all', { detail: { readAt } }));
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('dashboard')) return t.header?.dashboard || 'Dashboard';
    if (path.includes('profile')) return t.header?.profile || 'Profile';
    if (path.includes('settings')) return t.header?.systemSettings || 'Settings';
    return t.header?.dashboard || 'Workspace';
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-40 pointer-events-none transition-all duration-300 ease-out px-4 sm:px-6 pt-4 sm:pt-6 ${scrolled ? 'pt-2 sm:pt-4' : ''}`}>
      <div className={`pointer-events-auto mx-auto max-w-6xl flex items-center justify-between transition-all duration-500 ${
        scrolled
          ? 'h-16 px-6 bg-white/85 dark:bg-slate-800/85 backdrop-blur-3xl border border-slate-200/60 dark:border-slate-700/60 shadow-[0_10px_40px_rgba(15,23,42,0.08)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)] rounded-full'
          : 'h-20 px-4 bg-transparent border-transparent shadow-none'
      }`}>

        {/* Left: Mobile menu + Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-700 h-9 w-9 rounded-full"
            onClick={onMenuToggle}
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-400 dark:to-blue-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-600/20 dark:shadow-blue-400/20 group-hover:rotate-6 group-hover:scale-105 transition-all duration-300">
              <img src="/showpro_logo.png" alt="ShowPro" className="w-7 h-7 object-contain" />
            </div>
            <div className={`flex flex-col transition-all duration-300 ${scrolled ? 'scale-90 origin-left' : ''}`}>
              <div className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-slate-50 leading-none">ShowPro</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-[0.1em] uppercase mt-0.5">{user?.role ? user.role.toUpperCase() : 'PROFESSIONALISM'}</div>
            </div>
          </Link>
        </div>

        {/* Center: Search Bar Pill */}
        <div className="hidden lg:flex flex-1 max-w-md mx-6">
          <div className="w-full flex items-center gap-2.5 px-4 h-10 rounded-full border border-slate-200/60 dark:border-slate-700/60 bg-slate-100/60 dark:bg-slate-900/60 backdrop-blur-sm transition-all duration-200 focus-within:border-blue-500 dark:focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/10 shadow-inner">
            <Search className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder={t.header?.search || "ค้นหาในระบบ..."}
              className="bg-transparent border-none outline-none w-full text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-500/60 dark:placeholder:text-slate-400/60 font-medium"
            />
            <div className="flex items-center gap-0.5 shrink-0">
              <kbd className="hidden sm:inline-flex items-center justify-center h-5 px-1.5 rounded-md border border-slate-200/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/60 text-[10px] font-semibold text-slate-500 dark:text-slate-400">⌘K</kbd>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Language Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="hidden sm:flex h-10 px-4 rounded-full bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-600/50 shadow-sm font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all gap-2"
          >
            <Globe className="h-4 w-4" />
            <span className="text-xs">{language === 'th' ? 'EN' : 'TH'}</span>
          </Button>

          {/* Notifications */}
          <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-600/50 shadow-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 dark:bg-blue-400 text-[8px] font-bold text-white dark:text-slate-900 shadow-sm">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[360px] p-0 rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-800 overflow-hidden mt-2">
              <div className="px-5 py-4 border-b border-slate-200/50 dark:border-slate-700/50">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 dark:text-slate-50 text-sm tracking-tight">{t.header?.notifications || 'Notifications'}</h3>
                  <Badge variant="secondary" className="bg-blue-600/10 text-blue-600 dark:bg-blue-400/20 dark:text-blue-400 border-none text-xs font-bold">{unreadCount} {language === 'th' ? 'ใหม่' : 'New'}</Badge>
                </div>
                {unreadCount > 0 && (
                  <button type="button" onClick={handleMarkAllNotifications} className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                    {language === 'th' ? 'ทำเครื่องหมายว่าอ่านทั้งหมด' : 'Mark all as read'}
                  </button>
                )}
              </div>
              <div className="max-h-[300px] overflow-y-auto p-2">
                {notifications.map((notification) => (
                  <DropdownMenuItem key={notification.id} onClick={() => handleNotificationClick(notification)} className="flex flex-col items-start p-3 cursor-pointer rounded-xl focus:bg-slate-100 dark:focus:bg-slate-700 mb-0.5 transition-colors">
                    <div className="flex items-start gap-2.5 w-full">
                      <div className={`mt-1.5 shrink-0 w-2 h-2 rounded-full ${notification.isRead ? 'bg-slate-300 dark:bg-slate-600' : 'bg-blue-600 dark:bg-blue-400'}`} />
                      <div className="flex-1 space-y-0.5 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-semibold text-sm leading-tight truncate ${notification.isRead ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-slate-50'}`}>{language === 'th' ? notification.titleThai : notification.title}</span>
                          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 shrink-0">{notification.createdAt.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US')}</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">{language === 'th' ? notification.messageThai : notification.message}</p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
                {notifications.length === 0 && (
                  <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                    {language === 'th' ? 'ยังไม่มีแจ้งเตือน' : 'No notifications yet'}
                  </div>
                )}
              </div>
              <div className="p-2 border-t border-slate-200/50 dark:border-slate-700/50">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowNotifications(false);
                    navigate('/notifications');
                  }}
                  className="w-full text-blue-600 dark:text-blue-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl h-10 text-sm"
                >
                  {t.common?.viewAll || 'View All'}
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-10 w-10 rounded-full bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-600/50 shadow-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

        </div>
      </div>
    </header>
  );
}
