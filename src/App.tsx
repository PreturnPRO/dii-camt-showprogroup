import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/components/theme-provider";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RoleGuard } from "@/components/layout/RoleGuard";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import Schedule from "./pages/Schedule";
import Grades from "./pages/Grades";
import Activities from "./pages/Activities";
import Portfolio from "./pages/Portfolio";
import Internships from "./pages/Internships";
import Requests from "./pages/Requests";
import Messages from "./pages/Messages";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import PublicPortfolio from "./pages/PublicPortfolio";
// New pages
import Students from "./pages/Students";
import Assignments from "./pages/Assignments";
import Appointments from "./pages/Appointments";
import Attendance from "./pages/Attendance";
import Workload from "./pages/Workload";
import UsersPage from "./pages/Users";
import Reports from "./pages/Reports";
import Notifications from "./pages/Notifications";
import Audit from "./pages/Audit";
import Budget from "./pages/Budget";
import Network from "./pages/Network";
import Documents from "./pages/Documents";
import Personnel from "./pages/Personnel";
import WorkloadTracking from "./pages/WorkloadTracking";
import ScheduleManagement from "./pages/ScheduleManagement";
import ActivitiesManagement from "./pages/ActivitiesManagement";
import JobPostings from "./pages/JobPostings";
import Applicants from "./pages/Applicants";
import StudentProfiles from "./pages/StudentProfiles";
import Cooperation from "./pages/Cooperation";
import Subscription from "./pages/Subscription";
import InternTracking from "./pages/InternTracking";
import PersonalDashboard from "./pages/PersonalDashboard";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Training from "./pages/Training";
import SkillsRequirement from "./pages/SkillsRequirement";
import { GlobalPreloader } from "@/components/common/GlobalPreloader";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <GlobalPreloader />
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ForgotPasswordPage />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/portfolio/:id" element={<PublicPortfolio />} />
                <Route element={<DashboardLayout />}>
                  {/* Common – ทุก role เข้าได้ */}
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/personal-dashboard" element={<PersonalDashboard />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/settings" element={<Settings />} />

                  {/* Student Routes */}
                  <Route path="/grades" element={<RoleGuard allowedRoles={['student', 'lecturer']}><Grades /></RoleGuard>} />
                  <Route path="/activities" element={<RoleGuard allowedRoles={['student']}><Activities /></RoleGuard>} />
                  <Route path="/portfolio" element={<RoleGuard allowedRoles={['student']}><Portfolio /></RoleGuard>} />
                  <Route path="/internships" element={<RoleGuard allowedRoles={['student']}><Internships /></RoleGuard>} />
                  <Route path="/requests" element={<RoleGuard allowedRoles={['student']}><Requests /></RoleGuard>} />
                  <Route path="/training" element={<RoleGuard allowedRoles={['student']}><Training /></RoleGuard>} />

                  {/* Lecturer Routes */}
                  <Route path="/schedule" element={<RoleGuard allowedRoles={['lecturer']}><Schedule /></RoleGuard>} />
                  <Route path="/students" element={<RoleGuard allowedRoles={['lecturer']}><Students /></RoleGuard>} />
                  <Route path="/courses" element={<RoleGuard allowedRoles={['lecturer', 'admin']}><Courses /></RoleGuard>} />
                  <Route path="/assignments" element={<RoleGuard allowedRoles={['lecturer']}><Assignments /></RoleGuard>} />
                  <Route path="/appointments" element={<RoleGuard allowedRoles={['lecturer']}><Appointments /></RoleGuard>} />
                  <Route path="/attendance" element={<RoleGuard allowedRoles={['lecturer']}><Attendance /></RoleGuard>} />
                  <Route path="/workload" element={<RoleGuard allowedRoles={['lecturer']}><Workload /></RoleGuard>} />

                  {/* Staff Routes (staff + admin) */}
                  <Route path="/users" element={<RoleGuard allowedRoles={['staff', 'admin']}><UsersPage /></RoleGuard>} />
                  <Route path="/reports" element={<RoleGuard allowedRoles={['staff', 'admin']}><Reports /></RoleGuard>} />
                  <Route path="/notifications" element={<RoleGuard allowedRoles={['staff', 'admin']}><Notifications /></RoleGuard>} />
                  <Route path="/audit" element={<RoleGuard allowedRoles={['staff', 'admin']}><Audit /></RoleGuard>} />
                  <Route path="/budget" element={<RoleGuard allowedRoles={['staff', 'admin']}><Budget /></RoleGuard>} />
                  <Route path="/network" element={<RoleGuard allowedRoles={['staff', 'admin']}><Network /></RoleGuard>} />
                  <Route path="/documents" element={<RoleGuard allowedRoles={['staff', 'admin']}><Documents /></RoleGuard>} />
                  <Route path="/personnel" element={<RoleGuard allowedRoles={['staff', 'admin']}><Personnel /></RoleGuard>} />
                  <Route path="/workload-tracking" element={<RoleGuard allowedRoles={['staff']}><WorkloadTracking /></RoleGuard>} />
                  <Route path="/schedule-management" element={<RoleGuard allowedRoles={['staff', 'admin']}><ScheduleManagement /></RoleGuard>} />
                  <Route path="/activities-management" element={<RoleGuard allowedRoles={['staff', 'admin']}><ActivitiesManagement /></RoleGuard>} />

                  {/* Company Routes */}
                  <Route path="/job-postings" element={<RoleGuard allowedRoles={['company', 'admin']}><JobPostings /></RoleGuard>} />
                  <Route path="/skills-requirement" element={<RoleGuard allowedRoles={['company']}><SkillsRequirement /></RoleGuard>} />
                  <Route path="/applicants" element={<RoleGuard allowedRoles={['company']}><Applicants /></RoleGuard>} />
                  <Route path="/student-profiles" element={<RoleGuard allowedRoles={['company', 'admin']}><StudentProfiles /></RoleGuard>} />
                  <Route path="/subscription" element={<RoleGuard allowedRoles={['company']}><Subscription /></RoleGuard>} />
                  <Route path="/intern-tracking" element={<RoleGuard allowedRoles={['company']}><InternTracking /></RoleGuard>} />
                  <Route path="/cooperation" element={<RoleGuard allowedRoles={['company', 'admin']}><Cooperation /></RoleGuard>} />
                  <Route path="/talent-search" element={<RoleGuard allowedRoles={['company', 'admin']}><StudentProfiles /></RoleGuard>} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
