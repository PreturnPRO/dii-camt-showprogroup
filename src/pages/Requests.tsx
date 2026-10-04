import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileBox, FileText, Clock, CheckCircle, XCircle, Plus, Filter, Send,
  Upload, X, AlertCircle, ArrowRight, Hourglass, Calendar, Download,
  ChevronRight, FileQuestion, ArrowUpRight, Inbox, Loader2
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
import { API_BASE_URL, api } from '@/lib/api';
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
  comments: RequestComment[];
};

type RequestComment = {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
};

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);

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
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = React.useState(false);
  const [downloadingAttachment, setDownloadingAttachment] = React.useState<number | null>(null);
  const [requests, setRequests] = React.useState<RequestRow[]>([]);
  const [requestLoadError, setRequestLoadError] = React.useState('');
  const [reloadRequestsKey, setReloadRequestsKey] = React.useState(0);
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [selectedRequest, setSelectedRequest] = React.useState<RequestRow | null>(null);
  const [commentText, setCommentText] = React.useState('');
  const [expandedFaq, setExpandedFaq] = React.useState<number | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [formData, setFormData] = React.useState({
    type: '',
    title: '',
    description: ''
  });

  React.useEffect(() => {
    let isMounted = true;
    setRequestLoadError('');

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
            comments: asArray(request.comments).map((commentValue) => {
              const comment = asRecord(commentValue);
              return {
                id: asString(comment.id),
                authorId: asString(comment.authorId),
                text: asString(comment.text),
                createdAt: asDate(comment.createdAt).toISOString(),
              };
            }),
          };
        });
        setRequests(mapped);
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        const message = error instanceof Error ? error.message : 'Unable to load requests';
        setRequestLoadError(message);
        toast.error(language === 'th' ? `โหลดคำร้องไม่สำเร็จ: ${message}` : `Unable to load requests: ${message}`);
      });

    return () => {
      isMounted = false;
    };
  }, [language, reloadRequestsKey]);

  const handleSubmit = async () => {
    if (!formData.type || !formData.title || !formData.description || isSubmitting) {
      toast.error(t.requestsPage.fillComplete);
      return;
    }

    setIsSubmitting(true);
    try {
      const documents = await Promise.all(selectedFiles.map(async (file) => {
        const upload = await api.files.upload(file, { category: 'student-requests', visibility: 'private' });
        return asString(asRecord(upload.asset).url);
      }));
      const response = await api.requests.create({
        type: formData.type,
        title: formData.title,
        description: formData.description,
        documents,
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
        comments: [],
      };

      setRequests((current) => [newRequest, ...current]);
      setIsDialogOpen(false);
      setFormData({ type: '', title: '', description: '' });
      setSelectedFiles([]);
      toast.success(t.requestsPage.submitSuccess);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.requestsPage.fillComplete);
    } finally {
      setIsSubmitting(false);
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
      setSelectedRequest((current) => current?.id === request.id ? {
        ...current,
        status: asString(updated.status, status),
        step: status === 'rejected' ? 1 : current.totalSteps,
        updatedAt: asDate(updated.reviewedAt, new Date()).toISOString().split('T')[0],
      } : current);
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
    setSelectedRequest(request);
    setCommentText('');
  };

  const handleAddComment = async () => {
    const text = commentText.trim();
    if (!selectedRequest || !text || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      const response = await api.requests.addComment(selectedRequest.id, text);
      const comment = asRecord(response.comment);
      const nextComment = {
        id: asString(comment.id, String(Date.now())),
        authorId: asString(comment.authorId, user?.id ?? ''),
        text: asString(comment.text, text),
        createdAt: asDate(comment.createdAt, new Date()).toISOString(),
      };
      setRequests((current) => current.map((request) => request.id === selectedRequest.id
        ? { ...request, comments: [...request.comments, nextComment] }
        : request));
      setSelectedRequest((current) => current?.id === selectedRequest.id
        ? { ...current, comments: [...current.comments, nextComment] }
        : current);
      setCommentText('');
      toast.success(language === 'th' ? 'เพิ่มข้อความแล้ว' : 'Comment added');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to add comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDownloadAttachment = async (path: string, index: number) => {
    let assetId: string | undefined;
    try {
      const attachmentUrl = new URL(path, API_BASE_URL);
      assetId = attachmentUrl.pathname.match(/\/files\/assets\/([^/]+)$/)?.[1];
    } catch {
      return;
    }

    if (!assetId || downloadingAttachment !== null) return;

    setDownloadingAttachment(index);
    try {
      const blob = await api.files.download(decodeURIComponent(assetId));
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      const extension = blob.type === 'application/pdf' ? '.pdf'
        : blob.type === 'image/jpeg' ? '.jpg'
          : blob.type === 'image/png' ? '.png' : '';
      link.download = `request-attachment-${index + 1}${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to download attachment');
    } finally {
      setDownloadingAttachment(null);
    }
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
    accentColor: string;
    iconBg: string;
    subtext?: string;
  };

  const StatCard = ({ icon: Icon, label, value, accentColor, iconBg, subtext }: StatCardProps) => (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className="relative overflow-hidden rounded-2xl p-4 bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{label}</span>
          <div className={`p-2 rounded-xl ${iconBg} ${accentColor} border border-current/15 shrink-0`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <h3 className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-slate-50 tracking-tight">{value}</h3>
      </div>
      {subtext && <p className="text-[11px] text-slate-400 mt-2 font-mono">{subtext}</p>}
    </motion.div>
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 pb-8"
    >
      {/* Header Section — Aligned with ShowPro Standard */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <motion.div
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium mb-1.5"
          >
            <FileBox className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
            <span>{t.requestsPage.subtitle}</span>
          </motion.div>
          <motion.h1
            className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-slate-50 tracking-tight"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            {t.requestsPage.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 font-extrabold">{t.requestsPage.titleHighlight}</span>
          </motion.h1>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          {canCreateRequest && (
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl px-5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs h-10 text-xs font-semibold transform active:scale-95 transition-all">
                <Plus className="w-4 h-4 mr-1.5" /> {t.requestsPage.newRequest}
              </Button>
            </DialogTrigger>
          )}
          <DialogContent className="sm:max-w-[560px] bg-white dark:bg-[#0c1222] p-0 overflow-hidden gap-0 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl">
            <div className="p-6 bg-slate-900 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <DialogTitle className="text-xl font-bold tracking-tight">{t.requestsPage.newRequest}</DialogTitle>
              <DialogDescription className="mt-1 text-xs text-slate-400">{t.requestsPage.formDesc}</DialogDescription>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="type" className="text-xs text-slate-700 dark:text-slate-300 font-semibold">{t.requestsPage.requestType}</Label>
                <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
                  <SelectTrigger className="rounded-xl h-11 bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-xs font-medium">
                    <SelectValue placeholder={t.requestsPage.selectTopic} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200/80 dark:border-slate-800 shadow-lg p-1">
                    {requestTypes.map(t => (
                      <SelectItem key={t.id} value={t.name} className="rounded-lg py-2 text-xs font-medium">
                        <div className="flex items-center gap-2">
                          <span className="p-1 rounded-md bg-slate-100 dark:bg-slate-800">{t.icon}</span>
                          {t.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs text-slate-700 dark:text-slate-300 font-semibold">{t.requestsPage.requestTitle}</Label>
                <Input
                  id="title"
                  placeholder={t.requestsPage.titlePlaceholder}
                  className="rounded-xl h-11 bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-xs font-medium"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="desc" className="text-xs text-slate-700 dark:text-slate-300 font-semibold">{t.requestsPage.requestDetails}</Label>
                <Textarea
                  id="desc"
                  placeholder={t.requestsPage.detailsPlaceholder}
                  className="rounded-xl min-h-[110px] bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-xs resize-none p-3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-700 dark:text-slate-300 font-semibold">{t.requestsPage.attachments}</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  multiple
                  className="sr-only"
                  onChange={(event) => {
                    const files = Array.from(event.currentTarget.files ?? []);
                    const validFiles = files.filter((file) => {
                      if (!ALLOWED_ATTACHMENT_TYPES.has(file.type) || file.size > MAX_ATTACHMENT_SIZE) {
                        toast.error(language === 'th'
                          ? `${file.name}: รองรับเฉพาะ PDF, JPG, PNG ขนาดไม่เกิน 10MB`
                          : `${file.name}: use PDF, JPG, or PNG files up to 10MB`);
                        return false;
                      }
                      return true;
                    });
                    setSelectedFiles((current) => [
                      ...current,
                      ...validFiles.filter((file) => !current.some((existing) =>
                        existing.name === file.name &&
                        existing.size === file.size &&
                        existing.lastModified === file.lastModified)),
                    ]);
                    event.currentTarget.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                >
                  <Upload className="w-6 h-6 mb-2 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t.requestsPage.uploadClick}</p>
                  <p className="text-[10px] mt-0.5 opacity-70">{t.requestsPage.fileSupport}</p>
                </button>
                {selectedFiles.length > 0 && (
                  <ul className="space-y-1">
                    {selectedFiles.map((file, index) => (
                      <li key={`${file.name}-${file.lastModified}`} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-slate-600 dark:text-slate-300">{file.name}</span>
                        <button
                          type="button"
                          aria-label={language === 'th' ? `ลบไฟล์ ${file.name}` : `Remove ${file.name}`}
                          onClick={() => setSelectedFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 gap-2">
              <Button variant="ghost" size="sm" onClick={() => {
                setIsDialogOpen(false);
                setSelectedFiles([]);
              }} className="rounded-xl h-9 text-xs">{t.common.cancel}</Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="rounded-xl h-9 px-5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    <span>{language === 'th' ? 'กำลังยื่นคำร้อง...' : 'Submitting...'}</span>
                  </>
                ) : (
                  <span>{t.requestsPage.submitNow}</span>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={selectedRequest !== null} onOpenChange={(open) => {
          if (!open) setSelectedRequest(null);
        }}>
          <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto bg-white dark:bg-[#0c1222]">
            {selectedRequest && (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedRequest.title}</DialogTitle>
                  <DialogDescription>
                    {selectedRequest.type} · {getStatusText(selectedRequest.status)}
                    {selectedRequest.studentName && ` · ${selectedRequest.studentName}`}
                    {selectedRequest.studentId && ` (${selectedRequest.studentId})`}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{selectedRequest.description}</p>
                  {selectedRequest.documents.length > 0 && (
                    <section className="space-y-2">
                      <h3 className="text-sm font-semibold">{t.requestsPage.attachments}</h3>
                      <ul className="space-y-1">
                        {selectedRequest.documents.map((document, index) => {
                          const href = document.startsWith('http')
                            ? document
                            : `${new URL(API_BASE_URL).origin}${document.startsWith('/') ? document : `/${document}`}`;
                          return (
                            <li key={`${document}-${index}`}>
                              <a
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(event) => {
                                  if (/\/files\/assets\/[^/]+$/.test(new URL(href).pathname)) {
                                    event.preventDefault();
                                    void handleDownloadAttachment(document, index);
                                  }
                                }}
                                aria-busy={downloadingAttachment === index}
                                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline dark:text-blue-400"
                              >
                                <Download className="h-4 w-4" />
                                {language === 'th' ? `เอกสารแนบ ${index + 1}` : `Attachment ${index + 1}`}
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  )}
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold">{language === 'th' ? 'ประวัติการสนทนา' : 'Conversation'}</h3>
                    {selectedRequest.comments.length === 0 ? (
                      <p className="text-sm text-slate-500">{language === 'th' ? 'ยังไม่มีข้อความ' : 'No comments yet.'}</p>
                    ) : (
                      <ul className="space-y-2">
                        {selectedRequest.comments.map((comment) => (
                          <li key={comment.id} className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">
                            <p className="mb-1 text-xs font-medium text-slate-500">
                              {comment.authorId === user?.id
                                ? (language === 'th' ? 'คุณ' : 'You')
                                : (canReviewRequest
                                  ? (language === 'th' ? 'นักศึกษา' : 'Student')
                                  : (language === 'th' ? 'เจ้าหน้าที่' : 'Staff'))}
                            </p>
                            <p className="whitespace-pre-wrap">{comment.text}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {comment.createdAt ? new Date(comment.createdAt).toLocaleString(language === 'th' ? 'th-TH' : 'en-US') : ''}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                    <Textarea
                      value={commentText}
                      onChange={(event) => setCommentText(event.target.value)}
                      placeholder={language === 'th' ? 'เขียนข้อความถึงผู้เกี่ยวข้อง...' : 'Write a message about this request...'}
                      maxLength={2000}
                    />
                    <Button onClick={handleAddComment} disabled={!commentText.trim() || isSubmittingComment}>
                      {isSubmittingComment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      {language === 'th' ? 'ส่งข้อความ' : 'Send message'}
                    </Button>
                  </section>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Stat Cards — Compact 4 Columns with Semantic Colors */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <StatCard
          icon={Inbox}
          label={t.requestsPage.allRequests}
          value={requests.length}
          accentColor="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-500/10"
          subtext="รายการทั้งหมด"
        />
        <StatCard
          icon={Hourglass}
          label={t.requestsPage.processingTab}
          value={requests.filter(r => r.status === 'pending').length}
          accentColor="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-500/10"
          subtext="รอเจ้าหน้าที่ตรวจสอบ"
        />
        <StatCard
          icon={CheckCircle}
          label={t.requestsPage.approvedTab}
          value={requests.filter(r => r.status === 'approved' || r.status === 'completed').length}
          accentColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-500/10"
          subtext="เสร็จสมบูรณ์"
        />
        <StatCard
          icon={XCircle}
          label={t.requestsPage.rejectedTab}
          value={requests.filter(r => r.status === 'rejected').length}
          accentColor="text-rose-600 dark:text-rose-400"
          iconBg="bg-rose-500/10"
          subtext="ไม่ผ่านการอนุมัติ"
        />
      </div>

      {/* Main Grid: Request Tracking (68%) & Quick Actions / Support (32%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Request Tracking Area (8 of 12 cols => ~67%) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t.requestsPage.trackStatus}</h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-500 hover:text-blue-600 text-xs font-semibold h-8"
              onClick={() => setRequests((current) => [...current].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))}
            >
              {t.requestsPage.viewHistory} <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          <div className="space-y-3.5">
            {requestLoadError && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                <p>{language === 'th' ? 'ไม่สามารถโหลดคำร้องได้' : 'Could not load requests'}: {requestLoadError}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setReloadRequestsKey((current) => current + 1)}>
                  {language === 'th' ? 'ลองอีกครั้ง' : 'Retry'}
                </Button>
              </div>
            )}
            {requests.length === 0 && (
              !requestLoadError && (
                <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1222] p-8 text-center">
                  <Inbox className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-50" />
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">{language === 'th' ? 'ยังไม่มีคำร้อง' : 'No requests yet'}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{language === 'th' ? 'กดสร้างคำร้องใหม่เพื่อบันทึกข้อมูลลงระบบ' : 'Create a request to get started.'}</p>
                </div>
              )
            )}

            {requests.map((req) => {
              const steps = [
                { id: 1, label: t.requestsPage.step1 },
                { id: 2, label: t.requestsPage.step2 },
                { id: 3, label: t.requestsPage.step3 },
                { id: 4, label: t.requestsPage.step4 }
              ];

              return (
                <motion.div
                  key={req.id}
                  variants={itemVariants}
                  whileHover={{ y: -1 }}
                  transition={{ duration: 0.15 }}
                  className="bg-white dark:bg-[#0c1222] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200"
                >
                  {/* Card Header: Type Badge + Status + Date */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-0.5 rounded-md border border-blue-200/50 dark:border-blue-800/50">
                        {req.type}
                      </span>
                      <Badge variant="outline" className={`font-semibold flex items-center border text-[11px] px-2.5 py-0.5 rounded-md ${getStatusColor(req.status)}`}>
                        {getStatusIcon(req.status)} {getStatusText(req.status)}
                      </Badge>
                    </div>

                    <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(req.createdAt).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mb-1.5 tracking-tight">
                    {req.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4 line-clamp-2">
                    {req.description}
                  </p>

                  {/* Modern Stepper / Timeline Visualizer */}
                  <div className="bg-slate-50/70 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/70 mb-4">
                    <div className="grid grid-cols-4 gap-2 text-center relative">
                      {steps.map((st, idx) => {
                        const isCompleted = req.status === 'approved' || req.status === 'completed' || req.step > st.id;
                        const isCurrent = req.step === st.id && req.status === 'pending';
                        const isRejected = req.status === 'rejected' && req.step === st.id;

                        return (
                          <div key={st.id} className="flex flex-col items-center relative">
                            {/* Stepper Dot */}
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px] font-bold mb-1.5 transition-colors ${
                              isCompleted
                                ? 'bg-emerald-500 text-white'
                                : isCurrent
                                ? 'bg-blue-600 text-white ring-2 ring-blue-500/20'
                                : isRejected
                                ? 'bg-rose-500 text-white'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                            }`}>
                              {isCompleted ? '✓' : st.id}
                            </div>
                            <span className={`text-[10px] font-medium leading-tight line-clamp-1 ${
                              isCompleted
                                ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                                : isCurrent
                                ? 'text-blue-600 dark:text-blue-400 font-semibold'
                                : isRejected
                                ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                : 'text-slate-400'
                            }`}>
                              {st.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Footer Action Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-2">
                      {req.documents.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          <FileText className="w-3.5 h-3.5 text-blue-500" />
                          <span>{req.documents.length} เอกสารแนบ</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {canReviewRequest && req.status === 'pending' && (
                        <>
                          <Button size="sm" variant="outline" className="h-8 text-xs text-red-600" onClick={() => handleUpdateRequestStatus(req, 'rejected')}>
                            {language === 'th' ? 'ปฏิเสธ' : 'Reject'}
                          </Button>
                          <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg" onClick={() => handleUpdateRequestStatus(req, 'approved')}>
                            {t.requestsPage.approved}
                          </Button>
                        </>
                      )}
                      {canReviewRequest && req.status === 'approved' && (
                        <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg" onClick={() => handleUpdateRequestStatus(req, 'completed')}>
                          {language === 'th' ? 'ทำเครื่องหมายเสร็จสิ้น' : 'Mark complete'}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg h-8 text-xs border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium"
                        onClick={() => openRequestDetails(req)}
                      >
                        {t.common.details} <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Quick Actions + Support Center + FAQ (4 of 12 cols => ~33%) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Quick Actions (บริการที่ใช้บ่อย) */}
          {canCreateRequest && (
          <div className="bg-white dark:bg-[#0c1222] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">บริการที่ใช้บ่อย</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {requestTypes.slice(0, 4).map((type) => (
                <motion.div
                  key={type.id}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.12 }}
                  onClick={() => {
                    if (canCreateRequest) {
                      setFormData((current) => ({ ...current, type: type.name }));
                      setIsDialogOpen(true);
                    }
                  }}
                  className="bg-slate-50/70 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800/70 flex flex-col items-center text-center gap-2 hover:border-blue-300 dark:hover:border-blue-800/60 transition-all cursor-pointer group"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${type.color} bg-opacity-30 group-hover:scale-105 transition-transform`}>
                    {type.icon}
                  </div>
                  <span className="font-semibold text-slate-700 dark:text-slate-200 text-xs tracking-tight line-clamp-1">{type.name}</span>
                </motion.div>
              ))}
            </div>
          </div>
          )}

          {/* Support Center (ศูนย์บริการช่วยเหลือ) */}
          <div className="bg-white dark:bg-[#0c1222] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
            <div className="flex items-center gap-2.5 mb-2 px-1">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Info className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">{t.requestsPage.helpCenter}</h3>
                <p className="text-[11px] text-slate-400">ติดต่อเจ้าหน้าที่หากพบปัญหา</p>
              </div>
            </div>

            <div className="space-y-2 mt-3">
              <a
                href="tel:053942123"
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center font-mono font-bold text-[10.5px]">
                    CS
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-mono">CONTACT SUPPORT</div>
                    <div className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">053-942123</div>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </a>

              <a
                href="https://line.me/R/ti/p/@diicamt"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-mono font-bold text-[10.5px]">
                    Li
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-mono">LINE OFFICIAL</div>
                    <div className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">@diicamt</div>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </a>
            </div>

            <Button
              size="sm"
              className="w-full mt-3 rounded-xl h-9 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 text-xs font-semibold transition-all"
              onClick={() => navigate('/messages')}
            >
              {t.requestsPage.chatStaff}
            </Button>
          </div>

          {/* Interactive FAQ (คำถามที่พบบ่อย) */}
          <div className="bg-white dark:bg-[#0c1222] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              {t.requestsPage.faq}
            </h3>
            <div className="space-y-1">
              {(language === 'en'
                ? ['How many days does a certificate request take?', 'Steps for leave of absence', 'How to reset password?', 'Download form G.01']
                : ['การขอใบรับรองใช้เวลากี่วัน?', 'ขั้นตอนการลาพักการศึกษา', 'ลืมรหัสผ่านทำอย่างไร?', 'ดาวน์โหลดแบบฟอร์ม คำร้อง ก.01']
              ).map((q, i) => (
                <div key={i}>
                {i === 2 ? (
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="flex w-full items-center justify-between p-2 rounded-lg text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 group transition-all"
                  >
                    <span className="text-xs text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors font-medium">{q}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-500 group-hover:text-blue-600" />
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-expanded={expandedFaq === i || expandedFaq === -1}
                    onClick={() => setExpandedFaq((current) => current === i ? null : i)}
                    className="flex w-full items-center justify-between p-2 rounded-lg text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 group transition-all"
                  >
                    <span className="text-xs text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors font-medium">{q}</span>
                    <ChevronRight className={`w-3.5 h-3.5 text-slate-300 dark:text-slate-500 group-hover:text-blue-600 transition-transform ${expandedFaq === i || expandedFaq === -1 ? 'rotate-90' : ''}`} />
                  </button>
                )}
                {(expandedFaq === i || expandedFaq === -1) && i !== 2 && (
                  <p className="px-2 pb-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {language === 'th'
                      ? i === 0
                        ? 'ระยะเวลาดำเนินการขึ้นอยู่กับประเภทคำร้องและเอกสารที่แนบ ตรวจสอบสถานะได้ที่หน้านี้ หรือส่งข้อความสอบถามเจ้าหน้าที่'
                        : i === 1
                          ? 'เลือกประเภทลาพักการศึกษาในแบบฟอร์ม ระบุเหตุผลและแนบเอกสารประกอบ จากนั้นส่งคำร้องเพื่อติดตามผลที่หน้านี้'
                          : 'หากต้องการแบบฟอร์ม ก.01 โปรดส่งข้อความหาเจ้าหน้าที่เพื่อขอแบบฟอร์มฉบับล่าสุด'
                      : i === 0
                        ? 'Processing time depends on the request type and supporting documents. Track the status here or message staff for an estimate.'
                        : i === 1
                          ? 'Choose Leave of Absence in the request form, provide the reason and supporting documents, then submit and track it here.'
                          : 'Message staff to request the latest G.01 form.'}
                  </p>
                )}
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 h-7"
              onClick={() => setExpandedFaq((current) => current === -1 ? null : -1)}
            >
              {t.requestsPage.viewAllFAQ}
            </Button>
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
