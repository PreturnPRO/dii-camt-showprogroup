import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Globe, Building, Search, MapPin, Users, Handshake, ExternalLink, Edit, Briefcase, FilePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { asRecord, asString } from '@/lib/live-data';
import { toast } from 'sonner';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

type CompanyRow = {
    id: string;
    userId?: string;
    email: string;
    name: string;
    nameThai: string;
    phone: string;
    companyId: string;
    companyName: string;
    companyNameThai: string;
    industry: string;
    size: string;
    website: string;
    address: string;
};

const emptyCompanyForm = {
    companyName: '',
    companyNameThai: '',
    email: '',
    phone: '',
    industry: 'Technology',
    size: 'small',
    website: '',
    address: '',
};

export default function Network() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = React.useState('');
    const [industryFilter, setIndustryFilter] = React.useState('all');
    const [companies, setCompanies] = React.useState<CompanyRow[]>([]);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [editingCompany, setEditingCompany] = React.useState<CompanyRow | null>(null);
    const [formData, setFormData] = React.useState(emptyCompanyForm);

    const mapCompanyRow = React.useCallback((item: unknown): CompanyRow => {
        const source = asRecord(item);
        const user = asRecord(source.user);
        return {
            id: asString(source.id),
            userId: asString(user.id),
            email: asString(user.email, asString(source.email)),
            name: asString(user.name, asString(source.name)),
            nameThai: asString(user.nameThai, asString(source.nameThai)),
            phone: asString(user.phone, asString(source.phone)),
            companyId: asString(source.companyId),
            companyName: asString(source.companyName),
            companyNameThai: asString(source.companyNameThai, asString(source.companyName)),
            industry: asString(source.industry),
            size: asString(source.size, 'small'),
            website: asString(source.website),
            address: asString(source.address),
        };
    }, []);

    React.useEffect(() => {
        let mounted = true;

        api.companies
            .list()
            .then((response) => {
                if (!mounted) return;
                setCompanies(response.companies.map(mapCompanyRow));
            })
            .catch((error) => {
                console.warn('Unable to load partner companies from API', error);
            });

        return () => {
            mounted = false;
        };
    }, [mapCompanyRow]);

    const industries = React.useMemo(
        () => Array.from(new Set(companies.map((company) => company.industry).filter(Boolean))).sort(),
        [companies],
    );

    const filteredCompanies = companies.filter(c => {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
            c.companyName.toLowerCase().includes(query) ||
            c.companyNameThai.toLowerCase().includes(query) ||
            c.industry.toLowerCase().includes(query);
        const matchesIndustry = industryFilter === 'all' || c.industry === industryFilter;
        return matchesSearch && matchesIndustry;
    });

    const openCreateDialog = () => {
        setEditingCompany(null);
        setFormData(emptyCompanyForm);
        setIsDialogOpen(true);
    };

    const openEditDialog = (company: CompanyRow) => {
        setEditingCompany(company);
        setFormData({
            companyName: company.companyName,
            companyNameThai: company.companyNameThai,
            email: company.email,
            phone: company.phone || '',
            industry: company.industry,
            size: company.size,
            website: company.website || '',
            address: company.address || '',
        });
        setIsDialogOpen(true);
    };

    const reloadCompanies = async () => {
        const response = await api.companies.list();
        setCompanies(response.companies.map(mapCompanyRow));
    };

    const saveCompany = async () => {
        if (!formData.companyName.trim() || !formData.email.trim()) {
            toast.error('กรุณากรอกชื่อบริษัทและอีเมล');
            return;
        }

        try {
            if (editingCompany?.userId) {
                await api.users.update(editingCompany.userId, {
                    name: formData.companyName,
                    nameThai: formData.companyNameThai || formData.companyName,
                    phone: formData.phone,
                    roleData: {
                        companyName: formData.companyName,
                        companyNameThai: formData.companyNameThai || formData.companyName,
                        industry: formData.industry,
                        size: formData.size,
                        website: formData.website || undefined,
                        address: formData.address || undefined,
                    },
                });
                toast.success('อัปเดตบริษัทแล้ว');
            } else {
                await api.users.create({
                    name: formData.companyName,
                    nameThai: formData.companyNameThai || formData.companyName,
                    email: formData.email,
                    phone: formData.phone,
                    role: 'COMPANY',
                    profile: {
                        companyName: formData.companyName,
                        companyNameThai: formData.companyNameThai || formData.companyName,
                        industry: formData.industry,
                        size: formData.size,
                        website: formData.website || undefined,
                        address: formData.address || undefined,
                    },
                });
                toast.success('เพิ่มบริษัทแล้ว');
            }
            await reloadCompanies();
            setIsDialogOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Unable to save company');
        }
    };

    const createCooperation = async (company: CompanyRow) => {
        try {
            await api.cooperation.create({
                companyId: company.id,
                title: `MOU - ${company.companyName}`,
                type: 'mou',
                details: 'Created from network page',
                status: 'active',
            });
            toast.success('สร้าง MOU ให้บริษัทนี้แล้ว');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Unable to create cooperation record');
        }
    };

    const openInternTracking = (company: CompanyRow) => {
        const params = new URLSearchParams({
            companyId: company.id,
            company: company.companyNameThai || company.companyName,
        });
        navigate(`/intern-tracking?${params.toString()}`);
    };

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2">
                        <Globe className="w-4 h-4 text-orange-500 dark:text-slate-400" />
                        <span>{t.networkPage.subtitle}</span>
                    </motion.div>
                    <motion.h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        {t.networkPage.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">{t.networkPage.titleHighlight}</span>
                    </motion.h1>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-slate-500 mt-2 dark:text-slate-400">
                        {t.networkPage.totalPartners} {companies.length} {t.networkPage.locations}
                    </motion.p>
                </div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <Button onClick={openCreateDialog} className="rounded-xl bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-200 h-11">
                        <Building className="w-4 h-4 mr-2" /> {t.networkPage.addNew}
                    </Button>
                </motion.div>
            </div>

            {/* Search Bar */}
            <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3 dark:bg-slate-900/50">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input placeholder={t.networkPage.searchPlaceholder} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 rounded-xl bg-white/80 border-slate-200 dark:border-slate-700 dark:bg-slate-900/50" />
                </div>
                <Select value={industryFilter} onValueChange={setIndustryFilter}>
                    <SelectTrigger className="w-full rounded-xl bg-white/80 border-slate-200 dark:border-slate-700 dark:bg-slate-900/50 md:w-56">
                        <SelectValue placeholder={t.networkPage.industryFilter} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t.common?.all || 'All industries'}</SelectItem>
                        {industries.map((industry) => (
                            <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </motion.div>

            {/* Company Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {filteredCompanies.length === 0 && (
                    <div className="lg:col-span-2 rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                        ไม่พบข้อมูลบริษัทจากระบบ
                    </div>
                )}
                {filteredCompanies.map((company, index) => (
                    <motion.div key={company.id} variants={itemVariants} whileHover={{ y: -4 }}
                        className="bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all group dark:bg-slate-900/50">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-orange-200">
                                    {company.companyName.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">{company.companyName}</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{company.companyNameThai}</p>
                                    <Badge variant="outline" className="mt-2 rounded-lg text-xs">{company.industry}</Badge>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => company.website && window.open(company.website, '_blank', 'noopener,noreferrer')} className="text-slate-300 hover:text-orange-500 rounded-xl dark:text-slate-400">
                                <ExternalLink className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                            {[
                                { icon: MapPin, text: company.address || t.networkPage.noAddress },
                                { icon: Users, text: company.size || t.networkPage.companySize },
                                { icon: Handshake, text: 'MOU: Active' },
                                { icon: Globe, text: company.website },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                    <item.icon className="w-4 h-4 flex-shrink-0" />
                                    <span className="truncate">{item.text}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                            <Button size="sm" variant="outline" className="flex-1 rounded-xl text-xs" onClick={() => openInternTracking(company)}>
                                <Briefcase className="w-3.5 h-3.5 mr-1.5" /> {t.networkPage.sendIntern}
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1 rounded-xl text-xs" onClick={() => createCooperation(company)}>
                                <FilePlus className="w-3.5 h-3.5 mr-1.5" /> MOU
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1 rounded-xl text-xs" onClick={() => openEditDialog(company)}>
                                <Edit className="w-3.5 h-3.5 mr-1.5" /> {t.networkPage.editData}
                            </Button>
                        </div>
                    </motion.div>
                ))}
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingCompany ? 'แก้ไขบริษัทคู่ความร่วมมือ' : 'เพิ่มบริษัทคู่ความร่วมมือ'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                        <div className="space-y-2">
                            <Label>ชื่อบริษัท</Label>
                            <Input value={formData.companyName} onChange={(event) => setFormData({ ...formData, companyName: event.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>ชื่อบริษัทภาษาไทย</Label>
                            <Input value={formData.companyNameThai} onChange={(event) => setFormData({ ...formData, companyNameThai: event.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>อีเมล</Label>
                            <Input value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} disabled={!!editingCompany} />
                        </div>
                        <div className="space-y-2">
                            <Label>เบอร์โทร</Label>
                            <Input value={formData.phone} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>อุตสาหกรรม</Label>
                            <Input value={formData.industry} onChange={(event) => setFormData({ ...formData, industry: event.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>ขนาดบริษัท</Label>
                            <Select value={formData.size} onValueChange={(value) => setFormData({ ...formData, size: value })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="startup">Startup</SelectItem>
                                    <SelectItem value="small">Small</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="large">Large</SelectItem>
                                    <SelectItem value="enterprise">Enterprise</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>เว็บไซต์</Label>
                            <Input value={formData.website} onChange={(event) => setFormData({ ...formData, website: event.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>ที่อยู่</Label>
                            <Input value={formData.address} onChange={(event) => setFormData({ ...formData, address: event.target.value })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>ยกเลิก</Button>
                        <Button onClick={saveCompany} className="bg-orange-500 hover:bg-orange-600">บันทึก</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
