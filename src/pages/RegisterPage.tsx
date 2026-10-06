import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, ArrowLeft, User, Mail, Lock, CheckCircle, Loader2, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { ApiError } from '@/lib/api';
import { useTheme } from 'next-themes';

export default function RegisterPage() {
  const { t, language, toggleLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { login, register } = useAuth();
  // Public sign-up is for students only; lecturer, staff and company accounts are created by staff/admin.
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const buildProfile = () => {
    const timestamp = Date.now().toString().slice(-6);
    return {
      studentId: `STU${timestamp}`,
      major: 'Digital Industry Integration',
      program: 'bachelor',
      year: 1,
      semester: 1,
      academicYear: '2569',
      allowDataSharing: false,
      allowPortfolioSharing: false,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error(t.register.passwordMismatch);
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        nameThai: formData.name,
        role: 'student',
        profile: buildProfile(),
      });
      toast.success(t.register.registerSuccess);
      navigate('/dashboard');
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        try {
          await login(formData.email, formData.password);
          toast.success(t.login.loginSuccess);
          navigate('/dashboard');
          return;
        } catch {
          toast.error('อีเมลนี้สมัครไว้แล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านเดิม หรือใช้เมนูลืมรหัสผ่าน');
          return;
        }
      }
      toast.error(error instanceof Error ? error.message : t.register.pleaseLogin);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">

      {/* Left panel */}
      <div className="hidden lg:flex w-5/12 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col justify-between p-12">
        <div>
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-12">
            <ArrowLeft className="w-4 h-4" />
            {language === 'th' ? 'กลับหน้าแรก' : 'Back to home'}
          </Link>

          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-8 h-8 bg-slate-900 dark:bg-white rounded-lg flex items-center justify-center">
              <span className="text-[10px] font-bold text-white dark:text-slate-900">SP</span>
            </div>
            <span className="font-bold text-lg text-slate-900 dark:text-white">ShowPro</span>
          </div>

          <h1 className="text-3xl font-bold text-slate-900 dark:text-white leading-tight mb-3 tracking-tight">
            {t.register.startJourney}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-10 max-w-xs">
            {t.register.journeyDesc}
          </p>

          <div className="space-y-3">
            {[t.register.feature1, t.register.feature2, t.register.feature3].map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-400 dark:text-slate-500">
          © {new Date().getFullYear()} ShowPro — DII CAMT, Chiang Mai University
        </p>
      </div>

      {/* Right panel: form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white dark:bg-slate-950 relative">
        {/* top right controls */}
        <div className="absolute top-6 right-6 flex items-center gap-2">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="toggle dark mode"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={toggleLanguage}
            className="h-8 px-3 flex items-center gap-1.5 rounded-md text-sm text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium"
          >
            <Globe className="h-3.5 w-3.5" />
            {language === 'th' ? 'EN' : 'TH'}
          </button>
        </div>

        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 bg-slate-900 dark:bg-white rounded-md flex items-center justify-center">
              <span className="text-[9px] font-bold text-white dark:text-slate-900">SP</span>
            </div>
            <span className="font-bold text-slate-900 dark:text-white">ShowPro</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
                key="step2"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-7">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">{t.register.personalInfo}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t.register.registerAs}{' '}
                    <span className="font-medium text-slate-900 dark:text-white">
                      {t.roles.student}
                    </span>
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.register.fullNameOrCompany}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        className="pl-9 h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-md text-sm"
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.register.email}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        type="email"
                        className="pl-9 h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-md text-sm"
                        required
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>


                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.register.password}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        type="password"
                        className="pl-9 h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-md text-sm"
                        required
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.register.confirmPassword}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        type="password"
                        className="pl-9 h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-md text-sm"
                        required
                        value={formData.confirmPassword}
                        onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-10 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-100 rounded-md font-medium text-sm mt-2"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    {t.register.registerButton}
                  </Button>
                </form>
              </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}