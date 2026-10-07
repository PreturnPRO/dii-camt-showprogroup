import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Building2, User, Mail, Lock, CheckCircle, ArrowRight, ArrowLeft, BookOpen, UserCog, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { ApiError } from '@/lib/api';

export default function RegisterPage() {
    const { t, language, toggleLanguage } = useLanguage();
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

        <div className="min-h-screen flex font-sans bg-white dark:bg-slate-900 selection:bg-blue-100 selection:text-blue-900 overflow-hidden dark:text-slate-200">
            {/* Left Side: Information - Premium Dark */}
            <div className="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden flex-col justify-between p-12">
                <div className="absolute inset-0 z-0">
                    <img
                        src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop"
                        alt="Team"
                        className="w-full h-full object-cover opacity-20 mix-blend-overlay"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-900/50 to-slate-900/80" />
                    {/* Animated particles */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-20"></div>
                </div>

                <div className="relative z-10 w-full max-w-lg mx-auto">
                    <Link to="/" className="inline-block p-3 bg-white dark:bg-slate-900/10 rounded-2xl mb-8 backdrop-blur-sm border border-white/10 hover:bg-white dark:bg-slate-900/20 transition-colors">
                        <ArrowLeft className="w-6 h-6 text-white" />
                    </Link>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl font-bold mb-6 text-white leading-tight"
                    >
                        {t.register.startJourney}<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-400">{t.register.successWithDII}</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-slate-300 text-lg leading-relaxed mb-12"
                    >
                        {t.register.journeyDesc}
                    </motion.p>

                    <div className="space-y-6">
                        {[
                            { text: t.register.feature1, color: 'text-emerald-400' },
                            { text: t.register.feature2, color: 'text-blue-400' },
                            { text: t.register.feature3, color: 'text-purple-400' }
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 + (i * 0.1) }}
                                className="flex items-center gap-4 text-slate-300 bg-white dark:bg-slate-900/5 p-4 rounded-xl border border-white/5"
                            >
                                <CheckCircle className={`w-6 h-6 ${item.color}`} />
                                <span className="font-medium">{item.text}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div className="relative z-10 text-center text-slate-500 dark:text-slate-400 text-sm mt-12">
                    © 2026 Xchange. All rights reserved.
                </div>
            </div>

            {/* Right Side: Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative bg-slate-50 dark:bg-slate-900">
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
                <div className="absolute inset-0 bg-white dark:bg-slate-900/40 backdrop-blur-3xl z-0"></div>
                {/* Background blobs */}
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-emerald-100 dark:bg-emerald-900/20 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-blue-100 dark:bg-blue-900/20 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

                <div className="w-full max-w-md relative z-10 bg-white dark:bg-slate-900/80 p-6 md:p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 border border-white dark:border-slate-800 min-h-[600px] flex flex-col justify-center">
                    <AnimatePresence mode="wait">
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div>
                                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">{t.register.personalInfo}</h2>
                                    <p className="text-slate-500 dark:text-slate-400">
                                        {t.register.registerAs} <span className="font-bold text-blue-600 px-2 py-1 bg-blue-50 rounded-lg dark:text-slate-300 dark:bg-slate-800">
                                            {t.roles.student}
                                        </span>
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>{t.register.fullNameOrCompany}</Label>
                                        <div className="relative group">
                                            <User className="absolute left-3 top-3 h-5 w-5 text-slate-400 group-hover:text-blue-500 transition-colors dark:text-slate-400" />
                                            <Input className="pl-10 h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl transition-all" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t.register.email}</Label>
                                        <div className="relative group">
                                            <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400 group-hover:text-blue-500 transition-colors dark:text-slate-400" />
                                            <Input type="email" className="pl-10 h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl transition-all" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>{t.register.password}</Label>
                                        <div className="relative group">
                                            <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400 group-hover:text-blue-500 transition-colors dark:text-slate-400" />
                                            <Input type="password" className="pl-10 h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl transition-all" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t.register.confirmPassword}</Label>
                                        <div className="relative group">
                                            <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400 group-hover:text-blue-500 transition-colors dark:text-slate-400" />
                                            <Input type="password" className="pl-10 h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl transition-all" required value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} />
                                        </div>
                                    </div>

                                    <Button type="submit" disabled={isSubmitting} className="w-full h-12 text-lg font-semibold mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 rounded-xl transition-all hover:scale-[1.01] disabled:opacity-70">
                                        {isSubmitting ? 'Signing up...' : t.register.registerButton}
                                    </Button>
                                </form>

                                <div className="text-center">
                                    <Link to="/login" className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors">{t.register.hasAccount} {t.register.loginNow}</Link>
                                </div>
                            </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );

}
