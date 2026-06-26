import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileBox, FileText, Clock, CheckCircle, XCircle, Plus, Filter, Send,
  Upload, X, AlertCircle, ArrowRight, Hourglass, Calendar, Download,
  ChevronRight, FileQuestion, ArrowUpRight, Inbox
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { asArray, asDate, asNumber, asRecord, asString } from '@/lib/live-data';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

type RequestRow = {
  id: string;
  type: string;
  title: string;
  status: string;
  step: number;
  totalSteps: number;
  createdAt: string;
  updatedAt: string;
  description: string;
  documents: string[];
  studentName?: string;
  studentId?: string;
};

const initialRequests: RequestRow[] = [
  {
    id: '1',
    type: 'Over-registration / ลงทะเบียนเรียนเกิน',
    title: 'ขอลงทะเบียนเรียนเกิน 22 หน่วยกิต',
    status: 'pending',
    step: 2,
    totalSteps: 4,
    createdAt: '2026-01-08',
    updatedAt: '2026-01-09',
    description: 'ขอลงทะเบียนเรียนเกินเนื่องจากต้องการจบการศึกษาตามกำหนด วิชาที่ต้องการเพิ่มคือ 261499',
    documents: ['transcript.pdf', 'reg_form.pdf']
  },
  {
    id: '2',
    type: 'Certificate Request / ขอใบรับรอง',
    title: 'ขอใบรับรองนักศึกษา (ภาษาอังกฤษ)',
    status: 'approved',
    step: 3,
    totalSteps: 3,
    createdAt: '2026-01-05',
    updatedAt: '2026-01-06',
    description: 'สำหรับใช้ในการทำวีซ่าท่องเที่ยวต่างประเทศ',
    documents: []
  },
  {
    id: '3',
    type: 'Section Change / ขอเปลี่ยนกลุ่ม',
    title: 'ขอเปลี่ยนกลุ่มเรียน DII345',
    status: 'rejected',
    step: 1,
    totalSteps: 3,
    createdAt: '2026-03-03',
    updatedAt: '2026-03-04',
    description: 'ขอเปลี่ยนจากกลุ่ม 01 เป็นกลุ่ม 02 เนื่องจากตารางเรียนชนกับวิชาเลือกเสรี',
    documents: ['schedule.png']
  },
];

export default function Requests() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const canCreateRequest = user?.role === 'student';
  const canReviewRequest = user?.role === 'staff' || user?.role === 'admin';

  const requestTypes = [
    { id: 'reg_over', name: language === 'en' ? 'Over-registration' : 'ลงทะเบียนเรียนเกิน', icon: <FileText className="w-5 h-5" />, color: 'bg-blue-50 text-blue-600' },
    { id: 'cert', name: language === 'en' ? 'Certificate Request' : 'ขอใบรับรอง', icon: <FileBox className="w-5 h-5" />, color: 'bg-purple-50 text-purple-600' },
    { id: 'leave', name: language === 'en' ? 'Leave of Absence' : 'ลาพักการศึกษา', icon: <Clock className="w-5 h-5" />, color: 'bg-orange-50 text-orange-600' },
    { id: 'resign', name: language === 'en' ? 'Resignation' : 'ลาออก', icon: <XCircle className="w-5 h-5" />, color: 'bg-red-50 text-red-600' },
    { id: 'general', name: language === 'en' ? 'General Request' : 'คำร้องทั่วไป', icon: <FileQuestion className="w-5 h-5" />, color: 'bg-slate-50 text-slate-600' },
  ];
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [requests, setRequests] = React.useState<RequestRow[]>([]);
  const [formData, setFormData] = React.useState({
    type: '',
    title: '',
    description: ''
  });
  const [files, setFiles] = React.useState<File[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter(file => {
      const isAllowedType = ['application/pdf', 'image/jpeg', 'image/png'].includes(file.type);
      const isUnder10MB = file.size <= 10 * 1024 * 1024;
      if (!isAllowedType) {
        toast.error(language === 'th' ? `ไฟล์ ${file.name} ไม่รองรับ (เฉพาะ PDF, JPG, PNG)` : `File ${file.name} is not supported (PDF, JPG, PNG only)`);
      } else if (!isUnder10MB) {
        toast.error(language === 'th' ? `ไฟล์ ${file.name} มีขนาดเกิน 10MB` : `File ${file.name} exceeds 10MB`);
      }
      return isAllowedType && isUnder10MB;
    });
    setFiles(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  React.useEffect(() => {
    let isMounted = true;

    api.requests.list()
      .then((response) => {
        if (!isMounted) return;
        const mapped = response.requests.map((item, index) => {
          const request = asRecord(item);
          const student = asRecord(request.student);
          const studentUser = asRecord(student.user);
          const status = asString(request.status, 'pending');
          const totalSteps = status === 'pending' ? 4 : 3;
          return {
            id: asString(request.id, String(index + 1)),
            type: asString(request.type, '-'),
            title: asString(request.title, '-'),
            status,
            step: status === 'pending' ? 2 : status === 'rejected' ? 1 : totalSteps,
            totalSteps,
            createdAt: asDate(request.submittedAt, asDate(request.createdAt)).toISOString().split('T')[0],
            updatedAt: asDate(request.reviewedAt, asDate(request.updatedAt, asDate(request.submittedAt))).toISOString().split('T')[0],
            description: asString(request.description, asString(studentUser.nameThai, '')),
            documents: asArray<string>(request.documents),
            studentName: asString(studentUser.nameThai, asString(studentUser.name, '-')),
            studentId: asString(student.studentId),
          };
        });
        setRequests(mapped);
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async () => {
    if (!formData.type || !formData.title || !formData.description) {
      toast.error(t.requestsPage.fillComplete);
      return;
    }

    try {
      const response = await api.requests.create({
        type: formData.type,
        title: formData.title,
        description: formData.description,
        documents: files.map(f => f.name),
      });
      const request = asRecord(response.request);
      const createdAt = asDate(request.submittedAt, new Date()).toISOString().split('T')[0];
      const newRequest = {
        id: asString(request.id, String(Date.now())),
        type: asString(request.type, formData.type),
        title: asString(request.title, formData.title),
        description: asString(request.description, formData.description),
        status: asString(request.status, 'pending'),
        step: asNumber(request.step, 1),
        totalSteps: 3,
        createdAt,
        updatedAt: createdAt,
        documents: asArray<string>(request.documents),
      };

      setRequests([newRequest, ...requests]);
      setIsDialogOpen(false);
      setFormData({ type: '', title: '', description: '' });
      setFiles([]);
      toast.success(t.requestsPage.submitSuccess);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.requestsPage.fillComplete);
    }
  };

  const handleUpdateRequestStatus = async (request: RequestRow, status: 'approved' | 'rejected' | 'completed') => {
    try {
      const response = await api.requests.updateStatus(request.id, { status });
      const updated = asRecord(response.request);
      setRequests((current) => current.map((item) => item.id === request.id ? {
        ...item,
        status: asString(updated.status, status),
        step: status === 'rejected' ? 1 : item.totalSteps,
        updatedAt: asDate(updated.reviewedAt, new Date()).toISOString().split('T')[0],
      } : item));
      toast.success(status === 'approved' ? 'อนุมัติคำร้องแล้ว' : status === 'completed' ? 'ปิดคำร้องแล้ว' : 'ปฏิเสธคำร้องแล้ว');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update request');
    }
  };

  const handleCancelRequest = async (request: RequestRow) => {
    if (canReviewRequest) {
      await handleUpdateRequestStatus(request, 'rejected');
      return;
    }

    toast.info(language === 'th' ? 'การยกเลิกคำร้องต้องติดต่อเจ้าหน้าที่' : 'Please contact staff to cancel this request.');
  };

  const openRequestDetails = (request: RequestRow) => {
    const student = request.studentName ? `${request.studentName}${request.studentId ? ` (${request.studentId})` : ''}` : '';
    toast.info([request.title, student, request.description].filter(Boolean).join(' • '));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'completed': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'rejected': return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-amber-50 text-amber-600 border-amber-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved': return <CheckCircle className="w-4 h-4 mr-1" />;
      case 'rejected': return <XCircle className="w-4 h-4 mr-1" />;
      default: return <Hourglass className="w-4 h-4 mr-1" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return language === 'th' ? 'เสร็จสิ้น' : 'Completed';
      case 'approved': return t.requestsPage.approved;
      case 'rejected': return t.requestsPage.rejected;
      default: return t.requestsPage.processing;
    }
  };

  type StatCardProps = {
    icon: React.ElementType;
    label: string;
    value: React.ReactNode;
    gradient: string;
    delay?: number;
  };

  const StatCard = ({ icon: Icon, label, value, gradient }: StatCardProps) => (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -5, scale: 1.02 }}
      className={`relative overflow-hidden rounded-3xl p-6 shadow-lg border border-white/20 ${gradient}`}
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 dark:bg-slate-900/50" />
      <div className="relative z-10 flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-md border border-white/10 dark:bg-slate-900/50">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white/70 text-xs font-medium">{label}</p>
          <h3 className="text-2xl font-bold text-white tracking-tight">{value}</h3>
        </div>
      </div>
    </motion.div>
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-10"
    >
      {/* Header Section - Matching Dashboard/Courses/Schedule Style */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2"
          >
            <FileBox className="w-4 h-4 text-indigo-500 dark:text-slate-400" />
            <span>{t.requestsPage.subtitle}</span>
          </motion.div>
          <motion.h1
            className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {t.requestsPage.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">{t.requestsPage.titleHighlight}</span>
          </motion.h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          {canCreateRequest && (
            <DialogTrigger asChild>
              <Button size="lg" className="rounded-2xl px-8 bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-900/20 h-12 font-bold transform active:scale-95 transition-all">
                <Plus className="w-5 h-5 mr-2" /> {t.requestsPage.newRequest}
              </Button>
            </DialogTrigger>
          )}
          <DialogContent className="sm:max-w-[600px] bg-white/90 backdrop-blur-2xl p-0 overflow-hidden gap-0 rounded-[2.5rem] border-white/50 shadow-2xl dark:bg-slate-900/50">
            <div className="p-8 bg-slate-900 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <DialogTitle className="text-2xl font-bold tracking-tight">{t.requestsPage.newRequest}</DialogTitle>
              <DialogDescription className="mt-1 text-slate-400">{t.requestsPage.formDesc}</DialogDescription>
            </div>

            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                <Label htmlFor="type" className="text-slate-700 font-bold ml-1 dark:text-slate-300">{t.requestsPage.requestType}</Label>
                <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
                  <SelectTrigger className="rounded-2xl h-14 bg-slate-50/50 border-slate-100 dark:border-slate-800 focus:ring-indigo-500 text-base dark:bg-slate-900/50">
                    <SelectValue placeholder={t.requestsPage.selectTopic} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-2xl p-2">
                    {requestTypes.map(t => (
                      <SelectItem key={t.id} value={t.name} className="rounded-xl py-3 focus:bg-indigo-50 focus:text-indigo-600 font-medium dark:text-slate-300">
                        <div className="flex items-center gap-3">
                          <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">{t.icon}</span>
                          {t.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title" className="text-slate-700 font-bold ml-1 dark:text-slate-300">{t.requestsPage.requestTitle}</Label>
                <Input
                  id="title"
                  placeholder={t.requestsPage.titlePlaceholder}
                  className="rounded-2xl h-14 bg-slate-50/50 border-slate-100 dark:border-slate-800 focus-visible:ring-indigo-500 text-base dark:bg-slate-900/50"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="desc" className="text-slate-700 font-bold ml-1 dark:text-slate-300">{t.requestsPage.requestDetails}</Label>
                <Textarea
                  id="desc"
                  placeholder={t.requestsPage.detailsPlaceholder}
                  className="rounded-2xl min-h-[140px] bg-slate-50/50 border-slate-100 dark:border-slate-800 focus-visible:ring-indigo-500 resize-none text-base p-4 dark:bg-slate-900/50"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 font-bold ml-1 dark:text-slate-300">{t.requestsPage.attachments}</Label>
                <div 
                  className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[2rem] p-10 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 hover:border-indigo-200 hover:text-indigo-400 transition-all cursor-pointer group dark:bg-slate-800"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    multiple 
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                  />
                  <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-indigo-50 transition-all">
                    <Upload className="w-8 h-8 opacity-50 text-slate-400 group-hover:text-indigo-500 dark:text-slate-400" />
                  </div>
                  <p className="font-bold">{t.requestsPage.uploadClick}</p>
                  <p className="text-xs mt-1 opacity-60">{t.requestsPage.fileSupport}</p>
                </div>

                {files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="p-2 bg-white dark:bg-slate-700 rounded-lg shrink-0">
                            <FileText className="w-4 h-4 text-indigo-500" />
                          </div>
                          <div className="truncate">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{file.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="shrink-0 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => removeFile(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="p-8 bg-slate-50/50 border-t border-slate-100 dark:border-slate-800 gap-3 sm:gap-0 dark:bg-slate-900/50">
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-2xl h-14 px-8 font-bold text-slate-500 dark:text-slate-400 hover:bg-white dark:bg-slate-900">{t.common.cancel}</Button>
              <Button onClick={handleSubmit} className="rounded-2xl h-14 px-12 bg-slate-900 text-white hover:bg-slate-800 font-bold shadow-xl shadow-slate-900/20 transform active:scale-95 transition-all">{t.requestsPage.submitNow}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Bento Stats for Requests */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Inbox} label={t.requestsPage.allRequests} value={requests.length} gradient="bg-gradient-to-br from-indigo-500 to-indigo-700" />
        <StatCard icon={Hourglass} label={t.requestsPage.processingTab} value={requests.filter(r => r.status === 'pending').length} gradient="bg-gradient-to-br from-amber-400 to-orange-500" />
        <StatCard icon={CheckCircle} label={t.requestsPage.approvedTab} value={requests.filter(r => r.status === 'approved').length} gradient="bg-gradient-to-br from-emerald-400 to-teal-600" />
        <StatCard icon={XCircle} label={t.requestsPage.rejectedTab} value={requests.filter(r => r.status === 'rejected').length} gradient="bg-gradient-to-br from-red-500 to-rose-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{t.requestsPage.trackStatus}</h3>
            <Button variant="ghost" className="text-slate-500 hover:text-indigo-600 font-bold dark:text-slate-300" onClick={() => setRequests((current) => [...current].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))}>
              {t.requestsPage.viewHistory} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <div className="space-y-5">
            {requests.length === 0 && (
              <div className="rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 p-10 text-center">
                <Inbox className="w-10 h-10 mx-auto text-slate-400 mb-3" />
                <h3 className="font-bold text-slate-800 dark:text-slate-100">ยังไม่มีคำร้อง</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">กดสร้างคำร้องใหม่เพื่อบันทึกข้อมูลลงฐานข้อมูลจริง</p>
              </div>
            )}
            {requests.map((req, idx) => (
              <motion.div
                key={req.id}
                variants={itemVariants}
                className="group bg-white/60 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/60 dark:border-slate-800/60 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden relative dark:bg-slate-900/50"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex flex-col md:flex-row gap-8 relative z-10">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <Badge variant="secondary" className="rounded-xl bg-indigo-50 text-indigo-600 font-bold border-0 px-3 py-1 text-[10px] uppercase tracking-wide dark:text-slate-300">
                        {req.type}
                      </Badge>
                      <Badge variant="outline" className={`rounded-xl font-black flex items-center border-0 px-4 py-1 text-xs ${getStatusColor(req.status)}`}>
                        {getStatusIcon(req.status)} {getStatusText(req.status)}
                      </Badge>
                      <span className="text-xs font-bold text-slate-400 ml-auto flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-700">
                        <Calendar className="w-3.5 h-3.5" /> {new Date(req.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>

                    <h4 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-indigo-600 transition-colors tracking-tight">{req.title}</h4>
                    <p className="text-slate-500 leading-relaxed mb-8 text-base font-medium dark:text-slate-400">{req.description}</p>

                    {/* Premium Step Visualizer */}
                    <div className="bg-slate-50/80 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 mb-6 dark:bg-slate-900/50">
                      <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-2">
                        <span className={req.step >= 1 ? 'text-indigo-600' : ''}>{t.requestsPage.step1}</span>
                        <span className={req.step >= 2 ? 'text-indigo-600' : ''}>{t.requestsPage.step2}</span>
                        <span className={req.step >= 3 ? 'text-indigo-600' : ''}>{t.requestsPage.step3}</span>
                        <span className={req.step >= 4 ? 'text-indigo-600' : ''}>{t.requestsPage.step4}</span>
                      </div>
                      <div className="relative h-2.5 bg-slate-200/50 rounded-full overflow-hidden shadow-inner">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(req.step / req.totalSteps) * 100}%` }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(79,70,229,0.3)] ${req.status === 'rejected' ? 'bg-gradient-to-r from-red-400 to-rose-500' :
                            req.status === 'approved' ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-indigo-500 to-purple-600'
                            }`}
                        />
                      </div>
                    </div>

                    {req.documents.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {req.documents.map((doc, i) => (
                          <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-50 shadow-sm transition-all hover:scale-105">
                            <FileText className="w-3.5 h-3.5 text-indigo-500 dark:text-slate-400" /> {doc}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex md:flex-col gap-3 justify-center border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-6 md:pt-0 md:pl-8 md:w-40 shrink-0">
                    <Button variant="outline" className="flex-1 rounded-2xl h-12 text-sm font-bold border-slate-200 dark:border-slate-700 hover:text-indigo-600 hover:border-indigo-200 hover:bg-slate-50 transition-all shadow-sm dark:text-slate-300 dark:bg-slate-800" onClick={() => openRequestDetails(req)}>
                      {t.common.details}
                    </Button>
                    {canReviewRequest && req.status === 'pending' && (
                      <Button className="flex-1 rounded-2xl h-12 text-sm font-bold bg-emerald-600 hover:bg-emerald-700" onClick={() => handleUpdateRequestStatus(req, 'approved')}>
                        {t.requestsPage.approved}
                      </Button>
                    )}
                    {canReviewRequest && (req.status === 'approved' || req.status === 'pending') && (
                      <Button variant="outline" className="flex-1 rounded-2xl h-12 text-sm font-bold border-blue-200 text-blue-600 hover:bg-blue-50 dark:bg-slate-800" onClick={() => handleUpdateRequestStatus(req, 'completed')}>
                        {language === 'th' ? 'ปิดงาน' : 'Complete'}
                      </Button>
                    )}
                    {req.status === 'pending' && (
                      <Button variant="ghost" className="flex-1 rounded-2xl h-12 text-sm font-bold text-slate-400 hover:text-red-500 hover:bg-red-50 dark:text-slate-400 dark:bg-slate-800" onClick={() => handleCancelRequest(req)}>
                        {t.common.cancel}
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          {/* Quick Access Grid - Bento Style */}
          <div className="grid grid-cols-2 gap-4">
            {requestTypes.slice(0, 4).map((type, idx) => (
              <motion.div
                key={type.id}
                variants={itemVariants}
                whileHover={{ y: -5, scale: 1.05 }}
                onClick={() => {
                  if (canCreateRequest) {
                    setFormData((current) => ({ ...current, type: type.name }));
                    setIsDialogOpen(true);
                  } else {
                    toast.info(type.name);
                  }
                }}
                className="bg-white/60 backdrop-blur-xl p-5 rounded-3xl shadow-sm border border-white/60 dark:border-slate-800/60 flex flex-col items-center text-center gap-3 hover:shadow-xl transition-all cursor-pointer group dark:bg-slate-900/50"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${type.color} bg-opacity-40 group-hover:scale-110 shadow-sm group-hover:shadow-md`}>
                  {type.icon}
                </div>
                <span className="font-bold text-slate-700 dark:text-slate-300 text-xs tracking-tight">{type.name}</span>
              </motion.div>
            ))}
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-[80px]" />
            <div className="absolute bottom-10 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[60px]" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center dark:bg-slate-900/50">
                  <Info className="w-6 h-6 text-indigo-300" />
                </div>
                <h3 className="font-bold text-xl tracking-tight">{t.requestsPage.helpCenter}</h3>
              </div>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed font-medium">{t.requestsPage.helpDesc}</p>

              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group dark:bg-slate-900/50" onClick={() => window.location.href = 'tel:053942123'}>
                  <div className="w-12 h-12 rounded-2xl bg-white/10 text-indigo-300 flex items-center justify-center font-black shadow-lg group-hover:scale-110 transition-transform dark:bg-slate-900/50">
                    CS
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-0.5">Contact Support</div>
                    <div className="font-bold text-base">053-942123</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group dark:bg-slate-900/50" onClick={() => toast.info('LINE Official: @diicamt')}>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black shadow-lg group-hover:scale-110 transition-transform">
                    Li
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-0.5">LINE Official</div>
                    <div className="font-bold text-base">@diicamt</div>
                  </div>
                </div>
              </div>

              <Button className="w-full mt-8 rounded-2xl h-14 bg-white dark:bg-slate-900 text-slate-900 dark:text-white hover:bg-slate-100 font-bold transform active:scale-95 transition-all" onClick={() => navigate('/messages')}>{t.requestsPage.chatStaff}</Button>
            </div>
          </div>

          <div className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-white/60 dark:border-slate-800/60 shadow-sm p-8 dark:bg-slate-900/50">
            <h3 className="font-black text-slate-900 dark:text-white mb-6 text-sm uppercase tracking-[0.15em] flex items-center gap-2">
              <div className="w-1 h-4 bg-indigo-500 rounded-full" />
              {t.requestsPage.faq}
            </h3>
            <div className="space-y-2">
              {(language === 'en' ? ['How many days does a certificate request take?', 'Steps for leave of absence', 'How to reset password?', 'Download form G.01'] : ['การขอใบรับรองใช้เวลากี่วัน?', 'ขั้นตอนการลาพักการศึกษา', 'ลืมรหัสผ่านทำอย่างไร?', 'ดาวน์โหลดแบบฟอร์ม ก.01']).map((q, i) => (
                <div key={i} className="flex items-center justify-between p-4 hover:bg-white dark:hover:bg-slate-800 rounded-2xl cursor-pointer group transition-all shadow-none hover:shadow-md border border-transparent hover:border-slate-100 dark:bg-slate-900 dark:border-slate-700" onClick={() => toast.info(q)}>
                  <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white font-medium">{q}</span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-all group-hover:translate-x-1 dark:text-slate-400" />
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-4 text-xs font-bold text-slate-400 rounded-xl" onClick={() => toast.info(language === 'th' ? 'FAQ ทั้งหมดจะเปิดในศูนย์ช่วยเหลือเมื่อเชื่อมต่อ knowledge base แล้ว' : 'Full FAQ will open after the knowledge base is connected.')}>{t.requestsPage.viewAllFAQ}</Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Info(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  )
}
