import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ChevronUp,
  User,
  Users,
} from 'lucide-react';
import { getNavItems, isNavActive } from './nav-items';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';


interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ isOpen, onClose, isCollapsed = false, onToggleCollapse = () => {} }: SidebarProps) {
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
        if (!isCollapsed && onToggleCollapse) onToggleCollapse();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCollapsed, isOpen, onToggleCollapse, onClose]);

  if (!user) return null;

  const navItems = getNavItems(user.role, t.nav as unknown as Record<string, string>);

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
            transition={{ duration: 0.2 }}
            onClick={() => {
              if (!isCollapsed && onToggleCollapse) onToggleCollapse();
              if (isOpen) onClose();
            }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
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
        {/* Sidebar Header: Logo + Collapse/Expand Toggle Button */}
        <div className={cn(
          "h-16 flex items-center shrink-0 border-b border-slate-800/80 transition-all duration-200",
          isCollapsed ? "justify-center px-0" : "justify-between px-5"
        )}>
          {/* Logo / Brand Mark */}
          <Link
            to="/dashboard"
            onClick={onClose}
            className="flex items-center gap-3.5 group min-w-0"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-sky-400 flex items-center justify-center text-white font-bold text-lg shadow-lg shrink-0 group-hover:scale-105 transition-transform duration-200">
              D
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent truncate">
                  DII CAMT
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400 truncate">
                  ShowPro Portal
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Toggle Button: Icon stays at right edge when expanded, or hovers nicely */}
          {!isCollapsed && (
            <button
              onClick={onToggleCollapse}
              title="Collapse sidebar (Ctrl+[)"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all duration-150 shrink-0"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* When collapsed: Floating Expand Button just beneath header */}
        {isCollapsed && (
          <div className="hidden md:flex justify-center py-2 border-b border-slate-800/60">
            <button
              onClick={onToggleCollapse}
              title="Expand sidebar (Ctrl+])"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-150"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2.5 custom-scrollbar">
          <TooltipProvider delayDuration={100}>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = isNavActive(location.pathname, item.href);

                const linkContent = (
                  <Link
                    key={item.href}
                    to={item.href}
                    // the collapsed rail shows only an icon, so the link carries its own name (UX-M5)
                    aria-label={isCollapsed ? item.label : undefined}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => {
                      if (isOpen) onClose();
                      if (!isCollapsed && onToggleCollapse) onToggleCollapse();
                    }}
                    className={cn(
                      "relative flex items-center rounded-xl transition-all duration-150 group font-medium",
                      isCollapsed
                        ? "justify-center h-11 w-11 mx-auto"
                        : "px-3.5 py-2.5 w-full",
                      isActive
                        ? "bg-blue-600/15 text-blue-400 font-semibold"
                        : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeNavIndicator"
                        className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-blue-500"
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
                  data-testid="user-menu"
                  aria-label={user.name}
                  className="w-full flex items-center gap-3 rounded-xl p-2 hover:bg-slate-800/60 transition-colors duration-150 cursor-pointer"
                >
                  <Avatar className="h-10 w-10 shrink-0 border-2 border-slate-700/80 shadow-md">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="bg-blue-600 text-white text-sm font-bold">
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
                      <AvatarFallback className="bg-blue-600 text-white font-bold text-base">{user.name.charAt(0)}</AvatarFallback>
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
