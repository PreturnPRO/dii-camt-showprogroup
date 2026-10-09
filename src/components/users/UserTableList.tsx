import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Edit, Trash2, KeyRound } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import type { UserRow, UserType } from './types';

interface UserTableListProps {
  users: UserRow[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onEdit: (user: UserRow) => void;
  onDelete: (id: string) => void;
  onResetPassword?: (user: UserRow) => void;
  /** false hides edit/delete/reset for rows this viewer may not manage */
  canManage?: (type: string) => boolean;
  getRoleBadge: (role: string) => React.ReactNode;
}

export function UserTableList({
  users,
  searchQuery,
  onSearchChange,
  onEdit,
  onDelete,
  onResetPassword,
  canManage = () => true,
  getRoleBadge,
}: UserTableListProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={t.users.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 h-auto rounded-xl border border-slate-200/70 dark:border-slate-700/60 inline-flex flex-wrap justify-start shadow-xs">
          <TabsTrigger value="all">{t.users.allTab}</TabsTrigger>
          <TabsTrigger value="student">{t.roles.student}</TabsTrigger>
          <TabsTrigger value="lecturer">{t.roles.lecturer}</TabsTrigger>
          <TabsTrigger value="staff">{t.roles.staff}</TabsTrigger>
          <TabsTrigger value="company">{t.roles.company}</TabsTrigger>
          <TabsTrigger value="admin">{t.roles.admin}</TabsTrigger>
        </TabsList>

        {(['all', 'student', 'lecturer', 'staff', 'company', 'admin'] as const).map((tab) => {
          const tabUsers = users.filter((u) => tab === 'all' || u.type === tab);

          return (
            <TabsContent key={tab} value={tab}>
              <Card className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <AnimatePresence>
                      {tabUsers.map((user) => (
                        <motion.div
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          key={user.id}
                          data-testid="user-row"
                          className="flex flex-wrap items-center justify-between gap-3 p-4 border rounded-xl hover:shadow-md transition-all bg-white dark:bg-slate-900"
                        >
                          <div className="flex min-w-0 items-center gap-4">
                            <div
                              className={`w-12 h-12 shrink-0 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-lg
                              ${
                                user.type === 'student'
                                  ? 'from-blue-400 to-blue-600'
                                  : user.type === 'lecturer'
                                  ? 'from-green-400 to-green-600'
                                  : user.type === 'staff'
                                  ? 'from-purple-400 to-purple-600'
                                  : user.type === 'company'
                                  ? 'from-orange-400 to-orange-600'
                                  : 'from-red-400 to-red-600'
                              }`}
                            >
                              {(user.name || user.email || '?').charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-gray-900 dark:text-slate-200 flex flex-wrap items-center gap-2">
                                {user.name}
                                {user.isActive === false && (
                                  <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950 dark:text-red-200">ระงับ (Inactive)</span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-slate-400 break-all">
                                {user.email || 'No email'}
                              </div>
                              <div className="text-xs text-gray-400 dark:text-slate-500">
                                เข้าระบบล่าสุด:{' '}
                                {user.lastLogin
                                  ? new Date(user.lastLogin).toLocaleString('th-TH', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : 'ยังไม่เคยเข้าระบบ'}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            {getRoleBadge(user.type)}
                            {canManage(user.type) && <div className="flex gap-1">
                              {onResetPassword && (
                                <Button size="sm" variant="ghost" onClick={() => onResetPassword(user)} aria-label="รีเซ็ตรหัสผ่าน" title="รีเซ็ตรหัสผ่าน">
                                  <KeyRound className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" onClick={() => onEdit(user)} aria-label="แก้ไข" title="แก้ไข">
                                <Edit className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onDelete(user.id)}
                                aria-label="ลบ"
                                title="ลบ"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-300 dark:bg-slate-800"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {tabUsers.length === 0 && (
                      <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                        {t.users.noUsers}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
