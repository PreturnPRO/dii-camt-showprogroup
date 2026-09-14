import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Users, UserPlus, Phone, Mail, FileText, Search, Briefcase, GraduationCap, Edit, Trash2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { asBoolean, asRecord, asString } from '@/lib/live-data';
import { toast } from 'sonner';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

type PersonnelRole = 'lecturer' | 'staff' | 'admin';
type PersonnelRow = {
    id: string;
    email: string;
    name: string;
    nameThai: string;
    role: PersonnelRole;
    phone: string;
    isActive: boolean;
    department: string;
    position: string;
    identifier: string;
};

const emptyPersonnelForm = {
    name: '',
    nameThai: '',
    email: '',
    phone: '',
    role: 'staff' as PersonnelRole,
    identifier: '',
    department: 'Digital Industry Integration',
    position: 'Staff',
    status: 'active',
};

const mapPersonnel = (value: unknown): PersonnelRow => {
    const source = asRecord(value);
    const role = asString(source.role, 'STAFF').toLowerCase() as PersonnelRole;
    const lecturerProfile = asRecord(source.lecturerProfile);
    const staffProfile = asRecord(source.staffProfile);
    const adminProfile = asRecord(source.adminProfile);
    const profile = role === 'lecturer' ? lecturerProfile : role === 'admin' ? adminProfile : staffProfile;

    return {
        id: asString(source.id),
        email: asString(source.email),
        name: asString(source.name, asString(source.email)),
        nameThai: asString(source.nameThai, asString(source.name, asString(source.email))),
        role: role === 'lecturer' || role === 'admin' ? role : 'staff',
        phone: asString(source.phone),
        isActive: asBoolean(source.isActive, true),
        department: asString(profile.department, role === 'admin' ? 'Administration' : 'Digital Industry Integration'),
        position: asString(profile.position, role === 'lecturer' ? 'Lecturer' : role === 'admin' ? 'Administrator' : 'Staff'),
        identifier: asString(profile.lecturerId, asString(profile.staffId, asString(profile.adminId))),
    };
};

const roleLabel = (role: PersonnelRole) => {
    if (role === 'lecturer') return 'อาจารย์';
    if (role === 'admin') return 'ผู้ดูแลระบบ';
    return 'เจ้าหน้าที่';
};

export default function Personnel() {
    const { t } = useLanguage();
    const [allPersonnel, setAllPersonnel] = React.useState<PersonnelRow[]>([]);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [editingPerson, setEditingPerson] = React.useState<PersonnelRow | null>(null);
    const [formData, setFormData] = React.useState(emptyPersonnelForm);

    const reloadPersonnel = React.useCallback(async () => {
        const response = await api.personnel.list();
        setAllPersonnel(response.personnel.map(mapPersonnel));
    }, []);

    React.useEffect(() => {
        let mounted = true;

        api.personnel
            .list()
            .then((response) => {
                if (!mounted) return;
                setAllPersonnel(response.personnel.map(mapPersonnel));
            })
            .catch((error) => {
                console.warn('Unable to load personnel from API', error);
            });

        return () => {
            mounted = false;
        };
    }, []);

    const filteredPersonnel = allPersonnel.filter((person) => {
        const query = searchQuery.toLowerCase();
        return (
            person.nameThai.toLowerCase().includes(query) ||
            person.name.toLowerCase().includes(query) ||
            person.email.toLowerCase().includes(query) ||
            person.department.toLowerCase().includes(query) ||
            person.position.toLowerCase().includes(query)
        );
    });
    const lecturerCount = allPersonnel.filter(person => person.role === 'lecturer').length;
    const staffCount = allPersonnel.filter(person => person.role === 'staff').length;

    const openCreateDialog = () => {
        setEditingPerson(null);
        setFormData(emptyPersonnelForm);
        setIsDialogOpen(true);
    };

    const openEditDialog = (person: PersonnelRow) => {
        setEditingPerson(person);
        setFormData({
            name: person.name,
            nameThai: person.nameThai,
            email: person.email,
            phone: person.phone,
            role: person.role,
            identifier: person.identifier,
            department: person.department,
            position: person.position,
            status: person.isActive ? 'active' : 'inactive',
        });
        setIsDialogOpen(true);
    };

    const profilePayload = () => {
        if (formData.role === 'lecturer') {
            return {
                lecturerId: formData.identifier || undefined,
                department: formData.department,
                position: formData.position || 'Lecturer',
            };
        }
        if (formData.role === 'admin') {
            return {
                adminId: formData.identifier || undefined,
                isSuperAdmin: false,
                permissions: ['reports', 'users', 'operations'],
            };
        }
        return {
            staffId: formData.identifier || undefined,
            department: formData.department,
            position: formData.position || 'Staff',
            canManageUsers: true,
            canManageCourses: true,
            canManageSchedules: true,
            canViewReports: true,
            canManageInternships: true,
        };
    };

    const savePersonnel = async () => {
        if (!formData.name.trim() || !formData.email.trim()) {
            toast.error('กรุณากรอกชื่อและอีเมล');
            return;
        }

        try {
            if (editingPerson) {
                await api.users.update(editingPerson.id, {
                    name: formData.name,
                    nameThai: formData.nameThai || formData.name,
                    phone: formData.phone,
                    isActive: formData.status === 'active',
                    roleData: profilePayload(),
                });
                toast.success('อัปเดตบุคลากรแล้ว');
            } else {
                await api.users.create({
                    name: formData.name,
                    nameThai: formData.nameThai || formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    role: formData.role.toUpperCase(),
                    isActive: formData.status === 'active',
                    profile: profilePayload(),
                });
                toast.success('เพิ่มบุคลากรแล้ว');
            }
            await reloadPersonnel();
            setIsDialogOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Unable to save personnel');
        }
    };

    const deactivatePersonnel = async (person: PersonnelRow) => {
        if (!confirm('ปิดใช้งานบัญชีนี้?')) return;
        try {
            await api.users.remove(person.id);
            setAllPersonnel((current) => current.map((item) => item.id === person.id ? { ...item, isActive: false } : item));
            toast.success('ปิดใช้งานบัญชีแล้ว');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Unable to deactivate account');
        }
    };

    const exportPersonnel = () => {
        const rows = filteredPersonnel.map((person) => [
            person.identifier,
            person.nameThai,
            person.email,
            roleLabel(person.role),
            person.department,
            person.position,
            person.phone,
            person.isActive ? 'active' : 'inactive',
        ]);
        const csv = [['id', 'name', 'email', 'role', 'department', 'position', 'phone', 'status'], ...rows]
            .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'personnel.csv';
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-10">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2">
                        <Users className="w-4 h-4 text-purple-500 dark:text-slate-400" />
                        <span>{t.personnelPage.subtitle}</span>
                    </motion.div>
                    <motion.h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        {t.personnelPage.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-violet-600">{t.personnelPage.titleHighlight}</span>
                    </motion.h1>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-slate-500 mt-2 dark:text-slate-400">
                        {t.personnelPage.totalPersonnel} {allPersonnel.length} คน
                    </motion.p>
                </div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <Button onClick={openCreateDialog} className="rounded-xl bg-purple-600 hover:bg-purple-700 shadow-lg h-11">
                        <UserPlus className="w-4 h-4 mr-2" /> {t.personnelPage.addNew}
                    </Button>
                </motion.div>
            </div>

            <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { icon: GraduationCap, label: t.personnelPage.lecturers, value: String(lecturerCount), gradient: '', shadow: '' },
                    { icon: Briefcase, label: t.personnelPage.staffLabel, value: String(staffCount), gradient: '', shadow: '' },
                    { icon: Users, label: t.personnelPage.allTab, value: String(allPersonnel.length), gradient: '', shadow: '' },
                    { icon: Mail, label: t.personnelPage.online, value: String(allPersonnel.filter((person) => person.isActive).length), gradient: '', shadow: '' },
                ].map((stat, i) => (
                    <motion.div key={i} whileHover={{ scale: 1.02 }} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.gradient} p-5 text-white shadow-sm ${stat.shadow}`}>
                        
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-2 rounded-xl bg-blue-500/10 dark:bg-blue-500/10"><stat.icon className="w-4 h-4" /></div>
                                <span className="text-sm font-medium text-white/90">{stat.label}</span>
                            </div>
                            <div className="text-3xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-slate-100">{stat.value}</div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={t.personnelPage.searchPlaceholder} className="pl-10 rounded-xl bg-white/80 border-slate-200 dark:border-slate-700" />
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="rounded-xl" onClick={exportPersonnel}>{t.personnelPage.exportExcel}</Button>
                    <Button variant="outline" className="rounded-xl" onClick={() => window.print()}>
                        <Printer className="w-4 h-4 mr-2" /> {t.personnelPage.printReport}
                    </Button>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredPersonnel.length === 0 && (
                    <div className="md:col-span-2 lg:col-span-3 rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                        ไม่พบข้อมูลบุคลากรจากระบบ
                    </div>
                )}
                {filteredPersonnel.map((person) => (
                    <motion.div key={person.id} variants={itemVariants} whileHover={{ y: -4 }}
                        className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all group">
                        <div className="flex gap-4 mb-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center text-xl font-bold text-white shadow-lg">
                                {(person.nameThai || person.email).charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg truncate">{person.nameThai}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                    {roleLabel(person.role)} • {person.department || person.position}
                                </p>
                                <div className="mt-2 flex gap-2">
                                    <Badge variant="outline">{person.identifier || '-'}</Badge>
                                    <Badge className={person.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}>
                                        {person.isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2 text-sm mb-4">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                <Mail className="w-4 h-4" /><span className="truncate">{person.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                <Phone className="w-4 h-4" /><span>{person.phone || '-'}</span>
                            </div>
                        </div>
                        <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                            <Button size="sm" variant="outline" className="flex-1 rounded-xl text-xs" onClick={() => window.location.href = `mailto:${person.email}`}>
                                <FileText className="w-3.5 h-3.5 mr-1.5" /> {t.personnelPage.history}
                            </Button>
                            <Button size="sm" className="flex-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs shadow-lg" onClick={() => openEditDialog(person)}>
                                <Edit className="w-3.5 h-3.5 mr-1.5" /> {t.personnelPage.manage}
                            </Button>
                            <Button size="sm" variant="ghost" className="rounded-xl text-red-500" onClick={() => deactivatePersonnel(person)}>
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </motion.div>
                ))}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingPerson ? 'แก้ไขบุคลากร' : 'เพิ่มบุคลากร'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                        <div className="space-y-2">
                            <Label>ชื่อภาษาอังกฤษ</Label>
                            <Input value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>ชื่อภาษาไทย</Label>
                            <Input value={formData.nameThai} onChange={(event) => setFormData({ ...formData, nameThai: event.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>อีเมล</Label>
                            <Input value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} disabled={!!editingPerson} />
                        </div>
                        <div className="space-y-2">
                            <Label>เบอร์โทร</Label>
                            <Input value={formData.phone} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>บทบาท</Label>
                            <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as PersonnelRole })} disabled={!!editingPerson}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="lecturer">อาจารย์</SelectItem>
                                    <SelectItem value="staff">เจ้าหน้าที่</SelectItem>
                                    <SelectItem value="admin">ผู้ดูแลระบบ</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>สถานะ</Label>
                            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>รหัสบุคลากร</Label>
                            <Input value={formData.identifier} onChange={(event) => setFormData({ ...formData, identifier: event.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>หน่วยงาน</Label>
                            <Input value={formData.department} onChange={(event) => setFormData({ ...formData, department: event.target.value })} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>ตำแหน่ง</Label>
                            <Input value={formData.position} onChange={(event) => setFormData({ ...formData, position: event.target.value })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>ยกเลิก</Button>
                        <Button onClick={savePersonnel} className="bg-purple-600 hover:bg-purple-700">บันทึก</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
