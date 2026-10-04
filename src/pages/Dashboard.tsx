import { useAuth } from '@/contexts/AuthContext';
import StudentDashboard from './dashboards/StudentDashboard';
import LecturerDashboard from './dashboards/LecturerDashboard';
import StaffDashboard from './dashboards/StaffDashboard';
import CompanyDashboard from './dashboards/CompanyDashboard';
import AdminDashboard from './dashboards/AdminDashboard';
import { MobileDashboard } from './dashboards/mobile/MobileDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return null;

  const renderDesktopDashboard = () => {
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
  };

  return (
    <>
      {/* Mobile UI (< 768px): Dedicated Clean & Organized Mobile View */}
      <div className="block md:hidden">
        <MobileDashboard />
      </div>

      {/* Desktop UI (>= 768px): 100% Untouched Desktop View */}
      <div className="hidden md:block">
        {renderDesktopDashboard()}
      </div>
    </>
  );
}
