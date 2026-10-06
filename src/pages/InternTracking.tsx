import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Users, ClipboardList, CheckSquare, Briefcase, Clock, MapPin, Star,
  ArrowLeft, FileText, TrendingUp, Target, Eye, CheckCircle2, AlertCircle,
  MessageSquare, Calendar, Sparkles, Check, Edit3, DollarSign, CreditCard,
  AlertTriangle, Building2, HelpCircle, CheckCircle, Search, Filter,
  UserCheck, ChevronRight, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { asArray, asNumber, asRecord, asString } from '@/lib/live-data';

export type DailyLogItem = {
  id: string;
  date: string;
  hours: number;
  activities: string;
  learnings: string;
  challenges: string;
  status: 'pending' | 'approved' | 'needs_revision';
  mentorComment?: string;
  reviewedBy?: string;
  reviewedAt?: string;
};

export type MonthlyPayment = {
  id: string;
  month: string;
  expectedAmount: number;
  actualAmount: number;
  status: 'paid_full' | 'paid_partial' | 'pending' | 'overdue';
  paidDate?: string;
  notes?: string;
};

export type StipendInfo = {
  monthlyRate: number;
  currentMonth: string;
  currentMonthStatus: 'paid_full' | 'paid_partial' | 'pending' | 'overdue';
  currentMonthActual: number;
  paymentDay: number;
  paymentHistory: MonthlyPayment[];
};

export type InternshipPeriodInfo = {
  startDate: string;
  endDate: string;
  durationMonths: number;
  currentWeek: number;
  totalWeeks: number;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const internsData = [
  {
    id: '1',
    name: 'นายณัฐพงษ์ ใจดี', nameEn: 'Nattapong Jaidee',
    position: 'Backend Developer',
    company: 'Tech Innovation Co.', companyEn: 'Tech Innovation Co.',
    progress: 60, weeks: 8, totalWeeks: 12, rating: 4.5, avatar: 'ณ',
    performance: {
      technical: 85, communication: 78, teamwork: 90, punctuality: 95, initiative: 72,
      weeklyReports: [
        { week: 1, submitted: true, score: 80, summary: 'ทำความเข้าใจ codebase', summaryEn: 'Understanding the codebase' },
        { week: 2, submitted: true, score: 85, summary: 'สร้าง REST API 3 endpoints', summaryEn: 'Built 3 REST API endpoints' },
        { week: 3, submitted: true, score: 88, summary: 'เขียน Unit Tests', summaryEn: 'Wrote Unit Tests' },
        { week: 4, submitted: true, score: 82, summary: 'ปรับปรุง Database Schema', summaryEn: 'Improved Database Schema' },
        { week: 5, submitted: true, score: 90, summary: 'Integrate third-party API', summaryEn: 'Integrated third-party API' },
        { week: 6, submitted: true, score: 87, summary: 'Code Review & Refactoring', summaryEn: 'Code Review & Refactoring' },
        { week: 7, submitted: true, score: 92, summary: 'Deploy to staging', summaryEn: 'Deployed to staging' },
        { week: 8, submitted: false, score: 0, summary: 'รอส่ง', summaryEn: 'Pending' },
      ]
    }
  },
  {
    id: '2',
    name: 'นางสาววิไลลักษณ์ สวยงาม', nameEn: 'Wilailak Suayngam',
    position: 'UX/UI Designer',
    company: 'Design Studio', companyEn: 'Design Studio',
    progress: 45, weeks: 6, totalWeeks: 12, rating: 4.2, avatar: 'ว',
    performance: {
      technical: 80, communication: 92, teamwork: 88, punctuality: 85, initiative: 90,
      weeklyReports: [
        { week: 1, submitted: true, score: 78, summary: 'ศึกษา Design System', summaryEn: 'Studied Design System' },
        { week: 2, submitted: true, score: 82, summary: 'สร้าง Wireframe', summaryEn: 'Created Wireframes' },
        { week: 3, submitted: true, score: 85, summary: 'User Research & Interview', summaryEn: 'User Research & Interviews' },
        { week: 4, submitted: true, score: 88, summary: 'Hi-Fi Prototype', summaryEn: 'Created Hi-Fi Prototype' },
        { week: 5, submitted: true, score: 90, summary: 'Usability Testing', summaryEn: 'Conducted Usability Testing' },
        { week: 6, submitted: false, score: 0, summary: 'รอส่ง', summaryEn: 'Pending' },
      ]
    }
  },
  {
    id: '3',
    name: 'นายสมชาย ดีมาก', nameEn: 'Somchai Deemak',
    position: 'Data Analyst',
    company: 'DataSoft Co.', companyEn: 'DataSoft Co.',
    progress: 80, weeks: 10, totalWeeks: 12, rating: 4.8, avatar: 'ส',
    performance: {
      technical: 95, communication: 82, teamwork: 85, punctuality: 92, initiative: 88,
      weeklyReports: [
        { week: 1, submitted: true, score: 85, summary: 'Data Cleaning Pipeline', summaryEn: 'Built Data Cleaning Pipeline' },
        { week: 2, submitted: true, score: 88, summary: 'EDA & Visualization', summaryEn: 'EDA & Visualization' },
        { week: 3, submitted: true, score: 90, summary: 'ML Model v1', summaryEn: 'Built ML Model v1' },
        { week: 4, submitted: true, score: 92, summary: 'Feature Engineering', summaryEn: 'Feature Engineering' },
        { week: 5, submitted: true, score: 88, summary: 'Model Optimization', summaryEn: 'Model Optimization' },
        { week: 6, submitted: true, score: 95, summary: 'Dashboard สำหรับ Stakeholder', summaryEn: 'Built Stakeholder Dashboard' },
        { week: 7, submitted: true, score: 90, summary: 'A/B Testing Framework', summaryEn: 'A/B Testing Framework' },
        { week: 8, submitted: true, score: 93, summary: 'Automated Reports', summaryEn: 'Created Automated Reports' },
        { week: 9, submitted: true, score: 91, summary: 'Knowledge Transfer', summaryEn: 'Knowledge Transfer' },
        { week: 10, submitted: false, score: 0, summary: 'รอส่ง', summaryEn: 'Pending' },
      ]
    }
  },
];

const defaultPeriods: Record<string, InternshipPeriodInfo> = {
  '1': {
    startDate: '2026-06-01',
    endDate: '2026-08-31',
    durationMonths: 3,
    currentWeek: 8,
    totalWeeks: 12,
  },
  '2': {
    startDate: '2026-06-15',
    endDate: '2026-09-15',
    durationMonths: 3,
    currentWeek: 6,
    totalWeeks: 12,
  },
  '3': {
    startDate: '2026-05-15',
    endDate: '2026-08-15',
    durationMonths: 3,
    currentWeek: 10,
    totalWeeks: 12,
  },
};

const defaultStipends: Record<string, StipendInfo> = {
  '1': {
    monthlyRate: 12000,
    currentMonth: 'กันยายน 2569',
    currentMonthStatus: 'paid_full',
    currentMonthActual: 12000,
    paymentDay: 28,
    paymentHistory: [
      { id: 'pay-1-1', month: 'กรกฎาคม 2569', expectedAmount: 12000, actualAmount: 12000, status: 'paid_full', paidDate: '2026-07-28', notes: 'โอนผ่าน SCB ครบถ้วนตามสัญญารับนักศึกษาฝึกงาน' },
      { id: 'pay-1-2', month: 'สิงหาคม 2569', expectedAmount: 12000, actualAmount: 12000, status: 'paid_full', paidDate: '2026-08-28', notes: 'โอนผ่าน SCB ครบถ้วนตรงเวลา' },
      { id: 'pay-1-3', month: 'กันยายน 2569', expectedAmount: 12000, actualAmount: 12000, status: 'paid_full', paidDate: '2026-09-05', notes: 'โอนงวดล่าสุดเรียบร้อย ได้รับเงินครบ 100%' },
    ],
  },
  '2': {
    monthlyRate: 10000,
    currentMonth: 'กันยายน 2569',
    currentMonthStatus: 'paid_partial',
    currentMonthActual: 8000,
    paymentDay: 30,
    paymentHistory: [
      { id: 'pay-2-1', month: 'กรกฎาคม 2569', expectedAmount: 10000, actualAmount: 10000, status: 'paid_full', paidDate: '2026-07-30', notes: 'โอนเงินครบถ้วน' },
      { id: 'pay-2-2', month: 'สิงหาคม 2569', expectedAmount: 10000, actualAmount: 10000, status: 'paid_full', paidDate: '2026-08-30', notes: 'โอนเงินครบถ้วน' },
      { id: 'pay-2-3', month: 'กันยายน 2569', expectedAmount: 10000, actualAmount: 8000, status: 'paid_partial', paidDate: '2026-09-02', notes: 'โอนงวดแรก ฿8,000 ขาดอีก ฿2,000 กำลังรอฝ่ายบัญชีบริษัทโอนยอดคงเหลือ' },
    ],
  },
  '3': {
    monthlyRate: 15000,
    currentMonth: 'กันยายน 2569',
    currentMonthStatus: 'pending',
    currentMonthActual: 0,
    paymentDay: 25,
    paymentHistory: [
      { id: 'pay-3-1', month: 'กรกฎาคม 2569', expectedAmount: 15000, actualAmount: 15000, status: 'paid_full', paidDate: '2026-07-25', notes: 'โอนผ่าน BBL ครบถ้วน' },
      { id: 'pay-3-2', month: 'สิงหาคม 2569', expectedAmount: 15000, actualAmount: 15000, status: 'paid_full', paidDate: '2026-08-25', notes: 'โอนผ่าน BBL ครบถ้วน' },
      { id: 'pay-3-3', month: 'กันยายน 2569', expectedAmount: 15000, actualAmount: 0, status: 'pending', notes: 'ยังไม่ถึงรอบจ่ายประจำเดือน (รอบจ่าย 25 ก.ย. 2569)' },
    ],
  },
};

type InternRow = typeof internsData[number] & {
  companyId?: string;
  companyAddress?: string;
  mentorName?: string;
  period: InternshipPeriodInfo;
  stipend: StipendInfo;
  dailyLogs: DailyLogItem[];
};

export default function InternTracking() {
  const { t, language } = useLanguage();
  const tr = t.internTracking;
  const [searchParams, setSearchParams] = useSearchParams();
  const [interns, setInterns] = useState<InternRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIntern, setSelectedIntern] = useState<InternRow | null>(null);
  const [detailTab, setDetailTab] = useState<'weekly' | 'daily' | 'stipend'>('daily');
  const [reviewModalLog, setReviewModalLog] = useState<DailyLogItem | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'needs_revision'>('approved');
  const [reviewComment, setReviewComment] = useState('');
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [isApprovingId, setIsApprovingId] = useState<string | null>(null);

  // Search & Stipend Filter in List View
  const [searchQuery, setSearchQuery] = useState('');
  const [stipendFilter, setStipendFilter] = useState<'all' | 'paid_full' | 'paid_partial' | 'pending'>('all');

  // Staff Stipend Update Modal State
  const [isStipendModalOpen, setIsStipendModalOpen] = useState(false);
  const [stipendFormMonth, setStipendFormMonth] = useState('กันยายน 2569');
  const [stipendFormExpected, setStipendFormExpected] = useState<number>(12000);
  const [stipendFormActual, setStipendFormActual] = useState<number>(12000);
  const [stipendFormStatus, setStipendFormStatus] = useState<MonthlyPayment['status']>('paid_full');
  const [stipendFormNotes, setStipendFormNotes] = useState('');

  React.useEffect(() => {
    let isMounted = true;

    api.internship.list()
      .then((response) => {
        if (!isMounted) return;

        const mapped = response.internships.map((item, index) => {
          const record = asRecord(item);
          const fallback = internsData[index % internsData.length];
          const student = asRecord(record.student);
          const studentUser = asRecord(student.user);
          const company = asRecord(record.company);
          const companyUser = asRecord(company.user);
          const evaluation = asRecord(record.evaluation);
          const logs = asArray(record.logs);
          const totalWeeks = Math.max(asNumber(record.duration, fallback.totalWeeks), 1);
          const completedWeeks = Math.min(logs.length || fallback.weeks, totalWeeks);
          const rawScore = asNumber(evaluation.overallScore, fallback.rating * 20);
          const rating = Number((rawScore > 5 ? rawScore / 20 : rawScore).toFixed(1));
          const fallbackReports = fallback.performance.weeklyReports;
          const weeklyReports = logs.length
            ? [
                ...logs.map((logItem, logIndex) => {
                  const log = asRecord(logItem);
                  return {
                    week: logIndex + 1,
                    submitted: true,
                    score: Math.round(rawScore || 80),
                    summary: asString(log.activities, fallbackReports[logIndex % fallbackReports.length]?.summary ?? '-'),
                    summaryEn: asString(log.activities, fallbackReports[logIndex % fallbackReports.length]?.summaryEn ?? '-'),
                  };
                }),
                ...(logs.length < totalWeeks
                  ? [{
                      week: logs.length + 1,
                      submitted: false,
                      score: 0,
                      summary: fallbackReports[Math.min(logs.length, fallbackReports.length - 1)]?.summary ?? 'Pending',
                      summaryEn: 'Pending',
                    }]
                  : []),
              ]
            : fallbackReports;

          const fallbackDailyLogs: DailyLogItem[] = [
            {
              id: `log-${asString(record.id, fallback.id)}-1`,
              date: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10),
              hours: 8,
              activities: 'ร่วมประชุมรับบรีฟโปรเจกต์ และศึกษาโครงสร้างระบบงานส่วนที่ได้รับมอบหมาย',
              learnings: 'เข้าใจภาพรวม Workflow ของทีม และมาตรฐานการส่งมอบโค้ด',
              challenges: 'การทำความเข้าใจเอกสาร API ภายในองค์กรที่มีรายละเอียดสูง',
              status: 'approved',
              mentorComment: 'ทำความเข้าใจงานได้รวดเร็วดีครับ เริ่มลงมือทำโมดูลแรกได้เลย',
              reviewedBy: 'อาจารย์ที่ปรึกษา / Mentor',
              reviewedAt: '2026-09-06',
            },
            {
              id: `log-${asString(record.id, fallback.id)}-2`,
              date: new Date(Date.now() - 86400000 * 1).toISOString().slice(0, 10),
              hours: 8,
              activities: 'พัฒนาคอมโพเนนต์ตามข้อกำหนดในสปรินต์ และแก้ไขจุดบกพร่องตามรายงาน',
              learnings: 'ฝึกฝนการเขียนโค้ดให้สอดคล้องกับแนวทาง Clean Code และ Design Tokens',
              challenges: 'การจัดการความเข้ากันได้ของการแสดงผลบนเบราว์เซอร์ต่างๆ',
              status: 'approved',
              mentorComment: 'โค้ดเป็นระเบียบเรียบร้อย สื่อสารกับทีมได้ดีมากครับ',
              reviewedBy: 'อาจารย์ที่ปรึกษา / Mentor',
              reviewedAt: '2026-09-07',
            },
            {
              id: `log-${asString(record.id, fallback.id)}-3`,
              date: new Date().toISOString().slice(0, 10),
              hours: 8,
              activities: 'จัดทำระบบทดสอบและบันทึกรายงานความคืบหน้ารอบสัปดาห์',
              learnings: 'การเขียนรายงานสรุปการทำงานเชิงวิชาชีพและการสรุปข้อเสนอแนะ',
              challenges: 'การบริหารเวลาให้ครอบคลุมทั้งการพัฒนาฟีเจอร์และการจัดทำเอกสาร',
              status: 'pending',
            },
          ];

          const dailyLogs: DailyLogItem[] = logs.length
            ? logs.map((logItem, logIndex) => {
                const log = asRecord(logItem);
                return {
                  id: asString(log.id, `intern-log-${logIndex}`),
                  date: asString(log.date, new Date().toISOString().slice(0, 10)).slice(0, 10),
                  hours: asNumber(log.hours, 8),
                  activities: asString(log.activities, 'ปฏิบัติหน้าที่ตามที่ได้รับมอบหมายในองค์กร'),
                  learnings: asString(log.learnings, 'เรียนรู้กระบวนการพัฒนาและเครื่องมือในงานจริง'),
                  challenges: asString(log.challenges, 'การประสานงานข้ามสายงาน'),
                  status: (asString(log.status, logIndex === logs.length - 1 ? 'pending' : 'approved') as DailyLogItem['status']),
                  mentorComment: asString(log.mentorComment, ''),
                  reviewedBy: asString(log.reviewedBy, ''),
                  reviewedAt: asString(log.reviewedAt, ''),
                };
              })
            : fallbackDailyLogs;

          const internKey = asString(record.id, fallback.id);
          const period = defaultPeriods[internKey] || defaultPeriods['1'];
          const stipend = defaultStipends[internKey] || defaultStipends['1'];

          return {
            ...fallback,
            id: asString(record.id, fallback.id),
            name: asString(studentUser.nameThai, fallback.name),
            nameEn: asString(studentUser.name, fallback.nameEn),
            position: asString(record.position, fallback.position),
            company: asString(company.companyName, asString(record.companyName, fallback.company)),
            companyEn: asString(companyUser.name, asString(record.companyName, fallback.companyEn)),
            companyAddress: asString(company.address, fallback.company === 'Tech Innovation Co., Ltd.' ? 'อาคารสาทรสแควร์ ชั้น 24 กรุงเทพฯ' : fallback.company === 'Design Studio' ? 'สุขุมวิท 71 กรุงเทพฯ' : 'นิมมานเหมินท์ เชียงใหม่'),
            mentorName: asString(record.mentorName, fallback.id === '1' ? 'คุณสมเกียรติ สิทธิพร (Senior Tech Lead)' : fallback.id === '2' ? 'คุณวิภาวรรณ สดใส (Head of Design)' : 'ดร.ธนกฤต ปัญญาดี (Lead Data Scientist)'),
            period,
            stipend,
            progress: Math.round((completedWeeks / totalWeeks) * 100),
            weeks: completedWeeks,
            totalWeeks,
            rating,
            avatar: asString(studentUser.nameThai, fallback.avatar).charAt(0) || fallback.avatar,
            dailyLogs,
            performance: {
              technical: Math.round(asNumber(evaluation.technicalSkills, fallback.performance.technical)),
              communication: Math.round(asNumber(evaluation.softSkills, fallback.performance.communication)),
              teamwork: Math.round(asNumber(evaluation.softSkills, fallback.performance.teamwork)),
              punctuality: Math.round(asNumber(evaluation.workEthic, fallback.performance.punctuality)),
              initiative: Math.round(asNumber(evaluation.problemSolving, fallback.performance.initiative)),
              weeklyReports,
            },
          };
        });

        setInterns(mapped);
      })
      .catch(() => undefined)
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  React.useEffect(() => {
    const targetInternId = searchParams.get('internId');
    const targetTab = searchParams.get('tab');
    if (targetInternId && interns.length > 0) {
      const found = interns.find(i => i.id === targetInternId);
      if (found) {
        setSelectedIntern(found);
        if (targetTab === 'stipend' || targetTab === 'daily' || targetTab === 'weekly') {
          setDetailTab(targetTab);
        }
      }
    }
  }, [searchParams, interns]);

  const handleOpenStipendModal = (targetIntern?: InternRow, payment?: MonthlyPayment) => {
    const target = targetIntern || selectedIntern;
    if (!target) return;
    if (payment) {
      setStipendFormMonth(payment.month);
      setStipendFormExpected(payment.expectedAmount);
      setStipendFormActual(payment.actualAmount);
      setStipendFormStatus(payment.status);
      setStipendFormNotes(payment.notes || '');
    } else {
      setStipendFormMonth(target.stipend.currentMonth);
      setStipendFormExpected(target.stipend.monthlyRate);
      setStipendFormActual(target.stipend.currentMonthActual);
      setStipendFormStatus(target.stipend.currentMonthStatus);
      setStipendFormNotes('');
    }
    setIsStipendModalOpen(true);
  };

  const handleSaveStipend = () => {
    if (!selectedIntern) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    const existingIndex = selectedIntern.stipend.paymentHistory.findIndex(p => p.month === stipendFormMonth);
    const updatedHistory = [...selectedIntern.stipend.paymentHistory];

    const newPaymentRecord: MonthlyPayment = {
      id: existingIndex >= 0 ? updatedHistory[existingIndex].id : `pay-${Date.now()}`,
      month: stipendFormMonth,
      expectedAmount: stipendFormExpected,
      actualAmount: stipendFormActual,
      status: stipendFormStatus,
      paidDate: stipendFormStatus !== 'pending' ? (existingIndex >= 0 && updatedHistory[existingIndex].paidDate ? updatedHistory[existingIndex].paidDate : todayStr) : undefined,
      notes: stipendFormNotes.trim(),
    };

    if (existingIndex >= 0) {
      updatedHistory[existingIndex] = newPaymentRecord;
    } else {
      updatedHistory.push(newPaymentRecord);
    }

    const updatedStipend: StipendInfo = {
      ...selectedIntern.stipend,
      monthlyRate: stipendFormExpected,
      currentMonth: stipendFormMonth,
      currentMonthStatus: stipendFormStatus,
      currentMonthActual: stipendFormActual,
      paymentHistory: updatedHistory,
    };

    const updatedIntern: InternRow = {
      ...selectedIntern,
      stipend: updatedStipend,
    };

    setSelectedIntern(updatedIntern);
    setInterns((prev) => prev.map((item) => (item.id === updatedIntern.id ? updatedIntern : item)));
    setIsStipendModalOpen(false);

    toast.success(language === 'th' ? 'บันทึกสถานะเบี้ยเลี้ยงสำเร็จ' : 'Stipend status updated', {
      description: language === 'th'
        ? `อัปเดตสถานะรอบเดือน ${stipendFormMonth}: ${
            stipendFormStatus === 'paid_full' ? 'จ่ายครบถ้วน' :
            stipendFormStatus === 'paid_partial' ? 'จ่ายไม่ครบ' :
            stipendFormStatus === 'pending' ? 'รอการโอน' : 'เกินกำหนดชำระ'
          }`
        : `Updated payment status for ${stipendFormMonth}`,
    });
  };

  const handleQuickApprove = async (logId: string) => {
    if (!selectedIntern || isApprovingId) return;
    setIsApprovingId(logId);
    await new Promise((res) => setTimeout(res, 300));
    const updatedLogs = selectedIntern.dailyLogs.map((log) =>
      log.id === logId
        ? {
            ...log,
            status: 'approved' as const,
            reviewedBy: 'อาจารย์ที่ปรึกษา / Mentor',
            reviewedAt: new Date().toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US'),
          }
        : log
    );
    const updatedIntern = {
      ...selectedIntern,
      dailyLogs: updatedLogs,
    };
    setSelectedIntern(updatedIntern);
    setInterns((prev) => prev.map((item) => (item.id === updatedIntern.id ? updatedIntern : item)));
    setIsApprovingId(null);
    toast.success(language === 'th' ? 'อนุมัติบันทึกเรียบร้อย' : 'Log approved', {
      description: language === 'th' ? 'บันทึกการทำงานได้รับการอนุมัติแล้ว' : 'Daily log approved successfully',
    });
  };

  const handleOpenReviewModal = (log: DailyLogItem) => {
    setReviewModalLog(log);
    setReviewStatus(log.status === 'needs_revision' ? 'needs_revision' : 'approved');
    setReviewComment(log.mentorComment || '');
  };

  const handleSaveReview = async () => {
    if (!selectedIntern || !reviewModalLog || isSavingReview) return;
    setIsSavingReview(true);
    await new Promise((res) => setTimeout(res, 300));
    const updatedLogs = selectedIntern.dailyLogs.map((log) =>
      log.id === reviewModalLog.id
        ? {
            ...log,
            status: reviewStatus,
            mentorComment: reviewComment.trim(),
            reviewedBy: 'อาจารย์ที่ปรึกษา / Mentor',
            reviewedAt: new Date().toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US'),
          }
        : log
    );
    const updatedIntern = {
      ...selectedIntern,
      dailyLogs: updatedLogs,
    };
    setSelectedIntern(updatedIntern);
    setInterns((prev) => prev.map((item) => (item.id === updatedIntern.id ? updatedIntern : item)));
    setIsSavingReview(false);
    setReviewModalLog(null);
    toast.success(language === 'th' ? 'บันทึกผลการตรวจและข้อคิดเห็นแล้ว' : 'Review & comment saved', {
      description: reviewStatus === 'approved'
        ? (language === 'th' ? 'สถานะ: อนุมัติแล้ว' : 'Status: Approved')
        : (language === 'th' ? 'สถานะ: ขอให้แก้ไข' : 'Status: Needs Revision'),
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return tr.excellent;
    if (score >= 75) return tr.good;
    if (score >= 60) return tr.fair;
    return tr.needsImprovement;
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-emerald-50 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900';
    if (score >= 75) return 'bg-blue-50 border-blue-100 dark:bg-blue-950/30 dark:border-blue-900';
    if (score >= 60) return 'bg-amber-50 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900';
    return 'bg-red-50 border-red-100 dark:bg-red-950/30 dark:border-red-900';
  };

  // Performance detail view
  if (selectedIntern) {
    const perf = selectedIntern.performance;
    const submittedReports = perf.weeklyReports.filter(r => r.submitted);
    const avgScore = Math.round(submittedReports.reduce((s, r) => s + r.score, 0) / Math.max(submittedReports.length, 1));
    const totalExpected = selectedIntern.stipend.paymentHistory.reduce((sum, p) => sum + p.expectedAmount, 0);
    const totalReceived = selectedIntern.stipend.paymentHistory.reduce((sum, p) => sum + p.actualAmount, 0);
    const currentMonthMissing = Math.max(0, selectedIntern.stipend.monthlyRate - selectedIntern.stipend.currentMonthActual);
    const isPaidFull = selectedIntern.stipend.currentMonthStatus === 'paid_full';
    const isPaidPartial = selectedIntern.stipend.currentMonthStatus === 'paid_partial';
    const isPending = selectedIntern.stipend.currentMonthStatus === 'pending';

    return (
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6 pb-10">
        <motion.div variants={itemVariants}>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIntern(null)} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> {tr.backToList}
          </Button>
        </motion.div>

        {/* Top Student & Company Banner */}
        <motion.div variants={itemVariants} className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 text-white relative overflow-hidden shadow-lg">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:20px_20px]" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start md:items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl font-bold border border-white/20 shadow-md shrink-0">
                {selectedIntern.avatar}
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">{language === 'th' ? selectedIntern.name : selectedIntern.nameEn}</h1>
                  <Badge className="bg-white/25 hover:bg-white/30 text-white border-white/30 text-xs px-2.5 py-0.5">
                    {selectedIntern.position}
                  </Badge>
                </div>

                {/* Company & Mentor */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-white/90">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Building2 className="w-4 h-4 text-white/90" />
                    <span>{language === 'th' ? selectedIntern.company : selectedIntern.companyEn}</span>
                  </span>
                  {selectedIntern.companyAddress && (
                    <span className="flex items-center gap-1 text-white/80 text-xs">
                      <MapPin className="w-3.5 h-3.5 text-white/70" />
                      {selectedIntern.companyAddress}
                    </span>
                  )}
                  {selectedIntern.mentorName && (
                    <span className="flex items-center gap-1 text-white/80 text-xs">
                      <UserCheck className="w-3.5 h-3.5 text-white/70" />
                      {selectedIntern.mentorName}
                    </span>
                  )}
                </div>

                {/* Internship Period */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/85 pt-1">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-white/75" />
                    <span>{language === 'th' ? 'ระยะเวลาฝึกงาน:' : 'Internship Period:'} {selectedIntern.period.startDate} ถึง {selectedIntern.period.endDate} ({selectedIntern.period.durationMonths} {language === 'th' ? 'เดือน' : 'months'})</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-white/75" />
                    <span>{language === 'th' ? 'สัปดาห์ที่' : 'Week'} {selectedIntern.period.currentWeek}/{selectedIntern.period.totalWeeks} ({selectedIntern.progress}%)</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Stipend Status & Rating */}
            <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 border-white/20 pt-4 md:pt-0 gap-3">
              <div className="text-left md:text-right">
                <div className="text-xs text-white/80 uppercase tracking-wider font-semibold">
                  {language === 'th' ? 'เงินเดือน/เบี้ยเลี้ยงเดือนนี้' : 'Current Month Stipend'}
                </div>
                <div className="mt-1.5">
                  {isPaidFull ? (
                    <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3 py-1 shadow-sm gap-1.5 border border-emerald-400/40">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {language === 'th' ? `ได้รับครบแล้ว (฿${selectedIntern.stipend.currentMonthActual.toLocaleString()})` : `Paid in Full (฿${selectedIntern.stipend.currentMonthActual.toLocaleString()})`}
                    </Badge>
                  ) : isPaidPartial ? (
                    <Badge className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-3 py-1 shadow-sm gap-1.5 border border-rose-400/40 animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {language === 'th'
                        ? `ได้รับไม่ครบ ขาด ฿${currentMonthMissing.toLocaleString()}`
                        : `Partial: Missing ฿${currentMonthMissing.toLocaleString()}`}
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-3 py-1 shadow-sm gap-1.5 border border-amber-400/40">
                      <Clock className="w-3.5 h-3.5" />
                      {language === 'th' ? `รอการโอน (รอบวันที่ ${selectedIntern.stipend.paymentDay})` : `Pending (Cycle ${selectedIntern.stipend.paymentDay}th)`}
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-white/80 mt-1 font-mono">
                  {selectedIntern.stipend.currentMonth} • ฿{selectedIntern.stipend.monthlyRate.toLocaleString()}/{language === 'th' ? 'เดือน' : 'mo'}
                </p>
              </div>

              <div className="text-right flex items-center gap-2">
                <div className="text-xs text-white/80">{tr.overallScore}:</div>
                <div className="text-xl font-bold font-mono">{avgScore}</div>
                <Badge className="bg-white/20 text-white border-white/20 text-[11px]">{getScoreLabel(avgScore)}</Badge>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Evaluation Metric Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: tr.technicalSkills, value: perf.technical, icon: Target },
            { label: tr.communication, value: perf.communication, icon: Users },
            { label: tr.teamwork, value: perf.teamwork, icon: Users },
            { label: tr.punctuality, value: perf.punctuality, icon: Clock },
            { label: tr.initiative, value: perf.initiative, icon: TrendingUp },
          ].map((metric, i) => (
            <Card key={i} className={`border ${getScoreBg(metric.value)}`}>
              <CardContent className="p-4 text-center">
                <metric.icon className={`w-5 h-5 mx-auto mb-2 ${getScoreColor(metric.value)}`} />
                <div className={`text-2xl font-bold ${getScoreColor(metric.value)}`}>{metric.value}%</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{metric.label}</div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Tabs: Daily Logs, Weekly Reports, Stipend Tracking */}
        <motion.div variants={itemVariants} className="space-y-4">
          <Tabs value={detailTab} onValueChange={(v) => setDetailTab(v as 'weekly' | 'daily' | 'stipend')} className="w-full">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 h-auto rounded-xl border border-slate-200/70 dark:border-slate-700/60 inline-flex shadow-xs">
                <TabsTrigger
                  value="daily"
                  className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:dark:bg-slate-900 data-[state=active]:dark:text-orange-400 data-[state=active]:shadow-xs transition-all text-slate-600 dark:text-slate-400 cursor-pointer select-none gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 inline-block" />
                  {language === 'th' ? 'ตรวจไดอารี่บันทึกรายวัน' : 'Daily Logs & Review'}
                  {selectedIntern.dailyLogs.filter(l => l.status === 'pending').length > 0 && (
                    <Badge className="ml-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] px-1.5 py-0 rounded-full font-mono">
                      {selectedIntern.dailyLogs.filter(l => l.status === 'pending').length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="weekly"
                  className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:dark:bg-slate-900 data-[state=active]:dark:text-orange-400 data-[state=active]:shadow-xs transition-all text-slate-600 dark:text-slate-400 cursor-pointer select-none gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 inline-block" />
                  {language === 'th' ? 'รายงานรายสัปดาห์' : 'Weekly Reports'}
                </TabsTrigger>
                <TabsTrigger
                  value="stipend"
                  className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:dark:bg-slate-900 data-[state=active]:dark:text-orange-400 data-[state=active]:shadow-xs transition-all text-slate-600 dark:text-slate-400 cursor-pointer select-none gap-1.5"
                >
                  <CreditCard className="w-3.5 h-3.5 inline-block" />
                  {language === 'th' ? 'เบี้ยเลี้ยงและการจ่ายเงิน' : 'Stipend & Salary Tracking'}
                  {isPaidPartial && (
                    <Badge className="ml-1 bg-rose-500 hover:bg-rose-600 text-white text-[10px] px-1.5 py-0 rounded-full font-mono">
                      !
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenStipendModal()}
                  className="rounded-xl text-xs h-9 px-3.5 border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-300 gap-1.5 shadow-xs"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {language === 'th' ? 'อัปเดตสถานะเบี้ยเลี้ยง (Staff)' : 'Update Stipend (Staff)'}
                </Button>
              </div>
            </div>

            {/* TAB 1: Weekly Reports */}
            <TabsContent value="weekly" className="mt-0">
              <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="w-4 h-4 text-orange-500 dark:text-slate-400" /> {tr.weeklyReport}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {perf.weeklyReports.map((report) => (
                    <div key={report.week} className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${report.submitted ? 'bg-white border-slate-100 dark:bg-slate-900/50 dark:border-slate-800' : 'bg-slate-50 border-slate-100 dark:border-slate-800 opacity-60'}`}>
                      <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center font-bold text-orange-600 dark:text-orange-400">
                        W{report.week}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-slate-900 dark:text-slate-100">{tr.weekLabel} {report.week}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {language === 'th' ? report.summary : report.summaryEn}
                        </div>
                      </div>
                      <div className="text-right">
                        {report.submitted ? (
                          <>
                            <div className={`text-lg font-bold font-mono ${getScoreColor(report.score)}`}>{report.score}</div>
                            <Badge variant="outline" className="text-emerald-600 border-emerald-200 text-xs dark:text-emerald-400">{tr.submitted}</Badge>
                          </>
                        ) : (
                          <Badge variant="outline" className="text-slate-400 border-slate-200 dark:border-slate-700 text-xs">{tr.pending}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: Daily Logs */}
            <TabsContent value="daily" className="mt-0 space-y-3.5">
              {selectedIntern.dailyLogs.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed text-slate-400">
                  {language === 'th' ? 'ยังไม่มีบันทึกไดอารี่จากนักศึกษา' : 'No daily logs recorded yet'}
                </div>
              ) : (
                selectedIntern.dailyLogs.map((log) => (
                  <Card key={log.id} className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0c1222] shadow-xs">
                    <CardContent className="p-5 space-y-3">
                      {/* Top row: Date, Hours, Status */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                              {new Date(log.date).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                            <span className="text-xs text-slate-400 ml-2 font-mono">{log.date}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs border-slate-200 dark:border-slate-700">
                            <Clock className="w-3 h-3 mr-1 text-slate-400" />
                            {log.hours} {language === 'th' ? 'ชม.' : 'hrs'}
                          </Badge>

                          {log.status === 'approved' ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              {language === 'th' ? 'อนุมัติแล้ว' : 'Approved'}
                            </Badge>
                          ) : log.status === 'needs_revision' ? (
                            <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {language === 'th' ? 'ขอให้แก้ไข' : 'Needs Revision'}
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs gap-1">
                              <Clock className="w-3 h-3" />
                              {language === 'th' ? 'รอตรวจ' : 'Pending'}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Activities */}
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {language === 'th' ? 'งานและกิจกรรมที่ปฏิบัติ:' : 'Activities & Tasks:'}
                        </span>
                        <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                          {log.activities}
                        </p>
                      </div>

                      {/* Learnings & Challenges */}
                      {(log.learnings || log.challenges) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          {log.learnings && (
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5" />
                                {language === 'th' ? 'สิ่งที่ได้เรียนรู้' : 'Learnings'}
                              </span>
                              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{log.learnings}</p>
                            </div>
                          )}
                          {log.challenges && (
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                              <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {language === 'th' ? 'ปัญหา อุปสรรค' : 'Challenges'}
                              </span>
                              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{log.challenges}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Mentor Comment Display */}
                      {log.mentorComment && (
                        <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-900/50 text-xs space-y-1.5">
                          <div className="flex items-center justify-between font-semibold text-blue-700 dark:text-blue-300">
                            <span className="flex items-center gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5" />
                              {language === 'th' ? 'ข้อคิดเห็นจาก Mentor / อาจารย์:' : 'Mentor Feedback:'}
                            </span>
                            {log.reviewedAt && (
                              <span className="font-normal text-[11px] text-blue-500">
                                {log.reviewedAt}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 italic">
                            "{log.mentorComment}"
                          </p>
                          {log.reviewedBy && (
                            <p className="text-[11px] text-slate-400 text-right">
                              - {log.reviewedBy}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800/80">
                        {log.status !== 'approved' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickApprove(log.id)}
                            disabled={isApprovingId === log.id}
                            className="rounded-xl text-xs h-9 px-3 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 gap-1.5 flex items-center"
                          >
                            {isApprovingId === log.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            {language === 'th' ? 'อนุมัติทันที' : 'Quick Approve'}
                          </Button>
                        )}

                        <Button
                          size="sm"
                          onClick={() => handleOpenReviewModal(log)}
                          className="rounded-xl text-xs h-9 px-3.5 bg-orange-600 hover:bg-orange-700 text-white gap-1.5 font-medium shadow-xs"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          {language === 'th' ? 'ตรวจ / ให้ความเห็น' : 'Review & Comment'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* TAB 3: Stipend & Salary Tracking */}
            <TabsContent value="stipend" className="mt-0 space-y-5">
              {/* Stipend Status Alert Banner */}
              {isPaidPartial ? (
                <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 border border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/60 flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-rose-800 dark:text-rose-200">
                      {language === 'th' ? 'แจ้งเตือน: นักศึกษาได้รับเงินเดือน/เบี้ยเลี้ยงงวดล่าสุดไม่ครบถ้วน' : 'Alert: Student Received Incomplete Stipend Payment'}
                    </h4>
                    <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                      {language === 'th'
                        ? `รอบเดือน ${selectedIntern.stipend.currentMonth} ยอดตามสัญญา ฿${selectedIntern.stipend.monthlyRate.toLocaleString()} แต่นักศึกษาได้รับเงินจริงเพียง ฿${selectedIntern.stipend.currentMonthActual.toLocaleString()} (ยังขาดอีก ฿${currentMonthMissing.toLocaleString()})`
                        : `Contract rate: ฿${selectedIntern.stipend.monthlyRate.toLocaleString()} but student received only ฿${selectedIntern.stipend.currentMonthActual.toLocaleString()} for ${selectedIntern.stipend.currentMonth} (Missing ฿${currentMonthMissing.toLocaleString()})`}
                    </p>
                    <p className="text-xs text-rose-600 dark:text-rose-400 italic pt-1">
                      {language === 'th' ? 'หมายเหตุ: กำลังอยู่ระหว่างการประสานงานฝ่ายการเงินของสถานประกอบการเพื่อโอนยอดคงเหลือ' : 'Notes: Coordination with company accounting is in progress for remaining balance.'}
                    </p>
                  </div>
                </div>
              ) : isPaidFull ? (
                <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/60 flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-emerald-800 dark:text-emerald-200">
                      {language === 'th' ? 'สถานะปกติ: ได้รับเงินเดือน/เบี้ยเลี้ยงครบถ้วนเรียบร้อยแล้ว' : 'Status Normal: Full Stipend Paid on Schedule'}
                    </h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                      {language === 'th'
                        ? `รอบเดือน ${selectedIntern.stipend.currentMonth} นักศึกษาได้รับเงินครบ 100% ตามข้อตกลง จำนวน ฿${selectedIntern.stipend.currentMonthActual.toLocaleString()} โอนเข้าบัญชีเรียบร้อย`
                        : `Student received full payment of ฿${selectedIntern.stipend.currentMonthActual.toLocaleString()} for ${selectedIntern.stipend.currentMonth}.`}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/60 flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-amber-800 dark:text-amber-200">
                      {language === 'th' ? 'สถานะ: รอถึงรอบกำหนดจ่ายประจำเดือน' : 'Status: Pending Monthly Payment Cycle'}
                    </h4>
                    <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                      {language === 'th'
                        ? `รอบเดือน ${selectedIntern.stipend.currentMonth} มีกำหนดโอนทุกวันที่ ${selectedIntern.stipend.paymentDay} ของเดือน ยอดที่ต้องได้รับ ฿${selectedIntern.stipend.monthlyRate.toLocaleString()}`
                        : `Payment for ${selectedIntern.stipend.currentMonth} is scheduled on day ${selectedIntern.stipend.paymentDay} of the month for ฿${selectedIntern.stipend.monthlyRate.toLocaleString()}.`}
                    </p>
                  </div>
                </div>
              )}

              {/* 4 Summary Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0c1222]">
                  <CardContent className="p-4 space-y-1">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span className="text-xs font-medium">{language === 'th' ? 'อัตราเบี้ยเลี้ยงตามสัญญา' : 'Contract Monthly Rate'}</span>
                      <DollarSign className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                      ฿{selectedIntern.stipend.monthlyRate.toLocaleString()}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {language === 'th' ? `รอบจ่ายทุกวันที่ ${selectedIntern.stipend.paymentDay} ของเดือน` : `Cycle day ${selectedIntern.stipend.paymentDay}th monthly`}
                    </p>
                  </CardContent>
                </Card>

                <Card className={`rounded-2xl border ${isPaidFull ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/20' : isPaidPartial ? 'border-rose-200 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/20' : 'border-amber-200 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/20'}`}>
                  <CardContent className="p-4 space-y-1">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span className="text-xs font-medium">{language === 'th' ? 'ได้เงินครบไหม (เดือนนี้)?' : 'Current Month Status'}</span>
                      <CreditCard className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className={`text-xl font-bold font-mono ${isPaidFull ? 'text-emerald-600 dark:text-emerald-400' : isPaidPartial ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {isPaidFull
                        ? (language === 'th' ? 'ได้รับครบ 100%' : 'Paid in Full')
                        : isPaidPartial
                        ? (language === 'th' ? `ขาด ฿${currentMonthMissing.toLocaleString()}` : `Missing ฿${currentMonthMissing.toLocaleString()}`)
                        : (language === 'th' ? 'รอการโอน' : 'Pending')}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {language === 'th' ? `งวด: ${selectedIntern.stipend.currentMonth}` : `Cycle: ${selectedIntern.stipend.currentMonth}`}
                    </p>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0c1222]">
                  <CardContent className="p-4 space-y-1">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span className="text-xs font-medium">{language === 'th' ? 'ยอดที่ได้รับแล้วสะสม' : 'Total Stipend Received'}</span>
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      ฿{totalReceived.toLocaleString()}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {language === 'th' ? `จากยอดสัญญาประเมิน ฿${totalExpected.toLocaleString()}` : `Of total expected ฿${totalExpected.toLocaleString()}`}
                    </p>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0c1222]">
                  <CardContent className="p-4 space-y-1">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span className="text-xs font-medium">{language === 'th' ? 'สถานประกอบการที่ฝึก' : 'Host Company'}</span>
                      <Building2 className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {language === 'th' ? selectedIntern.company : selectedIntern.companyEn}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">
                      {selectedIntern.companyAddress || 'กรุงเทพฯ'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Payment History Table */}
              <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0c1222]">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-orange-500" />
                      {language === 'th' ? 'ประวัติและรายการเบี้ยเลี้ยงรายเดือน' : 'Monthly Stipend Payment History'}
                    </CardTitle>
                    <p className="text-xs text-slate-500 mt-1">
                      {language === 'th'
                        ? 'บันทึกการตรวจสอบการจ่ายเงิน โดยฝ่ายประสานงานฝึกงานและสถานประกอบการ'
                        : 'Official monthly payment tracking by internship coordinator & company'}
                    </p>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {selectedIntern.stipend.paymentHistory.length} {language === 'th' ? 'งวด' : 'cycles'}
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-y border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 text-slate-500">
                          <th className="py-3 px-4 font-semibold">{language === 'th' ? 'รอบเดือน' : 'Month'}</th>
                          <th className="py-3 px-4 font-semibold">{language === 'th' ? 'ยอดสัญญา' : 'Expected'}</th>
                          <th className="py-3 px-4 font-semibold">{language === 'th' ? 'ได้รับจริง' : 'Actual Paid'}</th>
                          <th className="py-3 px-4 font-semibold">{language === 'th' ? 'ได้เงินครบไหม?' : 'Status'}</th>
                          <th className="py-3 px-4 font-semibold">{language === 'th' ? 'วันที่โอนเงิน' : 'Paid Date'}</th>
                          <th className="py-3 px-4 font-semibold">{language === 'th' ? 'หมายเหตุ / การติดตาม' : 'Notes & Remarks'}</th>
                          <th className="py-3 px-4 font-semibold text-right">{language === 'th' ? 'จัดการ' : 'Action'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        {selectedIntern.stipend.paymentHistory.map((item) => {
                          const diff = item.expectedAmount - item.actualAmount;
                          return (
                            <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                {item.month}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                                ฿{item.expectedAmount.toLocaleString()}
                              </td>
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                                ฿{item.actualAmount.toLocaleString()}
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {item.status === 'paid_full' ? (
                                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    {language === 'th' ? 'ได้รับครบถ้วน (100%)' : 'Paid in Full'}
                                  </Badge>
                                ) : item.status === 'paid_partial' ? (
                                  <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[11px] gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    {language === 'th' ? `ไม่ครบ (ขาด ฿${diff.toLocaleString()})` : `Partial (-฿${diff.toLocaleString()})`}
                                  </Badge>
                                ) : (
                                  <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[11px] gap-1">
                                    <Clock className="w-3 h-3" />
                                    {language === 'th' ? 'รอการโอน' : 'Pending'}
                                  </Badge>
                                )}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                                {item.paidDate || '-'}
                              </td>
                              <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                                {item.notes || '-'}
                              </td>
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenStipendModal(selectedIntern, item)}
                                  className="h-7 px-2.5 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30 gap-1 rounded-lg"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  {language === 'th' ? 'แก้ไข' : 'Edit'}
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Mentor Review & Comment Dialog */}
        <Dialog open={!!reviewModalLog} onOpenChange={(open) => !open && setReviewModalLog(null)}>
          <DialogContent className="sm:max-w-[520px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <MessageSquare className="w-5 h-5 text-orange-600" />
                {language === 'th' ? 'ตรวจไดอารี่และให้ข้อคิดเห็น' : 'Review Diary & Feedback'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {reviewModalLog?.date && `${language === 'th' ? 'วันที่บันทึก:' : 'Date:'} ${reviewModalLog.date} (${reviewModalLog.hours} ${language === 'th' ? 'ชั่วโมง' : 'hours'})`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                <span className="font-semibold block mb-1 text-slate-900 dark:text-slate-100">
                  {language === 'th' ? 'งานที่นักศึกษาปฏิบัติในวันนี้:' : 'Student Activities:'}
                </span>
                <p className="line-clamp-3 leading-relaxed">{reviewModalLog?.activities}</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{language === 'th' ? 'ผลการตรวจสอบ *' : 'Review Status *'}</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={reviewStatus === 'approved' ? 'default' : 'outline'}
                    onClick={() => setReviewStatus('approved')}
                    className={`flex-1 rounded-xl text-xs gap-1.5 ${reviewStatus === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {language === 'th' ? 'อนุมัติ (Approved)' : 'Approve'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={reviewStatus === 'needs_revision' ? 'default' : 'outline'}
                    onClick={() => setReviewStatus('needs_revision')}
                    className={`flex-1 rounded-xl text-xs gap-1.5 ${reviewStatus === 'needs_revision' ? 'bg-rose-600 hover:bg-rose-700 text-white' : ''}`}
                  >
                    <AlertCircle className="w-4 h-4" />
                    {language === 'th' ? 'ขอให้แก้ไข (Needs Revision)' : 'Needs Revision'}
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{language === 'th' ? 'ข้อเสนอแนะ / ความคิดเห็นจาก Mentor' : 'Mentor Comment / Feedback'}</Label>
                <Textarea
                  rows={3}
                  placeholder={language === 'th' ? 'พิมพ์คำแนะนำ ข้อเสนอแนะ หรือสิ่งที่นักศึกษาควรปรับปรุง...' : 'Provide feedback or suggestions for the student...'}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="rounded-xl text-xs leading-relaxed"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setReviewModalLog(null)} className="rounded-xl text-xs">
                {language === 'th' ? 'ยกเลิก' : 'Cancel'}
              </Button>
              <Button
                onClick={handleSaveReview}
                disabled={isSavingReview}
                className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                {isSavingReview ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    {language === 'th' ? 'กำลังบันทึก...' : 'Saving...'}
                  </>
                ) : (
                  language === 'th' ? 'บันทึกผลการตรวจ' : 'Save Review'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Staff Stipend Update Dialog */}
        <Dialog open={isStipendModalOpen} onOpenChange={setIsStipendModalOpen}>
          <DialogContent className="sm:max-w-[500px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <CreditCard className="w-5 h-5 text-orange-600" />
                {language === 'th' ? 'บันทึก / อัปเดตสถานะเบี้ยเลี้ยงนักศึกษา (Staff)' : 'Update Student Stipend Status (Staff)'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {selectedIntern && `${language === 'th' ? 'นักศึกษา:' : 'Student:'} ${selectedIntern.name} (${selectedIntern.company})`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{language === 'th' ? 'รอบเดือน *' : 'Month Cycle *'}</Label>
                <Input
                  value={stipendFormMonth}
                  onChange={(e) => setStipendFormMonth(e.target.value)}
                  placeholder="เช่น กันยายน 2569"
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{language === 'th' ? 'ยอดตามสัญญา (บาท) *' : 'Expected Amount (THB) *'}</Label>
                  <Input
                    type="number"
                    value={stipendFormExpected}
                    onChange={(e) => setStipendFormExpected(Number(e.target.value) || 0)}
                    className="rounded-xl text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{language === 'th' ? 'ยอดที่จ่ายจริง (บาท) *' : 'Actual Paid (THB) *'}</Label>
                  <Input
                    type="number"
                    value={stipendFormActual}
                    onChange={(e) => setStipendFormActual(Number(e.target.value) || 0)}
                    className="rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              {/* Quick difference indicator */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border text-xs flex justify-between items-center">
                <span className="text-slate-500">{language === 'th' ? 'ผลต่างยอดเงิน:' : 'Difference:'}</span>
                <span className={`font-mono font-bold ${stipendFormActual >= stipendFormExpected ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {stipendFormActual >= stipendFormExpected
                    ? (language === 'th' ? 'ครบถ้วน 100%' : '100% Paid')
                    : (language === 'th' ? `ขาด ฿${(stipendFormExpected - stipendFormActual).toLocaleString()}` : `Missing ฿${(stipendFormExpected - stipendFormActual).toLocaleString()}`)}
                </span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{language === 'th' ? 'สถานะการจ่ายเงิน *' : 'Payment Status *'}</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={stipendFormStatus === 'paid_full' ? 'default' : 'outline'}
                    onClick={() => setStipendFormStatus('paid_full')}
                    className={`rounded-xl text-[11px] gap-1 ${stipendFormStatus === 'paid_full' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {language === 'th' ? 'จ่ายครบแล้ว' : 'Paid Full'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={stipendFormStatus === 'paid_partial' ? 'default' : 'outline'}
                    onClick={() => setStipendFormStatus('paid_partial')}
                    className={`rounded-xl text-[11px] gap-1 ${stipendFormStatus === 'paid_partial' ? 'bg-rose-600 hover:bg-rose-700 text-white' : ''}`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {language === 'th' ? 'จ่ายไม่ครบ' : 'Partial'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={stipendFormStatus === 'pending' ? 'default' : 'outline'}
                    onClick={() => setStipendFormStatus('pending')}
                    className={`rounded-xl text-[11px] gap-1 ${stipendFormStatus === 'pending' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {language === 'th' ? 'รอการโอน' : 'Pending'}
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{language === 'th' ? 'หมายเหตุ / รายละเอียดการประสานงาน' : 'Notes / Remarks'}</Label>
                <Textarea
                  rows={2}
                  placeholder={language === 'th' ? 'เช่น โอนผ่าน SCB ครบถ้วน หรือ ประสานงานบัญชีจะโอนส่วนที่เหลือในวันที่...' : 'Notes regarding payment...'}
                  value={stipendFormNotes}
                  onChange={(e) => setStipendFormNotes(e.target.value)}
                  className="rounded-xl text-xs leading-relaxed"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsStipendModalOpen(false)} className="rounded-xl text-xs">
                {language === 'th' ? 'ยกเลิก' : 'Cancel'}
              </Button>
              <Button onClick={handleSaveStipend} className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold">
                {language === 'th' ? 'บันทึกสถานะ' : 'Save Status'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    );
  }

  // Filter interns based on search & stipend status
  const filteredInterns = interns.filter((intern) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q || (
      intern.name.toLowerCase().includes(q) ||
      intern.nameEn.toLowerCase().includes(q) ||
      intern.company.toLowerCase().includes(q) ||
      intern.companyEn.toLowerCase().includes(q) ||
      intern.position.toLowerCase().includes(q) ||
      (intern.mentorName && intern.mentorName.toLowerCase().includes(q))
    );
    const matchesStipend = stipendFilter === 'all' || intern.stipend.currentMonthStatus === stipendFilter;
    return matchesQuery && matchesStipend;
  });

  // List view
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-10">
      <div>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2">
          <Briefcase className="w-4 h-4 text-orange-500 dark:text-slate-400" />
          <span>{tr.subtitle}</span>
        </motion.div>
        <motion.h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          {tr.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">{tr.titleHighlight}</span>
        </motion.h1>
      </div>

      {/* Top Stat Highlights */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, label: tr.totalInterns, value: String(interns.length), sub: language === 'th' ? 'นักศึกษาฝึกงานทั้งหมด' : 'Total students' },
          { icon: Building2, label: tr.companies, value: String(new Set(interns.map((intern) => intern.company)).size), sub: language === 'th' ? 'สถานประกอบการที่เข้าร่วม' : 'Active companies' },
          { icon: Clock, label: tr.avgDuration, value: `${Math.round(interns.reduce((sum, intern) => sum + intern.totalWeeks, 0) / Math.max(interns.length, 1))} ${tr.weeks}`, sub: language === 'th' ? 'ระยะเวลาฝึกเฉลี่ย' : 'Average duration' },
          { icon: CreditCard, label: language === 'th' ? 'สถานะเบี้ยเลี้ยงเดือนนี้' : 'Stipend Status', value: `${interns.filter(i => i.stipend.currentMonthStatus === 'paid_full').length}/${interns.length}`, sub: language === 'th' ? 'ได้รับเงินครบถ้วนแล้ว' : 'Paid in full' },
        ].map((stat, i) => (
          <motion.div key={i} whileHover={{ scale: 1.02 }} className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
                <stat.icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{stat.label}</span>
            </div>
            <div className="text-3xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-slate-100">{stat.value}</div>
            <div className="text-[11px] text-slate-400 mt-1">{stat.sub}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Search & Stipend Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder={language === 'th' ? 'ค้นหาชื่อนักศึกษา, บริษัท, ตำแหน่ง, หรือพี่เลี้ยง...' : 'Search student, company, position, mentor...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs h-10"
          />
        </div>

        {/* Stipend Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
          {[
            { id: 'all', label: language === 'th' ? 'ทั้งหมด' : 'All', count: interns.length },
            { id: 'paid_full', label: language === 'th' ? 'ได้รับครบแล้ว' : 'Paid in Full', count: interns.filter(i => i.stipend.currentMonthStatus === 'paid_full').length },
            { id: 'paid_partial', label: language === 'th' ? 'ได้รับไม่ครบ' : 'Partial Payment', count: interns.filter(i => i.stipend.currentMonthStatus === 'paid_partial').length },
            { id: 'pending', label: language === 'th' ? 'รอการโอน' : 'Pending', count: interns.filter(i => i.stipend.currentMonthStatus === 'pending').length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStipendFilter(tab.id as typeof stipendFilter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                stipendFilter === tab.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                stipendFilter === tab.id ? 'bg-slate-100 dark:bg-slate-800 font-bold' : 'bg-slate-200/60 dark:bg-slate-700/60'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Interns Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {filteredInterns.map((intern, idx) => {
          const isFull = intern.stipend.currentMonthStatus === 'paid_full';
          const isPartial = intern.stipend.currentMonthStatus === 'paid_partial';
          const missing = Math.max(0, intern.stipend.monthlyRate - intern.stipend.currentMonthActual);

          return (
            <motion.div key={idx} variants={itemVariants} whileHover={{ y: -4 }}
              className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between">
              <div>
                {/* Student Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-xl font-bold shadow-lg shrink-0">
                    {intern.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 truncate">{language === 'th' ? intern.name : intern.nameEn}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{intern.position}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-orange-600 dark:text-orange-400 font-medium truncate">
                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{language === 'th' ? intern.company : intern.companyEn}</span>
                    </div>
                  </div>
                </div>

                {/* Company & Mentor Detail */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 text-xs space-y-1.5 mb-4">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {intern.companyAddress || 'กรุงเทพมหานคร'}
                    </span>
                  </div>
                  {intern.mentorName && (
                    <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 text-[11px]">
                      <UserCheck className="w-3 h-3 text-slate-400" />
                      <span>{intern.mentorName}</span>
                    </div>
                  )}
                </div>

                {/* Internship Duration & Progress */}
                <div className="mb-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{intern.period.startDate} - {intern.period.endDate}</span>
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                      {tr.weekLabel} {intern.period.currentWeek}/{intern.period.totalWeeks} ({intern.progress}%)
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${intern.progress}%` }} transition={{ delay: 0.3 + idx * 0.1, duration: 0.6 }}
                      className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full" />
                  </div>
                </div>

                {/* Stipend Status Highlight Box */}
                <div className={`p-3.5 rounded-xl border mb-5 transition-all ${
                  isFull
                    ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50'
                    : isPartial
                    ? 'bg-rose-50/70 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/50'
                    : 'bg-amber-50/70 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {language === 'th' ? `เงินเดือนงวด ${intern.stipend.currentMonth}` : `Stipend (${intern.stipend.currentMonth})`}
                    </span>
                    {isFull ? (
                      <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] px-2 py-0 font-medium gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {language === 'th' ? 'ได้รับครบแล้ว' : 'Paid in Full'}
                      </Badge>
                    ) : isPartial ? (
                      <Badge className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] px-2 py-0 font-medium gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {language === 'th' ? 'ได้รับไม่ครบ' : 'Incomplete'}
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] px-2 py-0 font-medium gap-1">
                        <Clock className="w-3 h-3" />
                        {language === 'th' ? 'รอการโอน' : 'Pending'}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                      ฿{intern.stipend.currentMonthActual.toLocaleString()} <span className="text-xs font-normal text-slate-400">/ ฿{intern.stipend.monthlyRate.toLocaleString()}</span>
                    </div>
                    {isPartial && (
                      <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                        {language === 'th' ? `(ขาดอีก ฿${missing.toLocaleString()})` : `(-฿${missing.toLocaleString()})`}
                      </span>
                    )}
                    {isFull && (
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        {language === 'th' ? 'ครบ 100%' : '100%'}
                      </span>
                    )}
                    {!isFull && !isPartial && (
                      <span className="text-[11px] text-amber-600 dark:text-amber-400">
                        {language === 'th' ? `รอบวันที่ ${intern.stipend.paymentDay}` : `Day ${intern.stipend.paymentDay}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <Button
                  variant="outline"
                  className="w-full rounded-xl text-[11px] h-8 px-1"
                  size="sm"
                  onClick={() => {
                    setSelectedIntern(intern);
                    setDetailTab('daily');
                  }}
                >
                  <Calendar className="w-3 h-3 mr-1 text-orange-500" />
                  {language === 'th' ? 'ไดอารี่' : 'Logs'}
                </Button>
                <Button
                  className="w-full rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-[11px] h-8 px-1 shadow-xs"
                  size="sm"
                  onClick={() => {
                    setSelectedIntern(intern);
                    setDetailTab('stipend');
                  }}
                >
                  <CreditCard className="w-3 h-3 mr-1" />
                  {language === 'th' ? 'เงินเดือน' : 'Stipend'}
                </Button>
                <Button
                  variant="outline"
                  className="w-full rounded-xl text-[11px] h-8 px-1 border-slate-200 text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:border-slate-700 dark:bg-slate-800"
                  size="sm"
                  onClick={() => {
                    setSelectedIntern(intern);
                    setDetailTab('weekly');
                  }}
                >
                  <Eye className="w-3 h-3 mr-1 text-blue-500" />
                  {language === 'th' ? 'ประเมิน' : 'Reports'}
                </Button>
              </div>
            </motion.div>
          );
        })}
        {isLoading && (
          <div className="lg:col-span-3 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {language === 'th' ? 'กำลังโหลดข้อมูลฝึกงาน...' : 'Loading internships...'}
          </div>
        )}
        {!isLoading && filteredInterns.length === 0 && (
          <div className="lg:col-span-3 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {language === 'th' ? 'ไม่พบข้อมูลนักศึกษาฝึกงานตามเงื่อนไขการค้นหา' : 'No internship records found matching your filters.'}
          </div>
        )}
      </div>
    </motion.div>
  );
}
