import React from 'react';
import { motion } from 'framer-motion';
import { Bot, CalendarClock, CheckCircle2, Code2, Play, Plus, RefreshCw, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { asArray, asBoolean, asDate, asNumber, asRecord, asString } from '@/lib/live-data';

type AutomationRule = {
  id: string;
  name: string;
  description: string;
  trigger: Record<string, unknown>;
  action: Record<string, unknown>;
  isActive: boolean;
  nextRun: Date | null;
  lastRun: Date | null;
  executionCount: number;
};

const emptyForm = {
  name: '',
  description: '',
  triggerType: 'schedule',
  schedule: '0 8 * * *',
  frequencyMinutes: 60,
  metric: 'activityHours',
  operator: 'gte',
  value: 20,
  actionType: 'notification',
  target: 'STAFF',
  template: 'pending-request-digest',
  title: 'Pending work digest',
  message: 'There are items waiting for review.',
  badgeName: 'Milestone',
  badgeNameThai: 'เหรียญความสำเร็จ',
  badgeDescription: 'Awarded automatically by Xchange.',
  badgeIcon: 'award',
  badgeCriteria: 'Automation criteria matched',
  isActive: true,
};

const mapRule = (item: unknown): AutomationRule => {
  const row = asRecord(item);
  return {
    id: asString(row.id),
    name: asString(row.name, 'Automation rule'),
    description: asString(row.description),
    trigger: asRecord(row.trigger),
    action: asRecord(row.action),
    isActive: asBoolean(row.isActive, true),
    nextRun: row.nextRun ? asDate(row.nextRun) : null,
    lastRun: row.lastRun ? asDate(row.lastRun) : null,
    executionCount: asNumber(row.executionCount, 0),
  };
};

const COPY = {
  th: {
    eyebrow: 'สำหรับผู้ดูแลระบบ',
    title: 'ระบบอัตโนมัติ',
    subtitle: 'ตั้งกฎตามเวลา ตรวจตัวชี้วัดของนักศึกษา ส่งการแจ้งเตือน และมอบเหรียญรางวัลอัตโนมัติ',
    refresh: 'รีเฟรช',
    newRule: 'สร้างกฎใหม่',
    name: 'ชื่อกฎ',
    description: 'คำอธิบาย',
    jsonMode: 'โหมด JSON',
    trigger: 'เงื่อนไขเริ่มทำงาน',
    action: 'สิ่งที่ทำ',
    cronSchedule: 'ตารางเวลา (cron)',
    studentMetric: 'ตัวชี้วัดนักศึกษา',
    notification: 'ส่งการแจ้งเตือน',
    badgeEvaluation: 'ประเมินเหรียญรางวัล',
    awardBadge: 'มอบเหรียญรางวัล',
    metric: 'ตัวชี้วัด',
    operator: 'เงื่อนไข',
    value: 'ค่า',
    frequency: 'ตรวจทุก (นาที)',
    metrics: { xp: 'XP', coins: 'เหรียญ', gamificationPoints: 'คะแนน', activityHours: 'ชั่วโมงกิจกรรม', internshipHours: 'ชั่วโมงฝึกงาน' },
    badgeName: 'ชื่อเหรียญ (อังกฤษ)',
    badgeNameThai: 'ชื่อเหรียญ (ไทย)',
    badgeCriteria: 'เกณฑ์การได้รับ',
    targets: { STUDENT: 'นักศึกษา', LECTURER: 'อาจารย์', STAFF: 'เจ้าหน้าที่', COMPANY: 'บริษัท', ADMIN: 'ผู้ดูแลระบบ' },
    templates: { 'pending-request-digest': 'สรุปคำร้องที่รอดำเนินการ', custom: 'กำหนดเอง' },
    notifTitle: 'หัวข้อ',
    notifMessage: 'ข้อความ',
    active: 'เปิดใช้งาน',
    create: 'สร้างกฎอัตโนมัติ',
    saving: 'กำลังบันทึก...',
    loading: 'กำลังโหลดกฎอัตโนมัติ...',
    empty: 'ยังไม่มีกฎอัตโนมัติ',
    statusActive: 'ทำงานอยู่',
    statusPaused: 'หยุดชั่วคราว',
    nextRun: 'รอบถัดไป',
    lastRun: 'ทำงานล่าสุด',
    executions: 'จำนวนครั้งที่ทำงาน',
    pause: 'หยุดชั่วคราว',
    activate: 'เปิดใช้งาน',
    run: 'สั่งทำงานตอนนี้',
    delete: 'ลบ',
    confirmTitle: (name: string) => `ลบกฎ "${name}"?`,
    confirmBody: 'กฎนี้จะหยุดทำงานและถูกลบถาวร',
    cancel: 'ยกเลิก',
    confirmDelete: 'ลบกฎ',
    created: 'สร้างกฎอัตโนมัติแล้ว',
    deleted: 'ลบกฎอัตโนมัติแล้ว',
    executed: (n: number) => `ทำงานแล้ว มีผลกับ ${n} รายการ`,
    badJson: (field: string) => `JSON ไม่ถูกต้องในช่อง ${field} — ตรวจวงเล็บและเครื่องหมายคำพูด`,
    loadFailed: 'โหลดกฎอัตโนมัติไม่สำเร็จ',
    createFailed: 'สร้างกฎไม่สำเร็จ',
    runFailed: 'สั่งทำงานไม่สำเร็จ',
    updateFailed: 'อัปเดตกฎไม่สำเร็จ',
    deleteFailed: 'ลบกฎไม่สำเร็จ',
  },
  en: {
    eyebrow: 'Admin only',
    title: 'Automation',
    subtitle: 'Create scheduled rules, evaluate student metrics, send notifications, and award badges.',
    refresh: 'Refresh',
    newRule: 'New rule',
    name: 'Rule name',
    description: 'Description',
    jsonMode: 'JSON mode',
    trigger: 'Trigger',
    action: 'Action',
    cronSchedule: 'Cron schedule',
    studentMetric: 'Student metric',
    notification: 'Notification',
    badgeEvaluation: 'Badge evaluation',
    awardBadge: 'Award badge',
    metric: 'Metric',
    operator: 'Operator',
    value: 'Value',
    frequency: 'Check every (minutes)',
    metrics: { xp: 'XP', coins: 'Coins', gamificationPoints: 'Points', activityHours: 'Activity hours', internshipHours: 'Internship hours' },
    badgeName: 'Badge name (English)',
    badgeNameThai: 'Badge name (Thai)',
    badgeCriteria: 'Criteria',
    targets: { STUDENT: 'Students', LECTURER: 'Lecturers', STAFF: 'Staff', COMPANY: 'Companies', ADMIN: 'Admins' },
    templates: { 'pending-request-digest': 'Pending requests digest', custom: 'Custom' },
    notifTitle: 'Title',
    notifMessage: 'Message',
    active: 'Active',
    create: 'Create automation',
    saving: 'Saving...',
    loading: 'Loading automation rules...',
    empty: 'No automation rules yet.',
    statusActive: 'Active',
    statusPaused: 'Paused',
    nextRun: 'Next run',
    lastRun: 'Last run',
    executions: 'Executions',
    pause: 'Pause',
    activate: 'Activate',
    run: 'Run now',
    delete: 'Delete',
    confirmTitle: (name: string) => `Delete "${name}"?`,
    confirmBody: 'The rule stops running and is removed for good.',
    cancel: 'Cancel',
    confirmDelete: 'Delete rule',
    created: 'Automation rule created',
    deleted: 'Automation rule deleted',
    executed: (n: number) => `Executed: ${n} affected`,
    badJson: (field: string) => `${field} is not valid JSON — check brackets and quotes`,
    loadFailed: 'Unable to load automation rules',
    createFailed: 'Unable to create rule',
    runFailed: 'Unable to run rule',
    updateFailed: 'Unable to update rule',
    deleteFailed: 'Unable to delete rule',
  },
};

class JsonFieldError extends Error {
  constructor(readonly field: string) {
    super(field);
  }
}

const parseJsonField = (field: string, text: string) => {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new JsonFieldError(field);
  }
};

const formatDate = (value: Date | null, language: 'th' | 'en') =>
  value ? value.toLocaleString(language === 'th' ? 'th-TH' : 'en-GB') : '-';

export default function Automation() {
  const { language } = useLanguage();
  const c = COPY[language === 'en' ? 'en' : 'th'];
  const [pendingDelete, setPendingDelete] = React.useState<AutomationRule | null>(null);
  const [rules, setRules] = React.useState<AutomationRule[]>([]);
  const [form, setForm] = React.useState(emptyForm);
  const [jsonMode, setJsonMode] = React.useState(false);
  const [triggerJson, setTriggerJson] = React.useState('{\n  "type": "schedule",\n  "schedule": "0 8 * * *"\n}');
  const [actionJson, setActionJson] = React.useState('{\n  "type": "notification",\n  "target": "STAFF",\n  "template": "pending-request-digest"\n}');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  const loadRules = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.automation.list();
      setRules(asArray(response.rules).map(mapRule));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : c.loadFailed);
    } finally {
      setIsLoading(false);
    }
  }, [c.loadFailed]);

  React.useEffect(() => {
    void loadRules();
  }, [loadRules]);

  const buildPayload = () => {
    if (jsonMode) {
      return {
        name: form.name,
        description: form.description,
        trigger: parseJsonField('Trigger JSON', triggerJson),
        action: parseJsonField('Action JSON', actionJson),
        isActive: form.isActive,
      };
    }

    const trigger = form.triggerType === 'student_metric'
      ? {
          type: 'student_metric',
          metric: form.metric,
          operator: form.operator,
          value: Number(form.value),
          frequencyMinutes: Number(form.frequencyMinutes),
        }
      : {
          type: 'schedule',
          schedule: form.schedule,
        };

    const action = form.actionType === 'award_badge'
      ? {
          type: 'award_badge',
          badge: {
            name: form.badgeName,
            nameThai: form.badgeNameThai,
            description: form.badgeDescription,
            icon: form.badgeIcon,
            criteria: form.badgeCriteria,
          },
        }
      : {
          type: form.actionType,
          target: form.target,
          template: form.template === 'custom' ? undefined : form.template,
          title: form.title,
          // the form has one title/message field; Thai users must see what the admin typed, not hidden defaults
          titleThai: form.title,
          message: form.message,
          messageThai: form.message,
          priority: 'medium',
        };

    return {
      name: form.name,
      description: form.description,
      trigger,
      action,
      isActive: form.isActive,
    };
  };

  const createRule = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const payload = buildPayload();
      const response = await api.automation.create(payload);
      setRules((current) => [mapRule(response.rule), ...current]);
      setForm(emptyForm);
      toast.success(c.created);
    } catch (error) {
      if (error instanceof JsonFieldError) toast.error(c.badJson(error.field));
      else toast.error(error instanceof Error ? error.message : c.createFailed);
    } finally {
      setIsSaving(false);
    }
  };

  const runRule = async (rule: AutomationRule) => {
    try {
      const response = await api.automation.run(rule.id);
      const result = asRecord(response.result);
      toast.success(c.executed(asNumber(result.affected, 0)));
      await loadRules();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : c.runFailed);
    }
  };

  const toggleRule = async (rule: AutomationRule) => {
    try {
      const response = await api.automation.update(rule.id, { isActive: !rule.isActive });
      setRules((current) => current.map((item) => item.id === rule.id ? mapRule(response.rule) : item));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : c.updateFailed);
    }
  };

  const deleteRule = async (rule: AutomationRule) => {
    try {
      await api.automation.remove(rule.id);
      setRules((current) => current.filter((item) => item.id !== rule.id));
      toast.success(c.deleted);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : c.deleteFailed);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200">
            <Bot className="h-4 w-4" />
            {c.eyebrow}
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-snug text-slate-900 dark:text-white">{c.title}</h1>
          <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{c.subtitle}</p>
        </div>
        <Button variant="outline" onClick={() => void loadRules()} disabled={isLoading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {c.refresh}
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card className="border-slate-200/80 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-600" />
              {c.newRule}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createRule} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="automation-name">{c.name}</Label>
                <Input id="automation-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="automation-description">{c.description}</Label>
                <Textarea id="automation-description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} required />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3 dark:border-slate-800">
                <Label htmlFor="automation-json" className="flex items-center gap-2">
                  <Code2 className="h-4 w-4" />
                  {c.jsonMode}
                </Label>
                <Switch id="automation-json" aria-label={c.jsonMode} checked={jsonMode} onCheckedChange={setJsonMode} />
              </div>

              {jsonMode ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="automation-trigger-json">Trigger JSON</Label>
                    <Textarea id="automation-trigger-json" className="min-h-[140px] font-mono text-xs" value={triggerJson} onChange={(event) => setTriggerJson(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="automation-action-json">Action JSON</Label>
                    <Textarea id="automation-action-json" className="min-h-[140px] font-mono text-xs" value={actionJson} onChange={(event) => setActionJson(event.target.value)} />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>{c.trigger}</Label>
                      <Select value={form.triggerType} onValueChange={(value) => setForm((current) => ({ ...current, triggerType: value }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="schedule">{c.cronSchedule}</SelectItem>
                          <SelectItem value="student_metric">{c.studentMetric}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{c.action}</Label>
                      <Select value={form.actionType} onValueChange={(value) => setForm((current) => ({ ...current, actionType: value }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="notification">{c.notification}</SelectItem>
                          <SelectItem value="badge_evaluation">{c.badgeEvaluation}</SelectItem>
                          <SelectItem value="award_badge">{c.awardBadge}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {form.triggerType === 'schedule' ? (
                    <div className="space-y-2">
                      <Label>{c.cronSchedule}</Label>
                      <Input value={form.schedule} onChange={(event) => setForm((current) => ({ ...current, schedule: event.target.value }))} />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>{c.metric}</Label>
                        <Select value={form.metric} onValueChange={(value) => setForm((current) => ({ ...current, metric: value }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="xp">{c.metrics.xp}</SelectItem>
                            <SelectItem value="coins">{c.metrics.coins}</SelectItem>
                            <SelectItem value="gamificationPoints">{c.metrics.gamificationPoints}</SelectItem>
                            <SelectItem value="activityHours">{c.metrics.activityHours}</SelectItem>
                            <SelectItem value="internshipHours">{c.metrics.internshipHours}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{c.operator}</Label>
                        <Select value={form.operator} onValueChange={(value) => setForm((current) => ({ ...current, operator: value }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gte">&gt;=</SelectItem>
                            <SelectItem value="gt">&gt;</SelectItem>
                            <SelectItem value="lte">&lt;=</SelectItem>
                            <SelectItem value="lt">&lt;</SelectItem>
                            <SelectItem value="eq">=</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{c.value}</Label>
                        <Input type="number" value={form.value} onChange={(event) => setForm((current) => ({ ...current, value: Number(event.target.value) }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>{c.frequency}</Label>
                        <Input type="number" min={1} value={form.frequencyMinutes} onChange={(event) => setForm((current) => ({ ...current, frequencyMinutes: Number(event.target.value) }))} />
                      </div>
                    </div>
                  )}

                  {form.actionType === 'award_badge' ? (
                    <div className="space-y-3">
                      <Input placeholder={c.badgeName} value={form.badgeName} onChange={(event) => setForm((current) => ({ ...current, badgeName: event.target.value }))} />
                      <Input placeholder={c.badgeNameThai} value={form.badgeNameThai} onChange={(event) => setForm((current) => ({ ...current, badgeNameThai: event.target.value }))} />
                      <Textarea placeholder={c.badgeCriteria} value={form.badgeCriteria} onChange={(event) => setForm((current) => ({ ...current, badgeCriteria: event.target.value }))} />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Select value={form.target} onValueChange={(value) => setForm((current) => ({ ...current, target: value }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="STUDENT">{c.targets.STUDENT}</SelectItem>
                            <SelectItem value="LECTURER">{c.targets.LECTURER}</SelectItem>
                            <SelectItem value="STAFF">{c.targets.STAFF}</SelectItem>
                            <SelectItem value="COMPANY">{c.targets.COMPANY}</SelectItem>
                            <SelectItem value="ADMIN">{c.targets.ADMIN}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={form.template} onValueChange={(value) => setForm((current) => ({ ...current, template: value }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending-request-digest">{c.templates['pending-request-digest']}</SelectItem>
                            <SelectItem value="custom">{c.templates.custom}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Input placeholder={c.notifTitle} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
                      <Textarea placeholder={c.notifMessage} value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} />
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between rounded-lg border p-3 dark:border-slate-800">
                <Label>{c.active}</Label>
                <Switch checked={form.isActive} onCheckedChange={(value) => setForm((current) => ({ ...current, isActive: value }))} />
              </div>
              <Button type="submit" className="w-full" disabled={isSaving}>
                <Zap className="mr-2 h-4 w-4" />
                {isSaving ? c.saving : c.create}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {isLoading ? (
            <Card><CardContent className="p-8 text-center text-slate-500">{c.loading}</CardContent></Card>
          ) : rules.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-slate-500">{c.empty}</CardContent></Card>
          ) : rules.map((rule) => (
            <Card key={rule.id} data-testid="automation-rule" className="border-slate-200/80 dark:border-slate-800">
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">{rule.name}</h2>
                      <Badge variant={rule.isActive ? 'default' : 'secondary'}>{rule.isActive ? c.statusActive : c.statusPaused}</Badge>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{rule.description}</p>
                    <div className="grid gap-3 text-sm md:grid-cols-3">
                      <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
                        <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-400"><CalendarClock className="h-3.5 w-3.5" />{c.nextRun}</div>
                        {formatDate(rule.nextRun, language)}
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
                        <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-400"><CheckCircle2 className="h-3.5 w-3.5" />{c.lastRun}</div>
                        {formatDate(rule.lastRun, language)}
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
                        <div className="mb-1 text-xs font-semibold text-slate-400">{c.executions}</div>
                        {rule.executionCount}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => void toggleRule(rule)}>{rule.isActive ? c.pause : c.activate}</Button>
                    <Button variant="outline" size="sm" onClick={() => void runRule(rule)}><Play className="mr-2 h-4 w-4" />{c.run}</Button>
                    <Button variant="destructive" size="sm" onClick={() => setPendingDelete(rule)}><Trash2 className="mr-2 h-4 w-4" />{c.delete}</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="leading-snug">{pendingDelete ? c.confirmTitle(pendingDelete.name) : ''}</AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">{c.confirmBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{c.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) void deleteRule(pendingDelete);
                setPendingDelete(null);
              }}
            >
              {c.confirmDelete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
