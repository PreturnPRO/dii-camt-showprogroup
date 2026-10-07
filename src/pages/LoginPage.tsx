import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { loginRedirectTarget } from '@/lib/safe-url';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, ArrowLeft, Loader2, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LoginPage() {
  const { t, language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  const { login } = useAuth();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [remember, setRemember] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(formData.email, formData.password, undefined, remember);
      toast.success(t.login.loginSuccess, { description: t.login.loginSuccessDesc });
      navigate(loginRedirectTarget(location.state), { replace: true });
    } catch (error) {
      toast.error(t.login.loginFailed, { description: t.login.loginFailedDesc });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans bg-white dark:bg-slate-900 selection:bg-blue-100 selection:text-blue-900 overflow-hidden dark:text-slate-200">
      {/* Left Side - Visual Form Premium Dark matching Register */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop"
            alt="Background"
            className="w-full h-full object-cover opacity-20 mix-blend-overlay"
          />
          <div className="bg-slate-950/70 absolute inset-0" />
          {/* Animated particles */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-20"></div>
        </div>

        <div className="relative z-10 w-full max-w-lg mx-auto">
          <Link to="/" className="inline-block p-3 bg-white/10 rounded-2xl mb-8 border border-white/10 hover:bg-white/25 transition-colors dark:bg-slate-900">
            <ArrowLeft className="w-6 h-6 text-white" />
          </Link>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-bold mb-6 text-white leading-tight"
          >
            {t.login.welcomeTo}<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-400">Xchange</span> Platform
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-slate-300 text-lg leading-relaxed mb-12"
          >
            {t.login.systemDescription}
          </motion.p>

        </div>

        <div className="relative z-10 text-center text-slate-400 text-sm mt-12">
            © 2026 Xchange. All rights reserved.
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative bg-slate-50 dark:bg-slate-900/50">
        {/* Language Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLanguage}
          className="absolute top-6 right-6 z-20 font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 hover:bg-blue-50 gap-1.5 rounded-full dark:bg-slate-800"
        >
          <Globe className="h-4 w-4" />
          {language === 'th' ? 'EN' : 'TH'}
        </Button>
        <div className="absolute inset-0 bg-white z-0 dark:bg-slate-900"></div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md space-y-8 relative z-10 bg-white/80 dark:bg-slate-900/80 p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 border border-white dark:border-slate-800"
        >
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white leading-snug">{t.login.title}</h2>
            <p className="text-slate-500 mt-2 font-medium dark:text-slate-400">{t.login.enterCredentials}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-medium dark:text-slate-300">{t.login.email}</Label>
              <div className="relative group">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400 group-hover:text-blue-500 transition-colors dark:text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="pl-10 h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20 transition-all rounded-xl"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-700 font-medium dark:text-slate-300">{t.login.password}</Label>
                <Link to="/forgot-password" className="text-xs font-semibold text-blue-600 hover:text-blue-500 dark:text-slate-300">{t.login.forgotPassword}</Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400 group-hover:text-blue-500 transition-colors dark:text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20 transition-all rounded-xl"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="remember" checked={remember} onCheckedChange={(checked) => setRemember(checked === true)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:text-slate-300" />
              <label htmlFor="remember" className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer font-medium">{t.login.rememberMe}</label>
            </div>

            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 w-full h-12 text-base font-semibold text-white shadow-lg rounded-xl transition-all hover:scale-[1.01]" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : t.login.loginButton}
            </Button>
          </form>

        </motion.div>
      </div>
    </div>
  );
}
