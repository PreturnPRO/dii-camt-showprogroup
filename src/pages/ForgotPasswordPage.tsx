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
      if (response.resetToken) setToken(response.resetToken);
      if (response.resetUrl) setResetUrl(response.resetUrl);
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
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 font-sans p-6">
      {/* top right controls */}
      <div className="fixed top-4 right-4 flex items-center gap-2">
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
        transition={{ duration: 0.35 }}
        className="w-full max-w-sm"
      >
        {/* Back link */}
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          {isTH ? 'กลับเข้าสู่ระบบ' : 'Back to login'}
        </Link>

        {/* Icon + title */}
        <div className="mb-8">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-5">
            {isResetMode
              ? <KeyRound className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              : <Mail className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            }
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">
            {isResetMode
              ? (isTH ? 'ตั้งรหัสผ่านใหม่' : 'Set new password')
              : (isTH ? 'ลืมรหัสผ่าน' : 'Forgot password')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isResetMode
              ? (isTH ? 'กรอกรหัสผ่านใหม่สำหรับบัญชีของคุณ' : 'Enter a new password for your account.')
              : (isTH ? 'กรอกอีเมลที่ใช้สมัครสมาชิก เราจะส่งลิงก์รีเซ็ตให้' : 'Enter your email and we\'ll send a reset link.')}
          </p>
        </div>

        {!isResetMode ? (
          <form onSubmit={requestReset} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {isTH ? 'อีเมล' : 'Email'}
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="pl-9 h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-md text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-100 rounded-md font-medium text-sm"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {isTH ? 'ส่งลิงก์รีเซ็ต' : 'Send reset link'}
            </Button>
          </form>
        ) : (
          <form onSubmit={submitNewPassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {isTH ? 'รหัสผ่านใหม่' : 'New password'}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="password"
                  className="pl-9 h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-md text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {isTH ? 'ยืนยันรหัสผ่านใหม่' : 'Confirm new password'}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="password"
                  className="pl-9 h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-md text-sm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-100 rounded-md font-medium text-sm"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {isTH ? 'เปลี่ยนรหัสผ่าน' : 'Reset password'}
            </Button>
          </form>
        )}

        {resetUrl && (
          <div className="mt-5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2">
              <CheckCircle className="w-3.5 h-3.5" />
              {isTH ? 'ลิงก์สำหรับโหมดพัฒนา' : 'Dev mode reset link'}
            </div>
            <Textarea
              readOnly
              value={resetUrl}
              className="min-h-[72px] text-xs bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800 rounded-md"
            />
          </div>
        )}
      </motion.div>
    </div>
  );
}