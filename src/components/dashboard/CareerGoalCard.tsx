import React, { useEffect, useState } from 'react';
import { Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { asRecord, asString } from '@/lib/live-data';
import { toast } from 'sonner';

type Track = { id: string; name: string; nameThai: string };

// Lets a student self-declare a target career track (e.g. "Frontend Developer").
// Companies watching that track can see interest building even before a
// student's skills catch up — no matching/scoring here, just an honest signal.
export function CareerGoalCard() {
  const { language } = useLanguage();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  // The goal's own embedded track name — independent of whether the separate
  // /career-tracks list call succeeded, so a partial-failure load never shows
  // "+ Set career goal" for a student who actually has one set (the trigger
  // label used to cross-reference `tracks` by id, which went blank if that
  // fetch failed while the goal fetch itself succeeded).
  const [currentTrackName, setCurrentTrackName] = useState<{ name: string; nameThai: string } | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([api.careerTracks.list(), api.careerGoal.get()])
      .then(([tracksRes, goalRes]) => {
        if (!mounted) return;
        if (tracksRes.status === 'fulfilled') {
          setTracks(tracksRes.value.tracks.map((item) => {
            const track = asRecord(item);
            return {
              id: asString(track.id),
              name: asString(track.name),
              nameThai: asString(track.nameThai, asString(track.name)),
            };
          }));
        }
        if (goalRes.status === 'fulfilled' && goalRes.value.goal) {
          const goal = asRecord(goalRes.value.goal);
          const track = asRecord(goal.careerTrack);
          const trackId = asString(goal.careerTrackId);
          setCurrentTrackId(trackId || null);
          setSelectedTrackId(trackId || '');
          setCurrentTrackName({
            name: asString(track.name),
            nameThai: asString(track.nameThai, asString(track.name)),
          });
        }
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const currentTrack = currentTrackName ?? tracks.find((track) => track.id === currentTrackId);

  const copy = language === 'th'
    ? {
        label: 'เป้าหมายอาชีพ',
        setGoal: '+ ตั้งเป้าหมายอาชีพ',
        helper: 'บริษัทจะเห็นว่าคุณสนใจสายนี้ แม้ยังไม่มีสกิลครบก็ตาม',
        placeholder: 'เลือกสายอาชีพ',
        save: 'บันทึก',
        clear: 'ล้างเป้าหมาย',
        saved: 'ตั้งเป้าหมายอาชีพแล้ว',
        cleared: 'ล้างเป้าหมายแล้ว',
        errorGeneric: 'ทำรายการไม่สำเร็จ',
      }
    : {
        label: 'Career goal',
        setGoal: '+ Set career goal',
        helper: "Companies can see you're aiming for this track, even before your skills catch up.",
        placeholder: 'Choose a track',
        save: 'Save',
        clear: 'Clear goal',
        saved: 'Career goal set.',
        cleared: 'Career goal cleared.',
        errorGeneric: 'Action failed.',
      };

  const handleSave = async () => {
    if (!selectedTrackId) return;
    setIsSaving(true);
    try {
      await api.careerGoal.set(selectedTrackId);
      setCurrentTrackId(selectedTrackId);
      setCurrentTrackName(tracks.find((track) => track.id === selectedTrackId) ?? null);
      toast.success(copy.saved);
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.errorGeneric);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setIsSaving(true);
    try {
      await api.careerGoal.set(null);
      setCurrentTrackId(null);
      setCurrentTrackName(null);
      setSelectedTrackId('');
      toast.success(copy.cleared);
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.errorGeneric);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    // Same footprint as the real trigger button so it doesn't shift the
    // other Quick Actions buttons once this resolves.
    return <div className="h-9 w-40 rounded-xl bg-white/10 animate-pulse" />;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-xl justify-start"
        >
          <Target className="w-4 h-4 mr-2 text-amber-400" />
          {currentTrack ? (language === 'th' ? currentTrack.nameThai : currentTrack.name) : copy.setGoal}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3">
        <div>
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{copy.label}</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{copy.helper}</p>
        </div>
        <Select value={selectedTrackId} onValueChange={setSelectedTrackId}>
          <SelectTrigger>
            <SelectValue placeholder={copy.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {tracks.map((track) => (
              <SelectItem key={track.id} value={track.id}>
                {language === 'th' ? track.nameThai : track.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          {currentTrackId && (
            <Button size="sm" variant="ghost" className="text-red-500" disabled={isSaving} onClick={handleClear}>
              {copy.clear}
            </Button>
          )}
          <Button size="sm" className="flex-1" disabled={isSaving || !selectedTrackId} onClick={handleSave}>
            {copy.save}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
