import { useAuth } from '@/contexts/AuthContext';
import StudentDashboard from './dashboards/StudentDashboard';
import LecturerDashboard from './dashboards/LecturerDashboard';
import StaffDashboard from './dashboards/StaffDashboard';
import CompanyDashboard from './dashboards/CompanyDashboard';
import AdminDashboard from './dashboards/AdminDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return null;

  // one dashboard per role at every width — the separate phone dashboard invented its numbers
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
