import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Plus,
  ChevronDown,
  Upload,
  GraduationCap,
  UserCog,
  Building,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { TemporaryPasswordsDialog, type TemporaryCredential } from '@/components/common/TemporaryPasswordsDialog';
import { credentialsFromImport, generateTemporaryPassword } from '@/lib/temporary-credentials';
import { ImportMappingDialog } from '@/components/common/ImportMappingDialog';
import { buildSafeIdentifier, companyImportFields, studentImportFields, type MappedImportRow } from '@/lib/import-mapping';
import type { UserRow, UserType } from '@/components/users/types';
import { mapBackendUser } from '@/components/users/user-mapper';
import { UserStatsCards } from '@/components/users/UserStatsCards';
import { UserTableList } from '@/components/users/UserTableList';
import { StudentUserDialog } from '@/components/users/forms/StudentUserDialog';
import { LecturerUserDialog } from '@/components/users/forms/LecturerUserDialog';
import { StaffUserDialog } from '@/components/users/forms/StaffUserDialog';
import { CompanyUserDialog } from '@/components/users/forms/CompanyUserDialog';
import type {
  StudentUserFormValues,
  LecturerUserFormValues,
  StaffUserFormValues,
  CompanyUserFormValues,
} from '@/schemas/user-forms.schema';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

type ActiveDialogState =
  | { type: 'student'; user: UserRow | null }
  | { type: 'lecturer'; user: UserRow | null }
  | { type: 'staff'; user: UserRow | null }
  | { type: 'company'; user: UserRow | null }
  | null;

export default function UsersPage() {
  const { t, language } = useLanguage();
  const { user: currentUser } = useAuth();
  // Mirrors backend user-policy: staff manage students, lecturers and companies; only admins manage staff/admins.
  const isAdmin = currentUser?.role === 'admin';
  const canManage = (type: string) => isAdmin || ['student', 'lecturer', 'company'].includes(type);
  const [credentials, setCredentials] = useState<TemporaryCredential[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isCompanyImportOpen, setIsCompanyImportOpen] = useState(false);
  const [isStudentImportOpen, setIsStudentImportOpen] = useState(false);
  const [activeDialog, setActiveDialog] = useState<ActiveDialogState>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getRoleText = useCallback((role: UserType) => {
    switch (role) {
      case 'student': return t.roles.student;
      case 'lecturer': return t.roles.lecturer;
      case 'staff': return t.roles.staff;
      case 'company': return t.roles.company;
      case 'admin': return t.roles.admin;
      default: return role;
    }
  }, [t.roles]);

  const parseUser = useCallback(
    (item: unknown) => mapBackendUser(item, getRoleText),
    [getRoleText],
  );

  // active and suspended accounts load separately; GET /users hides inactive ones unless asked
  const [inactiveUsers, setInactiveUsers] = useState<UserRow[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const loadUsers = useCallback(async () => {
    try {
      const [active, inactive] = await Promise.all([api.users.list(), api.users.list('?isActive=false')]);
      setUsers(active.users.map(parseUser));
      setInactiveUsers(inactive.users.map(parseUser));
    } catch (error) {
      console.error('Failed to load users', error);
      toast.error(language === 'th' ? 'โหลดรายชื่อผู้ใช้ไม่สำเร็จ' : 'Could not load users');
    }
  }, [parseUser, language]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleEdit = (user: UserRow) => {
    if (user.type === 'student') {
      setActiveDialog({ type: 'student', user });
    } else if (user.type === 'lecturer') {
      setActiveDialog({ type: 'lecturer', user });
    } else if (user.type === 'company') {
      setActiveDialog({ type: 'company', user });
    } else {
      setActiveDialog({ type: 'staff', user });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(t.users.deleteConfirm)) {
      try {
        await api.users.remove(id);
        setUsers((current) => current.filter((u) => u.id !== id));
        toast.success(t.users.deleteSuccess);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t.users.deleteConfirm);
      }
    }
  };

  // Submit handlers for each role
  const handleStudentSubmit = async (values: StudentUserFormValues) => {
    setIsSubmitting(true);
    try {
      if (activeDialog?.user) {
        const response = await api.users.update(activeDialog.user.id, {
          name: values.name,
          nameThai: values.nameThai || values.name,
          phone: values.phone,
          isActive: values.status === 'active',
          roleData: {
            major: values.major,
            program: values.program,
            year: values.year,
            semester: values.semester,
            academicYear: values.academicYear,
            advisorId: values.advisorId || null,
          },
        });
        setUsers((current) =>
          current.map((u) => (u.id === activeDialog.user!.id ? parseUser(response.user) : u)),
        );
        toast.success(t.users.editSuccess);
        void loadUsers();
      } else {
        const response = await api.users.create({
          name: values.name,
          nameThai: values.nameThai || values.name,
          email: values.email,
          phone: values.phone,
          role: 'STUDENT',
          password: values.password || undefined,
          isActive: values.status === 'active',
          profile: {
            studentId: values.studentId,
            major: values.major,
            program: values.program,
            year: values.year,
            semester: values.semester,
            academicYear: values.academicYear,
            advisorId: values.advisorId || undefined,
          },
        });
        const created = parseUser(response.user);
        setUsers((current) => [created, ...current]);
        toast.success(t.users.addSuccess);
        if (response.temporaryPassword) {
          setCredentials([{ label: created.name, email: created.email ?? '', temporaryPassword: response.temporaryPassword }]);
        }
      }
      setActiveDialog(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.users.addUser);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLecturerSubmit = async (values: LecturerUserFormValues) => {
    setIsSubmitting(true);
    try {
      const suffix = Date.now().toString().slice(-6);
      if (activeDialog?.user) {
        const response = await api.users.update(activeDialog.user.id, {
          name: values.name,
          nameThai: values.nameThai || values.name,
          phone: values.phone,
          isActive: values.status === 'active',
          roleData: {
            department: values.department,
            position: values.position,
          },
        });
        setUsers((current) =>
          current.map((u) => (u.id === activeDialog.user!.id ? parseUser(response.user) : u)),
        );
        toast.success(t.users.editSuccess);
        void loadUsers();
      } else {
        const response = await api.users.create({
          name: values.name,
          nameThai: values.nameThai || values.name,
          email: values.email,
          phone: values.phone,
          role: 'LECTURER',
          password: values.password || undefined,
          isActive: values.status === 'active',
          profile: {
            lecturerId: values.lecturerId || `LEC${suffix}`,
            department: values.department,
            position: values.position,
          },
        });
        const created = parseUser(response.user);
        setUsers((current) => [created, ...current]);
        toast.success(t.users.addSuccess);
        if (response.temporaryPassword) {
          setCredentials([{ label: created.name, email: created.email ?? '', temporaryPassword: response.temporaryPassword }]);
        }
      }
      setActiveDialog(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.users.addUser);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStaffSubmit = async (values: StaffUserFormValues) => {
    setIsSubmitting(true);
    try {
      const suffix = Date.now().toString().slice(-6);
      if (activeDialog?.user) {
        const response = await api.users.update(activeDialog.user.id, {
          name: values.name,
          nameThai: values.nameThai || values.name,
          phone: values.phone,
          isActive: values.status === 'active',
          roleData: {
            department: values.department,
            position: values.position,
          },
        });
        setUsers((current) =>
          current.map((u) => (u.id === activeDialog.user!.id ? parseUser(response.user) : u)),
        );
        toast.success(t.users.editSuccess);
        void loadUsers();
      } else {
        const response = await api.users.create({
          name: values.name,
          nameThai: values.nameThai || values.name,
          email: values.email,
          phone: values.phone,
          role: 'STAFF',
          password: values.password || undefined,
          isActive: values.status === 'active',
          profile: {
            staffId: values.staffId || `STA${suffix}`,
            department: values.department,
            position: values.position,
          },
        });
        const created = parseUser(response.user);
        setUsers((current) => [created, ...current]);
        toast.success(t.users.addSuccess);
        if (response.temporaryPassword) {
          setCredentials([{ label: created.name, email: created.email ?? '', temporaryPassword: response.temporaryPassword }]);
        }
      }
      setActiveDialog(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.users.addUser);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompanySubmit = async (values: CompanyUserFormValues) => {
    setIsSubmitting(true);
    try {
      const suffix = Date.now().toString().slice(-6);
      if (activeDialog?.user) {
        const response = await api.users.update(activeDialog.user.id, {
          name: values.companyName,
          nameThai: values.companyNameThai || values.companyName,
          phone: values.phone,
          isActive: values.status === 'active',
          roleData: {
            companyName: values.companyName,
            companyNameThai: values.companyNameThai,
            industry: values.industry,
            size: values.size,
            website: values.website || undefined,
            address: values.address || undefined,
            locationMapUrl: values.locationMapUrl || undefined,
            productsServices: values.productsServices || undefined,
            contactPersonName: values.contactPersonName || undefined,
            contactPersonRole: values.contactPersonRole || undefined,
            contactPersonEmail: values.contactPersonEmail || undefined,
            contactPersonPhone: values.contactPersonPhone || undefined,
            socialMedia: values.socialMedia || undefined,
          },
        });
        setUsers((current) =>
          current.map((u) => (u.id === activeDialog.user!.id ? parseUser(response.user) : u)),
        );
        toast.success(t.users.editSuccess);
        void loadUsers();
      } else {
        const response = await api.users.create({
          name: values.companyName,
          nameThai: values.companyNameThai || values.companyName,
          email: values.email,
          phone: values.phone,
          role: 'COMPANY',
          password: values.password || undefined,
          isActive: values.status === 'active',
          profile: {
            companyId: values.companyId || `COM${suffix}`,
            companyName: values.companyName,
            companyNameThai: values.companyNameThai || values.companyName,
            industry: values.industry,
            size: values.size,
            website: values.website || undefined,
            address: values.address || undefined,
            locationMapUrl: values.locationMapUrl || undefined,
            productsServices: values.productsServices || undefined,
            contactPersonName: values.contactPersonName || undefined,
            contactPersonRole: values.contactPersonRole || undefined,
            contactPersonEmail: values.contactPersonEmail || values.email || undefined,
            contactPersonPhone: values.contactPersonPhone || values.phone || undefined,
            socialMedia: values.socialMedia || undefined,
            onboardingStatus: 'pending_review',
            privacyProtocolAcceptedAt: new Date().toISOString(),
          },
        });
        const created = parseUser(response.user);
        setUsers((current) => [created, ...current]);
        toast.success(t.users.addSuccess);
        if (response.temporaryPassword) {
          setCredentials([{ label: created.name, email: created.email ?? '', temporaryPassword: response.temporaryPassword }]);
        }
      }
      setActiveDialog(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.users.addUser);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (user: UserRow) => {
    const temporaryPassword = generateTemporaryPassword();
    try {
      await api.users.update(user.id, { password: temporaryPassword });
      setCredentials([{ label: user.name, email: user.email ?? '', temporaryPassword }]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'รีเซ็ตรหัสผ่านไม่สำเร็จ');
    }
  };

  const handleCompanyImport = async (rows: MappedImportRow[]) => {
    const response = await api.users.importCompanies(
      rows.map((row) => {
        const values = row.values;
        const companyId = values.companyId;
        const companyName = values.companyName;
        const phone = values.phone;
        const email =
          values.email ||
          `${buildSafeIdentifier(phone || companyId, `company${row.rowNumber}`)}@company.showpro.local`;

        return {
          rowNumber: row.rowNumber,
          companyId,
          companyName,
          companyNameThai: values.companyNameThai || companyName,
          industry: values.industry,
          size: values.size || 'small',
          website: values.website || undefined,
          address: values.address || undefined,
          productsServices: values.productsServices || undefined,
          contactPersonName: values.contactPersonName || undefined,
          contactPersonRole: values.contactPersonRole || undefined,
          contactPersonEmail: values.contactPersonEmail || values.email || undefined,
          contactPersonPhone: values.contactPersonPhone || phone || undefined,
          socialMedia: values.socialMedia || undefined,
          email,
          phone,
          password: values.password || undefined,
        };
      }),
    );

    await loadUsers();
    setCredentials(credentialsFromImport(response.results));
    toast.success(`Import บริษัทสำเร็จ ${response.createdCount} รายการ`);
    if (response.failedCount > 0) {
      toast.error(`Import บริษัทไม่สำเร็จ ${response.failedCount} รายการ`);
    }

    return { successCount: response.createdCount, failureCount: response.failedCount };
  };

  // self-registration is closed, so this import (or "add user") is how students get accounts
  const handleStudentImport = async (rows: MappedImportRow[]) => {
    const response = await api.users.importStudents(
      rows.map((row) => {
        const values = row.values;
        const name = values.name;
        return {
          rowNumber: row.rowNumber,
          studentId: values.studentId,
          major: values.major || 'Digital Industry Integration',
          program: values.program || 'bachelor',
          year: Number(values.year || 1),
          semester: Number(values.semester || 1),
          academicYear: values.academicYear,
          academicStatus: values.academicStatus || 'normal',
          advisorEmail: values.advisorEmail || undefined,
          name,
          nameThai: values.nameThai || name,
          email:
            values.email ||
            `${buildSafeIdentifier(values.studentId, `student${row.rowNumber}`)}@student.showpro.local`,
          phone: values.phone || undefined,
          password: values.password || undefined,
        };
      }),
    );

    await loadUsers();
    setCredentials(credentialsFromImport(response.results));
    toast.success(`Import นักศึกษาสำเร็จ ${response.createdCount} รายการ`);
    if (response.failedCount > 0) {
      toast.error(`Import นักศึกษาไม่สำเร็จ ${response.failedCount} รายการ`);
    }

    return { successCount: response.createdCount, failureCount: response.failedCount };
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'student':
        return (
          <Badge className="bg-blue-100 text-blue-700 dark:text-slate-300 dark:bg-slate-800">
            {t.roles.student}
          </Badge>
        );
      case 'lecturer':
        return (
          <Badge className="bg-emerald-100 text-emerald-700 dark:text-slate-300 dark:bg-slate-800">
            {t.roles.lecturer}
          </Badge>
        );
      case 'staff':
        return (
          <Badge className="bg-purple-100 text-purple-700 dark:text-slate-300 dark:bg-slate-800">
            {t.roles.staff}
          </Badge>
        );
      case 'company':
        return (
          <Badge className="bg-orange-100 text-orange-700 dark:text-slate-300">
            {t.roles.company}
          </Badge>
        );
      case 'admin':
        return (
          <Badge className="bg-red-100 text-red-700 dark:text-slate-300 dark:bg-slate-800">
            {t.roles.admin}
          </Badge>
        );
      default:
        return <Badge>{role}</Badge>;
    }
  };

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return (showInactive ? inactiveUsers : users).filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        getRoleText(u.type).toLowerCase().includes(q),
    );
  }, [users, inactiveUsers, showInactive, searchQuery, getRoleText]);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-10">
      <TemporaryPasswordsDialog items={credentials} onClose={() => setCredentials([])} />
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-6">
        <div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2"
          >
            <Users className="w-4 h-4 text-purple-500 dark:text-slate-400" />
            <span>
              {t.users.totalUsers} {users.length} {t.common.person}
            </span>
          </motion.div>
          <motion.h1
            className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white leading-snug"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {t.users.title}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-violet-500">
              {t.users.titleHighlight}
            </span>
          </motion.h1>
        </div>

        <motion.div className="flex flex-wrap gap-3" variants={itemVariants}>
          <Button variant="outline" onClick={() => setIsStudentImportOpen(true)} className="rounded-xl">
            <Upload className="w-4 h-4 mr-2" />
            Import นักศึกษา
          </Button>
          <Button variant="outline" onClick={() => setIsCompanyImportOpen(true)} className="rounded-xl">
            <Upload className="w-4 h-4 mr-2" />
            Import บริษัท
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20">
                <Plus className="w-4 h-4 mr-2" />
                {t.users.addNew}
                <ChevronDown className="w-4 h-4 ml-2 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg">
              <DropdownMenuItem onClick={() => setActiveDialog({ type: 'student', user: null })}>
                <GraduationCap className="w-4 h-4 mr-2 text-blue-500" />
                {t.roles.student}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveDialog({ type: 'lecturer', user: null })}>
                <Users className="w-4 h-4 mr-2 text-emerald-500" />
                {t.roles.lecturer}
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem onClick={() => setActiveDialog({ type: 'staff', user: null })}>
                  <UserCog className="w-4 h-4 mr-2 text-purple-500" />
                  {t.roles.staff}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setActiveDialog({ type: 'company', user: null })}>
                <Building className="w-4 h-4 mr-2 text-orange-500" />
                {t.roles.company}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </motion.div>
      </div>

      <ImportMappingDialog
        open={isCompanyImportOpen}
        onOpenChange={setIsCompanyImportOpen}
        title="Import ข้อมูลบริษัท"
        description="อัปโหลด Excel/CSV แล้วกำหนดว่าคอลัมน์ใดตรงกับข้อมูลบริษัทก่อนสร้างบัญชี"
        fields={companyImportFields}
        onImport={handleCompanyImport}
      />

      <ImportMappingDialog
        open={isStudentImportOpen}
        onOpenChange={setIsStudentImportOpen}
        title="Import รายชื่อนักศึกษา"
        description="อัปโหลด Excel/CSV ของรุ่นนั้น ๆ แล้วกำหนดคอลัมน์ก่อนสร้างบัญชีนักศึกษา"
        fields={studentImportFields}
        onImport={handleStudentImport}
      />

      {/* Stats Bento Grid */}
      <UserStatsCards users={users} />

      {/* Main Table and Tabs View */}
      <motion.div variants={itemVariants}>
        <div className="mb-3 flex justify-end">
          <Button
            variant={showInactive ? 'default' : 'outline'}
            data-testid="show-inactive"
            aria-pressed={showInactive}
            onClick={() => setShowInactive((v) => !v)}
            className="rounded-xl"
          >
            {showInactive
              ? (language === 'th' ? 'กลับไปบัญชีที่ใช้งานอยู่' : 'Back to active accounts')
              : (language === 'th' ? `บัญชีที่ระงับ (${inactiveUsers.length})` : `Suspended accounts (${inactiveUsers.length})`)}
          </Button>
        </div>
        <UserTableList
          users={filteredUsers}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onResetPassword={handleResetPassword}
          canManage={canManage}
          getRoleBadge={getRoleBadge}
        />
      </motion.div>

      {/* Role-Specific Form Dialogs */}
      <StudentUserDialog
        open={activeDialog?.type === 'student'}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        onSubmit={handleStudentSubmit}
        isSubmitting={isSubmitting}
        initialData={activeDialog?.type === 'student' ? activeDialog.user : null}
      />

      <LecturerUserDialog
        open={activeDialog?.type === 'lecturer'}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        onSubmit={handleLecturerSubmit}
        isSubmitting={isSubmitting}
        initialData={activeDialog?.type === 'lecturer' ? activeDialog.user : null}
      />

      <StaffUserDialog
        open={activeDialog?.type === 'staff'}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        onSubmit={handleStaffSubmit}
        isSubmitting={isSubmitting}
        initialData={activeDialog?.type === 'staff' ? activeDialog.user : null}
      />

      <CompanyUserDialog
        open={activeDialog?.type === 'company'}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        onSubmit={handleCompanySubmit}
        isSubmitting={isSubmitting}
        initialData={activeDialog?.type === 'company' ? activeDialog.user : null}
      />
    </motion.div>
  );
}
