import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowLeft, Loader2, Globe, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from 'next-themes';

export default function LoginPage() {
  const { t, language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(formData.email, formData.password);
      toast.success(t.login.loginSuccess, { description: t.login.loginSuccessDesc });
      navigate('/dashboard');
    } catch (error) {
      toast.error(t.login.loginFailed, { description: t.login.loginFailedDesc });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">

      {/* Left panel — brand context, clean */}
      <div className="hidden lg:flex w-5/12 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col justify-between p-12">
        <div>
          <Link to="/" className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-sm mb-12">
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
            {t.login.welcomeTo} ShowPro
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-xs">
            {t.login.systemDescription}
          </p>

          {/* Role list */}
          <div className="mt-10 space-y-3">
            {[
              { role: language === 'th' ? 'นักศึกษา' : 'Student', desc: language === 'th' ? 'จัดการเกรด กิจกรรม พอร์ตโฟลิโอ' : 'Grades, activities, portfolio', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' },
              { role: language === 'th' ? 'อาจารย์' : 'Lecturer', desc: language === 'th' ? 'ตารางสอน เกรด นักศึกษา' : 'Schedule, grading, advisees', color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' },
              { role: language === 'th' ? 'เจ้าหน้าที่' : 'Staff', desc: language === 'th' ? 'บริหารระบบและรายงาน' : 'System management & reports', color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400' },
              { role: language === 'th' ? 'บริษัท' : 'Company', desc: language === 'th' ? 'รับสมัครงาน ติดตามผู้ฝึกงาน' : 'Recruitment & intern tracking', color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' },
            ].map((item) => (
              <div key={item.role} className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${item.color} shrink-0 mt-0.5`}>{item.role}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-400 dark:text-slate-500">
          © {new Date().getFullYear()} ShowPro — DII CAMT, Chiang Mai University
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 relative bg-white dark:bg-slate-950">
        {/* Top right controls */}
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

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 bg-slate-900 dark:bg-white rounded-md flex items-center justify-center">
              <span className="text-[9px] font-bold text-white dark:text-slate-900">SP</span>
            </div>
            <span className="font-bold text-slate-900 dark:text-white">ShowPro</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">{t.login.title}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t.login.enterCredentials}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.login.email}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="pl-9 h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-slate-400 dark:focus:border-slate-500 rounded-md text-sm"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.login.password}</Label>
                <Link to="/forgot-password" className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                  {t.login.forgotPassword}
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9 h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-slate-400 dark:focus:border-slate-500 rounded-md text-sm"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="remember" className="rounded border-slate-300 dark:border-slate-600" />
              <label htmlFor="remember" className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer">{t.login.rememberMe}</label>
            </div>

            <Button
              type="submit"
              className="w-full h-10 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-100 rounded-md font-medium text-sm"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t.login.loginButton}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white dark:bg-slate-950 px-3 text-xs text-slate-400">{t.login.orContinueWith}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-sm font-medium">
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </Button>
            <Button variant="outline" className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-sm font-medium">
              <svg className="w-4 h-4 mr-2" viewBox="0 0 23 23">
                <path fill="#f3f3f3" d="M0 0h23v23H0z" />
                <path fill="#f35325" d="M1 1h10v10H1z" />
                <path fill="#81bc06" d="M12 1h10v10H12z" />
                <path fill="#05a6f0" d="M1 12h10v10H1z" />
                <path fill="#ffba08" d="M12 12h10v10H12z" />
              </svg>
              Microsoft
            </Button>
          </div>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
            {t.login.noAccount}{' '}
            <Link to="/register" className="font-medium text-slate-900 dark:text-white hover:underline">
              {t.login.registerNow}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}