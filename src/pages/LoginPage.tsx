import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
    <div className="min-h-screen flex font-sans bg-white dark:bg-slate-900 selection:bg-blue-100 selection:text-blue-900 overflow-hidden dark:text-slate-200">
      {/* Left Side - Visual Form Premium Dark matching Register */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop"
            alt="Background"
            className="w-full h-full object-cover opacity-20 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/50 to-slate-900/80" />
          {/* Animated particles */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-20"></div>
        </div>

        <div className="relative z-10 w-full max-w-lg mx-auto">
          <Link to="/" className="inline-block p-3 bg-white/10 rounded-2xl mb-8 backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-colors dark:bg-slate-900/50">
            <ArrowLeft className="w-6 h-6 text-white" />
          </Link>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-bold mb-6 text-white leading-tight"
          >
            {t.login.welcomeTo}<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-400">ShowPro</span> Platform
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-slate-300 text-lg leading-relaxed mb-12"
          >
            {t.login.systemDescription}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/5 dark:bg-slate-900/50"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-700 shadow-sm" />
                ))}
              </div>
              <div className="text-sm font-medium">
                <div className="text-white">Active Users</div>
                <div className="text-blue-300">5,000+ {t.login.usersInSystem}</div>
              </div>
            </div>
            <p className="text-xs text-slate-400 font-light">
              "{t.login.quote}"
            </p>
          </motion.div>
        </div>
        
        <div className="relative z-10 text-center text-slate-500 dark:text-slate-400 text-sm mt-12">
            © 2026 ShowPro. All rights reserved.
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
        <div className="absolute inset-0 bg-white/40 backdrop-blur-3xl z-0 dark:bg-slate-900/50"></div>
        {/* Background blobs */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-blue-100 dark:bg-blue-900/20 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-purple-100 dark:bg-purple-900/20 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md space-y-8 relative z-10 bg-white/80 dark:bg-slate-900/80 p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 border border-white dark:border-slate-800"
        >
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t.login.title}</h2>
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
              <Checkbox id="remember" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:text-slate-300" />
              <label htmlFor="remember" className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer font-medium">{t.login.rememberMe}</label>
            </div>

            <Button type="submit" className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30 rounded-xl transition-all hover:scale-[1.01]" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : t.login.loginButton}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200 dark:border-slate-700" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white/80 px-4 text-slate-400 backdrop-blur-sm dark:bg-slate-900/50">{t.login.orContinueWith}</span></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-50 hover:border-slate-300 text-slate-700 dark:text-slate-300 font-medium rounded-xl transition-all">
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
              Google
            </Button>
            <Button variant="outline" className="h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-50 hover:border-slate-300 text-slate-700 dark:text-slate-300 font-medium rounded-xl transition-all">
              <svg className="w-5 h-5 mr-2" viewBox="0 0 23 23"><path fill="#f3f3f3" d="M0 0h23v23H0z" /><path fill="#f35325" d="M1 1h10v10H1z" /><path fill="#81bc06" d="M12 1h10v10H12z" /><path fill="#05a6f0" d="M1 12h10v10H1z" /><path fill="#ffba08" d="M12 12h10v10H12z" /></svg>
              Microsoft
            </Button>
          </div>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            {t.login.noAccount} <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-500 transition-colors dark:text-slate-300">{t.login.registerNow}</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
