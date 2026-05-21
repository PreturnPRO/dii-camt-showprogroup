import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { FileText, Printer, File, Download, CheckCircle, Search, Clock, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { asDate, asRecord, asString } from '@/lib/live-data';
import { toast } from 'sonner';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

type DocumentRequestRow = {
    id: string;
    name: string;
    studentId: string;
    type: string;
    time: string;
    status: string;
};

type DocumentHistoryRow = {
    id: string;
    name: string;
    studentId: string;
    doc: string;
    date: string;
};

const isDocumentRequest = (item: unknown) => {
    const request = asRecord(item);
    const text = `${asString(request.type)} ${asString(request.title)} ${asString(request.description)}`.toLowerCase();
    return (
        text.includes('document') ||
        text.includes('certificate') ||
        text.includes('transcript') ||
        text.includes('letter') ||
        text.includes('เอกสาร') ||
        text.includes('ใบ') ||
        text.includes('หนังสือ')
    );
};

export default function Documents() {
    const { t } = useLanguage();
    const [searchQuery, setSearchQuery] = React.useState('');
    const [pendingRequests, setPendingRequests] = React.useState<DocumentRequestRow[]>([]);
    const [history, setHistory] = React.useState<DocumentHistoryRow[]>([]);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [documentForm, setDocumentForm] = React.useState({ type: 'transcript', studentId: '' });

    const mapDocumentRequest = React.useCallback((item: unknown, index: number): DocumentRequestRow => {
        const request = asRecord(item);
        const student = asRecord(request.student);
        const studentUser = asRecord(student.user);

        return {
            id: asString(request.id, String(index + 1)),
            name: asString(studentUser.nameThai, asString(studentUser.name, '-')),
            studentId: asString(student.studentId, '-'),
            type: asString(request.type, asString(request.title, '-')),
            time: asDate(request.submittedAt).toLocaleDateString('th-TH'),
            status: asString(request.status, 'pending'),
        };
    }, []);

    React.useEffect(() => {
        let isMounted = true;

        api.requests.list()
            .then((response) => {
                if (!isMounted) return;
                const documentRequests = response.requests
                    .filter(isDocumentRequest)
                    .map(mapDocumentRequest);

                setPendingRequests(documentRequests.filter((request) => request.status === 'pending'));
                setHistory(documentRequests
                    .filter((request) => request.status === 'completed' || request.status === 'approved')
                    .map((request) => ({
                        id: request.id,
                        name: request.name,
                        studentId: request.studentId,
                        doc: request.type,
                        date: request.time,
                    })));
            })
            .catch(() => undefined);

        return () => {
            isMounted = false;
        };
    }, [mapDocumentRequest]);

    const saveBlob = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleIssueDocument = async (request: DocumentRequestRow) => {
        try {
            if (request.type.toLowerCase().includes('transcript')) {
                const blob = await api.documents.transcript(request.studentId);
                saveBlob(blob, `transcript-${request.studentId}.pdf`);
            } else {
                const blob = await api.documents.internshipCertificate(request.studentId);
                saveBlob(blob, `internship-certificate-${request.studentId}.pdf`);
            }

            await api.requests.updateStatus(request.id, { status: 'completed' });
            setPendingRequests((current) => current.filter((item) => item.id !== request.id));
            setHistory((current) => [{
                id: request.id,
                name: request.name,
                studentId: request.studentId,
                doc: request.type,
                date: new Date().toLocaleDateString('th-TH'),
            }, ...current]);
            toast.success(t.documentsPage.issueDoc);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Unable to issue document');
        }
    };

    const openGenerateDialog = (type: string, studentId = '') => {
        setDocumentForm({ type, studentId });
        setIsDialogOpen(true);
    };

    const generateDocument = async () => {
        if (!documentForm.studentId.trim()) {
            toast.error('กรุณากรอกรหัสนักศึกษา');
            return;
        }

        try {
            const blob = documentForm.type === 'internship'
                ? await api.documents.internshipCertificate(documentForm.studentId)
                : await api.documents.transcript(documentForm.studentId);
            saveBlob(blob, `${documentForm.type}-${documentForm.studentId}.pdf`);
            setHistory((current) => [{
                id: `${documentForm.type}-${Date.now()}`,
                name: documentForm.studentId,
                studentId: documentForm.studentId,
                doc: documentForm.type,
                date: new Date().toLocaleDateString('th-TH'),
            }, ...current]);
            setIsDialogOpen(false);
            toast.success('ออกเอกสารแล้ว');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Unable to generate document');
        }
    };

    const filteredRequests = searchQuery.trim()
        ? pendingRequests.filter(r =>
            r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.studentId.includes(searchQuery) ||
            r.type.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : pendingRequests;

    const docTemplates = [
        { title: t.documentsPage.statusCert, desc: t.documentsPage.statusCertDesc, icon: FileText, color: 'from-blue-500 to-indigo-500', type: 'transcript' },
        { title: 'Transcript', desc: t.documentsPage.transcript, icon: FileText, color: 'from-emerald-500 to-teal-500', type: 'transcript' },
        { title: t.documentsPage.courtesyLetter, desc: t.documentsPage.courtesyLetterDesc, icon: File, color: 'from-amber-500 to-orange-500', type: 'internship' },
        { title: t.documentsPage.leaveLetter, desc: t.documentsPage.leaveLetterDesc, icon: FileText, color: 'from-purple-500 to-violet-500', type: 'internship' },
    ];

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-10">
            <div>
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2">
                    <Printer className="w-4 h-4 text-blue-500 dark:text-slate-400" />
                    <span>{t.documentsPage.subtitle}</span>
                </motion.div>
                <motion.h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    {t.documentsPage.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">{t.documentsPage.titleHighlight}</span>
                </motion.h1>
            </div>

            <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {docTemplates.map((doc, idx) => (
                    <motion.div key={idx} whileHover={{ scale: 1.03, y: -4 }} onClick={() => openGenerateDialog(doc.type)} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${doc.color} p-6 text-white shadow-xl cursor-pointer group`}>
                        <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 dark:bg-slate-900/50" />
                        <div className="relative z-10">
                            <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm w-fit mb-4 dark:bg-slate-900/50">
                                <doc.icon className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-lg mb-1">{doc.title}</h3>
                            <p className="text-sm text-white/80">{doc.desc}</p>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <motion.div variants={itemVariants} className="lg:col-span-3 bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm dark:bg-slate-900/50">
                    <div className="flex justify-between items-center mb-5">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{t.documentsPage.pendingRequests}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{t.documentsPage.pendingDesc}</p>
                        </div>
                        <div className="relative w-56">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder={t.documentsPage.searchRequests}
                                className="pl-9 rounded-xl bg-white/80 dark:bg-slate-900/50"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        {filteredRequests.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">ไม่มีคำร้องเอกสารที่รอดำเนินการ</div>
                        ) : filteredRequests.map((req) => (
                            <motion.div key={req.id} whileHover={{ x: 4 }} className="flex items-center justify-between p-4 rounded-2xl hover:bg-white border border-transparent hover:border-slate-100 hover:shadow-sm transition-all dark:bg-slate-900 dark:border-slate-700">
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800 dark:text-slate-200">{req.name} ({req.studentId})</p>
                                        <p className="text-sm text-slate-400">ขอ{req.type} • {req.time}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={() => openGenerateDialog(req.type.toLowerCase().includes('transcript') ? 'transcript' : 'internship', req.studentId)}>{t.documentsPage.viewDetails}</Button>
                                    <Button size="sm" className="rounded-xl bg-blue-600 hover:bg-blue-700 text-xs shadow-lg shadow-blue-200" onClick={() => handleIssueDocument(req)}>
                                        <Printer className="w-3.5 h-3.5 mr-1.5" /> {t.documentsPage.issueDoc}
                                    </Button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="lg:col-span-2 bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm dark:bg-slate-900/50">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-5 flex items-center gap-2">
                        <FolderOpen className="w-5 h-5 text-emerald-500 dark:text-slate-400" /> {t.documentsPage.history}
                    </h3>
                    <div className="space-y-3">
                        {history.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                                ยังไม่มีประวัติการออกเอกสาร
                            </div>
                        )}
                        {history.map((item, i) => (
                            <motion.div key={item.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
                                className="flex items-center justify-between p-3 rounded-2xl hover:bg-white transition-all dark:bg-slate-900">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 dark:text-slate-400 dark:bg-slate-800">
                                        <CheckCircle className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-800 dark:text-slate-200 text-sm">{item.name}</p>
                                        <p className="text-xs text-slate-400">{item.doc} • {item.date}</p>
                                    </div>
                                </div>
                                <Button size="sm" variant="ghost" className="text-slate-400 hover:text-blue-500 rounded-xl dark:text-slate-400" onClick={() => openGenerateDialog(item.doc.toLowerCase().includes('transcript') ? 'transcript' : 'internship', item.studentId)}>
                                    <Download className="w-4 h-4" />
                                </Button>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>ออกเอกสาร</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>ประเภทเอกสาร</Label>
                            <Select value={documentForm.type} onValueChange={(value) => setDocumentForm({ ...documentForm, type: value })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="transcript">Transcript</SelectItem>
                                    <SelectItem value="internship">Internship Certificate</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>รหัสนักศึกษา</Label>
                            <Input value={documentForm.studentId} onChange={(event) => setDocumentForm({ ...documentForm, studentId: event.target.value })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>ยกเลิก</Button>
                        <Button onClick={generateDocument} className="bg-blue-600 hover:bg-blue-700">ออกเอกสาร</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
