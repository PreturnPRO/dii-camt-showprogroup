import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
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
} from 'lucide-react';
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
}

export function Header({ onMenuToggle, isSidebarOpen }: HeaderProps) {
  const { user, logout, switchRole } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const demoAccountsEnabled = import.meta.env.VITE_ENABLE_DEMO_ACCOUNTS === 'true';
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);

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
    <header className="sticky top-0 z-40 w-full bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
      <div className="mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">

        {/* Left: mobile toggle + page title */}
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden w-8 h-8 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={onMenuToggle}
          >
            {isSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>

          <div className="hidden md:block">
            <h1 className="text-sm font-semibold text-slate-900 dark:text-white">{getPageTitle()}</h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">{user?.role || 'Guest'}</p>
          </div>
        </div>

        {/* Center: search */}
        <div className="hidden lg:flex flex-1 max-w-sm mx-auto">
          <div className="w-full flex items-center gap-2 px-3 h-9 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder={language === 'th' ? 'ค้นหา...' : 'Search...'}
              className="bg-transparent border-none outline-none w-full text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
            />
            <div className="flex items-center gap-0.5 shrink-0">
              <kbd className="hidden sm:inline-flex items-center justify-center h-4 px-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-[10px] text-slate-400 font-mono">⌘K</kbd>
            </div>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5 shrink-0">

          {/* Language toggle */}
          <button
            onClick={toggleLanguage}
            className="h-8 px-2.5 flex items-center gap-1.5 rounded-md text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Globe className="h-3.5 w-3.5" />
            {language === 'th' ? 'EN' : 'TH'}
          </button>

          {/* Notifications */}
          <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative w-8 h-8 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 border border-white dark:border-slate-950" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0 rounded-xl shadow-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mt-1 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t.header?.notifications || 'Notifications'}</h3>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllNotifications}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    {language === 'th' ? 'อ่านทั้งหมด' : 'Mark all read'}
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left border-b border-slate-50 dark:border-slate-800 last:border-0"
                  >
                    <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${notification.isRead ? 'bg-slate-200 dark:bg-slate-700' : 'bg-blue-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${notification.isRead ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                        {language === 'th' ? notification.titleThai : notification.title}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-1">
                        {language === 'th' ? notification.messageThai : notification.message}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 mt-1">
                      {notification.createdAt.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US')}
                    </span>
                  </button>
                ))}
                {notifications.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-slate-400">
                    {language === 'th' ? 'ยังไม่มีแจ้งเตือน' : 'No notifications yet'}
                  </div>
                )}
              </div>
              <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => { setShowNotifications(false); navigate('/notifications'); }}
                  className="w-full text-center text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline py-1"
                >
                  {t.common?.viewAll || 'View all'}
                </button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 pl-1.5 pr-2 h-8 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="bg-slate-700 text-white text-[10px] font-bold">
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:block text-sm font-medium text-slate-700 dark:text-slate-300 max-w-[100px] truncate">{user.name}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg p-1 mt-1">
                <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 mb-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user.name}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{user.email}</p>
                </div>

                <DropdownMenuItem className="rounded-lg cursor-pointer text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => navigate('/personal-dashboard')}>
                  <User className="h-4 w-4 mr-2 text-slate-400" />
                  {t.header?.profile || 'Profile'}
                </DropdownMenuItem>

                <DropdownMenuItem className="rounded-lg cursor-pointer text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => navigate('/settings')}>
                  <Settings className="h-4 w-4 mr-2 text-slate-400" />
                  {t.header?.systemSettings || 'Settings'}
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1 bg-slate-100 dark:bg-slate-800" />

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="rounded-lg cursor-pointer text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <Users className="h-4 w-4 mr-2 text-slate-400" />
                    {t.header?.switchRole || 'Switch role'}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg p-1">
                      {(
                        [
                          { label: 'Student', value: 'student' },
                          { label: 'Lecturer', value: 'lecturer' },
                          { label: 'Staff', value: 'staff' },
                          { label: 'Company', value: 'company' },
                          { label: 'Admin', value: 'admin' },
                        ] as const
                      ).map(({ label, value }) => (
                        <DropdownMenuItem
                          key={value}
                          onClick={() => switchRole(value)}
                          className="rounded-lg cursor-pointer text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          {label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>

                <DropdownMenuSeparator className="my-1 bg-slate-100 dark:bg-slate-800" />

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="rounded-lg cursor-pointer text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {t.header?.logout || 'Log out'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}