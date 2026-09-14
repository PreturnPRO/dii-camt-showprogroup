import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { PieChart, TrendingUp, TrendingDown, DollarSign, FileText, CreditCard, AlertCircle, Plus, Wallet, Receipt, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { asDate, asNumber, asRecord, asString } from '@/lib/live-data';
import { toast } from 'sonner';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

type BudgetRow = {
    id: string;
    type: string;
    category: string;
    amount: number;
    description: string;
    date: string;
    status: string;
    note?: string;
};

const emptyBudgetForm = {
    type: 'expense',
    category: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    status: 'pending',
    note: '',
};

export default function Budget() {
    const { t } = useLanguage();
    const [transactions, setTransactions] = React.useState<BudgetRow[]>([]);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [editingTx, setEditingTx] = React.useState<BudgetRow | null>(null);
    const [formData, setFormData] = React.useState(emptyBudgetForm);
    const totalIncome = transactions.filter((tx) => tx.type !== 'expense').reduce((sum, tx) => sum + tx.amount, 0);
    const totalExpense = transactions.filter((tx) => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
    const totalBudget = totalIncome;
    const remainingBudget = totalIncome - totalExpense;
    const pendingCount = transactions.filter((tx) => tx.status === 'pending').length;
    const categoryBreakdown = Object.entries(
        transactions
            .filter((tx) => tx.type === 'expense')
            .reduce<Record<string, number>>((acc, tx) => {
                acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
                return acc;
            }, {}),
    ).map(([label, amount]) => ({
        label,
        percent: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
    }));

    const mapBudget = React.useCallback((item: unknown): BudgetRow => {
        const budget = asRecord(item);
        return {
            id: asString(budget.id),
            type: asString(budget.type, 'expense'),
            category: asString(budget.category, '-'),
            amount: asNumber(budget.amount, 0),
            description: asString(budget.title, asString(budget.note, '-')),
            date: asDate(budget.date).toISOString().split('T')[0],
            status: asString(budget.status, 'pending'),
            note: asString(budget.note),
        };
    }, []);

    React.useEffect(() => {
        let isMounted = true;
        api.budget.list()
            .then((response) => {
                if (!isMounted) return;
                setTransactions(response.budget.map(mapBudget));
            })
            .catch(() => undefined);

        return () => {
            isMounted = false;
        };
    }, [mapBudget]);

    const openCreateDialog = () => {
        setEditingTx(null);
        setFormData(emptyBudgetForm);
        setIsDialogOpen(true);
    };

    const openEditDialog = (tx: BudgetRow) => {
        setEditingTx(tx);
        setFormData({
            type: tx.type,
            category: tx.category,
            amount: String(tx.amount),
            description: tx.description,
            date: tx.date,
            status: tx.status,
            note: tx.note || '',
        });
        setIsDialogOpen(true);
    };

    const buildBudgetPayload = (statusOverride?: string) => ({
        title: formData.description,
        amount: Number(formData.amount),
        type: formData.type,
        category: formData.category,
        date: formData.date,
        status: statusOverride || formData.status,
        note: formData.note || formData.description,
    });

    const saveBudget = async () => {
        if (!formData.description.trim() || !formData.category.trim() || Number(formData.amount) <= 0) {
            toast.error('กรุณากรอกข้อมูลงบประมาณให้ครบถ้วน');
            return;
        }

        try {
            if (editingTx) {
                const response = await api.budget.update(editingTx.id, buildBudgetPayload());
                setTransactions((current) => current.map((tx) => tx.id === editingTx.id ? mapBudget(response.budget) : tx));
                toast.success('อัปเดตรายการงบประมาณแล้ว');
            } else {
                const response = await api.budget.create(buildBudgetPayload());
                setTransactions((current) => [mapBudget(response.budget), ...current]);
                toast.success('เพิ่มรายการงบประมาณแล้ว');
            }
            setIsDialogOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Unable to save budget record');
        }
    };

    const updateBudgetStatus = async (tx: BudgetRow, status: string) => {
        try {
            const response = await api.budget.update(tx.id, {
                title: tx.description,
                amount: tx.amount,
                type: tx.type,
                category: tx.category,
                date: tx.date,
                status,
                note: tx.note || tx.description,
            });
            setTransactions((current) => current.map((item) => item.id === tx.id ? mapBudget(response.budget) : item));
            toast.success(status === 'approved' ? 'อนุมัติรายการแล้ว' : 'ปฏิเสธรายการแล้ว');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Unable to update budget status');
        }
    };

    const deleteBudget = async (tx: BudgetRow) => {
        if (!confirm('ลบรายการงบประมาณนี้?')) return;
        try {
            await api.budget.remove(tx.id);
            setTransactions((current) => current.filter((item) => item.id !== tx.id));
            toast.success('ลบรายการงบประมาณแล้ว');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Unable to delete budget record');
        }
    };

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-10">
            {/* Header */}
            <div>
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2">
                    <Wallet className="w-4 h-4 text-purple-500 dark:text-slate-400" />
                    <span>{t.budgetPage.subtitle}</span>
                </motion.div>
                <motion.h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    {t.budgetPage.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-violet-600">{t.budgetPage.titleHighlight}</span>
                </motion.h1>
            </div>

            {/* Stat Cards */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { icon: DollarSign, label: t.budgetPage.remaining, value: `฿${remainingBudget.toLocaleString()}`, sub: `${t.budgetPage.fromTotal} ฿${totalBudget.toLocaleString()}`, gradient: '', shadow: '' },
                    { icon: TrendingDown, label: t.budgetPage.monthlyExpense, value: `฿${totalExpense.toLocaleString()}`, sub: t.budgetPage.increaseFromLast, gradient: '', shadow: '' },
                    { icon: Receipt, label: t.budgetPage.pendingApproval, value: String(pendingCount), sub: t.budgetPage.disbursementReqs, gradient: '', shadow: '' },
                ].map((stat, i) => (
                    <motion.div key={i} whileHover={{ scale: 1.02 }} className={`bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 ${stat.shadow}`}>
                        
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-2 rounded-xl bg-blue-500/10 dark:bg-blue-500/10"><stat.icon className="w-5 h-5" /></div>
                                <span className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</span>
                            </div>
                            <div className="text-3xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-slate-100">{stat.value}</div>
                            <p className="text-sm text-white/70 mt-1">{stat.sub}</p>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            {/* Bento Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Budget Progress - 2 cols */}
                <motion.div variants={itemVariants} className="lg:col-span-2 bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-5 flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-purple-500 dark:text-slate-400" /> {t.budgetPage.expenseRatio}
                    </h3>
                    <div className="space-y-4">
                        {(categoryBreakdown.length ? categoryBreakdown : [{ label: t.common?.noData || 'No data', percent: 0 }]).map((item, idx) => (
                            <div key={idx}>
                                <div className="flex justify-between text-sm mb-1.5">
                                    <span className="text-slate-600 dark:text-slate-300">{item.label}</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{item.percent}%</span>
                                </div>
                                <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${item.percent}%` }} transition={{ delay: 0.5 + idx * 0.1, duration: 0.6 }} className="h-full bg-blue-500 rounded-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 dark:text-slate-400">{t.budgetPage.budgetUsed}</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{totalBudget > 0 ? Math.round((totalExpense / totalBudget) * 100) : 0}%</span>
                        </div>
                        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${totalBudget > 0 ? Math.min((totalExpense / totalBudget) * 100, 100) : 0}%` }} transition={{ delay: 0.8, duration: 0.8 }} className="h-full bg-gradient-to-r from-purple-500 to-violet-500 rounded-full" />
                        </div>
                    </div>
                </motion.div>

                {/* Transactions - 3 cols */}
                <motion.div variants={itemVariants} className="lg:col-span-3 bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-5">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{t.budgetPage.recentItems}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{t.budgetPage.recentDesc}</p>
                        </div>
                        <Button onClick={openCreateDialog} className="rounded-xl bg-purple-600 hover:bg-purple-700 shadow-lg">
                            <Plus className="w-4 h-4 mr-2" /> {t.budgetPage.requestBudget}
                        </Button>
                    </div>
                    <div className="space-y-2">
                        {transactions.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                                {t.common?.noData || 'No budget records found'}
                            </div>
                        )}
                        {transactions.map((tx) => (
                            <motion.div key={tx.id} whileHover={{ x: 4 }} className="flex items-center justify-between p-4 rounded-2xl hover:bg-white border border-transparent hover:border-slate-100 hover:shadow-sm transition-all dark:bg-slate-900 dark:border-slate-700">
                                <div className="flex items-center gap-4">
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${tx.type === 'expense' ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                        {tx.type === 'expense' ? <TrendingDown className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-800 dark:text-slate-200">{tx.description}</h4>
                                        <p className="text-sm text-slate-400">{tx.category} • {tx.date}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                    <div className={`font-bold ${tx.type === 'expense' ? 'text-red-500' : 'text-emerald-500'}`}>
                                        {tx.type === 'expense' ? '-' : '+'}฿{tx.amount.toLocaleString()}
                                    </div>
                                    <Badge variant="outline" className={`text-xs mt-1 ${tx.status === 'approved' ? 'border-emerald-200 text-emerald-600 bg-emerald-50' : tx.status === 'rejected' ? 'border-red-200 text-red-600 bg-red-50' : 'border-amber-200 text-amber-600 bg-amber-50'}`}>
                                        {tx.status === 'approved' ? t.budgetPage.approved : tx.status === 'rejected' ? 'Rejected' : t.budgetPage.pendingReview}
                                    </Badge>
                                    </div>
                                    <div className="flex gap-1">
                                        {tx.status === 'pending' && (
                                            <>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" onClick={() => updateBudgetStatus(tx, 'approved')}>
                                                    <CheckCircle className="w-4 h-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => updateBudgetStatus(tx, 'rejected')}>
                                                    <XCircle className="w-4 h-4" />
                                                </Button>
                                            </>
                                        )}
                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditDialog(tx)}>
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => deleteBudget(tx)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingTx ? 'แก้ไขรายการงบประมาณ' : 'เพิ่มรายการงบประมาณ'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                        <div className="space-y-2">
                            <Label>ประเภท</Label>
                            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="income">รายรับ</SelectItem>
                                    <SelectItem value="expense">รายจ่าย</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>สถานะ</Label>
                            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>หมวดหมู่</Label>
                            <Input value={formData.category} onChange={(event) => setFormData({ ...formData, category: event.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>จำนวนเงิน</Label>
                            <Input type="number" value={formData.amount} onChange={(event) => setFormData({ ...formData, amount: event.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>วันที่</Label>
                            <Input type="date" value={formData.date} onChange={(event) => setFormData({ ...formData, date: event.target.value })} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>รายละเอียด</Label>
                            <Textarea value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>หมายเหตุ</Label>
                            <Textarea value={formData.note} onChange={(event) => setFormData({ ...formData, note: event.target.value })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>ยกเลิก</Button>
                        <Button onClick={saveBudget} className="bg-purple-600 hover:bg-purple-700">บันทึก</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
