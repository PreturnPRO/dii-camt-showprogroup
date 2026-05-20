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
    const [step, setStep] = useState(1);
    const [role, setRole] = useState<'student' | 'company' | 'lecturer' | 'staff' | 'enterprise' | null>(null);
    const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
    const [enterpriseData, setEnterpriseData] = useState({
        taxId: '',
        website: '',
        industry: '',
        regBlock: '',
        companyNameThai: '',
        companyNameEn: '',
        companySize: 'small',
        locationMapUrl: '',
        productsServices: '',
        contactPersonName: '',
        contactPersonRole: 'HR / Company Coordinator',
        contactPersonEmail: '',
        contactPersonPhone: '',
        socialMedia: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleRoleSelect = (selectedRole: 'student' | 'company' | 'lecturer' | 'staff' | 'enterprise') => {
        setRole(selectedRole);
        setStep(2);
    };

    const buildProfile = () => {
        const timestamp = Date.now().toString().slice(-6);
        const baseId = formData.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8) || timestamp;

        if (role === 'student') {
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
        }

        if (role === 'lecturer') {
            return {
                lecturerId: `LEC${timestamp}`,
                department: 'Digital Industry Integration',
                position: 'instructor',
                specialization: [],
                researchInterests: [],
            };
        }

        if (role === 'staff') {
            return {
                staffId: `STA${timestamp}`,
                department: 'DII Office',
                position: 'Staff',
                permissions: ['students', 'courses', 'reports'],
                canManageUsers: true,
                canManageCourses: true,
                canManageSchedules: true,
                canViewReports: true,
                canManageInternships: true,
            };
        }

        return {
            companyId: `COM${timestamp}`,
            companyName: enterpriseData.companyNameEn || formData.name,
            companyNameThai: enterpriseData.companyNameThai || formData.name,
            industry: enterpriseData.industry || 'Technology',
            size: role === 'enterprise' ? 'enterprise' : enterpriseData.companySize,
            website: enterpriseData.website || undefined,
            address: enterpriseData.regBlock || undefined,
            locationMapUrl: enterpriseData.locationMapUrl || undefined,
            productsServices: enterpriseData.productsServices || undefined,
            contactPersonName: enterpriseData.contactPersonName || undefined,
            contactPersonRole: enterpriseData.contactPersonRole || undefined,
            contactPersonEmail: enterpriseData.contactPersonEmail || formData.email,
            contactPersonPhone: enterpriseData.contactPersonPhone || undefined,
            socialMedia: enterpriseData.socialMedia || undefined,
            onboardingStatus: 'pending_review',
            privacyProtocolAcceptedAt: new Date().toISOString(),
            taxId: enterpriseData.taxId || undefined,
            internshipSlots: 0,
        };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            toast.error(t.register.passwordMismatch);
            return;
        }

        if (role === 'company' || role === 'enterprise') {
            if (!enterpriseData.companyNameThai || !enterpriseData.companyNameEn || !enterpriseData.industry || !enterpriseData.regBlock || !enterpriseData.contactPersonName || !enterpriseData.contactPersonEmail) {
                toast.error("Please fill required company intake fields.");
                return;
            }
        }

        if (!role) {
            toast.error(t.register.chooseAccountType);
            return;
        }

        setIsSubmitting(true);
        try {
            await register({
                email: formData.email,
                password: formData.password,
                name: formData.name,
                nameThai: formData.name,
                role: role === 'enterprise' ? 'company' : role,
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
                    © 2026 ShowPro. All rights reserved.
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
                        {step === 1 ? (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="text-center">
                                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t.register.chooseAccountType}</h2>
                                    <p className="text-slate-500 dark:text-slate-400">{t.register.whatRoleQuestion}</p>
                                </div>

                                <div className="grid gap-4">
                                    <Card
                                        className="p-5 cursor-pointer hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 transition-all group border-2 border-slate-100 dark:border-slate-800 hover:scale-[1.02] bg-white dark:bg-slate-900"
                                        onClick={() => handleRoleSelect('student')}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 dark:bg-slate-800">
                                                <GraduationCap className="w-6 h-6 text-blue-600 group-hover:text-white dark:text-slate-300" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-slate-900 dark:text-white text-lg group-hover:text-blue-600 transition-colors">{t.roles.student}</h3>
                                                <p className="text-slate-500 dark:text-slate-400 text-sm">{t.register.studentDesc}</p>
                                            </div>
                                            <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all dark:text-slate-400" />
                                        </div>
                                    </Card>

                                    <Card
                                        className="p-5 cursor-pointer hover:border-orange-500 hover:shadow-xl hover:shadow-orange-500/10 transition-all group border-2 border-slate-100 dark:border-slate-800 hover:scale-[1.02] bg-white dark:bg-slate-900"
                                        onClick={() => handleRoleSelect('company')}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-950/40 rounded-2xl flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-all duration-300">
                                                <Building2 className="w-6 h-6 text-orange-600 group-hover:text-white dark:text-orange-400" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-slate-900 dark:text-white text-lg group-hover:text-orange-600 transition-colors">{t.register.companyOrg}</h3>
                                                <p className="text-slate-500 dark:text-slate-400 text-sm">{t.register.companyDesc}</p>
                                            </div>
                                            <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all dark:text-slate-400" />
                                        </div>
                                    </Card>

                                    <Card
                                        className="p-5 cursor-pointer hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/10 transition-all group border-2 border-slate-100 dark:border-slate-800 hover:scale-[1.02] bg-white dark:bg-slate-900"
                                        onClick={() => handleRoleSelect('lecturer')}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 dark:bg-slate-800">
                                                <BookOpen className="w-6 h-6 text-emerald-600 group-hover:text-white dark:text-slate-300" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-slate-900 dark:text-white text-lg group-hover:text-emerald-600 transition-colors">{t.roles.lecturer}</h3>
                                                <p className="text-slate-500 dark:text-slate-400 text-sm">{t.register.lecturerDesc}</p>
                                            </div>
                                            <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all dark:text-slate-400" />
                                        </div>
                                    </Card>

                                    <Card
                                        className="p-5 cursor-pointer hover:border-purple-500 hover:shadow-xl hover:shadow-purple-500/10 transition-all group border-2 border-slate-100 dark:border-slate-800 hover:scale-[1.02] bg-white dark:bg-slate-900"
                                        onClick={() => handleRoleSelect('staff')}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all duration-300 dark:bg-slate-800">
                                                <UserCog className="w-6 h-6 text-purple-600 group-hover:text-white dark:text-slate-300" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-slate-900 dark:text-white text-lg group-hover:text-purple-600 transition-colors">{t.roles.staff}</h3>
                                                <p className="text-slate-500 dark:text-slate-400 text-sm">{t.register.staffDesc}</p>
                                            </div>
                                            <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all dark:text-slate-400" />
                                        </div>
                                    </Card>

                                    <Card
                                        className="p-5 cursor-pointer hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/10 transition-all group border-2 border-indigo-100 dark:border-indigo-900 hover:scale-[1.02] bg-gradient-to-br from-indigo-50 to-white dark:from-slate-900 dark:to-slate-900"
                                        onClick={() => handleRoleSelect('enterprise')}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-950/40 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                                                <Building2 className="w-6 h-6 text-indigo-600 group-hover:text-white dark:text-indigo-400" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-indigo-900 dark:text-indigo-300 text-lg group-hover:text-indigo-600 transition-colors">Enterprise Entity</h3>
                                                <p className="text-slate-500 dark:text-slate-400 text-sm">Exclusive registration for VIP / Enterprise partners.</p>
                                            </div>
                                            <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all dark:text-slate-400" />
                                        </div>
                                    </Card>
                                </div>

                                <div className="text-center pt-4">
                                    <Link to="/login" className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors">{t.register.hasAccount} {t.register.loginNow}</Link>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div>
                                    <Button variant="ghost" className="pl-0 hover:bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 mb-2 group" onClick={() => setStep(1)}>
                                        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> {t.common.back}
                                    </Button>
                                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">{t.register.personalInfo}</h2>
                                    <p className="text-slate-500 dark:text-slate-400">
                                        {t.register.registerAs} <span className="font-bold text-blue-600 px-2 py-1 bg-blue-50 rounded-lg dark:text-slate-300 dark:bg-slate-800">
                                            {role === 'student' ? t.roles.student :
                                                role === 'company' ? t.roles.company :
                                                    role === 'lecturer' ? t.roles.lecturer : 
                                                        role === 'enterprise' ? 'Enterprise Entity' : t.roles.staff}
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

                                    {(role === 'company' || role === 'enterprise') && (
                                        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                                            <h3 className="font-semibold text-indigo-900 dark:text-indigo-300">Company Intake & Privacy Protocol</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="space-y-2">
                                                    <Label>Company Name (Thai)</Label>
                                                    <Input className="h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 rounded-xl" required value={enterpriseData.companyNameThai} onChange={e => setEnterpriseData({ ...enterpriseData, companyNameThai: e.target.value })} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Company Name (English)</Label>
                                                    <Input className="h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 rounded-xl" required value={enterpriseData.companyNameEn} onChange={e => setEnterpriseData({ ...enterpriseData, companyNameEn: e.target.value })} />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Company Size</Label>
                                                <Input className="h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 rounded-xl" placeholder="small / medium / large / enterprise" value={enterpriseData.companySize} onChange={e => setEnterpriseData({ ...enterpriseData, companySize: e.target.value })} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Head office / branch address and location map</Label>
                                                <Textarea className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 rounded-xl" required placeholder="Address, branch, Google Maps link..." value={enterpriseData.regBlock} onChange={e => setEnterpriseData({ ...enterpriseData, regBlock: e.target.value })} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Location map URL</Label>
                                                <Input className="h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 rounded-xl" placeholder="https://maps.app.goo.gl/..." value={enterpriseData.locationMapUrl} onChange={e => setEnterpriseData({ ...enterpriseData, locationMapUrl: e.target.value })} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Products / Services / Digital Industry</Label>
                                                <Textarea className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 rounded-xl" required placeholder="Software, IoT, Digital Service, Cyber Security..." value={enterpriseData.productsServices} onChange={e => setEnterpriseData({ ...enterpriseData, productsServices: e.target.value })} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Industry</Label>
                                                <Input className="h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/20 rounded-xl transition-all" required placeholder="e.g. Technology, Finance, Education..." value={enterpriseData.industry} onChange={e => setEnterpriseData({ ...enterpriseData, industry: e.target.value })} />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="space-y-2">
                                                    <Label>Company Phone</Label>
                                                    <Input className="h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 rounded-xl" value={enterpriseData.contactPersonPhone} onChange={e => setEnterpriseData({ ...enterpriseData, contactPersonPhone: e.target.value })} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Company Website</Label>
                                                    <Input type="url" className="h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 rounded-xl" placeholder="https://www.example.com" value={enterpriseData.website} onChange={e => setEnterpriseData({ ...enterpriseData, website: e.target.value })} />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Social / Line / Facebook</Label>
                                                <Input className="h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 rounded-xl" value={enterpriseData.socialMedia} onChange={e => setEnterpriseData({ ...enterpriseData, socialMedia: e.target.value })} />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="space-y-2">
                                                    <Label>Coordinator / HR Name</Label>
                                                    <Input className="h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 rounded-xl" required value={enterpriseData.contactPersonName} onChange={e => setEnterpriseData({ ...enterpriseData, contactPersonName: e.target.value })} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Coordinator Role</Label>
                                                    <Input className="h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 rounded-xl" value={enterpriseData.contactPersonRole} onChange={e => setEnterpriseData({ ...enterpriseData, contactPersonRole: e.target.value })} />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Coordinator Email</Label>
                                                <Input type="email" className="h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 rounded-xl" required value={enterpriseData.contactPersonEmail} onChange={e => setEnterpriseData({ ...enterpriseData, contactPersonEmail: e.target.value })} />
                                            </div>
                                            {role === 'enterprise' && (
                                                <div className="space-y-2">
                                                    <Label>Tax ID</Label>
                                                    <Input className="h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/20 rounded-xl transition-all" placeholder="13-digit Tax ID" value={enterpriseData.taxId} onChange={e => setEnterpriseData({ ...enterpriseData, taxId: e.target.value })} />
                                                </div>
                                            )}
                                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
                                                By creating this company account, the coordinator accepts the student privacy protocol: exact GPA/transcript must be requested through the student's advisor and cannot be accessed directly by HR.
                                            </div>
                                        </div>
                                    )}

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
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );

}
