import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './mobile/MobileHeader';
import { MobileBottomNav } from './mobile/MobileBottomNav';
import { MobileDrawer } from './mobile/MobileDrawer';
import { useAuth } from '@/contexts/AuthContext';

export function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebar_collapsed');
      // Default to collapsed (icon mode, 72px) so content has maximum full-width canvas
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev: boolean) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_collapsed', JSON.stringify(next));
      } catch (e) {
        console.error('Failed to save sidebar state', e);
      }
      return next;
    });
  };

  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="h-[100dvh] overflow-hidden font-sans text-base bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 transition-colors duration-300">
      {/* ========================================================================= */}
      {/* DESKTOP LAYOUT (md: and up) - FIXED 72px OFFSET, OVERLAY EXPANDED SIDEBAR */}
      {/* ========================================================================= */}
      <div className="hidden md:block h-full relative">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
        />
        <Header
          onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
          isSidebarCollapsed={isCollapsed}
        />
        {/* Main Content Area: Fixed pl-[72px] padding-left so content NEVER reflows or shifts */}
        <div className="h-full flex flex-col min-h-0 pl-[72px] w-full transition-none">
          <main className="flex-1 min-h-0 pt-24 sm:pt-28 pb-8 overflow-y-auto overflow-x-hidden w-full">
            <div className="px-4 md:px-6 lg:px-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE LAYOUT (< md) - DEDICATED CLEAN NATIVE MOBILE APP EXPERIENCE      */}
      {/* ========================================================================= */}
      <div className="md:hidden flex flex-col h-full bg-slate-50 dark:bg-[#070d19] text-slate-900 dark:text-slate-100 overflow-hidden">
        {/* Compact Mobile App Bar with Burger Menu */}
        <MobileHeader onMenuToggle={() => setIsMobileDrawerOpen(true)} />

        {/* Scrollable Mobile Content */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pt-16 pb-20 px-3 sm:px-4">
          <Outlet />
        </main>

        {/* Fixed Mobile Bottom Navigation Bar */}
        <MobileBottomNav />

        {/* Mobile Navigation Drawer */}
        <MobileDrawer
          isOpen={isMobileDrawerOpen}
          onClose={() => setIsMobileDrawerOpen(false)}
        />
      </div>
    </div>
  );
}
