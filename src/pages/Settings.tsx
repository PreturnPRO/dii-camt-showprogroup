import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Bell, Lock, Palette, LogOut, Settings as SettingsIcon, Shield,
  Moon, Smartphone, ChevronRight, Sparkles, Save, Mail, ExternalLink,
  ShieldCheck, Eye, Zap, ArrowUpRight
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { asNumber, asRecord, asString, getRoleProfile } from '@/lib/user-profile';
import { api } from '@/lib/api';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function Settings() {
  const { t, language, setLanguage } = useLanguage();
  const { user, logout, updateProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = React.useState('profile');
  const [isSaving, setIsSaving] = React.useState(false);
  const [isChangingPassword, setIsChangingPassword] = React.useState(false);
  const avatarInputRef = React.useRef<HTMLInputElement | null>(null);

  // Profile form state
  const [nameThai, setNameThai] = React.useState(user?.nameThai || '');
  const [nameEn, setNameEn] = React.useState(user?.name || '');
  const [email, setEmail] = React.useState(user?.email || '');
  const [phone, setPhone] = React.useState(user?.phone || '');

  // Password form state
  const [currentPwd, setCurrentPwd] = React.useState('');
  const [newPwd, setNewPwd] = React.useState('');
  const [confirmPwd, setConfirmPwd] = React.useState('');

  const fillRequiredMessage = language === 'th' ? 'กรุณากรอกข้อมูลให้ครบถ้วน' : 'Please fill in all required fields';
  const currentPasswordRequiredMessage = language === 'th' ? 'กรุณากรอกรหัสผ่านปัจจุบัน' : 'Please enter your current password';
  const newPasswordTooShortMessage = language === 'th' ? 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' : 'New password must be at least 8 characters';
  const passwordMismatchMessage = language === 'th' ? 'รหัสผ่านใหม่ไม่ตรงกัน' : 'New passwords do not match';
  const passwordUpdatedMessage = language === 'th' ? 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' : 'Password updated successfully';

  const handleSave = () => {
    if (!nameThai.trim() || !nameEn.trim() || !email.trim()) {
      toast.error(fillRequiredMessage);
      return;
    }
    toast.success(t.settingsPage.savedSuccess);
  };

  const handlePasswordChange = () => {
    if (!currentPwd) {
      toast.error(currentPasswordRequiredMessage);
      return;
    }
    if (newPwd.length < 8) {
      toast.error(newPasswordTooShortMessage);
      return;
    }
    if (newPwd !== confirmPwd) {
      toast.error(passwordMismatchMessage);
      return;
    }
    setCurrentPwd('');
    setNewPwd('');
    setConfirmPwd('');
    toast.success(passwordUpdatedMessage);
  };

  React.useEffect(() => {
    setNameThai(user?.nameThai || '');
    setNameEn(user?.name || '');
    setEmail(user?.email || '');
    setPhone(user?.phone || '');
  }, [user]);

  const buildRoleData = () => {
    const profile = getRoleProfile(user);

    switch (user?.role) {
      case 'student':
        return {
          major: asString(profile.major, 'Digital Industry Integration'),
          program: asString(profile.program, 'bachelor'),
          year: asNumber(profile.year, 1),
          semester: asNumber(profile.semester, 1),
          academicYear: asString(profile.academicYear, '2569'),
          cvUrl: asString(profile.cvUrl) || undefined,
        };
      case 'lecturer':
        return {
          department: asString(profile.department, 'Digital Industry Integration'),
          position: asString(profile.position, 'instructor'),
          specialization: Array.isArray(profile.specialization) ? profile.specialization : [],
          researchInterests: Array.isArray(profile.researchInterests) ? profile.researchInterests : [],
        };
      case 'staff':
        return {
          department: asString(profile.department, 'DII Office'),
          position: asString(profile.position, 'Staff'),
          permissions: Array.isArray(profile.permissions) ? profile.permissions : [],
        };
      case 'company':
        return {
          companyName: asString(profile.companyName, nameEn),
          companyNameThai: asString(profile.companyNameThai, nameThai),
          industry: asString(profile.industry, 'Technology'),
          size: asString(profile.size, 'small'),
          website: asString(profile.website) || undefined,
          address: asString(profile.address) || undefined,
        };
      case 'admin':
        return {
          permissions: Array.isArray(profile.permissions) ? profile.permissions : ['*'],
          isSuperAdmin: typeof profile.isSuperAdmin === 'boolean' ? profile.isSuperAdmin : false,
        };
      default:
        return {};
    }
  };

  const handleSaveProfile = async () => {
    if (!nameThai.trim() || !nameEn.trim() || !email.trim()) {
      toast.error(fillRequiredMessage);
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({
        name: nameEn,
        nameThai,
        phone,
        roleData: buildRoleData(),
      });
      toast.success(t.settingsPage.savedSuccess);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePasswordLive = async () => {
    if (!currentPwd) {
      toast.error(currentPasswordRequiredMessage);
      return;
    }
    if (newPwd.length < 8) {
      toast.error(newPasswordTooShortMessage);
      return;
    }
    if (newPwd !== confirmPwd) {
      toast.error(passwordMismatchMessage);
      return;
    }

    setIsChangingPassword(true);
    try {
      await updateProfile({
        currentPassword: currentPwd,
        newPassword: newPwd,
        roleData: buildRoleData(),
      });
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      toast.success(passwordUpdatedMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleAvatarFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsSaving(true);
    try {
      const upload = await api.files.upload(file, { category: 'avatar', visibility: 'public' });
      const asset = asRecord(upload.asset);
      const avatarUrl = asString(asset.url, asString(asset.publicUrl, asString(asset.signedUrl)));
      if (!avatarUrl) {
        throw new Error('Uploaded file URL was not returned');
      }
      await updateProfile({
        name: nameEn,
        nameThai,
        phone,
        avatar: avatarUrl,
        roleData: buildRoleData(),
      });
      toast.success(t.settingsPage.savedSuccess);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to upload profile photo');
    } finally {
      setIsSaving(false);
      event.target.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        name: nameEn,
        nameThai,
        phone,
        avatar: null,
        roleData: buildRoleData(),
      });
      toast.success(t.settingsPage.savedSuccess);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to remove profile photo');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-10"
    >
      {/* Header */}
      <div>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2">
          <SettingsIcon className="w-4 h-4 text-indigo-500 dark:text-slate-400" />
          <span>{t.settingsPage.systemSettings}</span>
        </motion.div>
        <motion.h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          {t.settingsPage.settingsTitle}<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">{t.settingsPage.system}</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-slate-500 mt-2 dark:text-slate-400">
          {t.settingsPage.settingsDesc}
        </motion.p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar - Bento Style */}
        <motion.div variants={itemVariants} className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] p-6 shadow-sm border border-white/60 dark:border-slate-800/60 relative overflow-hidden group dark:bg-slate-900/50">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors" />

            <div className="flex items-center gap-4 p-5 mb-8 bg-slate-900 text-white rounded-[2rem] shadow-xl relative z-10">
              <div className="relative">
                <Avatar className="w-16 h-16 border-2 border-white/20 shadow-md rounded-2xl">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} />
                  <AvatarFallback className="bg-white/10 text-white font-bold rounded-2xl dark:bg-slate-900/50">{user?.nameThai?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-5 h-5 rounded-lg border-2 border-slate-900 flex items-center justify-center">
                  <ShieldCheck className="w-3 h-3 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-lg truncate tracking-tight">{user?.nameThai}</div>
                <div className="text-xs text-slate-400 truncate font-medium">{user?.email}</div>
              </div>
            </div>

            <nav className="space-y-2 relative z-10 px-2">
              {[
                { id: 'profile', label: t.settingsPage.profileInfo, icon: User, color: 'text-blue-500', bg: 'bg-blue-50' },
                { id: 'notifications', label: t.settingsPage.notificationsTitle, icon: Bell, color: 'text-amber-500', bg: 'bg-amber-50' },
                { id: 'security', label: t.settingsPage.security, icon: Shield, color: 'text-indigo-500', bg: 'bg-indigo-50' },
                { id: 'preferences', label: t.settingsPage.display, icon: Palette, color: 'text-purple-500', bg: 'bg-purple-50' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold transition-all duration-300 ${activeTab === item.id
                    ? 'bg-white text-indigo-600 shadow-lg border border-indigo-50 translate-x-1'
                    : 'text-slate-500 hover:bg-white/50 hover:translate-x-1'
                    } dark:text-slate-400 dark:bg-slate-900/50`}
                >
                  <div className={`p-2.5 rounded-xl transition-colors ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-indigo-500/20' : `bg-slate-100/50 text-slate-400`}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  {item.label}
                  {activeTab === item.id && <ChevronRight className="w-4 h-4 ml-auto opacity-100" />}
                </button>
              ))}
            </nav>

            <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800 px-4">
              <Button
                variant="ghost"
                className="w-full justify-start text-red-500 font-bold hover:text-red-600 hover:bg-red-50 rounded-2xl h-14 dark:text-slate-300 dark:bg-slate-800"
                onClick={logout}
              >
                <div className="p-2.5 rounded-xl bg-red-50 text-red-500 mr-4 shadow-sm dark:text-slate-400 dark:bg-slate-800">
                  <LogOut className="w-5 h-5" />
                </div>
                {t.settingsPage.logout}
              </Button>
            </div>
          </div>

          {/* Quick Info Bento Box */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-[60px]" />
            <div className="relative z-10">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-300" />
                {t.settingsPage.accountStatus}
              </h3>
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md dark:bg-slate-900/50">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Verification</span>
                    <Badge className="bg-emerald-500 text-[10px] h-5">Verified</Badge>
                  </div>
                  <div className="text-sm font-bold">{t.settingsPage.verifiedNormal}</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Content Area - Bento Style */}
        <motion.div variants={itemVariants} className="lg:col-span-8">
          <div className="bg-white/70 backdrop-blur-xl rounded-[3rem] shadow-sm border border-white flex flex-col min-h-[600px] overflow-hidden dark:bg-slate-900/50">
            <AnimatePresence mode="wait">
              {activeTab === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-10 space-y-10"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4 border-b border-slate-100 dark:border-slate-800 pb-8">
                    <div>
                      <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">{t.settingsPage.personalInfo}</h2>
                      <p className="text-slate-500 font-medium dark:text-slate-400">{t.settingsPage.personalInfoDesc}</p>
                    </div>
                    <Button onClick={handleSaveProfile} disabled={isSaving} className="rounded-2xl h-12 px-8 bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-900/20 font-bold transform active:scale-95 transition-all disabled:opacity-70">
                      <Save className="w-4 h-4 mr-2" /> {isSaving ? 'Saving...' : t.settingsPage.saveData}
                    </Button>
                  </div>

                  <div className="p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group dark:bg-slate-900/50">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />
                    <div className="relative group/avatar cursor-pointer">
                      <Avatar className="w-32 h-32 border-4 border-white shadow-2xl rounded-[2rem]">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} />
                        <AvatarFallback className="text-3xl bg-indigo-100 text-indigo-600 font-black dark:text-slate-300">{user?.nameThai?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 bg-slate-900/60 rounded-[2rem] opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-all duration-300">
                        <Smartphone className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 text-center md:text-left relative z-10">
                      <h3 className="font-black text-2xl text-slate-900 dark:text-white mb-2 tracking-tight">{t.settingsPage.profilePhoto}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium">{t.settingsPage.profilePhotoDesc}</p>
                      <div className="flex justify-center md:justify-start gap-3">
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarFile}
                        />
                        <Button
                          className="rounded-xl h-11 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 shadow-sm px-6"
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={isSaving}
                        >
                          {t.settingsPage.uploadNew}
                        </Button>
                        <Button
                          variant="ghost"
                          className="rounded-xl h-11 text-red-500 font-bold hover:bg-red-50 px-6 dark:text-slate-400 dark:bg-slate-800"
                          onClick={handleRemoveAvatar}
                          disabled={isSaving}
                        >
                          {t.settingsPage.deletePhoto}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label className="ml-1 text-slate-700 dark:text-slate-300 font-bold">{t.settingsPage.nameThai}</Label>
                      <Input value={nameThai} onChange={e => setNameThai(e.target.value)} className="h-14 rounded-2xl bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-inner px-5 font-medium focus-visible:ring-indigo-500" />
                    </div>
                    <div className="space-y-2">
                      <Label className="ml-1 text-slate-700 dark:text-slate-300 font-bold">{t.settingsPage.nameEnglish}</Label>
                      <Input value={nameEn} onChange={e => setNameEn(e.target.value)} className="h-14 rounded-2xl bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-inner px-5 font-medium focus-visible:ring-indigo-500" />
                    </div>
                    <div className="space-y-2">
                      <Label className="ml-1 text-slate-700 dark:text-slate-300 font-bold">{t.settingsPage.emailAddress}</Label>
                      <Input value={email} readOnly className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-950 border-slate-100 dark:border-slate-800 shadow-inner px-5 font-medium text-slate-500" />
                    </div>
                    <div className="space-y-2">
                      <Label className="ml-1 text-slate-700 dark:text-slate-300 font-bold">{t.settingsPage.phoneNumber}</Label>
                      <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+66 XX XXX XXXX" className="h-14 rounded-2xl bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-inner px-5 font-medium focus-visible:ring-indigo-500" />
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'notifications' && (
                <motion.div
                  key="notifications"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-10 space-y-10"
                >
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-8">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">{t.settingsPage.notificationsTitle}</h2>
                    <p className="text-slate-500 font-medium dark:text-slate-400">{t.settingsPage.notificationsDesc}</p>
                  </div>

                  <div className="space-y-10">
                    <div className="space-y-6">
                      <h3 className="font-black text-xl text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
                        <div className="p-2 rounded-xl bg-amber-50 text-amber-500 shadow-sm"><Bell className="w-5 h-5" /></div>
                        {t.settingsPage.application}
                      </h3>
                      <div className="space-y-3">
                        {[
                          { label: t.settingsPage.newsAnnouncements, desc: t.settingsPage.newsAnnouncementsDesc },
                          { label: t.settingsPage.newActivities, desc: t.settingsPage.newActivitiesDesc },
                          { label: t.settingsPage.requestProgress, desc: t.settingsPage.requestProgressDesc }
                        ].map((pref, i) => (
                          <div key={i} className="flex items-center justify-between p-6 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-amber-200 transition-all shadow-sm">
                            <div className="space-y-1">
                              <Label className="text-lg font-bold text-slate-800 dark:text-slate-200">{pref.label}</Label>
                              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{pref.desc}</p>
                            </div>
                            <Switch defaultChecked className="data-[state=checked]:bg-amber-500" />
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator className="bg-slate-100 dark:bg-slate-800" />

                    <div className="space-y-6">
                      <h3 className="font-black text-xl text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
                        <div className="p-2 rounded-xl bg-purple-50 text-purple-500 shadow-sm dark:text-slate-400 dark:bg-slate-800"><Mail className="w-5 h-5" /></div>
                        {t.settingsPage.emailDirect}
                      </h3>
                      <div className="flex items-center justify-between p-6 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-purple-200 transition-all shadow-sm">
                        <div className="space-y-1">
                          <Label className="text-lg font-bold text-slate-800 dark:text-slate-200">{t.settingsPage.weeklySummary}</Label>
                          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{t.settingsPage.weeklySummaryDesc}</p>
                        </div>
                        <Switch className="data-[state=checked]:bg-purple-500" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'security' && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-10 space-y-10"
                >
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-8">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">{t.settingsPage.accountStrength}</h2>
                    <p className="text-slate-500 font-medium dark:text-slate-400">{t.settingsPage.securityDesc}</p>
                  </div>

                  <div className="space-y-8">
                    <div className="p-10 rounded-[2.5rem] bg-slate-900 text-white shadow-2xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 transition-all duration-1000 group-hover:bg-indigo-500/30" />
                      <h3 className="font-black text-2xl mb-8 flex items-center gap-3 relative z-10 tracking-tight">
                        <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 dark:bg-slate-900/50"><Lock className="w-7 h-7 text-indigo-300" /></div>
                        {t.settingsPage.changePassword}
                      </h3>
                      <div className="grid gap-6 relative z-10">
                        <div className="space-y-3">
                          <Label className="text-slate-300 font-bold ml-1">{t.settingsPage.currentPassword}</Label>
                          <Input type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} placeholder="••••••••" className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-14 rounded-2xl focus:bg-white/10 transition-all px-6 text-lg dark:bg-slate-900/50" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <Label className="text-slate-300 font-bold ml-1">{t.settingsPage.newPassword}</Label>
                            <Input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="••••••••" className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-14 rounded-2xl focus:bg-white/10 transition-all px-6 text-lg dark:bg-slate-900/50" />
                          </div>
                          <div className="space-y-3">
                            <Label className="text-slate-300 font-bold ml-1">{t.settingsPage.confirmNewPassword}</Label>
                            <Input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="••••••••" className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-14 rounded-2xl focus:bg-white/10 transition-all px-6 text-lg dark:bg-slate-900/50" />
                          </div>
                        </div>
                      </div>
                      <Button onClick={handleChangePasswordLive} disabled={isChangingPassword} className="mt-10 w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white hover:bg-slate-100 rounded-[1.5rem] h-14 font-black text-base shadow-xl transform active:scale-[0.98] transition-all relative z-10 disabled:opacity-70">
                        {isChangingPassword ? 'Updating...' : t.settingsPage.updatePassword}
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex items-center justify-between p-8 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm group hover:border-indigo-200 transition-all">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:text-slate-400"><ShieldCheck className="w-5 h-5" /></div>
                            <Label className="text-xl font-black text-slate-800 dark:text-slate-200 tracking-tight leading-none">Account Security</Label>
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Password login and JWT session protection are active.</p>
                        </div>
                        <Button
                          variant="outline"
                          className="rounded-xl h-12 border-slate-200 dark:border-slate-700 font-bold px-6"
                          onClick={() => toast.success('Security settings are active')}
                        >
                          Active
                        </Button>
                      </div>
                      <div className="flex items-center justify-between p-8 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm group hover:border-slate-300 transition-all">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300"><Eye className="w-5 h-5" /></div>
                            <Label className="text-xl font-black text-slate-800 dark:text-slate-200 tracking-tight leading-none">{t.settingsPage.loginHistory}</Label>
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{t.settingsPage.loginHistoryDesc}</p>
                        </div>
                        <Button
                          variant="ghost"
                          className="rounded-xl h-12 text-slate-500 dark:text-slate-400 font-bold px-4"
                          onClick={() => {
                            const lastLogin = asRecord(user?.raw).lastLogin;
                            toast.info(lastLogin ? `Last login: ${new Date(String(lastLogin)).toLocaleString('th-TH')}` : (language === 'th' ? 'ยังไม่มีประวัติการเข้าสู่ระบบเพิ่มเติม' : 'No additional login history yet'));
                          }}
                        >
                          {t.settingsPage.viewData}
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'preferences' && (
                <motion.div
                  key="preferences"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-10 space-y-12"
                >
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-8">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">{t.settingsPage.displayUI}</h2>
                    <p className="text-slate-500 font-medium dark:text-slate-400">{t.settingsPage.displayDesc}</p>
                  </div>

                  <div className="space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="cursor-pointer group" onClick={() => setTheme('light')}>
                        <div className={`aspect-[16/10] rounded-[2rem] bg-slate-50 dark:bg-slate-950 border-4 ${theme === 'light' || theme === undefined ? 'border-indigo-600' : 'border-transparent group-hover:border-slate-300'} mb-4 relative overflow-hidden shadow-2xl ${theme === 'light' || theme === undefined ? 'scale-[1.05]' : ''}`}>
                          <div className="absolute inset-4 bg-white dark:bg-slate-900 rounded-[1.25rem] border border-slate-100 dark:border-slate-800 shadow-inner" />
                          <div className="absolute top-10 left-10 w-2/3 h-4 bg-slate-50 dark:bg-slate-950 rounded-full" />
                          <div className="absolute top-18 left-10 w-1/3 h-24 bg-slate-50 dark:bg-slate-950 rounded-2xl" />
                        </div>
                        <p className="text-center font-black text-slate-900 dark:text-white text-sm tracking-tight">{t.settingsPage.lightTheme}</p>
                      </div>
                      <div className="cursor-pointer group" onClick={() => setTheme('dark')}>
                        <div className={`aspect-[16/10] rounded-[2rem] bg-slate-900 border-4 ${theme === 'dark' ? 'border-indigo-600' : 'border-transparent group-hover:border-slate-300'} mb-4 relative overflow-hidden shadow-sm ${theme === 'dark' ? '' : 'opacity-60 group-hover:opacity-100 transition-all'}`}>
                          <div className="absolute inset-4 bg-slate-800 rounded-[1.25rem] border border-slate-700" />
                          <div className="absolute top-10 left-10 w-2/3 h-4 bg-slate-700 rounded-full" />
                          <div className="absolute top-18 left-10 w-1/3 h-24 bg-slate-700 rounded-2xl" />
                        </div>
                        <p className="text-center font-bold text-slate-500 dark:text-slate-400 text-sm tracking-tight">{t.settingsPage.darkTheme}</p>
                      </div>
                      <div className="cursor-pointer group" onClick={() => setTheme('system')}>
                        <div className={`aspect-[16/10] rounded-[2rem] bg-gradient-to-br from-indigo-100 to-indigo-900 border-4 ${theme === 'system' ? 'border-indigo-600' : 'border-transparent group-hover:border-slate-300'} mb-4 relative overflow-hidden shadow-sm flex items-center justify-center ${theme === 'system' ? '' : 'opacity-60 group-hover:opacity-100 transition-all'}`}>
                          <Smartphone className="w-12 h-12 text-white/50" />
                        </div>
                        <p className="text-center font-bold text-slate-500 dark:text-slate-400 text-sm tracking-tight">{t.settingsPage.autoTheme}</p>
                      </div>
                    </div>

                    <Separator className="bg-slate-100 dark:bg-slate-800" />

                    <div className="space-y-6">
                      <h3 className="font-black text-xl text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
                        <div className="p-2 rounded-xl bg-indigo-50 text-indigo-500 shadow-sm dark:text-slate-400"><Palette className="w-5 h-5" /></div>
                        {t.settingsPage.languageSettings}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div onClick={() => setLanguage('th')} className={`p-6 rounded-[2rem] border-4 bg-white dark:bg-slate-900 flex items-center justify-between cursor-pointer shadow-lg transform active:scale-[0.98] transition-all ${language === 'th' ? 'border-indigo-600' : 'border-slate-100 hover:border-slate-200'}`}>
                          <div className="flex items-center gap-6">
                            <span className="text-4xl filter drop-shadow-md">TH</span>
                            <div className="flex flex-col">
                              <span className="font-black text-xl text-slate-900 dark:text-white leading-tight">{t.settingsPage.thai}</span>
                              <span className={`text-xs font-bold uppercase tracking-widest ${language === 'th' ? 'text-indigo-500' : 'text-slate-400'}`}>{language === 'th' ? 'Selected' : 'Thai'}</span>
                            </div>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-4 border-white shadow-md ${language === 'th' ? 'bg-indigo-600' : 'border-slate-200'}`} />
                        </div>
                        <div onClick={() => setLanguage('en')} className={`p-6 rounded-[2rem] border-2 bg-white/50 hover:bg-white flex items-center justify-between cursor-pointer transition-all ${language === 'en' ? 'border-indigo-600 border-4' : 'border-slate-100 hover:border-slate-200'} dark:bg-slate-900/50`}>
                          <div className="flex items-center gap-6">
                            <span className={`text-4xl filter drop-shadow-sm ${language === 'en' ? '' : 'opacity-60'}`}>EN</span>
                            <div className="flex flex-col">
                              <span className={`font-black text-xl leading-tight ${language === 'en' ? 'text-slate-900' : 'text-slate-400'} dark:text-slate-200`}>English</span>
                              <span className={`text-xs font-bold tracking-tight ${language === 'en' ? 'text-indigo-500' : 'text-slate-400'}`}>{language === 'en' ? 'Selected' : 'EN-US / EN-GB'}</span>
                            </div>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-4 border-white shadow-md ${language === 'en' ? 'bg-indigo-600' : 'border-slate-200'}`} />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
