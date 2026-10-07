import { useAuth } from '@/contexts/AuthContext';
import { StudentGradesView } from './grades/StudentGradesView';
import { LecturerGradingView } from './grades/LecturerGradingView';
import { StaffGradesOverview } from './grades/StaffGradesOverview';

export default function Grades() {
  const { user } = useAuth();

  if (user?.role === 'lecturer') return <LecturerGradingView />;
  if (user?.role === 'staff' || user?.role === 'admin') return <StaffGradesOverview />;
  return <StudentGradesView />;
}
