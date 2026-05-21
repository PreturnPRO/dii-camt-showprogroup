import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Shield, Plus, Search, Edit, Trash2, Mail, UserCog, Building, GraduationCap, Save, X, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { asRecord, asString, roleToClient } from '@/lib/live-data';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

export default function UsersPage() {
    const { t } = useLanguage();
    const [searchQuery, setSearchQuery] = useState('');
    type UserType = 'student' | 'lecturer' | 'staff' | 'company' | 'admin';
    type UserRow = {
        id: string;
        name: string;
        email?: string;
        type: UserType;
        roleLabel: string;
        image?: string;
        isActive?: boolean;
        nameThai?: string;
        phone?: string;
        identifier?: string;
        department?: string;
        position?: string;
        major?: string;
        program?: string;
        year?: number;
        semester?: number;
        academicYear?: string;
        companyName?: string;
        companyNameThai?: string;
        industry?: string;
        size?: string;
        website?: string;
        address?: string;
        locationMapUrl?: string;
        productsServices?: string;
        contactPersonName?: string;
        contactPersonRole?: string;
        contactPersonEmail?: string;
        contactPersonPhone?: string;
        socialMedia?: string;
        [key: string]: unknown;
    };

    type UserFormData = {
        name: string;
        nameThai: string;
        email: string;
        phone: string;
        role: Exclude<UserType, 'admin'>;
        status: 'active' | 'inactive';
        identifier: string;
        department: string;
        position: string;
        major: string;
        program: string;
        year: string;
        semester: string;
        academicYear: string;
        companyName: string;
        companyNameThai: string;
        industry: string;
        size: string;
        website: string;
        address: string;
        locationMapUrl: string;
        productsServices: string;
        contactPersonName: string;
        contactPersonRole: string;
        contactPersonEmail: string;
        contactPersonPhone: string;
        socialMedia: string;
    };

    const emptyForm: UserFormData = {
        name: '',
        nameThai: '',
        email: '',
        phone: '',
        role: 'student',
        status: 'active',
        identifier: '',
        department: 'Digital Industry Integration',
        position: '',
        major: 'Digital Industry Integration',
        program: 'bachelor',
        year: '1',
        semester: '1',
        academicYear: '2569',
        companyName: '',
        companyNameThai: '',
        industry: 'Technology',
        size: 'small',
        website: '',
        address: '',
        locationMapUrl: '',
        productsServices: '',
        contactPersonName: '',
        contactPersonRole: 'HR / Company Coordinator',
        contactPersonEmail: '',
        contactPersonPhone: '',
        socialMedia: '',
    };

    const getRoleText = React.useCallback((role: UserType) => {
        switch (role) {
            case 'student': return t.roles.student;
            case 'lecturer': return t.roles.lecturer;
            case 'staff': return t.roles.staff;
            case 'company': return t.roles.company;
            case 'admin': return t.roles.admin;
            default: return role;
        }
    }, [t.roles.admin, t.roles.company, t.roles.lecturer, t.roles.staff, t.roles.student]);

    const mapBackendUser = React.useCallback((item: unknown): UserRow => {
        const source = asRecord(item);
        const role = roleToClient(source.role) as UserType;
        const studentProfile = asRecord(source.studentProfile);
        const lecturerProfile = asRecord(source.lecturerProfile);
        const staffProfile = asRecord(source.staffProfile);
        const companyProfile = asRecord(source.companyProfile);
        const profileName = role === 'company'
            ? asString(companyProfile.companyNameThai, asString(companyProfile.companyName))
            : '';
        const identifier = role === 'student'
            ? asString(studentProfile.studentId)
            : role === 'lecturer'
                ? asString(lecturerProfile.lecturerId)
                : role === 'staff'
                    ? asString(staffProfile.staffId)
                    : asString(companyProfile.companyId);
        const department = role === 'lecturer'
            ? asString(lecturerProfile.department)
            : asString(staffProfile.department);
        const position = role === 'lecturer'
            ? asString(lecturerProfile.position)
            : asString(staffProfile.position);

        return {
            ...source,
            id: asString(source.id),
            name: asString(profileName, asString(source.nameThai, asString(source.name, source.email as string))),
            email: asString(source.email),
            type: role,
            roleLabel: getRoleText(role),
            image: asString(source.avatar),
            isActive: source.isActive !== false,
            nameThai: asString(source.nameThai),
            phone: asString(source.phone),
            identifier,
            department,
            position,
            major: asString(studentProfile.major),
            program: asString(studentProfile.program),
            year: Number(studentProfile.year ?? 1),
            semester: Number(studentProfile.semester ?? 1),
            academicYear: asString(studentProfile.academicYear),
            companyName: asString(companyProfile.companyName),
            companyNameThai: asString(companyProfile.companyNameThai),
            industry: asString(companyProfile.industry),
            size: asString(companyProfile.size),
            website: asString(companyProfile.website),
            address: asString(companyProfile.address),
            locationMapUrl: asString(companyProfile.locationMapUrl),
            productsServices: asString(companyProfile.productsServices),
            contactPersonName: asString(companyProfile.contactPersonName),
            contactPersonRole: asString(companyProfile.contactPersonRole),
            contactPersonEmail: asString(companyProfile.contactPersonEmail),
            contactPersonPhone: asString(companyProfile.contactPersonPhone),
            socialMedia: asString(companyProfile.socialMedia),
            studentProfile,
            lecturerProfile,
            staffProfile,
            companyProfile,
        };
    }, [getRoleText]);

    const [users, setUsers] = useState<UserRow[]>([]);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserRow | null>(null);
    const [formData, setFormData] = useState<UserFormData>(emptyForm);

    const totalUsers = users.length;

    React.useEffect(() => {
        let isMounted = true;
        api.users.list()
            .then((response) => {
                if (!isMounted) return;
                const mapped = response.users.map(mapBackendUser);
                setUsers(mapped);
            })
            .catch(() => undefined);

        return () => {
            isMounted = false;
        };
    }, [mapBackendUser]);

    const handleAdd = () => {
        setEditingUser(null);
        setFormData(emptyForm);
        setIsDialogOpen(true);
    };

    const handleEdit = (user: UserRow) => {
        setEditingUser(user);
        setFormData({
            name: user.name,
            nameThai: user.nameThai || user.name,
            email: user.email || '',
            phone: user.phone || '',
            role: user.type === 'admin' ? 'staff' : user.type,
            status: user.isActive === false ? 'inactive' : 'active',
            identifier: user.identifier || '',
            department: user.department || 'Digital Industry Integration',
            position: user.position || '',
            major: user.major || 'Digital Industry Integration',
            program: user.program || 'bachelor',
            year: String(user.year || 1),
            semester: String(user.semester || 1),
            academicYear: user.academicYear || '2569',
            companyName: user.companyName || user.name,
            companyNameThai: user.companyNameThai || user.nameThai || user.name,
            industry: user.industry || 'Technology',
            size: user.size || 'small',
            website: user.website || '',
            address: user.address || '',
            locationMapUrl: user.locationMapUrl || '',
            productsServices: user.productsServices || '',
            contactPersonName: user.contactPersonName || '',
            contactPersonRole: user.contactPersonRole || 'HR / Company Coordinator',
            contactPersonEmail: user.contactPersonEmail || user.email || '',
            contactPersonPhone: user.contactPersonPhone || user.phone || '',
            socialMedia: user.socialMedia || '',
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm(t.users.deleteConfirm)) {
            try {
                await api.users.remove(id);
                setUsers(users.map(u => u.id === id ? { ...u, isActive: false } : u).filter(u => u.id !== id));
                toast.success(t.users.deleteSuccess);
            } catch (error) {
                toast.error(error instanceof Error ? error.message : t.users.deleteConfirm);
            }
        }
    };

    const buildProfile = (role: Exclude<UserType, 'admin'>) => {
        const suffix = Date.now().toString().slice(-6);
        if (role === 'student') {
            return {
                studentId: formData.identifier || `STU${suffix}`,
                major: formData.major,
                program: formData.program,
                year: Number(formData.year || 1),
                semester: Number(formData.semester || 1),
                academicYear: formData.academicYear,
            };
        }
        if (role === 'lecturer') {
            return {
                lecturerId: formData.identifier || `LEC${suffix}`,
                department: formData.department,
                position: formData.position || 'Lecturer',
            };
        }
        if (role === 'staff') {
            return {
                staffId: formData.identifier || `STA${suffix}`,
                department: formData.department || 'DII Office',
                position: formData.position || 'Staff',
            };
        }
        return {
            companyId: formData.identifier || `COM${suffix}`,
            companyName: formData.companyName || formData.name,
            companyNameThai: formData.companyNameThai || formData.nameThai || formData.name,
            industry: formData.industry,
            size: formData.size,
            website: formData.website || undefined,
            address: formData.address || undefined,
            locationMapUrl: formData.locationMapUrl || undefined,
            productsServices: formData.productsServices || undefined,
            contactPersonName: formData.contactPersonName || undefined,
            contactPersonRole: formData.contactPersonRole || undefined,
            contactPersonEmail: formData.contactPersonEmail || formData.email || undefined,
            contactPersonPhone: formData.contactPersonPhone || undefined,
            socialMedia: formData.socialMedia || undefined,
            onboardingStatus: 'pending_review',
            privacyProtocolAcceptedAt: new Date().toISOString(),
        };
    };

    const handleSave = async () => {
        if (editingUser) {
            try {
                const response = await api.users.update(editingUser.id, {
                    name: formData.name,
                    nameThai: formData.nameThai || formData.name,
                    phone: formData.phone,
                    isActive: formData.status === 'active',
                    roleData: buildProfile(editingUser.type === 'admin' ? 'staff' : editingUser.type),
                });
                setUsers(users.map(u => u.id === editingUser.id ? mapBackendUser(response.user) : u));
                toast.success(t.users.editSuccess);
            } catch (error) {
                toast.error(error instanceof Error ? error.message : t.users.editUser);
                return;
            }
        } else {
            try {
                const response = await api.users.create({
                    name: formData.name,
                    nameThai: formData.nameThai || formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    role: formData.role.toUpperCase(),
                    isActive: formData.status === 'active',
                    profile: buildProfile(formData.role),
                });
                setUsers([mapBackendUser(response.user), ...users]);
                toast.success(response.temporaryPassword ? `${t.users.addSuccess} (${response.temporaryPassword})` : t.users.addSuccess);
            } catch (error) {
                toast.error(error instanceof Error ? error.message : t.users.addUser);
                return;
            }
        }
        setIsDialogOpen(false);
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'student': return <Badge className="bg-blue-100 text-blue-700 dark:text-slate-300 dark:bg-slate-800">{t.roles.student}</Badge>;
            case 'lecturer': return <Badge className="bg-emerald-100 text-emerald-700 dark:text-slate-300 dark:bg-slate-800">{t.roles.lecturer}</Badge>;
            case 'staff': return <Badge className="bg-purple-100 text-purple-700 dark:text-slate-300 dark:bg-slate-800">{t.roles.staff}</Badge>;
            case 'company': return <Badge className="bg-orange-100 text-orange-700 dark:text-slate-300">{t.roles.company}</Badge>;
            default: return <Badge>{role}</Badge>;
        }
    };

    const filteredUsers = users.filter(u =>
    (u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-10">
            {/* Header Section - Bento Grid Style */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                <div>
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2"
                    >
                        <Users className="w-4 h-4 text-purple-500 dark:text-slate-400" />
                        <span>{t.users.totalUsers} {totalUsers} {t.common.person}</span>
                    </motion.div>
                    <motion.h1
                        className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        {t.users.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-violet-500">{t.users.titleHighlight}</span>
                    </motion.h1>
                </div>

                <motion.div className="flex gap-3" variants={itemVariants}>
                    <Button onClick={handleAdd} className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20">
                        <Plus className="w-4 h-4 mr-2" />{t.users.addNew}
                    </Button>
                </motion.div>
            </div>

            {/* Stats Grid - Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div
                    variants={itemVariants}
                    whileHover={{ y: -5 }}
                    className="p-6 rounded-3xl bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-xl shadow-purple-500/20 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 dark:bg-slate-900/50" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm dark:bg-slate-900/50">
                                <GraduationCap className="w-6 h-6" />
                            </div>
                            <span className="font-medium text-white/90">{t.users.studentsLabel}</span>
                        </div>
                        <div className="text-5xl font-bold tracking-tight">{users.filter(u => u.type === 'student').length}</div>
                        <div className="mt-3 text-sm text-purple-100 flex items-center gap-1">
                            <Sparkles className="w-4 h-4" />
                            {t.users.inSystem}
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    variants={itemVariants}
                    whileHover={{ y: -5 }}
                    className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/50 relative overflow-hidden group"
                >
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                                <Users className="w-6 h-6" />
                            </div>
                            <span className="font-medium text-slate-600 dark:text-slate-300">{t.users.lecturersLabel}</span>
                        </div>
                        <div className="text-4xl font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">{users.filter(u => u.type === 'lecturer').length}</div>
                        <div className="mt-3 text-sm text-slate-400">{t.users.teachingStaff}</div>
                    </div>
                </motion.div>

                <motion.div
                    variants={itemVariants}
                    whileHover={{ y: -5 }}
                    className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/50 relative overflow-hidden group"
                >
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                <UserCog className="w-6 h-6" />
                            </div>
                            <span className="font-medium text-slate-600 dark:text-slate-300">{t.users.staffLabel}</span>
                        </div>
                        <div className="text-4xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{users.filter(u => u.type === 'staff').length}</div>
                        <div className="mt-3 text-sm text-slate-400">{t.users.supportStaff}</div>
                    </div>
                </motion.div>

                <motion.div
                    variants={itemVariants}
                    whileHover={{ y: -5 }}
                    className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/50 relative overflow-hidden group"
                >
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors">
                                <Building className="w-6 h-6" />
                            </div>
                            <span className="font-medium text-slate-600 dark:text-slate-300">{t.users.companiesLabel}</span>
                        </div>
                        <div className="text-4xl font-bold text-slate-900 dark:text-white group-hover:text-orange-600 transition-colors">{users.filter(u => u.type === 'company').length}</div>
                        <div className="mt-3 text-sm text-slate-400">{t.users.businessPartners}</div>
                    </div>
                </motion.div>
            </div>

            <motion.div variants={itemVariants}>
                <div className="flex gap-4 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input placeholder={t.users.searchPlaceholder} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                    </div>
                </div>

                <Tabs defaultValue="all" className="space-y-4">
                    <TabsList className="bg-white/80 backdrop-blur-sm border shadow-sm dark:bg-slate-900/50">
                        <TabsTrigger value="all">{t.users.allTab}</TabsTrigger>
                        <TabsTrigger value="student">{t.roles.student}</TabsTrigger>
                        <TabsTrigger value="lecturer">{t.roles.lecturer}</TabsTrigger>
                        <TabsTrigger value="staff">{t.roles.staff}</TabsTrigger>
                        <TabsTrigger value="company">{t.roles.company}</TabsTrigger>
                    </TabsList>

                    {['all', 'student', 'lecturer', 'staff', 'company'].map(tab => (
                        <TabsContent key={tab} value={tab}>
                            <Card className="bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm dark:bg-slate-900/50"><CardContent className="pt-6">
                                <div className="space-y-3">
                                    <AnimatePresence>
                                        {filteredUsers.filter(u => tab === 'all' || u.type === tab).map((user) => (
                                            <motion.div
                                                layout
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                key={user.id}
                                                className="flex items-center justify-between p-4 border rounded-xl hover:shadow-md transition-all bg-white dark:bg-slate-900"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-lg
                                                        ${user.type === 'student' ? 'from-blue-400 to-blue-600' :
                                                            user.type === 'lecturer' ? 'from-green-400 to-green-600' :
                                                                user.type === 'staff' ? 'from-purple-400 to-purple-600' : 'from-orange-400 to-orange-600'}`}
                                                    >
                                                        {(user.name || user.email || '?').charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-gray-900 dark:text-slate-200">{user.name}</div>
                                                        <div className="text-sm text-gray-500 dark:text-slate-400">{user.email || 'No email'}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {getRoleBadge(user.type)}
                                                    <div className="flex gap-1">
                                                        <Button size="sm" variant="ghost" onClick={() => handleEdit(user)}>
                                                            <Edit className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                                                        </Button>
                                                        <Button size="sm" variant="ghost" onClick={() => handleDelete(user.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-300 dark:bg-slate-800">
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                    {filteredUsers.filter(u => tab === 'all' || u.type === tab).length === 0 && (
                                        <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                                            {t.users.noUsers}
                                        </div>
                                    )}
                                </div>
                            </CardContent></Card>
                        </TabsContent>
                    ))}
                </Tabs>
            </motion.div>

            {/* User Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{editingUser ? t.users.editUser : t.users.addUser}</DialogTitle>
                        <DialogDescription>{t.users.formDescription}</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                        <div className="space-y-2">
                            <Label>{t.users.nameLabel}</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder={t.users.namePlaceholder}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>ชื่อภาษาไทย</Label>
                            <Input
                                value={formData.nameThai}
                                onChange={(e) => setFormData({ ...formData, nameThai: e.target.value })}
                                placeholder="ชื่อที่ใช้แสดงในระบบ"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t.users.emailLabel}</Label>
                            <Input
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder={t.users.emailPlaceholder}
                                disabled={!!editingUser}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>เบอร์โทรศัพท์</Label>
                            <Input
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="+66 XX XXX XXXX"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t.users.roleLabel}</Label>
                            <Select
                                value={formData.role}
                                onValueChange={(val) => setFormData({ ...formData, role: val as Exclude<UserType, 'admin'> })}
                                disabled={!!editingUser} // Prevent role change on edit for simplicity
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="student">{t.roles.student}</SelectItem>
                                    <SelectItem value="lecturer">{t.roles.lecturer}</SelectItem>
                                    <SelectItem value="staff">{t.roles.staff}</SelectItem>
                                    <SelectItem value="company">{t.roles.company}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>สถานะบัญชี</Label>
                            <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val as 'active' | 'inactive' })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{formData.role === 'company' ? 'รหัสบริษัท' : formData.role === 'student' ? 'รหัสนักศึกษา' : 'รหัสบุคลากร'}</Label>
                            <Input
                                value={formData.identifier}
                                onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                                placeholder="เว้นว่างเพื่อให้ระบบสร้างให้อัตโนมัติ"
                            />
                        </div>
                        {formData.role === 'student' && (
                            <>
                                <div className="space-y-2">
                                    <Label>สาขา</Label>
                                    <Input value={formData.major} onChange={(e) => setFormData({ ...formData, major: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>หลักสูตร</Label>
                                    <Input value={formData.program} onChange={(e) => setFormData({ ...formData, program: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-3 gap-3 md:col-span-2">
                                    <div className="space-y-2">
                                        <Label>ชั้นปี</Label>
                                        <Input value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>เทอม</Label>
                                        <Input value={formData.semester} onChange={(e) => setFormData({ ...formData, semester: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>ปีการศึกษา</Label>
                                        <Input value={formData.academicYear} onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })} />
                                    </div>
                                </div>
                            </>
                        )}
                        {(formData.role === 'lecturer' || formData.role === 'staff') && (
                            <>
                                <div className="space-y-2">
                                    <Label>หน่วยงาน</Label>
                                    <Input value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>ตำแหน่ง</Label>
                                    <Input value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} />
                                </div>
                            </>
                        )}
                        {formData.role === 'company' && (
                            <>
                                <div className="space-y-2">
                                    <Label>ชื่อบริษัท</Label>
                                    <Input value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>ชื่อบริษัทภาษาไทย</Label>
                                    <Input value={formData.companyNameThai} onChange={(e) => setFormData({ ...formData, companyNameThai: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>อุตสาหกรรม</Label>
                                    <Input value={formData.industry} onChange={(e) => setFormData({ ...formData, industry: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>ขนาดบริษัท</Label>
                                    <Input value={formData.size} onChange={(e) => setFormData({ ...formData, size: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>เว็บไซต์</Label>
                                    <Input value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>ที่อยู่</Label>
                                    <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Location map URL</Label>
                                    <Input value={formData.locationMapUrl} onChange={(e) => setFormData({ ...formData, locationMapUrl: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Products / Services / Digital Industry</Label>
                                    <Textarea value={formData.productsServices} onChange={(e) => setFormData({ ...formData, productsServices: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label>Coordinator / HR Name</Label>
                                        <Input value={formData.contactPersonName} onChange={(e) => setFormData({ ...formData, contactPersonName: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Coordinator Role</Label>
                                        <Input value={formData.contactPersonRole} onChange={(e) => setFormData({ ...formData, contactPersonRole: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label>Coordinator Email</Label>
                                        <Input value={formData.contactPersonEmail} onChange={(e) => setFormData({ ...formData, contactPersonEmail: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Coordinator Phone</Label>
                                        <Input value={formData.contactPersonPhone} onChange={(e) => setFormData({ ...formData, contactPersonPhone: e.target.value })} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Social / Line / Facebook</Label>
                                    <Input value={formData.socialMedia} onChange={(e) => setFormData({ ...formData, socialMedia: e.target.value })} />
                                </div>
                            </>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{t.common.cancel}</Button>
                        <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">
                            <Save className="w-4 h-4 mr-2" />
                            {t.common.save}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
