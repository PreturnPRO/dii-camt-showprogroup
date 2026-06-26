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
import { RoleGuard } from "@/components/layout/RoleGuard";

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
const CourseGradingSettings = lazy(() => import("./pages/CourseGradingSettings"));
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
const StudentQRCheckIn = lazy(() => import("./pages/StudentQRCheckIn"));
const PublicPortfolio = lazy(() => import("./pages/PublicPortfolio"));

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
                <Route path="/portfolio/:id" element={<PublicPortfolio />} />
                <Route element={<DashboardLayout />}>
                  {/* Shared (ทุก role ที่ login แล้ว) */}
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/personal-dashboard" element={<PersonalDashboard />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/settings" element={<Settings />} />

                  {/* Academic (D-04: map ตาม Sidebar) */}
                  <Route path="/courses" element={<RoleGuard allowedRoles={['student', 'lecturer', 'staff', 'admin']}><Courses /></RoleGuard>} />
                  <Route path="/courses/:courseId/grading" element={<RoleGuard allowedRoles={['lecturer', 'admin']}><CourseGradingSettings /></RoleGuard>} />
                  <Route path="/schedule" element={<RoleGuard allowedRoles={['student', 'lecturer', 'admin']}><Schedule /></RoleGuard>} />
                  <Route path="/grades" element={<RoleGuard allowedRoles={['student', 'lecturer', 'admin']}><Grades /></RoleGuard>} />

                  {/* Student Routes */}
                  <Route path="/activities" element={<RoleGuard allowedRoles={['student', 'admin']}><Activities /></RoleGuard>} />
                  <Route path="/portfolio" element={<RoleGuard allowedRoles={['student']}><Portfolio /></RoleGuard>} />
                  <Route path="/internships" element={<RoleGuard allowedRoles={['student']}><Internships /></RoleGuard>} />
                  <Route path="/application-history" element={<RoleGuard allowedRoles={['student']}><ApplicationHistory /></RoleGuard>} />
                  <Route path="/requests" element={<RoleGuard allowedRoles={['student', 'staff', 'admin']}><Requests /></RoleGuard>} />
                  <Route path="/training" element={<RoleGuard allowedRoles={['student']}><Training /></RoleGuard>} />
                  <Route path="/student/checkin" element={<RoleGuard allowedRoles={['student']}><StudentQRCheckIn /></RoleGuard>} />

                  {/* Lecturer Routes */}
                  <Route path="/students" element={<RoleGuard allowedRoles={['lecturer', 'staff', 'admin']}><Students /></RoleGuard>} />
                  <Route path="/assignments" element={<RoleGuard allowedRoles={['lecturer', 'admin']}><Assignments /></RoleGuard>} />
                  <Route path="/appointments" element={<RoleGuard allowedRoles={['lecturer', 'admin']}><Appointments /></RoleGuard>} />
                  <Route path="/attendance" element={<RoleGuard allowedRoles={['lecturer', 'admin']}><Attendance /></RoleGuard>} />
                  <Route path="/workload" element={<RoleGuard allowedRoles={['lecturer', 'admin']}><Workload /></RoleGuard>} />

                  {/* Staff / Admin Routes */}
                  <Route path="/users" element={<RoleGuard allowedRoles={['staff', 'admin']}><UsersPage /></RoleGuard>} />
                  <Route path="/reports" element={<RoleGuard allowedRoles={['staff', 'admin']}><Reports /></RoleGuard>} />
                  <Route path="/notifications" element={<RoleGuard allowedRoles={['staff', 'admin']}><Notifications /></RoleGuard>} />
                  <Route path="/automation" element={<RoleGuard allowedRoles={['staff', 'admin']}><Automation /></RoleGuard>} />
                  <Route path="/audit" element={<RoleGuard allowedRoles={['staff', 'admin']}><Audit /></RoleGuard>} />
                  <Route path="/budget" element={<RoleGuard allowedRoles={['staff', 'admin']}><Budget /></RoleGuard>} />
                  <Route path="/network" element={<RoleGuard allowedRoles={['staff', 'admin']}><Network /></RoleGuard>} />
                  <Route path="/documents" element={<RoleGuard allowedRoles={['staff', 'admin']}><Documents /></RoleGuard>} />
                  <Route path="/personnel" element={<RoleGuard allowedRoles={['staff', 'admin']}><Personnel /></RoleGuard>} />
                  <Route path="/workload-tracking" element={<RoleGuard allowedRoles={['staff', 'admin']}><WorkloadTracking /></RoleGuard>} />
                  <Route path="/schedule-management" element={<RoleGuard allowedRoles={['staff', 'admin']}><ScheduleManagement /></RoleGuard>} />
                  <Route path="/activities-management" element={<RoleGuard allowedRoles={['staff', 'admin']}><ActivitiesManagement /></RoleGuard>} />

                  {/* Company / Admin Routes */}
                  <Route path="/job-postings" element={<RoleGuard allowedRoles={['company', 'admin']}><JobPostings /></RoleGuard>} />
                  <Route path="/skills-requirement" element={<RoleGuard allowedRoles={['company', 'admin']}><SkillsRequirement /></RoleGuard>} />
                  <Route path="/applicants" element={<RoleGuard allowedRoles={['company', 'admin']}><Applicants /></RoleGuard>} />
                  <Route path="/student-profiles" element={<RoleGuard allowedRoles={['company', 'admin']}><StudentProfiles /></RoleGuard>} />
                  <Route path="/subscription" element={<RoleGuard allowedRoles={['company', 'admin']}><Subscription /></RoleGuard>} />
                  <Route path="/intern-tracking" element={<RoleGuard allowedRoles={['company', 'admin']}><InternTracking /></RoleGuard>} />
                  <Route path="/cooperation" element={<RoleGuard allowedRoles={['company', 'staff', 'admin']}><Cooperation /></RoleGuard>} />
                  <Route path="/talent-search" element={<RoleGuard allowedRoles={['company', 'admin']}><StudentProfiles /></RoleGuard>} />
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
