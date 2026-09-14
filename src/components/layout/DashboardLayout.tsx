import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebar_collapsed');
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
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
    <div className="h-[100dvh] overflow-hidden font-sans text-[16.5px] bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 transition-colors duration-300">
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
      {/* Content area - fixed position, sidebar collapse does not shift content */}
      <div className={cn(
        "h-full flex flex-col min-h-0 transition-all duration-300 ease-in-out",
        "ml-0 md:ml-60"
      )}>
        <main className="flex-1 min-h-0 pt-28 sm:pt-32 pb-8 overflow-y-auto">
          <div className="px-4 sm:px-6 lg:pl-8 lg:pr-52 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
