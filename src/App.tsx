import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/components/theme-provider";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
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
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/personal-dashboard" element={<PersonalDashboard />} />
                  <Route path="/courses" element={<Courses />} />
                  <Route path="/schedule" element={<Schedule />} />
                  <Route path="/grades" element={<Grades />} />
                  <Route path="/activities" element={<Activities />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/settings" element={<Settings />} />

                  {/* Student Routes */}
                  <Route path="/portfolio" element={<Portfolio />} />
                  <Route path="/internships" element={<Internships />} />
                  <Route path="/requests" element={<Requests />} />
                  <Route path="/training" element={<Training />} />

                  {/* Lecturer Routes */}
                  <Route path="/students" element={<Students />} />
                  <Route path="/assignments" element={<Assignments />} />
                  <Route path="/appointments" element={<Appointments />} />
                  <Route path="/attendance" element={<Attendance />} />
                  <Route path="/workload" element={<Workload />} />

                  {/* Staff Routes */}
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/audit" element={<Audit />} />
                  <Route path="/budget" element={<Budget />} />
                  <Route path="/network" element={<Network />} />
                  <Route path="/documents" element={<Documents />} />
                  <Route path="/personnel" element={<Personnel />} />
                  <Route path="/workload-tracking" element={<WorkloadTracking />} />
                  <Route path="/schedule-management" element={<ScheduleManagement />} />
                  <Route path="/activities-management" element={<ActivitiesManagement />} />

                  {/* Company Routes */}
                  <Route path="/job-postings" element={<JobPostings />} />
                  <Route path="/skills-requirement" element={<SkillsRequirement />} />
                  <Route path="/applicants" element={<Applicants />} />
                  <Route path="/student-profiles" element={<StudentProfiles />} />
                  <Route path="/subscription" element={<Subscription />} />
                  <Route path="/intern-tracking" element={<InternTracking />} />
                  <Route path="/cooperation" element={<Cooperation />} />
                  <Route path="/talent-search" element={<StudentProfiles />} />
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
