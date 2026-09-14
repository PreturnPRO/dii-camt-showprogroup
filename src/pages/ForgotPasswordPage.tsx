import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, Globe, KeyRound, Loader2, Lock, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ForgotPasswordPage() {
  const { language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialToken = searchParams.get('token') || '';
  const [email, setEmail] = React.useState('');
  const [token, setToken] = React.useState(initialToken);
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [resetUrl, setResetUrl] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const isResetMode = Boolean(token);
  const isTH = language !== 'en';

  const requestReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const response = await api.auth.forgotPassword(email);
      if (response.resetToken) {
        setToken(response.resetToken);
      }
      if (response.resetUrl) {
        setResetUrl(response.resetUrl);
      }
      toast.success(isTH ? 'เตรียมลิงก์รีเซ็ตรหัสผ่านแล้ว' : 'Password reset link is ready');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to request password reset');
    } finally {
      setIsLoading(false);
    }
  };

  const submitNewPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      toast.error(isTH ? 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' : 'Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error(isTH ? 'รหัสผ่านใหม่ไม่ตรงกัน' : 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await api.auth.resetPassword(token, password);
      toast.success(isTH ? 'เปลี่ยนรหัสผ่านสำเร็จ' : 'Password reset successfully');
      navigate('/login');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans bg-white dark:bg-slate-900 overflow-hidden dark:text-slate-200">
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop"
            alt="Campus"
            className="w-full h-full object-cover opacity-20 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/50 to-slate-900/80" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-20" />
        </div>

        <div className="relative z-10 w-full max-w-lg mx-auto">
          <Link to="/login" className="inline-block p-3 bg-white/10 rounded-2xl mb-8 backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-colors">
            <ArrowLeft className="w-6 h-6 text-white" />
          </Link>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold mb-6 text-white leading-tight"
          >
            {isTH ? 'กู้คืนบัญชีของคุณ' : 'Recover your account'}<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-400">ShowPro</span>
          </motion.h1>
          <p className="text-slate-300 text-lg leading-relaxed">
            {isTH
              ? 'ขอลิงก์รีเซ็ตรหัสผ่าน แล้วตั้งรหัสผ่านใหม่ได้อย่างปลอดภัย'
              : 'Request a secure reset link and set a new password for your account.'}
          </p>
        </div>

        <div className="relative z-10 text-center text-slate-500 text-sm mt-12">
          © 2026 ShowPro. All rights reserved.
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative bg-slate-50 dark:bg-slate-900/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLanguage}
          className="absolute top-6 right-6 z-20 font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 hover:bg-blue-50 gap-1.5 rounded-full dark:bg-slate-800"
        >
          <Globe className="h-4 w-4" />
          {language === 'th' ? 'EN' : 'TH'}
        </Button>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md space-y-8 relative z-10 bg-white/80 dark:bg-slate-900/80 p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 border border-white dark:border-slate-800"
        >
          <div className="text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 flex items-center justify-center mb-4">
              {isResetMode ? <KeyRound className="w-7 h-7" /> : <Mail className="w-7 h-7" />}
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {isResetMode ? (isTH ? 'ตั้งรหัสผ่านใหม่' : 'Set New Password') : (isTH ? 'ลืมรหัสผ่าน' : 'Forgot Password')}
            </h2>
            <p className="text-slate-500 mt-2 font-medium dark:text-slate-400">
              {isResetMode
                ? isTH ? 'กรอกรหัสผ่านใหม่สำหรับบัญชีของคุณ' : 'Enter a new password for your account.'
                : isTH ? 'กรอกอีเมลที่ใช้สมัครสมาชิก' : 'Enter the email used for your account.'}
            </p>
          </div>

          {!isResetMode ? (
            <form onSubmit={requestReset} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-medium dark:text-slate-300">
                  {isTH ? 'อีเมล' : 'Email'}
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    className="pl-10 h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20 transition-all rounded-xl"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30 rounded-xl" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                {isTH ? 'ส่งลิงก์รีเซ็ต' : 'Send Reset Link'}
              </Button>
            </form>
          ) : (
            <form onSubmit={submitNewPassword} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium dark:text-slate-300">
                  {isTH ? 'รหัสผ่านใหม่' : 'New Password'}
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  <Input
                    type="password"
                    className="pl-10 h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20 transition-all rounded-xl"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium dark:text-slate-300">
                  {isTH ? 'ยืนยันรหัสผ่านใหม่' : 'Confirm New Password'}
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  <Input
                    type="password"
                    className="pl-10 h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20 transition-all rounded-xl"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30 rounded-xl" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                {isTH ? 'เปลี่ยนรหัสผ่าน' : 'Reset Password'}
              </Button>
            </form>
          )}

          {resetUrl && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
              <div className="flex items-center gap-2 font-semibold mb-2">
                <CheckCircle className="w-4 h-4" />
                {isTH ? 'ลิงก์สำหรับโหมดพัฒนา' : 'Development reset link'}
              </div>
              <Textarea readOnly value={resetUrl} className="min-h-[80px] bg-white/80 dark:bg-slate-950 text-xs" />
            </div>
          )}

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-500 transition-colors dark:text-slate-300">
              {isTH ? 'กลับไปหน้าเข้าสู่ระบบ' : 'Back to login'}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
