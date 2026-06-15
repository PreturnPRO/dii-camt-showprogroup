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
  titleThai: 'Pending work digest',
  message: 'There are items waiting for review.',
  messageThai: 'There are items waiting for review.',
  badgeName: 'Milestone',
  badgeNameThai: 'Milestone',
  badgeDescription: 'Awarded automatically by ShowPro.',
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

const formatDate = (value: Date | null) => value ? value.toLocaleString('th-TH') : '-';

export default function Automation() {
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
      toast.error(error instanceof Error ? error.message : 'Unable to load automation rules');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadRules();
  }, [loadRules]);

  const buildPayload = () => {
    if (jsonMode) {
      return {
        name: form.name,
        description: form.description,
        trigger: JSON.parse(triggerJson) as Record<string, unknown>,
        action: JSON.parse(actionJson) as Record<string, unknown>,
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
          titleThai: form.titleThai,
          message: form.message,
          messageThai: form.messageThai,
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
      toast.success('Automation rule created');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create rule');
    } finally {
      setIsSaving(false);
    }
  };

  const runRule = async (rule: AutomationRule) => {
    try {
      const response = await api.automation.run(rule.id);
      const result = asRecord(response.result);
      toast.success(`Executed: ${asNumber(result.affected, 0)} affected`);
      await loadRules();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to run rule');
    }
  };

  const toggleRule = async (rule: AutomationRule) => {
    try {
      const response = await api.automation.update(rule.id, { isActive: !rule.isActive });
      setRules((current) => current.map((item) => item.id === rule.id ? mapRule(response.rule) : item));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update rule');
    }
  };

  const deleteRule = async (rule: AutomationRule) => {
    try {
      await api.automation.remove(rule.id);
      setRules((current) => current.filter((item) => item.id !== rule.id));
      toast.success('Automation rule deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to delete rule');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200">
            <Bot className="h-4 w-4" />
            Admin Automation
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Automation Center</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create scheduled rules, evaluate student metrics, send notifications, and award badges.</p>
        </div>
        <Button variant="outline" onClick={() => void loadRules()} disabled={isLoading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card className="border-slate-200/80 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-600" />
              New rule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createRule} className="space-y-5">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} required />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3 dark:border-slate-800">
                <Label className="flex items-center gap-2">
                  <Code2 className="h-4 w-4" />
                  JSON mode
                </Label>
                <Switch checked={jsonMode} onCheckedChange={setJsonMode} />
              </div>

              {jsonMode ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Trigger JSON</Label>
                    <Textarea className="min-h-[140px] font-mono text-xs" value={triggerJson} onChange={(event) => setTriggerJson(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Action JSON</Label>
                    <Textarea className="min-h-[140px] font-mono text-xs" value={actionJson} onChange={(event) => setActionJson(event.target.value)} />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Trigger</Label>
                      <Select value={form.triggerType} onValueChange={(value) => setForm((current) => ({ ...current, triggerType: value }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="schedule">Cron schedule</SelectItem>
                          <SelectItem value="student_metric">Student metric</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Action</Label>
                      <Select value={form.actionType} onValueChange={(value) => setForm((current) => ({ ...current, actionType: value }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="notification">Notification</SelectItem>
                          <SelectItem value="badge_evaluation">Badge evaluation</SelectItem>
                          <SelectItem value="award_badge">Award badge</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {form.triggerType === 'schedule' ? (
                    <div className="space-y-2">
                      <Label>Cron schedule</Label>
                      <Input value={form.schedule} onChange={(event) => setForm((current) => ({ ...current, schedule: event.target.value }))} />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Metric</Label>
                        <Select value={form.metric} onValueChange={(value) => setForm((current) => ({ ...current, metric: value }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="xp">XP</SelectItem>
                            <SelectItem value="coins">Coins</SelectItem>
                            <SelectItem value="gamificationPoints">Points</SelectItem>
                            <SelectItem value="activityHours">Activity hours</SelectItem>
                            <SelectItem value="internshipHours">Internship hours</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Operator</Label>
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
                        <Label>Value</Label>
                        <Input type="number" value={form.value} onChange={(event) => setForm((current) => ({ ...current, value: Number(event.target.value) }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Frequency minutes</Label>
                        <Input type="number" min={1} value={form.frequencyMinutes} onChange={(event) => setForm((current) => ({ ...current, frequencyMinutes: Number(event.target.value) }))} />
                      </div>
                    </div>
                  )}

                  {form.actionType === 'award_badge' ? (
                    <div className="space-y-3">
                      <Input placeholder="Badge name" value={form.badgeName} onChange={(event) => setForm((current) => ({ ...current, badgeName: event.target.value }))} />
                      <Input placeholder="Thai badge name" value={form.badgeNameThai} onChange={(event) => setForm((current) => ({ ...current, badgeNameThai: event.target.value }))} />
                      <Textarea placeholder="Badge criteria" value={form.badgeCriteria} onChange={(event) => setForm((current) => ({ ...current, badgeCriteria: event.target.value }))} />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Select value={form.target} onValueChange={(value) => setForm((current) => ({ ...current, target: value }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="STUDENT">Students</SelectItem>
                            <SelectItem value="LECTURER">Lecturers</SelectItem>
                            <SelectItem value="STAFF">Staff</SelectItem>
                            <SelectItem value="COMPANY">Companies</SelectItem>
                            <SelectItem value="ADMIN">Admins</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={form.template} onValueChange={(value) => setForm((current) => ({ ...current, template: value }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending-request-digest">Pending requests</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Input placeholder="Title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
                      <Textarea placeholder="Message" value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} />
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between rounded-lg border p-3 dark:border-slate-800">
                <Label>Active</Label>
                <Switch checked={form.isActive} onCheckedChange={(value) => setForm((current) => ({ ...current, isActive: value }))} />
              </div>
              <Button type="submit" className="w-full" disabled={isSaving}>
                <Zap className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Create automation'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {isLoading ? (
            <Card><CardContent className="p-8 text-center text-slate-500">Loading automation rules...</CardContent></Card>
          ) : rules.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-slate-500">No automation rules yet.</CardContent></Card>
          ) : rules.map((rule) => (
            <Card key={rule.id} className="border-slate-200/80 dark:border-slate-800">
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">{rule.name}</h2>
                      <Badge variant={rule.isActive ? 'default' : 'secondary'}>{rule.isActive ? 'Active' : 'Paused'}</Badge>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{rule.description}</p>
                    <div className="grid gap-3 text-sm md:grid-cols-3">
                      <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
                        <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-slate-400"><CalendarClock className="h-3.5 w-3.5" />Next run</div>
                        {formatDate(rule.nextRun)}
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
                        <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-slate-400"><CheckCircle2 className="h-3.5 w-3.5" />Last run</div>
                        {formatDate(rule.lastRun)}
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
                        <div className="mb-1 text-xs font-semibold uppercase text-slate-400">Executions</div>
                        {rule.executionCount}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => void toggleRule(rule)}>{rule.isActive ? 'Pause' : 'Activate'}</Button>
                    <Button variant="outline" size="sm" onClick={() => void runRule(rule)}><Play className="mr-2 h-4 w-4" />Run</Button>
                    <Button variant="destructive" size="sm" onClick={() => void deleteRule(rule)}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
