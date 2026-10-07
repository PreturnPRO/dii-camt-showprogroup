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
  const avatarSrc = user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.name || 'xchange')}`;

  const fillRequiredMessage = language === 'th' ? 'กรุณากรอกข้อมูลให้ครบถ้วน' : 'Please fill in all required fields';
  const currentPasswordRequiredMessage = language === 'th' ? 'กรุณากรอกรหัสผ่านปัจจุบัน' : 'Please enter your current password';
  const newPasswordTooShortMessage = language === 'th' ? 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' : 'New password must be at least 8 characters';
  const passwordMismatchMessage = language === 'th' ? 'รหัสผ่านใหม่ไม่ตรงกัน' : 'New passwords do not match';
  const passwordUpdatedMessage = language === 'th' ? 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' : 'Password updated successfully';

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
          <SettingsIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>{t.settingsPage.systemSettings}</span>
        </motion.div>
        <motion.h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          {t.settingsPage.settingsTitle}<span className="text-blue-600 dark:text-blue-400">{t.settingsPage.system}</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-slate-500 mt-2 dark:text-slate-400">
          {t.settingsPage.settingsDesc}
        </motion.p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar */}
        <motion.div variants={itemVariants} className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
            <div className="flex items-center gap-4 p-4 sm:p-5 mb-6 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white rounded-xl shadow-sm border border-slate-200/80 dark:border-slate-700/60 transition-colors">
              <div className="relative shrink-0">
                <Avatar className="w-14 h-14 sm:w-16 sm:h-16 border-2 border-white dark:border-slate-800 shadow-md rounded-2xl bg-white dark:bg-slate-800">
                  <AvatarImage src={avatarSrc} />
                  <AvatarFallback className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-white font-bold rounded-2xl">{user?.nameThai?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-5 h-5 rounded-lg border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-sm">
                  <ShieldCheck className="w-3 h-3 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-base sm:text-lg truncate tracking-tight text-slate-900 dark:text-white">{user?.nameThai}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate font-mono mt-0.5">{user?.email}</div>
              </div>
            </div>

            <nav className="space-y-1.5 px-1 sm:px-2">
              {[
                { id: 'profile', label: t.settingsPage.profileInfo, icon: User },
                { id: 'security', label: t.settingsPage.security, icon: Shield },
                { id: 'preferences', label: t.settingsPage.display, icon: Palette },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 sm:py-3.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${activeTab === item.id
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                >
                  <div className={`p-2 rounded-lg transition-colors shrink-0 ${activeTab === item.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span className="truncate">{item.label}</span>
                  {activeTab === item.id && <ChevronRight className="w-4 h-4 ml-auto shrink-0 opacity-90" />}
                </button>
              ))}
            </nav>

            <div className="mt-8 pt-5 border-t border-slate-200/70 dark:border-slate-800 px-2">
              <Button
                variant="ghost"
                className="w-full justify-start text-red-600 dark:text-red-400 font-semibold hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl h-11 text-xs"
                onClick={logout}
              >
                <div className="p-1.5 rounded-lg bg-red-100/70 dark:bg-red-900/30 text-red-600 dark:text-red-400 mr-3 shrink-0">
                  <LogOut className="w-4 h-4" />
                </div>
                {t.settingsPage.logout}
              </Button>
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-slate-900 dark:text-white shadow-sm transition-colors">
            <h3 className="text-base font-bold mb-3.5 flex items-center gap-2 text-slate-900 dark:text-white tracking-tight">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              {t.settingsPage.accountStatus}
            </h3>
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 transition-colors">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase font-mono">Verification</span>
                  <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] h-5 px-2 font-mono">Verified</Badge>
                </div>
                <div className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100">{t.settingsPage.verifiedNormal}</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Content Area */}
        <motion.div variants={itemVariants} className="lg:col-span-8">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col min-h-[600px] overflow-hidden transition-colors">
            <AnimatePresence mode="wait">
              {activeTab === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-6 sm:p-10 space-y-8"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">{t.settingsPage.personalInfo}</h2>
                      <p className="text-slate-500 font-medium dark:text-slate-400 text-sm">{t.settingsPage.personalInfoDesc}</p>
                    </div>
                    <Button onClick={handleSaveProfile} disabled={isSaving} className="rounded-xl h-11 px-6 bg-blue-600 text-white hover:bg-blue-700 shadow-sm font-semibold transition-all disabled:opacity-70">
                      <Save className="w-4 h-4 mr-2" /> {isSaving ? 'Saving...' : t.settingsPage.saveData}
                    </Button>
                  </div>

                  <div className="p-6 sm:p-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 flex flex-col md:flex-row items-center gap-6 sm:gap-8">
                    <div className="relative group/avatar cursor-pointer shrink-0">
                      <Avatar className="w-24 h-24 sm:w-28 sm:h-28 border-2 border-white dark:border-slate-700 shadow-md rounded-2xl">
                        <AvatarImage src={avatarSrc} />
                        <AvatarFallback className="text-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold">{user?.nameThai?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 bg-slate-900/60 rounded-2xl opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-all duration-200">
                        <Smartphone className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <h3 className="font-bold text-lg sm:text-xl text-slate-900 dark:text-white mb-1 tracking-tight">{t.settingsPage.profilePhoto}</h3>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-4">{t.settingsPage.profilePhotoDesc}</p>
                      <div className="flex flex-wrap justify-center md:justify-start gap-3">
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarFile}
                        />
                        <Button
                          className="rounded-xl h-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm px-5 text-xs"
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={isSaving}
                        >
                          {t.settingsPage.uploadNew}
                        </Button>
                        <Button
                          variant="ghost"
                          className="rounded-xl h-10 text-rose-600 dark:text-rose-400 font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/30 px-5 text-xs"
                          onClick={handleRemoveAvatar}
                          disabled={isSaving}
                        >
                          {t.settingsPage.deletePhoto}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="ml-1 text-slate-700 dark:text-slate-300 font-semibold text-xs">{t.settingsPage.nameThai}</Label>
                      <Input value={nameThai} onChange={e => setNameThai(e.target.value)} className="h-12 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 px-4 font-medium focus-visible:ring-blue-500" />
                    </div>
                    <div className="space-y-2">
                      <Label className="ml-1 text-slate-700 dark:text-slate-300 font-semibold text-xs">{t.settingsPage.nameEnglish}</Label>
                      <Input value={nameEn} onChange={e => setNameEn(e.target.value)} className="h-12 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 px-4 font-medium focus-visible:ring-blue-500" />
                    </div>
                    <div className="space-y-2">
                      <Label className="ml-1 text-slate-700 dark:text-slate-300 font-semibold text-xs">{t.settingsPage.emailAddress}</Label>
                      <Input value={email} readOnly className="h-12 rounded-xl bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 px-4 font-medium text-slate-500 cursor-not-allowed" />
                    </div>
                    <div className="space-y-2">
                      <Label className="ml-1 text-slate-700 dark:text-slate-300 font-semibold text-xs">{t.settingsPage.phoneNumber}</Label>
                      <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+66 XX XXX XXXX" className="h-12 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 px-4 font-medium focus-visible:ring-blue-500" />
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
                  className="p-6 sm:p-10 space-y-8"
                >
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-6">
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">{t.settingsPage.accountStrength}</h2>
                    <p className="text-slate-500 font-medium dark:text-slate-400 text-sm">{t.settingsPage.securityDesc}</p>
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 sm:p-8 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white shadow-sm transition-colors">
                      <h3 className="font-bold text-lg mb-5 flex items-center gap-3 tracking-tight text-slate-900 dark:text-white">
                        <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
                          <Lock className="w-5 h-5" />
                        </div>
                        {t.settingsPage.changePassword}
                      </h3>
                      <div className="grid gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 ml-0.5">{t.settingsPage.currentPassword}</Label>
                          <Input
                            type="password"
                            value={currentPwd}
                            onChange={e => setCurrentPwd(e.target.value)}
                            placeholder="••••••••"
                            className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 h-11 rounded-xl focus:ring-blue-500 transition-all px-4 text-base font-mono"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 ml-0.5">{t.settingsPage.newPassword}</Label>
                            <Input
                              type="password"
                              value={newPwd}
                              onChange={e => setNewPwd(e.target.value)}
                              placeholder="••••••••"
                              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 h-11 rounded-xl focus:ring-blue-500 transition-all px-4 text-base font-mono"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 ml-0.5">{t.settingsPage.confirmNewPassword}</Label>
                            <Input
                              type="password"
                              value={confirmPwd}
                              onChange={e => setConfirmPwd(e.target.value)}
                              placeholder="••••••••"
                              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 h-11 rounded-xl focus:ring-blue-500 transition-all px-4 text-base font-mono"
                            />
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={handleChangePasswordLive}
                        disabled={isChangingPassword}
                        className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 font-semibold text-sm shadow-sm transition-all disabled:opacity-70"
                      >
                        {isChangingPassword ? 'Updating...' : t.settingsPage.updatePassword}
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <Label className="text-sm font-bold text-slate-900 dark:text-slate-100">Account Security</Label>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Password login and JWT session protection are active.</p>
                        </div>
                        <Badge data-testid="security-active" variant="outline" className="rounded-lg h-9 border-slate-200 dark:border-slate-700 font-semibold px-3 text-xs">
                          Active
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            <Label className="text-sm font-bold text-slate-900 dark:text-slate-100">{t.settingsPage.loginHistory}</Label>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{t.settingsPage.loginHistoryDesc}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-lg h-9 text-slate-600 dark:text-slate-400 font-semibold px-3 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
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
                  className="p-6 sm:p-10 space-y-10"
                >
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-6">
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">{t.settingsPage.displayUI}</h2>
                    <p className="text-slate-500 font-medium dark:text-slate-400 text-sm">{t.settingsPage.displayDesc}</p>
                  </div>

                  <div className="space-y-10">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      {/* Light Mode Card */}
                      <div
                        className="cursor-pointer group flex flex-col items-center"
                        onClick={() => setTheme('light')}
                      >
                        <div
                          className={`w-full aspect-[16/10] rounded-2xl p-2.5 transition-all duration-200 relative overflow-hidden flex flex-col justify-between border-2 ${
                            theme === 'light'
                              ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md scale-[1.02]'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
                          } bg-slate-100 dark:bg-slate-800/60`}
                        >
                          {/* Miniature Browser Mockup */}
                          <div className="w-full h-full rounded-xl bg-white border border-slate-200/80 shadow-sm p-2 flex flex-col gap-1.5 overflow-hidden">
                            {/* Window Header */}
                            <div className="flex items-center gap-1 pb-1 border-b border-slate-100">
                              <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <div className="ml-auto w-10 h-1 rounded bg-slate-200" />
                            </div>
                            {/* Mockup Body */}
                            <div className="flex gap-1.5 flex-1">
                              {/* Sidebar */}
                              <div className="w-1/4 rounded bg-slate-50 border border-slate-100 p-1 flex flex-col gap-1">
                                <div className="w-full h-1.5 rounded bg-blue-500/40" />
                                <div className="w-3/4 h-1 rounded bg-slate-200" />
                                <div className="w-4/5 h-1 rounded bg-slate-200" />
                              </div>
                              {/* Content */}
                              <div className="flex-1 flex flex-col gap-1.5">
                                <div className="w-1/2 h-2 rounded bg-slate-800" />
                                <div className="grid grid-cols-2 gap-1 flex-1">
                                  <div className="rounded bg-slate-50 border border-slate-100" />
                                  <div className="rounded bg-slate-50 border border-slate-100" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{t.settingsPage.lightTheme}</span>
                            {theme === 'light' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium">สว่าง สะอาดตา</span>
                        </div>
                      </div>

                      {/* Dark Mode Card */}
                      <div
                        className="cursor-pointer group flex flex-col items-center"
                        onClick={() => setTheme('dark')}
                      >
                        <div
                          className={`w-full aspect-[16/10] rounded-2xl p-2.5 transition-all duration-200 relative overflow-hidden flex flex-col justify-between border-2 ${
                            theme === 'dark'
                              ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md scale-[1.02]'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
                          } bg-slate-100 dark:bg-slate-800/60`}
                        >
                          {/* Miniature Browser Mockup */}
                          <div className="w-full h-full rounded-xl bg-slate-950 border border-slate-800 shadow-sm p-2 flex flex-col gap-1.5 overflow-hidden">
                            {/* Window Header */}
                            <div className="flex items-center gap-1 pb-1 border-b border-slate-800/80">
                              <div className="w-1.5 h-1.5 rounded-full bg-rose-500/80" />
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500/80" />
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
                              <div className="ml-auto w-10 h-1 rounded bg-slate-800" />
                            </div>
                            {/* Mockup Body */}
                            <div className="flex gap-1.5 flex-1">
                              {/* Sidebar */}
                              <div className="w-1/4 rounded bg-slate-900 border border-slate-800/60 p-1 flex flex-col gap-1">
                                <div className="w-full h-1.5 rounded bg-blue-500/60" />
                                <div className="w-3/4 h-1 rounded bg-slate-800" />
                                <div className="w-4/5 h-1 rounded bg-slate-800" />
                              </div>
                              {/* Content */}
                              <div className="flex-1 flex flex-col gap-1.5">
                                <div className="w-1/2 h-2 rounded bg-slate-200" />
                                <div className="grid grid-cols-2 gap-1 flex-1">
                                  <div className="rounded bg-slate-900 border border-slate-800/60" />
                                  <div className="rounded bg-slate-900 border border-slate-800/60" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{t.settingsPage.darkTheme}</span>
                            {theme === 'dark' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium">คมเข้ม สบายตา</span>
                        </div>
                      </div>

                      {/* System (Auto) Card */}
                      <div
                        className="cursor-pointer group flex flex-col items-center"
                        onClick={() => setTheme('system')}
                      >
                        <div
                          className={`w-full aspect-[16/10] rounded-2xl p-2.5 transition-all duration-200 relative overflow-hidden flex flex-col justify-between border-2 ${
                            theme === 'system'
                              ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md scale-[1.02]'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
                          } bg-slate-100 dark:bg-slate-800/60`}
                        >
                          {/* Split Light/Dark Mockup */}
                          <div className="w-full h-full rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex overflow-hidden">
                            {/* Left Half (Light) */}
                            <div className="w-1/2 h-full bg-white p-2 flex flex-col justify-between border-r border-slate-200">
                              <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              </div>
                              <div className="space-y-1">
                                <div className="w-full h-1.5 rounded bg-blue-500/40" />
                                <div className="w-3/4 h-1 rounded bg-slate-200" />
                              </div>
                            </div>
                            {/* Right Half (Dark) */}
                            <div className="w-1/2 h-full bg-slate-950 p-2 flex flex-col justify-between">
                              <div className="flex justify-end">
                                <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                              </div>
                              <div className="space-y-1">
                                <div className="w-full h-1.5 rounded bg-blue-500/60" />
                                <div className="w-3/4 h-1 rounded bg-slate-800" />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{t.settingsPage.autoTheme}</span>
                            {theme === 'system' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium">เปลี่ยนตามอุปกรณ์</span>
                        </div>
                      </div>
                    </div>

                    <Separator className="bg-slate-100 dark:bg-slate-800" />

                    <div className="space-y-4">
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
                        <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"><Palette className="w-5 h-5" /></div>
                        {t.settingsPage.languageSettings}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Thai Option */}
                        <div
                          onClick={() => setLanguage('th')}
                          className={`p-5 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all duration-150 ${
                            language === 'th'
                              ? 'border-blue-600 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 shadow-sm'
                              : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <span className={`text-2xl font-black ${language === 'th' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>TH</span>
                            <div className="flex flex-col">
                              <span className="font-bold text-base text-slate-900 dark:text-white leading-tight">{t.settingsPage.thai}</span>
                              <span className={`text-xs font-medium ${language === 'th' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                {language === 'th' ? 'เลือกอยู่' : 'ภาษาไทย'}
                              </span>
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            language === 'th'
                              ? 'border-blue-600 bg-blue-600 dark:border-blue-500 dark:bg-blue-500'
                              : 'border-slate-300 dark:border-slate-600 bg-transparent'
                          }`}>
                            {language === 'th' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </div>

                        {/* English Option */}
                        <div
                          onClick={() => setLanguage('en')}
                          className={`p-5 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all duration-150 ${
                            language === 'en'
                              ? 'border-blue-600 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 shadow-sm'
                              : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <span className={`text-2xl font-black ${language === 'en' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>EN</span>
                            <div className="flex flex-col">
                              <span className="font-bold text-base text-slate-900 dark:text-white leading-tight">English</span>
                              <span className={`text-xs font-medium ${language === 'en' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                {language === 'en' ? 'Selected' : 'EN-US / EN-GB'}
                              </span>
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            language === 'en'
                              ? 'border-blue-600 bg-blue-600 dark:border-blue-500 dark:bg-blue-500'
                              : 'border-slate-300 dark:border-slate-600 bg-transparent'
                          }`}>
                            {language === 'en' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
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
