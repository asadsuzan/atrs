import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { Flame, Trophy, Zap, X } from 'lucide-react';
import { getLoggingStreak, logToday, deleteLog, type StreakStats } from '../../services/streak';
import { playSound } from '@/lib/sound';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

/*
 * The daily-logging habit loop, backed by its own DailyLog journal (fully
 * independent of products/changelogs):
 *   Cue      — the card sits at the top of the dashboard and changes tone when
 *              today is still unlogged ("your streak is on the line").
 *   Craving  — streak flame, best-streak trophy, and a 7-day dot trail make
 *              the chain visible (and worth not breaking).
 *   Response — one inline text field: type what you worked on, hit Enter.
 *   Reward   — first log of the day = confetti + success sound + a streak
 *              milestone toast the moment it lands.
 */

const MILESTONES: Record<number, string> = {
  3: 'Three days in a row — a habit is forming!',
  7: 'One week strong. Seriously consistent.',
  14: 'Two straight weeks. You’re unstoppable.',
  30: 'THIRTY days. This is who you are now.',
  50: '50-day streak — legendary discipline.',
  100: 'Triple digits. Take a bow. 🏆',
};

const CONFETTI_COLORS = ['#f59e0b', '#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#ec4899'];

/** A short burst of particles from the card's center; fades out on its own. */
function ConfettiBurst({ burstId }: { burstId: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        // Deterministic pseudo-random spread, seeded by index + burst.
        x: Math.sin(i * 12.9898 + burstId) * 180,
        y: -40 - Math.abs(Math.cos(i * 78.233 + burstId)) * 160,
        rotate: (i * 137) % 360,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: (i % 6) * 0.02,
      })),
    [burstId]
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <motion.span
          key={`${burstId}-${i}`}
          className="absolute left-1/2 top-1/2 w-2 h-2 rounded-[2px]"
          style={{ backgroundColor: p.color }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
          animate={{ x: p.x, y: p.y + 220, opacity: 0, rotate: p.rotate, scale: 0.6 }}
          transition={{ duration: 1.4, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

export function StreakCard() {
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [burstId, setBurstId] = useState(0);

  const { data: streak, isLoading } = useQuery<StreakStats>({
    queryKey: ['streak'],
    queryFn: getLoggingStreak,
  });

  const logMutation = useMutation({
    mutationFn: logToday,
    onSuccess: () => {
      const firstOfDay = !streak?.todayLogged;
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['streak'] });

      playSound('success');
      if (firstOfDay) {
        // Reward: the day just turned green — celebrate the extended chain.
        setBurstId((b) => b + 1);
        const newStreak = (streak?.currentStreak ?? 0) + 1;
        toast.success(
          MILESTONES[newStreak]
            ? `🔥 ${newStreak}-day streak! ${MILESTONES[newStreak]}`
            : `🔥 Streak extended to ${newStreak} day${newStreak === 1 ? '' : 's'}!`
        );
      } else {
        toast.success(`Noted — that's ${(streak?.todayCount ?? 0) + 1} today. Keep shipping!`);
      }
    },
    onError: (err: any) => {
      playSound('error');
      toast.error(err?.response?.data?.message || 'Could not save your note');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLog,
    onSuccess: () => {
      playSound('delete');
      queryClient.invalidateQueries({ queryKey: ['streak'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Could not remove the note'),
  });

  const handleDeleteNote = (id: string) => {
    // Removing today's only note re-opens the day (the streak recalculates).
    const lastOfDay = (streak?.todayCount ?? 0) === 1;
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success(lastOfDay ? 'Note removed — today is unlogged again.' : 'Note removed');
      },
    });
  };

  const handleLog = () => {
    if (note.trim().length < 3) return toast.error('A few words is all it takes.');
    if (!logMutation.isPending) logMutation.mutate(note.trim());
  };

  if (isLoading || !streak) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
      </Card>
    );
  }

  const { currentStreak, bestStreak, todayLogged, todayCount, last7, todayNotes } = streak;
  const atRisk = currentStreak > 0 && !todayLogged;

  // Cue copy adapts to the state of the day.
  const headline = todayLogged
    ? `${currentStreak}-day streak — today is in the books`
    : atRisk
      ? `Your ${currentStreak}-day streak is on the line`
      : 'Start a logging streak today';
  const subline = todayLogged
    ? `${todayCount} ${todayCount === 1 ? 'note' : 'notes'} today. Best run: ${bestStreak} days.`
    : atRisk
      ? 'One quick note before midnight keeps the chain alive.'
      : 'Jot one line a day about your work and watch the chain grow.';

  return (
    <Card
      className={`relative p-4 overflow-hidden transition-colors ${
        atRisk ? 'border-amber-500/40 bg-amber-500/[0.04]' : ''
      }`}
    >
      <AnimatePresence>{burstId > 0 && <ConfettiBurst key={burstId} burstId={burstId} />}</AnimatePresence>

      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Craving: the flame + number is the thing users won't want to reset. */}
        <div className="flex items-center gap-3 min-w-0 lg:w-[300px] shrink-0">
          <motion.div
            key={currentStreak}
            initial={{ scale: 0.7 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            className={`relative w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              todayLogged ? 'bg-orange-500/15 text-orange-500' : 'bg-muted text-muted-foreground'
            }`}
          >
            <Flame className={`w-6 h-6 ${todayLogged ? 'animate-pulse' : ''}`} />
            <span className="absolute -bottom-1.5 -right-1.5 min-w-[22px] h-[22px] px-1 rounded-full bg-orange-500 text-white text-[11px] font-bold flex items-center justify-center tabular-nums shadow-sm">
              {currentStreak}
            </span>
          </motion.div>
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-tight truncate">{headline}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{subline}</p>
            {bestStreak > 1 && (
              <p className="text-[10px] text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                <Trophy className="w-3 h-3 text-amber-500" /> Best: {bestStreak} days
              </p>
            )}
          </div>
        </div>

        {/* The visible chain: last 7 days, today ringed. */}
        <div className="flex items-end gap-1.5 shrink-0" aria-label="Last 7 days of logging">
          {last7.map((d, i) => {
            const isToday = i === last7.length - 1;
            return (
              <div key={d.date} className="flex flex-col items-center gap-1">
                <span className="text-[9px] text-muted-foreground">{format(new Date(`${d.date}T00:00:00`), 'EEEEE')}</span>
                <span
                  title={`${d.date}${d.logged ? ' — logged' : ''}`}
                  className={`w-3.5 h-3.5 rounded-full transition-colors ${
                    d.logged ? 'bg-orange-500' : 'bg-muted-foreground/15'
                  } ${isToday ? 'ring-2 ring-offset-1 ring-orange-500/60 ring-offset-background' : ''}`}
                />
              </div>
            );
          })}
        </div>

        {/* Response: log inline — type a line, hit Enter. No dialogs, no fields. */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 min-w-0">
            <Zap className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-orange-500/70" />
            <Input
              value={note}
              maxLength={500}
              placeholder={todayLogged ? 'Add another note…' : 'What did you work on today?'}
              className="pl-8 h-9"
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleLog(); }}
            />
          </div>
          <Button
            size="sm"
            onClick={handleLog}
            disabled={logMutation.isPending}
            className={`shrink-0 ${atRisk ? 'bg-amber-500 hover:bg-amber-500/90 text-white' : ''}`}
          >
            {logMutation.isPending ? 'Saving…' : 'Log it'}
          </Button>
        </div>
      </div>

      {/* Today's journal, right where it was written. */}
      {todayNotes.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/60">
          <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
            Today's notes
          </span>
          <div className="flex flex-wrap gap-1.5">
            {todayNotes.map((n) => (
              <span
                key={n._id}
                title={format(new Date(n.createdAt), 'p')}
                className="group inline-flex items-center gap-1.5 max-w-full rounded-full bg-muted/60 border pl-2.5 pr-1 py-0.5 text-xs text-muted-foreground"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                <span className="truncate py-0.5">{n.note}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteNote(n._id)}
                  disabled={deleteMutation.isPending}
                  aria-label={`Delete note: ${n.note}`}
                  title="Delete note"
                  className="p-0.5 rounded-full text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
