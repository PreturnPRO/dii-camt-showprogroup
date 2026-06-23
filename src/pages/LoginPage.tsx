import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Building2, Globe, Loader2, Lock, Mail, Moon, Smartphone, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LoginPage() {
  const { t, language, toggleLanguage } = useLanguage();
  const { login, companyLogin } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<'standard' | 'company'>('standard');
  const [formData, setFormData] = useState({ identifier: '', password: '' });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      if (loginMode === 'company') {
        await companyLogin(formData.identifier);
        toast.success('เข้าสู่ระบบบริษัทแล้ว', {
          description: 'กรุณากรอกข้อมูลบริษัทและตั้งรหัสผ่านใหม่',
        });
        navigate('/dashboard');
        return;
      }

      await login(formData.identifier, formData.password);
      toast.success(t.login.loginSuccess, { description: t.login.loginSuccessDesc });
      navigate('/dashboard');
    } catch {
      toast.error(t.login.loginFailed, {
        description: loginMode === 'company' ? 'ไม่พบเบอร์มือถือบริษัทในระบบ' : t.login.loginFailedDesc,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
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

          <div className="mt-10 space-y-3">
            {[
              { role: language === 'th' ? 'นักศึกษา' : 'Student', desc: language === 'th' ? 'เกรด กิจกรรม และพอร์ตโฟลิโอ' : 'Grades, activities, portfolio', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' },
              { role: language === 'th' ? 'อาจารย์' : 'Lecturer', desc: language === 'th' ? 'ตารางสอน เกรด และนักศึกษา' : 'Schedule, grading, advisees', color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' },
              { role: language === 'th' ? 'เจ้าหน้าที่' : 'Staff', desc: language === 'th' ? 'บริหารระบบและรายงาน' : 'System management & reports', color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400' },
              { role: language === 'th' ? 'บริษัท' : 'Company', desc: language === 'th' ? 'ดูรายชื่อนักศึกษาและติดตามผู้สมัคร' : 'Student discovery & applicants', color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' },
            ].map((item) => (
              <div key={item.role} className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${item.color} shrink-0 mt-0.5`}>{item.role}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-400 dark:text-slate-500">
          © {new Date().getFullYear()} ShowPro - DII CAMT, Chiang Mai University
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 relative bg-white dark:bg-slate-950">
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
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 bg-slate-900 dark:bg-white rounded-md flex items-center justify-center">
              <span className="text-[9px] font-bold text-white dark:text-slate-900">SP</span>
            </div>
            <span className="font-bold text-slate-900 dark:text-white">ShowPro</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">
              {loginMode === 'company' ? 'เข้าสู่ระบบบริษัท' : t.login.title}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {loginMode === 'company' ? 'กรอกเบอร์มือถือบริษัทเพื่อเข้าสู่ระบบครั้งแรก' : t.login.enterCredentials}
            </p>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setLoginMode('standard')}
              className={`flex h-9 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors ${
                loginMode === 'standard'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Mail className="h-4 w-4" />
              Email
            </button>
            <button
              type="button"
              onClick={() => setLoginMode('company')}
              className={`flex h-9 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors ${
                loginMode === 'company'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Building2 className="h-4 w-4" />
              Company
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="identifier" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {loginMode === 'company' ? 'เบอร์มือถือบริษัท' : t.login.email}
              </Label>
              <div className="relative">
                {loginMode === 'company' ? (
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                ) : (
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                )}
                <Input
                  id="identifier"
                  type={loginMode === 'company' ? 'tel' : 'email'}
                  placeholder={loginMode === 'company' ? '08x-xxx-xxxx' : 'name@example.com'}
                  className="pl-9 h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-slate-400 dark:focus:border-slate-500 rounded-md text-sm"
                  value={formData.identifier}
                  onChange={(event) => setFormData({ ...formData, identifier: event.target.value })}
                  required
                />
              </div>
            </div>

            {loginMode === 'standard' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t.login.password}
                  </Label>
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
                    onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                    required
                  />
                </div>
              </div>
            )}

            {loginMode === 'standard' && (
              <div className="flex items-center gap-2">
                <Checkbox id="remember" className="rounded border-slate-300 dark:border-slate-600" />
                <label htmlFor="remember" className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                  {t.login.rememberMe}
                </label>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-10 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-100 rounded-md font-medium text-sm"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {loginMode === 'company' ? 'เข้าสู่ระบบบริษัท' : t.login.loginButton}
            </Button>
          </form>

          {loginMode === 'standard' && (
            <>
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
                  Google
                </Button>
                <Button variant="outline" className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-sm font-medium">
                  Microsoft
                </Button>
              </div>

              <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
                {t.login.noAccount}{' '}
                <Link to="/register" className="font-medium text-slate-900 dark:text-white hover:underline">
                  {t.login.registerNow}
                </Link>
              </p>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
