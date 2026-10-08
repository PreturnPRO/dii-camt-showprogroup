import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { FileText, Printer, File, Download, CheckCircle, Search, Clock, FolderOpen, Loader2, Ban } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api, ApiError } from '@/lib/api';
import { asDate, asRecord, asString } from '@/lib/live-data';
import { toast } from 'sonner';
import { solidBg } from '@/lib/flat-color';

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
    const [issuingId, setIssuingId] = React.useState<string | null>(null);
    const [isGenerating, setIsGenerating] = React.useState(false);
    const [revokeReference, setRevokeReference] = React.useState('');
    const [confirmRevoke, setConfirmRevoke] = React.useState(false);
    const [isRevoking, setIsRevoking] = React.useState(false);

    const REFERENCE_PATTERN = /^SHOWPRO-\d{4}-\d{6,10}$/;
    const revokeDocument = async () => {
        setIsRevoking(true);
        try {
            const result = await api.documents.revoke(revokeReference.trim());
            toast.success(`เพิกถอน ${result.document.reference} แล้ว — หน้าตรวจสอบจะแสดงว่าเอกสารถูกเพิกถอน`);
            setRevokeReference('');
        } catch (error) {
            toast.error(error instanceof ApiError && error.status === 404
                ? 'ไม่พบเอกสารเลขที่นี้ — ตรวจเลขบน PDF อีกครั้ง'
                : error instanceof ApiError && error.status === 400
                    ? 'รูปแบบเลขที่เอกสารไม่ถูกต้อง (เช่น SHOWPRO-2026-000123)'
                    : 'เพิกถอนเอกสารไม่สำเร็จ กรุณาลองใหม่');
        } finally {
            setIsRevoking(false);
            setConfirmRevoke(false);
        }
    };

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

                // a request staff already started reviewing still waits for its document
                setPendingRequests(documentRequests.filter((request) => request.status === 'pending' || request.status === 'under_review'));
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
            .catch((error) => {
                if (!isMounted) return;
                console.warn('Unable to load document requests', error);
                toast.error('โหลดคำร้องเอกสารไม่สำเร็จ กรุณารีเฟรชหน้า');
            });

        return () => {
            isMounted = false;
        };
    }, [mapDocumentRequest]);

    // the server refuses a completion certificate until staff mark the internship completed
    const issueErrorMessage = (error: unknown, fallback: string) =>
        error instanceof ApiError && error.status === 409
            ? 'การฝึกงานของนักศึกษาคนนี้ยังไม่ถูกบันทึกว่าจบ — บันทึกได้ที่หน้าติดตามการฝึกงาน แล้วค่อยออกใบรับรอง'
            : error instanceof Error ? error.message : fallback;

    const saveBlob = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    };

    // a request only says "ขอใบรับรอง"; staff pick the document, the page never guesses it
    const handleIssueDocument = async (request: DocumentRequestRow, kind: 'transcript' | 'internship') => {
        if (issuingId) return;
        setIssuingId(request.id);
        try {
            if (kind === 'transcript') {
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
                doc: kind === 'transcript' ? 'Transcript' : 'ใบรับรองการฝึกงาน',
                date: new Date().toLocaleDateString('th-TH'),
            }, ...current]);
            toast.success(t.documentsPage.issueDoc);
        } catch (error) {
            toast.error(issueErrorMessage(error, 'Unable to issue document'));
        } finally {
            setIssuingId(null);
        }
    };

    const openGenerateDialog = (type: string, studentId = '') => {
        setDocumentForm({ type, studentId });
        setIsDialogOpen(true);
    };

    const generateDocument = async () => {
        if (!documentForm.studentId.trim() || isGenerating) {
            toast.error('กรุณากรอกรหัสนักศึกษา');
            return;
        }

        setIsGenerating(true);
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
            toast.error(issueErrorMessage(error, 'Unable to generate document'));
        } finally {
            setIsGenerating(false);
        }
    };

    const filteredRequests = searchQuery.trim()
        ? pendingRequests.filter(r =>
            r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.studentId.includes(searchQuery) ||
            r.type.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : pendingRequests;

    // only documents the backend can generate (status/courtesy/leave letters have no generator)
    const docTemplates = [
        { title: 'Transcript', desc: t.documentsPage.transcript, icon: FileText, color: 'from-emerald-500 to-teal-500', type: 'transcript' },
        { title: 'ใบรับรองการฝึกงาน', desc: 'Internship certificate', icon: File, color: 'from-amber-500 to-orange-500', type: 'internship' },
    ];

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-10">
            <div>
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2">
                    <Printer className="w-4 h-4 text-blue-500 dark:text-slate-400" />
                    <span>{t.documentsPage.subtitle}</span>
                </motion.div>
                <motion.h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white leading-snug" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    {t.documentsPage.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">{t.documentsPage.titleHighlight}</span>
                </motion.h1>
            </div>

            <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {docTemplates.map((doc, idx) => (
                    <motion.button type="button" data-testid="document-template" key={idx} whileHover={{ scale: 1.03, y: -4 }} onClick={() => openGenerateDialog(doc.type)} className={`relative overflow-hidden rounded-2xl ${solidBg(doc.color)} p-6 text-left text-white shadow-sm cursor-pointer group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500`}>
                        <div className="relative z-10">
                            <div className="p-2.5 rounded-xl bg-white/20 w-fit mb-4">
                                <doc.icon className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-lg mb-1">{doc.title}</h3>
                            <p className="text-sm text-white/85">{doc.desc}</p>
                        </div>
                    </motion.button>
                ))}
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <motion.div variants={itemVariants} className="lg:col-span-3 bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-5">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{t.documentsPage.pendingRequests}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{t.documentsPage.pendingDesc}</p>
                        </div>
                        <div className="relative w-56">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder={t.documentsPage.searchRequests}
                                className="pl-9 rounded-xl bg-white/80"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        {filteredRequests.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">ไม่มีคำร้องเอกสารที่รอดำเนินการ</div>
                        ) : filteredRequests.map((req) => (
                            <motion.div key={req.id} data-testid="document-request" whileHover={{ x: 4 }} className="flex items-center justify-between p-4 rounded-2xl hover:bg-white border border-transparent hover:border-slate-100 hover:shadow-sm transition-all dark:bg-slate-900 dark:border-slate-700">
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 dark:bg-amber-500/10">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800 dark:text-slate-200">{req.name} ({req.studentId})</p>
                                        <p className="text-sm text-slate-400">ขอ{req.type} • {req.time}</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {issuingId === req.id ? (
                                        <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> กำลังออกเอกสาร...
                                        </span>
                                    ) : (['transcript', 'internship'] as const).map((kind) => (
                                        <Button
                                            key={kind}
                                            size="sm"
                                            data-testid={`issue-${kind}`}
                                            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-xs shadow-sm flex items-center gap-1.5"
                                            onClick={() => handleIssueDocument(req, kind)}
                                            disabled={issuingId !== null}
                                        >
                                            <Printer className="w-3.5 h-3.5" />
                                            <span>{kind === 'transcript' ? 'ออก Transcript' : 'ออกใบรับรองฝึกงาน'}</span>
                                        </Button>
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="lg:col-span-2 bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
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

            {/* a QR on a printed document keeps working; revoking is how staff withdraw one issued by mistake */}
            <motion.div variants={itemVariants} className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm" data-testid="revoke-card">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                    <Ban className="w-5 h-5 text-rose-500" /> เพิกถอนเอกสาร
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">ใส่เลขที่เอกสารที่พิมพ์อยู่บน PDF เช่น SHOWPRO-2026-000123 เมื่อเพิกถอนแล้ว ผู้ที่สแกน QR จะเห็นว่าเอกสารถูกเพิกถอน และย้อนกลับไม่ได้</p>
                <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                        aria-label="เลขที่เอกสาร"
                        placeholder="SHOWPRO-2026-000123"
                        value={revokeReference}
                        onChange={(event) => setRevokeReference(event.target.value.toUpperCase())}
                        className="font-mono sm:max-w-xs"
                    />
                    <Button
                        variant="outline"
                        disabled={!REFERENCE_PATTERN.test(revokeReference.trim()) || isRevoking}
                        onClick={() => setConfirmRevoke(true)}
                        className="border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40"
                    >
                        เพิกถอน
                    </Button>
                </div>
            </motion.div>

            <AlertDialog open={confirmRevoke} onOpenChange={setConfirmRevoke}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>เพิกถอน {revokeReference.trim()}?</AlertDialogTitle>
                        <AlertDialogDescription>ผู้ที่สแกน QR ของเอกสารนี้จะเห็นว่าเอกสารถูกเพิกถอน การเพิกถอนย้อนกลับไม่ได้</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isRevoking}>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction disabled={isRevoking} onClick={(event) => { event.preventDefault(); void revokeDocument(); }} className="bg-rose-600 hover:bg-rose-700 text-white">
                            {isRevoking ? 'กำลังเพิกถอน...' : 'ยืนยันเพิกถอน'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

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
                        <Button
                            onClick={generateDocument}
                            disabled={isGenerating}
                            className="bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                    <span>กำลังออกเอกสาร...</span>
                                </>
                            ) : (
                                'ออกเอกสาร'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
