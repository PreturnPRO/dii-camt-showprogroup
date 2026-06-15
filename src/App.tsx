import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/components/theme-provider";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlobalPreloader } from "@/components/common/GlobalPreloader";

const queryClient = new QueryClient();

const LandingPage = lazy(() => import("./pages/LandingPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Courses = lazy(() => import("./pages/Courses"));
const Schedule = lazy(() => import("./pages/Schedule"));
const Grades = lazy(() => import("./pages/Grades"));
const Activities = lazy(() => import("./pages/Activities"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const Internships = lazy(() => import("./pages/Internships"));
const ApplicationHistory = lazy(() => import("./pages/ApplicationHistory"));
const Requests = lazy(() => import("./pages/Requests"));
const Messages = lazy(() => import("./pages/Messages"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Students = lazy(() => import("./pages/Students"));
const Assignments = lazy(() => import("./pages/Assignments"));
const Appointments = lazy(() => import("./pages/Appointments"));
const Attendance = lazy(() => import("./pages/Attendance"));
const Workload = lazy(() => import("./pages/Workload"));
const UsersPage = lazy(() => import("./pages/Users"));
const Reports = lazy(() => import("./pages/Reports"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Audit = lazy(() => import("./pages/Audit"));
const Budget = lazy(() => import("./pages/Budget"));
const Network = lazy(() => import("./pages/Network"));
const Documents = lazy(() => import("./pages/Documents"));
const Personnel = lazy(() => import("./pages/Personnel"));
const WorkloadTracking = lazy(() => import("./pages/WorkloadTracking"));
const ScheduleManagement = lazy(() => import("./pages/ScheduleManagement"));
const ActivitiesManagement = lazy(() => import("./pages/ActivitiesManagement"));
const JobPostings = lazy(() => import("./pages/JobPostings"));
const Applicants = lazy(() => import("./pages/Applicants"));
const StudentProfiles = lazy(() => import("./pages/StudentProfiles"));
const Cooperation = lazy(() => import("./pages/Cooperation"));
const Subscription = lazy(() => import("./pages/Subscription"));
const InternTracking = lazy(() => import("./pages/InternTracking"));
const PersonalDashboard = lazy(() => import("./pages/PersonalDashboard"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Training = lazy(() => import("./pages/Training"));
const SkillsRequirement = lazy(() => import("./pages/SkillsRequirement"));
const Automation = lazy(() => import("./pages/Automation"));

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <SocketProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <GlobalPreloader />
              <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ForgotPasswordPage />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
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
                  <Route path="/application-history" element={<ApplicationHistory />} />
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
                  <Route path="/automation" element={<Automation />} />
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
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
          </SocketProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
