import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

/**
 * Frontend route guard that checks the current user's role against a list of
 * allowed roles.  When the role does not match, the user is redirected to
 * `/dashboard` and a toast notification is shown.
 *
 * Usage:
 *   <RoleGuard allowedRoles={['staff', 'admin']}>
 *     <UsersPage />
 *   </RoleGuard>
 */
export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user } = useAuth();
  const hasToasted = useRef(false);

  const isAllowed = user && allowedRoles.includes(user.role);

  useEffect(() => {
    if (user && !isAllowed && !hasToasted.current) {
      hasToasted.current = true;
      toast.error('คุณไม่มีสิทธิ์เข้าถึงหน้านี้', {
        description: 'ระบบได้นำคุณกลับไปยังหน้า Dashboard',
      });
    }
  }, [user, isAllowed]);

  if (!isAllowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
