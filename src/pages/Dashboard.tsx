import { useAuth } from '@/contexts/AuthContext';
import { useMediaQuery } from '@/hooks/use-media-query';
import StudentDashboard from './dashboards/StudentDashboard';
import LecturerDashboard from './dashboards/LecturerDashboard';
import StaffDashboard from './dashboards/StaffDashboard';
import CompanyDashboard from './dashboards/CompanyDashboard';
import AdminDashboard from './dashboards/AdminDashboard';
import { MobileDashboard } from './dashboards/mobile/MobileDashboard';

export default function Dashboard() {
  const { user } = useAuth();
  const isMobile = useMediaQuery('(max-width: 767px)');

  if (!user) return null;

  // Render dedicated mobile view on mobile screens (< 768px)
  if (isMobile) {
    return <MobileDashboard />;
  }

  // Render role-specific desktop view on desktop/tablet screens (>= 768px)
  switch (user.role) {
    case 'student':
      return <StudentDashboard />;
    case 'lecturer':
      return <LecturerDashboard />;
    case 'staff':
      return <StaffDashboard />;
    case 'company':
      return <CompanyDashboard />;
    case 'admin':
      return <AdminDashboard />;
    default:
      return <StudentDashboard />;
  }
}
