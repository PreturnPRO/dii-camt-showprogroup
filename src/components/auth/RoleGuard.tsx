import React, { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';
import { toast } from 'sonner';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

/**
 * Route guard that restricts access based on user role.
 * Redirects unauthenticated users to /login and unauthorized users to /dashboard.
 */
export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const hasToasted = useRef(false);
  const isForbidden = !isLoading && isAuthenticated && !!user && !allowedRoles.includes(user.role);

  useEffect(() => {
    if (isForbidden && !hasToasted.current) {
      hasToasted.current = true;
      toast.error('คุณไม่มีสิทธิ์เข้าถึงหน้านี้', {
        description: 'ระบบได้นำคุณกลับไปยังหน้า Dashboard',
      });
    }
  }, [isForbidden]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (isForbidden) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
