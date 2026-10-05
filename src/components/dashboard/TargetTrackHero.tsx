import React, { useEffect, useState } from 'react';
import { Target, X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { asArray, asNumber, asRecord, asString } from '@/lib/live-data';
import { toast } from 'sonner';

type Track = { id: string; name: string; nameThai: string };
type Watch = {
  id: string;
  trackId: string;
  trackName: string;
  trackNameThai: string;
  desiredSkills: string[];
  totalGoalSetters: number;
  matchedCount: number;
  newCount: number;
};

// The dashboard's hero: companies "watch" a career track and see, honestly,
// how many students have set it as their goal (even freshmen with no
// matching skills yet) vs. how many already have the skills this company
// cares about for that track. No score, no percentage — just real counts.
export function TargetTrackHero() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [watches, setWatches] = useState<Watch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newTrackId, setNewTrackId] = useState('');
  const [newSkills, setNewSkills] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const copy = language === 'th'
    ? {
        title: '★ สายที่มองหา · ว่าที่นักศึกษาในไปป์ไลน์',
        addTrack: '+ ตั้งสายที่มองหา',
        note: 'ปักธงสายอาชีพที่อยากได้ล่วงหน้า — ระบบจับนักศึกษาที่ตั้งเป้าตรงมาให้เรื่อยๆ (แม้ยังไม่มีสกิลครบ) เงียบจนกว่าคุณจะทักไปคุยเอง',
        addNew: '+ ตั้งสายใหม่',
        hitLabel: 'คน ถึงเป้าแล้ว\n(มีสกิลครบ)',
        totalLabel: 'คน ตั้งเป้า\nทั้งหมด',
        interestedSkills: (skills: string) => `สนใจสกิล: ${skills}`,
        noSkillsSet: 'ยังไม่ระบุสกิลที่สนใจ',
        viewStudents: 'ดูนักศึกษา →',
        newBadge: (n: number) => `+${n} ใหม่`,
        dialogTitle: 'ตั้งสายที่มองหาใหม่',
        trackPlaceholder: 'เลือกสายอาชีพ',
        skillsPlaceholder: 'ทักษะที่สนใจ (คั่นด้วย , เช่น React, TypeScript)',
        cancel: 'ยกเลิก',
        save: 'บันทึก',
        removeConfirm: 'ยกเลิกติดตามสายนี้?',
        savedToast: 'ตั้งสายที่มองหาแล้ว',
        removedToast: 'ยกเลิกติดตามแล้ว',
        errorGeneric: 'ทำรายการไม่สำเร็จ',
      }
    : {
        title: '★ Target Tracks · Prospective students in the pipeline',
        addTrack: '+ Watch a track',
        note: "Flag a career direction you're hiring for in advance — the system surfaces students who've set this as their goal (even before their skills catch up), quietly, until you reach out.",
        addNew: '+ Watch new track',
        hitLabel: 'reached goal\n(skills match)',
        totalLabel: 'total goal\nsetters',
        interestedSkills: (skills: string) => `Skills: ${skills}`,
        noSkillsSet: 'No skills specified yet',
        viewStudents: 'View students →',
        newBadge: (n: number) => `+${n} new`,
        dialogTitle: 'Watch a new track',
        trackPlaceholder: 'Choose a track',
        skillsPlaceholder: 'Skills of interest (comma-separated)',
        cancel: 'Cancel',
        save: 'Save',
        removeConfirm: 'Stop watching this track?',
        savedToast: 'Track watch saved.',
        removedToast: 'Stopped watching.',
        errorGeneric: 'Action failed.',
      };

  const loadWatches = React.useCallback(() => {
    return api.trackWatches.list().then((res) => {
      setWatches(res.watches.map((item) => {
        const w = asRecord(item);
        const track = asRecord(w.careerTrack);
        return {
          id: asString(w.id),
          trackId: asString(track.id),
          trackName: asString(track.name),
          trackNameThai: asString(track.nameThai, asString(track.name)),
          desiredSkills: asArray<string>(w.desiredSkills),
          totalGoalSetters: asNumber(w.totalGoalSetters, 0),
          matchedCount: asNumber(w.matchedCount, 0),
          newCount: asNumber(w.newCount, 0),
        };
      }));
    });
  }, []);

  useEffect(() => {
    setIsLoading(true);
    Promise.allSettled([api.careerTracks.list(), loadWatches()])
      .then(([tracksRes]) => {
        if (tracksRes.status === 'fulfilled') {
          setTracks(tracksRes.value.tracks.map((item) => {
            const t = asRecord(item);
            return { id: asString(t.id), name: asString(t.name), nameThai: asString(t.nameThai, asString(t.name)) };
          }));
        }
      })
      .finally(() => setIsLoading(false));
  }, [loadWatches]);

  const availableTracks = tracks.filter((t) => !watches.some((w) => w.trackId === t.id));

  const handleSave = async () => {
    if (!newTrackId) return;
    setIsSaving(true);
    try {
      const skills = newSkills.split(',').map((s) => s.trim()).filter(Boolean);
      await api.trackWatches.create(newTrackId, skills);
      await loadWatches();
      toast.success(copy.savedToast);
      setAddOpen(false);
      setNewTrackId('');
      setNewSkills('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.errorGeneric);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (watchId: string) => {
    if (!confirm(copy.removeConfirm)) return;
    try {
      await api.trackWatches.remove(watchId);
      setWatches((current) => current.filter((w) => w.id !== watchId));
      toast.success(copy.removedToast);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.errorGeneric);
    }
  };

  if (isLoading) {
    return <div className="h-56 rounded-3xl bg-slate-100 dark:bg-slate-900 animate-pulse" />;
  }

  return (
    <div className="rounded-3xl border-2 border-amber-400/60 dark:border-amber-600/40 p-6 shadow-sm bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Target className="w-5 h-5 text-amber-500" />
          {copy.title}
        </h3>
        <Button size="sm" variant="outline" className="border-amber-400 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30" onClick={() => setAddOpen(true)}>
          {copy.addTrack}
        </Button>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{copy.note}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {watches.map((watch) => (
          <div key={watch.id} className="relative border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-2">
            <button
              onClick={() => handleRemove(watch.id)}
              className="absolute top-2 right-2 text-slate-300 hover:text-red-500"
              aria-label="remove"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            {watch.newCount > 0 && (
              <Badge className="absolute -top-2 left-3 bg-amber-500 text-white hover:bg-amber-500 text-[10px]">
                {copy.newBadge(watch.newCount)}
              </Badge>
            )}
            <span className="font-semibold text-sm text-slate-800 dark:text-slate-100 mt-1">
              ★ {language === 'th' ? watch.trackNameThai : watch.trackName}
            </span>
            <div className="flex gap-2">
              <div className="flex-1 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20 px-2 py-1.5 text-center">
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{watch.matchedCount}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-pre-line leading-tight">{copy.hitLabel}</div>
              </div>
              <div className="flex-1 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 px-2 py-1.5 text-center">
                <div className="text-lg font-bold text-slate-700 dark:text-slate-300">{watch.totalGoalSetters}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-pre-line leading-tight">{copy.totalLabel}</div>
              </div>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {watch.desiredSkills.length ? copy.interestedSkills(watch.desiredSkills.join(' · ')) : copy.noSkillsSet}
            </span>
            <button
              className="text-xs font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1 mt-auto"
              onClick={() => navigate(`/talent-search?careerTrackId=${watch.trackId}${watch.desiredSkills.length ? `&skills=${encodeURIComponent(watch.desiredSkills.join(','))}` : ''}`)}
            >
              {copy.viewStudents} <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        ))}

        <button
          onClick={() => setAddOpen(true)}
          className="border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl flex items-center justify-center text-sm text-slate-400 hover:text-amber-600 hover:border-amber-400 min-h-[140px]"
        >
          {copy.addNew}
        </button>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{copy.dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={newTrackId} onValueChange={setNewTrackId}>
              <SelectTrigger><SelectValue placeholder={copy.trackPlaceholder} /></SelectTrigger>
              <SelectContent>
                {availableTracks.map((track) => (
                  <SelectItem key={track.id} value={track.id}>{language === 'th' ? track.nameThai : track.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder={copy.skillsPlaceholder} value={newSkills} onChange={(e) => setNewSkills(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>{copy.cancel}</Button>
            <Button disabled={!newTrackId || isSaving} onClick={handleSave}>{copy.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
