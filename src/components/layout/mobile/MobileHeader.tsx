import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Menu, Globe } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface MobileHeaderProps {
  onMenuToggle?: () => void;
}

export function MobileHeader({ onMenuToggle }: MobileHeaderProps) {
  const { user } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    if (!user) return;
    let mounted = true;
    api.notifications
      .list()
      .then((res) => {
        if (!mounted) return;
        const unread = res.notifications.filter((n: any) => !n.isRead).length;
        setUnreadCount(unread);
      })
      .catch(() => {});

    const onRead = () => setUnreadCount((prev) => Math.max(0, prev - 1));
    const onReadAll = () => setUnreadCount(0);
    window.addEventListener('showpro:notification-read', onRead);
    window.addEventListener('showpro:notification-read-all', onReadAll);

    return () => {
      mounted = false;
      window.removeEventListener('showpro:notification-read', onRead);
      window.removeEventListener('showpro:notification-read-all', onReadAll);
    };
  }, [user]);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  const roleLabels: Record<string, { en: string; th: string }> = {
    student: { en: 'Student', th: 'นักศึกษา' },
    lecturer: { en: 'Lecturer', th: 'อาจารย์' },
    company: { en: 'Company', th: 'สถานประกอบการ' },
  };

  const roleText = user?.role
    ? roleLabels[user.role]?.[language] || (user.role === 'company' ? 'Company' : user.role === 'lecturer' ? 'Lecturer' : 'Student')
    : 'Student';

  return (
    <header className="fixed top-0 left-0 right-0 h-14 z-40 bg-white dark:bg-[#070d19] border-b border-slate-200/80 dark:border-slate-800/80 px-2.5 flex items-center justify-between shadow-xs select-none">
      {/* Left: Burger Button + Logo */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuToggle}
          className="h-9 w-9 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition-transform cursor-pointer shrink-0"
          title="Open Menu"
        >
          <Menu className="w-5 h-5 stroke-[2.2px]" />
        </Button>

        <Link to="/dashboard" className="flex items-center gap-2 active:scale-95 transition-transform">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md p-1 shrink-0">
            <img src="/showpro_logo.png" alt="Xchange" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white leading-none">
                Xchange
              </span>
              <Badge
                variant="outline"
                className="text-[9px] font-bold px-1.5 py-0 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50 leading-tight uppercase"
              >
                {roleText}
              </Badge>
            </div>
            <span className="text-[10px] text-slate-400 truncate max-w-[125px]">
              {user?.name || 'User'}
            </span>
          </div>
        </Link>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Language switch */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLanguage}
          className="h-8 px-2 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95"
          title="Toggle Language"
        >
          <Globe className="w-3.5 h-3.5 mr-1 text-slate-400" />
          {language === 'th' ? 'EN' : 'TH'}
        </Button>

        {/* Notification Bell */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/notifications')}
          className="h-8 w-8 rounded-lg relative text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#070d19] animate-pulse" />
          )}
        </Button>

        {/* Profile Avatar */}
        <button
          onClick={() => navigate('/settings')}
          className="ml-0.5 active:scale-95 transition-transform rounded-full focus:outline-hidden"
          title="Account Settings"
        >
          <Avatar className="w-7 h-7 ring-1 ring-slate-200 dark:ring-slate-700">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback className="bg-blue-600 text-[10px] font-bold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </div>
    </header>
  );
}
